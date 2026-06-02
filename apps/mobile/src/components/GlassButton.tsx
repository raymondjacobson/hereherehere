import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { radius } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

type Props = {
  title: string;
  onPress: () => void;
  /** 'accent' = frosted pink (primary), 'neutral' = frosted white (secondary). */
  tint?: 'accent' | 'neutral';
  big?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * A floating glass pill: a real native BlurView clipped to a capsule, with a
 * translucent tint, a light highlight edge, and a soft drop shadow. The shadow
 * lives on the outer (non-clipping) view; the blur is clipped on the inner one.
 */
export function GlassButton({ title, onPress, tint = 'neutral', big, disabled, style }: Props) {
  const { c } = useTheme();
  const overlay = tint === 'accent' ? `${c.accent}A6` : '#FFFFFF73';

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          ...Platform.select({
            ios: { shadowColor: '#3a2a18', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 6 },
            default: {},
          }),
        },
        style,
      ]}>
      <View
        style={{
          borderRadius: radius.pill,
          overflow: 'hidden',
          minHeight: big ? 60 : 56,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 18,
        }}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 24}
          tint="light"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />
        <Text variant={big ? 'heading' : 'body'} weight="bold" style={{ color: c.text }} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}
