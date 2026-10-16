import { Component, Signal, computed, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/i18n';
import { guessColorHex } from './color-names';
import { ColorSwatch } from './color-swatch';

/**
 * Lets a colour code follow the colour name ("Donkerbruin" → brown dot), until the user picks a colour
 * themselves. Create in an injection context (field initialiser or constructor).
 *
 * Only a manually chosen colour is saved ({@link saveValue}); "follows the name" is saved as
 * no colour code. That way a manually chosen colour always stays, even if it happens to equal the guess,
 * and old data automatically benefits from better colour names.
 */
export class AutoColor {
  /** Follows the colour name; false as soon as the user picks a colour. */
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
   * After loading saved data (after form.reset): a saved colour code was chosen manually and stays;
   * without a colour code the dot follows the name.
   */
  loaded(): void {
    this.auto.set(!this.hexControl.value);
    if (this.auto()) this.hexControl.setValue(guessColorHex(this.name.value));
  }

  /** The colour code to save: null if the dot follows the name. */
  saveValue(): string | null {
    return this.auto() ? null : this.hexControl.value;
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

/** The dot with an (invisible) colour picker on top; use as matSuffix in a colour field. */
@Component({
  selector: 'app-color-pick',
  imports: [ColorSwatch, TranslatePipe],
  template: `
    <app-color-swatch [color]="color().hex()" />
    <input type="color" [attr.aria-label]="'color.pick' | t" [value]="color().hex() || '#ffffff'" (input)="color().pick($any($event.target).value)" />
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

/** Hint below a colour field: follows the name, not recognised, or chosen manually (with the way back). */
@Component({
  selector: 'app-color-hint',
  imports: [TranslatePipe],
  template: `
    @switch (color().state()) {
      @case ('manual') {
        {{ 'color.manual' | t }} ·
        <button type="button" (click)="color().follow()">{{ 'color.follow' | t }}</button>
      }
      @case ('unknown') {
        {{ 'color.unknown' | t }}
      }
      @default {
        {{ 'color.auto' | t }}
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
