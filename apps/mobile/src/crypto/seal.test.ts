import { describe, expect, it } from 'vitest';
import { generateKeyPairSet } from './keys';
import { open, seal, sign, verify } from './seal';

// Smoke test: proves the crypto layer loads and runs in Node under Vitest
// (i.e. the expo-crypto shim is wired correctly), so the rest of the mesh
// library can be tested headlessly.
describe('seal/open + sign/verify (Node smoke test)', () => {
  it('round-trips a sealed box between two parties', () => {
    const a = generateKeyPairSet();
    const b = generateKeyPairSet();
    const msg = 'Crane Stage left rail';

    const sealed = seal(msg, b.boxPk, a.boxSk);
    expect(open(sealed, a.boxPk, b.boxSk)).toBe(msg);
  });

  it('fails to open with the wrong key', () => {
    const a = generateKeyPairSet();
    const b = generateKeyPairSet();
    const c = generateKeyPairSet();

    const sealed = seal('secret', b.boxPk, a.boxSk);
    expect(open(sealed, a.boxPk, c.boxSk)).toBeNull();
  });

  it('verifies a valid signature and rejects a tampered message', () => {
    const a = generateKeyPairSet();
    const sig = sign('hello', a.signSk);
    expect(verify('hello', sig, a.signPk)).toBe(true);
    expect(verify('hell0', sig, a.signPk)).toBe(false);
  });
});
