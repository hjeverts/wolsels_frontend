import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { HouseholdService } from '../../core/household.service';
import { InviteInfo } from '../../core/models';

@Component({
  selector: 'app-invite-page',
  imports: [DatePipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <mat-card appearance="outlined" class="card">
      <mat-card-content>
        <h1><mat-icon>mail</mat-icon> Uitnodiging</h1>
        @if (state() === 'loading') {
          <p class="muted">Even kijken…</p>
        } @else if (state() === 'invalid') {
          <p class="error">Deze uitnodiging is ongeldig, verlopen of al gebruikt. Vraag om een nieuwe link.</p>
          <div class="links"><a routerLink="/">Naar Wolsels</a></div>
        } @else if (info(); as i) {
          <p>
            <strong>{{ i.invitedBy }}</strong> nodigt je uit voor <strong>{{ i.householdName }}</strong>.
            Je ziet en bewerkt daarna samen dezelfde wol, mengsels, dieren en oogsten.
          </p>
          <p class="muted">Geldig tot {{ i.expiresAt | date: 'd MMM y' }}.</p>

          @if (auth.user(); as user) {
            <p class="muted">Ingelogd als {{ user.email }}. Je eigen huishouden en gegevens blijven gewoon bestaan.</p>
            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }
            <button mat-flat-button (click)="join()" [disabled]="busy()">Lid worden</button>
          } @else {
            <div class="choices">
              <a mat-flat-button [routerLink]="['/registreren']" [queryParams]="{ uitnodiging: token() }">Account aanmaken</a>
              <a mat-stroked-button [routerLink]="['/inloggen']" [queryParams]="{ terug: '/uitnodiging/' + token() }">
                Ik heb al een account
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
        this.error.set(e?.error?.title ?? 'Lid worden is niet gelukt.');
      },
    });
  }
}
