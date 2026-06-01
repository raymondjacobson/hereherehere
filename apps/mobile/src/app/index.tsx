import { Redirect } from 'expo-router';
import { useStore } from '@/state/store';

export default function Index() {
  const identity = useStore((s) => s.identity);
  const onboardingComplete = useStore((s) => s.onboardingComplete);

  if (!identity || !onboardingComplete) {
    return <Redirect href="/onboarding/name" />;
  }
  return <Redirect href="/board" />;
}
