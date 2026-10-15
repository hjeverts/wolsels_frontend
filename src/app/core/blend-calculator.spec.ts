import { calculateBlend } from './blend-calculator';

describe('calculateBlend', () => {
  it('verdeelt een totaalgewicht volgens de verhouding', () => {
    const result = calculateBlend({ ratios: [60, 40], basis: 'TotalWeight', totalWeightGrams: 250 }, 4);
    expect(result).toEqual({ ok: true, weights: [150, 100], percentages: [60, 40], total: 250 });
  });

  it('behandelt delen en procenten gelijk', () => {
    const parts = calculateBlend({ ratios: [3, 2], basis: 'TotalWeight', totalWeightGrams: 250 }, 4);
    const percent = calculateBlend({ ratios: [60, 40], basis: 'TotalWeight', totalWeightGrams: 250 }, 4);
    expect(parts).toEqual(percent);
  });

  it('zorgt dat afgeronde gewichten optellen tot het totaal', () => {
    const result = calculateBlend({ ratios: [1, 1, 1], basis: 'TotalWeight', totalWeightGrams: 100 }, 4);
    expect(result.ok && result.weights).toEqual([33.4, 33.3, 33.3]);
  });

  it('schaalt vanuit het gewicht van één component', () => {
    const result = calculateBlend(
      { ratios: [50, 30, 20], basis: 'ComponentWeight', basisComponentIndex: 1, basisComponentWeightGrams: 120 },
      4,
    );
    expect(result).toEqual({ ok: true, weights: [200, 120, 80], percentages: [50, 30, 20], total: 400 });
  });

  it('houdt het bekende gewicht exact', () => {
    const result = calculateBlend(
      { ratios: [1, 3], basis: 'ComponentWeight', basisComponentIndex: 1, basisComponentWeightGrams: 100 },
      4,
    );
    expect(result.ok && result.weights).toEqual([33.3, 100]);
    expect(result.ok && result.total).toBe(133.3);
  });

  it('weigert te veel componenten', () => {
    const result = calculateBlend({ ratios: [1, 1, 1], basis: 'TotalWeight', totalWeightGrams: 100 }, 2);
    expect(result.ok).toBe(false);
  });

  it('weigert een verhouding van 0', () => {
    const result = calculateBlend({ ratios: [1, 0], basis: 'TotalWeight', totalWeightGrams: 100 }, 4);
    expect(result).toEqual({ ok: false, error: 'Elke verhouding moet groter dan 0 zijn.' });
  });

  it('vraagt om een totaalgewicht', () => {
    const result = calculateBlend({ ratios: [1, 1], basis: 'TotalWeight', totalWeightGrams: null }, 4);
    expect(result.ok).toBe(false);
  });
});
