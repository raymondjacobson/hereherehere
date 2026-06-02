import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, type ImageSourcePropType, Pressable, useWindowDimensions, View } from 'react-native';
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
import { useCrowdRefresh, type CrowdRefreshState } from '@/hooks/useCrowdRefresh';
import { useStore } from '@/state/store';
import { computeBoard, type BoardEntry } from '@/domain/board';
import { mockTransport } from '@/transport/mock';
import type { SessionPhase } from '@/transport/types';
import { motifs } from '@/assets/motifs';

const PHASE_LABEL: Record<SessionPhase, string> = {
  scanning: 'Scanning',
  trading: 'Trading',
  checking: 'Checking friends',
  updating: 'Updating',
  done: 'Done',
};

/**
 * Top-left status pill. Doubles as the ambient-refresh affordance: idle it
 * reports nearby phones and starts a session on tap; mid-session it shows the
 * live phase + countdown in place; just after, the result — all without leaving
 * the board.
 */
function StatusPill({ nearby, refresh }: { nearby: number; refresh: CrowdRefreshState }) {
  const { c } = useTheme();
  const { active, phase, remaining, newCount, showResult, start } = refresh;

  // Breathe the dot while a session is running.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  let dotColor = nearby > 0 ? c.success : c.textTertiary;
  let label = nearby > 0 ? `${nearby} nearby` : 'Looking nearby…';
  let labelColor: 'text' | 'textSecondary' | 'accent' = nearby > 0 ? 'text' : 'textSecondary';
  // In the result state the leading dot becomes a claymation motif.
  let motif: ImageSourcePropType | null = null;

  if (active) {
    dotColor = c.accent;
    label = `${PHASE_LABEL[phase]} · ${remaining}s`;
    labelColor = 'accent';
  } else if (showResult) {
    motif = newCount > 0 ? motifs.new : motifs.oldMessage;
    label = newCount > 0 ? `${newCount} new` : 'nothing new';
    labelColor = newCount > 0 ? 'text' : 'textSecondary';
  }

  return (
    <Pressable
      onPress={start}
      disabled={active}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        alignSelf: 'flex-start',
        marginTop: spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        backgroundColor: active ? c.accentSoft : c.surfaceAlt,
        borderWidth: 1,
        borderColor: active ? c.accent : c.border,
        opacity: pressed && !active ? 0.8 : 1,
      })}>
      {motif ? (
        <Image source={motif} style={{ width: 18, height: 18, marginVertical: -3 }} contentFit="contain" />
      ) : (
        <Animated.View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: dotColor,
            opacity: active ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) : 1,
            transform: [{ scale: active ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) : 1 }],
          }}
        />
      )}
      <Text variant="meta" weight="semibold" color={labelColor}>
        {label}
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
  const refresh = useCrowdRefresh();

  // Ambient nearby-peer count while the board is on screen.
  useEffect(() => {
    mockTransport.startAmbient();
    const unsub = mockTransport.onNearby(setNearby);
    return () => {
      unsub();
      mockTransport.stopAmbient();
    };
  }, []);

  // Arriving from "Refresh the crowd now" (e.g. just after posting) kicks off an
  // ambient session in place rather than a full-screen takeover.
  const { refresh: refreshParam } = useLocalSearchParams<{ refresh?: string }>();
  const autoStarted = useRef(false);
  useEffect(() => {
    if (refreshParam === '1' && !autoStarted.current) {
      autoStarted.current = true;
      refresh.start();
    }
  }, [refreshParam, refresh]);

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
      {/* App bar — scrolls away with the content */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text variant="title" weight="extrabold">
            hereherehere
          </Text>
          <StatusPill nearby={nearby} refresh={refresh} />
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
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + 160,
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating motif action tokens (match the top nav), over the board */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + spacing.md,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.xl,
        }}>
        <MotifButton
          motif={motifs.refresh}
          size={64}
          glass
          accessibilityLabel="Refresh the crowd"
          overlay={refresh.active ? String(refresh.remaining) : undefined}
          disabled={refresh.active}
          onPress={refresh.start}
        />
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
