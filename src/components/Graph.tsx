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
  DOMAIN_NOTE,
  RELATION_LABEL,
  TYPE_LABEL,
  type Domain,
  type EntryType,
  type Relation,
} from '../lib/vocab';
import { ICONS, ICON_VIEWBOX } from '../lib/icons.generated';
import type { GraphData, GraphEdge, GraphNode } from '../lib/graph';
import '../styles/graph.css';

const VIEW = { w: 700, h: 640, minX: -350, minY: -320 };
const RINGS = [105, 200, 295];

/**
 * On a phone the drawing is limited by width, so a taller box buys nothing — the
 * frame itself has to tighten. Everything positional scales together (radial
 * targets, rings, link lengths, viewBox) while the marks and their labels keep
 * their absolute size, which reads as zooming in rather than shrinking.
 */
const NARROW = '(max-width: 62rem)';
const NARROW_SCALE = 0.76;

/** No hover to give: a tap has to do the work of both pointing and choosing. */
const TOUCH = '(hover: none)';

/** Closer for causal relations, loosest for merely thematic ones. */
const LINK_DISTANCE: Record<Relation, number> = { expresses: 78, tension: 104, echoes: 140 };
const LINK_STRENGTH: Record<Relation, number> = { expresses: 0.34, tension: 0.2, echoes: 0.1 };

const DIM = 0.07;

type SimNode = GraphNode & SimulationNodeDatum;
type SimEdge = { source: SimNode | string; target: SimNode | string; relation: Relation };

const INK = 'var(--ink)';
const PAPER = 'var(--paper)';

const LABEL_SIZE = 11;
/** Clear air between a mark's edge and the first letter. */
const LABEL_GAP = 7;
/** Ink extent of one line at LABEL_SIZE, plus a little padding. Collision only. */
const LABEL_ABOVE = 10;
const LABEL_BELOW = 5;
const LABEL_PAD = 3;
/** Baseline offsets to try, in order: centred first, then nudged off the axis. */
const LABEL_DY = [4, -9, 17, -21, 29];
const LABEL_FONT = `${LABEL_SIZE}px 'Inter Variable', Inter, -apple-system, sans-serif`;

type Box = { x0: number; y0: number; x1: number; y1: number };
type Anchor = 'start' | 'end';
type Placement = { id: string; text: string; x: number; y: number; anchor: Anchor };

const area = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0);

const overlap = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
  Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** Measured where we can, estimated on the server. Cached — titles are stable. */
const widths = new Map<string, number>();
let measurer: CanvasRenderingContext2D | null | undefined;

function textWidth(s: string) {
  const hit = widths.get(s);
  if (hit !== undefined) return hit;

  if (measurer === undefined) {
    measurer = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    if (measurer) measurer.font = LABEL_FONT;
  }
  const w = measurer ? measurer.measureText(s).width : s.length * LABEL_SIZE * 0.53;
  widths.set(s, w);
  return w;
}

/**
 * Labels are the one part of the drawing the force layout can't help with: two
 * marks can sit a comfortable distance apart and still have their names collide.
 * So place them greedily, most important first, trying each side and a few
 * vertical nudges, and take the arrangement that costs the least — overlapping
 * another label is worst, covering a lit mark next, leaving the frame last.
 * There is always a placement; a bad one still reads thanks to the paper halo.
 */
