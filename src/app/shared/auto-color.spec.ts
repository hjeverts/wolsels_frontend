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
  it('follows the colour name', () => {
    const { nameControl, hexControl, color } = setup();
    nameControl.setValue('Donkerbruin');
    expect(hexControl.value).toBe(guessColorHex('Donkerbruin'));
    expect(color.state()).toBe('auto');
    nameControl.setValue('Regenboog');
    expect(hexControl.value).toBeNull();
    expect(color.state()).toBe('unknown');
  });

  it('keeps a manually chosen colour until the name is followed again', () => {
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

  it('shows a dot after loading when no colour code is saved', () => {
    const { nameControl, hexControl, color } = setup();
    // Like form.reset: first the name, then the (empty) colour code.
    nameControl.setValue('Naturel');
    hexControl.setValue(null);
    color.loaded();
    expect(hexControl.value).toBe(guessColorHex('Naturel'));
    expect(color.auto()).toBe(true);
  });

  it('keeps a saved colour code after loading, even if it equals the guess', () => {
    const own = setup('Blauw', '#abcdef');
    own.color.loaded();
    expect(own.color.auto()).toBe(false);
    own.nameControl.setValue('Geel');
    expect(own.hexControl.value).toBe('#abcdef');

    // E.g. "Wit" with a manually chosen #ffffff: if the name becomes "Crème", it stays white.
    const sameAsGuess = setup('Wit', guessColorHex('Wit'));
    sameAsGuess.color.loaded();
    expect(sameAsGuess.color.auto()).toBe(false);
    sameAsGuess.nameControl.setValue('Crème');
    expect(sameAsGuess.hexControl.value).toBe(guessColorHex('Wit'));
  });

  it('only saves a manually chosen colour', () => {
    const { nameControl, color } = setup();
    nameControl.setValue('Rood');
    expect(color.saveValue()).toBeNull();
    color.pick(guessColorHex('Rood')!);
    expect(color.saveValue()).toBe(guessColorHex('Rood'));
    color.follow();
    expect(color.saveValue()).toBeNull();
  });
});
