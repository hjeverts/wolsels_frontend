import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Animal, AnimalImportResult } from '../../core/models';
import { CsvError, downloadCsv, parseCsv, readTextFile } from '../../shared/csv';
import {
  ANIMAL_CSV_FIELDS,
  AnimalCsvField,
  ColumnMapping,
  ImportRow,
  animalsToCsv,
  autoMap,
  buildImportRows,
  importedFields,
} from './animal-csv';

const MAX_ROWS = 1000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROWS = 20;

type Status = 'new' | 'update' | 'skip' | 'error';

const STATUS_LABELS: Record<Status, string> = {
  new: 'nieuw',
  update: 'bijgewerkt',
  skip: 'overgeslagen',
  error: 'fout',
};

interface PreviewRow extends ImportRow {
  status: Status;
}

@Component({
  selector: 'app-animal-import',
  imports: [
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
  ],
  template: `
    <div class="page-header">
      <h1>Dieren importeren</h1>
    </div>

    <p>
      Kies een CSV-bestand, bv. uit Excel ("Opslaan als" → CSV) of een
      <a href="" (click)="$event.preventDefault(); downloadTemplate()">leeg sjabloon</a>. De eerste regel moet
      de kolomkoppen bevatten. Dieren worden op naam gekoppeld aan je bestaande dieren.
    </p>

    <input #file type="file" accept=".csv,text/csv,text/plain" hidden (change)="choose(file)" />
    <div class="form-actions start">
      <button mat-stroked-button type="button" (click)="file.click()">
        <mat-icon>upload_file</mat-icon> {{ fileName() ? 'Ander bestand kiezen' : 'CSV-bestand kiezen' }}
      </button>
      @if (fileName()) {
        <span class="muted">{{ fileName() }} · {{ rows().length }} {{ rows().length === 1 ? 'dier' : 'dieren' }}</span>
      }
    </div>
    @if (fileError()) {
      <p class="error">{{ fileError() }}</p>
    }

    @if (headers().length) {
      <h2 class="section-title">Kolommen koppelen</h2>
      <p class="muted">Herkende kolommen zijn al gekoppeld. Velden die je niet koppelt, worden bij bestaande dieren niet gewijzigd.</p>
      <div class="form-grid">
        @for (field of fields; track field.key) {
          <mat-form-field>
            <mat-label>{{ field.label }}</mat-label>
            <mat-select [value]="mapping()[field.key]" (selectionChange)="map(field.key, $event.value)" [required]="field.key === 'name'">
              <mat-option [value]="null">– niet importeren</mat-option>
              @for (h of headers(); track $index) {
                <mat-option [value]="$index">{{ h }}</mat-option>
              }
            </mat-select>
            @if (mapping()[field.key] !== null && samples()[mapping()[field.key]!]; as sample) {
              <mat-hint>bv. {{ sample }}</mat-hint>
            }
            @if (field.key === 'name' && mapping().name === null) {
              <mat-hint class="error">Koppel een kolom aan de naam.</mat-hint>
            }
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>Diersoort voor nieuwe dieren</mat-label>
          <input matInput [value]="defaultSpecies()" (input)="defaultSpecies.set($any($event.target).value)" maxlength="100" />
          <mat-hint>Als de diersoort in het bestand leeg is</mat-hint>
        </mat-form-field>
      </div>

      <mat-slide-toggle [checked]="updateExisting()" (change)="updateExisting.set($event.checked)" class="toggle">
        Bestaande dieren met dezelfde naam bijwerken
      </mat-slide-toggle>
      <p class="muted toggle-hint">
        {{ updateExisting() ? 'De gekoppelde velden van bestaande dieren worden overschreven; lege cellen maken een veld leeg.' : 'Dieren die al bestaan, worden overgeslagen.' }}
      </p>

      <h2 class="section-title">Controleren</h2>
      @if (animalsLoaded()) {
        <div class="stat-row">
          <div class="stat">
            <div class="label">Nieuw</div>
            <div class="value">{{ counts().new }}</div>
          </div>
          <div class="stat">
            <div class="label">Bijwerken</div>
            <div class="value">{{ counts().update }}</div>
          </div>
          <div class="stat">
            <div class="label">Overslaan</div>
            <div class="value">{{ counts().skip }}</div>
          </div>
          <div class="stat">
            <div class="label">Met fouten</div>
            <div class="value" [class.error]="counts().error">{{ counts().error }}</div>
          </div>
        </div>

        @if (tooMany()) {
          <p class="error">Het bestand bevat meer dan {{ maxRows }} dieren. Splits het op in kleinere bestanden.</p>
        }
        @if (errors().length) {
          <ul class="errors">
            @for (e of errors().slice(0, 20); track $index) {
              <li>{{ e }}</li>
            }
            @if (errors().length > 20) {
              <li>… en nog {{ errors().length - 20 }} fouten</li>
            }
          </ul>
        }

        @if (preview().length) {
          <div class="table-wrap">
            <table mat-table [dataSource]="preview()">
              <ng-container matColumnDef="line">
                <th mat-header-cell *matHeaderCellDef class="num">Regel</th>
                <td mat-cell *matCellDef="let r" class="num muted">{{ r.line }}</td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Naam</th>
                <td mat-cell *matCellDef="let r">{{ r.row.name }}</td>
              </ng-container>
              <ng-container matColumnDef="species">
                <th mat-header-cell *matHeaderCellDef>Soort / ras</th>
                <td mat-cell *matCellDef="let r">{{ r.row.species || defaultSpecies() }}{{ r.row.breed ? ' · ' + r.row.breed : '' }}</td>
              </ng-container>
              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef>Locatie</th>
                <td mat-cell *matCellDef="let r" class="muted">{{ r.row.location }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Wordt</th>
                <td mat-cell *matCellDef="let r" [class.error]="r.status === 'error'" [class.muted]="r.status === 'skip'">
                  {{ statusLabel(r) }}
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let r; columns: columns"></tr>
            </table>
          </div>
          @if (rows().length > preview().length) {
            <p class="muted">De eerste {{ preview().length }} van {{ rows().length }} regels.</p>
          }
        }
      } @else if (!animalsFailed()) {
        <p class="muted">Bestaande dieren laden…</p>
      }
    }

    <div class="form-actions">
      @if (animalsFailed()) {
        <span class="error">Je dieren konden niet geladen worden.</span>
        <button mat-button type="button" (click)="loadAnimals()">Opnieuw proberen</button>
      }
      <span class="spacer"></span>
      <a mat-button routerLink="/dieren">Annuleren</a>
      <button mat-flat-button type="button" [disabled]="!canImport() || saving()" (click)="import()">
        {{ toImport() === 1 ? '1 dier importeren' : toImport() + ' dieren importeren' }}
      </button>
    </div>
  `,
  styles: `
    .section-title {
      margin-top: 24px;
    }
    .stat-row {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }
    .toggle {
      margin-top: 8px;
    }
    .toggle-hint {
      margin-top: 4px;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .errors {
      color: var(--mat-sys-error);
      padding-left: 20px;
    }
    .form-actions.start {
      justify-content: flex-start;
      align-items: center;
      gap: 12px;
    }
  `,
})
export class AnimalImport {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly fields = ANIMAL_CSV_FIELDS;
  protected readonly maxRows = MAX_ROWS;
  protected readonly columns = ['line', 'name', 'species', 'location', 'status'];

