import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { filter, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Harvest, Wool } from '../../core/models';
import { ColorSwatch } from '../../shared/color-swatch';
import { GramsPipe } from '../../shared/grams.pipe';
import { ConfirmService } from '../../shared/confirm.service';
import { emptyToNull, toNumber } from '../../shared/form-utils';

const COMMON_WOOL_TYPES = ['Merino', 'Shetland', 'Alpaca', 'Angora', 'Mohair', 'BFL', 'Gotland', 'Zijde', 'Kasjmier', 'Yak'];

@Component({
  selector: 'app-wool-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatTableModule,
    DatePipe,
    ColorSwatch,
    GramsPipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ id() ? 'Wol bewerken' : 'Wol toevoegen' }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="form-grid">
        <mat-form-field class="span-all">
          <mat-label>Naam</mat-label>
          <input matInput formControlName="name" placeholder="bv. Merino lontwol wit" required />
        </mat-form-field>

        <mat-form-field>
          <mat-label>Wolsoort</mat-label>
          <input matInput formControlName="woolType" [matAutocomplete]="types" required />
          <mat-autocomplete #types>
            @for (type of woolTypes(); track type) {
              <mat-option [value]="type">{{ type }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Kleur</mat-label>
          <input matInput formControlName="color" placeholder="bv. Naturel, Bruin" required />
          <span matSuffix class="color-pick">
            <app-color-swatch [color]="form.controls.colorHex.value" />
            <input type="color" aria-label="Kleurcode kiezen" [value]="form.controls.colorHex.value || '#ffffff'" (input)="form.controls.colorHex.setValue($any($event.target).value)" />
          </span>
          <mat-hint>Klik op het bolletje om een kleurcode te kiezen</mat-hint>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Gewicht op voorraad</mat-label>
          <input matInput type="number" min="0" step="0.1" formControlName="weightGrams" required />
          <span matTextSuffix>g</span>
        </mat-form-field>

        <mat-form-field>
          <mat-label>Herkomst / leverancier</mat-label>
          <input matInput formControlName="origin" />
        </mat-form-field>

        <mat-form-field class="span-all">
          <mat-label>Notities</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </div>

      <div class="form-actions">
        @if (id()) {
          <button mat-button type="button" (click)="remove()"><mat-icon>delete</mat-icon> Verwijderen</button>
        }
        <span class="spacer"></span>
        <a mat-button routerLink="/voorraad">Annuleren</a>
        <button mat-flat-button type="submit" [disabled]="saving()">Opslaan</button>
      </div>
    </form>

    @if (id()) {
      @if (harvests().length) {
        <h2 class="section-title extra"><mat-icon>agriculture</mat-icon> Opgebouwd uit oogsten</h2>
        <div class="table-wrap">
          <table mat-table [dataSource]="harvests()">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Datum</th>
              <td mat-cell *matCellDef="let h">{{ h.date | date: 'd MMM y' }}</td>
            </ng-container>
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>Dier / locatie</th>
              <td mat-cell *matCellDef="let h">{{ h.animalName ?? h.locationName }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef class="num">Gewicht</th>
              <td mat-cell *matCellDef="let h" class="num">{{ h.weightGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="harvestColumns"></tr>
            <tr mat-row *matRowDef="let h; columns: harvestColumns" class="clickable" [routerLink]="['/productie', h.id]"></tr>
          </table>
        </div>
        <p class="muted small">Samen {{ harvestTotal() | grams }} geoogst. De voorraad kan lager zijn als er al wol is gebruikt.</p>
      }

      @if (mergeCandidates().length) {
        <h2 class="section-title extra"><mat-icon>call_merge</mat-icon> Samenvoegen</h2>
        <p class="muted">
          Voeg deze partij samen met een andere, bijvoorbeeld alle oogsten van één dier. Het gewicht gaat over naar de
          gekozen partij, en oogsten en mengsels die naar deze partij verwijzen gaan mee. Deze partij verdwijnt daarna.
        </p>
        <div class="merge">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>Samenvoegen met</mat-label>
            <mat-select [value]="mergeTarget()" (selectionChange)="mergeTarget.set($event.value)">
              @for (w of mergeCandidates(); track w.id) {
                <mat-option [value]="w.id">
                  <span class="inline"><app-color-swatch [color]="w.colorHex" /> {{ w.name }}
                    <span class="muted">· {{ w.woolType }} · {{ w.weightGrams | grams }}</span></span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="merge()" [disabled]="!mergeTarget()">
            <mat-icon>call_merge</mat-icon> Samenvoegen
          </button>
        </div>
      }
    }
  `,
  styles: `
    .extra {
      margin-top: 32px;
    }
    .small {
      font: var(--mat-sys-body-small);
    }
    .merge {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      mat-form-field {
        min-width: 300px;
      }
    }
    .color-pick {
      position: relative;
      display: inline-flex;
      padding: 0 12px;
      input[type='color'] {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }
    }
  `,
})
export class WoolForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();
  protected readonly saving = signal(false);
  protected readonly harvests = signal<Harvest[]>([]);
  protected readonly harvestColumns = ['date', 'source', 'weight'];
  protected readonly harvestTotal = computed(() => this.harvests().reduce((sum, h) => sum + h.weightGrams, 0));
  private readonly allWools = signal<Wool[]>([]);
  protected readonly mergeCandidates = computed(() => this.allWools().filter((w) => String(w.id) !== this.id()));
  protected readonly mergeTarget = signal<number | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    woolType: ['', [Validators.required, Validators.maxLength(100)]],
    color: ['', [Validators.required, Validators.maxLength(100)]],
    colorHex: this.fb.control<string | null>(null),
    weightGrams: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    origin: [''],
    notes: [''],
  });

  private readonly existingTypes = computed(() => [...new Set(this.allWools().map((w) => w.woolType))]);
  private readonly typeInput = toSignal(this.form.controls.woolType.valueChanges, { initialValue: '' });
  protected readonly woolTypes = computed(() => {
    const term = this.typeInput().toLowerCase();
    return [...new Set([...this.existingTypes(), ...COMMON_WOOL_TYPES])]
      .filter((t) => t.toLowerCase().includes(term))
      .sort((a, b) => a.localeCompare(b));
  });

  ngOnInit(): void {
    this.api.wools.list().subscribe((wools) => this.allWools.set(wools));
    const id = this.id();
    if (!id) return;
    this.api.harvests.list({ woolId: +id }).subscribe((h) => this.harvests.set(h));
    this.api.wools.get(+id).subscribe((wool) =>
      this.form.reset({
        name: wool.name,
        woolType: wool.woolType,
        color: wool.color,
        colorHex: wool.colorHex,
        weightGrams: wool.weightGrams,
        origin: wool.origin ?? '',
        notes: wool.notes ?? '',
      }),
    );
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.wools
      .save(this.id() ? +this.id()! : null, {
        name: v.name,
        woolType: v.woolType,
        color: v.color,
        colorHex: v.colorHex,
        weightGrams: toNumber(v.weightGrams) ?? 0,
        origin: emptyToNull(v.origin),
        notes: emptyToNull(v.notes),
      })
      .subscribe({
        next: () => this.router.navigate(['/voorraad']),
        error: () => this.saving.set(false),
      });
  }

  protected merge(): void {
    const target = this.allWools().find((w) => w.id === this.mergeTarget());
    if (!target) return;
    const v = this.form.getRawValue();
    const differs =
      target.woolType.toLowerCase() !== v.woolType.trim().toLowerCase() || target.color.toLowerCase() !== v.color.trim().toLowerCase();
    const warning = differs ? ` Let op: de wolsoort of kleur verschilt (${target.woolType}, ${target.color}).` : '';
    this.confirm
      .ask(
        'Partijen samenvoegen',
        `"${v.name}" (${v.weightGrams ?? 0} g) wordt toegevoegd aan "${target.name}" en verdwijnt daarna.${warning}`,
        'Samenvoegen',
      )
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.wools.merge(+this.id()!, target.id)),
      )
      .subscribe((merged) => this.router.navigate(['/voorraad', merged.id]));
  }

  protected remove(): void {
    this.confirm
      .ask('Wol verwijderen', `Weet je zeker dat je "${this.form.controls.name.value}" wilt verwijderen?`)
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.wools.delete(+this.id()!)),
      )
      .subscribe(() => this.router.navigate(['/voorraad']));
  }
}
