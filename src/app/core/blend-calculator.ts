import { t } from './i18n/i18n';

/**
 * Converts a blend ratio to weights. Identical to the backend (BlendCalculator.cs),
 * so that the weights can be updated while typing. On save the backend calculates
 * again and is therefore leading.
 */
export type CalculationInput =
  | { ratios: number[]; basis: 'TotalWeight'; totalWeightGrams: number | null }
  | {
      ratios: number[];
      basis: 'ComponentWeight';
      basisComponentIndex: number;
      basisComponentWeightGrams: number | null;
    };

export type CalculationResult =
  | { ok: true; weights: number[]; percentages: number[]; total: number }
  | { ok: false; error: string };

const TENTHS_PER_GRAM = 10;

const round1 = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10;

export function calculateBlend(input: CalculationInput, maxComponents: number): CalculationResult {
  const { ratios } = input;
  if (ratios.length === 0) return fail(t('calc.noComponents'));
  if (ratios.length > maxComponents)
    return fail(t('calc.tooManyComponents', { max: maxComponents }));
  if (ratios.some((r) => !Number.isFinite(r) || r <= 0))
    return fail(t('calc.ratioPositive'));

  const ratioSum = ratios.reduce((a, b) => a + b, 0);
  const percentages = ratios.map((r) => round1((r / ratioSum) * 100));

  if (input.basis === 'TotalWeight') {
    const total = input.totalWeightGrams;
    if (total === null || !Number.isFinite(total) || total <= 0)
      return fail(t('calc.totalPositive'));

    // Largest remainder method in tenths of a gram: the sum is always exact.
    const totalTenths = Math.round(total * TENTHS_PER_GRAM);
    const exact = ratios.map((r) => (totalTenths * r) / ratioSum);
    const tenths = exact.map(Math.floor);
    let remainder = totalTenths - tenths.reduce((a, b) => a + b, 0);
    exact
      .map((value, index) => ({ fraction: value - Math.floor(value), index }))
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
      .forEach(({ index }) => {
        if (remainder-- > 0) tenths[index]++;
      });

    return {
      ok: true,
      weights: tenths.map((t) => t / TENTHS_PER_GRAM),
      percentages,
      total: totalTenths / TENTHS_PER_GRAM,
    };
  }

  const index = input.basisComponentIndex;
  if (index < 0 || index >= ratios.length) return fail(t('calc.chooseBasis'));
  const known = input.basisComponentWeightGrams;
  if (known === null || !Number.isFinite(known) || known <= 0) return fail(t('calc.weightPositive'));

  const knownRounded = round1(known);
  const weights = ratios.map((r, i) => (i === index ? knownRounded : round1((knownRounded * r) / ratios[index])));
  return { ok: true, weights, percentages, total: round1(weights.reduce((a, b) => a + b, 0)) };
}

function fail(error: string): CalculationResult {
  return { ok: false, error };
}