  /** Bestaande dieren; null zolang ze niet geladen zijn (dan kan nog niet bepaald worden wat nieuw is). */
  private readonly animals = signal<Animal[] | null>(null);
  protected readonly animalsFailed = signal(false);
  private readonly table = signal<string[][]>([]);
  protected readonly fileName = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly mapping = signal<ColumnMapping>(autoMap([]));
  protected readonly defaultSpecies = signal('Konijn');
  protected readonly updateExisting = signal(false);
  protected readonly saving = signal(false);
  private readonly serverErrors = signal<string[]>([]);

  protected readonly headers = computed(() => (this.table()[0] ?? []).map((h, i) => h.trim() || `Kolom ${i + 1}`));
  /** Eerste niet-lege waarde per kolom, als voorbeeld bij het koppelen. */
  protected readonly samples = computed(() =>
    this.headers().map((_, i) => this.table().slice(1).find((r) => r[i]?.trim())?.[i].trim() ?? ''),
  );

  protected readonly rows = computed<PreviewRow[]>(() => {
    const rows = buildImportRows(this.table(), this.mapping());
    const existing = new Map<string, number>();
    for (const a of this.animals() ?? []) existing.set(key(a.name), (existing.get(key(a.name)) ?? 0) + 1);
    const inFile = new Map<string, number>();
    for (const r of rows) inFile.set(key(r.row.name), (inFile.get(key(r.row.name)) ?? 0) + 1);

    // Dezelfde controles als de server, zodat je de fouten ziet vóór het importeren.
    return rows.map((r) => {
      const errors = [...r.errors];
      const matches = existing.get(key(r.row.name)) ?? 0;
      let status: Status = matches ? (this.updateExisting() ? 'update' : 'skip') : 'new';
      if (status === 'update' && matches > 1) errors.push(`Er zijn meerdere dieren met de naam "${r.row.name}".`);
      if (status === 'update' && (inFile.get(key(r.row.name)) ?? 0) > 1) errors.push(`"${r.row.name}" staat meerdere keren in het bestand.`);
      if (status === 'new' && !r.row.species && !this.defaultSpecies().trim()) errors.push('Diersoort ontbreekt.');
      if (status === 'skip') errors.length = 0;
      if (errors.length) status = 'error';
      return { ...r, errors, status };
    });
  });

