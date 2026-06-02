import { type ImageSourcePropType, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { radius, spacing } from '@/theme/theme';
import { useStore } from '@/state/store';
import { AVAILABLE_PACKS } from '@/data/packs/portola';
import { PACK_BANNERS, PACK_BANNER_BG } from '@/data/packs/banners';

const FEATURES = ['Set times', 'Stage autocomplete', 'Crowd refresh reminders'];

export default function PacksScreen() {
  const router = useRouter();
  const installed = useStore((s) => s.installedPacks);
  const installPack = useStore((s) => s.installPack);

  const anyInstalled = installed.length > 0;

  function finish() {
    router.push('/onboarding/permissions');
  }

  return (
    <Screen scroll glow={false}>
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
          const banner: ImageSourcePropType | undefined = PACK_BANNERS[pack.id];
          return (
            <Card key={pack.id}>
              {banner ? (
                <View
                  style={{
                    // Bleed past the card's padding so the banner fills the
                    // full width and flush top of the card.
                    marginTop: -spacing.xl,
                    marginHorizontal: -spacing.xl,
                    marginBottom: spacing.lg,
                    aspectRatio: 3,
                    backgroundColor: PACK_BANNER_BG[pack.id] ?? '#000',
                    borderTopLeftRadius: radius.lg,
                    borderTopRightRadius: radius.lg,
                    overflow: 'hidden',
                  }}>
                  <Image source={banner} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
              ) : null}

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

      <View style={{ marginTop: spacing.xl }}>
        <Button title={anyInstalled ? 'Get started' : 'Skip for now'} big onPress={finish} />
      </View>
    </Screen>
  );
}
