import { DEFAULTS } from '../defaults';
import { SimNetwork } from './network';

/**
 * Metrics over a SimNetwork, used to gate integration tests on emergent
 * properties (delivery, storm bound, TTL containment) that unit tests can't see.
 */

/** Node indices that have decrypted author's status at >= `sequence`. */
export function deliveredTo(net: SimNetwork, authorIdx: number, sequence: number): number[] {
  const author = net.signPk(authorIdx);
  const out: number[] = [];
  net.nodes.forEach((node, i) => {
    const h = node.engine.heres.get(author);
    if (h && h.sequence >= sequence) out.push(i);
  });
  return out;
}

/** Fraction of `recipients` that received author's status at >= `sequence`. */
export function deliveryFraction(
  net: SimNetwork,
  authorIdx: number,
  recipients: number[],
  sequence: number,
): number {
  if (recipients.length === 0) return 1;
  const got = new Set(deliveredTo(net, authorIdx, sequence));
  const n = recipients.filter((r) => got.has(r)).length;
  return n / recipients.length;
}

/** Total cached envelope copies of author's status across all nodes. */
export function copiesOf(net: SimNetwork, authorIdx: number): number {
  const author = net.signPk(authorIdx);
  let copies = 0;
  for (const node of net.nodes) {
    for (const m of node.engine.localMetas()) {
      if (m.envelope.objectType === 'here' && m.envelope.senderSignPk === author) copies++;
    }
  }
  return copies;
}

/**
 * Copies-per-delivered: how many cached copies exist per node that actually
 * decrypted the status. A broadcast-storm bound — should stay modest.
 */
export function copiesPerDelivered(net: SimNetwork, authorIdx: number, sequence: number): number {
  const delivered = deliveredTo(net, authorIdx, sequence).length;
  if (delivered === 0) return Infinity;
  return copiesOf(net, authorIdx) / delivered;
}

/** Highest hop count of any cached envelope (relayed-count proxy). */
export function maxHopCount(net: SimNetwork, originalTtl = DEFAULTS.normalTtl): number {
  let max = 0;
  for (const node of net.nodes) {
    for (const m of node.engine.localMetas()) {
      max = Math.max(max, originalTtl - m.envelope.ttl);
    }
  }
  return max;
}

/** True if every node's relay cache holds the same set of messageIds. */
export function cachesConverged(net: SimNetwork, nodeIdxs: number[]): boolean {
  if (nodeIdxs.length < 2) return true;
  const key = (i: number) =>
    net.nodes[i].engine
      .localMetas()
      .map((m) => m.messageId)
      .sort()
      .join(',');
  const first = key(nodeIdxs[0]);
  return nodeIdxs.every((i) => key(i) === first);
}
