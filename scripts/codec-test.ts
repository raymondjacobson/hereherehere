// Throwaway correctness check for the hand-written codec + nacl round-trips.
// Run: node scripts/codec-test.ts
import nacl from 'tweetnacl';
import { webcrypto } from 'node:crypto';
import {
  toB64,
  fromB64,
  utf8ToBytes,
  bytesToUtf8,
  toB64Url,
  fromB64Url,
  jsonToB64Url,
  b64UrlToJson,
} from '../src/crypto/codec.ts';

nacl.setPRNG((x, n) => {
  const b = new Uint8Array(n);
  webcrypto.getRandomValues(b);
  x.set(b);
});

let failures = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    console.error('FAIL:', name);
    failures++;
  }
}

// 1. base64 round-trips for every length 0..300 of random bytes
for (let len = 0; len <= 300; len++) {
  const bytes = new Uint8Array(len);
  webcrypto.getRandomValues(bytes);
  const back = fromB64(toB64(bytes));
  check(`b64 len ${len}`, back.length === len && back.every((v, i) => v === bytes[i]));
  // cross-check against Node's reference base64
  check(`b64 matches node len ${len}`, toB64(bytes) === Buffer.from(bytes).toString('base64'));
}

// 2. utf8 round-trip incl. emoji + multibyte
const strings = ['', 'hello', 'Fcukers @ Crane Stage', 'under the disco ball 🪩', 'café ☕ 北京 𝕏'];
for (const s of strings) {
  check(`utf8 "${s}"`, bytesToUtf8(utf8ToBytes(s)) === s);
  check(`utf8 matches node "${s}"`, Buffer.from(utf8ToBytes(s)).toString('utf8') === s);
}

// 3. url-safe base64 + json
const obj = { v: 1, n: 'Maya 🪩', s: 'AAAA/+==', b: 'zzz', t: 123 };
check('json b64url round-trip', JSON.stringify(b64UrlToJson(jsonToB64Url(obj))) === JSON.stringify(obj));
check('b64url no padding/url chars', !/[+/=]/.test(toB64Url(utf8ToBytes('any?>data<<'))));
check('b64url round-trip bytes', (() => {
  const bytes = new Uint8Array(50);
  webcrypto.getRandomValues(bytes);
  const back = fromB64Url(toB64Url(bytes));
  return back.length === 50 && back.every((v, i) => v === bytes[i]);
})());

// 4. full crypto path: seal a here to a friend, sign packet, open + verify
const alice = { sign: nacl.sign.keyPair(), box: nacl.box.keyPair() };
const bob = { sign: nacl.sign.keyPair(), box: nacl.box.keyPair() };

const here = JSON.stringify({ whereText: 'Crane Stage 🪩', note: 'café', endsAt: 123 });
const nonce = nacl.randomBytes(nacl.box.nonceLength);
const ct = nacl.box(utf8ToBytes(here), nonce, bob.box.publicKey, alice.box.secretKey);
// Bob opens with Alice's box pubkey
const opened = nacl.box.open(ct, nonce, alice.box.publicKey, bob.box.secretKey);
check('box opens', opened != null && bytesToUtf8(opened!) === here);
// Eve (random key) cannot open
const eve = nacl.box.keyPair();
check('box rejects wrong key', nacl.box.open(ct, nonce, alice.box.publicKey, eve.secretKey) == null);

// signature using base64 string round-trip of keys (mirrors seal.ts)
const msg = 'packet|fields|here';
const sig = nacl.sign.detached(utf8ToBytes(msg), fromB64(toB64(alice.sign.secretKey)));
check('sig verifies', nacl.sign.detached.verify(utf8ToBytes(msg), sig, fromB64(toB64(alice.sign.publicKey))));
check('sig rejects tamper', !nacl.sign.detached.verify(utf8ToBytes(msg + 'x'), sig, alice.sign.publicKey));

console.log(failures === 0 ? '\n✅ ALL CODEC + CRYPTO CHECKS PASSED' : `\n❌ ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
