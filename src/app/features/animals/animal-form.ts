import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { Harvest } from '../../core/models';
import { ConfirmService } from '../../shared/confirm.service';
import { emptyToNull } from '../../shared/form-utils';
import { GramsPipe } from '../../shared/grams.pipe';

const species = () => [t('animals.rabbit'), t('animals.sheep'), 'Alpaca', t('animals.llama'), t('animals.goat')];
const breeds = () => [
  t('animals.germanAngora'),
  t('animals.frenchAngora'),
  t('animals.englishAngora'),
  t('animals.satinAngora'),
  t('animals.giantAngora'),
];

@Component({
  selector: 'app-animal-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    GramsPipe,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ (id() ? 'animals.edit' : 'animals.add') | t }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="form-grid">
        <mat-form-field>
          <mat-label>{{ 'common.name' | t }}</mat-label>
          <input matInput formControlName="name" required />
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'animals.species' | t }}</mat-label>
          <input matInput formControlName="species" [matAutocomplete]="species" required />
          <mat-autocomplete #species>
            @for (s of speciesOptions; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'animals.breed' | t }}</mat-label>
          <input matInput formControlName="breed" [matAutocomplete]="breeds" />
          <mat-autocomplete #breeds>
            @for (b of breedOptions; track b) {
              <mat-option [value]="b">{{ b }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'wools.color' | t }}</mat-label>
          <input matInput formControlName="color" />
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'animals.birthDate' | t }}</mat-label>
          <input matInput type="date" formControlName="birthDate" />
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'harvest.location' | t }}</mat-label>
          <mat-select formControlName="locationId">
            <mat-option [value]="null">–</mat-option>
            @for (l of locations(); track l.id) {
              <mat-option [value]="l.id">{{ l.name }}</mat-option>
            }
          </mat-select>
          <mat-hint><a routerLink="/locaties">{{ 'animals.manageLocations' | t }}</a></mat-hint>
        </mat-form-field>

        <mat-form-field class="span-all">
          <mat-label>{{ 'common.notes' | t }}</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </div>

      <mat-slide-toggle formControlName="active">{{ 'animals.active' | t }}</mat-slide-toggle>

      <div class="form-actions">
        @if (id()) {
          <button mat-button type="button" (click)="remove()"><mat-icon>delete</mat-icon> {{ 'common.delete' | t }}</button>
        }
        <span class="spacer"></span>
        <a mat-button routerLink="/dieren">{{ 'common.cancel' | t }}</a>
        <button mat-flat-button type="submit" [disabled]="saving()">{{ 'common.save' | t }}</button>
      </div>
    </form>

    @if (id()) {
      <div class="page-header harvest-header">
        <h2 class="section-title">{{ 'production.harvests' | t }}</h2>
        <a mat-stroked-button routerLink="/productie/nieuw"><mat-icon>add</mat-icon> {{ 'production.register' | t }}</a>
      </div>
      @if (harvests().length) {
        <div class="table-wrap">
          <table mat-table [dataSource]="harvests()">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | t }}</th>
              <td mat-cell *matCellDef="let h">{{ h.date | date: 'd MMM y' }}</td>
            </ng-container>
            <ng-container matColumnDef="method">
              <th mat-header-cell *matHeaderCellDef>{{ 'harvest.method' | t }}</th>
              <td mat-cell *matCellDef="let h" class="muted">{{ h.method }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef class="num">{{ 'common.weight' | t }}</th>
              <td mat-cell *matCellDef="let h" class="num">{{ h.weightGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['date', 'method', 'weight']"></tr>
            <tr mat-row *matRowDef="let h; columns: ['date', 'method', 'weight']" class="clickable"
              [routerLink]="['/productie', h.id]"></tr>
          </table>
        </div>
      } @else {
        <div class="empty">{{ 'animals.noHarvests' | t }}</div>
      }
    }
  `,
  styles: `
    .harvest-header {
      margin-top: 32px;
    }
  `,
})
export class AnimalForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();

  protected readonly speciesOptions = species();
  protected readonly breedOptions = breeds();
  protected readonly locations = toSignal(this.api.locations.list(), { initialValue: [] });
  protected readonly harvests = signal<Harvest[]>([]);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    species: [t('animals.rabbit'), [Validators.required, Validators.maxLength(100)]],
    breed: [''],
    color: [''],
    birthDate: this.fb.control<string | null>(null),
    locationId: this.fb.control<number | null>(null),
    active: [true],
    notes: [''],
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    this.api.animals.get(+id).subscribe((a) =>
      this.form.reset({
        name: a.name,
        species: a.species,
        breed: a.breed ?? '',
        color: a.color ?? '',
        birthDate: a.birthDate,
        locationId: a.locationId,
        active: a.active,
        notes: a.notes ?? '',
      }),
    );
    this.api.harvests.list({ animalId: +id }).subscribe((h) => this.harvests.set(h));
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.animals
      .save(this.id() ? +this.id()! : null, {
        name: v.name,
        species: v.species,
        breed: emptyToNull(v.breed),
        color: emptyToNull(v.color),
        birthDate: v.birthDate || null,
        locationId: v.locationId,
        active: v.active,
        notes: emptyToNull(v.notes),
      })
      .subscribe({
        next: () => this.router.navigate(['/dieren']),
        error: () => this.saving.set(false),
      });
  }

  protected remove(): void {
    this.confirm
      .ask(t('animals.deleteTitle'), t('common.deleteConfirm', { name: this.form.controls.name.value }))
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.animals.delete(+this.id()!)),
      )
      .subscribe(() => this.router.navigate(['/dieren']));
  }
}
