import { Pressable, Text as RNText, View } from 'react-native';
import { Text } from './Text';
import { EMOJI_GROUPS } from '@/data/emoji';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

type Props = {
  value?: string;
  onSelect: (emoji: string) => void;
  /** Side length of each emoji tile. */
  tile?: number;
};

/** A wrapped grid of emoji tiles, grouped by category. Reused in onboarding
 *  and settings. Selection is highlighted with the accent color. */
export function EmojiPicker({ value, onSelect, tile = 52 }: Props) {
  const { c } = useTheme();
  return (
    <View style={{ gap: spacing.lg }}>
      {EMOJI_GROUPS.map((group) => (
        <View key={group.label} style={{ gap: spacing.sm }}>
          <Text variant="meta" weight="bold" color="textTertiary">
            {group.label.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {group.emojis.map((emoji) => {
              const selected = emoji === value;
              return (
                <Pressable
                  key={emoji}
                  onPress={() => onSelect(emoji)}
                  style={({ pressed }) => ({
                    width: tile,
                    height: tile,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? c.accentSoft : c.surfaceAlt,
                    borderWidth: 2,
                    borderColor: selected ? c.accent : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <RNText style={{ fontSize: tile * 0.5 }}>{emoji}</RNText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
