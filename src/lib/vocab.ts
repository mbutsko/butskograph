/**
 * The controlled vocabulary. Single source of truth for the site, the content
 * schema, and the graph-sync skill. Changing a domain or type here is a real
 * editorial decision — it re-slices every entry.
 */

export const DOMAINS = ['family', 'body', 'mind', 'work', 'ideas', 'play'] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABEL: Record<Domain, string> = {
  family: 'Family',
  body: 'Body',
  mind: 'Mind',
  work: 'Work',
  ideas: 'Ideas',
  play: 'Play',
};

export const DOMAIN_NOTE: Record<Domain, string> = {
  family: 'The people I am made by and responsible to.',
  body: 'Physical health, genomics, fitness, diet.',
  mind: 'Mental health, emotional patterns, self-work.',
  work: 'What I do for a living and how I do it.',
  ideas: 'Philosophy, reading, beliefs about society, economics, meaning.',
  play: 'What I do because it is worth doing.',
};

export const TYPES = ['value', 'belief', 'memory', 'opinion', 'condition'] as const;
export type EntryType = (typeof TYPES)[number];

export const TYPE_LABEL: Record<EntryType, string> = {
  value: 'Value',
  belief: 'Belief',
  memory: 'Memory',
  opinion: 'Opinion',
  condition: 'Condition',
};

export const TYPE_NOTE: Record<EntryType, string> = {
  value: 'Near-permanent — something I would defend.',
  belief: 'Settled but revisable — something I think is true.',
  memory: 'A fact. Does not decay.',
  opinion: 'Provisional — expected to move or expire.',
  condition: 'Ongoing and true about me right now. Not a chosen stance.',
};

export const RELATIONS = ['expresses', 'tension', 'echoes'] as const;
export type Relation = (typeof RELATIONS)[number];

export const RELATION_LABEL: Record<Relation, string> = {
  expresses: 'expresses',
  tension: 'in tension with',
  echoes: 'echoes',
};

export const RELATION_NOTE: Record<Relation, string> = {
  expresses: 'An idea showing up as a lived instance.',
  tension: 'Two things actively pulling against each other.',
  echoes: 'Thematically related. No hierarchy, no causality.',
};

/**
 * `expresses` runs idea -> lived instance, so direction carries meaning and is
 * preserved. `tension` and `echoes` are symmetric: declaring on either end is
 * enough, and reciprocal declarations get deduped.
 */
export const DIRECTED: Record<Relation, boolean> = {
  expresses: true,
  tension: false,
  echoes: false,
};

/**
 * Drift. Weight decays by half-life from the last reaffirmation, so the graph
 * shows what is alive in current thinking without manual re-ranking.
 *
 * `null` means no decay at all:
 *  - memory is a fact, not a claim — radius reflects how central it was, and
 *    that does not change because time passed.
 *  - condition is true until it is not. It gets retired, never faded.
 */
export const HALF_LIFE_YEARS: Record<EntryType, number | null> = {
  value: 25,
  belief: 8,
  opinion: 2,
  memory: null,
  condition: null,
};

/** Nothing fades to nothing. A stale opinion is peripheral, not deleted. */
export const DECAY_FLOOR = 0.3;

export const WEIGHT_MIN = 1;
export const WEIGHT_MAX = 10;

/**
 * Where an uncurated entry lands: mid-outer, visibly unweighted. Low enough to
 * stay out of the center it has not earned, high enough to be legible.
 */
export const DEFAULT_WEIGHT = 4;
