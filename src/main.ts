import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { initI18n } from './app/core/i18n/i18n';

// Load the language first, so that all texts, dates and numbers are in the right language right away.
initI18n()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
