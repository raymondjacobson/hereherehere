import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/**
 * Subtle "glowy rave" ambiance — soft cyan / pink / yellow radial glows near the
 * top, echoing the landing page. Additive and self-contained: sits behind the
 * grain + content and changes no existing colors. Remove this layer (and its two
 * call sites) to fully revert the look.
 */
export function Glow() {
  const { width: W, height: H } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H}>
        <Defs>
          <RadialGradient id="glow-cyan" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#7DEBFF" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#7DEBFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow-pink" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FF7AB6" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#FF7AB6" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glow-yellow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFEF75" stopOpacity={0.16} />
            <Stop offset="100%" stopColor="#FFEF75" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={W * 0.18} cy={H * 0.07} rx={W * 0.62} ry={W * 0.62} fill="url(#glow-cyan)" />
        <Ellipse cx={W * 0.86} cy={H * 0.05} rx={W * 0.64} ry={W * 0.64} fill="url(#glow-pink)" />
        <Ellipse cx={W * 0.5} cy={H * 0.24} rx={W * 0.74} ry={W * 0.58} fill="url(#glow-yellow)" />
      </Svg>
    </View>
  );
}
