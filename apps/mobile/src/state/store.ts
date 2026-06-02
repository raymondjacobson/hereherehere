import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateKeyPairSet, friendIdOf } from '@/crypto/keys';
import { defaultEmojiFor } from '@/data/emoji';
import type { MeshEngine } from '@/mesh/engine';
import { isNewer } from '@/mesh/resolve/latestStatus';
import type { EventPack, Friend, FriendCodePayload, Here, LocalIdentity } from '@/domain/types';
import { mockTransport } from '@/transport/mock';
import { generatePeers, loadPeers, savePeers, clearPeers } from '@/transport/syntheticPeers';
import { clearEngine, createEngine, getEngine } from './engine';
import { loadSecrets, storeSecrets, clearSecrets } from './secrets';

export type HereRecord = Here & { receivedAt?: number };

export type RefreshUpdate = { authorId: string; name: string; where: string };

type AppState = {
  hydrated: boolean;
  identity: LocalIdentity | null;
  onboardingComplete: boolean;
  friends: Friend[];
  /** latest here per author id (includes self under identity.signPk) */
  heres: Record<string, HereRecord>;
  installedPacks: EventPack[];

  // permissions (cached for display; the OS stays source of truth for notifications)
  bluetoothEnabled: boolean;
  notificationsEnabled: boolean;
  /** whether the app-start permissions priming has been shown */
  permissionsPrompted: boolean;

  // lifecycle
  init: () => Promise<void>;

  // identity / onboarding
  createIdentity: (displayName: string) => Promise<void>;
  setDisplayName: (name: string) => void;
  setEmoji: (emoji: string) => void;
  completeOnboarding: () => void;

  // permissions
  setBluetoothEnabled: (v: boolean) => void;
  setNotificationsEnabled: (v: boolean) => void;
  markPermissionsPrompted: () => void;

  // friends
  addFriend: (payload: FriendCodePayload) => Friend;
  removeFriend: (id: string) => void;

  // heres
  postHere: (input: { whereText: string; note?: string; startsAt: number; endsAt: number; eventPackId?: string }) => Here;
  crowdRefresh: (
    durationMs: number,
    onProgress?: Parameters<typeof mockTransport.runSession>[1],
  ) => Promise<{ updates: RefreshUpdate[] }>;
  /** Pull the engine's latest decrypted statuses into the board (ambient/boost). */
  syncFromEngine: () => void;

  // packs
  installPack: (pack: EventPack) => void;
  uninstallPack: (id: string) => void;

  // dev / demo
  seedDemoFriends: () => Promise<void>;
  resetAll: () => Promise<void>;
};

/** Merge the engine's decrypted statuses into the persisted board (newest wins). */
function mergeHeres(current: Record<string, HereRecord>, engine: MeshEngine): Record<string, HereRecord> {
  const out = { ...current };
  for (const [author, h] of engine.heres) {
    if (!out[author] || isNewer(h, out[author])) out[author] = h;
  }
  return out;
}

