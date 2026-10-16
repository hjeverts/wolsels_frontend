import { registerLocaleData } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { LANGUAGES, Language, isLanguage, matchLanguage } from './languages';
import type nl from './translations/nl';

/**
 * Translations. The language is fixed while the app runs: it is loaded before bootstrapping (see main.ts) and
 * when another one is chosen the app reloads. That way dates and numbers (LOCALE_ID) are right immediately too.
 *
 * The Dutch translation is the source: every other language must have the same keys (see {@link Translations}).
 */

/** Plural forms according to Intl.PluralRules; 'zero' is used for exactly 0, if present. */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type TranslationKey = keyof typeof nl;

/** A translation: the same keys as the Dutch one, with plural forms where the Dutch one has them. */
export type Translations = { [K in TranslationKey]: (typeof nl)[K] extends string ? string : PluralForms };

export type TranslationParams = Record<string, string | number | null | undefined>;

const STORAGE_KEY = 'wolsels.language';

/** Language when the browser lists none of ours. */
const FALLBACK_LANGUAGE: Language = 'en';

type Loaded = [{ default: Translations }, { default: unknown }];

const LOADERS: Record<Language, () => Promise<Loaded>> = {
  nl: () => Promise.all([import('./translations/nl'), import('@angular/common/locales/nl')]),
  de: () => Promise.all([import('./translations/de'), import('@angular/common/locales/de')]),
  en: () => Promise.all([import('./translations/en'), import('@angular/common/locales/en-GB')]),
  fr: () => Promise.all([import('./translations/fr'), import('@angular/common/locales/fr')]),
  it: () => Promise.all([import('./translations/it'), import('@angular/common/locales/it')]),
  sv: () => Promise.all([import('./translations/sv'), import('@angular/common/locales/sv')]),
  nb: () => Promise.all([import('./translations/nb'), import('@angular/common/locales/nb')]),
  da: () => Promise.all([import('./translations/da'), import('@angular/common/locales/da')]),
  es: () => Promise.all([import('./translations/es'), import('@angular/common/locales/es')]),
  pt: () => Promise.all([import('./translations/pt'), import('@angular/common/locales/pt-PT')]),
  pl: () => Promise.all([import('./translations/pl'), import('@angular/common/locales/pl')]),
};

let language: Language = FALLBACK_LANGUAGE;
let messages: Partial<Translations> = {};
let pluralRules = new Intl.PluralRules(localeOf(language));

/** Loads the language for this browser (the chosen language, otherwise the browser's); call before bootstrapping. */
export async function initI18n(): Promise<void> {
  const chosen = readStored() ?? matchLanguage(navigator.languages ?? [navigator.language]) ?? FALLBACK_LANGUAGE;
  const [translations, localeData] = await LOADERS[chosen]();
  registerLocaleData(localeData.default);
  useTranslations(chosen, translations.default);
}

/** Sets the translations directly (at startup, and in tests). */
export function useTranslations(lang: Language, translations: Partial<Translations>): void {
  language = lang;
  messages = translations;
  pluralRules = new Intl.PluralRules(localeOf(lang));
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function currentLanguage(): Language {
  return language;
}

/** Locale for dates and numbers, e.g. 'de-DE'. */
export function currentLocale(): string {
  return localeOf(language);
}

/**
 * Remembers the language in this browser and reloads the app if it changes. Without working storage
 * (some private windows) it does not reload: the app would start in the old language again after loading and
 * want to switch again via the profile, endlessly.
 */
export function switchLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage not available; readStored() below notices that.
  }
  if (lang !== language && readStored() === lang) window.location.reload();
}

/**
 * The translation of a key, with {name} replaced by the parameters. For plural forms the parameter
 * 'count' determines the form.
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const entry = messages[key];
  if (entry === undefined) return key;
  let text: string;
  if (typeof entry === 'string') {
    text = entry;
  } else {
    const count = Number(params?.['count'] ?? 0);
    text = (count === 0 ? entry.zero : undefined) ?? entry[pluralRules.select(count)] ?? entry.other;
  }
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name] ?? '') : match));
}

/** Translates in a template: {{ 'nav.stock' | t }} or {{ 'wool.count' | t: { count: n } }}. */
@Pipe({ name: 't' })
export class TranslatePipe implements PipeTransform {
  transform(key: TranslationKey, params?: TranslationParams): string {
    return t(key, params);
  }
}

function localeOf(lang: Language): string {
  return LANGUAGES.find((l) => l.code === lang)!.locale;
}

function readStored(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}
