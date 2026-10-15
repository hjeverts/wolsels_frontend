/** Garendiktes met een indicatie van wraps per inch (WPI). */
export const YARN_WEIGHTS: { name: string; minWpi: number; maxWpi: number }[] = [
  { name: 'Lace', minWpi: 30, maxWpi: 99 },
  { name: 'Light fingering', minWpi: 19, maxWpi: 29 },
  { name: 'Fingering', minWpi: 14, maxWpi: 18 },
  { name: 'Sport', minWpi: 12, maxWpi: 13 },
  { name: 'DK', minWpi: 11, maxWpi: 11 },
  { name: 'Worsted', minWpi: 9, maxWpi: 10 },
  { name: 'Aran', minWpi: 8, maxWpi: 8 },
  { name: 'Bulky', minWpi: 7, maxWpi: 7 },
  { name: 'Super bulky', minWpi: 1, maxWpi: 6 },
];

export function yarnWeightForWpi(wpi: number | null | undefined): string | null {
  if (!wpi) return null;
  return YARN_WEIGHTS.find((y) => wpi >= y.minWpi && wpi <= y.maxWpi)?.name ?? null;
}

export const PLY_METHODS = [
  'Enkeldraads',
  '2-draads',
  '3-draads',
  'Kettinggetwijnd (Navajo)',
  'Cabled',
  'Bouclé',
  'Art yarn',
];

export const DYE_PRODUCTS = ['Zuurverf', 'Plantaardig: meekrap', 'Plantaardig: wouw', 'Indigo', 'Kool-Aid / voedingskleurstof'];

export const HARVEST_METHODS = ['Plukken', 'Scheren', 'Kammen'];

export const HARVEST_GRADES = ['1e keus', '2e keus', '3e keus', 'Vilt'];
