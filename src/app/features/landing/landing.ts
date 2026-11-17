import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TranslatePipe, TranslationKey, t } from '../../core/i18n/i18n';
import { LANGUAGES } from '../../core/i18n/languages';

/**
 * Placeholder for the public address in the prerendered HTML. nginx replaces it with PUBLIC_URL from the
 * environment (sub_filter in nginx/default.conf.template), so the image works for every installation.
 */
export const PUBLIC_URL_PLACEHOLDER = 'https://wolsels.invalid';

const SOURCE_URL = 'https://github.com/hjeverts/wolsels_frontend';

interface Feature {
  icon: string;
  title: TranslationKey;
  text: TranslationKey;
}

interface Screenshot {
  src: string;
  width: number;
  height: number;
  alt: TranslationKey;
  caption: TranslationKey;
}

/** Public landing page: what Wolsels is, and the way to sign up or log in. Prerendered for search engines. */
@Component({
  selector: 'app-landing',
  imports: [RouterLink, MatButtonModule, MatCardModule, MatExpansionModule, MatIconModule, TranslatePipe],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {
  private readonly auth = inject(AuthService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Shown by default (also in the prerendered HTML); hidden when this installation does not allow sign-up. */
  protected readonly allowRegistration = signal(true);

  protected readonly sourceUrl = SOURCE_URL;
  protected readonly languages = LANGUAGES.map((l) => l.name).join(' · ');

  protected readonly features: Feature[] = [
    { icon: 'inventory_2', title: 'landing.stockTitle', text: 'landing.stockText' },
    { icon: 'blender', title: 'landing.blendsTitle', text: 'landing.blendsText' },
    { icon: 'gesture', title: 'landing.spinningTitle', text: 'landing.spinningText' },
    { icon: 'palette', title: 'landing.dyeingTitle', text: 'landing.dyeingText' },
    { icon: 'agriculture', title: 'landing.productionTitle', text: 'landing.productionText' },
    { icon: 'cruelty_free', title: 'landing.animalsTitle', text: 'landing.animalsText' },
    { icon: 'group', title: 'landing.householdTitle', text: 'landing.householdText' },
    { icon: 'devices', title: 'landing.devicesTitle', text: 'landing.devicesText' },
  ];

  protected readonly screenshots: Screenshot[] = [
    { src: 'screenshots/mengsel.webp', width: 1600, height: 1000, alt: 'landing.shotBlendAlt', caption: 'landing.shotBlend' },
    { src: 'screenshots/spinresultaat.webp', width: 1600, height: 1000, alt: 'landing.shotSpinningAlt', caption: 'landing.shotSpinning' },
    { src: 'screenshots/productie.webp', width: 1600, height: 1000, alt: 'landing.shotProductionAlt', caption: 'landing.shotProduction' },
  ];

  protected readonly trust: { icon: string; text: TranslationKey }[] = [
    { icon: 'lock', text: 'landing.trustPrivate' },
    { icon: 'phonelink_lock', text: 'landing.trustTwoFactor' },
    { icon: 'location_off', text: 'landing.trustPhotos' },
    { icon: 'block', text: 'landing.trustNoAds' },
  ];

  protected readonly faq: { question: TranslationKey; answer: TranslationKey }[] = [
    { question: 'landing.faqCostQ', answer: 'landing.faqCostA' },
    { question: 'landing.faqForWhomQ', answer: 'landing.faqForWhomA' },
    { question: 'landing.faqTogetherQ', answer: 'landing.faqTogetherA' },
    { question: 'landing.faqDataQ', answer: 'landing.faqDataA' },
    { question: 'landing.faqSelfHostQ', answer: 'landing.faqSelfHostA' },
  ];

  constructor() {
    if (this.browser) {
      this.auth.allowRegistration().subscribe({
        next: (options) => this.allowRegistration.set(options.allowRegistration),
        error: () => undefined,
      });
    } else {
      // Only in the prerendered HTML: that is what search engines and link previews read.
      addSeoTags(inject(Meta), inject(DOCUMENT));
    }
  }
}

function addSeoTags(meta: Meta, document: Document): void {
  const base = PUBLIC_URL_PLACEHOLDER;
  const title = `Wolsels · ${t('title.landing')}`;
  const description = t('landing.metaDescription');
  const image = `${base}/screenshots/og.png`;

  meta.updateTag({ name: 'description', content: description });
  meta.updateTag({ property: 'og:type', content: 'website' });
  meta.updateTag({ property: 'og:site_name', content: 'Wolsels' });
  meta.updateTag({ property: 'og:locale', content: 'nl_NL' });
  meta.updateTag({ property: 'og:url', content: `${base}/` });
  meta.updateTag({ property: 'og:title', content: title });
  meta.updateTag({ property: 'og:description', content: description });
  meta.updateTag({ property: 'og:image', content: image });
  meta.updateTag({ property: 'og:image:width', content: '1200' });
  meta.updateTag({ property: 'og:image:height', content: '630' });
  meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

  const canonical = document.createElement('link');
  canonical.setAttribute('rel', 'canonical');
  canonical.setAttribute('href', `${base}/`);
  document.head.appendChild(canonical);

  // Structured data (schema.org): a script of type application/ld+json is data, not code, so the CSP allows it.
  const jsonLd = document.createElement('script');
  jsonLd.setAttribute('type', 'application/ld+json');
  jsonLd.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Wolsels',
    url: `${base}/`,
    image,
    description,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    inLanguage: LANGUAGES.map((l) => l.code),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  });
  document.head.appendChild(jsonLd);
}
