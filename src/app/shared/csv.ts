/**
 * CSV lezen en schrijven (RFC 4180: velden tussen dubbele aanhalingstekens, "" binnen een veld).
 * Exporteren gebeurt met komma's, de internationale standaard. Importeren kan ook met puntkomma's of tabs.
 */

export const CSV_DELIMITER = ',';

/**
 * Waarden die Excel als formule ziet krijgen bij exporteren een ' ervoor. Ook als er al apostrofs voor
 * staan (bv. '-Bol), zodat de import er precies één weghaalt en de waarde gelijk blijft.
 */
const FORMULA_LIKE = /^'*[=+\-@\t\r]/;
const ESCAPED_FORMULA = /^'+[=+\-@\t\r]/;

/** Ongeldige CSV, bv. een veld tussen aanhalingstekens dat niet wordt afgesloten. */
export class CsvError extends Error {}

/**
 * Leest CSV-tekst in rijen; het scheidingsteken (, ; of tab) wordt uit de kopregel bepaald.
 * Geeft een {@link CsvError} bij een veld tussen aanhalingstekens dat niet wordt afgesloten.
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
    throw new CsvError(`Op regel ${quoteLine} begint een veld met een aanhalingsteken (") dat niet wordt afgesloten.`);
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Telt de kandidaten in de kopregel, buiten aanhalingstekens; bij gelijkspel wint de komma. */
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

/** Zet rijen om naar CSV-tekst (met CRLF, zoals Excel). */
export function toCsv(rows: readonly (readonly (string | null | undefined)[])[]): string {
  return rows.map((row) => row.map(formatField).join(CSV_DELIMITER)).join('\r\n') + '\r\n';
}

function formatField(value: string | null | undefined): string {
  let v = value ?? '';
  if (FORMULA_LIKE.test(v)) v = `'${v}`;
  return /[";\r\n,]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Haalt de ' weg die {@link toCsv} voor formule-achtige waarden zet. */
export function unescapeFormula(value: string): string {
  return ESCAPED_FORMULA.test(value) ? value.slice(1) : value;
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
