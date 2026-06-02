import { b64UrlToJson, jsonToB64Url } from '@/crypto/codec';
import type { FriendCodePayload, LocalIdentity } from './types';

export const FRIEND_CODE_VERSION = 1;
export const FRIEND_LINK_BASE = 'https://hereherehere.app/friend';

export function buildPayload(identity: LocalIdentity): FriendCodePayload {
  return {
    v: FRIEND_CODE_VERSION,
    n: identity.displayName,
    ...(identity.emoji ? { e: identity.emoji } : null),
    s: identity.signPk,
    b: identity.boxPk,
    t: identity.createdAt,
  };
}

/**
 * Friend link uses a URL fragment (#) so the payload never reaches the static
 * host — privacy-preserving, no server lookup. The QR encodes this same link.
 */
export function buildFriendLink(identity: LocalIdentity): string {
  return `${FRIEND_LINK_BASE}#${jsonToB64Url(buildPayload(identity))}`;
}

/** Parse a scanned QR string or pasted friend link into a payload. */
export function parseFriendCode(input: string): FriendCodePayload | null {
  try {
    const trimmed = input.trim();
    let encoded = trimmed;
    if (trimmed.includes('#')) encoded = trimmed.split('#')[1];
    else if (trimmed.includes('/friend/')) encoded = trimmed.split('/friend/')[1];
    encoded = encoded.split(/[?&]/)[0];

    const payload = b64UrlToJson<FriendCodePayload>(encoded);
    if (
      !payload ||
      typeof payload.s !== 'string' ||
      typeof payload.b !== 'string' ||
      typeof payload.n !== 'string'
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
