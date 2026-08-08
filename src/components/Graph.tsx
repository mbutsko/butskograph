import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceRadial,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
} from 'd3-force';
import { freshnessOpacity } from '../lib/decay';
import {
  DOMAINS,
  DOMAIN_LABEL,
  RELATION_LABEL,
  TYPE_LABEL,
  TYPE_NOTE,
  type Domain,
  type EntryType,
  type Relation,
} from '../lib/vocab';
import { ICONS, ICON_VIEWBOX } from '../lib/icons.generated';
import type { GraphData, GraphEdge, GraphNode } from '../lib/graph';

const VIEW = { w: 720, h: 680, minX: -360, minY: -340 };
const RINGS = [105, 200, 295];

/** Closer for causal relations, loosest for merely thematic ones. */
const LINK_DISTANCE: Record<Relation, number> = { expresses: 78, tension: 104, echoes: 140 };
const LINK_STRENGTH: Record<Relation, number> = { expresses: 0.34, tension: 0.2, echoes: 0.1 };

const DIM = 0.07;

type SimNode = GraphNode & SimulationNodeDatum;
type SimEdge = { source: SimNode | string; target: SimNode | string; relation: Relation };

const INK = 'var(--ink)';
const PAPER = 'var(--paper)';

/** Monochrome subject glyph, scaled to keep an even stroke at any node size. */
function Glyph({ name, size, color }: { name: string; size: number; color: string }) {
  const inner = ICONS[name];
  if (!inner) return null;
  const scale = size / ICON_VIEWBOX;
  return (
    <g
      transform={`translate(${-size / 2},${-size / 2}) scale(${scale})`}
      fill="none"
      stroke={color}
      strokeWidth={1.45 / scale}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

/**
 * Type as the container holding the glyph: solid reads as settled, hollow as
 * revisable, dotted as provisional, bare as fact, haloed as ongoing.
 */
function Container({ type, r }: { type: EntryType; r: number }) {
  switch (type) {
    case 'value':
      return <circle r={r} fill={INK} />;
    case 'belief':
      return <circle r={r} fill={PAPER} stroke={INK} strokeWidth={1.5} />;
    case 'opinion':
      return (
        <circle r={r} fill={PAPER} stroke={INK} strokeWidth={1.25} strokeDasharray="1.5 2.5" />
      );
    case 'memory':
      // A fact needs no frame.
      return null;
    case 'condition':
      // Halo: ongoing and true right now, still radiating.
      return (
        <>
          <circle r={r + 3.5} fill="none" stroke={INK} strokeWidth={0.75} opacity={0.4} />
          <circle r={r} fill={PAPER} stroke={INK} strokeWidth={1.5} />
        </>
      );
  }
}

/** Fallback for entries with no icon assigned yet: type encoding alone. */
function TypeShape({ type, r }: { type: EntryType; r: number }) {
  switch (type) {
    case 'memory':
      return <path d={`M0,${-r} L${r},0 L0,${r} L${-r},0 Z`} fill={INK} />;
    case 'condition':
      return (
        <>
          <circle r={r} fill={PAPER} stroke={INK} strokeWidth={1.5} />
          <circle r={Math.max(1.6, r * 0.42)} fill={INK} />
        </>
      );
    default:
      return <Container type={type} r={r} />;
  }
}

export function Mark({ type, r, icon }: { type: EntryType; r: number; icon?: string }) {
  const hasIcon = !!(icon && ICONS[icon]);
  if (!hasIcon) return <TypeShape type={type} r={r} />;
  return (
    <>
      <Container type={type} r={r} />
      <Glyph
        name={icon!}
        size={r * 1.3}
        // Knocked out of the solid disc; ink everywhere else.
        color={type === 'value' ? PAPER : INK}
      />
    </>
  );
}

function edgeStyle(relation: Relation) {
  switch (relation) {
    case 'expresses':
      return { stroke: 'var(--ink)', strokeWidth: 1, strokeDasharray: undefined, base: 0.32 };
    case 'tension':
      // The single reserved spot of real colour in the whole palette.
      return { stroke: 'var(--rust)', strokeWidth: 1.3, strokeDasharray: '4 3', base: 0.62 };
    case 'echoes':
      return { stroke: 'var(--ink-soft)', strokeWidth: 0.9, strokeDasharray: '1 3', base: 0.34 };
  }
}

export default function Graph({ data }: { data: GraphData }) {
  const [positions, setPositions] = useState(() =>
    Object.fromEntries(data.nodes.map((n) => [n.id, { x: n.x, y: n.y }])),
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);

  const byId = useMemo(
    () => Object.fromEntries(data.nodes.map((n) => [n.id, n])) as Record<string, GraphNode>,
    [data.nodes],
  );

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const simNodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const simEdges: SimEdge[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
    }));

    const sim = forceSimulation(simNodes)
      .force(
        'link',
        forceLink<SimNode, SimEdge>(simEdges)
          .id((d) => d.id)
          .distance((d) => LINK_DISTANCE[d.relation])
          .strength((d) => LINK_STRENGTH[d.relation]),
      )
      .force(
        'charge',
        forceManyBody<SimNode>().strength((d) => -150 - d.r * 9),
      )
      .force(
        'collide',
        forceCollide<SimNode>((d) => d.r + 7).strength(0.85),
      )
      // The importance bias, as a force: heavier entries are pulled inward.
      .force('radial', forceRadial<SimNode>((d) => d.targetR, 0, 0).strength(0.5))
      .force('x', forceX(0).strength(0.012))
      .force('y', forceY(0).strength(0.012));

    const commit = () =>
      setPositions(
        Object.fromEntries(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }])),
      );

    if (reduced) {
      // Solve it silently and present the settled result.
      sim.stop();
      for (let i = 0; i < 400; i++) sim.tick();
      commit();
    } else {
      sim.on('tick', commit);
      simRef.current = sim;
    }

    return () => {
      sim.on('tick', null);
      sim.stop();
      simRef.current = null;
    };
  }, [data]);

  /**
   * Domain is a lens, not a region: selecting one lights its entries *plus*
   * whatever they touch elsewhere, so an idea's reach across life areas shows.
   */
  const focus = useMemo(() => {
    if (hovered) {
      return new Set<string>([hovered, ...(data.neighbors[hovered] ?? [])]);
    }
    if (domain) {
      const inDomain = data.nodes.filter((n) => n.domain === domain).map((n) => n.id);
      const reach = inDomain.flatMap((id) => data.neighbors[id] ?? []);
      return new Set<string>([...inDomain, ...reach]);
    }
    return null;
  }, [hovered, domain, data]);

  const isLit = (id: string) => !focus || focus.has(id);

  const caption = useMemo(() => {
    if (hovered) return <NodeCaption node={byId[hovered]} data={data} />;
    if (domain) {
      const inDomain = data.nodes.filter((n) => n.domain === domain).length;
      const reach = (focus?.size ?? 0) - inDomain;
      return (
        <>
          <strong style={{ fontWeight: 500 }}>{DOMAIN_LABEL[domain]}</strong> — {inDomain}{' '}
          {inDomain === 1 ? 'entry' : 'entries'}
          {reach > 0 && <>, plus {reach} connected elsewhere</>}.
        </>
      );
    }
    return <span style={{ color: 'var(--ink-soft)' }}>Nothing selected — hover any mark above.</span>;
  }, [hovered, domain, byId, data, focus]);

  return (
    <div>
      <svg
        viewBox={`${VIEW.minX} ${VIEW.minY} ${VIEW.w} ${VIEW.h}`}
        width="100%"
        style={{ display: 'block', height: 'auto', overflow: 'visible' }}
        role="img"
        aria-label={`${data.nodes.length} entries connected by ${data.edges.length} relationships`}
        onMouseLeave={() => setHovered(null)}
      >
        {RINGS.map((r) => (
          <circle
            key={r}
            r={r}
            fill="none"
            stroke="var(--ring-guide)"
            strokeWidth={1}
            strokeDasharray="1 4"
          />
        ))}

        <g>
          {data.edges.map((e) => {
            const a = positions[e.source];
            const b = positions[e.target];
            if (!a || !b) return null;

            const s = edgeStyle(e.relation);
            const both = isLit(e.source) && isLit(e.target);
            const touchesHover = !hovered || e.source === hovered || e.target === hovered;
            const opacity = both && touchesHover ? s.base : DIM;

            return (
              <line
                key={e.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
                strokeDasharray={s.strokeDasharray}
                opacity={opacity}
                style={{ transition: 'opacity 220ms ease' }}
              />
            );
          })}
        </g>

        <g>
          {data.nodes.map((n) => {
            const p = positions[n.id];
            if (!p) return null;
            const lit = isLit(n.id);
            const opacity = lit ? freshnessOpacity(n.factor) : DIM;
            const showLabel = lit && (hovered === n.id || (focus !== null && focus.has(n.id)));

            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                opacity={opacity}
                style={{ transition: 'opacity 220ms ease', cursor: 'pointer' }}
                tabIndex={0}
                role="link"
                aria-label={n.title}
                onMouseEnter={() => setHovered(n.id)}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}
                onClick={() => {
                  window.location.href = `/e/${n.id}/`;
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    window.location.href = `/e/${n.id}/`;
                  }
                }}
              >
                <Mark type={n.type} r={n.r} icon={n.icon} />
                {/* Invisible generous hit area — the marks are small on purpose. */}
                <circle r={Math.max(n.r + 8, 14)} fill="transparent" />
                {showLabel && (
                  <text
                    x={n.r + 7}
                    y={4}
                    fontSize={11}
                    fill="var(--ink-soft)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {truncate(n.title, 42)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <p
        style={{
          minHeight: '4.5rem',
          margin: '1.5rem auto 0',
          maxWidth: '30rem',
          textAlign: 'center',
          fontSize: 14,
        }}
      >
        {caption}
      </p>

      <hr className="hairline" style={{ margin: '2.5rem 0 1.5rem' }} />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'center',
        }}
      >
        {DOMAINS.map((d) => {
          const active = domain === d;
          const count = data.domainCounts[d] ?? 0;
          return (
            <button
              key={d}
              onClick={() => setDomain(active ? null : d)}
              disabled={count === 0}
              aria-pressed={active}
              style={{
                font: 'inherit',
                fontSize: 13,
                padding: '0.35rem 0.9rem',
                borderRadius: 999,
                cursor: count === 0 ? 'default' : 'pointer',
                border: `1px solid ${active ? 'var(--ink)' : 'var(--hairline)'}`,
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? 'var(--paper)' : count === 0 ? 'var(--hairline)' : 'var(--ink)',
                transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
              }}
            >
              {DOMAIN_LABEL[d]}
            </button>
          );
        })}
      </div>

      <Legend />
    </div>
  );
}

function NodeCaption({ node, data }: { node: GraphNode | undefined; data: GraphData }) {
  if (!node) return null;
  const links = data.edges.filter((e) => e.source === node.id || e.target === node.id);

  return (
    <>
      <span className="voice" style={{ fontSize: 19, display: 'block' }}>
        {node.title}
      </span>
      {node.statement && (
        <span
          style={{
            display: 'block',
            fontStyle: 'italic',
            fontSize: 14.5,
            color: 'var(--ink-soft)',
            margin: '0.35rem 0 0.6rem',
          }}
        >
          {node.statement}
        </span>
      )}
      <span className="meta" style={{ display: 'block', marginTop: node.statement ? 0 : '0.35rem' }}>
        {TYPE_LABEL[node.type]} · {DOMAIN_LABEL[node.domain]} · weight {node.weight}
      </span>
      {links.length > 0 && (
        <span
          style={{
            display: 'block',
            marginTop: '0.6rem',
            fontSize: 13,
            color: 'var(--ink-soft)',
          }}
        >
          {links.map((e, i) => {
            const otherId = e.source === node.id ? e.target : e.source;
            const other = data.nodes.find((n) => n.id === otherId);
            const inbound = e.target === node.id && e.directed;
            return (
              <span key={e.id} style={{ display: 'block' }}>
                {i === 0 ? '' : ''}
                <em
                  style={{
                    fontStyle: 'normal',
                    color: e.relation === 'tension' ? 'var(--rust)' : 'var(--ink-soft)',
                  }}
                >
                  {inbound ? 'expressed by' : RELATION_LABEL[e.relation]}
                </em>{' '}
                {truncate(other?.title ?? otherId, 52)}
              </span>
            );
          })}
        </span>
      )}
    </>
  );
}

function Legend() {
  const items: EntryType[] = ['value', 'belief', 'memory', 'opinion', 'condition'];
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '1.5rem auto 0',
        maxWidth: '32rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem 1.5rem',
        justifyContent: 'center',
        fontSize: 12.5,
        color: 'var(--ink-soft)',
      }}
    >
      {items.map((t) => (
        <li key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width={26} height={26} viewBox="-13 -13 26 26" aria-hidden="true">
            <Mark type={t} r={9} icon="leaf" />
          </svg>
          <span title={TYPE_NOTE[t]}>{TYPE_LABEL[t]}</span>
        </li>
      ))}
    </ul>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}
