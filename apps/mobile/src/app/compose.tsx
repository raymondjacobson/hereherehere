import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
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
import { clockTime, HOUR, MIN, windowLabel } from '@/util/time';

type Step = 'where' | 'until' | 'note' | 'post';
const ORDER: Step[] = ['where', 'until', 'note', 'post'];

export default function ComposeScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const installedPacks = useStore((s) => s.installedPacks);
  const postHere = useStore((s) => s.postHere);

  const [stepIdx, setStepIdx] = useState(0);
  const step = ORDER[stepIdx];

  const [whereText, setWhereText] = useState('');
  const [presetEnd, setPresetEnd] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [posted, setPosted] = useState(false);

  const allSuggestions = useMemo(() => buildSuggestions(installedPacks), [installedPacks]);
  const suggestions = useMemo(
    () => filterSuggestions(allSuggestions, whereText),
    [allSuggestions, whereText],
  );

  const startsAt = Date.now();
  const canWhere = whereText.trim().length > 0;
  const canUntil = endsAt != null && endsAt > Date.now();

  function next() {
    if (stepIdx < ORDER.length - 1) setStepIdx(stepIdx + 1);
  }
  function back() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
    else router.back();
  }

  function chooseUntil(ms: number) {
    setEndsAt(Date.now() + ms);
  }

  function post() {
    if (!whereText.trim() || !endsAt) return;
    postHere({
      whereText,
      note: note.trim() || undefined,
      startsAt,
      endsAt,
      eventPackId: installedPacks[0]?.id,
    });
    setPosted(true);
    setStepIdx(ORDER.length - 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + spacing.md }}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.md }}>
        {!posted ? (
          <Pressable onPress={back} hitSlop={12}>
            <Text variant="body" weight="semibold" color="textSecondary">
              {stepIdx === 0 ? 'Cancel' : 'Back'}
            </Text>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'center' }}>
          {ORDER.map((s, i) => (
            <View
              key={s}
              style={{
                width: i === stepIdx ? 22 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i <= stepIdx ? c.accent : c.border,
              }}
            />
          ))}
        </View>
        {!posted ? <View style={{ width: 48 }} /> : null}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* WHERE */}
          {step === 'where' && (
            <>
              <Text variant="hero" weight="extrabold">
                Where will you be?
              </Text>
              <TextField
                big
                value={whereText}
                onChangeText={(t) => {
                  setWhereText(t);
                  setPresetEnd(null);
                }}
                placeholder="a stage, a landmark, anywhere"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => canWhere && next()}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {suggestions.map((s) => (
                  <Chip
                    key={s.key}
                    label={s.label}
                    onPress={() => {
                      setWhereText(s.label);
                      setPresetEnd(s.setEndsAt ?? null);
                    }}
                  />
                ))}
              </View>
            </>
          )}

          {/* UNTIL */}
          {step === 'until' && (
            <>
              <Text variant="hero" weight="extrabold">
                Until when?
              </Text>
              <View style={{ gap: spacing.md }}>
                {presetEnd && presetEnd > Date.now() ? (
                  <UntilOption
                    label={`End of set · ${clockTime(presetEnd)}`}
                    selected={endsAt === presetEnd}
                    onPress={() => setEndsAt(presetEnd)}
                  />
                ) : null}
                <UntilOption label="30 minutes" selected={isAround(endsAt, 30 * MIN)} onPress={() => chooseUntil(30 * MIN)} />
                <UntilOption label="1 hour" selected={isAround(endsAt, HOUR)} onPress={() => chooseUntil(HOUR)} />
                <UntilOption label="2 hours" selected={isAround(endsAt, 2 * HOUR)} onPress={() => chooseUntil(2 * HOUR)} />
              </View>

              {endsAt ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="callout" color="textSecondary" center>
                    Until {clockTime(endsAt)}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.md }}>
                    <Stepper label="−15m" onPress={() => setEndsAt(Math.max(Date.now() + 5 * MIN, (endsAt ?? 0) - 15 * MIN))} />
                    <Stepper label="+15m" onPress={() => setEndsAt((endsAt ?? Date.now()) + 15 * MIN)} />
                  </View>
                </View>
              ) : null}
            </>
          )}

          {/* NOTE */}
          {step === 'note' && (
            <>
              <Text variant="hero" weight="extrabold">
                Add a note?
              </Text>
              <TextField
                big
                value={note}
                onChangeText={setNote}
                placeholder="under the disco ball"
                autoFocus
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={next}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {['under the disco ball', 'left side by sound booth', 'by the bathrooms', 'near the back'].map((n) => (
                  <Chip key={n} label={n} onPress={() => setNote(n)} />
                ))}
              </View>
            </>
          )}

          {/* POST / SUCCESS */}
          {step === 'post' && (
            <View style={{ flex: 1, gap: spacing.xl }}>
              {posted ? (
                <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg, alignItems: 'center' }}>
                  <Text style={{ fontSize: 64 }}>🍾</Text>
                  <Text variant="title" weight="extrabold" center>
                    Your here is ready to move through the crowd.
                  </Text>
                  <Text variant="body" color="textSecondary" center>
                    It’ll pass to friends when their phones come near yours.
                  </Text>
                </View>
              ) : (
                <>
                  <Text variant="hero" weight="extrabold">
                    Post my here
                  </Text>
                  <Card>
                    <Text variant="heading" weight="bold">
                      {whereText}
                    </Text>
                    {note.trim() ? (
                      <Text variant="callout" color="textSecondary" style={{ marginTop: spacing.xs }}>
                        {note.trim()}
                      </Text>
                    ) : null}
                    {endsAt ? (
                      <Text variant="callout" weight="semibold" style={{ marginTop: spacing.md }}>
                        {windowLabel(startsAt, endsAt, Date.now())}
                      </Text>
                    ) : null}
                  </Card>
                </>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom action */}
        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + spacing.md, gap: spacing.sm }}>
          {step === 'where' && <Button title="Next" big onPress={next} disabled={!canWhere} />}
          {step === 'until' && <Button title="Next" big onPress={next} disabled={!canUntil} />}
          {step === 'note' && <Button title={note.trim() ? 'Next' : 'Skip'} big onPress={next} />}
          {step === 'post' && !posted && <Button title="Post my here" big onPress={post} />}
          {step === 'post' && posted && (
            <>
              <Button title="Refresh the crowd now" big onPress={() => router.replace('/refresh')} />
              <Button title="Done" variant="ghost" onPress={() => router.back()} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function isAround(endsAt: number | null, durationMs: number): boolean {
  if (endsAt == null) return false;
  const target = Date.now() + durationMs;
  return Math.abs(endsAt - target) < 2 * MIN;
}

function UntilOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? c.accentSoft : c.surface,
        borderColor: selected ? c.accent : c.border,
        borderWidth: 1.5,
        borderRadius: radius.md,
        padding: spacing.lg,
        opacity: pressed ? 0.9 : 1,
      })}>
      <Text variant="body" weight={selected ? 'bold' : 'medium'} color={selected ? 'accent' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.surfaceAlt,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Text variant="callout" weight="bold">
        {label}
      </Text>
    </Pressable>
  );
}
