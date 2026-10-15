import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

export interface Me {
  email: string;
  twoFactorEnabled: boolean;
  recoveryCodesLeft: number;
}

export interface TwoFactorState {
  sharedKey: string;
  recoveryCodesLeft: number;
  recoveryCodes: string[] | null;
  isTwoFactorEnabled: boolean;
  isMachineRemembered: boolean;
}

export type LoginResult = 'ok' | 'requiresTwoFactor';

/** Fout bij inloggen of registreren, met een Nederlandse melding voor in het formulier. */
export class AuthError extends Error {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** undefined = nog niet bekend, null = niet ingelogd. */
  readonly user = signal<Me | null | undefined>(undefined);
  readonly isLoggedIn = computed(() => !!this.user());

  loadMe(): Observable<Me | null> {
    return this.http.get<Me>('/api/auth/me').pipe(
      catchError(() => of(null)),
      tap((me) => this.user.set(me)),
    );
  }

  /** Wat er mogelijk is op de inlogpagina's; noemt registreren en "wachtwoord vergeten". */
  allowRegistration(): Observable<{ allowRegistration: boolean; passwordResetAvailable: boolean }> {
    return this.http.get<{ allowRegistration: boolean; passwordResetAvailable: boolean }>('/api/auth/options');
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>('/api/auth/password/forgot', { email }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new AuthError(problemMessage(error)))),
    );
  }

  resetPassword(email: string, code: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/auth/password/reset', { email, code, newPassword }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new AuthError(problemMessage(error)))),
    );
  }

  login(email: string, password: string, twoFactor?: { code?: string; recoveryCode?: string }): Observable<LoginResult> {
    return this.http
      .post('/api/auth/login?useCookies=true', {
        email,
        password,
        twoFactorCode: twoFactor?.code || undefined,
        twoFactorRecoveryCode: twoFactor?.recoveryCode || undefined,
      })
      .pipe(
        switchMap(() => this.loadMe()),
        map((): LoginResult => 'ok'),
        catchError((error: HttpErrorResponse) => {
          const detail = (error.error as { detail?: string } | null)?.detail;
          if (detail === 'RequiresTwoFactor') return of<LoginResult>('requiresTwoFactor');
          return throwError(() => new AuthError(loginMessage(error.status, detail, !!twoFactor)));
        }),
      );
  }

  register(email: string, password: string): Observable<void> {
    return this.http.post<void>('/api/auth/register', { email, password }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new AuthError(problemMessage(error)))),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.user.set(null)),
    );
  }

  changePassword(oldPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>('/api/auth/password', { oldPassword, newPassword }).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => new AuthError(problemMessage(error)))),
    );
  }

  /** Haalt de 2FA-status op, of wijzigt die. Na een wijziging wordt de sessie vernieuwd. */
  twoFactor(request: {
    enable?: boolean;
    twoFactorCode?: string;
    resetSharedKey?: boolean;
    resetRecoveryCodes?: boolean;
  } = {}): Observable<TwoFactorState> {
    const changes = Object.keys(request).length > 0;
    return this.http.post<TwoFactorState>('/api/auth/manage/2fa', request).pipe(
      switchMap((state) =>
        changes
          ? this.http.post('/api/auth/renew', {}).pipe(
              switchMap(() => this.loadMe()),
              map(() => state),
            )
          : of(state),
      ),
      catchError((error: HttpErrorResponse) =>
        throwError(() => new AuthError(error.status === 400 ? 'De code klopt niet. Probeer de volgende code uit je app.' : problemMessage(error))),
      ),
    );
  }
}

function loginMessage(status: number, detail: string | undefined, withTwoFactor: boolean): string {
  if (status === 429) return 'Te veel pogingen. Wacht een minuut en probeer het opnieuw.';
  if (status === 0) return 'De server is niet bereikbaar.';
  if (detail === 'LockedOut') return 'Te veel mislukte pogingen. Je account is 5 minuten geblokkeerd.';
  if (withTwoFactor) return 'De code klopt niet.';
  return 'Onjuist e-mailadres of wachtwoord.';
}

function problemMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'De server is niet bereikbaar.';
  if (error.status === 429) return 'Te veel pogingen. Wacht een minuut en probeer het opnieuw.';
  const problem = error.error as { title?: string; errors?: Record<string, string[]> } | null;
  const details = problem?.errors ? Object.values(problem.errors).flat() : [];
  return details.length ? details.join(' ') : (problem?.title ?? 'Er ging iets mis.');
}