  protected readonly preview = computed(() => this.rows().slice(0, PREVIEW_ROWS));
  protected readonly counts = computed(() => {
    const counts: Record<Status, number> = { new: 0, update: 0, skip: 0, error: 0 };
    for (const r of this.rows()) counts[r.status]++;
    return counts;
  });
  protected readonly errors = computed(() => [
    ...this.serverErrors(),
    // Zonder naamkolom heeft elke regel die fout; dat staat al bij het veld Naam.
    ...(this.mapping().name === null ? [] : this.rows().flatMap((r) => r.errors.map((e) => `Regel ${r.line}: ${e}`))),
  ]);
  protected readonly animalsLoaded = computed(() => this.animals() !== null);
  protected readonly tooMany = computed(() => this.rows().length > MAX_ROWS);
  protected readonly toImport = computed(() => this.counts().new + this.counts().update);
  protected readonly canImport = computed(
    () =>
      this.animals() !== null &&
      this.mapping().name !== null &&
      this.toImport() > 0 &&
      !this.counts().error &&
      !this.tooMany(),
  );

  constructor() {
    this.loadAnimals();
  }

  protected loadAnimals(): void {
    this.animalsFailed.set(false);
    this.api.animals.list().subscribe({
      next: (animals) => this.animals.set(animals),
      error: () => this.animalsFailed.set(true),
    });
  }

  protected async choose(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    // Eerst het vorige bestand vergeten, zodat dat na een mislukte keuze niet meer te importeren is.
    this.fileName.set(null);
    this.table.set([]);
    this.mapping.set(autoMap([]));
    this.fileError.set(null);
    this.serverErrors.set([]);
    if (file.size > MAX_FILE_BYTES) {
      this.fileError.set('Dit bestand is te groot (maximaal 5 MB).');
      return;
    }
    let table: string[][];
    try {
      table = parseCsv(await readTextFile(file));
    } catch (e) {
      if (!(e instanceof CsvError)) throw e;
      this.fileError.set(`Dit bestand kan niet gelezen worden. ${e.message}`);
      return;
    }
    if (table.length < 2) {
      this.fileError.set('Dit bestand bevat geen gegevens onder de kolomkoppen.');
      return;
    }
    this.fileName.set(file.name);
    this.table.set(table);
    this.mapping.set(autoMap(table[0]));
  }

  protected map(field: AnimalCsvField, column: number | null): void {
    this.serverErrors.set([]);
    this.mapping.update((m) => ({ ...m, [field]: column }));
  }

  protected statusLabel(row: PreviewRow): string {
    return STATUS_LABELS[row.status];
  }

  protected downloadTemplate(): void {
    downloadCsv('wolsels-dieren-sjabloon.csv', animalsToCsv());
  }

  protected import(): void {
    if (!this.canImport()) return;
    this.saving.set(true);
    this.serverErrors.set([]);
    this.api.animals
      .import({
        rows: this.rows().filter((r) => r.status !== 'skip').map((r) => r.row),
        fields: importedFields(this.mapping()),
        updateExisting: this.updateExisting(),
        defaultSpecies: this.defaultSpecies().trim() || null,
      })
      .subscribe({
        next: (result) => {
          this.snackBar.open(describe(result, this.counts().skip), 'Sluiten', { duration: 8000 });
          this.router.navigate(['/dieren']);
        },
        error: (error: HttpErrorResponse) => {
          this.saving.set(false);
          const problem = error.error as { errors?: Record<string, string[]> } | null;
          if (problem?.errors) this.serverErrors.set(Object.values(problem.errors).flat());
        },
      });
  }
}

function key(name: string): string {
  return name.trim().toLowerCase();
}

function describe(result: AnimalImportResult, skipped: number): string {
  const parts = [`${result.created} ${result.created === 1 ? 'dier' : 'dieren'} toegevoegd`];
  if (result.updated) parts.push(`${result.updated} bijgewerkt`);
  if (result.skipped + skipped) parts.push(`${result.skipped + skipped} overgeslagen`);
  if (result.locationsCreated.length) parts.push(`nieuwe locaties: ${result.locationsCreated.join(', ')}`);
  return parts.join(', ') + '.';
}
