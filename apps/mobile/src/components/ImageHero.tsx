import { type ImageSourcePropType, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/useTheme';

type Props = {
  source: ImageSourcePropType;
  size: number;
  /** Per-edge fade depth as a fraction of `size`. Tuned so the artwork melts
   *  into the background with no visible seams while the subject stays crisp.
   *  Sides fade wider than top/bottom because the empty background sits there. */
  edges?: { top?: number; bottom?: number; side?: number };
};

/**
 * A square hero image whose edges fade into the app background color, so the
 * artwork melts into the screen instead of sitting in a hard-clipped box.
 *
 * We fade to a fully-transparent version of the *same* bg color (alpha 00)
 * rather than `transparent`, which would otherwise tint the fade toward black.
 */
export function ImageHero({ source, size, edges }: Props) {
  const { c } = useTheme();
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
