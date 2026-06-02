import { open } from '@/crypto/seal';
import type { Friend, Here, LocalIdentity } from '@/domain/types';
import { RelayCache, CacheLimits } from './cache/relayCache';
import { DEFAULTS } from './defaults';
import { buildHereEnvelopes } from './model/build';
import { Envelope, isLive, verifyEnvelope } from './model/envelope';
import { envelopeSize } from './model/envelopeCodec';
import { metaFromEnvelope, ObjectMeta } from './model/objectMeta';
import { buildInventorySummary, InventorySummary } from './inventory/summary';
import { TransferContext } from './inventory/transferOrder';
import { DedupeSet } from './relay/dedupe';
import { SuppressionTracker } from './relay/suppression';
import { buildDeliveryReceipt, DeliveryReceipt, tryOpenReceipt } from './receipt/receipt';
import { isNewer } from './resolve/latestStatus';

/**
 * The transport-agnostic local node brain. Holds identity, friends, the relay
 * cache, and dedupe state; turns received envelopes into board updates +
 * receipts; and exposes the data a PeerSession needs. The app store and the
 * simulator both drive a MeshEngine — so they exercise identical code paths.
 *
 * All time comes in as `now` arguments and all crypto randomness flows through
 * the shared PRNG, so an engine's behavior is fully reproducible in tests.
 */
export type HereRecord = Here & { receivedAt: number };

export type IngestOutcome = {
  status: 'new-status' | 'cached' | 'duplicate' | 'invalid' | 'expired' | 'oversize';
  here?: Here; // a newer status we decrypted (board update)
  receipt?: Envelope; // a delivery receipt we minted to relay back
  deliveryReceipt?: DeliveryReceipt; // a receipt addressed to us that we opened
};

type Secrets = { signSk: string; boxSk: string };

export class MeshEngine {
  readonly cache: RelayCache;
  private readonly dedupe: DedupeSet;
  private readonly suppression: SuppressionTracker;
  private friendsById = new Map<string, Friend>();
  /** latest decrypted status per author (incl. self) — for the board UI. */
  readonly heres = new Map<string, HereRecord>();
  /** receipts addressed to us, keyed by the status they acknowledge. */
  readonly receiptsForMe = new Map<string, DeliveryReceipt>();
  private receiptSeq = 1;

  constructor(
    private readonly identity: LocalIdentity & Secrets,
    friends: Friend[] = [],
    limits?: CacheLimits,
  ) {
    this.cache = new RelayCache(limits);
    this.dedupe = new DedupeSet(DEFAULTS.exactDedupeSize);
    this.suppression = new SuppressionTracker();
    this.setFriends(friends);
  }

  get signPk(): string {
    return this.identity.signPk;
  }

  /** This node's public Friend record (for peers to add + address us). */
  asFriend(colorIndex = 0): Friend {
    return {
      id: this.identity.signPk,
      displayName: this.identity.displayName,
      signPk: this.identity.signPk,
      boxPk: this.identity.boxPk,
      addedAt: this.identity.createdAt,
      colorIndex,
    };
  }

  setFriends(friends: Friend[]): void {
    this.friendsById = new Map(friends.map((f) => [f.id, f]));
    this.cache.setPins({
      ownSignPk: this.identity.signPk,
      friendSignPks: new Set(this.friendsById.keys()),
    });
  }

  transferContext(): TransferContext {
    return { ownSignPk: this.identity.signPk, friendSignPks: new Set(this.friendsById.keys()) };
  }

  localMetas(): ObjectMeta[] {
    return this.cache.all();
  }

  buildSummary(): InventorySummary {
    return buildInventorySummary(this.cache.all());
  }

  /** Compose, sign, and seal a new status to every friend; cache it for relay. */
  postHere(here: Here, now: number): Envelope[] {
    const envelopes = buildHereEnvelopes(here, this.identity, [...this.friendsById.values()]);
    for (const e of envelopes) {
      this.dedupe.markSeen(e.messageId);
      this.cache.insert(metaFromEnvelope(e, now, { verified: true, decryptable: false }), now);
    }
    this.heres.set(here.authorId, { ...here, receivedAt: now });
    return envelopes;
  }

  /** Process one received envelope (spec §10.1). */
  ingest(envelope: Envelope, now: number): IngestOutcome {
    const id = envelope.messageId;
    this.suppression.record(id, now);

    if (!this.dedupe.markSeen(id)) {
      const existing = this.cache.get(id);
      if (existing) {
        existing.heardCount += 1;
        existing.lastHeardAt = now;
      }
      return { status: 'duplicate' };
    }

    if (!isLive(envelope, now)) return { status: 'expired' };

    const size = envelopeSize(envelope);
    if (size > DEFAULTS.maxObjectBytes) return { status: 'oversize' };
    if (!verifyEnvelope(envelope)) return { status: 'invalid' };

    // Decrypt if it is addressed to us and from a known friend.
    let here: Here | null = null;
    const addressedToMe = envelope.recipientId === this.identity.signPk;
    if (addressedToMe && envelope.objectType === 'here' && this.friendsById.has(envelope.senderSignPk)) {
      here = this.openHere(envelope);
    }

    this.cache.insert(
      metaFromEnvelope(envelope, now, { verified: true, decryptable: here != null, sizeBytes: size }),
      now,
    );

    const outcome: IngestOutcome = { status: here ? 'new-status' : 'cached' };

    if (here) {
      const cur = this.heres.get(here.authorId);
      if (isNewer(here, cur ?? null)) {
        this.heres.set(here.authorId, { ...here, receivedAt: now });
        outcome.here = here;
      }
      const receipt = buildDeliveryReceipt(envelope, this.identity, now, this.receiptSeq++);
      if (receipt) {
        this.dedupe.markSeen(receipt.messageId);
        this.cache.insert(metaFromEnvelope(receipt, now, { verified: true }), now);
        outcome.receipt = receipt;
      }
    }

    // A receipt addressed to us acknowledges one of our own statuses.
    if (envelope.objectType === 'receipt' && addressedToMe) {
      const dr = tryOpenReceipt(envelope, this.identity);
      if (dr) {
        this.receiptsForMe.set(dr.originalMessageId, dr);
        outcome.deliveryReceipt = dr;
      }
    }

    return outcome;
  }

  private openHere(envelope: Envelope): Here | null {
    const plaintext = open(
      { nonce: envelope.nonce, ciphertext: envelope.ciphertext },
      envelope.senderBoxPk,
      this.identity.boxSk,
    );
    if (!plaintext) return null;
    try {
      const h = JSON.parse(plaintext) as Here;
      // The decrypted author must match the signed sender.
      return h.authorId === envelope.senderSignPk ? h : null;
    } catch {
      return null;
    }
  }
}
