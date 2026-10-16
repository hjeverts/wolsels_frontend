import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { currentLanguage, switchLanguage, t } from './i18n/i18n';
import { Language, isLanguage } from './i18n/languages';

export interface Me {
  email: string;
  twoFactorEnabled: boolean;
  recoveryCodesLeft: number;
  isAdmin: boolean;
  /** Language from the profile; null for an account that has no language yet. */
  language: string | null;
}

export interface TwoFactorState {
  sharedKey: string;
  recoveryCodesLeft: number;
  recoveryCodes: string[] | null;
  isTwoFactorEnabled: boolean;
  isMachineRemembered: boolean;
}

export type LoginResult = 'ok' | 'requiresTwoFactor';

/** Error when logging in or signing up, with a (translated) message for the form. */
export class AuthError extends Error {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  /** undefined = not known yet, null = not logged in. */
  readonly user = signal<Me | null | undefined>(undefined);
  readonly isLoggedIn = computed(() => !!this.user());

  loadMe(): Observable<Me | null> {
    return this.http.get<Me>('/api/auth/me').pipe(
      catchError(() => of(null)),
      tap((me) => {
        this.user.set(me);
        if (me) this.syncLanguage(me);
      }),
    );
  }

  /** Saves the language in the profile. */
  saveLanguage(language: Language): Observable<void> {
    return this.http.put<void>('/api/auth/language', { language });
  }

  /**
   * The profile language applies on every device: if it differs, the app is reloaded in that language. An
   * account without a language (just created) gets the language the app is currently in.
   */
  private syncLanguage(me: Me): void {
    if (!isLanguage(me.language)) this.saveLanguage(currentLanguage()).subscribe({ error: () => undefined });
    else if (me.language !== currentLanguage()) switchLanguage(me.language);
  }

  /** What is possible on the login pages: sign-up and "forgot password". */
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

  register(email: string, password: string, invite?: string): Observable<void> {
    const url = invite ? `/api/auth/register?invite=${encodeURIComponent(invite)}` : '/api/auth/register';
    return this.http.post<void>(url, { email, password }).pipe(
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

  /** Gets the 2FA status, or changes it. After a change the session is renewed. */
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
        throwError(() => new AuthError(error.status === 400 ? t('errors.wrongCodeTryNext') : problemMessage(error))),
      ),
    );
  }
}

function loginMessage(status: number, detail: string | undefined, withTwoFactor: boolean): string {
  if (status === 429) return t('errors.tooManyAttempts');
  if (status === 0) return t('errors.serverUnreachable');
  if (detail === 'LockedOut') return t('errors.lockedOut');
  if (withTwoFactor) return t('errors.wrongCode');
  return t('errors.wrongCredentials');
}

function problemMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return t('errors.serverUnreachable');
  if (error.status === 429) return t('errors.tooManyAttempts');
  const problem = error.error as { title?: string; errors?: Record<string, string[]> } | null;
  const details = problem?.errors ? Object.values(problem.errors).flat() : [];
  return details.length ? details.join(' ') : (problem?.title ?? t('errors.somethingWentWrong'));
}
