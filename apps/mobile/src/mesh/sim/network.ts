import { generateKeyPairSet } from '@/crypto/keys';
import type { Friend, Here, LocalIdentity } from '@/domain/types';
import { MeshEngine } from '../engine';
import { CacheLimits } from '../cache/relayCache';
import { MIN } from '@/util/time';
import { Envelope } from '../model/envelope';
import { PeerSession, pumpSessions, SessionOptions } from '../session/protocol';
import { Rng } from '../util/rng';

/**
 * In-memory multi-node mesh simulator (spec Milestone 2). Every node runs a
 * real MeshEngine and real PeerSessions, so the simulator exercises the exact
 * gossip/cache/relay code the app ships. It is deterministic under a fixed seed,
 * which makes it usable as a CI integration test, not just a tuning toy.
 */
type NodeIdentity = LocalIdentity & { signSk: string; boxSk: string };

export type SimNode = {
  id: number;
  identity: NodeIdentity;
  engine: MeshEngine;
};

export type SimOptions = {
  nodeCount: number;
  rng: Rng;
  /** probability a given contact fails to complete (radio drop). */
  packetLoss?: number;
  limits?: CacheLimits;
  session?: SessionOptions;
};

export class SimNetwork {
  readonly nodes: SimNode[] = [];
  private readonly friends = new Map<number, Set<number>>();
  /** contacts that actually completed (not lost), for metrics. */
  contactsRun = 0;
  contactsLost = 0;

  constructor(private readonly opts: SimOptions) {
    for (let i = 0; i < opts.nodeCount; i++) {
      const keys = generateKeyPairSet();
      const identity: NodeIdentity = { displayName: `node-${i}`, createdAt: 0, ...keys };
      this.nodes.push({ id: i, identity, engine: new MeshEngine(identity, [], opts.limits) });
      this.friends.set(i, new Set());
    }
  }

  private friendRecord(j: number): Friend {
    const id = this.nodes[j].identity;
    return {
      id: id.signPk,
      displayName: id.displayName,
      signPk: id.signPk,
      boxPk: id.boxPk,
      addedAt: 0,
      colorIndex: 0,
    };
  }

  /** Node i adds node j as a friend (one-way). */
  addFriend(i: number, j: number): void {
    this.friends.get(i)!.add(j);
    this.nodes[i].engine.setFriends([...this.friends.get(i)!].map((k) => this.friendRecord(k)));
  }

  /** Mutual friendship. */
  befriend(i: number, j: number): void {
    this.addFriend(i, j);
    this.addFriend(j, i);
  }

  signPk(i: number): string {
    return this.nodes[i].identity.signPk;
  }

  /** Node i posts a status. Returns the per-friend envelopes it produced. */
  post(i: number, now: number, overrides: Partial<Here> = {}): Envelope[] {
    const id = this.nodes[i].identity;
    const seq = (this.nodes[i].engine.heres.get(id.signPk)?.sequence ?? 0) + 1;
    const createdAt = overrides.createdAt ?? now;
    const here: Here = {
      id: `${id.signPk.slice(0, 8)}-${createdAt}`,
      authorId: id.signPk,
      whereText: `spot-${i}-${seq}`,
      startsAt: createdAt,
      endsAt: createdAt + 60 * MIN,
      createdAt,
      sequence: seq,
      ...overrides,
    };
    return this.nodes[i].engine.postHere(here, now);
  }

  /** Run one encounter between nodes i and j. Returns false if the radio dropped it. */
  contact(i: number, j: number, now: number): boolean {
    if (this.opts.packetLoss && this.opts.rng() < this.opts.packetLoss) {
      this.contactsLost++;
      return false;
    }
    pumpSessions(
      new PeerSession(this.nodes[i].engine, this.opts.session),
      new PeerSession(this.nodes[j].engine, this.opts.session),
      now,
    );
    this.contactsRun++;
    return true;
  }

  /** Contact every adjacent pair (chain/line topology). */
  chainRound(now: number): void {
    for (let i = 0; i + 1 < this.nodes.length; i++) this.contact(i, i + 1, now);
  }

  /** Run `k` random pairwise contacts this round. */
  randomRound(now: number, k: number): void {
    const n = this.nodes.length;
    for (let c = 0; c < k; c++) {
      const i = Math.floor(this.opts.rng() * n);
      let j = Math.floor(this.opts.rng() * n);
      if (j === i) j = (j + 1) % n;
      this.contact(i, j, now);
    }
  }
}
