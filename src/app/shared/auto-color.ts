import { Component, Signal, computed, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { guessColorHex } from './color-names';
import { ColorSwatch } from './color-swatch';

/**
 * Laat een kleurcode de kleurnaam volgen ("Donkerbruin" → bruin bolletje), tot de gebruiker zelf een kleur
 * kiest. Aanmaken in een injection context (veldinitialisatie of constructor).
 */
export class AutoColor {
  /** Volgt de kleurnaam; false zodra de gebruiker zelf een kleur kiest. */
  readonly auto = signal(true);
  readonly hex: Signal<string | null>;
  readonly state: Signal<'manual' | 'unknown' | 'auto'>;

  constructor(
    private readonly name: FormControl<string>,
    private readonly hexControl: FormControl<string | null>,
  ) {
    const nameValue = toSignal(name.valueChanges, { initialValue: name.value });
    this.hex = toSignal(hexControl.valueChanges, { initialValue: hexControl.value });
    this.state = computed(() => {
      if (!this.auto()) return 'manual';
      return nameValue().trim() && !guessColorHex(nameValue()) ? 'unknown' : 'auto';
    });
    name.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => this.auto() && hexControl.setValue(guessColorHex(value)));
  }

  /**
   * Na het laden van opgeslagen gegevens (na form.reset): een eigen kleurcode blijft staan; zonder kleurcode,
   * of als die gelijk is aan de gok, volgt het bolletje weer de naam.
   */
  loaded(): void {
    const hex = this.hexControl.value;
    this.auto.set(!hex || hex === guessColorHex(this.name.value));
    if (this.auto()) this.hexControl.setValue(guessColorHex(this.name.value));
  }

  pick(hex: string): void {
    this.auto.set(false);
    this.hexControl.setValue(hex);
  }

  follow(): void {
    this.auto.set(true);
    this.hexControl.setValue(guessColorHex(this.name.value));
  }
}

/** Het bolletje met een (onzichtbare) kleurkiezer erover; gebruik als matSuffix in een kleurveld. */
@Component({
  selector: 'app-color-pick',
  imports: [ColorSwatch],
  template: `
    <app-color-swatch [color]="color().hex()" />
    <input type="color" aria-label="Kleurcode kiezen" [value]="color().hex() || '#ffffff'" (input)="color().pick($any($event.target).value)" />
  `,
  styles: `
    :host {
      position: relative;
      display: inline-flex;
      padding: 0 12px;
    }
    input[type='color'] {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
  `,
})
export class ColorPick {
  readonly color = input.required<AutoColor>();
}

/** Uitleg onder een kleurveld: volgt de naam, niet herkend, of zelf gekozen (met de weg terug). */
@Component({
  selector: 'app-color-hint',
  template: `
    @switch (color().state()) {
      @case ('manual') {
        Zelf gekozen kleur ·
        <button type="button" (click)="color().follow()">volg de kleurnaam</button>
      }
      @case ('unknown') {
        Niet herkend; kies via het bolletje
      }
      @default {
        Bolletje volgt de kleurnaam
      }
    }
  `,
  styles: `
    button {
      background: none;
      border: 0;
      padding: 0;
      font: inherit;
      color: var(--mat-sys-primary);
      text-decoration: underline;
      cursor: pointer;
    }
  `,
})
export class ColorHint {
  readonly color = input.required<AutoColor>();
}
