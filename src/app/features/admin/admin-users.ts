import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs';
import { AdminService } from '../../core/admin.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { AdminUser } from '../../core/models';
import { ConfirmService } from '../../shared/confirm.service';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatTableModule, MatTooltipModule, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ 'admin.title' | t }}</h1>
    </div>
    <p class="muted">
      {{ 'admin.intro' | t }}
    </p>

    @if (resetLink(); as link) {
      <div class="reset-link">
        <p><strong>{{ 'admin.resetLinkFor' | t: { email: link.email } }}</strong> {{ 'admin.resetLinkNote' | t }}</p>
        <code>{{ link.url }}</code>
        <div class="form-actions start">
          <button mat-flat-button (click)="copy(link.url)"><mat-icon>content_copy</mat-icon> {{ 'common.copy' | t }}</button>
          <button mat-button (click)="resetLink.set(null)">{{ 'common.close' | t }}</button>
        </div>
      </div>
    }

    <div class="table-wrap">
      <table mat-table [dataSource]="users()">
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>{{ 'admin.account' | t }}</th>
          <td mat-cell *matCellDef="let u">
            {{ u.email }}
            @if (u.isYou) {
              <span class="muted">{{ 'common.you' | t }}</span>
            }
            <div class="badges">
              @if (u.isAdmin) {
                <span class="badge admin">{{ 'admin.isAdmin' | t }}</span>
              }
              @if (u.blocked) {
                <span class="badge blocked">{{ 'admin.blocked' | t }}</span>
              } @else if (u.lockedOutUntil) {
                <span class="badge blocked" [matTooltip]="'admin.lockedOutUntil' | t: { time: (u.lockedOutUntil | date: 'HH:mm') }">
                  {{ 'admin.lockedOut' | t }}
                </span>
              }
            </div>
          </td>
        </ng-container>
        <ng-container matColumnDef="twoFactor">
          <th mat-header-cell *matHeaderCellDef>2FA</th>
          <td mat-cell *matCellDef="let u">
            <mat-icon [class.on]="u.twoFactorEnabled" [matTooltip]="(u.twoFactorEnabled ? 'common.on' : 'common.off') | t">
              {{ u.twoFactorEnabled ? 'verified_user' : 'remove_moderator' }}
            </mat-icon>
          </td>
        </ng-container>
        <ng-container matColumnDef="households">
          <th mat-header-cell *matHeaderCellDef>{{ 'admin.households' | t }}</th>
          <td mat-cell *matCellDef="let u" class="muted">{{ u.households.join(', ') }}</td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u" class="num">
            <button mat-icon-button [matMenuTriggerFor]="menu" [attr.aria-label]="'common.actions' | t"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #menu="matMenu" xPosition="before">
              <button mat-menu-item (click)="createResetLink(u)">
                <mat-icon>password</mat-icon><span>{{ 'admin.passwordResetLink' | t }}</span>
              </button>
              @if (u.twoFactorEnabled) {
                <button mat-menu-item (click)="resetTwoFactor(u)">
                  <mat-icon>phonelink_erase</mat-icon><span>{{ 'admin.resetTwoFactor' | t }}</span>
                </button>
              }
              @if (!u.isYou) {
                <button mat-menu-item (click)="toggleBlock(u)">
                  <mat-icon>{{ u.blocked ? 'lock_open' : 'block' }}</mat-icon>
                  <span>{{ (u.blocked ? 'admin.unblock' : 'admin.block') | t }}</span>
                </button>
              }
              <button mat-menu-item (click)="toggleAdmin(u)">
                <mat-icon>{{ u.isAdmin ? 'remove_moderator' : 'admin_panel_settings' }}</mat-icon>
                <span>{{ (u.isAdmin ? 'admin.revokeAdmin' : 'admin.makeAdmin') | t }}</span>
              </button>
              @if (!u.isYou) {
                <mat-divider />
                <button mat-menu-item (click)="remove(u)"><mat-icon>delete</mat-icon><span>{{ 'admin.deleteAccount' | t }}</span></button>
              }
            </mat-menu>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let u; columns: columns"></tr>
      </table>
    </div>
  `,
  styles: `
    .badges {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }
    .badge {
      font: var(--mat-sys-label-small);
      padding: 1px 8px;
      border-radius: 10px;
      &.admin {
        background: var(--mat-sys-primary-container);
        color: var(--mat-sys-on-primary-container);
      }
      &.blocked {
        background: var(--mat-sys-error-container);
        color: var(--mat-sys-on-error-container);
      }
    }
    mat-icon.on {
      color: var(--mat-sys-primary);
    }
    .reset-link {
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      background: var(--mat-sys-surface-container);
      code {
        display: block;
        word-break: break-all;
        user-select: all;
      }
    }
    .form-actions.start {
      justify-content: flex-start;
    }
  `,
})
export class AdminUsers {
  private readonly admin = inject(AdminService);
  private readonly confirm = inject(ConfirmService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['email', 'twoFactor', 'households', 'actions'];
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly resetLink = signal<{ email: string; url: string } | null>(null);

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.admin.users().subscribe((u) => this.users.set(u));
  }

  protected createResetLink(user: AdminUser): void {
    this.admin.passwordResetUrl(user.id).subscribe((url) => this.resetLink.set({ email: user.email, url }));
  }

  protected resetTwoFactor(user: AdminUser): void {
    this.confirm
      .ask(t('admin.resetTwoFactor'), t('admin.resetTwoFactorConfirm', { email: user.email }), t('admin.reset'))
      .pipe(filter(Boolean), switchMap(() => this.admin.resetTwoFactor(user.id)))
      .subscribe(() => this.done(t('admin.twoFactorReset')));
  }

  protected toggleBlock(user: AdminUser): void {
    const block = !user.blocked;
    this.confirm
      .ask(
        t(block ? 'admin.blockTitle' : 'admin.unblockTitle'),
        t(block ? 'admin.blockConfirm' : 'admin.unblockConfirm', { email: user.email }),
        t(block ? 'admin.block' : 'admin.unblock'),
      )
      .pipe(filter(Boolean), switchMap(() => this.admin.block(user.id, block)))
      .subscribe(() => this.done(t(block ? 'admin.accountBlocked' : 'admin.accountUnblocked')));
  }

  protected toggleAdmin(user: AdminUser): void {
    this.admin.setAdmin(user.id, !user.isAdmin).subscribe(() => this.done(t(user.isAdmin ? 'admin.adminRevoked' : 'admin.adminGranted')));
  }

  protected remove(user: AdminUser): void {
    this.admin
      .deletePreview(user.id)
      .pipe(
        switchMap((preview) => {
          const lost = preview.householdsDeleted;
          const detail = lost.length
            ? t('admin.deleteAlsoHouseholds', {
                count: lost.length,
                households: lost.map((h) => t('admin.householdItems', { name: h.name, count: h.items })).join(', '),
                email: user.email,
              })
            : t('admin.deleteSharedRemain');
          return this.confirm.ask(t('admin.deleteAccount'), `${t('admin.deleteConfirm', { email: user.email })} ${detail}`);
        }),
        filter(Boolean),
        switchMap(() => this.admin.delete(user.id)),
      )
      .subscribe(() => this.done(t('admin.accountDeleted')));
  }

  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open(t('common.copied'), undefined, { duration: 3000 });
    } catch {
      this.snackBar.open(t('common.copyFailed'), t('common.close'), { duration: 5000 });
    }
  }

  private done(message: string): void {
    this.snackBar.open(message, undefined, { duration: 3000 });
    this.reload();
  }
}
