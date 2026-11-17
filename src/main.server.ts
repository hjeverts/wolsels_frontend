import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';
import { initI18n } from './app/core/i18n/i18n';

// Only used at build time, to prerender the public landing page (see app.routes.server.ts). The prerendered
// HTML is Dutch; in the browser the app starts again in the visitor's language.
const bootstrap = async (context: BootstrapContext) => {
  await initI18n('nl');
  return bootstrapApplication(App, config, context);
};

export default bootstrap;
