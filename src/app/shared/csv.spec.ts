import { CsvError, parseCsv, readTextFile, toCsv, unescapeFormula } from './csv';

describe('parseCsv', () => {
  it('recognises semicolon, comma and tab as delimiter', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('reads fields with quotes, delimiters and line breaks', () => {
    expect(parseCsv('Naam;Notities\n"Flappie";"Lief; ""zacht""\nen wit"\n')).toEqual([
      ['Naam', 'Notities'],
      ['Flappie', 'Lief; "zacht"\nen wit'],
    ]);
  });

  it('only counts characters outside quotes when detecting the delimiter', () => {
    expect(parseCsv('Naam,"Notities; extra"\r\nBol,tekst')).toEqual([['Naam', 'Notities; extra'], ['Bol', 'tekst']]);
    expect(parseCsv('"a,b";c;d\n1;2;3')).toEqual([['a,b', 'c', 'd'], ['1', '2', '3']]);
    expect(parseCsv('"Naam\nvan dier",Kleur\nBol,wit')).toEqual([['Naam\nvan dier', 'Kleur'], ['Bol', 'wit']]);
    expect(parseCsv('Naam\nBol')).toEqual([['Naam'], ['Bol']]);
  });

  it('rejects a field with a quote that is never closed', () => {
    expect(() => parseCsv('Naam,Notities\nBol,"lief\nPluis,zacht')).toThrow(CsvError);
    expect(() => parseCsv('Naam,Notities\r\nBol,"lief\r\nPluis,zacht')).toThrow('Op regel 2 ');
  });

  it('ignores a BOM and keeps empty fields', () => {
    expect(parseCsv('﻿a;b;c\n1;;3')).toEqual([['a', 'b', 'c'], ['1', '', '3']]);
  });
});

describe('toCsv', () => {
  it('only adds quotes where needed', () => {
    expect(toCsv([['Naam', 'Notities'], ['Flappie', 'Lief, "zacht"'], ['Bol', null]])).toBe(
      'Naam,Notities\r\nFlappie,"Lief, ""zacht"""\r\nBol,\r\n',
    );
  });

  it('neutralises formulas, and the import removes the marker again', () => {
    const csv = toCsv([['=HYPERLINK("x")', '-3', '@a']]);
    expect(csv).toBe(`"'=HYPERLINK(""x"")",'-3,'@a\r\n`);
    expect(parseCsv(csv)[0].map(unescapeFormula)).toEqual(['=HYPERLINK("x")', '-3', '@a']);
    expect(unescapeFormula("'gewoon")).toBe("'gewoon");
  });

  it('keeps values that already start with an apostrophe unchanged', () => {
    const values = ["'-Bol", "''=x", "'gewoon", '-Bol'];
    expect(parseCsv(toCsv([values]))[0].map(unescapeFormula)).toEqual(values);
  });

  it('can be read back', () => {
    const rows = [['a', 'b, c', 'd; e', 'regel\r\neen', ' spatie ']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('readTextFile', () => {
  it('reads UTF-8 and falls back to Windows-1252', async () => {
    expect(await readTextFile(new Blob([new TextEncoder().encode('Zoë')]))).toBe('Zoë');
    expect(await readTextFile(new Blob([new Uint8Array([0x5a, 0x6f, 0xeb])]))).toBe('Zoë');
  });
});
