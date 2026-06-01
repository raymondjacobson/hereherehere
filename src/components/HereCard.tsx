import { View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Avatar } from './Avatar';
import type { HereState } from '@/domain/board';
import type { HereRecord } from '@/state/store';
import { spacing } from '@/theme/theme';
import { provenanceLabel, shortAgo, windowLabel } from '@/util/time';

type Props = {
  name: string;
  colorIndex: number;
  here: HereRecord;
  state: HereState;
  now: number;
  isSelf?: boolean;
};

export function HereCard({ name, colorIndex, here, state, now, isSelf }: Props) {
  const expired = state === 'expired';
  const nameColor = expired ? 'expired' : 'text';
  const whereColor = expired ? 'expired' : 'text';
  const metaColor = expired ? 'expired' : 'textTertiary';

  return (
    <Card muted={expired}>
      <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' }}>
        <Avatar name={name} colorIndex={colorIndex} muted={expired} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text variant="heading" weight="bold" color={nameColor}>
              {isSelf ? `${name} (you)` : name}
            </Text>
          </View>

          <Text variant="body" weight="semibold" color={whereColor}>
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
      </View>
    </Card>
  );
}
