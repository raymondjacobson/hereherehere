import { View } from 'react-native';
import { Text } from './Text';
import { palettes } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';

// Cycle through pastel tints for friend avatars.
const TINTS = ['pink', 'blue', 'yellow'] as const;

type Props = { name: string; colorIndex: number; size?: number; muted?: boolean };

export function Avatar({ name, colorIndex, size = 48, muted }: Props) {
  const { scheme } = useTheme();
  const tint = TINTS[colorIndex % TINTS.length];
  const bg = palettes[scheme][tint];
  const initial = name.trim().charAt(0).toUpperCase() || '?';
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
      <Text weight="bold" style={{ fontSize: size * 0.42, color: palettes.light.text }}>
        {initial}
      </Text>
    </View>
  );
}
