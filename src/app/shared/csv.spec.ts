import { parseCsv, readTextFile, toCsv, unescapeFormula } from './csv';

describe('parseCsv', () => {
  it('herkent puntkomma, komma en tab als scheidingsteken', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('leest velden met aanhalingstekens, scheidingstekens en regeleinden', () => {
    expect(parseCsv('Naam;Notities\n"Flappie";"Lief; ""zacht""\nen wit"\n')).toEqual([
      ['Naam', 'Notities'],
      ['Flappie', 'Lief; "zacht"\nen wit'],
    ]);
  });

  it('negeert een BOM en houdt lege velden', () => {
    expect(parseCsv('﻿a;b;c\n1;;3')).toEqual([['a', 'b', 'c'], ['1', '', '3']]);
  });
});

describe('toCsv', () => {
  it('zet aanhalingstekens alleen waar nodig', () => {
    expect(toCsv([['Naam', 'Notities'], ['Flappie', 'Lief, "zacht"'], ['Bol', null]])).toBe(
      'Naam,Notities\r\nFlappie,"Lief, ""zacht"""\r\nBol,\r\n',
    );
  });

  it('maakt formules onschadelijk, en de import haalt de markering weer weg', () => {
    const csv = toCsv([['=HYPERLINK("x")', '-3', '@a']]);
    expect(csv).toBe(`"'=HYPERLINK(""x"")",'-3,'@a\r\n`);
    expect(parseCsv(csv)[0].map(unescapeFormula)).toEqual(['=HYPERLINK("x")', '-3', '@a']);
    expect(unescapeFormula("'gewoon")).toBe("'gewoon");
  });

  it('kan teruggelezen worden', () => {
    const rows = [['a', 'b, c', 'd; e', 'regel\r\neen', ' spatie ']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('readTextFile', () => {
  it('leest UTF-8 en valt terug op Windows-1252', async () => {
    expect(await readTextFile(new Blob([new TextEncoder().encode('Zoë')]))).toBe('Zoë');
    expect(await readTextFile(new Blob([new Uint8Array([0x5a, 0x6f, 0xeb])]))).toBe('Zoë');
  });
});
