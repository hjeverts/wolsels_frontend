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
import { TranslatePipe, TranslationKey, t } from '../../core/i18n/i18n';
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

const STATUS_LABELS: Record<Status, TranslationKey> = {
  new: 'import.statusNew',
  update: 'import.statusUpdate',
  skip: 'import.statusSkip',
  error: 'import.statusError',
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
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'title.importAnimals' | t }}</h1>
    </div>

    <p>
      {{ 'import.intro' | t }}
      <a href="" (click)="$event.preventDefault(); downloadTemplate()">{{ 'import.downloadTemplate' | t }}</a>
    </p>

    <input #file type="file" accept=".csv,text/csv,text/plain" hidden (change)="choose(file)" />
    <div class="form-actions start">
      <button mat-stroked-button type="button" (click)="file.click()">
        <mat-icon>upload_file</mat-icon> {{ (fileName() ? 'import.chooseOther' : 'import.chooseFile') | t }}
      </button>
      @if (fileName()) {
        <span class="muted">{{ fileName() }} · {{ 'import.animalCount' | t: { count: rows().length } }}</span>
      }
    </div>
    @if (fileError()) {
      <p class="error">{{ fileError() }}</p>
    }

    @if (headers().length) {
      <h2 class="section-title">{{ 'import.mapColumns' | t }}</h2>
      <p class="muted">{{ 'import.mapIntro' | t }}</p>
      <div class="form-grid">
        @for (field of fields; track field.key) {
          <mat-form-field>
            <mat-label>{{ field.label | t }}</mat-label>
            <mat-select [value]="mapping()[field.key]" (selectionChange)="map(field.key, $event.value)" [required]="field.key === 'name'">
              <mat-option [value]="null">– {{ 'import.skipColumn' | t }}</mat-option>
              @for (h of headers(); track $index) {
                <mat-option [value]="$index">{{ h }}</mat-option>
              }
            </mat-select>
            @if (mapping()[field.key] !== null && samples()[mapping()[field.key]!]; as sample) {
              <mat-hint>{{ 'import.example' | t: { value: sample } }}</mat-hint>
            }
            @if (field.key === 'name' && mapping().name === null) {
              <mat-hint class="error">{{ 'import.mapName' | t }}</mat-hint>
            }
          </mat-form-field>
        }
        <mat-form-field>
          <mat-label>{{ 'import.defaultSpecies' | t }}</mat-label>
          <input matInput [value]="defaultSpecies()" (input)="defaultSpecies.set($any($event.target).value)" maxlength="100" />
          <mat-hint>{{ 'import.defaultSpeciesHint' | t }}</mat-hint>
        </mat-form-field>
      </div>

      <mat-slide-toggle [checked]="updateExisting()" (change)="updateExisting.set($event.checked)" class="toggle">
        {{ 'import.updateExisting' | t }}
      </mat-slide-toggle>
      <p class="muted toggle-hint">
        {{ (updateExisting() ? 'import.updateExistingOn' : 'import.updateExistingOff') | t }}
      </p>

      <h2 class="section-title">{{ 'import.review' | t }}</h2>
      @if (animalsLoaded()) {
        <div class="stat-row">
          <div class="stat">
            <div class="label">{{ 'import.new' | t }}</div>
            <div class="value">{{ counts().new }}</div>
          </div>
          <div class="stat">
            <div class="label">{{ 'import.update' | t }}</div>
            <div class="value">{{ counts().update }}</div>
          </div>
          <div class="stat">
            <div class="label">{{ 'import.skip' | t }}</div>
            <div class="value">{{ counts().skip }}</div>
          </div>
          <div class="stat">
            <div class="label">{{ 'import.withErrors' | t }}</div>
            <div class="value" [class.error]="counts().error">{{ counts().error }}</div>
          </div>
        </div>

        @if (tooMany()) {
          <p class="error">{{ 'import.tooMany' | t: { max: maxRows } }}</p>
        }
        @if (errors().length) {
          <ul class="errors">
            @for (e of errors().slice(0, 20); track $index) {
              <li>{{ e }}</li>
            }
            @if (errors().length > 20) {
              <li>{{ 'import.moreErrors' | t: { count: errors().length - 20 } }}</li>
            }
          </ul>
        }

        @if (preview().length) {
          <div class="table-wrap">
            <table mat-table [dataSource]="preview()">
              <ng-container matColumnDef="line">
                <th mat-header-cell *matHeaderCellDef class="num">{{ 'import.line' | t }}</th>
                <td mat-cell *matCellDef="let r" class="num muted">{{ r.line }}</td>
              </ng-container>
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | t }}</th>
                <td mat-cell *matCellDef="let r">{{ r.row.name }}</td>
              </ng-container>
              <ng-container matColumnDef="species">
                <th mat-header-cell *matHeaderCellDef>{{ 'animals.speciesBreed' | t }}</th>
                <td mat-cell *matCellDef="let r">{{ r.row.species || defaultSpecies() }}{{ r.row.breed ? ' · ' + r.row.breed : '' }}</td>
              </ng-container>
              <ng-container matColumnDef="location">
                <th mat-header-cell *matHeaderCellDef>{{ 'harvest.location' | t }}</th>
                <td mat-cell *matCellDef="let r" class="muted">{{ r.row.location }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'import.result' | t }}</th>
                <td mat-cell *matCellDef="let r" [class.error]="r.status === 'error'" [class.muted]="r.status === 'skip'">
                  {{ statusLabel(r) }}
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let r; columns: columns"></tr>
            </table>
          </div>
          @if (rows().length > preview().length) {
            <p class="muted">{{ 'import.previewNote' | t: { shown: preview().length, total: rows().length } }}</p>
          }
        }
      } @else if (!animalsFailed()) {
        <p class="muted">{{ 'import.loadingAnimals' | t }}</p>
      }
    }

    <div class="form-actions">
      @if (animalsFailed()) {
        <span class="error">{{ 'import.loadFailed' | t }}</span>
        <button mat-button type="button" (click)="loadAnimals()">{{ 'common.retry' | t }}</button>
      }
      <span class="spacer"></span>
      <a mat-button routerLink="/dieren">{{ 'common.cancel' | t }}</a>
      <button mat-flat-button type="button" [disabled]="!canImport() || saving()" (click)="import()">
        {{ 'import.submit' | t: { count: toImport() } }}
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

  /** Existing animals; null while not loaded (then it cannot be determined yet what is new). */
  private readonly animals = signal<Animal[] | null>(null);
  protected readonly animalsFailed = signal(false);
  private readonly table = signal<string[][]>([]);
  protected readonly fileName = signal<string | null>(null);
  protected readonly fileError = signal<string | null>(null);
  protected readonly mapping = signal<ColumnMapping>(autoMap([]));
  protected readonly defaultSpecies = signal(t('animals.rabbit'));
  protected readonly updateExisting = signal(false);
  protected readonly saving = signal(false);
  private readonly serverErrors = signal<string[]>([]);

  protected readonly headers = computed(() => (this.table()[0] ?? []).map((h, i) => h.trim() || t('import.column', { n: i + 1 })));
  /** First non-empty value per column, as an example when mapping. */
  protected readonly samples = computed(() =>
    this.headers().map((_, i) => this.table().slice(1).find((r) => r[i]?.trim())?.[i].trim() ?? ''),
  );

  protected readonly rows = computed<PreviewRow[]>(() => {
    const rows = buildImportRows(this.table(), this.mapping());
    const existing = new Map<string, number>();
    for (const a of this.animals() ?? []) existing.set(key(a.name), (existing.get(key(a.name)) ?? 0) + 1);
    const inFile = new Map<string, number>();
    for (const r of rows) inFile.set(key(r.row.name), (inFile.get(key(r.row.name)) ?? 0) + 1);

    // The same checks as the server, so that you see the errors before importing.
    return rows.map((r) => {
      const errors = [...r.errors];
      const matches = existing.get(key(r.row.name)) ?? 0;
      let status: Status = matches ? (this.updateExisting() ? 'update' : 'skip') : 'new';
      if (status === 'update' && matches > 1) errors.push(t('import.duplicateExisting', { name: r.row.name }));
      if (status === 'update' && (inFile.get(key(r.row.name)) ?? 0) > 1) errors.push(t('import.duplicateInFile', { name: r.row.name }));
      if (status === 'new' && !r.row.species && !this.defaultSpecies().trim()) errors.push(t('import.speciesMissing'));
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
    // Without a name column every line has that error; it is already shown at the Name field.
    ...(this.mapping().name === null ? [] : this.rows().flatMap((r) => r.errors.map((e) => t('import.lineError', { line: r.line, error: e })))),
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
    // Forget the previous file first, so that it can no longer be imported after a failed choice.
    this.fileName.set(null);
    this.table.set([]);
    this.mapping.set(autoMap([]));
    this.fileError.set(null);
    this.serverErrors.set([]);
    if (file.size > MAX_FILE_BYTES) {
      this.fileError.set(t('import.fileTooLarge', { max: 5 }));
      return;
    }
    let table: string[][];
    try {
      table = parseCsv(await readTextFile(file));
    } catch (e) {
      if (!(e instanceof CsvError)) throw e;
      this.fileError.set(`${t('import.unreadable')} ${e.message}`);
      return;
    }
    if (table.length < 2) {
      this.fileError.set(t('import.noData'));
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
    return t(STATUS_LABELS[row.status]);
  }

  protected downloadTemplate(): void {
    downloadCsv(`${t('animals.templateFileName')}.csv`, animalsToCsv());
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
          this.snackBar.open(describe(result, this.counts().skip), t('common.close'), { duration: 8000 });
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
  const parts = [t('import.doneCreated', { count: result.created })];
  if (result.updated) parts.push(t('import.doneUpdated', { count: result.updated }));
  if (result.skipped + skipped) parts.push(t('import.doneSkipped', { count: result.skipped + skipped }));
  if (result.locationsCreated.length) parts.push(t('import.doneLocations', { names: result.locationsCreated.join(', ') }));
  return parts.join(', ') + '.';
}
