import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { displayFamily, fontFamily, type, type Palette } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

// Big headers + the wordmark get the display face; everything else stays sans.
const DISPLAY_VARIANTS = new Set(['hero', 'title']);

type Variant = keyof typeof type;
type Weight = keyof typeof fontFamily;
type ColorToken = keyof Pick<
  Palette,
  'text' | 'textSecondary' | 'textTertiary' | 'textInverse' | 'accent' | 'expired' | 'success'
>;

export type TextProps = RNTextProps & {
  variant?: Variant;
  weight?: Weight;
  color?: ColorToken;
  center?: boolean;
};

export function Text({
  variant = 'body',
  weight = 'regular',
  color = 'text',
  center,
  style,
  ...rest
}: TextProps) {
  const { c } = useTheme();
  const family = DISPLAY_VARIANTS.has(variant) ? displayFamily[weight] : fontFamily[weight];
  const base: TextStyle = {
    ...type[variant],
    fontFamily: family,
    color: c[color],
    ...(center ? { textAlign: 'center' } : null),
  };
  return <RNText style={[base, style]} {...rest} />;
}
