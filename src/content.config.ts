import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { DOMAINS, RELATIONS, TYPES, WEIGHT_MAX, WEIGHT_MIN } from './lib/vocab';

/**
 * Entries are publish snapshots written by the graph-sync skill, never hand-authored
 * and never read live from the vault. `source`/`sourceModified` point back at the
 * vault note so drift is detectable and re-publishing stays a deliberate act.
 */
const edge = z.object({
  target: z.string().min(1),
  relation: z.enum(RELATIONS),
  /** Why this edge exists. Shown on hover. Most valuable on `tension`. */
  note: z.string().optional(),
});

const entries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/entries' }),
  schema: z.object({
    /** The vault note's title, verbatim. What the node is labelled with. */
    title: z.string().min(1),
    /**
     * The statement — first line of the prose. Subheading, not the headline.
     * Optional: some notes open straight into the body with no line that stands
     * on its own, and a bad statement is worse than none.
     */
    statement: z.string().min(1).optional(),
    /**
     * Subject glyph — a name from src/lib/icon-names.json. Encodes what the entry
     * is *about*, orthogonal to `type`, which the container shape encodes.
     * Validated against the generated icon set when the graph is built.
     */
    icon: z.string().optional(),
    domain: z.enum(DOMAINS),
    type: z.enum(TYPES),
    weight: z.number().min(WEIGHT_MIN).max(WEIGHT_MAX),
    /** When this became true / was first written. Drives decay with `reaffirmed`. */
    date: z.coerce.date(),
    /**
     * Last deliberate reaffirmation. Editing the note or linking a new entry to it
     * both count; the sync skill and the graph builder each push this forward.
     */
    reaffirmed: z.coerce.date().optional(),
    edges: z.array(edge).default([]),
    /** Conditions that stopped being true are archived, not faded. */
    retired: z.boolean().default(false),
    /** Relative path inside the vault. Provenance, not a public link. */
    source: z.string().optional(),
    sourceModified: z.coerce.date().optional(),
  }),
});

export const collections = { entries };
