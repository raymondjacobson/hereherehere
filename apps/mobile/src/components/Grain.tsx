import { Image, StyleSheet, View } from 'react-native';

/**
 * A subtle, tiled paper-grain overlay. Sits behind content (absolute fill) to
 * give surfaces a printed/handmade texture instead of a flat digital fill.
 * Uses RN Image's "repeat" resize mode to tile the 256px grain tile. Wrapped in
 * a non-interactive View so it never intercepts touches.
 */
export function Grain({ opacity = 0.55 }: { opacity?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={require('../../assets/textures/grain.png')}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, { opacity }]}
      />
    </View>
  );
}
