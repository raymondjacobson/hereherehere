import { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { HereCard } from '@/components/HereCard';
import { ImageHero } from '@/components/ImageHero';
import { MotifButton } from '@/components/MotifButton';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useNow } from '@/hooks/useNow';
import { useStore } from '@/state/store';
import { computeBoard, type BoardEntry } from '@/domain/board';
import { mockTransport } from '@/transport/mock';
import { motifs } from '@/assets/motifs';

/** Height of the pinned glass top bar below the safe-area inset. */
const BAR_BODY = 96;

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

  const barHeight = insets.top + BAR_BODY;

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
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
            emoji={identity.emoji}
            seed={identity.signPk}
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
          FRIENDS
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
            ? board.quiet.map((entry) =>
                entry.here ? (
                  <HereCard
                    key={entry.friend.id}
                    name={entry.friend.displayName}
                    colorIndex={entry.friend.colorIndex}
                    here={entry.here}
                    state="expired"
                    now={now}
                    emoji={entry.friend.emoji}
                    seed={entry.friend.id}
                  />
                ) : (
                  <View key={entry.friend.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingHorizontal: spacing.sm }}>
                    <Avatar
                      name={entry.friend.displayName}
                      colorIndex={entry.friend.colorIndex}
                      size={40}
                      muted
                      emoji={entry.friend.emoji}
                      seed={entry.friend.id}
                    />
                    <Text variant="body" weight="medium" color="textSecondary">
                      {entry.friend.displayName}
                    </Text>
                  </View>
                ),
              )
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
            emoji={item.friend.emoji}
            seed={item.friend.id}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={{
          paddingTop: barHeight + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 160,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Pinned frosted-glass top bar — the board scrolls underneath it. */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: barHeight }}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 24}
          tint="light"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />
        <View
          style={{
            flex: 1,
            paddingTop: insets.top,
            paddingHorizontal: spacing.xl,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View>
            <Text variant="title" weight="extrabold">
              hereherehere
            </Text>
            <NearbyChip count={nearby} onPress={() => router.push('/refresh')} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <MotifButton motif={motifs.connect} accessibilityLabel="Friend code" onPress={() => router.push('/friends/code')} />
            <MotifButton motif={motifs.settings} accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
          </View>
        </View>
      </View>

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
