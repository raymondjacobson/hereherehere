/**
 * Friend-link landing logic.
 *
 * The friend payload lives in the URL *fragment* (after #), so it never reaches
 * the static host — the page decodes it entirely client-side, mirroring the
 * app's friend-code format. We show who's adding you, then try to open the app
 * (deep link), falling back to install instructions.
 */

// Where to send people who don't have the app yet. Swap for the real
// App Store / TestFlight URL before launch.
const STORE_URL = 'https://hereherehere.app';
const APP_SCHEME = 'hereherehere';

type FriendPayload = { v: number; n: string; s: string; b: string; t: number };

function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Mirror of the app's short identity fingerprint (src/crypto/keys.ts). */
function fingerprint(signPkB64: string): string {
  try {
    const bytes = fromB64(signPkB64);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 6; i++) {
      out += alphabet[bytes[i] % alphabet.length];
      if (i === 1 || i === 3) out += '-';
    }
    return out;
  } catch {
    return '';
  }
}

function parsePayload(): FriendPayload | null {
  const encoded = window.location.hash.replace(/^#/, '').split(/[?&]/)[0];
  if (!encoded) return null;
  try {
    const json = new TextDecoder().decode(fromB64Url(encoded));
    const p = JSON.parse(json) as FriendPayload;
    if (!p || typeof p.s !== 'string' || typeof p.n !== 'string') return null;
    return p;
  } catch {
    return null;
  }
}

const $ = (id: string) => document.getElementById(id)!;

function render() {
  const payload = parsePayload();
  const store = $('store') as HTMLAnchorElement;
  const open = $('open') as HTMLAnchorElement;
  const blob = $('blob') as HTMLElement;
  store.href = STORE_URL;

  if (!payload) {
    blob.classList.remove('pink');
    blob.classList.add('motif');
    blob.innerHTML = '<img src="/connect.png" alt="Scanning a friend code to connect" />';
    $('title').textContent = 'Friend links';
    $('lede').textContent =
      "When someone taps “Add me” in hereherehere, it creates a personal link. Open that link on your phone and it adds them as a friend. It looks like you’re here without one.";
    open.style.display = 'none';
    store.textContent = 'How it works';
    store.href = '/how/';
    return;
  }

  blob.classList.remove('pink');
  blob.classList.add('motif');
  blob.innerHTML = '<img src="/handshake.png" alt="Two clay hands shaking" />';
  $('title').textContent = `${payload.n} wants to connect`;
  $('fingerprint').textContent = fingerprint(payload.s);
  $('lede').textContent = 'Open hereherehere to add them. They’ll need to add you too.';

  // Deep link back into the app, preserving the payload in the fragment.
  const deepLink = `${APP_SCHEME}://friend#${window.location.hash.replace(/^#/, '')}`;
  open.href = deepLink;
  open.textContent = `Add ${payload.n} in the app`;
}

render();
window.addEventListener('hashchange', render);
