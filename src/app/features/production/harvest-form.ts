import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, combineLatest, forkJoin, of, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { Animal, Harvest, Location, Wool } from '../../core/models';
import { GramsPipe } from '../../shared/grams.pipe';
import { harvestGrades, harvestMethods } from '../../core/yarn';
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
    MatRadioModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    GramsPipe,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ (id() ? 'harvest.edit' : 'production.register') | t }}</h1>
    </div>

    @if (loaded()) {
      @if (!animals().length && !locations().length) {
        <div class="empty">
          {{ 'harvest.noSources' | t }}
          <a routerLink="/dieren/nieuw">{{ 'animals.add' | t }}</a> ·
          <a routerLink="/locaties">{{ 'animals.manageLocations' | t }}</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="source-toggle">
            <span class="muted">{{ 'harvest.harvestedFrom' | t }}</span>
            <mat-button-toggle-group formControlName="source" [attr.aria-label]="'harvest.source' | t" hideSingleSelectionIndicator>
              <mat-button-toggle value="animal" [disabled]="!animals().length"><mat-icon>cruelty_free</mat-icon> {{ 'harvest.animal' | t }}</mat-button-toggle>
              <mat-button-toggle value="location" [disabled]="!locations().length"><mat-icon>location_on</mat-icon> {{ 'harvest.location' | t }}</mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <div class="form-grid">
            @if (source() === 'animal') {
              <mat-form-field>
                <mat-label>{{ 'harvest.animal' | t }}</mat-label>
                <mat-select formControlName="animalId" required>
                  @for (a of selectableAnimals(); track a.id) {
                    <mat-option [value]="a.id">
                      {{ a.name }} <span class="muted">· {{ a.breed ?? a.species }}{{ a.active ? '' : ' ' + ('harvest.inactive' | t) }}</span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            } @else {
              <mat-form-field>
                <mat-label>{{ 'harvest.location' | t }}</mat-label>
                <mat-select formControlName="locationId" required>
                  @for (l of locations(); track l.id) {
                    <mat-option [value]="l.id">{{ l.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <mat-form-field>
              <mat-label>{{ 'common.date' | t }}</mat-label>
              <input matInput [matDatepicker]="datePicker" formControlName="date" required />
              <mat-datepicker-toggle matIconSuffix [for]="datePicker" />
              <mat-datepicker #datePicker />
            </mat-form-field>

            <mat-form-field>
              <mat-label>{{ 'harvest.rawWeight' | t }}</mat-label>
              <input matInput type="number" min="0.1" step="0.1" formControlName="weightGrams" required />
              <span matTextSuffix>g</span>
            </mat-form-field>

            <mat-form-field>
              <mat-label>{{ 'harvest.method' | t }}</mat-label>
              <input matInput formControlName="method" [matAutocomplete]="methods" />
              <mat-autocomplete #methods>
                @for (m of methodOptions; track m) {
                  <mat-option [value]="m">{{ m }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>

            <mat-form-field>
              <mat-label>{{ 'harvest.grade' | t }}</mat-label>
              <input matInput formControlName="grade" [matAutocomplete]="grades" />
              <mat-autocomplete #grades>
                @for (g of gradeOptions; track g) {
                  <mat-option [value]="g">{{ g }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>

            <mat-form-field class="span-all">
              <mat-label>{{ 'common.notes' | t }}</mat-label>
              <textarea matInput formControlName="notes" rows="3"></textarea>
            </mat-form-field>
          </div>

          <div class="stock">
            <h2 class="section-title"><mat-icon>inventory_2</mat-icon> {{ 'nav.stock' | t }}</h2>
            @if (woolId()) {
              <p>
                {{ 'harvest.inLot' | t }}
                <a [routerLink]="['/voorraad', woolId()]">{{ woolName() }}</a>.
                <span class="muted">{{ 'harvest.weightAdjusts' | t }}</span>
              </p>
            } @else {
              <mat-radio-group formControlName="stockMode" class="stock-modes" [attr.aria-label]="'nav.stock' | t">
                <mat-radio-button value="none">{{ 'harvest.stockNone' | t }}</mat-radio-button>
                <mat-radio-button value="new">{{ 'harvest.stockNew' | t }}</mat-radio-button>
                <mat-radio-button value="existing" [disabled]="!wools().length">{{ 'harvest.stockExisting' | t }}</mat-radio-button>
              </mat-radio-group>
              @if (stockMode() === 'existing') {
                <mat-form-field class="stock-wool">
                  <mat-label>{{ 'harvest.lot' | t }}</mat-label>
                  <mat-select formControlName="stockWoolId" required>
                    @if (suggestedWools().length) {
                      <mat-optgroup [label]="(source() === 'animal' ? 'harvest.usedForAnimal' : 'harvest.usedForLocation') | t">
                        @for (w of suggestedWools(); track w.id) {
                          <mat-option [value]="w.id">{{ w.name }} <span class="muted">· {{ w.weightGrams | grams }}</span></mat-option>
                        }
                      </mat-optgroup>
                    }
                    <mat-optgroup [label]="'harvest.allLots' | t">
                      @for (w of otherWools(); track w.id) {
                        <mat-option [value]="w.id">{{ w.name }} <span class="muted">· {{ w.woolType }} · {{ w.weightGrams | grams }}</span></mat-option>
                      }
                    </mat-optgroup>
                  </mat-select>
                </mat-form-field>
              }
            }
          </div>

          <div class="form-actions">
            @if (id()) {
              <button mat-button type="button" (click)="remove()"><mat-icon>delete</mat-icon> {{ 'common.delete' | t }}</button>
            }
            <span class="spacer"></span>
            <a mat-button routerLink="/productie">{{ 'common.cancel' | t }}</a>
            <button mat-flat-button type="submit" [disabled]="saving()">{{ 'common.save' | t }}</button>
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
    .stock {
      margin: 8px 0 16px;
    }
    .stock-modes {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stock-wool {
      width: 100%;
      max-width: 480px;
      margin-top: 12px;
    }
  `,
})
export class HarvestForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();

  protected readonly methodOptions = harvestMethods();
  protected readonly gradeOptions = harvestGrades();
  protected readonly animals = signal<Animal[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly loaded = signal(false);
  protected readonly saving = signal(false);
  protected readonly woolId = signal<number | null>(null);
  protected readonly woolName = signal<string | null>(null);
  protected readonly wools = signal<Wool[]>([]);
  /** Lots containing earlier harvests of the same animal / location, newest first. */
  private readonly suggestedIds = signal<number[]>([]);

  protected readonly form = this.fb.group({
    source: this.fb.control<Source>('animal'),
    animalId: this.fb.control<number | null>(null),
    locationId: this.fb.control<number | null>(null),
    date: [today(), Validators.required],
    weightGrams: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.1)]),
    method: [''],
    grade: [''],
    notes: [''],
    stockMode: this.fb.control<'none' | 'new' | 'existing'>('none'),
    stockWoolId: this.fb.control<number | null>(null),
  });

  protected readonly stockMode = toSignal(this.form.controls.stockMode.valueChanges, { initialValue: 'none' as const });
  protected readonly suggestedWools = computed(() =>
    this.suggestedIds().map((id) => this.wools().find((w) => w.id === id)).filter((w): w is Wool => !!w),
  );
  protected readonly otherWools = computed(() => this.wools().filter((w) => !this.suggestedIds().includes(w.id)));

  protected readonly source = toSignal(this.form.controls.source.valueChanges, { initialValue: 'animal' as Source });
  private readonly animalIdValue = toSignal(this.form.controls.animalId.valueChanges, { initialValue: null });

  /** Active animals, plus the current animal if it has become inactive. */
  protected readonly selectableAnimals = computed(() =>
    this.animals().filter((a) => a.active || a.id === this.animalIdValue()),
  );

  constructor() {
    // For a chosen animal/location, suggest the lots of earlier harvests.
    const controls = this.form.controls;
    combineLatest([
      controls.source.valueChanges.pipe(startWith(controls.source.value)),
      controls.animalId.valueChanges.pipe(startWith(controls.animalId.value)),
      controls.locationId.valueChanges.pipe(startWith(controls.locationId.value)),
    ])
      .pipe(
        switchMap(([source, animalId, locationId]) => {
          const sourceId = source === 'animal' ? animalId : locationId;
          if (!sourceId) return of([] as Harvest[]);
          return this.api.harvests.list(source === 'animal' ? { animalId: sourceId } : { locationId: sourceId });
        }),
        takeUntilDestroyed(),
      )
      .subscribe((harvests) => this.suggest(harvests));
  }

  private suggest(harvests: Harvest[]): void {
    const ids = [...new Set(harvests.filter((h) => h.woolId && String(h.id) !== this.id()).map((h) => h.woolId!))];
    this.suggestedIds.set(ids);
    // New harvest: by default add to the most recent lot of this animal / location.
    const mode = this.form.controls.stockMode;
    if (!this.id() && mode.pristine) {
      if (ids.length) {
        mode.setValue('existing');
        this.form.controls.stockWoolId.setValue(ids[0]);
      } else {
        mode.setValue('none');
        this.form.controls.stockWoolId.setValue(null);
      }
    }
  }

  ngOnInit(): void {
    forkJoin([this.api.animals.list(), this.api.locations.list(), this.api.wools.list()]).subscribe(([animals, locations, wools]) => {
      this.animals.set(animals);
      this.locations.set(locations);
      this.wools.set(wools);
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
          stockMode: 'none',
          stockWoolId: null,
        });
        this.woolId.set(h.woolId);
        this.woolName.set(h.woolName);
        this.loaded.set(true);
      });
    });
  }

  protected save(): void {
    const v = this.form.getRawValue();
    const sourceId = v.source === 'animal' ? v.animalId : v.locationId;
    const toExisting = !this.woolId() && v.stockMode === 'existing';
    if (this.form.invalid || !sourceId || (toExisting && !v.stockWoolId)) {
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
        addToStock: !this.woolId() && v.stockMode !== 'none',
        stockWoolId: toExisting ? v.stockWoolId : null,
      })
      .subscribe({
        next: () => this.router.navigate(['/productie']),
        error: () => this.saving.set(false),
      });
  }

  protected remove(): void {
    const weight = this.form.controls.weightGrams.value;
    const choice$ = this.woolId()
      ? this.confirm.choose(
          t('harvest.deleteTitle'),
          t('harvest.deleteFromLot', { lot: this.woolName(), weight }),
          [
            { label: t('harvest.deleteKeepStock'), value: 'keep' as const },
            { label: t('harvest.deleteRemoveStock'), value: 'remove' as const },
          ],
        )
      : this.confirm
          .ask(t('harvest.deleteTitle'), t('harvest.deleteConfirm'))
          .pipe(switchMap((ok) => (ok ? of('keep' as const) : of(null))));

    choice$
      .pipe(
        switchMap((choice) => (choice ? this.api.harvests.deleteHarvest(+this.id()!, choice === 'remove') : EMPTY)),
      )
      .subscribe(() => this.router.navigate(['/productie']));
  }
}
