import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  muted?: boolean;
};

export function Card({ children, onPress, style, muted }: Props) {
  const { c } = useTheme();
  const base: ViewStyle = {
    backgroundColor: muted ? c.surfaceAlt : c.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}
