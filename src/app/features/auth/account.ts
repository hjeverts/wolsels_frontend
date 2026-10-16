import { Component, OnInit, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toDataURL } from 'qrcode';
import { filter, switchMap } from 'rxjs';
import { AuthError, AuthService } from '../../core/auth.service';
import { TranslatePipe, currentLanguage, switchLanguage, t } from '../../core/i18n/i18n';
import { LANGUAGES, Language } from '../../core/i18n/languages';
import { ConfirmService } from '../../shared/confirm.service';
import { MIN_PASSWORD_LENGTH, passwordsMatch } from './register';

type Setup = { sharedKey: string; qr: string };

@Component({
  selector: 'app-account',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(NonNullableFormBuilder);

  /** ?welkom=1 after sign-up: recommend 2FA. */
  readonly welkom = input<string>();

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly languages = LANGUAGES;
  protected readonly language = currentLanguage();
  protected readonly setup = signal<Setup | null>(null);
  protected readonly recoveryCodes = signal<string[] | null>(null);
  protected readonly twoFactorError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly codeForm = this.fb.group({ code: ['', [Validators.required, Validators.pattern(/^\s*\d{3}\s?\d{3}\s*$/)]] });
  protected readonly passwordForm = this.fb.group(
    {
      oldPassword: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  ngOnInit(): void {
    this.auth.loadMe().subscribe();
  }

  /** Step 1: get the key and show it as a QR code. */
  protected startSetup(): void {
    this.twoFactorError.set(null);
    this.auth.twoFactor().subscribe({
      next: async (state) => {
        const email = this.auth.user()?.email ?? '';
        const uri =
          `otpauth://totp/${encodeURIComponent('Wolsels:' + email)}` +
          `?secret=${state.sharedKey}&issuer=Wolsels&digits=6&period=30`;
        this.setup.set({ sharedKey: formatKey(state.sharedKey), qr: await toDataURL(uri, { width: 220, margin: 1 }) });
      },
      error: (e: unknown) => this.twoFactorError.set(message(e)),
    });
  }

  /** Step 2: check the code from the app and turn on 2FA. */
  protected enable(): void {
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.twoFactorError.set(null);
    this.auth.twoFactor({ enable: true, twoFactorCode: this.codeForm.getRawValue().code.replace(/\s/g, '') }).subscribe({
      next: (state) => {
        this.busy.set(false);
        this.setup.set(null);
        this.codeForm.reset();
        this.recoveryCodes.set(state.recoveryCodes);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.twoFactorError.set(message(e));
      },
    });
  }

  protected cancelSetup(): void {
    this.setup.set(null);
    this.codeForm.reset();
    this.twoFactorError.set(null);
  }

  protected newRecoveryCodes(): void {
    this.confirm
      .ask(t('account.newCodes'), t('account.newCodesConfirm'), t('account.newCodesButton'))
      .pipe(
        filter(Boolean),
        switchMap(() => this.auth.twoFactor({ resetRecoveryCodes: true })),
      )
      .subscribe({
        next: (state) => this.recoveryCodes.set(state.recoveryCodes),
        error: (e: unknown) => this.twoFactorError.set(message(e)),
      });
  }

  protected disable(): void {
    this.confirm
      .ask(
        t('account.disableTitle'),
        t('account.disableConfirm'),
        t('account.disable'),
      )
      .pipe(
        filter(Boolean),
        switchMap(() => this.auth.twoFactor({ resetSharedKey: true })),
      )
      .subscribe({
        next: () => {
          this.recoveryCodes.set(null);
          this.snackBar.open(t('account.disabled'), t('common.close'), { duration: 5000 });
        },
        error: (e: unknown) => this.twoFactorError.set(message(e)),
      });
  }

  protected downloadRecoveryCodes(): void {
    const codes = this.recoveryCodes();
    if (!codes) return;
    const text = `${t('account.codesFileHeader', { email: this.auth.user()?.email })}\n${t('account.codesFileNote')}\n\n${codes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t('account.codesFileName')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Saves the language in the profile and reloads the app in that language. */
  protected changeLanguage(language: Language): void {
    this.busy.set(true);
    this.auth.saveLanguage(language).subscribe({
      next: () => switchLanguage(language),
      error: () => this.busy.set(false),
    });
  }

  protected changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { oldPassword, password } = this.passwordForm.getRawValue();
    this.passwordError.set(null);
    this.auth.changePassword(oldPassword, password).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.snackBar.open(t('account.passwordChanged'), t('common.close'), { duration: 5000 });
      },
      error: (e: unknown) => this.passwordError.set(message(e)),
    });
  }
}

function formatKey(key: string): string {
  return key.match(/.{1,4}/g)?.join(' ') ?? key;
}

function message(e: unknown): string {
  return e instanceof AuthError ? e.message : t('errors.somethingWentWrong');
}
