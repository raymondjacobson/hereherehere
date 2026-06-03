import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Avatar } from '@/components/Avatar';
import { spacing } from '@/theme/theme';
import { useStore } from '@/state/store';
import { fingerprint } from '@/crypto/keys';
import { motifs } from '@/assets/motifs';
import type { FriendCodePayload } from '@/domain/types';

export default function AddFriendScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ n: string; e: string; s: string; b: string; t: string }>();
  const addFriend = useStore((s) => s.addFriend);
  const identity = useStore((s) => s.identity);
  const [added, setAdded] = useState(false);

  const isSelf = identity?.signPk === params.s;

  function onAdd() {
    const payload: FriendCodePayload = {
      v: 1,
      n: params.n ?? 'Friend',
      e: params.e || undefined,
      s: params.s,
      b: params.b,
      t: Number(params.t) || Date.now(),
    };
    addFriend(payload);
    setAdded(true);
  }

  if (isSelf) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
          <Text style={{ fontSize: 56 }}>🪞</Text>
          <Text variant="title" weight="extrabold" center>
            That’s your own friend code.
          </Text>
          <Button title="Back" onPress={() => router.replace('/board')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
        {added ? (
          <>
            <Image source={motifs.handshake} style={{ width: 96, height: 96 }} contentFit="contain" />
            <Text variant="title" weight="extrabold" center>
              {params.n} added
            </Text>
            <Text variant="body" color="textSecondary" center>
              They need to add you too. To see each other’s messages, both people need to add each other.
            </Text>
          </>
        ) : (
          <>
            <Avatar name={params.n ?? '?'} colorIndex={0} size={84} emoji={params.e || undefined} seed={params.s} />
            <View style={{ alignItems: 'center', gap: spacing.xs }}>
              <Text variant="title" weight="extrabold">
                {params.n}
              </Text>
              <Text variant="callout" weight="semibold" color="textSecondary">
                {params.s ? fingerprint(params.s) : ''}
              </Text>
            </View>
            <Text variant="callout" color="textSecondary" center>
              Adding is one-way. Scanning their code adds them to your phone.
            </Text>
          </>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        {added ? (
          <>
            <Button title="See the board" big onPress={() => router.replace('/board')} />
            <Button title="Scan another" variant="ghost" onPress={() => router.replace('/friends/scan')} />
          </>
        ) : (
          <>
            <Button title="Add friend" big onPress={onAdd} />
            <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          </>
        )}
      </View>
    </Screen>
  );
}
