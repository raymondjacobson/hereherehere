import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/state/store';
import { mockTransport } from '@/transport/mock';

/**
 * Keeps the board live while mounted: starts ambient discovery, pulls the
 * engine's freshly-synced statuses into the store whenever the transport
 * signals an update (so friends' cards refresh on their own), and tracks the
 * nearby-peer count. `boost` triggers a manual high-intensity scan (wired to
 * pull-to-refresh) and resolves when it settles.
 */
export function useLiveSync() {
  const syncFromEngine = useStore((s) => s.syncFromEngine);
  const [nearby, setNearby] = useState(() => mockTransport.getNearby());

  useEffect(() => {
    mockTransport.startAmbient();
    const offNearby = mockTransport.onNearby(setNearby);
    const offUpdate = mockTransport.onUpdate(syncFromEngine);
    return () => {
      offNearby();
      offUpdate();
      mockTransport.stopAmbient();
    };
  }, [syncFromEngine]);

  const boost = useCallback(() => mockTransport.boost(), []);
  return { nearby, boost };
}
