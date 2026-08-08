---
name: graph-sync
description: Publish or update entries on the butskograph site from notes in the Obsidian vault's Site/ folder. Use when the user says sync, publish, "add my new notes to the graph", wants to re-weight or connect existing entries, or asks what's waiting to be published.
---

# graph-sync

Turns plain prose in the vault into published graph entries by asking for the metadata
that cannot be inferred, rather than making the author hand-type frontmatter.

## Hard rules

1. **Never write to the vault.** It is the authoring surface and it holds ~235 personal
   notes. This skill reads `Site/` and writes only to `src/content/entries/` in the repo.
2. **Never read outside `Site/`.** The rest of the vault is private; this site is public.
3. **Never publish without explicit confirmation** of domain, type, and weight for that
   specific entry. Publishing is a deliberate act, not a default.
4. **Never invent autobiographical content.** The prose is the author's. Propose metadata
   and connections; do not write or embellish statements. If a statement needs rewording,
   propose it and let them accept.

## Steps

### 1. Scan

```bash
node scripts/scan-vault.mjs
```

Buckets: `NEW` (unpublished), `DRIFTED` (vault note edited since publish), `CURRENT`,
`ORPHANED` (published, vault note renamed/deleted), `UNLINKED`.

Report the counts, then ask which to work through. Do not start publishing unprompted.
If everything is `CURRENT`, say so and stop.

### 2. For each NEW note

Read the note via the scan's `--json` output (`body`, `statement`, `title`).

Propose values, with reasoning, then confirm with **one** `AskUserQuestion` call carrying
up to four questions at once — domain, type, weight, icon. Do not ask these one at a time.
Ask about statement wording only if it genuinely needs tightening.

- **title** — the vault note's filename, verbatim. This is the node label and the page
  headline, so it is not something to invent or improve; it is whatever the note is called
  in Obsidian. Renaming happens in the vault, not here.
- **statement** — first line of the prose. One sentence, present tense, no trailing
  context. It sits under the title as an italic subheading, not as the headline. Offer to
  tighten it if it reads long. It is **optional**: when the note's first line is a
  fragment, a framing sentence about the document rather than a claim, or just the opening
  of a paragraph that does not stand alone, propose omitting it and letting the title carry
  the page. A bad statement is worse than none. Never assemble one out of your own words to
  fill the gap — that is inventing autobiography.
- **domain** — `family` `body` `mind` `work` `ideas` `play`. Where the entry is *rooted*,
  not what it is about. Money is deliberately not a domain: a 529 decision is Family, a
  compensation question is Work, and the underlying belief about money lives once in
  Ideas. Vault folders mean nothing here.
- **type** — `value` (near-permanent, would defend) · `belief` (settled but revisable,
  a claim about what is true) · `memory` (a fact, does not decay) · `opinion`
  (provisional, expected to move) · `condition` (ongoing and true right now, not a chosen
  stance). The value/belief line is whether it is a commitment or a truth-claim.
- **weight** — 1–10, importance not confidence. Reserve 9–10 for things that reorganise
  other entries. Default to `DEFAULT_WEIGHT` (4) if they would rather curate later.
- **icon** — the subject glyph, a name from `src/lib/icon-names.json`. This encodes what
  the entry is *about*; `type` is already carried by the container shape, so do not pick
  an icon that restates the type. The note's `#tags` are a good hint (`#food` → `utensils`,
  `#environment` → `leaf`). Offer two or three candidates. If none fit, add a Lucide name
  to `icon-names.json` and re-run `node scripts/gen-icons.mjs` — an unknown icon fails the
  build rather than rendering blank.

### 3. Propose edges

This is the highest-value step and the one worth spending real effort on.

**Start from the note's own `[[wikilinks]]`.** The scan reports them per note. The author
already drew those connections by hand, so every one is a candidate edge — all that is
missing is the relation type. Propose a relation for each and confirm. A wikilink pointing
at a note that is not yet published is a reason to publish that note in the same session,
not a reason to drop the edge.

Then read the already-published entries (`src/content/entries/`) and propose *additional*
connections the prose implies but does not link, each with a relation and a one-line reason:

- **`expresses`** — an idea showing up as a lived instance. Directed, idea → instance.
  Declare it on the idea.
- **`tension`** — two things actively pulling against each other. Symmetric. These are
  the most valuable edges on the site and the easiest to leave out; look for them
  deliberately, especially between a `value` and a `condition`.
- **`echoes`** — thematically related, no hierarchy or causality. Symmetric.

Symmetric edges only need declaring on one end. Add a `note:` explaining *why* the edge
exists whenever it is not self-evident — always for `tension`.

Ask before adding each edge, or present the full proposed set for one approval. Never
add edges silently.

### 4. Write the entry

Path: `src/content/entries/<slug>.md`, slug from the note title, kebab-case. The slug may
be shortened; `title` still carries the full note name.

```markdown
---
title: Enough & The Middle Path
statement: "…"   # omit the key entirely if no line stands on its own
icon: scale
domain: ideas
type: value
weight: 9
date: 2026-07-26
edges:
  - target: food-obsession
    relation: tension
    note: why this pulls against that
source: Site/Enough.md
sourceModified: <vault note mtime, ISO 8601>
---

<the prose body, verbatim, minus the first line>
```

- `title` is the vault note's basename, exactly as it appears in Obsidian — quote it if it
  contains a colon.
- `statement` must be double-quoted with inner quotes escaped — statements often begin
  with a quote mark or apostrophe, which breaks bare YAML. Omit the key when there is no
  statement; do not write an empty string, which fails the schema.
- the body is the prose minus the statement line. When the statement is omitted, the body
  keeps the whole prose — unless the first line is the fragment that made a statement
  impossible, in which case it goes nowhere.
- `date` is when it became true, not today's date, if the author knows it. Ask if unclear.
- `sourceModified` must be the real vault mtime, from the scan. It drives drift detection
  *and* decay, so a wrong value silently distorts the graph.
- `edges` is `[]` if none.
- Leave `[[wikilinks]]` in the prose alone. A remark plugin resolves them at build time
  against every published entry's id, title, statement, and source note title; anything
  unresolved renders as plain text, so an unpublished target is not a broken page.

### 5. For each DRIFTED note

The vault prose changed since publishing. Show what changed, then ask whether to
re-publish. Re-publishing updates the body and `sourceModified` — which counts as a
reaffirmation and pulls the node back inward. Offer to revisit weight at the same time.

For `ORPHANED`, ask whether to delete the entry or re-point `source` at a renamed note.
Deleting an entry means finding and removing edges that target it.

### 6. Validate

```bash
npm run build
```

The build fails on unresolved edge targets, bad domain/type, or out-of-range weight, and
names the offending entry. A green build is the check that the sync worked — do not
report success without it.

Then summarise: what got published, at what weight, with which edges, and how it landed
relative to the existing graph (more central than X, out past Y).

## Retiring a condition

A `condition` that stopped being true gets `retired: true`. It leaves the graph but keeps
its URL — archived, not faded, and never deleted for having ended.
