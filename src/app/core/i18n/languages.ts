/** Talen waarin Wolsels te gebruiken is. De naam staat in de taal zelf, zodat iedereen zijn eigen taal herkent. */
export const LANGUAGES = [
  { code: 'nl', name: 'Nederlands', locale: 'nl-NL' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
  { code: 'en', name: 'English', locale: 'en-GB' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'it', name: 'Italiano', locale: 'it-IT' },
  { code: 'sv', name: 'Svenska', locale: 'sv-SE' },
  { code: 'nb', name: 'Norsk', locale: 'nb-NO' },
  { code: 'da', name: 'Dansk', locale: 'da-DK' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
  { code: 'pt', name: 'Português', locale: 'pt-PT' },
  { code: 'pl', name: 'Polski', locale: 'pl-PL' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}

/**
 * De best passende taal bij taalcodes zoals de browser ze geeft ('de-AT', 'en', 'no', ...), of null.
 * Noors komt ook voor als 'no' en 'nn'.
 */
export function matchLanguage(tags: readonly string[]): Language | null {
  for (const tag of tags) {
    const code = tag.toLowerCase().split('-')[0];
    const language = code === 'no' || code === 'nn' ? 'nb' : code;
    if (isLanguage(language)) return language;
  }
  return null;
}
