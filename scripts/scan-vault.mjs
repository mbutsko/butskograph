#!/usr/bin/env node
/**
 * Compares the vault's Site/ folder against published entries in this repo.
 *
 * Reads only. Never writes to the vault, and never looks outside Site/ — the rest
 * of the vault is personal and this site is public.
 *
 * Usage: node scripts/scan-vault.mjs [--json]
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import matter from 'gray-matter';

const VAULT =
  process.env.VAULT_PATH ??
  join(
    process.env.HOME,
    'Library/Mobile Documents/iCloud~md~obsidian/Documents/butsko',
  );
const SITE_DIR = join(VAULT, 'Site');
const ENTRIES_DIR = 'src/content/entries';

/** Notes that are documentation for the folder itself, not content. */
const IGNORE = new Set(['about this folder.md']);

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** A line that is only Obsidian tags — not a statement. */
const isTagLine = (t) => /^#?[\w/-]+(\s+#[\w/-]+)*$/.test(t) && t.includes('#');

/**
 * First real sentence of the prose. Skips tag rows, headings that are just the
 * note title, and list bullets, since none of those are statements.
 */
function firstLine(body) {
  for (const raw of body.split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    if (isTagLine(t)) continue;
    if (/^[-*+]\s/.test(t)) continue;
    if (/^>/.test(t)) continue;
    const cleaned = t.replace(/^#+\s*/, '').trim();
    if (!cleaned || isTagLine(cleaned)) continue;
    return cleaned;
  }
  return '';
}

/** Obsidian tags anywhere in the note — useful hints for domain. */
function tags(body) {
  return [...new Set((body.match(/(?:^|\s)#([\w/-]{2,})/g) ?? []).map((m) => m.trim().slice(1)))];
}

/** Existing [[wikilinks]] are the author's own connections — candidate edges. */
function wikilinks(body) {
  return [
    ...new Set(
      [...body.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map((m) => m[1].trim()),
    ),
  ];
}

async function main() {
  if (!existsSync(SITE_DIR)) {
    console.error(`No Site/ folder at ${SITE_DIR}`);
    console.error('Set VAULT_PATH if your vault lives elsewhere.');
    process.exit(1);
  }

  const notes = [];
  for (const name of await readdir(SITE_DIR)) {
    if (!name.endsWith('.md') || IGNORE.has(name.toLowerCase())) continue;
    const full = join(SITE_DIR, name);
    const [raw, st] = await Promise.all([readFile(full, 'utf8'), stat(full)]);
    const { content } = matter(raw);
    const body = content.trim();
    notes.push({
      note: name,
      rel: `Site/${name}`,
      title: basename(name, '.md'),
      modified: new Date(st.mtime).toISOString(),
      statement: firstLine(body),
      body,
      words: body.split(/\s+/).filter(Boolean).length,
      tags: tags(body),
      wikilinks: wikilinks(body),
      /** Nothing to publish yet: no prose beyond tags. */
      empty: firstLine(body) === '',
    });
  }

  const published = [];
  if (existsSync(ENTRIES_DIR)) {
    for (const name of await readdir(ENTRIES_DIR)) {
      if (!name.endsWith('.md')) continue;
      const { data } = matter(await readFile(join(ENTRIES_DIR, name), 'utf8'));
      published.push({ id: basename(name, '.md'), file: name, ...data });
    }
  }

  const bySource = new Map(published.filter((p) => p.source).map((p) => [p.source, p]));

  const isNew = [];
  const drifted = [];
  const current = [];

  const empty = [];

  for (const n of notes) {
    const entry = bySource.get(n.rel);
    if (!entry) {
      if (n.empty) empty.push(n);
      else isNew.push({ ...n, suggestedId: slug(n.title) });
      continue;
    }
    const stamped = entry.sourceModified ? new Date(entry.sourceModified).getTime() : 0;
    // One minute of slack: iCloud rewrites mtimes on sync without content changing.
    if (new Date(n.modified).getTime() > stamped + 60_000) {
      drifted.push({ ...n, id: entry.id, publishedAt: entry.sourceModified ?? null });
    } else {
      current.push({ ...n, id: entry.id });
    }
  }

  // A published entry whose vault note was renamed or deleted.
  const noteRels = new Set(notes.map((n) => n.rel));
  const orphaned = published
    .filter((p) => p.source && !noteRels.has(p.source))
    .map((p) => ({ id: p.id, missingSource: p.source }));

  const unlinked = published.filter((p) => !p.source).map((p) => ({ id: p.id }));

  const result = { vault: SITE_DIR, isNew, drifted, current, orphaned, unlinked, empty };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const line = (label, arr, fmt) => {
    console.log(`\n${label} (${arr.length})`);
    if (!arr.length) console.log('  —');
    for (const a of arr) console.log('  ' + fmt(a));
  };

  console.log(`Vault: ${SITE_DIR}`);
  line('NEW — in Site/, not published', isNew, (n) => {
    const extra = [
      n.tags.length ? `tags: ${n.tags.join(' ')}` : '',
      n.wikilinks.length ? `links: ${n.wikilinks.join(', ')}` : '',
    ].filter(Boolean).join('  ·  ');
    return `${n.note}  ·  ${n.words}w\n      "${n.statement}"${extra ? '\n      ' + extra : ''}`;
  });
  line('DRIFTED — vault note edited since publish', drifted, (n) => `${n.note}  ·  entry: ${n.id}`);
  line('CURRENT — published and unchanged', current, (n) => `${n.note}  ·  entry: ${n.id}`);
  line('ORPHANED — published, vault note gone', orphaned, (o) => `${o.id}  ·  was ${o.missingSource}`);
  line('UNLINKED — published with no source note', unlinked, (u) => u.id);
  line('EMPTY — no prose yet, nothing to publish', empty, (n) => n.note);
  console.log();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
