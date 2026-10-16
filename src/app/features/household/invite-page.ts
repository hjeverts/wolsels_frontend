import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { HouseholdService } from '../../core/household.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { InviteInfo } from '../../core/models';

@Component({
  selector: 'app-invite-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, TranslatePipe],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1><mat-icon>mail</mat-icon> {{ 'invite.title' | t }}</h1>
        @if (state() === 'loading') {
          <p class="muted">{{ 'common.loading' | t }}</p>
        } @else if (state() === 'invalid') {
          <p class="error">{{ 'invite.invalid' | t }}</p>
          <div class="links"><a routerLink="/">{{ 'invite.toWolsels' | t }}</a></div>
        } @else if (info(); as i) {
          <p>
            {{ 'invite.invitedYou' | t: { name: i.invitedBy, household: i.householdName } }}
            {{ 'invite.explanation' | t }}
          </p>
          <p class="muted">{{ 'invite.validUntil' | t: { date: (i.expiresAt | date: 'd MMM y') } }}</p>

          @if (auth.user(); as user) {
            <p class="muted">{{ 'invite.loggedInAs' | t: { email: user.email } }}</p>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button (click)="join()" [disabled]="busy()">{{ 'invite.join' | t }}</button>
          } @else {
            <div class="choices">
              <a mat-flat-button [routerLink]="['/registreren']" [queryParams]="{ uitnodiging: token() }">{{ 'auth.createAccount' | t }}</a>
              <a mat-stroked-button [routerLink]="['/inloggen']" [queryParams]="{ terug: '/uitnodiging/' + token() }">
                {{ 'auth.haveAccount' | t }}
              </a>
            </div>
          }
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: '../auth/auth-card.scss',
  styles: `
    h1 {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .choices {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
  `,
})
export class InvitePage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly households = inject(HouseholdService);

  readonly token = input.required<string>();

  protected readonly state = signal<'loading' | 'invalid' | 'valid'>('loading');
  protected readonly info = signal<InviteInfo | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.auth.user() === undefined) this.auth.loadMe().subscribe();
    this.households.inviteInfo(this.token()).subscribe({
      next: (info) => {
        this.info.set(info);
        this.state.set('valid');
      },
      error: () => this.state.set('invalid'),
    });
  }

  protected join(): void {
    this.busy.set(true);
    this.error.set(null);
    this.households.join(this.token()).subscribe({
      next: (householdId) => this.households.switchTo(householdId),
      error: (e) => {
        this.busy.set(false);
        this.error.set(e?.error?.title ?? t('invite.joinFailed'));
      },
    });
  }
}
