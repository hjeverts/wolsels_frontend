import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Only the landing page is prerendered at build time (dist/.../browser/index.html), so that search engines see
 * real content. Everything else is rendered in the browser from index.csr.html (see nginx/default.conf.template).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
