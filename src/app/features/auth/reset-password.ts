import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthError, AuthService } from '../../core/auth.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { MIN_PASSWORD_LENGTH, passwordsMatch } from './register';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1>{{ 'reset.title' | t }}</h1>
        @if (!email() || !code()) {
          <p class="error">{{ 'reset.incomplete' | t }}</p>
          <div class="links"><a routerLink="/wachtwoord-vergeten">{{ 'reset.requestNew' | t }}</a></div>
        } @else if (done()) {
          <p class="success" role="status">{{ 'reset.done' | t }}</p>
          <div class="links"><a routerLink="/inloggen">{{ 'auth.toLogin' | t }}</a></div>
        } @else {
          <p class="muted">{{ 'reset.for' | t: { email: email() } }}</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>{{ 'auth.newPassword' | t }}</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" required />
              <mat-hint>{{ 'auth.minLength' | t: { min: minLength } }}</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'auth.confirmNewPassword' | t }}</mat-label>
              <input matInput type="password" formControlName="confirm" autocomplete="new-password" required />
            </mat-form-field>
            @if (form.hasError('mismatch') && form.controls.confirm.touched) {
              <p class="error">{{ 'auth.passwordsDiffer' | t }}</p>
            }
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">{{ 'reset.submit' | t }}</button>
          </form>
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth-card.scss',
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly email = input<string>();
  readonly code = input<string>();

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.resetPassword(this.email()!, this.code()!, this.form.getRawValue().password).subscribe({
      next: () => this.done.set(true),
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e instanceof AuthError ? e.message : t('errors.somethingWentWrong'));
      },
    });
  }
}
