import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { filter, forkJoin, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Animal, Location } from '../../core/models';
import { HARVEST_GRADES, HARVEST_METHODS } from '../../core/yarn';
import { ConfirmService } from '../../shared/confirm.service';
import { emptyToNull, toNumber, today } from '../../shared/form-utils';

type Source = 'animal' | 'location';

@Component({
  selector: 'app-harvest-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <div class="page-header">
      <h1>{{ id() ? 'Oogst bewerken' : 'Oogst registreren' }}</h1>
    </div>

    @if (loaded()) {
      @if (!animals().length && !locations().length) {
        <div class="empty">
          Je hebt nog geen dieren of locaties. Maak eerst een <a routerLink="/dieren/nieuw">dier</a> of een
          <a routerLink="/locaties">locatie</a> aan.
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="source-toggle">
            <span class="muted">Geoogst van</span>
            <mat-button-toggle-group formControlName="source" aria-label="Bron" hideSingleSelectionIndicator>
              <mat-button-toggle value="animal" [disabled]="!animals().length"><mat-icon>cruelty_free</mat-icon> Dier</mat-button-toggle>
              <mat-button-toggle value="location" [disabled]="!locations().length"><mat-icon>location_on</mat-icon> Locatie</mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <div class="form-grid">
            @if (source() === 'animal') {
              <mat-form-field>
                <mat-label>Dier</mat-label>
                <mat-select formControlName="animalId" required>
                  @for (a of selectableAnimals(); track a.id) {
                    <mat-option [value]="a.id">
                      {{ a.name }} <span class="muted">· {{ a.breed ?? a.species }}{{ a.active ? '' : ' (inactief)' }}</span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else {
              <mat-form-field>
                <mat-label>Locatie</mat-label>
                <mat-select formControlName="locationId" required>
                  @for (l of locations(); track l.id) {
                    <mat-option [value]="l.id">{{ l.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <mat-form-field>
              <mat-label>Datum</mat-label>
              <input matInput type="date" formControlName="date" required />
            </mat-form-field>

            <mat-form-field>
              <mat-label>Gewicht ruwe wol</mat-label>
              <input matInput type="number" min="0.1" step="0.1" formControlName="weightGrams" required />
              <span matTextSuffix>g</span>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Methode</mat-label>
              <input matInput formControlName="method" [matAutocomplete]="methods" />
              <mat-autocomplete #methods>
                @for (m of methodOptions; track m) {
                  <mat-option [value]="m">{{ m }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Kwaliteit</mat-label>
              <input matInput formControlName="grade" [matAutocomplete]="grades" />
              <mat-autocomplete #grades>
                @for (g of gradeOptions; track g) {
                  <mat-option [value]="g">{{ g }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>

            <mat-form-field class="span-all">
              <mat-label>Notities</mat-label>
              <textarea matInput formControlName="notes" rows="3"></textarea>
            </mat-form-field>
          </div>

          @if (!id()) {
            <mat-checkbox formControlName="addToStock">Direct als partij aan de wolvoorraad toevoegen</mat-checkbox>
          } @else if (woolId()) {
            <p class="muted">
              <mat-icon inline>inventory_2</mat-icon> Deze oogst is toegevoegd aan de
              <a [routerLink]="['/voorraad', woolId()]">voorraad</a>.
            </p>
          }

          <div class="form-actions">
            @if (id()) {
              <button mat-button type="button" (click)="remove()"><mat-icon>delete</mat-icon> Verwijderen</button>
            }
            <span class="spacer"></span>
            <a mat-button routerLink="/productie">Annuleren</a>
            <button mat-flat-button type="submit" [disabled]="saving()">Opslaan</button>
          </div>
        </form>
      }
    }
  `,
  styles: `
    .source-toggle {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
  `,
})
export class HarvestForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();

  protected readonly methodOptions = HARVEST_METHODS;
  protected readonly gradeOptions = HARVEST_GRADES;
  protected readonly animals = signal<Animal[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly loaded = signal(false);
  protected readonly saving = signal(false);
  protected readonly woolId = signal<number | null>(null);

  protected readonly form = this.fb.group({
    source: this.fb.control<Source>('animal'),
    animalId: this.fb.control<number | null>(null),
    locationId: this.fb.control<number | null>(null),
    date: [today(), Validators.required],
    weightGrams: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.1)]),
    method: [''],
    grade: [''],
    notes: [''],
    addToStock: [false],
  });

  protected readonly source = toSignal(this.form.controls.source.valueChanges, { initialValue: 'animal' as Source });
  private readonly animalIdValue = toSignal(this.form.controls.animalId.valueChanges, { initialValue: null });

  /** Actieve dieren, plus het huidige dier als dat inmiddels inactief is. */
  protected readonly selectableAnimals = computed(() =>
    this.animals().filter((a) => a.active || a.id === this.animalIdValue()),
  );

  ngOnInit(): void {
    forkJoin([this.api.animals.list(), this.api.locations.list()]).subscribe(([animals, locations]) => {
      this.animals.set(animals);
      this.locations.set(locations);
      if (!animals.some((a) => a.active) && locations.length) this.form.controls.source.setValue('location');

      const id = this.id();
      if (!id) {
        this.loaded.set(true);
        return;
      }
      this.api.harvests.get(+id).subscribe((h) => {
        this.form.reset({
          source: h.animalId ? 'animal' : 'location',
          animalId: h.animalId,
          locationId: h.locationId,
          date: h.date,
          weightGrams: h.weightGrams,
          method: h.method ?? '',
          grade: h.grade ?? '',
          notes: h.notes ?? '',
          addToStock: false,
        });
        this.woolId.set(h.woolId);
        this.loaded.set(true);
      });
    });
  }

  protected save(): void {
    const v = this.form.getRawValue();
    const sourceId = v.source === 'animal' ? v.animalId : v.locationId;
    if (this.form.invalid || !sourceId) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.api.harvests
      .save(this.id() ? +this.id()! : null, {
        date: v.date,
        animalId: v.source === 'animal' ? v.animalId : null,
        locationId: v.source === 'location' ? v.locationId : null,
        weightGrams: toNumber(v.weightGrams)!,
        method: emptyToNull(v.method),
        grade: emptyToNull(v.grade),
        notes: emptyToNull(v.notes),
        addToStock: v.addToStock,
      })
      .subscribe({
        next: () => this.router.navigate(['/productie']),
        error: () => this.saving.set(false),
      });
  }

  protected remove(): void {
    this.confirm
      .ask('Oogst verwijderen', 'Weet je zeker dat je deze oogst wilt verwijderen? Een eventuele voorraadpartij blijft bestaan.')
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.harvests.delete(+this.id()!)),
      )
      .subscribe(() => this.router.navigate(['/productie']));
  }
}
