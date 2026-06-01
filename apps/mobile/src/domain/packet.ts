import { open, seal, sign, verify } from '@/crypto/seal';
import type { Friend, Here, LocalIdentity, RelayPacket } from './types';

export const DEFAULT_TTL = 6; // max relay hops
export const PACKET_LIFETIME_MS = 48 * 60 * 60 * 1000; // hard drop after 48h

/**
 * Canonical string signed/verified for a packet. Excludes `ttl`, which
 * legitimately changes as the packet is relayed hop to hop.
 */
function canonical(p: Omit<RelayPacket, 'signature' | 'ttl'>): string {
  return [
    p.packetId,
    p.senderSignPk,
    p.senderBoxPk,
    p.recipientId,
    p.createdAt,
    p.sequence,
    p.expiresAt,
    p.payloadType,
    p.nonce,
    p.ciphertext,
  ].join('|');
}

function packetIdFor(senderSignPk: string, sequence: number, recipientId: string): string {
  // Deterministic so the same logical packet dedupes across hops.
  return `${senderSignPk.slice(0, 12)}.${sequence}.${recipientId.slice(0, 12)}`;
}

/**
 * Build one encrypted, signed RelayPacket of a here for each friend recipient.
 * Each friend gets a payload sealed to their box key.
 */
export function buildPacketsForHere(
  here: Here,
  identity: LocalIdentity & { signSk: string; boxSk: string },
  friends: Friend[],
): RelayPacket[] {
  const plaintext = JSON.stringify(here);
  const expiresAt = here.createdAt + PACKET_LIFETIME_MS;

  return friends.map((friend) => {
    const sealed = seal(plaintext, friend.boxPk, identity.boxSk);
    const base = {
      packetId: packetIdFor(identity.signPk, here.sequence, friend.id),
      senderSignPk: identity.signPk,
      senderBoxPk: identity.boxPk,
      recipientId: friend.id,
      createdAt: here.createdAt,
      sequence: here.sequence,
      expiresAt,
      payloadType: 'here' as const,
      nonce: sealed.nonce,
      ciphertext: sealed.ciphertext,
    };
    return { ...base, ttl: DEFAULT_TTL, signature: sign(canonical(base), identity.signSk) };
  });
}

/** Verify a packet's signature and that it hasn't expired. */
export function isPacketValid(p: RelayPacket, now: number): boolean {
  if (p.expiresAt <= now) return false;
  if (p.ttl < 0) return false;
  const { signature, ttl: _ttl, ...rest } = p;
  return verify(canonical(rest), signature, p.senderSignPk);
}

/**
 * If this packet is addressed to me and from a known friend, try to decrypt the
 * here. Returns null if not for me, not from a friend, or fails to open.
 */
export function tryOpenHere(
  p: RelayPacket,
  identity: LocalIdentity & { boxSk: string },
  friendsById: Map<string, Friend>,
): Here | null {
  if (p.recipientId !== identity.signPk) return null;
  const friend = friendsById.get(p.senderSignPk);
  if (!friend) return null; // sender not added — don't display
  const plaintext = open({ nonce: p.nonce, ciphertext: p.ciphertext }, p.senderBoxPk, identity.boxSk);
  if (!plaintext) return null;
  try {
    const here = JSON.parse(plaintext) as Here;
    if (here.authorId !== p.senderSignPk) return null; // payload author must match signer
    return here;
  } catch {
    return null;
  }
}

/** Produce a relay-forwarded copy with one fewer hop, or null if not eligible. */
export function decrementForRelay(p: RelayPacket, now: number): RelayPacket | null {
  if (p.expiresAt <= now || p.ttl <= 0) return null;
  return { ...p, ttl: p.ttl - 1 };
}
