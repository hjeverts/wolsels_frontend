import { t } from './i18n/i18n';

/** Yarn weights with an indication of wraps per inch (WPI). */
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

/** Suggestions while typing (free text), in the app language. */
export const plyMethods = () => [
  t('yarn.singles'),
  t('yarn.twoPly'),
  t('yarn.threePly'),
  t('yarn.chainPly'),
  'Cabled',
  'Bouclé',
  'Art yarn',
];

export const dyeProducts = () => [t('yarn.acidDye'), t('yarn.madder'), t('yarn.weld'), 'Indigo', t('yarn.foodColoring')];

export const harvestMethods = () => [t('harvest.methodPlucking'), t('harvest.methodShearing'), t('harvest.methodCombing')];

export const harvestGrades = () => [t('harvest.gradeFirst'), t('harvest.gradeSecond'), t('harvest.gradeThird'), t('harvest.gradeFelt')];
