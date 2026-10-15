import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from './auth.service';

/** Alleen voor ingelogde gebruikers; anders naar de inlogpagina met terugkeer-URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user$ = auth.user() === undefined ? auth.loadMe() : of(auth.user());
  return user$.pipe(
    map((user) => (user ? true : router.createUrlTree(['/inloggen'], { queryParams: { terug: state.url } }))),
  );
};

/** Inlog- en registratiepagina's zijn niet nodig als je al bent ingelogd. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user$ = auth.user() === undefined ? auth.loadMe() : of(auth.user());
  return user$.pipe(map((user) => (user ? router.createUrlTree(['/']) : true)));
};
