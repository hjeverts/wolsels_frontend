import { TestBed } from '@angular/core/testing';
import { MAT_DATE_LOCALE, MAT_NATIVE_DATE_FORMATS } from '@angular/material/core';
import { IsoDateAdapter } from './iso-date-adapter';

describe('IsoDateAdapter', () => {
  function adapter(locale = 'nl') {
    TestBed.configureTestingModule({ providers: [IsoDateAdapter, { provide: MAT_DATE_LOCALE, useValue: locale }] });
    return TestBed.inject(IsoDateAdapter);
  }

  it('keeps dates as ISO strings', () => {
    const a = adapter();
    expect(a.createDate(2026, 9, 18)).toBe('2026-10-18');
    expect(a.addCalendarDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(a.addCalendarMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(a.getMonth('2026-10-18')).toBe(9);
    expect(a.getDayOfWeek('2026-10-18')).toBe(0);
  });

  it('parses typed dates day first or year first', () => {
    const a = adapter();
    expect(a.parse('18-10-2026')).toBe('2026-10-18');
    expect(a.parse('18.10.26')).toBe('2026-10-18');
    expect(a.parse('2026-10-18')).toBe('2026-10-18');
    expect(a.parse('')).toBeNull();
    expect(a.isValid(a.parse('31-02-2026')!)).toBe(false);
    expect(a.isValid(a.parse('morgen')!)).toBe(false);
  });

  it('puts two-digit years at most 10 years ahead', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 18), toFake: ['Date'] });
    try {
      const a = adapter();
      expect(a.parse('18.10.36')).toBe('2036-10-18');
      expect(a.parse('18.10.37')).toBe('1937-10-18');
      expect(a.parse('18.10.95')).toBe('1995-10-18');
    } finally {
      vi.useRealTimers();
    }
  });

  it('handles years below 100 without shifting them to the 1900s', () => {
    const a = adapter();
    expect(a.getYear('0050-06-01')).toBe(50);
    expect(a.addCalendarDays('0050-12-31', 1)).toBe('0051-01-01');
  });

  it('formats in the locale', () => {
    expect(adapter('nl').format('2026-10-18', MAT_NATIVE_DATE_FORMATS.display.dateInput)).toBe('18-10-2026');
  });

  it('reads API values and treats empty as no date', () => {
    const a = adapter();
    expect(a.deserialize('2026-10-18')).toBe('2026-10-18');
    expect(a.deserialize('')).toBeNull();
    expect(a.deserialize(null)).toBeNull();
  });
});
