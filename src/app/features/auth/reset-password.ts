import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AuthError, AuthService } from '../../core/auth.service';
import { MIN_PASSWORD_LENGTH, passwordsMatch } from './register';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1>Nieuw wachtwoord</h1>
        @if (!email() || !code()) {
          <p class="error">Deze link is onvolledig. Open de link uit de mail opnieuw, of vraag een nieuwe aan.</p>
          <div class="links"><a routerLink="/wachtwoord-vergeten">Nieuwe link aanvragen</a></div>
        } @else if (done()) {
          <p class="success" role="status">Je wachtwoord is gewijzigd. Je kunt nu inloggen.</p>
          <div class="links"><a routerLink="/inloggen">Naar inloggen</a></div>
        } @else {
          <p class="muted">Voor {{ email() }}</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field subscriptSizing="dynamic">
              <mat-label>Nieuw wachtwoord</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" required />
              <mat-hint>Minimaal {{ minLength }} tekens.</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Nieuw wachtwoord herhalen</mat-label>
              <input matInput type="password" formControlName="confirm" autocomplete="new-password" required />
            </mat-form-field>
            @if (form.hasError('mismatch') && form.controls.confirm.touched) {
              <p class="error">De wachtwoorden zijn niet gelijk.</p>
            }
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">Wachtwoord opslaan</button>
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
        this.error.set(e instanceof AuthError ? e.message : 'Er ging iets mis.');
      },
    });
  }
}