function placeLabels(
  items: { id: string; text: string; x: number; y: number; r: number }[],
  discs: { id: string; x: number; y: number; r: number; lit: boolean }[],
  frame: Box,
): Placement[] {
  const placed: Box[] = [];
  const out: Placement[] = [];

  for (const item of items) {
    const w = textWidth(item.text);
    // Long titles on the right edge would run off the frame; start on the left.
    const sides: Anchor[] =
      item.x + item.r + LABEL_GAP + w > frame.x1 ? ['end', 'start'] : ['start', 'end'];

    let best: { p: Placement; box: Box; cost: number } | null = null;
    let tried = 0;

    for (const dy of LABEL_DY) {
      for (const anchor of sides) {
        const gap = item.r + LABEL_GAP;
        const x = anchor === 'start' ? item.x + gap : item.x - gap;
        const y = item.y + dy;
        const left = anchor === 'start' ? x : x - w;
        const box: Box = {
          x0: left - LABEL_PAD,
          x1: left + w + LABEL_PAD,
          y0: y - LABEL_ABOVE,
          y1: y + LABEL_BELOW,
        };

        // Prefer earlier candidates, all else equal.
        let cost = tried++ * 2;
        for (const b of placed) cost += overlap(box, b) * 4;
        for (const d of discs) {
          if (d.id === item.id) continue;
          const square: Box = { x0: d.x - d.r, y0: d.y - d.r, x1: d.x + d.r, y1: d.y + d.r };
          cost += overlap(box, square) * (d.lit ? 2 : 0.4);
        }
        cost += area(box) - overlap(box, frame);

        const p: Placement = { id: item.id, text: item.text, x, y, anchor };
        if (!best || cost < best.cost) best = { p, box, cost };
        if (cost === 0) break;
      }
      if (best?.cost === 0) break;
    }

    if (best) {
      placed.push(best.box);
      out.push(best.p);
    }
  }

  return out;
}

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
  const [active, setActive] = useState<string | null>(null);
  const [domain, setDomain] = useState<Domain | null>(null);
  const simRef = useRef<Simulation<SimNode, undefined> | null>(null);
  // Starts at 1 so the server-rendered markup is the wide layout, then tightens
  // on a narrow viewport once mounted.
  const [scale, setScale] = useState(1);
  // Likewise assumed false until mounted, so the markup the server sends and the
  // first client render agree.
  const [touch, setTouch] = useState(false);
  /**
   * The mark a tap has already committed to. Kept out of state and off `active`
   * because a tap on a clickable element also fires an emulated mouseenter, which
   * would otherwise make the first tap look like the second and navigate at once.
   */
  const tapped = useRef<string | null>(null);

  useEffect(() => {
    const narrow = window.matchMedia(NARROW);
    const hover = window.matchMedia(TOUCH);
    const apply = () => {
      setScale(narrow.matches ? NARROW_SCALE : 1);
      setTouch(hover.matches);
    };
    apply();
    narrow.addEventListener('change', apply);
    hover.addEventListener('change', apply);
    return () => {
      narrow.removeEventListener('change', apply);
      hover.removeEventListener('change', apply);
    };
  }, []);

  const open = (id: string) => {
    window.location.href = `/e/${id}/`;
  };

  /**
   * With a pointer, hovering has already shown the caption, so a click opens the
   * entry. With only taps, the first tap does the hovering — it selects, filling
   * the caption — and a second tap on the same mark opens it.
   */
  const choose = (id: string) => {
    if (!touch || tapped.current === id) {
      open(id);
      return;
    }
    tapped.current = id;
    setActive(id);
  };

  const view = useMemo(
    () => ({
      w: VIEW.w * scale,
      h: VIEW.h * scale,
      minX: VIEW.minX * scale,
      minY: VIEW.minY * scale,
    }),
    [scale],
  );

  const frame = useMemo<Box>(
    () => ({
      x0: view.minX,
      y0: view.minY,
      x1: view.minX + view.w,
      y1: view.minY + view.h,
    }),
    [view],
  );

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
          .distance((d) => LINK_DISTANCE[d.relation] * scale)
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
      .force('radial', forceRadial<SimNode>((d) => d.targetR * scale, 0, 0).strength(0.5))
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
  }, [data, scale]);

  /**
   * A domain lights its own entries and nothing else. It used to light their
   * neighbours too, on the theory that an idea's reach across life areas is worth
   * showing — but with this many cross-domain edges every filter lit most of the
   * graph, which made each domain look like it contained everything. Reach is
   * still legible one mark at a time, which is where it reads anyway.
   */
  const focus = useMemo(() => {
    if (active) {
      return new Set<string>([active, ...(data.neighbors[active] ?? [])]);
    }
    if (domain) {
      return new Set<string>(data.nodes.filter((n) => n.domain === domain).map((n) => n.id));
    }
    return null;
  }, [active, domain, data]);

  const isLit = (id: string) => !focus || focus.has(id);

  // Labels only exist while something is selected, so lay them out from scratch
  // each tick rather than trying to animate them into place.
  const labels = useMemo(() => {
    if (!focus) return [];

    const discs = data.nodes.flatMap((n) => {
      const p = positions[n.id];
      return p ? [{ id: n.id, x: p.x, y: p.y, r: n.r, lit: focus.has(n.id) }] : [];
    });

    const items = data.nodes
      .filter((n) => focus.has(n.id) && positions[n.id])
      // The active mark gets first pick, then the heaviest.
      .sort(
        (a, b) =>
          (a.id === active ? -1 : b.id === active ? 1 : 0) ||
          b.r - a.r ||
          a.id.localeCompare(b.id),
      )
      .map((n) => ({
        id: n.id,
        text: truncate(n.title, 42),
        x: positions[n.id].x,
        y: positions[n.id].y,
        r: n.r,
      }));

    return placeLabels(items, discs, frame);
  }, [focus, active, positions, data.nodes, frame]);

  const caption = useMemo(() => {
    if (active) return <NodeCaption node={byId[active]} data={data} />;
    if (domain) {
      const inDomain = data.nodes.filter((n) => n.domain === domain).length;
      return (
        <>
          <strong style={{ fontWeight: 500 }}>{DOMAIN_LABEL[domain]}</strong> — {inDomain}{' '}
          {inDomain === 1 ? 'entry' : 'entries'}.{' '}
          <span style={{ color: 'var(--ink-soft)' }}>{DOMAIN_NOTE[domain]}</span>
        </>
      );
    }
    return (
      <span style={{ color: 'var(--ink-soft)' }}>
        Nothing selected — {touch ? 'tap' : 'hover'} any mark.
      </span>
    );
  }, [active, domain, byId, data, focus, touch]);

  return (
    <div className="graph-layout">
      <div className="graph-stage">
      <svg
        viewBox={`${view.minX} ${view.minY} ${view.w} ${view.h}`}
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={`${data.nodes.length} entries connected by ${data.edges.length} relationships`}
        // Touch devices emit an emulated mouseleave when you tap elsewhere, which
        // would tear the selection down mid-gesture — including the link the tap
        // was aimed at. With no pointer there is no hover to leave, so ignore it.
        onMouseLeave={() => {
          if (!touch) setActive(null);
        }}
        onClick={() => {
          // Tapping the paper puts the selection down again.
          tapped.current = null;
          setActive(null);
        }}
      >
        {RINGS.map((r) => (
          <circle
            key={r}
            r={r * scale}
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
            const touchesActive = !active || e.source === active || e.target === active;
            const opacity = both && touchesActive ? s.base : DIM;

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

            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                opacity={opacity}
                style={{ transition: 'opacity 220ms ease', cursor: 'pointer' }}
                tabIndex={0}
                role="link"
                aria-label={n.title}
                onMouseEnter={() => setActive(n.id)}
                onFocus={() => setActive(n.id)}
                // Same reason as the mouseleave above: a tap moves focus, and
                // clearing here would unmount the caption's link before the tap
                // aimed at it lands. Keyboard users still get it cleared.
                onBlur={() => {
                  if (!touch) setActive(null);
                }}
                onClick={(ev) => {
                  // Kept from the backdrop handler, which clears the selection.
                  ev.stopPropagation();
                  choose(n.id);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    // Focus has already filled the caption, so this opens.
                    open(n.id);
                  }
                }}
              >
                <Mark type={n.type} r={n.r} icon={n.icon} />
                {/* Invisible generous hit area — the marks are small on purpose. */}
                <circle r={Math.max(n.r + 8, 14)} fill="transparent" />
              </g>
            );
          })}
        </g>

        {/* Above every mark, so a name is never half-covered by a later node. */}
        <g style={{ pointerEvents: 'none' }} fontSize={LABEL_SIZE}>
          {labels.map((l) => (
            <text
              key={l.id}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              fill={l.id === active ? 'var(--ink)' : 'var(--ink-soft)'}
              // Paper halo: where a crossing is unavoidable, the name still reads.
              stroke={PAPER}
              strokeWidth={3.5}
              strokeLinejoin="round"
              style={{ paintOrder: 'stroke' }}
            >
              {l.text}
            </text>
          ))}
        </g>
      </svg>
      </div>

      <aside className="graph-panel">
      {/* Empty state sinks to the bottom of the reserved box, so an idle panel
          reads as breathing room rather than as a hole above the filters. */}
      <p className={`graph-caption${active || domain ? '' : ' is-empty'}`}>{caption}</p>

      <div className="graph-filters">
        {DOMAINS.map((d) => {
          const selected = domain === d;
          const count = data.domainCounts[d] ?? 0;
          return (
            <button
              key={d}
              onClick={() => setDomain(selected ? null : d)}
              disabled={count === 0}
              aria-pressed={selected}
              style={{
                font: 'inherit',
                fontSize: 13,
                padding: '0.35rem 0.9rem',
                borderRadius: 999,
                cursor: count === 0 ? 'default' : 'pointer',
                border: `1px solid ${selected ? 'var(--ink)' : 'var(--hairline)'}`,
                background: selected ? 'var(--ink)' : 'transparent',
                color: selected ? 'var(--paper)' : count === 0 ? 'var(--hairline)' : 'var(--ink)',
                transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
              }}
            >
              {DOMAIN_LABEL[d]}
            </button>
          );
        })}
      </div>

      <Recent nodes={data.nodes} />
      <About nodes={data.nodes.length} edges={data.edges.length} />
      </aside>
    </div>
  );
}

