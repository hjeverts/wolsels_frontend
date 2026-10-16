import { fitWithin } from './image-resize';

describe('fitWithin', () => {
  it('verkleint met behoud van verhouding tot de langste zijde past', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(5000, 1, 400)).toEqual({ width: 400, height: 1 });
  });

  it('vergroot nooit', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
