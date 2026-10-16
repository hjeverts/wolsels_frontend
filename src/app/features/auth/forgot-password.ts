import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthError, AuthService } from '../../core/auth.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, TranslatePipe],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1>{{ 'forgot.title' | t }}</h1>
        @if (sent()) {
          <p class="success" role="status">
            {{ 'forgot.sent' | t }}
          </p>
        } @else {
          <p class="muted">{{ 'forgot.intro' | t }}</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field>
              <mat-label>{{ 'auth.email' | t }}</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" required />
            </mat-form-field>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">{{ 'forgot.submit' | t }}</button>
          </form>
        }
        <div class="links"><a routerLink="/inloggen">{{ 'auth.backToLogin' | t }}</a></div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth-card.scss',
})
export class ForgotPassword {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => this.sent.set(true),
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e instanceof AuthError ? e.message : t('errors.somethingWentWrong'));
      },
    });
  }
}