function nextSequence(heres: Record<string, HereRecord>, engine: MeshEngine | null, authorId: string): number {
  const stored = heres[authorId]?.sequence ?? 0;
  const live = engine?.heres.get(authorId)?.sequence ?? 0;
  return Math.max(stored, live) + 1;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      identity: null,
      onboardingComplete: false,
      friends: [],
      heres: {},
      installedPacks: [],
      bluetoothEnabled: false,
      notificationsEnabled: false,
      permissionsPrompted: false,

      init: async () => {
        const secrets = await loadSecrets();
        const peers = await loadPeers();
        const id = get().identity;
        if (id && secrets) {
          const engine = createEngine({ ...id, ...secrets }, get().friends);
          // Re-seed our own latest status so the mesh keeps sharing it after a relaunch.
          const own = get().heres[id.signPk];
          if (own) engine.postHere(own, Date.now());
          mockTransport.configure(engine);
          mockTransport.setPeers(peers, engine.asFriend());
        }
      },

      createIdentity: async (displayName) => {
        const keys = generateKeyPairSet();
        await storeSecrets(keys);
        const identity: LocalIdentity = {
          displayName: displayName.trim(),
          // Seed a pleasant default so the avatar is never an empty letter;
          // the user can change it in the next onboarding step or in settings.
          emoji: defaultEmojiFor(keys.signPk),
          signPk: keys.signPk,
          boxPk: keys.boxPk,
          createdAt: Date.now(),
        };
        const engine = createEngine({ ...identity, signSk: keys.signSk, boxSk: keys.boxSk }, []);
        mockTransport.configure(engine);
        set({ identity });
      },

      setDisplayName: (name) => {
        const id = get().identity;
        if (!id) return;
        set({ identity: { ...id, displayName: name.trim() } });
      },

      setEmoji: (emoji) => {
        const id = get().identity;
        if (!id) return;
        set({ identity: { ...id, emoji } });
      },

      completeOnboarding: () => set({ onboardingComplete: true }),

      setBluetoothEnabled: (v) => set({ bluetoothEnabled: v }),
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
      markPermissionsPrompted: () => set({ permissionsPrompted: true }),

      addFriend: (payload) => {
        const id = friendIdOf({ signPk: payload.s });
        const existing = get().friends.find((f) => f.id === id);
        if (existing) {
          // Re-scanning refreshes the name and emoji the friend chose.
          const friends = get().friends.map((f) =>
            f.id === id ? { ...f, displayName: payload.n, emoji: payload.e } : f,
          );
          set({ friends });
          getEngine()?.setFriends(friends);
          return { ...existing, displayName: payload.n, emoji: payload.e };
        }
        const friend: Friend = {
          id,
          displayName: payload.n,
          emoji: payload.e,
          signPk: payload.s,
          boxPk: payload.b,
          addedAt: Date.now(),
          colorIndex: get().friends.length % 6,
        };
        const friends = [...get().friends, friend];
        set({ friends });
        getEngine()?.setFriends(friends);
        return friend;
      },

      removeFriend: (id) => {
        const friends = get().friends.filter((f) => f.id !== id);
        set({ friends });
        getEngine()?.setFriends(friends);
      },

      postHere: ({ whereText, note, startsAt, endsAt, eventPackId }) => {
        const { identity, heres } = get();
        if (!identity) throw new Error('No identity');
        const engine = getEngine();
        const now = Date.now();
        const here: Here = {
          id: `${identity.signPk.slice(0, 8)}-${now}`,
          authorId: identity.signPk,
          eventPackId,
          whereText: whereText.trim(),
          note: note?.trim() || undefined,
          startsAt,
          endsAt,
          createdAt: now,
          sequence: nextSequence(heres, engine, identity.signPk),
        };
        // Compose, sign, seal to every friend, and cache for relay.
        engine?.postHere(here, now);
        set({ heres: { ...heres, [identity.signPk]: { ...here, receivedAt: now } } });
        return here;
      },

      crowdRefresh: async (durationMs, onProgress) => {
        const result = await mockTransport.runSession(durationMs, onProgress);
        const engine = getEngine();
        if (engine) set({ heres: mergeHeres(get().heres, engine) });

        const friendsById = new Map(get().friends.map((f) => [f.id, f]));
        const heres = get().heres;
        const updates: RefreshUpdate[] = [];
        for (const authorId of result.updatedAuthors) {
          const f = friendsById.get(authorId);
          const h = heres[authorId];
          if (f && h) updates.push({ authorId, name: f.displayName, where: h.whereText });
        }
        return { updates };
      },

      syncFromEngine: () => {
        const engine = getEngine();
        if (engine) set({ heres: mergeHeres(get().heres, engine) });
      },

      installPack: (pack) => {
        const existing = get().installedPacks.filter((p) => p.id !== pack.id);
        set({ installedPacks: [...existing, pack] });
      },

      uninstallPack: (id) => {
        set({ installedPacks: get().installedPacks.filter((p) => p.id !== id) });
      },

      seedDemoFriends: async () => {
        const peers = generatePeers(5);
        await savePeers(peers);
        const now = Date.now();
        const newFriends: Friend[] = peers.map((peer, i) => ({
          id: peer.keys.signPk,
          displayName: peer.displayName,
          signPk: peer.keys.signPk,
          boxPk: peer.keys.boxPk,
          addedAt: now,
          colorIndex: peer.colorIndex ?? i % 6,
        }));
        const existingIds = new Set(get().friends.map((f) => f.id));
        const friends = [...get().friends, ...newFriends.filter((f) => !existingIds.has(f.id))];
        set({ friends });
        const engine = getEngine();
        engine?.setFriends(friends);
        if (engine) mockTransport.setPeers(peers, engine.asFriend());
      },

      resetAll: async () => {
        await clearSecrets();
        await clearPeers();
        clearEngine();
        set({
          identity: null,
          onboardingComplete: false,
          friends: [],
          heres: {},
          installedPacks: [],
          bluetoothEnabled: false,
          notificationsEnabled: false,
          permissionsPrompted: false,
        });
      },
    }),
    {
      name: 'hhh.app.v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        identity: s.identity,
        onboardingComplete: s.onboardingComplete,
        friends: s.friends,
        heres: s.heres,
        installedPacks: s.installedPacks,
        bluetoothEnabled: s.bluetoothEnabled,
        notificationsEnabled: s.notificationsEnabled,
        permissionsPrompted: s.permissionsPrompted,
      }),
      onRehydrateStorage: () => (state) => {
        state?.init().finally(() => useStore.setState({ hydrated: true }));
      },
    },
  ),
);
