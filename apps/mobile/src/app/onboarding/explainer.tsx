import { useRef, useState } from 'react';
import { type ImageSourcePropType, ScrollView, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Illustration } from '@/components/Illustration';
import { ImageHero } from '@/components/ImageHero';
import { spacing } from '@/theme/theme';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { AVAILABLE_PACKS } from '@/data/packs/portola';

type Page = {
  title: string;
  body: string;
  image?: ImageSourcePropType;
  emoji?: string;
  tint?: 'pink' | 'blue' | 'yellow';
};

const PAGES: Page[] = [
  {
    image: require('../../../assets/onboarding/friends-crowd.png'),
    title: 'When service disappears',
    body: 'hereherehere lets you share where you’ll be when cell and wifi are down. It uses nearby phones to carry your here through the crowd — like a message in a bottle.',
  },
  {
    image: require('../../../assets/onboarding/carry-private.png'),
    title: 'Only your friends can read it',
    body: 'Your heres are encrypted so only friends you’ve added can see them. Other phones may help carry them, but they can’t read them.',
  },
  {
    image: require('../../../assets/onboarding/refresh-crowd.png'),
    title: 'Open to refresh the crowd',
    body: 'Phones can only pass heres while the app is open. During the event, we’ll remind everyone around the same time to open hereherehere for a quick crowd refresh.',
  },
];

export default function ExplainerScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const isLast = page === PAGES.length - 1;
  const heroSize = Math.min(width, Math.round(height * 0.46));

  function next() {
    if (!isLast) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
      setPage(page + 1);
      return;
    }
    if (AVAILABLE_PACKS.length > 0) router.push('/onboarding/packs');
    else {
      useStore.getState().completeOnboarding();
      router.replace('/board');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
        {PAGES.map((p) => (
          <View
            key={p.title}
            style={{ width, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
            {p.image ? (
              <ImageHero source={p.image} size={heroSize} />
            ) : (
              <Illustration emoji={p.emoji ?? '✨'} tint={p.tint ?? 'blue'} />
            )}
            <View style={{ gap: spacing.md, paddingHorizontal: spacing.xl }}>
              <Text variant="title" weight="extrabold" center>
                {p.title}
              </Text>
              <Text variant="body" color="textSecondary" center>
                {p.body}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.xl }}>
        {PAGES.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === page ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === page ? c.accent : c.border,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: spacing.xl }}>
        <Button title={isLast ? (AVAILABLE_PACKS.length ? 'Next' : 'Get started') : 'Next'} big onPress={next} />
      </View>
    </View>
  );
}