/**
 * The count and the key, at the foot of the column. In the panel rather than
 * across the page bottom because that row of height is worth more to the drawing.
 */
function About({ nodes, edges }: { nodes: number; edges: number }) {
  return (
    <div className="graph-about">
      <p className="meta">
        {nodes} entries · {edges} connections
      </p>
      <details>
        <summary className="meta">What this is</summary>
        <p>
          Every mark is one thing I believe, remember, value, hold an opinion about, or
          live with. Weight pulls the important ones toward the middle, so what you see
          first is what matters most rather than what happened most recently. The lines
          are connections I drew on purpose — including the uncomfortable ones.
        </p>
        <p>
          The container says which kind of thing it is: a filled disc is a value, an
          outlined one a belief, a dotted one an opinion, a ringed one a condition I live
          with now, and a bare glyph a memory. Marks fade as they go unconsidered.
        </p>
      </details>
    </div>
  );
}

/**
 * What has moved lately. The graph is deliberately arranged by weight rather than
 * recency, so this is the one place newness gets to speak — a footnote, not the
 * organising principle.
 */
function Recent({ nodes }: { nodes: GraphNode[] }) {
  const items = useMemo(() => {
    const byRecency = [...nodes].sort((a, b) => b.reaffirmed.localeCompare(a.reaffirmed));
    // Dates are formatted against the newest entry, never against `now`: the page
    // is prerendered, and a clock-dependent label would differ after hydration.
    const latestYear = new Date(byRecency[0]?.reaffirmed ?? Date.now()).getUTCFullYear();
    return byRecency.slice(0, 5).map((n) => {
      const d = new Date(n.reaffirmed);
      return {
        id: n.id,
        title: n.title,
        icon: n.icon,
        when: d.toLocaleDateString('en-US',
          d.getUTCFullYear() === latestYear
            ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
            : { month: 'short', year: 'numeric', timeZone: 'UTC' },
        ),
      };
    });
  }, [nodes]);

  return (
    <section className="graph-recent">
      <h2 className="meta">Recently updated</h2>
      <ul>
        {items.map((n) => (
          <li key={n.id}>
            <a href={`/e/${n.id}/`}>
              {n.icon && ICONS[n.icon] ? (
                <svg
                  viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: ICONS[n.icon] }}
                />
              ) : (
                <span className="dot" aria-hidden="true" />
              )}
              <span className="label">{n.title}</span>
              <span className="when">{n.when}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Relation order in the caption: tensions first, they are the point. */
const CAPTION_ORDER = ['tension', 'expresses', 'echoes'] as const;

function NodeCaption({ node, data }: { node: GraphNode | undefined; data: GraphData }) {
  if (!node) return null;
  const links = data.edges.filter((e) => e.source === node.id || e.target === node.id);

  /**
   * Grouped by relation and run inline, so the label is said once and a
   * seven-connection node still costs two lines rather than seven.
   */
  const groups = CAPTION_ORDER.flatMap((relation) => {
    const inRelation = links
      .filter((e) => e.relation === relation)
      .map((e) => ({
        label: e.target === node.id && e.directed ? 'expressed by' : RELATION_LABEL[e.relation],
        title:
          data.nodes.find((n) => n.id === (e.source === node.id ? e.target : e.source))?.title ??
          '',
      }));
    return [...new Set(inRelation.map((e) => e.label))].map((label) => ({
      relation,
      label,
      titles: inRelation.filter((e) => e.label === label).map((e) => e.title),
    }));
  });

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
      {groups.length > 0 && (
        <span
          style={{
            display: 'block',
            marginTop: '0.5rem',
            fontSize: 13,
            lineHeight: 1.5,
            color: 'var(--ink-soft)',
          }}
        >
          {groups.map((g, i) => (
            <span key={g.label}>
              {i > 0 && <span style={{ color: 'var(--hairline)' }}> · </span>}
              <em
                style={{
                  fontStyle: 'normal',
                  color: g.relation === 'tension' ? 'var(--rust)' : 'var(--ink-soft)',
                }}
              >
                {g.label}
              </em>{' '}
              {g.titles.join(', ')}
            </span>
          ))}
        </span>
      )}
      {/* The way in, said out loud. Without it, opening an entry on a touch screen
          depends on guessing that a second tap does something. */}
      <a className="graph-open" href={`/e/${node.id}/`}>
        Read this entry <span aria-hidden="true">→</span>
      </a>
    </>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}
