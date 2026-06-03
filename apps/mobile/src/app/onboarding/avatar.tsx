import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { spacing } from '@/theme/theme';
import { useStore } from '@/state/store';

export default function AvatarScreen() {
  const router = useRouter();
  const identity = useStore((s) => s.identity);
  const setEmoji = useStore((s) => s.setEmoji);

  return (
    <Screen glow={false}>
      <View style={{ gap: spacing.md, alignItems: 'center', paddingTop: spacing.md }}>
        <Avatar
          name={identity?.displayName ?? ''}
          colorIndex={0}
          size={96}
          emoji={identity?.emoji}
          seed={identity?.signPk}
        />
        <Text variant="hero" weight="extrabold" center>
          Pick your emoji
        </Text>
        <Text variant="body" color="textSecondary" center>
          This helps your friends easily spot you. You can change it anytime.
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: spacing.xl }}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}>
        <EmojiPicker value={identity?.emoji} onSelect={setEmoji} />
      </ScrollView>

      <Button title="Continue" big onPress={() => router.push('/onboarding/explainer')} />
    </Screen>
  );
}
