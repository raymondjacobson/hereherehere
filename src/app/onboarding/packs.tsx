import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { AVAILABLE_PACKS } from '@/data/packs/portola';

const FEATURES = ['Set times', 'Stage autocomplete', 'Crowd refresh reminders'];

export default function PacksScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const installed = useStore((s) => s.installedPacks);
  const installPack = useStore((s) => s.installPack);
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  function finish() {
    completeOnboarding();
    router.replace('/board');
  }

  return (
    <Screen scroll>
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <Text variant="title" weight="extrabold">
          Event packs
        </Text>
        <Text variant="body" color="textSecondary">
          Install an event pack for set times, stage names, autocomplete, and crowd refresh reminders.
        </Text>
      </View>

      <View style={{ gap: spacing.lg, flex: 1 }}>
        {AVAILABLE_PACKS.map((pack) => {
          const isInstalled = installed.some((p) => p.id === pack.id);
          return (
            <Card key={pack.id}>
              <Text variant="heading" weight="bold">
                {pack.name}
              </Text>
              <View style={{ gap: spacing.xs, marginTop: spacing.md, marginBottom: spacing.lg }}>
                {FEATURES.map((f) => (
                  <Text key={f} variant="callout" color="textSecondary">
                    · {f}
                  </Text>
                ))}
              </View>
              <Button
                title={isInstalled ? 'Installed ✓' : 'Install'}
                variant={isInstalled ? 'secondary' : 'primary'}
                disabled={isInstalled}
                onPress={() => installPack(pack)}
              />
            </Card>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
        <Button title="Get started" big onPress={finish} />
        <Button title="Skip for now" variant="ghost" onPress={finish} />
      </View>
    </Screen>
  );
}
