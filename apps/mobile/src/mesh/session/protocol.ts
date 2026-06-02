import { DEFAULTS } from '../defaults';
import { Envelope, isLive } from '../model/envelope';
import { decodeEnvelope, encodeEnvelope } from '../model/envelopeCodec';
import { ObjectMeta } from '../model/objectMeta';
import { BloomFilter } from '../inventory/bloom';
import { InventorySummary } from '../inventory/summary';
import { selectForPeer, TransferContext } from '../inventory/transferOrder';
import { computeWantList } from '../inventory/want';
import { decodeFragment, encodeFragment, fragment } from '../fragment/fragmenter';
import { Reassembler } from '../fragment/reassembler';
import { Frame, FRAME_VERSION, FrameType } from '../wire/frames';
import { decodeHello, decodeSummary, decodeWant, encodeHello, encodeSummary, encodeWant } from './payloads';

/**
 * The data a session needs from the local node. MeshEngine implements this, so
 * the BLE transport and the simulator drive the exact same exchange logic.
 */
export interface SessionNode {
  readonly signPk: string;
  buildSummary(): InventorySummary;
  localMetas(): ObjectMeta[];
  transferContext(): TransferContext;
  ingest(envelope: Envelope, now: number): unknown;
}

export type SessionOptions = {
  sessionId?: Uint8Array;
  /** Above this many payload bytes an envelope is fragmented. */
  maxPayloadBytes?: number;
  maxObjects?: number;
  maxBytes?: number;
  reassemblyTimeoutMs?: number;
  maxFragments?: number;
};

const EMPTY = new Uint8Array(0);

/**
 * One peer encounter (spec §5, §9). A pure, transport-agnostic state machine:
 * HELLO → INVENTORY_SUMMARY → WANT_LIST → prioritized ENVELOPE/FRAGMENT
 * transfer → GOODBYE. It consumes and produces decoded Frame objects; the
 * transport owns wire (de)serialization of the frame wrapper.
 */
export class PeerSession {
  private readonly sessionId: Uint8Array;
  private readonly maxPayloadBytes: number;
  private readonly maxObjects: number;
  private readonly maxBytes: number;
  private readonly reassembler: Reassembler;

  private frameSeq = 0;
  private peerSignPk = '';
  private peerBloom?: BloomFilter;
  private summarySent = false;
  private wantSent = false;
  private served = false;
  private sentGoodbye = false;
  private peerGoodbye = false;

  constructor(
    private readonly node: SessionNode,
    opts: SessionOptions = {},
  ) {
    this.sessionId = opts.sessionId ?? new Uint8Array(8);
    this.maxPayloadBytes = opts.maxPayloadBytes ?? 20_000;
    this.maxObjects = opts.maxObjects ?? DEFAULTS.maxWantObjectsPerSession;
    this.maxBytes = opts.maxBytes ?? DEFAULTS.maxWantBytesPerSession;
    this.reassembler = new Reassembler({
      maxFragments: opts.maxFragments ?? 256,
      timeoutMs: opts.reassemblyTimeoutMs ?? 30_000,
    });
  }

  get done(): boolean {
    return this.sentGoodbye && this.peerGoodbye;
  }

  /** Start the session — returns the opening HELLO. */
  open(now: number): Frame[] {
    return [this.frame(FrameType.HELLO, encodeHello({
      version: FRAME_VERSION,
      nodeSignPk: this.node.signPk,
      capabilities: 0,
      wallClockMs: now,
    }))];
  }

