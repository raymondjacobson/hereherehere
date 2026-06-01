import { type ImageSourcePropType, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
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
 * A nav/action button rendered as a frosted-glass "token" cradling a claymation
 * motif — the modern iOS glassmorphic material (a real BlurView), with a light
 * highlight edge and a soft drop shadow for lift. The shadow lives on the outer
 * (non-clipping) view; the glass is clipped to the circle on the inner view.
 *
 * On Android we opt into the experimental blur and lean on the translucent
 * white tint so it still reads as frosted glass if the blur is unavailable.
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
        transform: [{ scale: pressed ? 0.94 : 1 }],
        ...Platform.select({
          ios: {
            shadowColor: '#3a2e1e',
            shadowOpacity: 0.16,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
          },
          android: { elevation: 3 },
          default: {},
        }),
      })}>
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
          intensity={Platform.OS === 'ios' ? 50 : 32}
          tint="light"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        {/* Frosted milk + a soft top highlight so it reads as glass on solid bgs */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.32)' }]} />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: size / 2,
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
        <Image source={motif} style={{ width: size - inset, height: size - inset }} contentFit="contain" />
      </View>
    </Pressable>
  );
}
