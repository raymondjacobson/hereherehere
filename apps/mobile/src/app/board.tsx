import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, LayoutAnimation, Pressable, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Avatar } from '@/components/Avatar';
import { HereCard } from '@/components/HereCard';
import { ImageHero } from '@/components/ImageHero';
import { MotifButton } from '@/components/MotifButton';
import { Grain } from '@/components/Grain';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useNow } from '@/hooks/useNow';
import { useLiveSync } from '@/hooks/useLiveSync';
import { useStore } from '@/state/store';
import { computeBoard, type BoardEntry } from '@/domain/board';
import { motifs } from '@/assets/motifs';

/** Pull distance (pts) past which releasing triggers a refresh boost. */
const PULL = 72;
/** Height of the gap held open at the top while a refresh is spinning. */
const REFRESH_GAP = 84;

/**
 * Top-left live status: how many phones we're hearing nearby. Always on while
 * the board is open — friends' messages arrive on their own; pull down to boost.
 */
function StatusPill({ nearby }: { nearby: number }) {
  const { c } = useTheme();
  const active = nearby > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: active ? c.success : c.textTertiary }} />
      <Text variant="meta" weight="semibold" color={active ? 'text' : 'textSecondary'}>
        {active ? `${nearby} nearby` : 'Looking nearby…'}
      </Text>
    </View>
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
  // Live sync: friends' messages arrive on their own while the board is open.
  const { nearby, boost } = useLiveSync();

  // Custom pull-to-refresh: the refresh motif winds as you pull, then spins
  // while a boost is in flight.
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef(0);
  const spin = useRef(new Animated.Value(0)).current;

  const triggerRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    spin.setValue(0);
    // Animate the gap open and keep it held down while the motif spins.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefreshing(true);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    await boost();
    loop.stop();
    refreshingRef.current = false;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRefreshing(false);
  }, [boost, spin]);

  // Arriving from "Refresh the crowd now" (e.g. just after posting) triggers a
  // one-shot boost in place rather than a full-screen takeover.
  const { refresh: refreshParam } = useLocalSearchParams<{ refresh?: string }>();
  const autoStarted = useRef(false);
  useEffect(() => {
    if (refreshParam === '1' && !autoStarted.current) {
      autoStarted.current = true;
      triggerRefresh();
    }
  }, [refreshParam, triggerRefresh]);

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

  const pullOpacity = scrollY.interpolate({ inputRange: [-PULL, -12, 0], outputRange: [1, 0.12, 0], extrapolate: 'clamp' });
  const pullScale = scrollY.interpolate({ inputRange: [-PULL, 0], outputRange: [1, 0.5], extrapolate: 'clamp' });
  const pullRotate = scrollY.interpolate({ inputRange: [-PULL, 0], outputRange: ['0deg', '-150deg'], extrapolate: 'clamp' });
  const spinRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const header = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
      {/* App bar — scrolls away with the content */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text variant="title" weight="extrabold">
            hereherehere
          </Text>
          <StatusPill nearby={nearby} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <MotifButton motif={motifs.connect} accessibilityLabel="Friend code" onPress={() => router.push('/friends/code')} />
          <MotifButton motif={motifs.settings} accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
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
      <Grain />
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
          paddingTop: insets.top + spacing.md + (refreshing ? REFRESH_GAP : 0),
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 130,
        }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          offsetRef.current = y;
          scrollY.setValue(y);
        }}
        onScrollEndDrag={() => {
          if (offsetRef.current <= -PULL) triggerRefresh();
        }}
      />

      {/* Pull-to-refresh indicator: refresh motif winds on pull, spins while boosting */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + spacing.md + (REFRESH_GAP - 48) / 2,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 20,
          opacity: refreshing ? 1 : pullOpacity,
          transform: [
            { scale: refreshing ? 1 : pullScale },
            { rotate: refreshing ? spinRotate : pullRotate },
          ],
        }}>
        <Image source={motifs.refresh} style={{ width: 48, height: 48 }} contentFit="contain" />
      </Animated.View>

      {/* Floating Post action — pull down to boost the crowd refresh */}
      <View style={{ position: 'absolute', right: spacing.xl, bottom: insets.bottom + spacing.md }}>
        <MotifButton
          motif={motifs.post}
          size={64}
          glass
          accessibilityLabel="Post a message"
          onPress={() => router.push('/compose')}
        />
      </View>
    </View>
  );
}
