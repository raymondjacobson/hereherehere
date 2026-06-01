import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'glass';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Large bottom pill style with extra height. */
  big?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  big,
  style,
}: Props) {
  const { c } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? c.accent
      : variant === 'secondary'
        ? c.surfaceAlt
        : variant === 'glass'
          ? 'rgba(255,255,255,0.4)'
          : 'transparent';
  const fg = variant === 'primary' ? c.textInverse : c.text;
  const border = variant === 'glass' ? 1 : 0;
  const borderColor = 'rgba(255,255,255,0.7)';

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
          minHeight: big ? 60 : 52,
          borderRadius: radius.pill,
          borderWidth: border,
          borderColor,
        },
        style,
      ]}>
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <Text variant={big ? 'heading' : 'body'} weight="bold" style={{ color: fg }}>
            {title}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
