import { calculateBlend } from './blend-calculator';

describe('calculateBlend', () => {
  it('divides a total weight according to the ratio', () => {
    const result = calculateBlend({ ratios: [60, 40], basis: 'TotalWeight', totalWeightGrams: 250 }, 4);
    expect(result).toEqual({ ok: true, weights: [150, 100], percentages: [60, 40], total: 250 });
  });

  it('treats parts and percentages the same', () => {
    const parts = calculateBlend({ ratios: [3, 2], basis: 'TotalWeight', totalWeightGrams: 250 }, 4);
    const percent = calculateBlend({ ratios: [60, 40], basis: 'TotalWeight', totalWeightGrams: 250 }, 4);
    expect(parts).toEqual(percent);
  });

  it('makes rounded weights add up to the total', () => {
    const result = calculateBlend({ ratios: [1, 1, 1], basis: 'TotalWeight', totalWeightGrams: 100 }, 4);
    expect(result.ok && result.weights).toEqual([33.4, 33.3, 33.3]);
  });

  it('scales from the weight of one component', () => {
    const result = calculateBlend(
      { ratios: [50, 30, 20], basis: 'ComponentWeight', basisComponentIndex: 1, basisComponentWeightGrams: 120 },
      4,
    );
    expect(result).toEqual({ ok: true, weights: [200, 120, 80], percentages: [50, 30, 20], total: 400 });
  });

  it('keeps the known weight exact', () => {
    const result = calculateBlend(
      { ratios: [1, 3], basis: 'ComponentWeight', basisComponentIndex: 1, basisComponentWeightGrams: 100 },
      4,
    );
    expect(result.ok && result.weights).toEqual([33.3, 100]);
    expect(result.ok && result.total).toBe(133.3);
  });

  it('rejects too many components', () => {
    const result = calculateBlend({ ratios: [1, 1, 1], basis: 'TotalWeight', totalWeightGrams: 100 }, 2);
    expect(result.ok).toBe(false);
  });

  it('rejects a ratio of 0', () => {
    const result = calculateBlend({ ratios: [1, 0], basis: 'TotalWeight', totalWeightGrams: 100 }, 4);
    expect(result).toEqual({ ok: false, error: 'Elke verhouding moet groter dan 0 zijn.' });
  });

  it('asks for a total weight', () => {
    const result = calculateBlend({ ratios: [1, 1], basis: 'TotalWeight', totalWeightGrams: null }, 4);
    expect(result.ok).toBe(false);
  });
});
