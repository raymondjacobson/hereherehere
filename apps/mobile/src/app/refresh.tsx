import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { SESSION_MS } from '@/transport/mock';
import { transport } from '@/transport';
import type { SessionPhase } from '@/transport/types';
import { motifs } from '@/assets/motifs';

/**
 * Full-screen crowd-refresh ceremony. Reserved for the notification entry path
 * ("time to scan") where the takeover is the point. Manual refreshes from the
 * board run ambient in place instead — see useCrowdRefresh.
 */

const PHASE_TEXT: Record<SessionPhase, string> = {
  scanning: 'Looking for nearby phones…',
  trading: 'Trading messages…',
  checking: 'Checking for your friends…',
  updating: 'Updating your board…',
  done: 'Done',
};

type Update = { authorId: string; name: string; where: string };

export default function RefreshScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const crowdRefresh = useStore((s) => s.crowdRefresh);

  const [phase, setPhase] = useState<SessionPhase>('scanning');
  const [fraction, setFraction] = useState(0);
  const [done, setDone] = useState(false);
  const [updates, setUpdates] = useState<Update[]>([]);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();

    let cancelled = false;
    crowdRefresh(SESSION_MS, (p) => {
      if (cancelled) return;
      setPhase(p.phase);
      setFraction(p.fraction);
    }).then((res) => {
      if (cancelled) return;
      setUpdates(res.updates);
      setDone(true);
    });

    return () => {
      cancelled = true;
      loop.stop();
      transport.stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remaining = Math.max(0, Math.ceil((1 - fraction) * (SESSION_MS / 1000)));
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxl }}>
        {!done ? (
          <>
            <Animated.View
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: c.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ scale }],
                opacity,
              }}>
              <Text variant="hero" weight="extrabold" color="accent" style={{ fontSize: 56, lineHeight: 64 }}>
                {remaining}
              </Text>
            </Animated.View>
            <View style={{ gap: spacing.sm }}>
              <Text variant="title" weight="extrabold" center>
                Refreshing the crowd
              </Text>
              <Text variant="body" color="textSecondary" center>
                Keep this open. Your phone is trading messages nearby.
              </Text>
              <Text variant="callout" weight="semibold" color="accent" center style={{ marginTop: spacing.sm }}>
                {PHASE_TEXT[phase]}
              </Text>
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', gap: spacing.lg, alignSelf: 'stretch' }}>
            <Image source={updates.length ? motifs.new : motifs.oldMessage} style={{ width: 96, height: 96 }} contentFit="contain" />
            <Text variant="title" weight="extrabold" center>
              {updates.length ? `${updates.length} new message${updates.length === 1 ? '' : 's'}` : 'No new messages this time.'}
            </Text>
            <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
              {updates.map((u) => (
                <Card key={u.authorId} muted>
                  <Text variant="body" weight="bold">
                    {u.name} updated
                  </Text>
                  <Text variant="callout" color="textSecondary">
                    {u.where}
                  </Text>
                </Card>
              ))}
            </View>
          </View>
        )}
      </View>

      <Button
        title={done ? 'See the board' : 'Stop'}
        big={done}
        variant={done ? 'primary' : 'ghost'}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
