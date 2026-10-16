import { HttpInterceptorFn } from '@angular/common/http';
import { currentLanguage } from './i18n';

/** Vraagt meldingen van de API in de taal van de app (de browser stuurt anders zijn eigen taal mee). */
export const languageInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith('/api/') ? req.clone({ setHeaders: { 'Accept-Language': currentLanguage() } }) : req);
