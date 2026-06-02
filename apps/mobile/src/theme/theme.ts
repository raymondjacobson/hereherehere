/**
 * hereherehere theme.
 *
 * Warm, handmade, comfortable. Neutral base with sparing pastel accents.
 * Never pure black / pure white. Pastels are tuned per scheme.
 */

export type Scheme = 'light' | 'dark';

export type Palette = {
  // Base surfaces
  bg: string; // app background
  surface: string; // card / raised surface
  surfaceAlt: string; // secondary surface (chips, wells)
  border: string; // hairline separators

  // Text
  text: string; // primary
  textSecondary: string; // muted
  textTertiary: string; // very muted (timestamps, meta)
  textInverse: string; // text on accent fills

  // Pastel accents
  pink: string;
  blue: string;
  yellow: string;

  // Accent used for primary CTAs / active states
  accent: string;
  accentSoft: string; // soft fill behind accent things

  // States
  expired: string; // grayed/stale here text
  success: string;
};

const light: Palette = {
  bg: '#FBF7F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F2ECE2',
  border: '#E8DFD2',

  text: '#211C16',
  textSecondary: '#6B6358',
  textTertiary: '#9A9082',
  textInverse: '#211C16',

  pink: '#F4B8CB',
  blue: '#A9C9F0',
  yellow: '#F6D98A',

  accent: '#F19DB6',
  accentSoft: '#FBE3EA',

  expired: '#A89F92',
  success: '#7CB89A',
};

const dark: Palette = {
  bg: '#17140F',
  surface: '#211C16',
  surfaceAlt: '#2A241D',
  border: '#352E25',

  text: '#F5EFE6',
  textSecondary: '#B6AD9F',
  textTertiary: '#7E7567',
  textInverse: '#211C16',

  pink: '#E7A6BC',
  blue: '#9FBEE6',
  yellow: '#E9CB82',

  accent: '#E7A6BC',
  accentSoft: '#3A2A30',

  expired: '#6E665A',
  success: '#86C2A4',
};

export const palettes: Record<Scheme, Palette> = { light, dark };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const fontFamily = {
  // Plus Jakarta Sans — body/UI text.
  regular: 'Jakarta_400Regular',
  medium: 'Jakarta_500Medium',
  semibold: 'Jakarta_600SemiBold',
  bold: 'Jakarta_700Bold',
  extrabold: 'Jakarta_800ExtraBold',
} as const;

// Bricolage Grotesque — characterful display face for big headers + the
// wordmark, so the chrome has a voice that matches the handmade artwork.
export const displayFamily = {
  regular: 'Bricolage_500Medium',
  medium: 'Bricolage_500Medium',
  semibold: 'Bricolage_700Bold',
  bold: 'Bricolage_700Bold',
  extrabold: 'Bricolage_800ExtraBold',
} as const;

export const type = {
  // size / lineHeight pairs
  hero: { fontSize: 34, lineHeight: 40 },
  title: { fontSize: 26, lineHeight: 32 },
  heading: { fontSize: 20, lineHeight: 26 },
  body: { fontSize: 17, lineHeight: 24 },
  callout: { fontSize: 15, lineHeight: 21 },
  meta: { fontSize: 13, lineHeight: 18 },
} as const;
