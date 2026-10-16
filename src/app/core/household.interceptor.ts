import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HouseholdService } from './household.service';

/** Sends the active household with API requests (not needed for accounts and the list of households). */
export const householdInterceptor: HttpInterceptorFn = (req, next) => {
  const id = inject(HouseholdService).activeId();
  const needsHousehold =
    req.url.startsWith('/api/') && !req.url.startsWith('/api/auth/') && !req.url.startsWith('/api/households');
  return next(id && needsHousehold ? req.clone({ setHeaders: { 'X-Household': String(id) } }) : req);
};
