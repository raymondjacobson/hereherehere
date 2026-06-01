import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateKeyPairSet, friendIdOf } from '@/crypto/keys';
import { buildPacketsForHere, isPacketValid, tryOpenHere } from '@/domain/packet';
import type {
  EventPack,
  Friend,
  FriendCodePayload,
  Here,
  LocalIdentity,
  RelayPacket,
} from '@/domain/types';
import { mockTransport } from '@/transport/mock';
import { generatePeers, loadPeers, savePeers, clearPeers } from '@/transport/syntheticPeers';
import { loadSecrets, storeSecrets, getSecretsSync, clearSecrets } from './secrets';

export type HereRecord = Here & { receivedAt?: number };

const MAX_SEEN = 500;

type AppState = {
  hydrated: boolean;
  identity: LocalIdentity | null;
  onboardingComplete: boolean;
  friends: Friend[];
  /** latest here per author id (includes self under identity.signPk) */
  heres: Record<string, HereRecord>;
  seenPacketIds: string[];
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
  ingestPackets: (packets: RelayPacket[]) => Here[];

  // packs
  installPack: (pack: EventPack) => void;
  uninstallPack: (id: string) => void;

  // dev / demo
  seedDemoFriends: () => Promise<void>;
  resetAll: () => Promise<void>;
};

function nextSequence(heres: Record<string, HereRecord>, authorId: string): number {
  const existing = heres[authorId];
  return existing ? existing.sequence + 1 : 1;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      identity: null,
      onboardingComplete: false,
      friends: [],
      heres: {},
      seenPacketIds: [],
      installedPacks: [],
      bluetoothEnabled: false,
      notificationsEnabled: false,
      permissionsPrompted: false,

      init: async () => {
        await loadSecrets();
        const peers = await loadPeers();
        const id = get().identity;
        if (id) {
          mockTransport.configure({ signPk: id.signPk, boxPk: id.boxPk });
          mockTransport.setPeers(peers);
        }
      },

      createIdentity: async (displayName) => {
        const keys = generateKeyPairSet();
        await storeSecrets(keys);
        const identity: LocalIdentity = {
          displayName: displayName.trim(),
          signPk: keys.signPk,
          boxPk: keys.boxPk,
          createdAt: Date.now(),
        };
        mockTransport.configure({ signPk: identity.signPk, boxPk: identity.boxPk });
        set({ identity });
      },

      setDisplayName: (name) => {
        const id = get().identity;
        if (!id) return;
        set({ identity: { ...id, displayName: name.trim() } });
      },

      completeOnboarding: () => set({ onboardingComplete: true }),

      setBluetoothEnabled: (v) => set({ bluetoothEnabled: v }),
      setNotificationsEnabled: (v) => set({ notificationsEnabled: v }),
      markPermissionsPrompted: () => set({ permissionsPrompted: true }),

      addFriend: (payload) => {
        const id = friendIdOf({ signPk: payload.s });
        const existing = get().friends.find((f) => f.id === id);
        if (existing) {
          // update display name if changed
          const friends = get().friends.map((f) =>
            f.id === id ? { ...f, displayName: payload.n } : f,
          );
          set({ friends });
          return { ...existing, displayName: payload.n };
        }
        const friend: Friend = {
          id,
          displayName: payload.n,
          signPk: payload.s,
          boxPk: payload.b,
          addedAt: Date.now(),
          colorIndex: get().friends.length % 6,
        };
        set({ friends: [...get().friends, friend] });
        return friend;
      },

      removeFriend: (id) => {
        set({ friends: get().friends.filter((f) => f.id !== id) });
      },

      postHere: ({ whereText, note, startsAt, endsAt, eventPackId }) => {
        const { identity, heres } = get();
        if (!identity) throw new Error('No identity');
        const secrets = getSecretsSync();
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
          sequence: nextSequence(heres, identity.signPk),
        };
        set({ heres: { ...heres, [identity.signPk]: here } });

        // Build + enqueue packets for the mesh (one per friend recipient).
        if (secrets) {
          const packets = buildPacketsForHere(here, { ...identity, ...secrets }, get().friends);
          mockTransport.enqueue(packets);
        }
        return here;
      },

      ingestPackets: (packets) => {
        const { identity, friends, heres, seenPacketIds } = get();
        if (!identity) return [];
        const secrets = getSecretsSync();
        if (!secrets) return [];

        const now = Date.now();
        const seen = new Set(seenPacketIds);
        const friendsById = new Map(friends.map((f) => [f.id, f]));
        const updatedHeres = { ...heres };
        const newSeen: string[] = [];
        const opened: Here[] = [];

        for (const p of packets) {
          if (seen.has(p.packetId)) continue;
          newSeen.push(p.packetId);
          seen.add(p.packetId);
          if (!isPacketValid(p, now)) continue;

          const here = tryOpenHere(p, { ...identity, ...secrets }, friendsById);
          if (!here) continue; // not for me / not a friend / failed to open — relays can't read

          const current = updatedHeres[here.authorId];
          // Newer here replaces older (by sequence, then createdAt).
          if (
            !current ||
            here.sequence > current.sequence ||
            (here.sequence === current.sequence && here.createdAt > current.createdAt)
          ) {
            updatedHeres[here.authorId] = { ...here, receivedAt: now };
            opened.push(here);
          }
        }

        const merged = [...seenPacketIds, ...newSeen];
        set({
          heres: updatedHeres,
          seenPacketIds: merged.length > MAX_SEEN ? merged.slice(merged.length - MAX_SEEN) : merged,
        });
        return opened;
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
        mockTransport.setPeers(peers);
        const now = Date.now();
        const newFriends: Friend[] = peers.map((peer, i) => ({
          id: peer.keys.signPk,
          displayName: peer.displayName,
          signPk: peer.keys.signPk,
          boxPk: peer.keys.boxPk,
          addedAt: now,
          colorIndex: peer.colorIndex ?? i % 6,
        }));
        // merge, avoiding duplicates
        const existingIds = new Set(get().friends.map((f) => f.id));
        const merged = [...get().friends, ...newFriends.filter((f) => !existingIds.has(f.id))];
        set({ friends: merged });
      },

      resetAll: async () => {
        await clearSecrets();
        await clearPeers();
        set({
          identity: null,
          onboardingComplete: false,
          friends: [],
          heres: {},
          seenPacketIds: [],
          installedPacks: [],
          bluetoothEnabled: false,
          notificationsEnabled: false,
          permissionsPrompted: false,
        });
      },
    }),
    {
      name: 'hhh.app.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        identity: s.identity,
        onboardingComplete: s.onboardingComplete,
        friends: s.friends,
        heres: s.heres,
        seenPacketIds: s.seenPacketIds,
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
