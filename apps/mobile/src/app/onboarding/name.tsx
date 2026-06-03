import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { spacing } from '@/theme/theme';
import { useStore } from '@/state/store';

export default function NameScreen() {
  const router = useRouter();
  const createIdentity = useStore((s) => s.createIdentity);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const canContinue = name.trim().length >= 1;

  async function onContinue() {
    if (!canContinue || busy) return;
    setBusy(true);
    try {
      await createIdentity(name);
      router.push('/onboarding/avatar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen glow={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
          <View style={{ gap: spacing.md }}>
            <Text variant="hero" weight="extrabold">
              What should your friends call you?
            </Text>
            <Text variant="body" color="textSecondary">
              This name helps your friends find you. No account needed.
            </Text>
          </View>
          <TextField
            big
            value={name}
            onChangeText={setName}
            placeholder="your name"
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={24}
            onSubmitEditing={onContinue}
          />
        </View>
        <Button title="Continue" big onPress={onContinue} disabled={!canContinue} loading={busy} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
