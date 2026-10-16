/**
 * Guesses a colour code for a colour name such as "Naturel", "Donkerbruin" or "licht grijs gemêleerd", so that
 * the colour dot is right automatically. Recognises Dutch (and some English) colour names, also in compounds,
 * with light/dark (licht/donker) in front.
 */

const COLORS: Record<string, string> = {
  // Natural and wool colours
  naturel: '#efe6d2',
  natuur: '#efe6d2',
  natural: '#efe6d2',
  ecru: '#efe6d2',
  'gebroken wit': '#f4f1e8',
  wit: '#ffffff',
  white: '#ffffff',
  creme: '#f3e9d2',
  cream: '#f3e9d2',
  ivoor: '#fffbeb',
  beige: '#d9c7a7',
  zand: '#d8c39a',
  camel: '#c19a6b',
  fawn: '#c8a37e',
  taupe: '#8b7d6b',
  moorit: '#6f4a32',
  bruin: '#7b5236',
  brown: '#7b5236',
  chocolade: '#4e3426',
  choco: '#4e3426',
  kastanje: '#6b3a2a',
  cognac: '#9a4f1f',
  grijs: '#9a9a9a',
  grijze: '#9a9a9a',
  grey: '#9a9a9a',
  gray: '#9a9a9a',
  zilver: '#c0c0c0',
  antraciet: '#3d3f42',
  zwart: '#1f1f1f',
  black: '#1f1f1f',
  // Colours
  rood: '#c0392b',
  rode: '#c0392b',
  red: '#c0392b',
  bordeaux: '#6d1a2a',
  wijnrood: '#722f37',
  roest: '#a0522d',
  terracotta: '#c4683f',
  oranje: '#e67e22',
  orange: '#e67e22',
  perzik: '#f4b183',
  abrikoos: '#f5a962',
  zalm: '#f09a7e',
  koraal: '#ff7f50',
  geel: '#f1c40f',
  gele: '#f1c40f',
  yellow: '#f1c40f',
  mosterd: '#c9a227',
  oker: '#c8962e',
  goud: '#c9a74d',
  groen: '#3f8f4f',
  green: '#3f8f4f',
  olijf: '#708238',
  mos: '#6b7a3a',
  mint: '#98d7b5',
  salie: '#9caf88',
  flessengroen: '#1f4d3a',
  smaragd: '#2e8b57',
  turquoise: '#2bb3a8',
  turkoois: '#2bb3a8',
  petrol: '#1f5f6b',
  teal: '#1f7a7a',
  blauw: '#2f6db5',
  blue: '#2f6db5',
  marineblauw: '#1f2f5a',
  marine: '#1f2f5a',
  navy: '#1f2f5a',
  denim: '#4a6a8a',
  jeans: '#4a6a8a',
  ijsblauw: '#cfe6f2',
  kobalt: '#0047ab',
  paars: '#7d4ea0',
  purple: '#7d4ea0',
  lila: '#c3a6d8',
  lavendel: '#b8a6d9',
  violet: '#8a4fbf',
  aubergine: '#4b2a3d',
  pruim: '#6e3b5a',
  roze: '#f2a7c0',
  pink: '#f2a7c0',
  oudroze: '#c98b8f',
  fuchsia: '#d6337f',
  magenta: '#c2185b',
};

const LIGHTER = ['licht', 'lichte', 'pastel', 'zacht', 'zachte', 'light', 'pale'];
const DARKER = ['donker', 'donkere', 'diep', 'diepe', 'dark', 'deep'];

/** Longest names first, so that "marineblauw" is found before "blauw" and "gebroken wit" before "wit". */
const NAMES = Object.keys(COLORS).sort((a, b) => b.length - a.length);

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/**
 * Colour code (#rrggbb) for a colour name, or null if the name is not recognised. The first word with a
 * colour counts ("Bruin gemêleerd", "Zwart/wit"); within a compound the last part ("grijsbruin" is brown).
 */
export function guessColorHex(name: string | null | undefined): string | null {
  const words = normalize(name ?? '').split(' ').filter(Boolean);
  for (let w = 0; w < words.length; w++) {
    // "gebroken wit": a two-word name takes precedence.
    const pair = w + 1 < words.length ? `${words[w]} ${words[w + 1]}` : '';
    if (pair in COLORS) return adjust(COLORS[pair], words[w - 1] ?? '');

    const word = words[w];
    const match = findInWord(word);
    if (match) return adjust(COLORS[match.name], `${words[w - 1] ?? ''} ${word.slice(0, match.index)}`);
  }
  return null;
}

/** The colour name that ends furthest back in the word (the head of a compound). */
function findInWord(word: string): { name: string; index: number } | null {
  let best: { name: string; index: number; end: number } | null = null;
  for (const name of NAMES) {
    if (name.includes(' ')) continue;
    const index = word.lastIndexOf(name);
    if (index < 0) continue;
    const end = index + name.length;
    if (!best || end > best.end || (end === best.end && name.length > best.name.length)) best = { name, index, end };
  }
  return best;
}

/** Lighter or darker if "licht"/"donker" (separate or as a prefix) precedes the colour. */
function adjust(hex: string, before: string): string {
  const prefix = before.trim();
  if (LIGHTER.some((m) => prefix === m || prefix.endsWith(m) || prefix.split(' ').includes(m))) return mix(hex, '#ffffff', 0.45);
  if (DARKER.some((m) => prefix === m || prefix.endsWith(m) || prefix.split(' ').includes(m))) return mix(hex, '#000000', 0.4);
  return hex;
}

function mix(hex: string, with_: string, amount: number): string {
  const a = parse(hex);
  const b = parse(with_);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, '0')).join('');
}

function parse(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/** Colour for a dot: the saved colour code, otherwise a guess based on the name. */
export function swatchColor(hex: string | null | undefined, name: string | null | undefined): string | null {
  return hex || guessColorHex(name);
}
