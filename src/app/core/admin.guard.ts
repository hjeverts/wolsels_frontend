import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from './auth.service';

/** Only for administrators (the backend also checks this on every request). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user$ = auth.user() === undefined ? auth.loadMe() : of(auth.user());
  return user$.pipe(map((user) => (user?.isAdmin ? true : router.createUrlTree(['/']))));
};
