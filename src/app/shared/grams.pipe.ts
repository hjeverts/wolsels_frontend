import { Pipe, PipeTransform } from '@angular/core';

const grams = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 });
const kilos = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });

/** Toont een gewicht in gram, of in kilogram vanaf 1000 g. */
@Pipe({ name: 'grams' })
export class GramsPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '–';
    return Math.abs(value) >= 1000 ? `${kilos.format(value / 1000)} kg` : `${grams.format(value)} g`;
  }
}
