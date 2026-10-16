import { registerLocaleData } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { LANGUAGES, Language, isLanguage, matchLanguage } from './languages';
import type nl from './translations/nl';

/**
 * Vertalingen. De taal ligt vast zolang de app draait: hij wordt vóór het opstarten geladen (zie main.ts) en
 * bij een andere keuze wordt de app opnieuw geladen. Zo kloppen ook datums en getallen (LOCALE_ID) meteen.
 *
 * De Nederlandse vertaling is de bron: elke andere taal moet dezelfde sleutels hebben (zie {@link Translations}).
 */

/** Meervoudsvormen volgens Intl.PluralRules; 'zero' wordt gebruikt bij precies 0, als die er is. */
export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export type TranslationKey = keyof typeof nl;

/** Een vertaling: dezelfde sleutels als het Nederlands, met meervoudsvormen waar het Nederlands die heeft. */
export type Translations = { [K in TranslationKey]: (typeof nl)[K] extends string ? string : PluralForms };

export type TranslationParams = Record<string, string | number | null | undefined>;

const STORAGE_KEY = 'wolsels.language';

/** Taal als de browser geen van onze talen noemt. */
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

/** Laadt de taal van deze browser (gekozen taal, anders die van de browser); vóór het opstarten aanroepen. */
export async function initI18n(): Promise<void> {
  const chosen = readStored() ?? matchLanguage(navigator.languages ?? [navigator.language]) ?? FALLBACK_LANGUAGE;
  const [translations, localeData] = await LOADERS[chosen]();
  registerLocaleData(localeData.default);
  useTranslations(chosen, translations.default);
}

/** Zet de vertalingen direct (bij het opstarten, en in tests). */
export function useTranslations(lang: Language, translations: Partial<Translations>): void {
  language = lang;
  messages = translations;
  pluralRules = new Intl.PluralRules(localeOf(lang));
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}

export function currentLanguage(): Language {
  return language;
}

/** Locale voor datums en getallen, bv. 'de-DE'. */
export function currentLocale(): string {
  return localeOf(language);
}

/**
 * Onthoudt de taal in deze browser en laadt de app opnieuw als die verandert. Zonder werkende opslag
 * (sommige privévensters) wordt niet herladen: de app zou na het laden weer in de oude taal starten en
 * via het profiel opnieuw willen wisselen, eindeloos.
 */
export function switchLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Opslag niet beschikbaar; readStored() hieronder ziet dat.
  }
  if (lang !== language && readStored() === lang) window.location.reload();
}

/**
 * De vertaling van een sleutel, met {naam} vervangen door de parameters. Bij meervoudsvormen bepaalt de
 * parameter 'count' de vorm.
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

/** Vertaalt in een template: {{ 'nav.stock' | t }} of {{ 'wool.count' | t: { count: n } }}. */
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
