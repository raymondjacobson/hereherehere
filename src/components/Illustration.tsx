import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/useTheme';

type Props = { emoji: string; tint: 'pink' | 'blue' | 'yellow'; size?: number };

/**
 * Placeholder for the claymation/handmade illustrations. A soft pastel blob with
 * a token in the middle — reserves the space + motion language for real art later.
 */
export function Illustration({ emoji, tint, size = 180 }: Props) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c[tint],
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.9,
        }}>
        <Text style={{ fontSize: size * 0.42, lineHeight: size * 0.5 }}>{emoji}</Text>
      </View>
    </View>
  );
}
