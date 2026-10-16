import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from './auth.service';

/** Only for logged-in users; otherwise to the login page with a return URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user$ = auth.user() === undefined ? auth.loadMe() : of(auth.user());
  return user$.pipe(
    map((user) => (user ? true : router.createUrlTree(['/inloggen'], { queryParams: { terug: state.url } }))),
  );
};

/** The login and sign-up pages are not needed when already logged in. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user$ = auth.user() === undefined ? auth.loadMe() : of(auth.user());
  return user$.pipe(map((user) => (user ? router.createUrlTree(['/']) : true)));
};
