import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { filter, map, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ColorSwatch } from '../../shared/color-swatch';
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
    ColorSwatch,
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
  `,
  styles: `
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

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    woolType: ['', [Validators.required, Validators.maxLength(100)]],
    color: ['', [Validators.required, Validators.maxLength(100)]],
    colorHex: this.fb.control<string | null>(null),
    weightGrams: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    origin: [''],
    notes: [''],
  });

  private readonly existingTypes = toSignal(
    this.api.wools.list().pipe(map((wools) => [...new Set(wools.map((w) => w.woolType))])),
    { initialValue: [] },
  );
  private readonly typeInput = toSignal(this.form.controls.woolType.valueChanges, { initialValue: '' });
  protected readonly woolTypes = computed(() => {
    const term = this.typeInput().toLowerCase();
    return [...new Set([...this.existingTypes(), ...COMMON_WOOL_TYPES])]
      .filter((t) => t.toLowerCase().includes(term))
      .sort((a, b) => a.localeCompare(b));
  });

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
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
