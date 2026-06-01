import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Card } from '@/components/Card';
import { TextField } from '@/components/TextField';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { buildSuggestions, filterSuggestions } from '@/domain/autocomplete';
import { clockTime, MIN } from '@/util/time';

const STEP_MIN = 10;
const DEFAULT_END_MIN = 60;

export default function ComposeScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const installedPacks = useStore((s) => s.installedPacks);
  const postHere = useStore((s) => s.postHere);

  const [whereText, setWhereText] = useState('');
  const [whereFocused, setWhereFocused] = useState(false);
  const [note, setNote] = useState('');
  // Offsets in minutes from "now" — keeps the clock live as time passes.
  const [startOffset, setStartOffset] = useState(0);
  const [endOffset, setEndOffset] = useState(DEFAULT_END_MIN);
  const [posted, setPosted] = useState(false);

  const allSuggestions = useMemo(() => buildSuggestions(installedPacks), [installedPacks]);
  const suggestions = useMemo(
    () => filterSuggestions(allSuggestions, whereText),
    [allSuggestions, whereText],
  );

  const now = Date.now();
  const startLabel = startOffset <= 0 ? 'Now' : clockTime(now + startOffset * MIN);
  const endLabel = clockTime(now + endOffset * MIN);
  const canPost = whereText.trim().length > 0;

  function adjustStart(delta: number) {
    setStartOffset((prev) => {
      const next = Math.max(0, prev + delta);
      setEndOffset((e) => Math.max(e, next + STEP_MIN));
      return next;
    });
  }
  function adjustEnd(delta: number) {
    setEndOffset((prev) => Math.max(startOffset + STEP_MIN, prev + delta));
  }

  function pickSuggestion(label: string, setEndsAt?: number) {
    setWhereText(label);
    if (setEndsAt) {
      const mins = Math.round((setEndsAt - Date.now()) / MIN);
      if (mins > startOffset) setEndOffset(mins);
    }
  }

  function post() {
    if (!canPost) return;
    const base = Date.now();
    postHere({
      whereText,
      note: note.trim() || undefined,
      startsAt: base + startOffset * MIN,
      endsAt: base + endOffset * MIN,
      eventPackId: installedPacks[0]?.id,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPosted(true);
  }

  if (posted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md, paddingHorizontal: spacing.xl }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
          <Text style={{ fontSize: 64 }}>🍾</Text>
          <Text variant="title" weight="extrabold" center>
            Your message is ready to move through the crowd.
          </Text>
          <Text variant="body" color="textSecondary" center>
            It’ll pass to friends when their phones come near yours.
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button title="Refresh the crowd now" big onPress={() => router.replace('/refresh')} />
          <Button title="Done" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.md }}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" weight="semibold" color="textSecondary">
            Cancel
          </Text>
        </Pressable>
        <Text variant="body" weight="bold">
          New message
        </Text>
        <View style={{ width: 52 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* WHERE */}
          <View style={{ gap: spacing.md }}>
            <Text variant="hero" weight="extrabold">
              Where will you be?
            </Text>
            <TextField
              big
              value={whereText}
              onChangeText={setWhereText}
              onFocus={() => setWhereFocused(true)}
              onBlur={() => setWhereFocused(false)}
              placeholder="a stage, a landmark, anywhere"
              returnKeyType="done"
            />
            {whereFocused && suggestions.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}>
                {suggestions.map((s) => (
                  <Chip key={s.key} label={s.label} onPress={() => pickSuggestion(s.label, s.setEndsAt)} />
                ))}
              </ScrollView>
            ) : null}
          </View>

          {/* WHEN */}
          <View style={{ gap: spacing.md }}>
            <Text variant="meta" weight="bold" color="textSecondary">
              WHEN
            </Text>
            <Card>
              <TimeRow label="Start" value={startLabel} onMinus={() => adjustStart(-STEP_MIN)} onPlus={() => adjustStart(STEP_MIN)} minusDisabled={startOffset <= 0} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.lg }} />
              <TimeRow label="End" value={endLabel} onMinus={() => adjustEnd(-STEP_MIN)} onPlus={() => adjustEnd(STEP_MIN)} minusDisabled={endOffset <= startOffset + STEP_MIN} />
            </Card>
          </View>

          {/* NOTE */}
          <View style={{ gap: spacing.md }}>
            <Text variant="meta" weight="bold" color="textSecondary">
              NOTE (OPTIONAL)
            </Text>
            <TextField
              value={note}
              onChangeText={setNote}
              placeholder="under the disco ball"
              maxLength={80}
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.md }}>
          <Button title="Post Message" big onPress={post} disabled={!canPost} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function StepButton({ symbol, onPress, disabled }: { symbol: string; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      <Text variant="heading" weight="bold">
        {symbol}
      </Text>
    </Pressable>
  );
}

function TimeRow({
  label,
  value,
  onMinus,
  onPlus,
  minusDisabled,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Text variant="callout" weight="semibold" color="textSecondary" style={{ width: 44 }}>
        {label}
      </Text>
      <Text variant="heading" weight="bold" style={{ flex: 1 }}>
        {value}
      </Text>
      <StepButton symbol="−" onPress={onMinus} disabled={minusDisabled} />
      <StepButton symbol="+" onPress={onPlus} />
    </View>
  );
}
