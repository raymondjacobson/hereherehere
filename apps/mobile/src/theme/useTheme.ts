import { palettes, type Palette, type Scheme } from './theme';

// Dark mode is disabled for now — the app always renders the warm light theme.
// (Flip this back to reading `useColorScheme()` to re-enable system dark mode.)
export function useScheme(): Scheme {
  return 'light';
}

export function useTheme(): { scheme: Scheme; c: Palette } {
  const scheme = useScheme();
  return { scheme, c: palettes[scheme] };
}
