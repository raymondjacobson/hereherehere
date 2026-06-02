import { describe, expect, it } from 'vitest';
import { buildHereEnvelope } from '../model/build';
import { verifyEnvelope } from '../model/envelope';
import { friendOf, makeHere, makeIdentity } from '../testutil/factories';
import { buildDeliveryReceipt, tryOpenReceipt } from './receipt';

describe('delivery receipts', () => {
  it('mints a verifiable receipt sealed back to the original author', () => {
    const author = makeIdentity('author');
    const me = makeIdentity('me');
    const here = makeHere(author);
    const original = buildHereEnvelope(here, author, friendOf(me));

    const receipt = buildDeliveryReceipt(original, me, 9_000)!;
    expect(receipt).not.toBeNull();
    expect(receipt.objectType).toBe('receipt');
    expect(receipt.recipientId).toBe(author.signPk);
    expect(verifyEnvelope(receipt)).toBe(true);
  });

  it('can be opened only by the original author', () => {
    const author = makeIdentity('author');
    const me = makeIdentity('me');
    const stranger = makeIdentity('stranger');
    const original = buildHereEnvelope(makeHere(author), author, friendOf(me));

    const receipt = buildDeliveryReceipt(original, me, 9_000)!;
    const opened = tryOpenReceipt(receipt, author);
    expect(opened).not.toBeNull();
    expect(opened!.originalMessageId).toBe(original.messageId);
    expect(opened!.recipientProfileKey).toBe(me.signPk);

    expect(tryOpenReceipt(receipt, stranger)).toBeNull();
  });

  it('does not receipt our own status', () => {
    const me = makeIdentity('me');
    const own = buildHereEnvelope(makeHere(me), me, friendOf(makeIdentity('friend')));
    expect(buildDeliveryReceipt(own, me, 9_000)).toBeNull();
  });
});
