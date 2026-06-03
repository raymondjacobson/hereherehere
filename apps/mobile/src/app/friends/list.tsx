import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { ImageHero } from '@/components/ImageHero';
import { spacing, radius } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { fingerprint } from '@/crypto/keys';

export default function FriendsListScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const friends = useStore((s) => s.friends);
  const removeFriend = useStore((s) => s.removeFriend);

  function confirmRemove(id: string, name: string) {
    Alert.alert('Remove friend?', `${name} will no longer see your messages, and theirs won't reach you. You can re-add each other anytime.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFriend(id) },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.md,
        }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 60 }}>
          <Text variant="body" weight="semibold" color="textSecondary">
            Back
          </Text>
        </Pressable>
        <Text variant="heading" weight="bold">
          Friends
        </Text>
        <View style={{ width: 60, alignItems: 'flex-end' }}>
          <Pressable onPress={() => router.push('/friends/code')} hitSlop={12}>
            <Text variant="body" weight="bold" color="accent">
              Add
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
        showsVerticalScrollIndicator={false}>
        {friends.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.lg }}>
            <ImageHero source={require('../../../assets/states/empty-board.png')} size={220} mask />
            <Text variant="body" color="textSecondary" center>
              No friends yet. Add someone by scanning their friend code.
            </Text>
            <Pressable
              onPress={() => router.push('/friends/code')}
              style={{ backgroundColor: c.accent, borderRadius: radius.pill, paddingVertical: spacing.md, paddingHorizontal: spacing.xl }}>
              <Text variant="body" weight="bold" color="textInverse">
                Add a friend
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text variant="meta" weight="bold" color="textSecondary" style={{ marginTop: spacing.xs }}>
              {friends.length} {friends.length === 1 ? 'FRIEND' : 'FRIENDS'}
            </Text>
            {friends.map((f) => (
              <Card key={f.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
                  <Avatar name={f.displayName} colorIndex={f.colorIndex} size={44} emoji={f.emoji} seed={f.id} />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="bold" numberOfLines={1}>
                      {f.displayName}
                    </Text>
                    <Text variant="meta" color="textTertiary">
                      {fingerprint(f.signPk)}
                    </Text>
                  </View>
                  <Pressable onPress={() => confirmRemove(f.id, f.displayName)} hitSlop={10}>
                    <Text variant="callout" weight="bold" color="expired">
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
