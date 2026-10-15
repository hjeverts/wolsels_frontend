import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthError, AuthService } from '../../core/auth.service';

export const MIN_PASSWORD_LENGTH = 10;

export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1>Account aanmaken</h1>
        @if (allowed() === false) {
          <p class="muted">Registreren is uitgeschakeld. Vraag de beheerder om een account.</p>
          <div class="links"><a routerLink="/inloggen">Naar inloggen</a></div>
        } @else {
          <p class="muted">Je gegevens zijn alleen voor jou zichtbaar.</p>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field>
              <mat-label>E-mailadres</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" required />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Wachtwoord</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" required />
              <mat-hint>Minimaal {{ minLength }} tekens. Een zin van een paar woorden is sterk en makkelijk te onthouden.</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Wachtwoord herhalen</mat-label>
              <input matInput type="password" formControlName="confirm" autocomplete="new-password" required />
            </mat-form-field>
            @if (form.hasError('mismatch') && form.controls.confirm.touched) {
              <p class="error">De wachtwoorden zijn niet gelijk.</p>
            }
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">Account aanmaken</button>
          </form>
          <div class="links"><a routerLink="/inloggen">Ik heb al een account</a></div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth-card.scss',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

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
        this.error.set(`Het wachtwoord moet minimaal ${MIN_PASSWORD_LENGTH} tekens lang zijn.`);
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth
      .register(email, password)
      .pipe(switchMap(() => this.auth.login(email, password)))
      .subscribe({
        next: () => this.router.navigateByUrl('/account?welkom=1'),
        error: (e: unknown) => {
          this.busy.set(false);
          this.error.set(e instanceof AuthError ? e.message : 'Er ging iets mis.');
        },
      });
  }
}
