import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HouseholdService } from './household.service';

/** Stuurt het actieve huishouden mee met API-verzoeken (niet nodig voor accounts en de lijst met huishoudens). */
export const householdInterceptor: HttpInterceptorFn = (req, next) => {
  const id = inject(HouseholdService).activeId();
  const needsHousehold =
    req.url.startsWith('/api/') && !req.url.startsWith('/api/auth/') && !req.url.startsWith('/api/households');
  return next(id && needsHousehold ? req.clone({ setHeaders: { 'X-Household': String(id) } }) : req);
};
