import type { CollectionEntry } from 'astro:content';
import { decayFactor, effectiveWeight, nodeRadius, targetRadius } from './decay';
import { ICONS } from './icons.generated';
import { plain } from './text';
import { DIRECTED, type Domain, type EntryType, type Relation } from './vocab';

export type GraphNode = {
  id: string;
  /** Vault note title — the node's label. */
  title: string;
  statement?: string;
  icon?: string;
  domain: Domain;
  type: EntryType;
  weight: number;
  effWeight: number;
  /** 1 = fully reaffirmed, DECAY_FLOOR = maximally drifted. */
  factor: number;
  r: number;
  targetR: number;
  retired: boolean;
  reaffirmed: string;
  /** Deterministic seed position: identical on server and client, no RNG. */
  x: number;
  y: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: Relation;
  note?: string;
  directed: boolean;
};

export type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** node id -> connected node ids, both directions. Drives hover and filtering. */
  neighbors: Record<string, string[]>;
  domainCounts: Record<string, number>;
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Edge targets are written by the sync skill and may be an entry id, a vault note
 * title, or the statement itself. Resolve all three so the skill never has to make
 * the author invent ids.
 */
function buildResolver(entries: CollectionEntry<'entries'>[]) {
  const map = new Map<string, string>();
  const claim = (key: string, id: string) => {
    const k = slug(key);
    if (k && !map.has(k)) map.set(k, id);
  };

  for (const e of entries) {
    claim(e.id, e.id);
    claim(e.data.title, e.id);
    if (e.data.statement) claim(e.data.statement, e.id);
    if (e.data.source) {
      const base = e.data.source.split('/').pop()!.replace(/\.md$/i, '');
      claim(base, e.id);
    }
  }
  return (target: string) => map.get(slug(target.replace(/^\[\[|\]\]$/g, '')));
}

export function buildGraph(
  all: CollectionEntry<'entries'>[],
  asOf: Date = new Date(),
): GraphData {
  // Retired conditions are archived, not rendered. They stay on disk and remain
  // reachable at their own URL — they just stop competing for the center.
  const entries = all.filter((e) => !e.data.retired);
  const resolve = buildResolver(entries);

  // Pass 1: each entry's own last-touched date.
  const baseReaffirmed = new Map<string, Date>();
  for (const e of entries) {
    const candidates = [e.data.reaffirmed, e.data.sourceModified, e.data.date].filter(
      Boolean,
    ) as Date[];
    baseReaffirmed.set(
      e.id,
      new Date(Math.max(...candidates.map((d) => d.getTime()))),
    );
  }

  // Pass 2: resolve edges, dedupe, and let inbound links reaffirm their target.
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const inbound = new Map<string, Date>();
  const problems: string[] = [];

  for (const e of entries) {
    if (e.data.icon && !(e.data.icon in ICONS)) {
      problems.push(
        `  ${e.id}: icon "${e.data.icon}" is not in the vocabulary — add it to src/lib/icon-names.json and re-run scripts/gen-icons.mjs`,
      );
    }
    for (const raw of e.data.edges) {
      const target = resolve(raw.target);
      if (!target) {
        problems.push(
          `  ${e.id}: edge target "${raw.target}" (${raw.relation}) does not resolve to a published entry`,
        );
        continue;
      }
      if (target === e.id) {
        problems.push(`  ${e.id}: edge points at itself`);
        continue;
      }

      const directed = DIRECTED[raw.relation];
      // Symmetric relations get a canonical key so declaring on both ends is harmless.
      const key = directed
        ? `${raw.relation}:${e.id}->${target}`
        : `${raw.relation}:${[e.id, target].sort().join('|')}`;
      if (seen.has(key)) continue;
      seen.add(key);

      edges.push({
        id: key,
        source: e.id,
        target,
        relation: raw.relation,
        note: raw.note,
        directed,
      });

      // Writing or linking a new entry to something counts as reaffirming it.
      // Symmetric relations reaffirm mutually; `expresses` only flows to its object.
      const bump = (id: string, when: Date) => {
        const prev = inbound.get(id);
        if (!prev || when > prev) inbound.set(id, when);
      };
      bump(target, baseReaffirmed.get(e.id)!);
      if (!directed) bump(e.id, baseReaffirmed.get(target)!);
    }
  }

  if (problems.length) {
    throw new Error(
      `Graph has ${problems.length} problem(s):\n${problems.join('\n')}\n\n` +
        `Edge targets must name a published entry by id, statement, or source note title.`,
    );
  }

  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  const nodes: GraphNode[] = entries.map((e, i) => {
    const own = baseReaffirmed.get(e.id)!;
    const linked = inbound.get(e.id);
    const reaffirmed = linked && linked > own ? linked : own;

    const factor = decayFactor(e.data.type, asOf, reaffirmed);
    const effWeight = effectiveWeight(e.data.weight, e.data.type, asOf, reaffirmed);
    const targetR = targetRadius(effWeight, 300);

    // Golden-angle spiral: deterministic, evenly spread, no RNG so the SSR
    // markup and the first client render agree.
    const angle = i * GOLDEN;

    return {
      id: e.id,
      title: e.data.title,
      statement: e.data.statement ? plain(e.data.statement) : undefined,
      icon: e.data.icon,
      domain: e.data.domain,
      type: e.data.type,
      weight: e.data.weight,
      effWeight,
      factor,
      r: nodeRadius(effWeight),
      targetR,
      retired: e.data.retired,
      reaffirmed: reaffirmed.toISOString(),
      x: Math.cos(angle) * targetR,
      y: Math.sin(angle) * targetR,
    };
  });

  const neighbors: Record<string, string[]> = {};
  for (const n of nodes) neighbors[n.id] = [];
  for (const e of edges) {
    neighbors[e.source]?.push(e.target);
    neighbors[e.target]?.push(e.source);
  }

  const domainCounts: Record<string, number> = {};
  for (const n of nodes) domainCounts[n.domain] = (domainCounts[n.domain] ?? 0) + 1;

  return { nodes, edges, neighbors, domainCounts };
}
