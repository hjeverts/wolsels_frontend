import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initI18n } from './app/core/i18n/i18n';

// Eerst de taal laden, zodat alle teksten, datums en getallen meteen in de juiste taal staan.
initI18n()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
