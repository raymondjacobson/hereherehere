/**
 * Avatar emojis. A friend's avatar is a pastel circle with an emoji in it —
 * warmer and more personal than an initial, and (unlike a photo) it costs
 * nothing to set: a one-tap picker, no upload, no permissions, no storage.
 *
 * The emoji travels with the friend code, so the one you pick is the one your
 * friends see. Until someone picks, `defaultEmojiFor` gives them a stable,
 * pleasant default derived from their id — never an empty letter.
 */

/** Curated, cross-platform-friendly set, grouped for a tidy picker. */
export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Faces',
    emojis: ['😀', '😎', '🤓', '🥳', '😴', '🤠', '🥰', '😇', '🤖', '👽', '🤡', '🦸'],
  },
  {
    label: 'Animals',
    emojis: ['🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🐙', '🦄'],
  },
  {
    label: 'Nature',
    emojis: ['🌸', '🌻', '🌵', '🍄', '🌴', '🔥', '⭐️', '🌈', '🌊', '❄️', '🍀'],
  },
  {
    label: 'Food',
    emojis: ['🍕', '🍔', '🌮', '🍦', '🍩', '🍓', '🍑', '🥑', '☕️', '🍺', '🍉', '🧁'],
  },
  {
    label: 'Things',
    emojis: ['🎸', '🎧', '🎨', '⚽️', '🚀', '🎢', '🏕', '📸', '💎', '🎈', '🛹', '🪩'],
  },
];

/** Flat list, used for deterministic defaults and validation. */
export const AVATAR_EMOJIS: string[] = EMOJI_GROUPS.flatMap((g) => g.emojis);

/** Stable string hash (djb2). Same seed → same emoji, on every device. */
function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A pleasant default emoji for anyone who hasn't picked one yet. */
export function defaultEmojiFor(seed: string): string {
  if (!seed) return AVATAR_EMOJIS[0];
  return AVATAR_EMOJIS[hash(seed) % AVATAR_EMOJIS.length];
}
