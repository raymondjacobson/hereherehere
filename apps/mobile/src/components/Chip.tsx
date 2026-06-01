import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => ({
        backgroundColor: selected ? c.accentSoft : c.surfaceAlt,
        borderColor: selected ? c.accent : c.border,
        borderWidth: 1.5,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.lg,
        opacity: pressed ? 0.85 : 1,
      })}>
      <Text variant="callout" weight={selected ? 'bold' : 'medium'} color={selected ? 'accent' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}
