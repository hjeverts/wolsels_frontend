/**
 * Reading and writing CSV (RFC 4180: fields in double quotes, "" inside a field).
 * Export uses commas, the international standard. Import also accepts semicolons or tabs.
 */

import { t } from '../core/i18n/i18n';

export const CSV_DELIMITER = ',';

/**
 * Values that Excel sees as a formula get a ' prefix on export. Also when apostrophes already precede
 * them (e.g. '-Bol), so that the import removes exactly one and the value stays the same.
 */
const FORMULA_LIKE = /^'*[=+\-@\t\r]/;
const ESCAPED_FORMULA = /^'+[=+\-@\t\r]/;

/** Invalid CSV, e.g. a quoted field that is never closed. */
export class CsvError extends Error {}

/**
 * Reads CSV text into rows; the delimiter (, ; or tab) is determined from the header line.
 * Throws a {@link CsvError} for a quoted field that is never closed.
 */
export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let quoteLine = 0;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') line++;
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
      quoteLine = line;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') {
        i++;
        line++;
      } else if (c === '\r') {
        line++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (quoted) {
    throw new CsvError(t('csv.unclosedQuote', { line: quoteLine }));
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Counts the candidates in the header line, outside quotes; on a tie the comma wins. */
function detectDelimiter(text: string): string {
  const candidates = [',', ';', '\t'];
  const counts = candidates.map(() => 0);
  let quoted = false;
  for (const c of text) {
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === '\n' || c === '\r')) break;
    else if (!quoted && candidates.includes(c)) counts[candidates.indexOf(c)]++;
  }
  return candidates[counts.indexOf(Math.max(...counts))];
}

/** Converts rows to CSV text (with CRLF, like Excel). */
export function toCsv(rows: readonly (readonly (string | null | undefined)[])[]): string {
  return rows.map((row) => row.map(formatField).join(CSV_DELIMITER)).join('\r\n') + '\r\n';
}

function formatField(value: string | null | undefined): string {
  let v = value ?? '';
  if (FORMULA_LIKE.test(v)) v = `'${v}`;
  return /[";\r\n,]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Removes the ' that {@link toCsv} puts before formula-like values. */
export function unescapeFormula(value: string): string {
  return ESCAPED_FORMULA.test(value) ? value.slice(1) : value;
}

/**
 * Reads a file as text: UTF-8, or Windows-1252 if it is not valid UTF-8
 * (that is how older Excel versions save "CSV (list separator delimited)").
 */
export async function readTextFile(file: Blob): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Offers CSV text as a download; with a BOM, so that Excel shows characters (é, ë) correctly. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url));
}
