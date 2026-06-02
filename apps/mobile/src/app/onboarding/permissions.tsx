import { useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { PermissionItem } from '@/components/PermissionItem';
import { spacing } from '@/theme/theme';
import { useStore } from '@/state/store';
import { PERMISSIONS } from '@/permissions/catalog';

export default function PermissionsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const markPermissionsPrompted = useStore((s) => s.markPermissionsPrompted);

  const imageSize = Math.min(220, Math.round(width * 0.56));

  function finish() {
    markPermissionsPrompted();
    completeOnboarding();
    router.replace('/board');
  }

  return (
    <Screen scroll glow={false}>
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <Text variant="title" weight="extrabold">
          Two quick permissions
        </Text>
        <Text variant="body" color="textSecondary">
          hereherehere works best with both. You can change these anytime in Settings.
        </Text>
      </View>

      <View style={{ gap: spacing.xxl, flex: 1 }}>
        {PERMISSIONS.map((info) => (
          <PermissionItem key={info.key} info={info} imageSize={imageSize} />
        ))}
      </View>

      <View style={{ marginTop: spacing.xxl }}>
        <Button title="Continue" big onPress={finish} />
      </View>
    </Screen>
  );
}
