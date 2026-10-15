import { Component, input } from '@angular/core';

@Component({
  selector: 'app-color-swatch',
  template: '',
  styles: `
    :host {
      display: inline-block;
      width: 1.1em;
      height: 1.1em;
      border-radius: 50%;
      vertical-align: middle;
      border: 1px solid var(--mat-sys-outline-variant);
      flex-shrink: 0;
    }
  `,
  host: {
    '[style.background]': "color() || 'repeating-linear-gradient(45deg, transparent 0 3px, var(--mat-sys-outline-variant) 3px 4px)'",
    '[attr.title]': 'label()',
  },
})
export class ColorSwatch {
  readonly color = input<string | null>();
  readonly label = input<string | null>();
}
