import { type ComponentType } from 'react';
import { Share, View } from 'react-native';
import QRCodeLib from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { fingerprint } from '@/crypto/keys';
import { buildFriendLink } from '@/domain/friendCode';

// react-native-qrcode-svg ships class-component types that don't satisfy
// React 19's JSX element typing; the runtime component is fine.
const QRCode = QRCodeLib as unknown as ComponentType<{
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}>;

export default function FriendCodeScreen() {
  const router = useRouter();
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const identity = useStore((s) => s.identity);

  if (!identity) return null;
  const link = buildFriendLink(identity);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.xl }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" weight="semibold" color="textSecondary">
            Done
          </Text>
        </Pressable>
        <Text variant="heading" weight="bold">
          My friend code
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <View style={{ backgroundColor: '#FFFFFF', padding: spacing.xl, borderRadius: 24 }}>
          <QRCode value={link} size={232} color="#211C16" backgroundColor="#FFFFFF" />
        </View>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <Text variant="title" weight="extrabold">
            {identity.displayName}
          </Text>
          <Text variant="callout" weight="semibold" color="textSecondary">
            {fingerprint(identity.signPk)}
          </Text>
        </View>
        <Text variant="callout" color="textSecondary" center>
          Friend codes are one-way. To see each other’s messages, both people need to add each other.
        </Text>
      </View>

      <View style={{ gap: spacing.sm, paddingBottom: insets.bottom + spacing.md }}>
        <Button title="Scan a friend code" big onPress={() => router.push('/friends/scan')} />
        <Button
          title="Share my link"
          variant="secondary"
          onPress={() => Share.share({ message: `Add me on hereherehere: ${link}` })}
        />
      </View>
    </View>
  );
}
