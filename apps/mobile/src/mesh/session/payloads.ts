import { ByteReader, ByteWriter } from '../wire/buffer';
import { InventorySummary, SenderLatest } from '../inventory/summary';
import { WantList } from '../inventory/want';

/**
 * Payload codecs for the control frames (HELLO, INVENTORY_SUMMARY, WANT_LIST).
 * ENVELOPE and FRAGMENT payloads have their own codecs (envelopeCodec,
 * fragmenter). All wire encoding is canonical binary — never JSON.
 */

export type Hello = {
  version: number;
  nodeSignPk: string; // peer identity (carried inside the encrypted link)
  capabilities: number;
  wallClockMs: number;
};

export function encodeHello(h: Hello): Uint8Array {
  return new ByteWriter()
    .u8(h.version)
    .lenStr(h.nodeSignPk)
    .u32(h.capabilities)
    .varuint(h.wallClockMs)
    .finish();
}

export function decodeHello(bytes: Uint8Array): Hello {
  const r = new ByteReader(bytes);
  return {
    version: r.u8(),
    nodeSignPk: r.lenStr(),
    capabilities: r.u32(),
    wallClockMs: r.varuint(),
  };
}

export function encodeSummary(s: InventorySummary): Uint8Array {
  const w = new ByteWriter().lenBytes(s.bloom).varuint(s.latestBySender.length);
  for (const e of s.latestBySender) {
    w.lenStr(e.senderSignPk).varuint(e.sequence).varuint(e.createdAt).lenStr(e.messageId);
  }
  w.varuint(s.receiptMessageIds.length);
  for (const id of s.receiptMessageIds) w.lenStr(id);
  w.varuint(s.objectCount);
  return w.finish();
}

export function decodeSummary(bytes: Uint8Array): InventorySummary {
  const r = new ByteReader(bytes);
  const bloom = Uint8Array.from(r.lenBytes());
  const senderCount = r.varuint();
  const latestBySender: SenderLatest[] = [];
  for (let i = 0; i < senderCount; i++) {
    latestBySender.push({
      senderSignPk: r.lenStr(),
      sequence: r.varuint(),
      createdAt: r.varuint(),
      messageId: r.lenStr(),
    });
  }
  const receiptCount = r.varuint();
  const receiptMessageIds: string[] = [];
  for (let i = 0; i < receiptCount; i++) receiptMessageIds.push(r.lenStr());
  const objectCount = r.varuint();
  return { bloom, latestBySender, receiptMessageIds, objectCount };
}

export function encodeWant(w: WantList): Uint8Array {
  const b = new ByteWriter().varuint(w.messageIds.length);
  for (const id of w.messageIds) b.lenStr(id);
  b.varuint(w.latestForSenders.length);
  for (const s of w.latestForSenders) b.lenStr(s);
  b.varuint(w.maxObjects).varuint(w.maxBytes);
  return b.finish();
}

export function decodeWant(bytes: Uint8Array): WantList {
  const r = new ByteReader(bytes);
  const idCount = r.varuint();
  const messageIds: string[] = [];
  for (let i = 0; i < idCount; i++) messageIds.push(r.lenStr());
  const senderCount = r.varuint();
  const latestForSenders: string[] = [];
  for (let i = 0; i < senderCount; i++) latestForSenders.push(r.lenStr());
  return {
    messageIds,
    latestForSenders,
    maxObjects: r.varuint(),
    maxBytes: r.varuint(),
  };
}
