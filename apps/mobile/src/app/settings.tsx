import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { AVAILABLE_PACKS } from '@/data/packs/portola';

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

export default function SettingsScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const identity = useStore((s) => s.identity);
  const friends = useStore((s) => s.friends);
  const installedPacks = useStore((s) => s.installedPacks);
  const setDisplayName = useStore((s) => s.setDisplayName);
  const installPack = useStore((s) => s.installPack);
  const uninstallPack = useStore((s) => s.uninstallPack);
  const seedDemoFriends = useStore((s) => s.seedDemoFriends);
  const resetAll = useStore((s) => s.resetAll);

  const [name, setName] = useState(identity?.displayName ?? '');
  const [seeded, setSeeded] = useState(false);

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
        <Section title="Your name">
          <TextField
            value={name}
            onChangeText={setName}
            onEndEditing={() => name.trim() && setDisplayName(name)}
            placeholder="your name"
            autoCapitalize="words"
            maxLength={24}
          />
        </Section>

        <Section title="Friends">
          <Card onPress={() => router.push('/friends/code')}>
            <Text variant="body" weight="semibold">
              {friends.length} friend{friends.length === 1 ? '' : 's'}
            </Text>
            <Text variant="callout" color="textSecondary" style={{ marginTop: 2 }}>
              Tap to show your friend code or scan one
            </Text>
          </Card>
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
      </ScrollView>
    </View>
  );
}
