import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, Observable, catchError, concatMap, filter, from, map, of, switchMap, toArray } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { Harvest, Wool } from '../../core/models';
import { AutoColor, ColorHint, ColorPick } from '../../shared/auto-color';
import { swatchColor } from '../../shared/color-names';
import { ColorSwatch } from '../../shared/color-swatch';
import { GramsPipe } from '../../shared/grams.pipe';
import { ConfirmService } from '../../shared/confirm.service';
import { emptyToNull, toNumber } from '../../shared/form-utils';
import { ImageResizeError, ResizedPhoto, resizePhoto } from '../../shared/image-resize';
import { PhotoDialog } from './photo-dialog';

const MAX_PHOTOS = 10;

/** A saved photo, or (for a new lot) a photo that is uploaded on save. */
type PhotoItem =
  | { kind: 'saved'; id: number }
  | { kind: 'pending'; key: number; resized: ResizedPhoto; thumbnailUrl: string; photoUrl: string };

const commonWoolTypes = () => ['Merino', 'Shetland', 'Alpaca', 'Angora', 'Mohair', 'BFL', 'Gotland', t('wools.silk'), t('wools.cashmere'), 'Yak'];

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
    MatProgressSpinnerModule,
    MatTableModule,
    DatePipe,
    ColorHint,
    ColorPick,
    ColorSwatch,
    GramsPipe,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ (id() ? 'wools.edit' : 'wools.add') | t }}</h1>
    </div>

    <form [formGroup]="form" (ngSubmit)="save()">
      <div class="form-grid">
        <mat-form-field class="span-all">
          <mat-label>{{ 'common.name' | t }}</mat-label>
          <input matInput formControlName="name" [placeholder]="'wools.namePlaceholder' | t" required />
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'wools.woolType' | t }}</mat-label>
          <input matInput formControlName="woolType" [matAutocomplete]="types" required />
          <mat-autocomplete #types>
            @for (type of woolTypes(); track type) {
              <mat-option [value]="type">{{ type }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>

        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'wools.color' | t }}</mat-label>
          <input matInput formControlName="color" [placeholder]="'wools.colorPlaceholder' | t" required />
          <app-color-pick matSuffix [color]="autoColor" />
          <mat-hint><app-color-hint [color]="autoColor" /></mat-hint>
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'wools.weightInStock' | t }}</mat-label>
          <input matInput type="number" min="0" step="0.1" formControlName="weightGrams" required />
          <span matTextSuffix>g</span>
        </mat-form-field>

        <mat-form-field>
          <mat-label>{{ 'wools.originSupplier' | t }}</mat-label>
          <input matInput formControlName="origin" />
        </mat-form-field>

        <mat-form-field class="span-all">
          <mat-label>{{ 'common.notes' | t }}</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </div>

      <h2 class="section-title extra"><mat-icon>photo_camera</mat-icon> {{ 'wools.photos' | t }}</h2>
      <div class="photos">
        @for (p of photos(); track trackPhoto(p)) {
          <div class="photo">
            <button type="button" class="thumb" (click)="openPhoto(p)" [attr.aria-label]="'wools.enlargePhoto' | t: { n: $index + 1 }">
              <img [src]="thumbnailUrl(p)" alt="" loading="lazy" />
            </button>
            <button mat-icon-button type="button" class="remove" (click)="removePhoto(p)" [disabled]="saving()" [attr.aria-label]="'wools.deletePhoto' | t">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
        @if (photos().length < maxPhotos) {
          <input #photoInput type="file" accept="image/*" multiple hidden (change)="addPhotos(photoInput)" />
          <button type="button" class="add" (click)="photoInput.click()" [disabled]="processing() || saving()">
            @if (processing()) {
              <mat-spinner diameter="28" />
            } @else {
              <mat-icon>add_a_photo</mat-icon>
              <span>{{ 'wools.addPhoto' | t }}</span>
            }
          </button>
        }
      </div>
      <p class="muted small">
        {{ 'wools.photosNote' | t }}
        @if (!id() && photos().length) {
          {{ 'wools.photosUploadOnSave' | t }}
        }
      </p>

      <div class="form-actions">
        @if (id()) {
          <button mat-button type="button" (click)="remove()"><mat-icon>delete</mat-icon> {{ 'common.delete' | t }}</button>
        }
        <span class="spacer"></span>
        <a mat-button routerLink="/voorraad">{{ 'common.cancel' | t }}</a>
        <button mat-flat-button type="submit" [disabled]="saving() || processing()">{{ 'common.save' | t }}</button>
      </div>
    </form>

    @if (id()) {
      @if (harvests().length) {
        <h2 class="section-title extra"><mat-icon>agriculture</mat-icon> {{ 'wools.fromHarvests' | t }}</h2>
        <div class="table-wrap">
          <table mat-table [dataSource]="harvests()">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.date' | t }}</th>
              <td mat-cell *matCellDef="let h">{{ h.date | date: 'd MMM y' }}</td>
            </ng-container>
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>{{ 'harvest.animalOrLocation' | t }}</th>
              <td mat-cell *matCellDef="let h">{{ h.animalName ?? h.locationName }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef class="num">{{ 'common.weight' | t }}</th>
              <td mat-cell *matCellDef="let h" class="num">{{ h.weightGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="harvestColumns"></tr>
            <tr mat-row *matRowDef="let h; columns: harvestColumns" class="clickable" [routerLink]="['/productie', h.id]"></tr>
          </table>
        </div>
        <p class="muted small">{{ 'wools.harvestedTotal' | t: { weight: (harvestTotal() | grams) } }}</p>
      }

      @if (mergeCandidates().length) {
        <h2 class="section-title extra"><mat-icon>call_merge</mat-icon> {{ 'wools.merge' | t }}</h2>
        <p class="muted">
          {{ 'wools.mergeIntro' | t }}
        </p>
        <div class="merge">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>{{ 'wools.mergeWith' | t }}</mat-label>
            <mat-select [value]="mergeTarget()" (selectionChange)="mergeTarget.set($event.value)">
              @for (w of mergeCandidates(); track w.id) {
                <mat-option [value]="w.id">
                  <span class="inline"><app-color-swatch [color]="swatch(w)" /> {{ w.name }}
                    <span class="muted">· {{ w.woolType }} · {{ w.weightGrams | grams }}</span></span>
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="merge()" [disabled]="!mergeTarget()">
            <mat-icon>call_merge</mat-icon> {{ 'wools.merge' | t }}
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
    .photos {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .photo {
      position: relative;
    }
    .thumb,
    .add {
      width: 112px;
      height: 112px;
      border-radius: 12px;
      overflow: hidden;
      padding: 0;
      cursor: pointer;
    }
    .thumb {
      border: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container);
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }
    .add {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 1px dashed var(--mat-sys-outline);
      background: none;
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-medium);
      &:disabled {
        cursor: default;
      }
    }
    .remove {
      position: absolute;
      top: 4px;
      right: 4px;
      background: color-mix(in srgb, var(--mat-sys-surface) 85%, transparent);
    }
  `,
})
export class WoolForm implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

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

  protected readonly maxPhotos = MAX_PHOTOS;
  protected readonly photos = signal<PhotoItem[]>([]);
  protected readonly processing = signal(false);
  private pendingKey = 0;
  /** Form closed: ongoing photo processing then stops (no new previews or uploads). */
  private destroyed = false;

  /** The dot follows the colour name until you pick a colour yourself. */
  protected readonly autoColor = new AutoColor(this.form.controls.color, this.form.controls.colorHex);
  protected readonly swatch = (w: Wool) => swatchColor(w.colorHex, w.color);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.photos().forEach((p) => this.revoke(p));
    });
  }

  private readonly existingTypes = computed(() => [...new Set(this.allWools().map((w) => w.woolType))]);
  private readonly typeInput = toSignal(this.form.controls.woolType.valueChanges, { initialValue: '' });
  protected readonly woolTypes = computed(() => {
    const term = this.typeInput().toLowerCase();
    return [...new Set([...this.existingTypes(), ...commonWoolTypes()])]
      .filter((type) => type.toLowerCase().includes(term))
      .sort((a, b) => a.localeCompare(b));
  });

  ngOnInit(): void {
    this.api.wools.list().subscribe((wools) => this.allWools.set(wools));
    const id = this.id();
    if (!id) return;
    this.api.harvests.list({ woolId: +id }).subscribe((h) => this.harvests.set(h));
    this.api.wools.get(+id).subscribe((wool) => {
      this.photos.set(wool.photoIds.map((photoId) => ({ kind: 'saved', id: photoId })));
      this.form.reset({
        name: wool.name,
        woolType: wool.woolType,
        color: wool.color,
        colorHex: wool.colorHex,
        weightGrams: wool.weightGrams,
        origin: wool.origin ?? '',
        notes: wool.notes ?? '',
      });
      this.autoColor.loaded();
    });
  }

  protected trackPhoto(p: PhotoItem): string {
    return p.kind === 'saved' ? `s${p.id}` : `p${p.key}`;
  }

  protected thumbnailUrl(p: PhotoItem): string {
    return p.kind === 'saved' ? this.api.wools.photoUrl(+this.id()!, p.id, true) : p.thumbnailUrl;
  }

  protected openPhoto(p: PhotoItem): void {
    const src = p.kind === 'saved' ? this.api.wools.photoUrl(+this.id()!, p.id) : p.photoUrl;
    const name = this.form.controls.name.value.trim();
    this.dialog.open(PhotoDialog, {
      data: { src, alt: name },
      ariaLabel: name ? t('wools.photoOf', { name }) : t('wools.photo'),
      maxWidth: '95vw',
    });
  }

  /** Resizes the chosen photos; for an existing lot they are uploaded right away. */
  protected async addPhotos(input: HTMLInputElement): Promise<void> {
    // While saving, the set of photos to upload is fixed.
    if (this.saving()) {
      input.value = '';
      return;
    }
    const files = [...(input.files ?? [])].slice(0, MAX_PHOTOS - this.photos().length);
    input.value = '';
    if (!files.length) return;
    this.processing.set(true);
    try {
      for (const file of files) {
        if (this.destroyed) return;
        const resized = await resizePhoto(file);
        if (this.destroyed) return;
        const id = this.id();
        if (id) {
          const photoId = await new Promise<number>((resolve, reject) =>
            this.api.wools.uploadPhoto(+id, resized.photo, resized.thumbnail).subscribe({ next: resolve, error: reject }),
          );
          this.photos.update((list) => [...list, { kind: 'saved', id: photoId }]);
        } else {
          const item: PhotoItem = {
            kind: 'pending',
            key: this.pendingKey++,
            resized,
            thumbnailUrl: URL.createObjectURL(resized.thumbnail),
            photoUrl: URL.createObjectURL(resized.photo),
          };
          this.photos.update((list) => [...list, item]);
        }
      }
    } catch (e) {
      // The error interceptor already shows server errors.
      if (e instanceof ImageResizeError) this.snackBar.open(e.message, t('common.close'), { duration: 8000 });
    } finally {
      this.processing.set(false);
    }
  }

  protected removePhoto(p: PhotoItem): void {
    if (this.saving()) return;
    if (p.kind === 'pending') {
      this.revoke(p);
      this.photos.update((list) => list.filter((x) => x !== p));
      return;
    }
    this.confirm
      .ask(t('wools.deletePhoto'), t('wools.deletePhotoConfirm'))
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.wools.deletePhoto(+this.id()!, p.id)),
      )
      .subscribe(() => this.photos.update((list) => list.filter((x) => x !== p)));
  }

  private revoke(p: PhotoItem): void {
    if (p.kind !== 'pending') return;
    URL.revokeObjectURL(p.thumbnailUrl);
    URL.revokeObjectURL(p.photoUrl);
  }

  /** Uploads the photos chosen for a new lot, one by one. */
  private uploadPending(woolId: number): Observable<unknown> {
    const pending = this.photos().filter((p) => p.kind === 'pending');
    if (!pending.length) return of(null);
    return from(pending).pipe(
      concatMap((p) => this.api.wools.uploadPhoto(woolId, p.resized.photo, p.resized.thumbnail)),
      toArray(),
    );
  }

  protected save(): void {
    // Wait until chosen photos are resized, and don't save twice.
    if (this.saving() || this.processing()) return;
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
        colorHex: this.autoColor.saveValue(),
        weightGrams: toNumber(v.weightGrams) ?? 0,
        origin: emptyToNull(v.origin),
        notes: emptyToNull(v.notes),
      })
      .pipe(
        switchMap((wool) =>
          this.uploadPending(wool.id).pipe(
            map(() => wool),
            // The lot already exists: go to the edit page, so that saving again doesn't create a second lot.
            catchError(() => {
              this.router.navigate(['/voorraad', wool.id]);
              return EMPTY;
            }),
          ),
        ),
      )
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
    const warning = differs ? ` ${t('wools.mergeDiffers', { type: target.woolType, color: target.color })}` : '';
    this.confirm
      .ask(
        t('wools.mergeTitle'),
        t('wools.mergeConfirm', { name: v.name, weight: v.weightGrams ?? 0, target: target.name }) + warning,
        t('wools.merge'),
      )
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.wools.merge(+this.id()!, target.id)),
      )
      .subscribe((merged) => this.router.navigate(['/voorraad', merged.id]));
  }

  protected remove(): void {
    this.confirm
      .ask(t('wools.deleteTitle'), t('common.deleteConfirm', { name: this.form.controls.name.value }))
      .pipe(
        filter(Boolean),
        switchMap(() => this.api.wools.delete(+this.id()!)),
      )
      .subscribe(() => this.router.navigate(['/voorraad']));
  }
}
