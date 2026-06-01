import { Text as RNText, View } from 'react-native';
import { Text } from './Text';
import { palettes } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { defaultEmojiFor } from '@/data/emoji';

// Cycle through pastel tints for friend avatars.
const TINTS = ['pink', 'blue', 'yellow'] as const;

type Props = {
  name: string;
  colorIndex: number;
  size?: number;
  muted?: boolean;
  /** Explicitly chosen emoji. */
  emoji?: string;
  /** Stable id used to derive a default emoji when none is chosen. */
  seed?: string;
};

export function Avatar({ name, colorIndex, size = 48, muted, emoji, seed }: Props) {
  const { scheme } = useTheme();
  const tint = TINTS[colorIndex % TINTS.length];
  const bg = palettes[scheme][tint];
  // Prefer a chosen emoji, then a stable default from the seed, and only fall
  // back to an initial when we have neither (e.g. a bare name preview).
  const glyph = emoji?.trim() || (seed ? defaultEmojiFor(seed) : '');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: muted ? 0.5 : 1,
      }}>
      {glyph ? (
        <RNText style={{ fontSize: size * 0.5 }}>{glyph}</RNText>
      ) : (
        <Text weight="bold" style={{ fontSize: size * 0.42, color: palettes.light.text }}>
          {name.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      )}
    </View>
  );
}
