import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { parseFriendCode } from '@/domain/friendCode';

/** How long to wait for a late-arriving link URL before giving up and going home. */
const LINK_GRACE_MS = 2500;

/**
 * Deep-link target for friend links opened from hereherehere.app/friend:
 * `hereherehere://friend?p=<payload>`. The payload also rides in a URL
 * fragment on the https link (`/friend#<payload>`), which the router never
 * exposes as a param, so we fall back to reading the raw URL for that form.
 * Either way we decode and hand off to the regular add-friend screen.
 */
export default function FriendLinkScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const { p } = useLocalSearchParams<{ p?: string | string[] }>();
  const url = Linking.useURL();
  const identity = useStore((s) => s.identity);
  const onboardingComplete = useStore((s) => s.onboardingComplete);
  const [gaveUp, setGaveUp] = useState(false);

  const payload = useMemo(() => {
    const param = Array.isArray(p) ? p[0] : p;
    if (param) return parseFriendCode(param);
    // The url hook can briefly report the app's launch URL before the link
    // event lands, so only trust URLs that actually carry a payload.
    if (url && (url.includes('#') || url.includes('/friend/'))) return parseFriendCode(url);
    return null;
  }, [p, url]);

  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), LINK_GRACE_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (payload) {
      // No identity yet: finish onboarding first (the link can be re-opened after).
      if (!identity || !onboardingComplete) {
        router.replace('/');
        return;
      }
      router.replace({
        pathname: '/friends/add',
        params: { n: payload.n, e: payload.e ?? '', s: payload.s, b: payload.b, t: String(payload.t ?? 0) },
      });
      return;
    }
    // Nothing usable arrived: leave things as they were rather than bouncing home.
    if (gaveUp) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
  }, [payload, gaveUp, identity, onboardingComplete, router]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}
