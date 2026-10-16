import { TranslationKey, t } from '../../core/i18n/i18n';
import { Animal, AnimalImportField, AnimalImportRow } from '../../core/models';
import { toCsv, unescapeFormula } from '../../shared/csv';

export type AnimalCsvField = 'name' | AnimalImportField;

export interface AnimalCsvFieldDef {
  key: AnimalCsvField;
  /** Column header on export, in the app language. */
  label: TranslationKey;
  /**
   * Column headers that are automatically mapped to this field on import (besides the label). In all languages,
   * so that a file from another language works too.
   */
  aliases: string[];
  maxLength?: number;
}

export const ANIMAL_CSV_FIELDS: readonly AnimalCsvFieldDef[] = [
  {
    key: 'name',
    label: 'csv.name',
    aliases: [
      'naam', 'dier', 'roepnaam', 'diernaam', 'name', 'animal', 'tier', 'nom', 'animal', 'nome', 'animale', 'namn', 'djur',
      'navn', 'dyr', 'nombre', 'imie', 'nazwa', 'zwierze',
    ],
    maxLength: 200,
  },
  {
    key: 'species',
    label: 'csv.species',
    aliases: ['diersoort', 'soort', 'species', 'tierart', 'art', 'espece', 'specie', 'djurart', 'dyreart', 'especie', 'gatunek'],
    maxLength: 100,
  },
  {
    key: 'breed',
    label: 'csv.breed',
    aliases: ['ras', 'breed', 'rasse', 'race', 'razza', 'rase', 'raza', 'raca', 'rasa'],
    maxLength: 100,
  },
  {
    key: 'color',
    label: 'csv.color',
    aliases: ['kleur', 'vachtkleur', 'color', 'colour', 'farbe', 'couleur', 'colore', 'farg', 'farge', 'farve', 'cor', 'kolor'],
    maxLength: 100,
  },
  {
    key: 'birthDate',
    label: 'csv.birthDate',
    aliases: [
      'geboortedatum', 'geboren', 'geb datum', 'birthdate', 'birth date', 'date of birth', 'geburtsdatum', 'geboren am',
      'date de naissance', 'data di nascita', 'fodelsedatum', 'fodselsdato', 'fecha de nacimiento', 'data de nascimento',
      'data urodzenia',
    ],
  },
  {
    key: 'location',
    label: 'csv.location',
    aliases: [
      'locatie', 'stal', 'hok', 'weide', 'location', 'standort', 'ort', 'stall', 'emplacement', 'lieu', 'posizione', 'luogo',
      'plats', 'sted', 'placering', 'ubicacion', 'localizacao', 'local', 'lokalizacja', 'miejsce',
    ],
    maxLength: 200,
  },
  {
    key: 'active',
    label: 'csv.active',
    aliases: ['actief', 'in bezit', 'active', 'aktiv', 'actif', 'attivo', 'activo', 'ativo', 'aktywny'],
  },
  {
    key: 'notes',
    label: 'csv.notes',
    aliases: [
      'notities', 'notitie', 'opmerkingen', 'opmerking', 'notes', 'note', 'notizen', 'bemerkungen', 'remarques', 'anteckningar',
      'notater', 'noter', 'notas', 'notatki', 'uwagi',
    ],
    maxLength: 4000,
  },
];

/** Per field the index of the CSV column, or null if the field is not imported. */
export type ColumnMapping = Record<AnimalCsvField, number | null>;

/** Empty template, or all animals; the columns match what the import recognises automatically. */
export function animalsToCsv(animals: readonly Animal[] = []): string {
  return toCsv([
    ANIMAL_CSV_FIELDS.map((f) => t(f.label)),
    ...animals.map((a) => [
      a.name,
      a.species,
      a.breed,
      a.color,
      a.birthDate,
      a.locationName,
      t(a.active ? 'csv.yes' : 'csv.no'),
      a.notes,
    ]),
  ]);
}

