import { useMemo, useState } from 'react';
import { type ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

const STEP = 5 * MIN; // fine-tune step for the −/+ buttons
const MIN_DURATION = 5 * MIN;
const DURATIONS = [10, 20, 30, 45, 60]; // minutes, for the "For" pills
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
  const isNow = startsAt <= now + MIN;
  const durationMin = Math.max(0, Math.round((endsAt - startsAt) / MIN));
  const startLabel = isNow ? 'now' : clockTime(startsAt);
  const endLabel = clockTime(endsAt);
  const canPost = whereText.trim().length > 0;

  // Stepping Start moves the whole window (End follows, duration kept).
  function adjustStart(deltaMs: number) {
    const dur = endsAt - startsAt;
    const n = Math.max(Date.now(), startsAt + deltaMs);
    setStartsAt(n);
    setEndsAt(n + dur);
  }
  // Stepping End changes the duration (Start fixed).
  function adjustEnd(deltaMs: number) {
    setEndsAt((prev) => Math.max(startsAt + MIN_DURATION, prev + deltaMs));
  }
  // A "For" pill sets the duration; End updates.
  function setDuration(min: number) {
    setEndsAt(startsAt + min * MIN);
  }

  function pickSuggestion(label: string, setEnd?: number) {
    setWhereText(label);
    if (setEnd && setEnd > startsAt) setEndsAt(setEnd);
  }

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setPickerFor(null);
    if (!date || event.type === 'dismissed') return;
    const t = date.getTime();
    if (pickerFor === 'start') {
      const dur = endsAt - startsAt;
      const n = Math.max(Date.now(), t);
      setStartsAt(n);
      setEndsAt(n + dur);
    } else if (pickerFor === 'end') {
      let n = t;
      if (n <= startsAt) n += DAY; // crossed midnight
      setEndsAt(Math.max(startsAt + MIN_DURATION, n));
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

  const pickerValue = pickerFor === 'end' ? new Date(endsAt) : new Date(Math.max(startsAt, now));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + spacing.xl, padding: spacing.xl, gap: spacing.xl }}
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
              autoFocus
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

            <View style={{ gap: spacing.md }}>
              <Text variant="callout" weight="semibold" color="textSecondary">
                For
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {DURATIONS.map((m) => {
                  const sel = durationMin === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setDuration(m);
                      }}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 9,
                        borderRadius: radius.pill,
                        borderWidth: 1.5,
                        borderColor: sel ? c.accent : c.border,
                        backgroundColor: sel ? c.accentSoft : c.surfaceAlt,
                      }}>
                      <Text variant="callout" weight={sel ? 'bold' : 'medium'} color={sel ? 'accent' : 'text'}>
                        {m === 60 ? '1h' : `${m}m`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.lg }} />

            <TimeRow
              label="End"
              value={endLabel}
              onPressValue={() => setPickerFor('end')}
              onMinus={() => adjustEnd(-STEP)}
              onPlus={() => adjustEnd(STEP)}
              minusDisabled={endsAt - startsAt <= MIN_DURATION}
            />
          </Card>

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

function StepButton({ motif, onPress, disabled }: { motif: ImageSourcePropType; onPress: () => void; disabled?: boolean }) {
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
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
      })}>
      <Image source={motif} style={{ width: 20, height: 20 }} contentFit="contain" />
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
      <Text variant="callout" weight="semibold" color="textSecondary" style={{ width: 40 }}>
        {label}
      </Text>
      <Pressable onPress={onPressValue} hitSlop={8} style={{ flex: 1 }}>
        <Text variant="heading" weight="bold" style={{ color: c.accent }}>
          {value}
        </Text>
      </Pressable>
      <StepButton motif={motifs.minus} onPress={onMinus} disabled={minusDisabled} />
      <StepButton motif={motifs.plus} onPress={onPlus} />
    </View>
  );
}
