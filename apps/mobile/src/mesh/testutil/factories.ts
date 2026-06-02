import { generateKeyPairSet } from '@/crypto/keys';
import type { Friend, Here, LocalIdentity } from '@/domain/types';
import { Envelope } from '../model/envelope';
import { ObjectMeta } from '../model/objectMeta';

/** A full local identity including secret keys, for tests. */
export type TestIdentity = LocalIdentity & { signSk: string; boxSk: string };

export function makeIdentity(displayName = 'tester', createdAt = 1_000_000): TestIdentity {
  const keys = generateKeyPairSet();
  return { displayName, createdAt, ...keys };
}

/** Derive the Friend record (public view) of an identity, as a peer would store it. */
export function friendOf(id: TestIdentity, colorIndex = 0): Friend {
  return {
    id: id.signPk,
    displayName: id.displayName,
    signPk: id.signPk,
    boxPk: id.boxPk,
    addedAt: id.createdAt,
    colorIndex,
  };
}

export function makeHere(author: TestIdentity, overrides: Partial<Here> = {}): Here {
  const createdAt = overrides.createdAt ?? 2_000_000;
  return {
    id: `${author.signPk.slice(0, 8)}-${createdAt}`,
    authorId: author.signPk,
    whereText: 'Crane Stage left rail',
    startsAt: createdAt,
    endsAt: createdAt + 60 * 60_000,
    createdAt,
    sequence: 1,
    ...overrides,
  };
}

// --- Bare fixtures for cache/policy tests (no real crypto needed) -----------

let fakeCounter = 0;

/** A structurally-valid Envelope with controllable fields (signature is fake). */
export function fakeEnvelope(overrides: Partial<Envelope> = {}): Envelope {
  fakeCounter += 1;
  return {
    version: 1,
    objectType: 'here',
    messageId: `mid-${fakeCounter}`,
    senderSignPk: 'sender',
    senderBoxPk: 'box',
    recipientId: 'me',
    createdAt: 1_000,
    relayUntil: 10_000,
    expiresAt: 100_000,
    sequence: 1,
    ttl: 4,
    nonce: 'n',
    ciphertext: 'c',
    signature: 's',
    ...overrides,
  };
}

export function fakeMeta(
  overrides: Partial<Omit<ObjectMeta, 'envelope'>> & { envelope?: Partial<Envelope> } = {},
): ObjectMeta {
  const { envelope: envOverrides, ...rest } = overrides;
  const envelope = fakeEnvelope(envOverrides);
  return {
    envelope,
    messageId: envelope.messageId,
    sizeBytes: 200,
    firstSeenAt: 0,
    lastHeardAt: 0,
    heardCount: 1,
    relayCount: 0,
    decryptable: false,
    verified: false,
    superseded: false,
    ...rest,
  };
}