  /** Process one inbound frame; returns frames to send in response. */
  receive(frame: Frame, now: number): Frame[] {
    if (this.done) return [];
    switch (frame.type) {
      case FrameType.HELLO:
        this.peerSignPk = decodeHello(frame.payload).nodeSignPk;
        if (this.summarySent) return [];
        this.summarySent = true;
        return [this.frame(FrameType.INVENTORY_SUMMARY, encodeSummary(this.node.buildSummary()))];

      case FrameType.INVENTORY_SUMMARY: {
        const summary = decodeSummary(frame.payload);
        this.peerBloom = BloomFilter.deserialize(summary.bloom);
        if (this.wantSent) return [];
        this.wantSent = true;
        const want = computeWantList(summary, this.node.localMetas());
        return [this.frame(FrameType.WANT_LIST, encodeWant(want))];
      }

      case FrameType.WANT_LIST: {
        if (this.served) return [];
        this.served = true;
        return this.serve(frame.payload, now);
      }

      case FrameType.ENVELOPE:
        this.node.ingest(decodeEnvelope(frame.payload), now);
        return [];

      case FrameType.FRAGMENT: {
        const full = this.reassembler.add(decodeFragment(frame.payload), now);
        if (full) this.node.ingest(decodeEnvelope(full), now);
        return [];
      }

      case FrameType.GOODBYE:
      case FrameType.ERROR:
        this.peerGoodbye = true;
        return [];

      default:
        // Unknown frame type — tell the peer and bail.
        this.peerGoodbye = true;
        return [this.frame(FrameType.ERROR, EMPTY)];
    }
  }

  private serve(wantPayload: Uint8Array, now: number): Frame[] {
    const want = decodeWant(wantPayload);
    const peerHas = this.peerBloom
      ? (id: string) => this.peerBloom!.mayContain(id)
      : () => false;

    const selected = selectForPeer(
      this.node.localMetas(),
      peerHas,
      this.peerSignPk,
      this.node.transferContext(),
      now,
      { maxObjects: this.maxObjects, maxBytes: this.maxBytes },
    );

    // Add any explicitly-wanted ids not already chosen (e.g. receipts).
    const chosen = new Set(selected.map((m) => m.messageId));
    const wantedIds = new Set(want.messageIds);
    for (const m of this.node.localMetas()) {
      if (wantedIds.has(m.messageId) && !chosen.has(m.messageId) && isLive(m.envelope, now)) {
        selected.push(m);
        chosen.add(m.messageId);
      }
    }

    const out: Frame[] = [];
    for (const m of selected) {
      // Blind relay (object addressed to someone else) decrements TTL per hop,
      // so opaque objects can't circulate forever. Final delivery to the
      // recipient leaves TTL untouched. ttl is excluded from the signature, so
      // the decremented copy still verifies.
      const env =
        m.envelope.recipientId === this.peerSignPk
          ? m.envelope
          : { ...m.envelope, ttl: Math.max(0, m.envelope.ttl - 1) };
      out.push(...this.envelopeFrames(env));
    }
    this.sentGoodbye = true;
    out.push(this.frame(FrameType.GOODBYE, EMPTY));
    return out;
  }

  private envelopeFrames(env: Envelope): Frame[] {
    const bytes = encodeEnvelope(env);
    if (bytes.length <= this.maxPayloadBytes) {
      return [this.frame(FrameType.ENVELOPE, bytes)];
    }
    return fragment(env.messageId, bytes, this.maxPayloadBytes).map((f) =>
      this.frame(FrameType.FRAGMENT, encodeFragment(f)),
    );
  }

  private frame(type: FrameType, payload: Uint8Array): Frame {
    return { version: FRAME_VERSION, type, seq: this.frameSeq++, sessionId: this.sessionId, payload };
  }
}

/**
 * Drive two sessions to completion by shuttling frames between them. Returns the
 * number of frames exchanged. Used by the simulator and by tests; a real
 * transport does the same shuttling over the radio.
 */
export function pumpSessions(a: PeerSession, b: PeerSession, now: number, maxRounds = 64): number {
  let aOut = a.open(now); // frames a emits, destined for b
  let bOut = b.open(now); // frames b emits, destined for a
  let exchanged = aOut.length + bOut.length;

  for (let round = 0; round < maxRounds; round++) {
    if (aOut.length === 0 && bOut.length === 0) break;
    const toB = aOut;
    const toA = bOut;
    aOut = [];
    bOut = [];
    for (const f of toB) bOut.push(...b.receive(f, now));
    for (const f of toA) aOut.push(...a.receive(f, now));
    exchanged += aOut.length + bOut.length;
    if (a.done && b.done) break;
  }
  return exchanged;
}
