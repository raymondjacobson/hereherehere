import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fontFamily, type, type Palette } from '@/theme/theme';
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
  const base: TextStyle = {
    ...type[variant],
    fontFamily: fontFamily[weight],
    color: c[color],
    ...(center ? { textAlign: 'center' } : null),
  };
  return <RNText style={[base, style]} {...rest} />;
}
