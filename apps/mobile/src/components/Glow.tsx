import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Whole-screen "glowy rave" background, echoing the landing page: a soft
 * warm→cool vertical gradient across the entire product, with cyan / pink /
 * yellow radial glows near the top. Additive, sits behind all content, changes
 * no component colors. Remove this layer (and its call sites) to revert.
 */
export function Glow() {
  const { width: W, height: H } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={W} height={H}>
        <Defs>
          {/* Full-page base: warm cream at top, a faint cool tint at the bottom. */}
          <LinearGradient id="glow-base" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FCF8F2" />
            <Stop offset="1" stopColor="#F1F1FA" />
          </LinearGradient>
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
        <Rect x={0} y={0} width={W} height={H} fill="url(#glow-base)" />
        <Ellipse cx={W * 0.18} cy={H * 0.07} rx={W * 0.62} ry={W * 0.62} fill="url(#glow-cyan)" />
        <Ellipse cx={W * 0.86} cy={H * 0.05} rx={W * 0.64} ry={W * 0.64} fill="url(#glow-pink)" />
        <Ellipse cx={W * 0.5} cy={H * 0.24} rx={W * 0.74} ry={W * 0.58} fill="url(#glow-yellow)" />
      </Svg>
    </View>
  );
}
