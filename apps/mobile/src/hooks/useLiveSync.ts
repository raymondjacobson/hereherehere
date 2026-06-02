import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/state/store';
import { mockTransport } from '@/transport/mock';

/**
 * Keeps the board live while mounted: starts ambient discovery, ingests every
 * inbound packet as it arrives (so friends' cards update on their own), and
 * tracks the nearby-peer count. `boost` triggers a manual high-intensity scan
 * (wired to pull-to-refresh) and resolves when it settles.
 */
export function useLiveSync() {
  const ingestPackets = useStore((s) => s.ingestPackets);
  const [nearby, setNearby] = useState(() => mockTransport.getNearby());

  useEffect(() => {
    mockTransport.startAmbient();
    const offNearby = mockTransport.onNearby(setNearby);
    const offInbound = mockTransport.onInbound((packets) => {
      ingestPackets(packets);
    });
    return () => {
      offNearby();
      offInbound();
      mockTransport.stopAmbient();
    };
  }, [ingestPackets]);

  const boost = useCallback(() => mockTransport.boost(), []);
  return { nearby, boost };
}
