// Upload vanity patterns, mirroring notsobot.api `utilities/generators/vanity.py`.
//
// A vanity is the random part of a file host link (nsb.gg/<vanity>). The pattern is `/`-separated parts, each
// a fixed length (`5`) or a range (`3-8`, parentheses optional) of random lowercase letters and digits.
// `5/5` (the default) gives links like nsb.gg/k3x9q/7mzp2. Temporary uploads get `tmp/` in front.

export const DEFAULT_VANITY = '5/5';
export const VANITY_HOST = 'nsb.gg';

const MIN_TOTAL_LENGTH = 3;
const MAX_TOTAL_LENGTH = 128;
// what the API uses for a part it can't read
const FALLBACK_PART: [number, number] = [3, 16];
const PART_PATTERN = /^\(?(\d+)(?:-(\d+))?\)?$/;
const CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789';


export interface VanityPart {
  min: number,
  max: number,
  // false when the API would fall back to 3–16 for this part
  valid: boolean,
}


export function parseVanity(pattern: string): Array<VanityPart> {
  // the API strips the whole value but not each part, so `5 / 5` falls back to 3–16 per part
  return pattern.trim().split('/').map((part) => {
    const match = part.match(PART_PATTERN);
    if (!match) {
      return {min: FALLBACK_PART[0], max: FALLBACK_PART[1], valid: false};
    }
    const a = Number(match[1]);
    const b = (match[2] === undefined) ? a : Number(match[2]);
    return {min: Math.min(a, b), max: Math.max(a, b), valid: true};
  });
}


// null when the pattern is fine, otherwise what's wrong with it (same rule as the API's `check_vanity`)
export function vanityError(pattern: string): string | null {
  if (!pattern) {
    return null;
  }
  const parts = parseVanity(pattern);
  const invalid = parts.findIndex((part) => !part.valid);
  if (invalid !== -1) {
    return `Part ${invalid + 1} isn’t a number or range. Use something like 5 or 3-8.`;
  }
  // the API counts one slash fewer than there are (`max(count('/') - 1, 0)`), so `1/1` counts as 2 characters (too short) rather than 3
  const slashes = Math.max(parts.length - 2, 0);
  const min = slashes + parts.reduce((sum, part) => sum + part.min, 0);
  const max = slashes + parts.reduce((sum, part) => sum + part.max, 0);
  if (min < MIN_TOTAL_LENGTH || MAX_TOTAL_LENGTH < max) {
    return `Links must be between ${MIN_TOTAL_LENGTH} and ${MAX_TOTAL_LENGTH} characters long (this one is ${(min === max) ? min : `${min}–${max}`}).`;
  }
  return null;
}


// "two parts: 5 characters, then 3–8 characters"
export function describeVanity(pattern: string): string {
  const parts = parseVanity(pattern || DEFAULT_VANITY);
  const lengths = parts.map((part) => (part.min === part.max) ? `${part.min}` : `${part.min}–${part.max}`);
  const label = (parts.length === 1) ? 'one part' : `${parts.length} parts`;
  return `${label}: ${lengths.map((length) => `${length} characters`).join(', then ')}`;
}


// A stable example link (seeded from the pattern, so it doesn't flicker on every render).
export function exampleVanityLink(pattern: string): string {
  let seed = 0;
  for (const character of pattern || DEFAULT_VANITY) {
    seed = (seed * 31 + character.charCodeAt(0)) >>> 0;
  }
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  const vanity = parseVanity(pattern || DEFAULT_VANITY).map((part) => {
    const length = part.min + (next() % (part.max - part.min + 1));
    return Array.from({length}, () => CHARACTERS[next() % CHARACTERS.length]).join('');
  }).join('/');
  return `${VANITY_HOST}/${vanity}`;
}
