import { Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthError, AuthService } from '../../core/auth.service';
import { safeReturnUrl } from './return-url';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1>Inloggen</h1>

        @if (step() === 'password') {
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field>
              <mat-label>E-mailadres</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" required />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Wachtwoord</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" required />
            </mat-form-field>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">Inloggen</button>
          </form>
          <div class="links">
            @if (options()?.allowRegistration) {
              <a routerLink="/registreren">Account aanmaken</a>
            }
            @if (options()?.passwordResetAvailable) {
              <a routerLink="/wachtwoord-vergeten">Wachtwoord vergeten?</a>
            }
          </div>
        } @else {
          <p class="muted">
            @if (useRecovery()) {
              Vul een van je herstelcodes in. Elke code werkt maar één keer.
            } @else {
              Vul de 6-cijferige code uit je authenticator-app in.
            }
          </p>
          <form [formGroup]="codeForm" (ngSubmit)="submit()">
            <mat-form-field>
              <mat-label>{{ useRecovery() ? 'Herstelcode' : 'Code' }}</mat-label>
              <mat-icon matPrefix>{{ useRecovery() ? 'key' : 'phonelink_lock' }}</mat-icon>
              <input matInput formControlName="code" autocomplete="one-time-code"
                [attr.inputmode]="useRecovery() ? null : 'numeric'" required />
            </mat-form-field>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="busy()">Verifiëren</button>
          </form>
          <div class="links">
            <a href="" (click)="$event.preventDefault(); toggleRecovery()">
              {{ useRecovery() ? 'Code uit de app gebruiken' : 'Geen toegang tot je app? Gebruik een herstelcode' }}
            </a>
            <a href="" (click)="$event.preventDefault(); back()">Terug</a>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './auth-card.scss',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Pagina waar de gebruiker naartoe wilde (uit ?terug=). */
  readonly terug = input<string>();

  protected readonly step = signal<'password' | 'code'>('password');
  protected readonly useRecovery = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly options = toSignal(
    this.auth.allowRegistration().pipe(catchError(() => of(null))),
  );

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly codeForm = this.fb.group({ code: ['', Validators.required] });

  protected submit(): void {
    const form = this.step() === 'password' ? this.form : this.codeForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    const code = this.codeForm.getRawValue().code.replace(/\s/g, '');
    const twoFactor = this.step() === 'code' ? (this.useRecovery() ? { recoveryCode: code } : { code }) : undefined;

    this.busy.set(true);
    this.error.set(null);
    this.auth.login(email, password, twoFactor).subscribe({
      next: (result) => {
        this.busy.set(false);
        if (result === 'requiresTwoFactor') {
          this.step.set('code');
        } else {
          this.router.navigateByUrl(safeReturnUrl(this.terug()));
        }
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(e instanceof AuthError ? e.message : 'Er ging iets mis.');
        this.codeForm.reset();
      },
    });
  }

  protected toggleRecovery(): void {
    this.useRecovery.update((v) => !v);
    this.codeForm.reset();
    this.error.set(null);
  }

  protected back(): void {
    this.step.set('password');
    this.useRecovery.set(false);
    this.codeForm.reset();
    this.form.controls.password.reset();
    this.error.set(null);
  }
}
