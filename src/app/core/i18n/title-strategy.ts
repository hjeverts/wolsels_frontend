import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslationKey, t } from './i18n';

/** De titel van een route is een vertaalsleutel; het tabblad toont "<titel> · Wolsels". */
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    this.title.setTitle(key ? `${t(key as TranslationKey)} · Wolsels` : 'Wolsels');
  }
}
