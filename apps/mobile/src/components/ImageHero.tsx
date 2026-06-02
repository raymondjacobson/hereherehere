import { type ImageSourcePropType, Image as RNImage, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Image as SvgImage, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/useTheme';

type Props = {
  source: ImageSourcePropType;
  size: number;
  /** Per-edge fade depth as a fraction of `size`. Tuned so the artwork melts
   *  into the background with no visible seams while the subject stays crisp.
   *  Sides fade wider than top/bottom because the empty background sits there. */
  edges?: { top?: number; bottom?: number; side?: number };
  /** Feather the edges to *transparent* with a radial mask (like the web hero)
   *  instead of painting the bg color over them. Use this over the glow/gradient
   *  background, where a flat-color fade would leave a visible box. */
  mask?: boolean;
};

/**
 * A square hero image whose edges fade into the app background, so the artwork
 * melts into the screen instead of sitting in a hard-clipped box.
 *
 * Two modes:
 *  - default: overlay the bg color at the edges (fast, perfect on a flat bg).
 *  - `mask`: feather the image itself to transparent via a radial mask, so any
 *    background (including the glow gradient) shows through — mirrors the web
 *    landing page's `mask-image: radial-gradient(...)` hero.
 */
export function ImageHero({ source, size, edges, mask }: Props) {
  const { c } = useTheme();

  if (mask) {
    const resolved = RNImage.resolveAssetSource(source);
    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            {/* closest-side radial: opaque core, feathering to transparent at
                the edge (matches the web hero's mask-image). */}
            <RadialGradient id="hero-mask" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fff" stopOpacity={1} />
              <Stop offset="62%" stopColor="#fff" stopOpacity={1} />
              <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </RadialGradient>
            <Mask id="hero-mask-shape">
              <Rect x={0} y={0} width={size} height={size} fill="url(#hero-mask)" />
            </Mask>
          </Defs>
          <SvgImage
            href={resolved?.uri ? { uri: resolved.uri } : source}
            x={0}
            y={0}
            width={size}
            height={size}
            preserveAspectRatio="xMidYMid slice"
            mask="url(#hero-mask-shape)"
          />
        </Svg>
      </View>
    );
  }

  const top = Math.round(size * (edges?.top ?? 0.24));
  const bottom = Math.round(size * (edges?.bottom ?? 0.28));
  const side = Math.round(size * (edges?.side ?? 0.4));

  const bg = c.bg;
  const bg0 = `${c.bg}00`; // same color, alpha 0

  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={source}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={250}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[bg, bg0]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[bg0, bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: bottom }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[bg, bg0]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: side }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[bg0, bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: side }}
      />
    </View>
  );
}
