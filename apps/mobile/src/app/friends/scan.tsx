import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { parseFriendCode } from '@/domain/friendCode';

export default function ScanScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);
  const [error, setError] = useState(false);

  function onScanned(data: string) {
    if (handled.current) return;
    const payload = parseFriendCode(data);
    if (!payload) {
      setError(true);
      return;
    }
    handled.current = true;
    router.replace({
      pathname: '/friends/add',
      params: { n: payload.n, e: payload.e ?? '', s: payload.s, b: payload.b, t: String(payload.t ?? 0) },
    });
  }

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: spacing.xl, justifyContent: 'center', gap: spacing.lg }}>
        <Text variant="title" weight="extrabold">
          Scan friend codes with the camera
        </Text>
        <Text variant="body" color="textSecondary">
          hereherehere only uses the camera to read friend codes. No photos are taken or stored.
        </Text>
        <Button title="Allow camera" big onPress={requestPermission} />
        <Button title="Not now" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => onScanned(data)}
      />
      {/* Overlay */}
      <View style={{ position: 'absolute', top: insets.top + spacing.md, left: spacing.xl }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" weight="bold" style={{ color: '#fff' }}>
            Cancel
          </Text>
        </Pressable>
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        <View style={{ width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: '#FFFFFFcc' }} />
      </View>
      <View style={{ position: 'absolute', bottom: insets.bottom + spacing.xxl, left: spacing.xl, right: spacing.xl, alignItems: 'center' }}>
        <Text variant="body" weight="semibold" center style={{ color: '#fff' }}>
          {error ? "That doesn’t look like a friend code." : 'Point at a friend’s code'}
        </Text>
      </View>
    </View>
  );
}
