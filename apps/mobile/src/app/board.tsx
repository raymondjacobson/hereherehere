import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { HereCard } from '@/components/HereCard';
import { ImageHero } from '@/components/ImageHero';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/state/store';
import { computeBoard, type BoardEntry } from '@/domain/board';
import { mockTransport } from '@/transport/mock';

function IconButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text style={{ fontSize: 20 }}>{label}</Text>
    </Pressable>
  );
}

/** Friendly indicator of how many nearby phones could carry your messages. */
function NearbyChip({ count, onPress }: { count: number; onPress: () => void }) {
  const { c } = useTheme();
  const active = count > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
        opacity: pressed ? 0.8 : 1,
      })}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? c.success : c.textTertiary }} />
      <Text variant="meta" weight="semibold" color={active ? 'text' : 'textSecondary'}>
        {active ? `${count} nearby` : 'Looking nearby…'}
      </Text>
    </Pressable>
  );
}

export default function BoardScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();

  const { width } = useWindowDimensions();
  const identity = useStore((s) => s.identity);
  const friends = useStore((s) => s.friends);
  const heres = useStore((s) => s.heres);
  const [showQuiet, setShowQuiet] = useState(false);
  const [nearby, setNearby] = useState(() => mockTransport.getNearby());

  // Ambient nearby-peer count while the board is on screen.
  useEffect(() => {
    mockTransport.startAmbient();
    const unsub = mockTransport.onNearby(setNearby);
    return () => {
      unsub();
      mockTransport.stopAmbient();
    };
  }, []);

  const ownHere = identity ? heres[identity.signPk] : undefined;

  const latestByAuthor = useMemo(() => {
    const m = new Map<string, (typeof heres)[string]>();
    for (const f of friends) {
      const h = heres[f.id];
      if (h) m.set(f.id, h);
    }
    return m;
  }, [friends, heres]);

  const board = useMemo(() => computeBoard(friends, latestByAuthor, now), [friends, latestByAuthor, now]);

  const friendsById = useMemo(() => new Map(friends.map((f) => [f.id, f])), [friends]);

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
      {/* App bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text variant="title" weight="extrabold">
            hereherehere
          </Text>
          <NearbyChip count={nearby} onPress={() => router.push('/refresh')} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <IconButton label="👥" onPress={() => router.push('/friends/code')} />
          <IconButton label="⚙️" onPress={() => router.push('/settings')} />
        </View>
      </View>

      {/* Own here */}
      {ownHere && identity ? (
        <Pressable onPress={() => router.push('/compose')}>
          <HereCard
            name={identity.displayName}
            colorIndex={0}
            here={ownHere}
            state={now < ownHere.endsAt ? 'active' : 'expired'}
            now={now}
            isSelf
          />
        </Pressable>
      ) : (
        <Card onPress={() => router.push('/compose')} muted>
          <Text variant="heading" weight="bold">
            Post your first message
          </Text>
          <Text variant="callout" color="textSecondary" style={{ marginTop: spacing.xs }}>
            Tell your friends where you’ll be and until when.
          </Text>
        </Card>
      )}

      {board.primary.length > 0 ? (
        <Text variant="meta" weight="bold" color="textSecondary" style={{ marginTop: spacing.sm }}>
          FRIENDS · BY LATEST MESSAGE
        </Text>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
      {board.primary.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <ImageHero source={require('../../assets/states/empty-board.png')} size={Math.min(width * 0.72, 300)} />
        </View>
      ) : null}

      {board.quiet.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Pressable
            onPress={() => setShowQuiet((v) => !v)}
            style={({ pressed }) => ({
              backgroundColor: c.surfaceAlt,
              borderRadius: radius.md,
              padding: spacing.lg,
              opacity: pressed ? 0.85 : 1,
            })}>
            <Text variant="callout" weight="semibold" color="textSecondary">
              {showQuiet ? 'Hide' : 'Show'} {board.quiet.length} friend{board.quiet.length === 1 ? '' : 's'} without recent messages
            </Text>
          </Pressable>
          {showQuiet
            ? board.quiet.map((f) => (
                <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.sm }}>
                  <Avatar name={f.displayName} colorIndex={f.colorIndex} size={40} muted />
                  <Text variant="body" weight="medium" color="textSecondary">
                    {f.displayName}
                  </Text>
                </View>
              ))
            : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList<BoardEntry>
        data={board.primary}
        keyExtractor={(item) => item.friend.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item }) => (
          <HereCard
            name={item.friend.displayName}
            colorIndex={item.friend.colorIndex}
            here={item.here}
            state={item.state}
            now={now}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 160,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom actions */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          gap: spacing.sm,
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}>
        <Button title="Refresh Crowd" variant="secondary" onPress={() => router.push('/refresh')} />
        <Button title="Post Message" big onPress={() => router.push('/compose')} />
      </View>
    </View>
  );
}
