import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';

import { filter, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { Location } from '../../core/models';
import { ConfirmService } from '../../shared/confirm.service';
import { emptyToNull } from '../../shared/form-utils';

@Component({
  selector: 'app-location-list',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'nav.locations' | t }}</h1>
    </div>
    <p class="muted">
      {{ 'locations.intro' | t }}
    </p>

    <mat-card appearance="outlined" class="section">
      <mat-card-content>
        <h2 class="section-title">{{ (editingId() ? 'locations.edit' : 'locations.new') | t }}</h2>
        <form [formGroup]="form" (ngSubmit)="save()" class="form-grid">
          <mat-form-field>
            <mat-label>{{ 'common.name' | t }}</mat-label>
            <input matInput formControlName="name" required [placeholder]="'locations.namePlaceholder' | t" />
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'common.notes' | t }}</mat-label>
            <input matInput formControlName="notes" />
          </mat-form-field>
          <div class="form-actions span-all">
            @if (editingId()) {
              <button mat-button type="button" (click)="cancel()">{{ 'common.cancel' | t }}</button>
            }
            <button mat-flat-button type="submit">{{ (editingId() ? 'common.save' : 'common.add') | t }}</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (locations(); as all) {
      @if (all.length) {
        <mat-list>
          @for (l of all; track l.id) {
            <mat-list-item>
              <mat-icon matListItemIcon>location_on</mat-icon>
              <span matListItemTitle>{{ l.name }}</span>
              <span matListItemLine class="muted">
                {{ 'locations.activeAnimals' | t: { count: l.animalCount } }}{{ l.notes ? ' · ' + l.notes : '' }}
              </span>
              <span matListItemMeta>
                <button mat-icon-button (click)="edit(l)" [attr.aria-label]="'common.edit' | t"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button (click)="remove(l)" [attr.aria-label]="'common.delete' | t"><mat-icon>delete</mat-icon></button>
              </span>
            </mat-list-item>
          }
        </mat-list>
      } @else {
        <div class="empty">{{ 'locations.empty' | t }}</div>
      }
    }
  `,
})
export class LocationList {
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly locations = signal<Location[] | null>(null);
  protected readonly editingId = signal<number | null>(null);
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    notes: [''],
  });

  constructor() {
    this.reload();
  }

  private reload(): void {
    this.api.locations.list().subscribe((l) => this.locations.set(l));
  }

  protected edit(location: Location): void {
    this.editingId.set(location.id);
    this.form.reset({ name: location.name, notes: location.notes ?? '' });
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.form.reset();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.api.locations.save(this.editingId(), { name: v.name, notes: emptyToNull(v.notes) }).subscribe(() => {
      this.cancel();
      this.reload();
    });
  }

  protected remove(location: Location): void {
    this.confirm
      .ask(t('locations.deleteTitle'), t('common.deleteConfirm', { name: location.name }))
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.locations.delete(location.id)),
      )
      .subscribe(() => this.reload());
  }
}
