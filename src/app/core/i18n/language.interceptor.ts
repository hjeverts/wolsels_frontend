import { HttpInterceptorFn } from '@angular/common/http';
import { currentLanguage } from './i18n';

/** Asks for API messages in the app language (otherwise the browser sends its own language). */
export const languageInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith('/api/') ? req.clone({ setHeaders: { 'Accept-Language': currentLanguage() } }) : req);
