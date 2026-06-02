import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fontFamily, displayFamily, type, type Palette } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

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
  /** Force the DynaPuff display face on/off. Defaults on for hero/title. */
  display?: boolean;
};

// Expressive headlines render in DynaPuff at 600–700 (never lighter).
function displayWeight(weight: Weight): keyof typeof displayFamily {
  if (weight === 'bold' || weight === 'extrabold') return 'bold';
  if (weight === 'semibold') return 'semibold';
  return 'semibold';
}

export function Text({
  variant = 'body',
  weight = 'regular',
  color = 'text',
  center,
  display,
  style,
  ...rest
}: TextProps) {
  const { c } = useTheme();
  const isDisplay = display ?? (variant === 'hero' || variant === 'title');
  const base: TextStyle = {
    ...type[variant],
    fontFamily: isDisplay ? displayFamily[displayWeight(weight)] : fontFamily[weight],
    color: c[color],
    // Slightly tight tracking on DynaPuff headlines, matching the web (~-0.03em).
    ...(isDisplay ? { letterSpacing: -(type[variant].fontSize * 0.03) } : null),
    ...(center ? { textAlign: 'center' } : null),
  };
  return <RNText style={[base, style]} {...rest} />;
}
