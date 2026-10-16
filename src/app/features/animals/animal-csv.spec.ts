import { useTranslations } from '../../core/i18n/i18n';
import de from '../../core/i18n/translations/de';
import nl from '../../core/i18n/translations/nl';
import { Animal } from '../../core/models';
import { parseCsv } from '../../shared/csv';
import { animalsToCsv, autoMap, buildImportRows, importedFields, parseBoolean, parseDate } from './animal-csv';

const animal: Animal = {
  id: 1,
  name: 'Flappie',
  species: 'Konijn',
  breed: 'Duitse angora',
  color: null,
  birthDate: '2024-03-01',
  locationId: 2,
  locationName: 'Stal',
  active: false,
  notes: 'Lief, zacht',
  totalHarvestedGrams: 120,
  lastHarvestDate: null,
};

describe('animalsToCsv', () => {
  it('maakt een leeg sjabloon met alleen kolomkoppen', () => {
    expect(animalsToCsv()).toBe('Naam,Diersoort,Ras,Kleur,Geboortedatum,Locatie,Actief,Notities\r\n');
  });

  it('exporteert dieren zo dat de import ze ongewijzigd terugleest', () => {
    const table = parseCsv(animalsToCsv([animal]));
    const [row] = buildImportRows(table, autoMap(table[0]));
    expect(row.errors).toEqual([]);
    expect(row.row).toEqual({
      line: 2,
      name: 'Flappie',
      species: 'Konijn',
      breed: 'Duitse angora',
      color: '',
      birthDate: '2024-03-01',
      location: 'Stal',
      active: false,
      notes: 'Lief, zacht',
    });
  });
});

describe('autoMap', () => {
  it('koppelt kolommen op naam, ook met andere schrijfwijzen', () => {
    const mapping = autoMap(['NAAM', 'Opmerkingen', 'Geb. datum', 'Soort', 'iets anders', 'Stal']);
    expect(mapping).toEqual({
      name: 0,
      species: 3,
      breed: null,
      color: null,
      birthDate: 2,
      location: 5,
      active: null,
      notes: 1,
    });
    expect(importedFields(mapping)).toEqual(['species', 'birthDate', 'location', 'notes']);
  });

  it('gebruikt een kolom maar één keer', () => {
    expect(autoMap(['Locatie', 'Locatie']).location).toBe(0);
  });
});

describe('parseDate', () => {
  it('leest ISO en Nederlandse notatie', () => {
    expect(parseDate('2024-03-01')).toBe('2024-03-01');
    expect(parseDate('1-3-2024')).toBe('2024-03-01');
    expect(parseDate('01/03/2024')).toBe('2024-03-01');
    expect(parseDate('1.3.2024')).toBe('2024-03-01');
    expect(parseDate('')).toBeNull();
  });

  it('weigert ongeldige datums', () => {
    expect(parseDate('31-2-2024')).toBeUndefined();
    expect(parseDate('maart 2024')).toBeUndefined();
    expect(parseDate('2024-13-01')).toBeUndefined();
  });
});

describe('parseBoolean', () => {
  it('kent ja/nee en varianten', () => {
    expect(['Ja', 'x', '1', 'TRUE'].map(parseBoolean)).toEqual([true, true, true, true]);
    expect(['nee', 'N', '0', 'onwaar'].map(parseBoolean)).toEqual([false, false, false, false]);
    expect(parseBoolean('')).toBeNull();
    expect(parseBoolean('misschien')).toBeUndefined();
  });
});

describe('buildImportRows', () => {
  it('slaat lege regels over en geeft fouten met het regelnummer', () => {
    const table = parseCsv('Naam;Geboortedatum;Actief\nBol;;\n;;\n;2024-01-01;\nPluis;30-2-2024;soms\n');
    const rows = buildImportRows(table, autoMap(table[0]));
    expect(rows.map((r) => r.line)).toEqual([2, 4, 5]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].row.active).toBeNull();
    expect(rows[1].errors).toEqual(['Naam ontbreekt.']);
    expect(rows[2].errors).toHaveLength(2);
  });

  it('negeert niet-gekoppelde kolommen', () => {
    const table = parseCsv('Naam;Ras\nBol;Rex');
    const rows = buildImportRows(table, { ...autoMap(table[0]), breed: null });
    expect(rows[0].row.breed).toBe('');
  });

  it('controleert de maximale lengte', () => {
    const table = [['Naam'], ['x'.repeat(201)]];
    expect(buildImportRows(table, autoMap(table[0]))[0].errors).toEqual(['Naam is langer dan 200 tekens.']);
  });
});

describe('animal-csv in andere talen', () => {
  afterEach(() => useTranslations('nl', nl));

  it('leest een export uit een andere taal ongewijzigd terug', () => {
    const german: Animal = {
      id: 1, name: 'Flocke', species: 'Kaninchen', breed: null, color: 'Weiß', birthDate: '2024-03-01',
      locationId: null, locationName: 'Stall', active: false, notes: null, totalHarvestedGrams: 0, lastHarvestDate: null,
    };
    useTranslations('de', de);
    const csv = animalsToCsv([german]);
    expect(csv.split('\r\n')[0]).toBe('Name,Tierart,Rasse,Farbe,Geburtsdatum,Standort,Aktiv,Notizen');

    useTranslations('nl', nl);
    const table = parseCsv(csv);
    const [row] = buildImportRows(table, autoMap(table[0]));
    expect(row.errors).toEqual([]);
    expect(row.row).toMatchObject({ name: 'Flocke', species: 'Kaninchen', location: 'Stall', active: false, birthDate: '2024-03-01' });
  });
});
