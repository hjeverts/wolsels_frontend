import { Routes } from '@angular/router';
import { adminGuard } from './core/admin.guard';
import { authGuard, guestGuard } from './core/auth.guard';

const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'voorraad' },
  {
    path: 'huishouden',
    title: 'title.household',
    loadComponent: () => import('./features/household/household-page').then((m) => m.HouseholdPage),
  },
  {
    path: 'beheer',
    title: 'title.admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/admin-users').then((m) => m.AdminUsers),
  },
  {
    path: 'account',
    title: 'title.account',
    loadComponent: () => import('./features/auth/account').then((m) => m.Account),
  },
  {
    path: 'voorraad',
    title: 'title.stock',
    loadComponent: () => import('./features/wools/wool-list').then((m) => m.WoolList),
  },
  {
    path: 'voorraad/nieuw',
    title: 'title.newWool',
    loadComponent: () => import('./features/wools/wool-form').then((m) => m.WoolForm),
  },
  {
    path: 'voorraad/:id',
    title: 'title.wool',
    loadComponent: () => import('./features/wools/wool-form').then((m) => m.WoolForm),
  },
  {
    path: 'mengsels',
    title: 'title.blends',
    loadComponent: () => import('./features/blends/blend-list').then((m) => m.BlendList),
  },
  {
    path: 'mengsels/nieuw',
    title: 'title.newBlend',
    loadComponent: () => import('./features/blends/blend-form').then((m) => m.BlendForm),
  },
  {
    path: 'mengsels/:id',
    title: 'title.blend',
    loadComponent: () => import('./features/blends/blend-form').then((m) => m.BlendForm),
  },
  {
    path: 'productie',
    title: 'title.production',
    loadComponent: () => import('./features/production/production-overview').then((m) => m.ProductionOverview),
  },
  {
    path: 'productie/nieuw',
    title: 'title.newHarvest',
    loadComponent: () => import('./features/production/harvest-form').then((m) => m.HarvestForm),
  },
  {
    path: 'productie/:id',
    title: 'title.harvest',
    loadComponent: () => import('./features/production/harvest-form').then((m) => m.HarvestForm),
  },
  {
    path: 'dieren',
    title: 'title.animals',
    loadComponent: () => import('./features/animals/animal-list').then((m) => m.AnimalList),
  },
  {
    path: 'dieren/nieuw',
    title: 'title.newAnimal',
    loadComponent: () => import('./features/animals/animal-form').then((m) => m.AnimalForm),
  },
  {
    path: 'dieren/importeren',
    title: 'title.importAnimals',
    loadComponent: () => import('./features/animals/animal-import').then((m) => m.AnimalImport),
  },
  {
    path: 'dieren/:id',
    title: 'title.animal',
    loadComponent: () => import('./features/animals/animal-form').then((m) => m.AnimalForm),
  },
  {
    path: 'locaties',
    title: 'title.locations',
    loadComponent: () => import('./features/locations/location-list').then((m) => m.LocationList),
  },
];

export const routes: Routes = [
  {
    path: 'inloggen',
    title: 'title.login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'registreren',
    title: 'title.register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register').then((m) => m.Register),
  },
  {
    path: 'wachtwoord-vergeten',
    title: 'title.forgotPassword',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    // Bereikbaar via de link in de herstelmail, ook als je (nog) ingelogd bent.
    path: 'wachtwoord-herstellen',
    title: 'title.resetPassword',
    loadComponent: () => import('./features/auth/reset-password').then((m) => m.ResetPassword),
  },
  {
    // Bereikbaar met en zonder login.
    path: 'uitnodiging/:token',
    title: 'title.invite',
    loadComponent: () => import('./features/household/invite-page').then((m) => m.InvitePage),
  },
  { path: '', canActivate: [authGuard], children: appRoutes },
  { path: '**', redirectTo: '' },
];
