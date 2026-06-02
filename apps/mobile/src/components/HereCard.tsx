import { Text as RNText, View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import type { HereState } from '@/domain/board';
import type { HereRecord } from '@/state/store';
import { radius, spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { MIN, provenanceLabel, shortAgo, timeLeftLabel, windowLabel } from '@/util/time';
import { defaultEmojiFor } from '@/data/emoji';

type Props = {
  name: string;
  colorIndex: number;
  here: HereRecord;
  state: HereState;
  now: number;
  isSelf?: boolean;
  emoji?: string;
  seed?: string;
};

/** "15m left" badge — subtle when there's plenty of time, filled/loud when the
 *  window is about to close, so your eye lands on what's ending soon. */
function TimeLeftChip({ endsAt, now }: { endsAt: number; now: number }) {
  const { c } = useTheme();
  const soon = endsAt - now <= 15 * MIN;
  return (
    <View
      style={{
        paddingVertical: 2,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: soon ? c.accent : c.accentSoft,
      }}>
      <Text variant="meta" weight="bold" style={{ color: soon ? c.textInverse : c.accent }}>
        {timeLeftLabel(endsAt, now)}
      </Text>
    </View>
  );
}

export function HereCard({ name, here, state, now, isSelf, emoji, seed }: Props) {
  const expired = state === 'expired';
  const glyph = emoji?.trim() || (seed ? defaultEmojiFor(seed) : '');

  return (
    <Card muted={expired}>
      {/* Header: emoji + name */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {glyph ? <RNText style={{ fontSize: 24, opacity: expired ? 0.5 : 1 }}>{glyph}</RNText> : null}
        <Text variant="body" weight="bold" color={expired ? 'expired' : 'text'} style={{ flex: 1 }} numberOfLines={1}>
          {isSelf ? `${name} (you)` : name}
        </Text>
      </View>

      {/* WHERE — the anchor you scan for */}
      <Text variant="heading" weight="extrabold" color={expired ? 'expired' : 'text'} style={{ marginTop: spacing.sm }}>
        {here.whereText}
      </Text>
      {here.note ? (
        <Text variant="callout" color={expired ? 'expired' : 'textSecondary'} style={{ marginTop: 2 }}>
          {here.note}
        </Text>
      ) : null}

      {/* Timing */}
      {expired ? (
        <Text variant="meta" weight="semibold" color="expired" style={{ marginTop: spacing.md }}>
          Expired {shortAgo(now - here.endsAt)} ago
        </Text>
      ) : (
        <View style={{ marginTop: spacing.md, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <Text variant="callout" weight="semibold" color="text">
              {windowLabel(here.startsAt, here.endsAt, now)}
            </Text>
            <TimeLeftChip endsAt={here.endsAt} now={now} />
          </View>
          <Text variant="meta" color="textTertiary">
            {isSelf ? `Posted ${shortAgo(now - here.createdAt)} ago` : provenanceLabel(here.createdAt, here.receivedAt)}
          </Text>
        </View>
      )}
    </Card>
  );
}
