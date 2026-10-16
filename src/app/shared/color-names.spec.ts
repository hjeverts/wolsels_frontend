import { guessColorHex } from './color-names';

describe('guessColorHex', () => {
  it('recognises common wool colours', () => {
    expect(guessColorHex('Naturel')).toBe('#efe6d2');
    expect(guessColorHex('Wit')).toBe('#ffffff');
    expect(guessColorHex('ZWART')).toBe('#1f1f1f');
    expect(guessColorHex('Crème')).toBe('#f3e9d2');
    expect(guessColorHex('Moorit')).toBe('#6f4a32');
  });

  it('picks the longest name and the head of a compound', () => {
    expect(guessColorHex('Marineblauw')).toBe('#1f2f5a');
    expect(guessColorHex('Gebroken wit')).toBe('#f4f1e8');
    expect(guessColorHex('Grijsbruin')).toBe(guessColorHex('Bruin'));
    expect(guessColorHex('Mosgroen')).toBe(guessColorHex('Groen'));
    expect(guessColorHex('Mosterd')).toBe('#c9a227');
    expect(guessColorHex('Oudroze')).toBe('#c98b8f');
  });

  it('takes the first of several colours and ignores other words', () => {
    expect(guessColorHex('Bruin gemêleerd')).toBe(guessColorHex('Bruin'));
    expect(guessColorHex('Zwart/wit')).toBe(guessColorHex('Zwart'));
    expect(guessColorHex('gemêleerd rode tinten')).toBe(guessColorHex('Rood'));
  });

  it('makes the colour lighter or darker', () => {
    const grijs = guessColorHex('Grijs')!;
    const licht = guessColorHex('Lichtgrijs')!;
    const donker = guessColorHex('donker grijs')!;
    expect(licht).toBe(guessColorHex('Licht grijs'));
    expect(parseInt(licht.slice(1, 3), 16)).toBeGreaterThan(parseInt(grijs.slice(1, 3), 16));
    expect(parseInt(donker.slice(1, 3), 16)).toBeLessThan(parseInt(grijs.slice(1, 3), 16));
    expect(guessColorHex('Pastel blauw')).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns null for unknown or empty names', () => {
    expect(guessColorHex('Regenboog')).toBeNull();
    expect(guessColorHex('')).toBeNull();
    expect(guessColorHex(null)).toBeNull();
  });
});
