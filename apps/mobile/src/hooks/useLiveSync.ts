import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/state/store';
import { transport } from '@/transport';

/**
 * Keeps the board live while mounted: starts ambient discovery, pulls the
 * engine's freshly-synced statuses into the store whenever the transport
 * signals an update (so friends' cards refresh on their own), and tracks the
 * nearby-peer count. `boost` triggers a manual high-intensity scan (wired to
 * pull-to-refresh) and resolves when it settles.
 */
export function useLiveSync() {
  const syncFromEngine = useStore((s) => s.syncFromEngine);
  const [nearby, setNearby] = useState(() => transport.getNearby());

  useEffect(() => {
    transport.startAmbient();
    const offNearby = transport.onNearby(setNearby);
    const offUpdate = transport.onUpdate(syncFromEngine);
    return () => {
      offNearby();
      offUpdate();
      transport.stopAmbient();
    };
  }, [syncFromEngine]);

  const boost = useCallback(() => transport.boost(), []);
  return { nearby, boost };
}
