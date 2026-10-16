import { Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthError, AuthService } from '../../core/auth.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { HouseholdService } from '../../core/household.service';

export const MIN_PASSWORD_LENGTH = 10;

export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1>{{ 'auth.createAccount' | t }}</h1>
        @if (allowed() === false && !uitnodiging()) {
          <p class="muted">{{ 'register.disabled' | t }}</p>
          <div class="links"><a routerLink="/inloggen">{{ 'auth.toLogin' | t }}</a></div>
        } @else {
          @if (uitnodiging()) {
            <p class="muted">{{ 'register.withInvite' | t }}</p>
          } @else {
            <p class="muted">{{ 'register.privacy' | t }}</p>
          }
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field>
              <mat-label>{{ 'auth.email' | t }}</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" required />
            </mat-form-field>
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ 'auth.password' | t }}</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" required />
              <mat-hint>{{ 'register.passwordHint' | t: { min: minLength } }}</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'register.confirmPassword' | t }}</mat-label>
              <input matInput type="password" formControlName="confirm" autocomplete="new-password" required />
            </mat-form-field>
            @if (form.hasError('mismatch') && form.controls.confirm.touched) {
              <p class="error">{{ 'auth.passwordsDiffer' | t }}</p>
            }
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">{{ 'auth.createAccount' | t }}</button>
          </form>
          <div class="links"><a routerLink="/inloggen">{{ 'auth.haveAccount' | t }}</a></div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth-card.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly households = inject(HouseholdService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Token from an invitation link (?uitnodiging=...). */
  readonly uitnodiging = input<string>();

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly allowed = toSignal(
    this.auth.allowRegistration().pipe(
      map((o) => o.allowRegistration),
      catchError(() => of(null)),
    ),
  );

  protected readonly form = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.password.hasError('minlength'))
        this.error.set(t('auth.passwordTooShort', { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    const invite = this.uitnodiging();
    this.auth
      .register(email, password, invite)
      .pipe(
        switchMap(() => this.auth.login(email, password)),
        switchMap(() => (invite ? this.households.join(invite) : of(null))),
      )
      .subscribe({
        next: (householdId) =>
          householdId ? this.households.switchTo(householdId, '/account?welkom=1') : this.router.navigateByUrl('/account?welkom=1'),
        error: (e: unknown) => {
          this.busy.set(false);
          this.error.set(e instanceof AuthError ? e.message : t('errors.somethingWentWrong'));
        },
      });
  }
}
