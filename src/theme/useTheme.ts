import { useColorScheme } from 'react-native';
import { palettes, type Palette, type Scheme } from './theme';

export function useScheme(): Scheme {
  const system = useColorScheme();
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme(): { scheme: Scheme; c: Palette } {
  const scheme = useScheme();
  return { scheme, c: palettes[scheme] };
}
