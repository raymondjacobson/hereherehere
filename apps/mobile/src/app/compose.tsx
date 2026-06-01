import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
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
import { clockTime, DAY, HOUR, MIN } from '@/util/time';
import { motifs } from '@/assets/motifs';

const STEP = 10 * MIN;
type PickerTarget = 'start' | 'end' | null;

export default function ComposeScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const installedPacks = useStore((s) => s.installedPacks);
  const postHere = useStore((s) => s.postHere);

  const [whereText, setWhereText] = useState('');
  const [whereFocused, setWhereFocused] = useState(false);
  const [note, setNote] = useState('');
  const [startsAt, setStartsAt] = useState(() => Date.now());
  const [endsAt, setEndsAt] = useState(() => Date.now() + HOUR);
  const [pickerFor, setPickerFor] = useState<PickerTarget>(null);
  const [posted, setPosted] = useState(false);

  const allSuggestions = useMemo(() => buildSuggestions(installedPacks), [installedPacks]);
  const suggestions = useMemo(() => filterSuggestions(allSuggestions, whereText), [allSuggestions, whereText]);

  const now = Date.now();
  const effStart = Math.max(startsAt, now); // start never before now
  const isNow = startsAt <= now + MIN;
  const startLabel = isNow ? 'Now' : clockTime(effStart);
  const endLabel = clockTime(endsAt);
  const canPost = whereText.trim().length > 0;

  function adjustStart(deltaMs: number) {
    const base = Math.max(startsAt, Date.now());
    const n = Math.max(Date.now(), base + deltaMs);
    setStartsAt(n);
    setEndsAt((e) => Math.max(e, n + STEP));
  }
  function adjustEnd(deltaMs: number) {
    const es = Math.max(startsAt, Date.now());
    setEndsAt((prev) => Math.max(es + STEP, prev + deltaMs));
  }

  function pickSuggestion(label: string, setEnd?: number) {
    setWhereText(label);
    if (setEnd && setEnd > effStart) setEndsAt(setEnd);
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setPickerFor(null);
    if (!date || event.type === 'dismissed') return;
    const t = date.getTime();
    if (pickerFor === 'start') {
      const n = Math.max(Date.now(), t);
      setStartsAt(n);
      setEndsAt((e) => Math.max(e, n + STEP));
    } else if (pickerFor === 'end') {
      let n = t;
      if (n <= effStart) n += DAY; // crossed midnight
      setEndsAt(Math.max(effStart + STEP, n));
    }
  }

  function post() {
    if (!canPost) return;
    postHere({
      whereText,
      note: note.trim() || undefined,
      startsAt: Math.max(startsAt, Date.now()),
      endsAt,
      eventPackId: installedPacks[0]?.id,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPosted(true);
  }

  if (posted) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md, paddingHorizontal: spacing.xl }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }}>
          <Image source={motifs.message} style={{ width: 120, height: 120 }} contentFit="contain" />
          <Text variant="title" weight="extrabold" center>
            Your message is ready to move through the crowd.
          </Text>
          <Text variant="body" color="textSecondary" center>
            It’ll pass to friends when their phones come near yours.
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button title="Refresh the crowd now" big onPress={() => router.replace({ pathname: '/board', params: { refresh: '1' } })} />
          <Button title="Done" variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const pickerValue = pickerFor === 'end' ? new Date(endsAt) : new Date(effStart);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.md }}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 60 }}>
          <Text variant="body" weight="semibold" color="textSecondary">
            Cancel
          </Text>
        </Pressable>
        <Text variant="body" weight="bold">
          New message
        </Text>
        <View style={{ width: 60 }} />
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
              <TimeRow
                label="Start"
                value={startLabel}
                onPressValue={() => setPickerFor('start')}
                onMinus={() => adjustStart(-STEP)}
                onPlus={() => adjustStart(STEP)}
                minusDisabled={isNow}
              />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.lg }} />
              <TimeRow
                label="End"
                value={endLabel}
                onPressValue={() => setPickerFor('end')}
                onMinus={() => adjustEnd(-STEP)}
                onPlus={() => adjustEnd(STEP)}
                minusDisabled={endsAt <= effStart + STEP}
              />
            </Card>
          </View>

          {/* NOTE */}
          <View style={{ gap: spacing.md }}>
            <Text variant="meta" weight="bold" color="textSecondary">
              NOTE (OPTIONAL)
            </Text>
            <TextField value={note} onChangeText={setNote} placeholder="under the disco ball" maxLength={80} returnKeyType="done" />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.md }}>
          <Button title="Post Message" big onPress={post} disabled={!canPost} />
        </View>
      </KeyboardAvoidingView>

      {/* Time picker */}
      {pickerFor && Platform.OS === 'ios' ? (
        <Pressable
          onPress={() => setPickerFor(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0006', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ backgroundColor: c.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: insets.bottom + spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
              <Text variant="body" weight="semibold" color="textSecondary">
                {pickerFor === 'start' ? 'Start time' : 'End time'}
              </Text>
              <Pressable onPress={() => setPickerFor(null)} hitSlop={12}>
                <Text variant="body" weight="bold" color="accent">
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker value={pickerValue} mode="time" display="spinner" is24Hour={false} locale="en_US" onChange={onPickerChange} themeVariant="light" />
          </Pressable>
        </Pressable>
      ) : null}
      {pickerFor && Platform.OS !== 'ios' ? (
        <DateTimePicker value={pickerValue} mode="time" is24Hour={false} onChange={onPickerChange} />
      ) : null}
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
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      {/* lineHeight === height vertically centers the glyph; textAlign centers horizontally */}
      <Text weight="bold" style={{ width: 40, height: 40, fontSize: 22, lineHeight: 40, textAlign: 'center', color: c.text }}>
        {symbol}
      </Text>
    </Pressable>
  );
}

function TimeRow({
  label,
  value,
  onPressValue,
  onMinus,
  onPlus,
  minusDisabled,
}: {
  label: string;
  value: string;
  onPressValue: () => void;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Text variant="callout" weight="semibold" color="textSecondary" style={{ width: 44 }}>
        {label}
      </Text>
      <Pressable onPress={onPressValue} hitSlop={8} style={{ flex: 1 }}>
        <Text variant="heading" weight="bold" style={{ color: c.accent }}>
          {value}
        </Text>
      </Pressable>
      <StepButton symbol="−" onPress={onMinus} disabled={minusDisabled} />
      <StepButton symbol="+" onPress={onPlus} />
    </View>
  );
}
