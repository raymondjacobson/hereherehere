import { Image, StyleSheet, View } from 'react-native';

/**
 * A subtle paper-grain overlay. Sits behind content (absolute fill) to give
 * surfaces a printed/handmade texture instead of a flat digital fill.
 *
 * NOTE: we deliberately do NOT use resizeMode="repeat" — on the New Architecture
 * (Fabric) it renders a single tile in the top-left corner instead of tiling,
 * which looked like a dark patch under the wordmark. A large source filled with
 * "cover" stays uniform everywhere. Wrapped in a non-interactive View.
 */
export function Grain({ opacity = 0.55 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={require('../../assets/textures/grain.png')}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { opacity }]}
      />
    </View>
  );
}
