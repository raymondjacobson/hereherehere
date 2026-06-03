import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text as RNText, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { Avatar } from '@/components/Avatar';
import { EmojiPicker } from '@/components/EmojiPicker';
import { PermissionItem } from '@/components/PermissionItem';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { AVAILABLE_PACKS } from '@/data/packs/portola';
import { PERMISSIONS } from '@/permissions/catalog';
import { defaultEmojiFor } from '@/data/emoji';
import { transport } from '@/transport';
import type { TransportDebug } from '@/transport/types';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { getEngine } from '@/state/engine';
import { motifs } from '@/assets/motifs';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="meta" weight="bold" color="textSecondary">
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

/** Live transport diagnostics — polls the active transport once a second. */
function BleDebug() {
  const { c } = useTheme();
  const [info, setInfo] = useState<TransportDebug>(() => transport.debug());
  useEffect(() => {
    const id = setInterval(() => setInfo(transport.debug()), 1000);
    return () => clearInterval(id);
  }, []);

  const rows: [string, string][] = [
    ['Transport', info.kind === 'ble' ? 'Bluetooth (real)' : 'Simulated mesh'],
    ['Bluetooth state', info.bluetoothState],
    ['Scanning (central)', info.scanning ? 'yes' : 'no'],
    ['Advertising (peripheral)', info.advertising ? 'yes' : 'no'],
    ['Nearby peers', String(info.nearby)],
    ['Connected (peripheral)', String(info.connectedPeers)],
  ];

  return (
    <Card muted>
      <View style={{ gap: spacing.sm }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="callout" color="textSecondary">
              {k}
            </Text>
            <RNText style={{ fontFamily: 'Menlo', fontSize: 13, color: c.text }}>{v}</RNText>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** "Messages you're helping send" — your blind-relay contribution to the crowd. */
function ImpactCard() {
  const sent = useStore((s) => s.meshSent);
  const [carrying, setCarrying] = useState(() => getEngine()?.carryingForOthers(Date.now()) ?? 0);
  useEffect(() => {
    const id = setInterval(() => setCarrying(getEngine()?.carryingForOthers(Date.now()) ?? 0), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Image source={motifs.message} style={{ width: 52, height: 52 }} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Text variant="hero" weight="extrabold">
            {sent.toLocaleString()}
          </Text>
          <Text variant="callout" weight="semibold" color="textSecondary">
            messages sent through you
          </Text>
        </View>
      </View>
      <Text variant="callout" color="textSecondary" style={{ marginTop: spacing.md }}>
        {sent === 0
          ? 'When you’re near other phones, hereherehere quietly carries the crowd’s encrypted messages onward — even ones you can’t read. Your count grows here.'
          : `You’ve helped carry ${sent.toLocaleString()} encrypted message${sent === 1 ? '' : 's'} for people you may never meet${
              carrying > 0 ? `, ${carrying} moving through you right now` : ''
            }. You can’t read them — that’s the point.`}
      </Text>
    </Card>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const identity = useStore((s) => s.identity);
  const friends = useStore((s) => s.friends);
  const installedPacks = useStore((s) => s.installedPacks);
  const setDisplayName = useStore((s) => s.setDisplayName);
  const setEmoji = useStore((s) => s.setEmoji);
  const installPack = useStore((s) => s.installPack);
  const uninstallPack = useStore((s) => s.uninstallPack);
  const seedDemoFriends = useStore((s) => s.seedDemoFriends);
  const resetAll = useStore((s) => s.resetAll);

  const [name, setName] = useState(identity?.displayName ?? '');
  const [seeded, setSeeded] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const currentGlyph = identity?.emoji?.trim() || (identity?.signPk ? defaultEmojiFor(identity.signPk) : '🙂');
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildVersion = Constants.expoConfig?.ios?.buildNumber ?? '';

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
        <Text variant="title" weight="extrabold">
          Settings
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" weight="semibold" color="accent">
            Done
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.xxl, paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}>
        <Section title="You">
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Avatar
                name={name}
                colorIndex={0}
                size={56}
                emoji={identity?.emoji}
                seed={identity?.signPk}
              />
              <View style={{ flex: 1 }}>
                <TextField
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    // Commit live so the edit isn't lost if the field never blurs
                    // (e.g. tapping "Done" closes the screen without blurring).
                    if (t.trim()) setDisplayName(t);
                  }}
                  placeholder="your name"
                  autoCapitalize="words"
                  maxLength={24}
                />
              </View>
            </View>
          </Card>
          <Card onPress={() => setEmojiOpen((o) => !o)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="body" weight="semibold">
                Your emoji
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <RNText style={{ fontSize: 22 }}>{currentGlyph}</RNText>
                <Text variant="callout" weight="bold" color="accent">
                  {emojiOpen ? 'Done' : 'Change'}
                </Text>
              </View>
            </View>
          </Card>
          {emojiOpen ? <EmojiPicker value={identity?.emoji} onSelect={setEmoji} tile={44} /> : null}
        </Section>

        <Section title="Your impact">
          <ImpactCard />
        </Section>

        <Section title="Friends">
          <Card onPress={() => router.push('/friends/list')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="body" weight="semibold">
                {friends.length} friend{friends.length === 1 ? '' : 's'}
              </Text>
              <Text variant="callout" weight="bold" color="accent">
                Manage
              </Text>
            </View>
            <Text variant="callout" color="textSecondary" style={{ marginTop: 2 }}>
              View, add, or remove friends
            </Text>
          </Card>
          <Card onPress={() => router.push('/friends/code')}>
            <Text variant="body" weight="semibold">
              My friend code
            </Text>
            <Text variant="callout" color="textSecondary" style={{ marginTop: 2 }}>
              Show your code or scan one to add each other
            </Text>
          </Card>
        </Section>

        <Section title="Permissions">
          <View style={{ gap: spacing.xxl, marginTop: spacing.xs }}>
            {PERMISSIONS.map((info) => (
              <PermissionItem key={info.key} info={info} imageSize={160} />
            ))}
          </View>
        </Section>

        <Section title="Bluetooth (debug)">
          <BleDebug />
        </Section>

        <Section title="Event packs">
          {AVAILABLE_PACKS.map((pack) => {
            const isInstalled = installedPacks.some((p) => p.id === pack.id);
            return (
              <Card key={pack.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="body" weight="semibold">
                    {pack.name}
                  </Text>
                  <Pressable onPress={() => (isInstalled ? uninstallPack(pack.id) : installPack(pack))} hitSlop={8}>
                    <Text variant="callout" weight="bold" color={isInstalled ? 'textSecondary' : 'accent'}>
                      {isInstalled ? 'Remove' : 'Install'}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </Section>

        <Section title="Try it out">
          <Card muted>
            <Text variant="callout" color="textSecondary" style={{ marginBottom: spacing.md }}>
              This build uses a simulated mesh. Add a few demo friends, then run a crowd refresh to watch their messages arrive — through the real encryption path.
            </Text>
            <Button
              title={seeded ? 'Demo friends added ✓' : 'Add demo friends'}
              variant="secondary"
              disabled={seeded}
              onPress={async () => {
                await seedDemoFriends();
                setSeeded(true);
              }}
            />
          </Card>
        </Section>

        <Section title="Privacy">
          <Card muted>
            <Text variant="callout" color="textSecondary">
              Your private key never leaves this device. There’s no account, no server, and no GPS. Friends you add can read your messages; other phones can only carry them.
            </Text>
          </Card>
        </Section>

        <Button
          title="Reset everything"
          variant="ghost"
          onPress={async () => {
            await resetAll();
            router.replace('/');
          }}
        />

        <Text variant="meta" color="textTertiary" center style={{ marginTop: spacing.sm }}>
          hereherehere v{appVersion}{buildVersion ? ` (${buildVersion})` : ''}
        </Text>
      </ScrollView>
    </View>
  );
}
