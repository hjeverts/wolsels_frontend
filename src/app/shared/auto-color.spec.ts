import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { AutoColor } from './auto-color';
import { guessColorHex } from './color-names';

function setup(name = '', hex: string | null = null) {
  const nameControl = new FormControl(name, { nonNullable: true });
  const hexControl = new FormControl<string | null>(hex);
  const color = TestBed.runInInjectionContext(() => new AutoColor(nameControl, hexControl));
  return { nameControl, hexControl, color };
}

describe('AutoColor', () => {
  it('volgt de kleurnaam', () => {
    const { nameControl, hexControl, color } = setup();
    nameControl.setValue('Donkerbruin');
    expect(hexControl.value).toBe(guessColorHex('Donkerbruin'));
    expect(color.state()).toBe('auto');
    nameControl.setValue('Regenboog');
    expect(hexControl.value).toBeNull();
    expect(color.state()).toBe('unknown');
  });

  it('houdt een zelf gekozen kleur, tot je de naam weer laat volgen', () => {
    const { nameControl, hexControl, color } = setup();
    nameControl.setValue('Rood');
    color.pick('#123456');
    nameControl.setValue('Groen');
    expect(hexControl.value).toBe('#123456');
    expect(color.state()).toBe('manual');
    color.follow();
    expect(hexControl.value).toBe(guessColorHex('Groen'));
    expect(color.state()).toBe('auto');
  });

  it('geeft na het laden een bolletje als er geen kleurcode is opgeslagen', () => {
    const { nameControl, hexControl, color } = setup();
    // Zoals form.reset: eerst de naam, daarna de (lege) kleurcode.
    nameControl.setValue('Naturel');
    hexControl.setValue(null);
    color.loaded();
    expect(hexControl.value).toBe(guessColorHex('Naturel'));
    expect(color.auto()).toBe(true);
  });

  it('houdt na het laden een opgeslagen kleurcode, ook als die gelijk is aan de gok', () => {
    const own = setup('Blauw', '#abcdef');
    own.color.loaded();
    expect(own.color.auto()).toBe(false);
    own.nameControl.setValue('Geel');
    expect(own.hexControl.value).toBe('#abcdef');

    // Bv. "Wit" met zelf gekozen #ffffff: wordt de naam "Crème", dan blijft het wit.
    const sameAsGuess = setup('Wit', guessColorHex('Wit'));
    sameAsGuess.color.loaded();
    expect(sameAsGuess.color.auto()).toBe(false);
    sameAsGuess.nameControl.setValue('Crème');
    expect(sameAsGuess.hexControl.value).toBe(guessColorHex('Wit'));
  });

  it('slaat alleen een zelf gekozen kleur op', () => {
    const { nameControl, color } = setup();
    nameControl.setValue('Rood');
    expect(color.saveValue()).toBeNull();
    color.pick(guessColorHex('Rood')!);
    expect(color.saveValue()).toBe(guessColorHex('Rood'));
    color.follow();
    expect(color.saveValue()).toBeNull();
  });
});
