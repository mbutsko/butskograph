import { DECAY_FLOOR, HALF_LIFE_YEARS, WEIGHT_MAX, type EntryType } from './vocab';

const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

/**
 * Exponential half-life decay on weight.
 *
 *   factor = max(FLOOR, 2 ^ -(years / halfLife))
 *
 * Half-life is the readable knob: a belief left untouched for 8 years shows at
 * half the weight it was given. Values take 25 years to halve, opinions 2.
 * Memory and condition do not decay at all.
 */
export function decayFactor(type: EntryType, asOf: Date, reaffirmed: Date): number {
  const halfLife = HALF_LIFE_YEARS[type];
  if (halfLife === null) return 1;

  const years = (asOf.getTime() - reaffirmed.getTime()) / MS_PER_YEAR;
  if (!Number.isFinite(years) || years <= 0) return 1;

  return Math.max(DECAY_FLOOR, Math.pow(2, -years / halfLife));
}

/** Weight as the graph should render it, after drift. */
export function effectiveWeight(
  weight: number,
  type: EntryType,
  asOf: Date,
  reaffirmed: Date,
): number {
  return weight * decayFactor(type, asOf, reaffirmed);
}

/**
 * Node radius. Area scales with weight rather than radius, so a 10 reads as
 * roughly ten times a 1 instead of a hundred times. The floor is set high enough
 * that a subject glyph stays legible inside the smallest node.
 */
export function nodeRadius(effWeight: number): number {
  return 7 + 14 * Math.sqrt(Math.max(0, effWeight) / WEIGHT_MAX);
}

/**
 * Distance from center. Heavier pulls inward — this is the importance bias, and
 * it is the whole thesis of the site expressed as one number.
 */
export function targetRadius(effWeight: number, maxRadius: number): number {
  const t = 1 - Math.min(1, Math.max(0, effWeight / WEIGHT_MAX));
  return 26 + (maxRadius - 26) * Math.pow(t, 0.85);
}

/**
 * Decay shown as fading, so a stale opinion looks stale rather than merely
 * sitting further out. Never fully transparent.
 */
export function freshnessOpacity(factor: number): number {
  return 0.4 + 0.6 * factor;
}
