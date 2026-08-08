import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import matter from 'gray-matter';

/**
 * Turns Obsidian `[[wikilinks]]` in entry prose into real links.
 *
 * The vault is the authoring surface, so links get written there against note
 * titles, not slugs. A link resolves if it names a published entry by id, title,
 * statement, or source note title — the same four keys the graph's edge resolver
 * accepts. Anything unresolved renders as plain text: a link to a note that was
 * never published would be a dead end, and the prose still reads without it.
 */
const ENTRIES_DIR = 'src/content/entries';

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’"“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Rebuilt whenever the entries directory changes, so dev picks up new notes. */
let cache = { key: null, map: new Map() };

function lookup() {
  const key = statSync(ENTRIES_DIR).mtimeMs;
  if (cache.key === key) return cache.map;

  const map = new Map();
  const claim = (raw, id) => {
    const k = slug(raw ?? '');
    if (k && !map.has(k)) map.set(k, id);
  };

  for (const file of readdirSync(ENTRIES_DIR)) {
    if (!file.endsWith('.md')) continue;
    const id = basename(file, '.md');
    const { data } = matter(readFileSync(join(ENTRIES_DIR, file), 'utf8'));
    claim(id, id);
    claim(data.title, id);
    claim(data.statement, id);
    if (data.source) claim(basename(data.source).replace(/\.md$/i, ''), id);
  }

  cache = { key, map };
  return map;
}

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;

export default function remarkWikilinks() {
  return (tree) => {
    const map = lookup();

    const walk = (node) => {
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        // Links are already links; code keeps its brackets verbatim.
        if (child.type === 'link' || child.type === 'inlineCode' || child.type === 'code') {
          out.push(child);
          continue;
        }
        if (child.type !== 'text') {
          walk(child);
          out.push(child);
          continue;
        }

        WIKILINK.lastIndex = 0;
        if (!WIKILINK.test(child.value)) {
          out.push(child);
          continue;
        }

        WIKILINK.lastIndex = 0;
        let last = 0;
        let m;
        while ((m = WIKILINK.exec(child.value)) !== null) {
          if (m.index > last) out.push({ type: 'text', value: child.value.slice(last, m.index) });
          const target = m[1].trim();
          const label = (m[2] ?? target).trim();
          const id = map.get(slug(target));
          out.push(
            id
              ? { type: 'link', url: `/e/${id}/`, children: [{ type: 'text', value: label }] }
              : { type: 'text', value: label },
          );
          last = m.index + m[0].length;
        }
        if (last < child.value.length) out.push({ type: 'text', value: child.value.slice(last) });
      }
      node.children = out;
    };

    walk(tree);
  };
}
