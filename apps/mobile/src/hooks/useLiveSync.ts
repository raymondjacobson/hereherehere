import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/state/store';
import { transport } from '@/transport';
import { getEngine } from '@/state/engine';

/**
 * Keeps the board live while mounted: starts ambient discovery, pulls the
 * engine's freshly-synced statuses into the store whenever the transport
 * signals an update (so friends' cards refresh on their own), and tracks the
 * nearby-peer count plus how many messages we're carrying for the crowd right
 * now. `boost` triggers a manual high-intensity scan (wired to pull-to-refresh)
 * and resolves when it settles.
 */
export function useLiveSync() {
  const syncFromEngine = useStore((s) => s.syncFromEngine);
  const [nearby, setNearby] = useState(() => transport.getNearby());
  const [carrying, setCarrying] = useState(() => getEngine()?.carryingForOthers(Date.now()) ?? 0);

  useEffect(() => {
    const readCarrying = () => setCarrying(getEngine()?.carryingForOthers(Date.now()) ?? 0);
    transport.startAmbient();
    const offNearby = transport.onNearby(setNearby);
    const offUpdate = transport.onUpdate(() => {
      syncFromEngine();
      readCarrying();
    });
    readCarrying();
    // Re-read periodically too: carried messages age out (expire/evict) over time.
    const id = setInterval(readCarrying, 2500);
    return () => {
      offNearby();
      offUpdate();
      clearInterval(id);
      transport.stopAmbient();
    };
  }, [syncFromEngine]);

  const boost = useCallback(() => transport.boost(), []);
  return { nearby, carrying, boost };
}
