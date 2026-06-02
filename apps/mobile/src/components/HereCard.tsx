import { Text as RNText, View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import type { HereState } from '@/domain/board';
import type { HereRecord } from '@/state/store';
import { spacing } from '@/theme/theme';
import { provenanceLabel, shortAgo, windowLabel } from '@/util/time';
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

export function HereCard({ name, here, state, now, isSelf, emoji, seed }: Props) {
  const expired = state === 'expired';
  const nameColor = expired ? 'expired' : 'text';
  const metaColor = expired ? 'expired' : 'textTertiary';
  const glyph = emoji?.trim() || (seed ? defaultEmojiFor(seed) : '');

  return (
    <Card muted={expired}>
      {/* Header: emoji sits inline with the name (no circle behind it) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {glyph ? <RNText style={{ fontSize: 26, opacity: expired ? 0.5 : 1 }}>{glyph}</RNText> : null}
        <Text variant="heading" weight="bold" color={nameColor} style={{ flex: 1 }}>
          {isSelf ? `${name} (you)` : name}
        </Text>
      </View>

      {/* Location + timing */}
      <View style={{ marginTop: spacing.md, gap: 2 }}>
        <Text variant="body" weight="semibold" color={expired ? 'expired' : 'text'}>
          {here.whereText}
        </Text>

        {here.note ? (
          <Text variant="callout" color={expired ? 'expired' : 'textSecondary'}>
            {here.note}
          </Text>
        ) : null}

        {expired ? (
          <Text variant="meta" weight="semibold" color="expired" style={{ marginTop: spacing.sm }}>
            Expired {shortAgo(now - here.endsAt)} ago
          </Text>
        ) : (
          <>
            <Text variant="callout" weight="semibold" color="text" style={{ marginTop: spacing.xs }}>
              {windowLabel(here.startsAt, here.endsAt, now)}
            </Text>
            <Text variant="meta" color={metaColor} style={{ marginTop: 2 }}>
              {isSelf ? `Posted ${shortAgo(now - here.createdAt)} ago` : provenanceLabel(here.createdAt, here.receivedAt)}
            </Text>
          </>
        )}
      </View>
    </Card>
  );
}
