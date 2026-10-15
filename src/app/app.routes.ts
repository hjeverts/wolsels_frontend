import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'voorraad' },
  {
    path: 'voorraad',
    title: 'Voorraad · Wolsels',
    loadComponent: () => import('./features/wools/wool-list').then((m) => m.WoolList),
  },
  {
    path: 'voorraad/nieuw',
    title: 'Nieuwe wol · Wolsels',
    loadComponent: () => import('./features/wools/wool-form').then((m) => m.WoolForm),
  },
  {
    path: 'voorraad/:id',
    title: 'Wol · Wolsels',
    loadComponent: () => import('./features/wools/wool-form').then((m) => m.WoolForm),
  },
  {
    path: 'mengsels',
    title: 'Mengsels · Wolsels',
    loadComponent: () => import('./features/blends/blend-list').then((m) => m.BlendList),
  },
  {
    path: 'mengsels/nieuw',
    title: 'Nieuw mengsel · Wolsels',
    loadComponent: () => import('./features/blends/blend-form').then((m) => m.BlendForm),
  },
  {
    path: 'mengsels/:id',
    title: 'Mengsel · Wolsels',
    loadComponent: () => import('./features/blends/blend-form').then((m) => m.BlendForm),
  },
  {
    path: 'productie',
    title: 'Productie · Wolsels',
    loadComponent: () => import('./features/production/production-overview').then((m) => m.ProductionOverview),
  },
  {
    path: 'productie/nieuw',
    title: 'Nieuwe oogst · Wolsels',
    loadComponent: () => import('./features/production/harvest-form').then((m) => m.HarvestForm),
  },
  {
    path: 'productie/:id',
    title: 'Oogst · Wolsels',
    loadComponent: () => import('./features/production/harvest-form').then((m) => m.HarvestForm),
  },
  {
    path: 'dieren',
    title: 'Dieren · Wolsels',
    loadComponent: () => import('./features/animals/animal-list').then((m) => m.AnimalList),
  },
  {
    path: 'dieren/nieuw',
    title: 'Nieuw dier · Wolsels',
    loadComponent: () => import('./features/animals/animal-form').then((m) => m.AnimalForm),
  },
  {
    path: 'dieren/:id',
    title: 'Dier · Wolsels',
    loadComponent: () => import('./features/animals/animal-form').then((m) => m.AnimalForm),
  },
  {
    path: 'locaties',
    title: 'Locaties · Wolsels',
    loadComponent: () => import('./features/locations/location-list').then((m) => m.LocationList),
  },
  { path: '**', redirectTo: 'voorraad' },
];