/** Letters that NFD does not split into a base letter plus accent (e.g. Danish/Norwegian "Fødselsdato"). */
const SPECIAL_LETTERS: Record<string, string> = { ø: 'o', æ: 'ae', å: 'a', ł: 'l', ß: 'ss', œ: 'oe' };

function normalize(header: string): string {
  return header
    .toLowerCase()
    .replace(/[øæåłßœ]/g, (c) => SPECIAL_LETTERS[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Maps column headers to fields by name (ignoring case, accents and punctuation). */
export function autoMap(headers: readonly string[]): ColumnMapping {
  const normalized = headers.map(normalize);
  const used = new Set<number>();
  const mapping = {} as ColumnMapping;
  for (const field of ANIMAL_CSV_FIELDS) {
    const names = [t(field.label), ...field.aliases].map(normalize);
    const index = normalized.findIndex((h, i) => !used.has(i) && names.includes(h));
    mapping[field.key] = index >= 0 ? index : null;
    if (index >= 0) used.add(index);
  }
  return mapping;
}

/** yyyy-mm-dd, or d-m-yyyy / d/m/yyyy / d.m.yyyy (as Excel in Europe saves dates). */
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

/** Yes and no in all app languages (an export from another language must be importable too). */
const TRUE = [
  'ja', 'j', 'yes', 'y', 'true', 'waar', '1', 'x', 'actief', 'wahr', 'aktiv', 'oui', 'vrai', 'actif', 'si', 'sì', 'sí', 'vero',
  'attivo', 'sant', 'sann', 'sand', 'verdadero', 'activo', 'sim', 'verdadeiro', 'ativo', 'tak', 'prawda', 'aktywny', 'active',
];
const FALSE = [
  'nee', 'n', 'no', 'false', 'onwaar', '0', 'inactief', 'nein', 'falsch', 'inaktiv', 'non', 'faux', 'inactif', 'falso',
  'inattivo', 'nej', 'falskt', 'nei', 'usann', 'falsk', 'inactivo', 'não', 'nao', 'inativo', 'nie', 'fałsz', 'nieaktywny',
  'inactive',
];

/** yes/no, true/false, 1/0 etc.; empty becomes null, anything unknown undefined. */
export function parseBoolean(value: string): boolean | null | undefined {
  const v = value.toLowerCase();
  if (!v) return null;
  if (TRUE.includes(v)) return true;
  if (FALSE.includes(v)) return false;
  return undefined;
}

export interface ImportRow {
  /** Line number in the file (the header line is line 1). */
  line: number;
  row: AnimalImportRow;
  errors: string[];
}

/** Converts the CSV rows (with header line) to animals to import, with errors per line. Empty lines are skipped. */
export function buildImportRows(table: readonly string[][], mapping: ColumnMapping): ImportRow[] {
  const result: ImportRow[] = [];
  table.slice(1).forEach((cells, i) => {
    if (cells.every((c) => !c.trim())) return;
    const errors: string[] = [];
    const get = (key: AnimalCsvField): string => {
      const index = mapping[key];
      const value = index === null ? '' : unescapeFormula((cells[index] ?? '').trim());
      const max = ANIMAL_CSV_FIELDS.find((f) => f.key === key)?.maxLength;
      if (max && value.length > max) errors.push(t('csv.tooLong', { field: label(key), max }));
      return value;
    };
    const name = get('name');
    if (!name) errors.push(t('csv.nameMissing'));
    const birthDateText = get('birthDate');
    const birthDate = parseDate(birthDateText);
    if (birthDate === undefined) errors.push(t('csv.badDate', { value: birthDateText }));
    const activeText = get('active');
    const active = parseBoolean(activeText);
    if (active === undefined) errors.push(t('csv.badBoolean', { value: activeText }));
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
  return t(ANIMAL_CSV_FIELDS.find((f) => f.key === key)!.label);
}

/** The mapped fields, except name: only those are updated for existing animals. */
export function importedFields(mapping: ColumnMapping): AnimalImportField[] {
  return ANIMAL_CSV_FIELDS.filter((f) => f.key !== 'name' && mapping[f.key] !== null).map((f) => f.key as AnimalImportField);
}
