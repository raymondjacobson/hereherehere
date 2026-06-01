import { type ImageSourcePropType, Platform, Pressable } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

type Props = {
  motif: ImageSourcePropType;
  onPress: () => void;
  /** Diameter of the token. */
  size?: number;
  accessibilityLabel?: string;
};

/**
 * A circular glass chip cradling a claymation motif. It's intentionally a
 * translucent disc (not its own blur) so it sits cleanly on the frosted glass
 * top bar — the bar supplies the see-through blur, the chip just delineates a
 * tappable target with a light highlight edge.
 */
export function MotifButton({ motif, onPress, size = 46, accessibilityLabel }: Props) {
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
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: pressed ? 0.94 : 1 }],
        ...Platform.select({
          ios: { shadowColor: '#3a2e1e', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
          android: { elevation: 2 },
          default: {},
        }),
      })}>
      <Image source={motif} style={{ width: size - inset, height: size - inset }} contentFit="contain" />
    </Pressable>
  );
}
