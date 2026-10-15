import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, switchMap } from 'rxjs';
import { HouseholdService } from '../../core/household.service';
import { Household, HouseholdMember } from '../../core/models';
import { ConfirmService } from '../../shared/confirm.service';

@Component({
  selector: 'app-household-page',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatTooltipModule,
  ],
  templateUrl: './household-page.html',
  styleUrl: './household-page.scss',
})
export class HouseholdPage implements OnInit {
  protected readonly households = inject(HouseholdService);
  private readonly confirm = inject(ConfirmService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly household = signal<Household | null>(null);
  protected readonly newInvite = signal<{ url: string; expiresAt: string } | null>(null);
  protected readonly editingName = signal(false);

  protected readonly nameForm = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(100)]] });
  protected readonly createForm = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(100)]] });

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.households.current().subscribe((h) => this.household.set(h));
  }

  protected startRename(): void {
    this.nameForm.reset({ name: this.household()?.name ?? '' });
    this.editingName.set(true);
  }

  protected rename(): void {
    if (this.nameForm.invalid) return;
    const name = this.nameForm.getRawValue().name.trim();
    this.households.rename(name).subscribe(() => {
      this.editingName.set(false);
      this.household.update((h) => (h ? { ...h, name } : h));
    });
  }

  protected invite(): void {
    this.households.createInvite().subscribe((invite) => {
      this.newInvite.set({ url: this.households.inviteUrl(invite.token), expiresAt: invite.expiresAt });
      this.reload();
    });
  }

  protected async copyInvite(): Promise<void> {
    const url = this.newInvite()?.url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.snackBar.open('Link gekopieerd.', undefined, { duration: 3000 });
    } catch {
      this.snackBar.open('Kopiëren lukte niet; selecteer de link en kopieer hem zelf.', 'Sluiten', { duration: 5000 });
    }
  }

  protected async shareInvite(): Promise<void> {
    const url = this.newInvite()?.url;
    if (!url || !('share' in navigator)) return;
    try {
      await navigator.share({ title: 'Uitnodiging voor Wolsels', text: `Doe mee met ${this.household()?.name}`, url });
    } catch {
      // Delen geannuleerd.
    }
  }

  protected readonly canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  protected revoke(id: number): void {
    this.households.revokeInvite(id).subscribe(() => {
      this.newInvite.set(null);
      this.reload();
    });
  }

  protected remove(member: HouseholdMember): void {
    this.confirm
      .ask(
        'Lid verwijderen',
        `${member.email} heeft daarna geen toegang meer tot ${this.household()?.name}. De gegevens blijven in het huishouden.`,
      )
      .pipe(
        filter(Boolean),
        switchMap(() => this.households.removeMember(member.userId)),
      )
      .subscribe(() => this.reload());
  }

  protected leave(): void {
    this.confirm
      .ask(
        'Huishouden verlaten',
        `Je hebt daarna geen toegang meer tot ${this.household()?.name}. De gegevens blijven voor de andere leden bewaard.`,
        'Verlaten',
      )
      .pipe(
        filter(Boolean),
        switchMap(() => this.households.leave()),
      )
      .subscribe(() => {
        this.households.forget();
        window.location.assign('/huishouden');
      });
  }

  protected create(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.households.create(this.createForm.getRawValue().name).subscribe((h) => this.households.switchTo(h.id, '/huishouden'));
  }
}
