import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { HouseholdService } from './household.service';

/**
 * Toont fouten van de API (ProblemDetails) als melding. Een verlopen sessie stuurt naar de inlogpagina.
 * Fouten van /api/auth worden door de formulieren zelf getoond.
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
        // Het bewaarde huishouden is niet (meer) van jou, bv. omdat je bent verwijderd.
        households.forget();
        snackBar.open('Je hebt geen toegang (meer) tot dat huishouden.', 'Sluiten', { duration: 6000 });
        households.load().subscribe(() => router.navigate(['/voorraad']));
        return throwError(() => error);
      }
      if (error.status === 401) {
        if (auth.user()) snackBar.open('Je sessie is verlopen. Log opnieuw in.', 'Sluiten', { duration: 6000 });
        auth.user.set(null);
        router.navigate(['/inloggen'], { queryParams: { terug: router.url } });
      } else {
        snackBar.open(describe(error), 'Sluiten', { duration: 8000 });
      }
      return throwError(() => error);
    }),
  );
};

function describe(error: HttpErrorResponse): string {
  if (error.status === 0) return 'De server is niet bereikbaar.';
  // Door nginx geweigerd, dus zonder ProblemDetails.
  if (error.status === 413) return 'Dit bestand is te groot om te uploaden.';
  const problem = error.error as { title?: string; errors?: Record<string, string[]> } | null;
  const details = problem?.errors ? Object.values(problem.errors).flat() : [];
  if (details.length) return details.join(' ');
  return problem?.title ?? `Er ging iets mis (${error.status}).`;
}
