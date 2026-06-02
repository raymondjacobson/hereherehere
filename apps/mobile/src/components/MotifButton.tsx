import { type ImageSourcePropType, Platform, Pressable } from 'react-native';
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
};

/**
 * A nav/action button rendered as a soft white "token" cradling a claymation
 * motif — echoing the product's physical-token motif. The token lifts off the
 * background with a gentle shadow.
 */
export function MotifButton({ motif, onPress, size = 46, accessibilityLabel, disabled, overlay }: Props) {
  const { c } = useTheme();
  const inset = Math.round(size * 0.2);
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
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        // Dim only when disabled without an overlay (a countdown is an active state).
        opacity: disabled && !overlay ? 0.5 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
        ...Platform.select({
          ios: { shadowColor: '#3a2e1e', shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { width: 0, height: 3 } },
          android: { elevation: 3 },
          default: {},
        }),
      })}>
      {overlay ? (
        <Text weight="extrabold" style={{ fontSize: size * 0.34, color: c.text }}>
          {overlay}
        </Text>
      ) : (
        <Image source={motif} style={{ width: size - inset, height: size - inset }} contentFit="contain" />
      )}
    </Pressable>
  );
}
