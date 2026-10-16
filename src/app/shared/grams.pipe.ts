import { Pipe, PipeTransform } from '@angular/core';
import { currentLocale } from '../core/i18n/i18n';

/** Shows a weight in grams, or in kilograms from 1000 g. */
@Pipe({ name: 'grams' })
export class GramsPipe implements PipeTransform {
  private readonly grams = new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 1 });
  private readonly kilos = new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 2 });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '–';
    return Math.abs(value) >= 1000 ? `${this.kilos.format(value / 1000)} kg` : `${this.grams.format(value)} g`;
  }
}
