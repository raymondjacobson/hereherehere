import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { mockTransport, SESSION_MS } from '@/transport/mock';
import type { SessionPhase } from '@/transport/types';

/** How long the "✨ N new" result lingers before the pill returns to idle. */
const RESULT_LINGER_MS = 4000;

export type CrowdRefreshState = {
  /** A session is in flight. */
  active: boolean;
  phase: SessionPhase;
  /** Whole seconds left in the current session. */
  remaining: number;
  /** New messages opened from friends during the most recent session. */
  newCount: number;
  /** True briefly after a session ends, while the result is shown. */
  showResult: boolean;
  /** Kick off an ambient session. No-op if one is already running. */
  start: () => void;
};

/**
 * Drives an ambient crowd-refresh: the same mesh session as the full-screen
 * ceremony, but run in place while the user keeps using the board. Packets are
 * ingested live as peers are discovered, so cards update mid-session.
 */
export function useCrowdRefresh(): CrowdRefreshState {
  const ingestPackets = useStore((s) => s.ingestPackets);
  const friends = useStore((s) => s.friends);

  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<SessionPhase>('scanning');
  const [fraction, setFraction] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Refs so the unmount cleanup and async callbacks see live values without
  // re-subscribing the transport on every render.
  const friendsRef = useRef(friends);
  friendsRef.current = friends;
  const runningRef = useRef(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const lingerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    if (lingerRef.current) {
      clearTimeout(lingerRef.current);
      lingerRef.current = null;
    }

    const seen = new Set<string>();
    setActive(true);
    setShowResult(false);
    setPhase('scanning');
    setFraction(0);
    setNewCount(0);

    const friendIds = new Set(friendsRef.current.map((f) => f.id));
    unsubRef.current = mockTransport.onInbound((packets) => {
      const opened = ingestPackets(packets);
      for (const here of opened) {
        if (friendIds.has(here.authorId)) seen.add(here.authorId);
      }
      setNewCount(seen.size);
    });

    mockTransport
      .runSession(SESSION_MS, (p) => {
        setPhase(p.phase);
        setFraction(p.fraction);
      })
      .finally(() => {
        unsubRef.current?.();
        unsubRef.current = null;
        runningRef.current = false;
        if (!mountedRef.current) return;
        setActive(false);
        setShowResult(true);
        lingerRef.current = setTimeout(() => setShowResult(false), RESULT_LINGER_MS);
      });
  }, [ingestPackets]);

  // Tear down a session if the board unmounts mid-refresh.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      unsubRef.current?.();
      if (lingerRef.current) clearTimeout(lingerRef.current);
      if (runningRef.current) mockTransport.stopSession();
    };
  }, []);

  const remaining = Math.max(0, Math.ceil((1 - fraction) * (SESSION_MS / 1000)));

  return { active, phase, remaining, newCount, showResult, start };
}
