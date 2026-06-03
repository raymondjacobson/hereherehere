import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { ImageHero } from './ImageHero';
import { spacing } from '@/theme/theme';
import { useStore } from '@/state/store';
import type { PermissionInfo } from '@/permissions/catalog';

/**
 * A single permission block: faded hero illustration, copy, and an Allow
 * button. Renders straight on the screen background (no Card) so ImageHero's
 * edge-fade blends the near-white artwork into the warm bg.
 */
export function PermissionItem({ info, imageSize }: { info: PermissionInfo; imageSize: number }) {
  const granted = useStore((s) =>
    info.key === 'bluetooth' ? s.bluetoothEnabled : s.notificationsEnabled,
  );
  const setEnabled = useStore((s) =>
    info.key === 'bluetooth' ? s.setBluetoothEnabled : s.setNotificationsEnabled,
  );
  const [busy, setBusy] = useState(false);

  async function onAllow() {
    setBusy(true);
    try {
      const ok = await info.request();
      setEnabled(ok);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ alignItems: 'center', gap: spacing.md }}>
      <ImageHero source={info.image} size={imageSize} />
      <View style={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}>
        <Text variant="heading" weight="extrabold" center>
          {info.title}
        </Text>
        <Text variant="callout" color="textSecondary" center>
          {info.body}
        </Text>
      </View>
      {granted ? (
        <Button
          title="Allowed ✓"
          variant="secondary"
          onPress={() => Linking.openSettings()}
          style={{ alignSelf: 'stretch' }}
        />
      ) : (
        <Button
          title={info.cta}
          variant="primary"
          loading={busy}
          onPress={onAllow}
          style={{ alignSelf: 'stretch' }}
        />
      )}
    </View>
  );
}
