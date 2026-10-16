import { PluralForms, Translations, t, useTranslations } from './i18n';
import { LANGUAGES, matchLanguage } from './languages';
import da from './translations/da';
import de from './translations/de';
import en from './translations/en';
import es from './translations/es';
import fr from './translations/fr';
import italian from './translations/it';
import nb from './translations/nb';
import nl from './translations/nl';
import pl from './translations/pl';
import pt from './translations/pt';
import sv from './translations/sv';

const all: Record<string, Translations> = { nl, de, en, fr, it: italian, sv, nb, da, es, pt, pl };

function texts(entry: string | PluralForms): string[] {
  return typeof entry === 'string' ? [entry] : Object.values(entry).filter((v): v is string => !!v);
}

function placeholders(text: string): string[] {
  return [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();
}

describe('vertalingen', () => {
  afterEach(() => useTranslations('nl', nl));

  it('zijn er voor elke taal van de app', () => {
    expect(Object.keys(all).sort()).toEqual(LANGUAGES.map((l) => l.code).sort());
  });

  it('gebruiken in elke taal dezelfde parameters als het Nederlands', () => {
    for (const [lang, translations] of Object.entries(all)) {
      for (const [key, entry] of Object.entries(nl)) {
        const expected = placeholders(texts(entry).join(' '));
        for (const text of texts(translations[key as keyof Translations])) {
          // Een meervoudsvorm mag {count} weglaten ("enkeldraads"), maar geen andere parameters verzinnen.
          const found = placeholders(text);
          expect(found.every((p) => expected.includes(p)), `${lang} ${key}: ${text}`).toBe(true);
          if (typeof entry === 'string') expect(found, `${lang} ${key}`).toEqual(expected);
        }
      }
    }
  });

  it('vult parameters in en kiest de meervoudsvorm', () => {
    expect(t('reset.for', { email: 'a@b.nl' })).toBe('Voor a@b.nl');
    expect(t('app.memberCount', { count: 1 })).toBe('1 lid');
    expect(t('app.memberCount', { count: 3 })).toBe('3 leden');
    expect(t('import.submit', { count: 0 })).toBe('Importeren');
  });

  it('kent de Poolse meervoudsvormen', () => {
    useTranslations('pl', pl);
    expect(t('import.animalCount', { count: 1 })).toBe('1 zwierzę');
    expect(t('import.animalCount', { count: 3 })).toBe('3 zwierzęta');
    expect(t('import.animalCount', { count: 5 })).toBe('5 zwierząt');
  });

  it('herkent de taal van de browser', () => {
    expect(matchLanguage(['de-AT', 'en'])).toBe('de');
    expect(matchLanguage(['no'])).toBe('nb');
    expect(matchLanguage(['ja', 'pt-BR'])).toBe('pt');
    expect(matchLanguage(['ja'])).toBeNull();
  });
});
