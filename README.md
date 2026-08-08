# butskograph

A personal site for beliefs, memories, opinions and values, built to counter a blog's
recency bias with an **importance bias**. What shows large and central is what matters
most, not what is newest.

## Running it

```bash
npm install
npm run dev        # http://localhost:4321, hot reload
npm run build      # static output in dist/
npm run preview    # serve the built output
npm run sync       # what's waiting to be published (see below)
```

## How content flows

```
Obsidian vault                    this repo                     the site
Site/*.md          ──/graph-sync──▶  src/content/entries/*.md  ──▶  dist/
plain prose                        prose + metadata                static
```

**The vault is the only place you write.** It lives at
`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/butsko/Site/`. Because it is
iCloud-synced, Obsidian on your phone is the capture story — there is no form, API or
companion app to maintain.

Three rules the pipeline is built around:

1. **The vault is never written to.** It holds ~235 personal notes and this site is
   public. Tooling reads `Site/` and nothing else.
2. **Publishing is opt-in per note.** A note becomes public only when `/graph-sync`
   promotes it into `src/content/entries/`. Nothing is inferred from folders.
3. **Published entries are snapshots.** Each carries `source` and `sourceModified`
   pointing back at its vault note, so editing prose in Obsidian never silently changes
   what is live. `npm run sync` reports the drift and re-publishing is a deliberate act.

Vault folder structure deliberately does **not** map to the site. Domain is metadata, so a
note lives wherever it naturally lives in your vault.

### The sync skill

Run `/graph-sync` in Claude Code. It scans `Site/`, then for each unpublished note asks
for the things a machine cannot know — domain, type, weight, icon, and which connections
to draw — and writes the entry. It reads your existing `[[wikilinks]]` and proposes them
as edges, since those are connections you already made by hand.

`npm run sync` is the read-only scan on its own. Buckets: `NEW`, `DRIFTED`, `CURRENT`,
`ORPHANED` (published, vault note renamed or deleted), `UNLINKED`, `EMPTY`.

## The data model

```yaml
statement: "\"Enough\" is key — the middle path."   # the node's text, one sentence
icon: scale                    # subject glyph, from src/lib/icon-names.json
domain: ideas                  # family | body | mind | work | ideas | play
type: value                    # value | belief | memory | opinion | condition
weight: 9                      # 1–10, importance not confidence
date: 2023-05-20               # when it became true
reaffirmed: 2025-01-15         # optional; overrides the computed value
edges:
  - target: food-obsession     # entry id, statement, or vault note title
    relation: tension          # expresses | tension | echoes
    note: I say enough, then eat past full
retired: false                 # conditions that stopped being true
source: Site/Enough.md
sourceModified: 2023-05-20T12:00:00Z
```

Everything is validated at build time — unknown domain, type or icon, a weight out of
range, or an edge target that does not resolve all fail the build and name the entry. That
matters because nothing validates at capture time.

Two schema decisions worth knowing:

- **No `mutable` flag.** Decay behaviour is fully determined by `type`, so a second
  orthogonal flag could only ever contradict it.
- **Money is not a domain.** Money entries live where they are rooted (a 529 decision is
  Family, a compensation question is Work) while the underlying belief lives once in
  Ideas. The architecture enacts the belief: money never gets a centre of gravity.

## Visual encoding

| Channel | Encodes |
|---|---|
| Distance from centre | weight, after decay — the importance bias, as a force |
| Node size | weight, by area |
| Opacity | freshness; a drifted opinion literally looks faded |
| Glyph | subject (leaf, bike, flame…) |
| Container | type |
| Line style | relation |

Containers: **value** a filled ink disc with the glyph knocked out in paper · **belief** a
hollow ring · **opinion** a dotted ring · **memory** no frame at all, because a fact needs
none · **condition** a ring with a halo, still radiating.

Relations: **expresses** solid ink (directed, idea → lived instance) · **tension** dashed
rust · **echoes** thin dotted grey. Rust is the only real colour on the site and it is
reserved for tension, so the least comfortable relationships are the ones that catch the
eye.

Domain chips are a **lens, not a region**: selecting one lights its entries *plus* whatever
they touch elsewhere, showing an idea's reach across life areas rather than trapping it in
a wedge.

There is no headline. The graph is the hero, and the one serif moment is the statement
under your cursor.

## Drift

Weight decays by half-life from the last reaffirmation:

```
factor = max(0.3, 2 ^ -(years since reaffirmed / half-life))
```

| Type | Half-life | Why |
|---|---|---|
| value | 25 years | near-permanent, but not immune |
| belief | 8 years | settled and revisable |
| opinion | 2 years | provisional by definition |
| memory | none | a fact, not a claim; weight is centrality, not recency |
| condition | none | true until it is not, then retired rather than faded |

The 0.3 floor means nothing fades to nothing — a stale opinion goes peripheral, not
invisible.

**Reaffirmation** pulls a node back inward, and three things count: editing the vault note
(picked up via `sourceModified`), setting `reaffirmed` explicitly, or linking a new entry
to it. Symmetric relations (`tension`, `echoes`) reaffirm both ends; `expresses` only
flows to its object.

The effect is that Ideas tends to end up central without any rule saying so — those
entries simply carry the highest weight. It is emergent, not structural.

## Icons

`src/lib/icons.generated.ts` is generated, not edited. To add one:

```bash
# add the Lucide name to src/lib/icon-names.json, then
node scripts/gen-icons.mjs
```

Only the icons in the vocabulary ship to the browser.

## Deploying to Cloudflare

Deploys are git-driven: pushing to `main` builds and ships. `wrangler.jsonc` declares the
site as static assets with no Worker script, so there is no server and no cold start.

```bash
npm run deploy   # manual deploy, if you need one
```

`--no-autoconfig` is not optional. Wrangler's framework detection runs `astro add
cloudflare` by default, and the `@astrojs/cloudflare` adapter does not build against Astro
7 — it imports `beginContentEntryCollection` from `astro/app`, which no longer exists. The
adapter is for server rendering and this site has none, so the fix is to keep it out.

Cloudflare Web Analytics is wired into `Base.astro` behind `PUBLIC_CF_BEACON_TOKEN`. The
beacon is baked in at build time, so it only appears when that variable is set in the
deploy environment — local builds and previews stay silent. No cookies, no cross-site
tracking.

## Layout

```
src/
  content/entries/     published snapshots — written by /graph-sync
  content.config.ts    schema; the build-time safety net
  lib/
    vocab.ts           domains, types, relations, half-lives — the single vocabulary
    decay.ts           the drift formula and the size/position scales
    graph.ts           edge resolution, reaffirmation, layout seeding
    icons.generated.ts generated; do not edit
  components/Graph.tsx force simulation and all the visual encoding
  pages/               index (the graph), /e/<id> (one entry), 404
scripts/
  scan-vault.mjs       read-only vault scan
  gen-icons.mjs        icon vocabulary generator
.claude/skills/graph-sync/
```
