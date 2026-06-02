import { type ReactNode } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  muted?: boolean;
};

// Soft, warm, diffuse shadow so cards read as paper objects on the surface
// (no hairline borders). Lives on the outer view; an inner view does the
// rounded clipping so full-bleed children (e.g. the pack banner) still clip.
const shadow = Platform.select({
  ios: { shadowColor: '#3a2a18', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 4 },
  default: {},
});

export function Card({ children, onPress, style, muted }: Props) {
  const { c } = useTheme();
  const outer: ViewStyle = {
    backgroundColor: muted ? c.surfaceAlt : c.surface,
    borderRadius: radius.lg,
    ...shadow,
  };
  const inner = <View style={{ borderRadius: radius.lg, padding: spacing.xl, overflow: 'hidden' }}>{children}</View>;

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [outer, { opacity: pressed ? 0.95 : 1 }, style]}>
        {inner}
      </Pressable>
    );
  }
  return <View style={[outer, style]}>{inner}</View>;
}
