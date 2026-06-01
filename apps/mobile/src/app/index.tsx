import { Redirect } from 'expo-router';
import { useStore } from '@/state/store';

export default function Index() {
  const identity = useStore((s) => s.identity);
  const onboardingComplete = useStore((s) => s.onboardingComplete);
  const permissionsPrompted = useStore((s) => s.permissionsPrompted);

  if (!identity || !onboardingComplete) {
    return <Redirect href="/onboarding/name" />;
  }
  // Existing installs that finished onboarding before permissions existed get
  // the priming screen once on next launch.
  if (!permissionsPrompted) {
    return <Redirect href="/onboarding/permissions" />;
  }
  return <Redirect href="/board" />;
}
