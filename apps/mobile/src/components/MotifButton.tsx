import { type ImageSourcePropType, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

type Props = {
  motif: ImageSourcePropType;
  onPress: () => void;
  /** Diameter of the token. */
  size?: number;
  accessibilityLabel?: string;
  disabled?: boolean;
  /** When set, shows this text (e.g. a countdown) instead of the motif. */
  overlay?: string;
  /** Frosted-glass token (real BlurView) instead of a solid white one — use
   *  where there's scrolling content behind it to blur. */
  glass?: boolean;
};

/**
 * A nav/action button rendered as a token cradling a claymation motif. Solid
 * white by default (echoing a physical token); `glass` makes it a real frosted
 * BlurView for placements with content scrolling behind.
 */
export function MotifButton({ motif, onPress, size = 46, accessibilityLabel, disabled, overlay, glass }: Props) {
  const { c } = useTheme();
  const inset = Math.round(size * 0.2);
  const shadow = Platform.select({
    ios: { shadowColor: '#3a2e1e', shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
    android: { elevation: 3 },
    default: {},
  });

  const content = overlay ? (
    <Text weight="extrabold" style={{ fontSize: size * 0.34, color: c.text }}>
      {overlay}
    </Text>
  ) : (
    <Image source={motif} style={{ width: size - inset, height: size - inset }} contentFit="contain" />
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        opacity: disabled && !overlay ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
        ...shadow,
        ...(glass ? null : { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }),
      })}>
      {glass ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 55 : 24}
            tint="light"
            experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
          {content}
        </View>
      ) : (
        content
      )}
    </Pressable>
  );
}
