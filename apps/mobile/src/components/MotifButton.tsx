import { type ImageSourcePropType, Platform, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/useTheme';

type Props = {
  motif: ImageSourcePropType;
  onPress: () => void;
  /** Diameter of the token. */
  size?: number;
  accessibilityLabel?: string;
};

/**
 * A nav/action button rendered as a soft white "token" cradling a claymation
 * motif — echoing the product's physical-token motif rather than a flat icon
 * button. The token lifts off the background with a gentle shadow.
 */
export function MotifButton({ motif, onPress, size = 46, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const inset = Math.round(size * 0.2);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
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
        transform: [{ scale: pressed ? 0.94 : 1 }],
        ...Platform.select({
          ios: {
            shadowColor: '#3a2e1e',
            shadowOpacity: 0.16,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 3 },
          },
          android: { elevation: 3 },
          default: {},
        }),
      })}>
      <Image
        source={motif}
        style={{ width: size - inset, height: size - inset }}
        contentFit="contain"
      />
    </Pressable>
  );
}
