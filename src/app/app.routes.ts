import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard, guestGuard } from './core/auth.guard';

const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'voorraad' },
  {
    path: 'huishouden',
    title: 'Huishouden · Wolsels',
    loadComponent: () => import('./features/household/household-page').then((m) => m.HouseholdPage),
  },
  {
    path: 'beheer',
    title: 'Gebruikersbeheer · Wolsels',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-users').then((m) => m.AdminUsers),
  },
  {
    path: 'account',
    title: 'Account · Wolsels',
    loadComponent: () => import('./features/auth/account').then((m) => m.Account),
  },
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
    path: 'dieren/importeren',
    title: 'Dieren importeren · Wolsels',
    loadComponent: () => import('./features/animals/animal-import').then((m) => m.AnimalImport),
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
];

export const routes: Routes = [
  {
    path: 'inloggen',
    title: 'Inloggen · Wolsels',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'registreren',
    title: 'Registreren · Wolsels',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: 'wachtwoord-vergeten',
    title: 'Wachtwoord vergeten · Wolsels',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    // Bereikbaar via de link in de herstelmail, ook als je (nog) ingelogd bent.
    path: 'wachtwoord-herstellen',
    title: 'Nieuw wachtwoord · Wolsels',
    loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
  },
  {
    // Bereikbaar met en zonder login.
    path: 'uitnodiging/:token',
    title: 'Uitnodiging · Wolsels',
    loadComponent: () => import('./features/household/invite-page').then((m) => m.InvitePage),
  },
  { path: '', canActivate: [authGuard], children: appRoutes },
  { path: '**', redirectTo: '' },
];
