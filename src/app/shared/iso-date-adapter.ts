import { Injectable, inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Typed dates: year first (2026-10-18) or day first (18-10-2026, 18.10.26, 18/10/2026). */
const TYPED_DATE = /^(\d{1,4})[-/. ](\d{1,2})[-/. ](\d{1,4})$/;

/**
 * Date adapter for the Material datepicker that keeps form values as ISO date strings ('YYYY-MM-DD'), the
 * format the API uses, so forms don't have to convert Date objects. Calendar logic goes to the NativeDateAdapter.
 * An empty string is the invalid date.
 */
@Injectable()
export class IsoDateAdapter extends DateAdapter<string> {
  private readonly native = new NativeDateAdapter();

  constructor() {
    super();
    this.setLocale(inject(MAT_DATE_LOCALE, { optional: true }));
  }

  override setLocale(locale: unknown): void {
    super.setLocale(locale);
    this.native.setLocale(locale);
  }

  getYear(date: string): number {
    return this.toDate(date).getFullYear();
  }

  getMonth(date: string): number {
    return this.toDate(date).getMonth();
  }

  getDate(date: string): number {
    return this.toDate(date).getDate();
  }

  getDayOfWeek(date: string): number {
    return this.toDate(date).getDay();
  }

  getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    return this.native.getMonthNames(style);
  }

  getDateNames(): string[] {
    return this.native.getDateNames();
  }

  getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    return this.native.getDayOfWeekNames(style);
  }

  getYearName(date: string): string {
    return this.native.getYearName(this.toDate(date));
  }

  getFirstDayOfWeek(): number {
    return this.native.getFirstDayOfWeek();
  }

  getNumDaysInMonth(date: string): number {
    return this.native.getNumDaysInMonth(this.toDate(date));
  }

  clone(date: string): string {
    return date;
  }

  createDate(year: number, month: number, date: number): string {
    return this.fromDate(this.native.createDate(year, month, date));
  }

  today(): string {
    return this.fromDate(this.native.today());
  }

  parse(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const m = TYPED_DATE.exec(value.trim());
    if (!m) return this.invalid();
    const [first, month, last] = [m[1], +m[2], m[3]];
    const yearFirst = first.length > 2;
    const year = +(yearFirst ? first : last);
    const day = +(yearFirst ? last : first);
    return this.fromParts(year < 100 ? this.fullYear(year) : year, month, day);
  }

  format(date: string, displayFormat: object): string {
    return this.native.format(this.toDate(date), displayFormat);
  }

  addCalendarYears(date: string, years: number): string {
    return this.fromDate(this.native.addCalendarYears(this.toDate(date), years));
  }

  addCalendarMonths(date: string, months: number): string {
    return this.fromDate(this.native.addCalendarMonths(this.toDate(date), months));
  }

  addCalendarDays(date: string, days: number): string {
    return this.fromDate(this.native.addCalendarDays(this.toDate(date), days));
  }

  toIso8601(date: string): string {
    return date;
  }

  override deserialize(value: unknown): string | null {
    if (value === '') return null;
    if (value instanceof Date) return this.native.isValid(value) ? this.fromDate(value) : this.invalid();
    return super.deserialize(value);
  }

  isDateInstance(obj: unknown): boolean {
    return typeof obj === 'string';
  }

  isValid(date: string): boolean {
    return this.native.isValid(this.toDate(date));
  }

  invalid(): string {
    return '';
  }

  /** Local midnight of the ISO date; an invalid Date for anything that is not an existing date. */
  private toDate(date: string): Date {
    const m = ISO_DATE.exec(date);
    if (!m) return this.native.invalid();
    // setFullYear, because the Date constructor turns years 0-99 into 1900-1999.
    const d = new Date(2000, 0, 1);
    d.setFullYear(+m[1], +m[2] - 1, +m[3]);
    return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : this.native.invalid();
  }

  /** A two-digit year in the century that puts it at most 10 years ahead (95 → 1995, 26 → 2026). */
  private fullYear(twoDigits: number): number {
    const limit = new Date().getFullYear() + 10;
    const year = Math.floor(limit / 100) * 100 + twoDigits;
    return year > limit ? year - 100 : year;
  }

  private fromDate(date: Date): string {
    if (!this.native.isValid(date)) return this.invalid();
    return this.fromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  private fromParts(year: number, month: number, day: number): string {
    const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.native.isValid(this.toDate(iso)) ? iso : this.invalid();
  }
}
