import { Animal, AnimalImportField, AnimalImportRow } from '../../core/models';
import { toCsv, unescapeFormula } from '../../shared/csv';

export type AnimalCsvField = 'name' | AnimalImportField;

export interface AnimalCsvFieldDef {
  key: AnimalCsvField;
  /** Kolomkop bij exporteren. */
  label: string;
  /** Kolomkoppen die bij importeren automatisch aan dit veld gekoppeld worden (naast het label). */
  aliases: string[];
  maxLength?: number;
}

export const ANIMAL_CSV_FIELDS: readonly AnimalCsvFieldDef[] = [
  { key: 'name', label: 'Naam', aliases: ['name', 'dier', 'roepnaam', 'diernaam'], maxLength: 200 },
  { key: 'species', label: 'Diersoort', aliases: ['soort', 'species'], maxLength: 100 },
  { key: 'breed', label: 'Ras', aliases: ['breed'], maxLength: 100 },
  { key: 'color', label: 'Kleur', aliases: ['color', 'colour', 'vachtkleur'], maxLength: 100 },
  { key: 'birthDate', label: 'Geboortedatum', aliases: ['geboren', 'geb datum', 'birthdate', 'birth date', 'date of birth'] },
  { key: 'location', label: 'Locatie', aliases: ['location', 'stal', 'hok', 'weide'], maxLength: 200 },
  { key: 'active', label: 'Actief', aliases: ['active', 'in bezit'] },
  { key: 'notes', label: 'Notities', aliases: ['notitie', 'opmerkingen', 'opmerking', 'notes', 'note'], maxLength: 4000 },
];

/** Per veld de index van de CSV-kolom, of null als het veld niet geïmporteerd wordt. */
export type ColumnMapping = Record<AnimalCsvField, number | null>;

/** Leeg sjabloon, of alle dieren; de kolommen zijn gelijk aan wat de import automatisch herkent. */
export function animalsToCsv(animals: readonly Animal[] = []): string {
  return toCsv([
    ANIMAL_CSV_FIELDS.map((f) => f.label),
    ...animals.map((a) => [
      a.name,
      a.species,
      a.breed,
      a.color,
      a.birthDate,
      a.locationName,
      a.active ? 'ja' : 'nee',
      a.notes,
    ]),
  ]);
}

function normalize(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Koppelt kolomkoppen aan velden op naam (zonder hoofdletters, accenten en leestekens). */
export function autoMap(headers: readonly string[]): ColumnMapping {
  const normalized = headers.map(normalize);
  const used = new Set<number>();
  const mapping = {} as ColumnMapping;
  for (const field of ANIMAL_CSV_FIELDS) {
    const names = [field.label, ...field.aliases].map(normalize);
    const index = normalized.findIndex((h, i) => !used.has(i) && names.includes(h));
    mapping[field.key] = index >= 0 ? index : null;
    if (index >= 0) used.add(index);
  }
  return mapping;
}

/** yyyy-mm-dd, of d-m-yyyy / d/m/yyyy / d.m.yyyy (zoals Nederlandse Excel datums opslaat). */
export function parseDate(value: string): string | null | undefined {
  if (!value) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const dutch = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(value);
  const parts = iso ? [iso[1], iso[2], iso[3]] : dutch ? [dutch[3], dutch[2], dutch[1]] : null;
  if (!parts) return undefined;
  const [y, mo, d] = parts;
  const date = new Date(Date.UTC(+y, +mo - 1, +d));
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +mo - 1 || date.getUTCDate() !== +d) return undefined;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const TRUE = ['ja', 'j', 'yes', 'y', 'true', 'waar', '1', 'x', 'actief'];
const FALSE = ['nee', 'n', 'no', 'false', 'onwaar', '0', 'inactief'];

/** ja/nee, true/false, 1/0 e.d.; leeg wordt null, iets onbekends undefined. */
export function parseBoolean(value: string): boolean | null | undefined {
  const v = value.toLowerCase();
  if (!v) return null;
  if (TRUE.includes(v)) return true;
  if (FALSE.includes(v)) return false;
  return undefined;
}

export interface ImportRow {
  /** Regelnummer in het bestand (de kopregel is regel 1). */
  line: number;
  row: AnimalImportRow;
  errors: string[];
}

/** Zet de CSV-rijen (met kopregel) om naar te importeren dieren, met fouten per regel. Lege regels worden overgeslagen. */
export function buildImportRows(table: readonly string[][], mapping: ColumnMapping): ImportRow[] {
  const result: ImportRow[] = [];
  table.slice(1).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return;
    const errors: string[] = [];
    const get = (key: AnimalCsvField): string => {
      const index = mapping[key];
      const value = index === null ? '' : unescapeFormula((cells[index] ?? '').trim());
      const max = ANIMAL_CSV_FIELDS.find((f) => f.key === key)?.maxLength;
      if (max && value.length > max) errors.push(`${label(key)} is langer dan ${max} tekens.`);
      return value;
    };
    const name = get('name');
    if (!name) errors.push('Naam ontbreekt.');
    const birthDateText = get('birthDate');
    const birthDate = parseDate(birthDateText);
    if (birthDate === undefined) errors.push(`Geboortedatum "${birthDateText}" niet herkend (gebruik bv. 2024-03-31 of 31-3-2024).`);
    const activeText = get('active');
    const active = parseBoolean(activeText);
    if (active === undefined) errors.push(`Actief "${activeText}" niet herkend (gebruik ja of nee).`);
    result.push({
      line: i + 2,
      errors,
      row: {
        line: i + 2,
        name,
        species: get('species'),
        breed: get('breed'),
        color: get('color'),
        birthDate: birthDate ?? null,
        location: get('location'),
        active: active ?? null,
        notes: get('notes'),
      },
    });
  });
  return result;
}

function label(key: AnimalCsvField): string {
  return ANIMAL_CSV_FIELDS.find((f) => f.key === key)!.label;
}

/** De gekoppelde velden, behalve naam: alleen die worden bij bestaande dieren bijgewerkt. */
export function importedFields(mapping: ColumnMapping): AnimalImportField[] {
  return ANIMAL_CSV_FIELDS.filter((f) => f.key !== 'name' && mapping[f.key] !== null).map((f) => f.key as AnimalImportField);
}
