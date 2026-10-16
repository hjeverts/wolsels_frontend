/**
 * CSV lezen en schrijven (RFC 4180: velden tussen dubbele aanhalingstekens, "" binnen een veld).
 * Exporteren gebeurt met komma's, de internationale standaard. Importeren kan ook met puntkomma's of tabs.
 */

export const CSV_DELIMITER = ',';

/** Tekens waarmee Excel een cel als formule ziet; zo'n cel krijgt bij exporteren een ' ervoor. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Leest CSV-tekst in rijen; het scheidingsteken (; , of tab) wordt uit de eerste regel bepaald. */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.search(/\r|\n|$/));
  const candidates = [';', ',', '\t'];
  const counts = candidates.map((d) => firstLine.split(d).length);
  return candidates[counts.indexOf(Math.max(...counts))];
}

/** Zet rijen om naar CSV-tekst (met CRLF, zoals Excel). */
export function toCsv(rows: readonly (readonly (string | null | undefined)[])[]): string {
  return rows.map((row) => row.map(formatField).join(CSV_DELIMITER)).join('\r\n') + '\r\n';
}

function formatField(value: string | null | undefined): string {
  let v = value ?? '';
  if (FORMULA_START.test(v)) v = `'${v}`;
  return /[";\r\n,]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Haalt de ' weg die {@link toCsv} voor formule-achtige waarden zet. */
export function unescapeFormula(value: string): string {
  return value.startsWith("'") && FORMULA_START.test(value.slice(1)) ? value.slice(1) : value;
}

/**
 * Leest een bestand als tekst: UTF-8, of Windows-1252 als het geen geldige UTF-8 is
 * (zo slaat oudere Excel "CSV (gescheiden door lijstscheidingsteken)" op).
 */
export async function readTextFile(file: Blob): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Biedt CSV-tekst aan als download; met BOM, zodat Excel de tekens (é, ë) goed toont. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url));
}
