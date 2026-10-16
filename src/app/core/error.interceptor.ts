import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HouseholdService } from './household.service';
import { t } from './i18n/i18n';

/**
 * Shows API errors (ProblemDetails) as a notification. An expired session redirects to the login page.
 * Errors from /api/auth are shown by the forms themselves.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  const auth = inject(AuthService);
  const households = inject(HouseholdService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.url.startsWith('/api/auth')) return throwError(() => error);
      if (error.status === 403 && (error.error as { type?: string } | null)?.type === 'household-access') {
        // The stored household is no longer yours, e.g. because you were removed.
        households.forget();
        snackBar.open(t('errors.noHouseholdAccess'), t('common.close'), { duration: 6000 });
        households.load().subscribe(() => router.navigate(['/voorraad']));
        return throwError(() => error);
      }
      if (error.status === 401) {
        if (auth.user()) snackBar.open(t('errors.sessionExpired'), t('common.close'), { duration: 6000 });
        auth.user.set(null);
        router.navigate(['/inloggen'], { queryParams: { terug: router.url } });
      } else {
        snackBar.open(describe(error), t('common.close'), { duration: 8000 });
      }
      return throwError(() => error);
    }),
  );
};

function describe(error: HttpErrorResponse): string {
  if (error.status === 0) return t('errors.serverUnreachable');
  // Rejected by nginx, so without ProblemDetails.
  if (error.status === 413) return t('errors.fileTooLarge');
  const problem = error.error as { title?: string; errors?: Record<string, string[]> } | null;
  const details = problem?.errors ? Object.values(problem.errors).flat() : [];
  if (details.length) return details.join(' ');
  return problem?.title ?? t('errors.somethingWentWrongStatus', { status: error.status });
}
