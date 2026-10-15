import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, filter, map, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { CalculationInput, calculateBlend } from '../../core/blend-calculator';
import { Blend, BlendStatus, SpinDirection, Wool } from '../../core/models';
import { DYE_PRODUCTS, PLY_METHODS, YARN_WEIGHTS, yarnWeightForWpi } from '../../core/yarn';
import { ColorSwatch } from '../../shared/color-swatch';
import { ConfirmService } from '../../shared/confirm.service';
import { emptyToNull, toNumber } from '../../shared/form-utils';
import { GramsPipe } from '../../shared/grams.pipe';

/** Welk gewichtsveld de gebruiker als laatste heeft ingevuld; dat veld is leidend voor de berekening. */
type Basis = { kind: 'total' } | { kind: 'component'; index: number };

type ComponentGroup = FormGroup<{
  woolId: FormControl<number | null>;
  ratio: FormControl<number | null>;
  weight: FormControl<number | null>;
}>;

@Component({
  selector: 'app-blend-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DecimalPipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatTooltipModule,
    ColorSwatch,
    GramsPipe,
  ],
  templateUrl: './blend-form.html',
  styleUrl: './blend-form.scss',
})
export class BlendForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();

  protected readonly yarnWeights = YARN_WEIGHTS;
  protected readonly plyMethods = PLY_METHODS;
  protected readonly dyeProducts = DYE_PRODUCTS;

  protected readonly wools = toSignal(this.api.wools.list(), { initialValue: [] as Wool[] });
  protected readonly maxComponents = toSignal(this.api.settings$.pipe(map((s) => s.maxBlendComponents)), {
    initialValue: 6,
  });

  protected readonly basis = signal<Basis>({ kind: 'total' });
  protected readonly percentages = signal<number[]>([]);
  protected readonly calcError = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    status: this.fb.control<BlendStatus>('Planned'),
    notes: [''],
    components: this.fb.array<ComponentGroup>([]),
    totalWeight: this.fb.control<number | null>(null),

    spunOn: this.fb.control<string | null>(null),
    outputWeightGrams: this.fb.control<number | null>(null, Validators.min(0)),
    outputLengthMeters: this.fb.control<number | null>(null, Validators.min(0)),
    yarnWeight: this.fb.control<string | null>(null),
    wrapsPerInch: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(200)]),
    plyCount: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(20)]),
    plyMethod: [''],
    spinDirection: this.fb.control<SpinDirection | null>(null),

    isDyed: [false],
    dyeColor: [''],
    dyeColorHex: this.fb.control<string | null>(null),
    dyeProduct: [''],
    dyeMethod: [''],
  });

  protected get components(): FormArray<ComponentGroup> {
    return this.form.controls.components;
  }

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), {
    initialValue: this.form.value,
  });

  protected readonly status = computed(() => this.formValue().status);
  protected readonly isDyed = computed(() => this.formValue().isDyed);

  protected readonly inputTotal = computed(() => {
    const v = this.formValue();
    return toNumber(v.totalWeight);
  });

  protected readonly yieldPercentage = computed(() => {
    const input = this.inputTotal();
    const output = toNumber(this.formValue().outputWeightGrams);
    return input && output !== null ? Math.round((output / input) * 1000) / 10 : null;
  });

  protected readonly wpiSuggestion = computed(() => yarnWeightForWpi(toNumber(this.formValue().wrapsPerInch)));

  /** Waarschuwingen per regel als er meer wol nodig is dan op voorraad (dezelfde wol meerdere keren telt op). */
  protected readonly stockWarnings = computed(() => {
    const rows = this.formValue().components ?? [];
    const needed = new Map<number, number>();
    rows.forEach((r) => r.woolId && needed.set(r.woolId, (needed.get(r.woolId) ?? 0) + (toNumber(r.weight) ?? 0)));
    return rows.map((r) => {
      const wool = this.wools().find((w) => w.id === r.woolId);
      const need = r.woolId ? needed.get(r.woolId) ?? 0 : 0;
      return wool && need > wool.weightGrams ? wool.weightGrams : null;
    });
  });

  private readonly plyInput = toSignal(this.form.controls.plyMethod.valueChanges, { initialValue: '' });
  protected readonly plySuggestions = computed(() => filterOptions(PLY_METHODS, this.plyInput()));
  private readonly dyeInput = toSignal(this.form.controls.dyeProduct.valueChanges, { initialValue: '' });
  protected readonly dyeSuggestions = computed(() => filterOptions(DYE_PRODUCTS, this.dyeInput()));

  private loadedBlend: Blend | null = null;

  ngOnInit(): void {
    const id = this.id();
    if (!id) {
      this.addComponent();
      this.addComponent();
      return;
    }
    // Wacht ook op de wollijst zodat de keuzelijsten direct goed gevuld zijn.
    combineLatest([this.api.blends.get(+id), this.api.wools.list()]).subscribe(([blend]) => this.load(blend));
  }

  private load(blend: Blend): void {
    this.loadedBlend = blend;
    this.components.clear();
    blend.components.forEach((c) => this.components.push(this.createComponent(c.woolId, c.ratio, c.weightGrams)));
    this.form.patchValue({
      name: blend.name,
      status: blend.status,
      notes: blend.notes ?? '',
      totalWeight: blend.inputWeightGrams,
      spunOn: blend.spunOn,
      outputWeightGrams: blend.outputWeightGrams,
      outputLengthMeters: blend.outputLengthMeters,
      yarnWeight: blend.yarnWeight,
      wrapsPerInch: blend.wrapsPerInch,
      plyCount: blend.plyCount,
      plyMethod: blend.plyMethod ?? '',
      spinDirection: blend.spinDirection,
      isDyed: blend.isDyed,
      dyeColor: blend.dyeColor ?? '',
      dyeColorHex: blend.dyeColorHex,
      dyeProduct: blend.dyeProduct ?? '',
      dyeMethod: blend.dyeMethod ?? '',
    });
    this.basis.set(
      blend.basis === 'ComponentWeight' && blend.basisComponentIndex !== null
        ? { kind: 'component', index: blend.basisComponentIndex }
        : { kind: 'total' },
    );
    this.percentages.set(blend.components.map((c) => c.percentage));
    this.form.markAsPristine();
  }

  private createComponent(woolId: number | null = null, ratio: number | null = null, weight: number | null = null) {
    return this.fb.group({
      woolId: this.fb.control<number | null>(woolId, Validators.required),
      ratio: this.fb.control<number | null>(ratio, [Validators.required, Validators.min(0.0001)]),
      weight: this.fb.control<number | null>(weight),
    });
  }

  protected addComponent(): void {
    if (this.components.length >= this.maxComponents()) return;
    this.components.push(this.createComponent());
    this.recalculate();
  }

  protected removeComponent(index: number): void {
    this.components.removeAt(index);
    const basis = this.basis();
    if (basis.kind === 'component') {
      if (basis.index === index) this.basis.set({ kind: 'total' });
      else if (basis.index > index) this.basis.set({ kind: 'component', index: basis.index - 1 });
    }
    this.recalculate();
  }

  protected isBasis(index: number | 'total'): boolean {
    const basis = this.basis();
    return index === 'total' ? basis.kind === 'total' : basis.kind === 'component' && basis.index === index;
  }

  protected onTotalInput(): void {
    this.basis.set({ kind: 'total' });
    this.recalculate();
  }

  protected onWeightInput(index: number): void {
    this.basis.set({ kind: 'component', index });
    this.recalculate();
  }

  /** Rekent alle niet-leidende gewichtsvelden opnieuw uit. */
  protected recalculate(): void {
    const rows = this.components.getRawValue();
    const ratios = rows.map((r) => toNumber(r.ratio) ?? 0);
    const basis = this.basis();
    const input: CalculationInput =
      basis.kind === 'total'
        ? { ratios, basis: 'TotalWeight', totalWeightGrams: toNumber(this.form.controls.totalWeight.value) }
        : {
            ratios,
            basis: 'ComponentWeight',
            basisComponentIndex: basis.index,
            basisComponentWeightGrams: toNumber(rows[basis.index]?.weight),
          };

    const result = calculateBlend(input, this.maxComponents());
    if (!result.ok) {
      // Geen foutmelding zolang er nog niets is ingevuld.
      const untouched = rows.every((r) => toNumber(r.ratio) === null);
      this.calcError.set(rows.length && !untouched ? result.error : null);
      this.percentages.set([]);
      return;
    }

    this.calcError.set(null);
    this.percentages.set(result.percentages);
    result.weights.forEach((weight, i) => {
      if (!this.isBasis(i)) this.components.at(i).controls.weight.setValue(weight);
    });
    if (basis.kind === 'component') this.form.controls.totalWeight.setValue(result.total);
  }

  protected woolById(id: number | null): Wool | undefined {
    return this.wools().find((w) => w.id === id);
  }

  protected suggestYarnWeight(): void {
    const suggestion = this.wpiSuggestion();
    if (suggestion) this.form.controls.yarnWeight.setValue(suggestion);
  }

  protected markSpunToday(): void {
    if (!this.form.controls.spunOn.value) {
      const d = new Date();
      this.form.controls.spunOn.setValue(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    }
  }

  protected save(): void {
    this.recalculate();
    if (this.form.invalid || this.calcError()) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const basis = this.basis();
    this.saving.set(true);
    this.api.blends
      .save(this.id() ? +this.id()! : null, {
        name: v.name,
        status: v.status,
        notes: emptyToNull(v.notes),
        components: v.components.map((c) => ({ woolId: c.woolId!, ratio: toNumber(c.ratio)! })),
        basis: basis.kind === 'total' ? 'TotalWeight' : 'ComponentWeight',
        totalWeightGrams: basis.kind === 'total' ? toNumber(v.totalWeight) : null,
        basisComponentIndex: basis.kind === 'component' ? basis.index : null,
        basisComponentWeightGrams: basis.kind === 'component' ? toNumber(v.components[basis.index].weight) : null,
        spunOn: v.spunOn || null,
        outputWeightGrams: toNumber(v.outputWeightGrams),
        outputLengthMeters: toNumber(v.outputLengthMeters),
        yarnWeight: v.yarnWeight || null,
        wrapsPerInch: toNumber(v.wrapsPerInch),
        plyCount: toNumber(v.plyCount),
        plyMethod: emptyToNull(v.plyMethod),
        spinDirection: v.spinDirection,
        isDyed: v.isDyed,
        dyeColor: emptyToNull(v.dyeColor),
        dyeColorHex: v.isDyed ? v.dyeColorHex : null,
        dyeProduct: emptyToNull(v.dyeProduct),
        dyeMethod: emptyToNull(v.dyeMethod),
      })
      .subscribe({
        next: () => this.router.navigate(['/mengsels']),
        error: () => this.saving.set(false),
      });
  }

  protected remove(): void {
    this.confirm
      .ask('Mengsel verwijderen', `Weet je zeker dat je "${this.loadedBlend?.name}" wilt verwijderen?`)
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.blends.delete(+this.id()!)),
      )
      .subscribe(() => this.router.navigate(['/mengsels']));
  }
}

function filterOptions(options: string[], term: string | null): string[] {
  const t = (term ?? '').toLowerCase();
  return options.filter((o) => o.toLowerCase().includes(t));
}
