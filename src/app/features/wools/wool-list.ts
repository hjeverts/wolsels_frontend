import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TranslatePipe } from '../../core/i18n/i18n';
import { Wool } from '../../core/models';
import { swatchColor } from '../../shared/color-names';
import { ColorSwatch } from '../../shared/color-swatch';
import { GramsPipe } from '../../shared/grams.pipe';

@Component({
  selector: 'app-wool-list',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    ColorSwatch,
    GramsPipe,
    TranslatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>{{ 'wools.title' | t }}</h1>
      <a mat-flat-button routerLink="/voorraad/nieuw"><mat-icon>add</mat-icon> {{ 'wools.add' | t }}</a>
    </div>

    @if (wools(); as all) {
      @if (all.length) {
        <div class="stat-row">
          <div class="stat">
            <div class="label">{{ 'wools.totalInStock' | t }}</div>
            <div class="value">{{ totalWeight() | grams }}</div>
          </div>
          <div class="stat">
            <div class="label">{{ 'wools.lots' | t }}</div>
            <div class="value">{{ all.length }}</div>
          </div>
          <div class="stat">
            <div class="label">{{ 'wools.types' | t }}</div>
            <div class="value">{{ typeCount() }}</div>
          </div>
        </div>

        <mat-form-field class="filter" subscriptSizing="dynamic">
          <mat-label>{{ 'common.search' | t }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [value]="filter()" (input)="filter.set($any($event.target).value)" [placeholder]="'wools.searchPlaceholder' | t" />
        </mat-form-field>

        <div class="table-wrap">
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="photo">
              <th mat-header-cell *matHeaderCellDef class="photo-cell"><span class="cdk-visually-hidden">{{ 'wools.photo' | t }}</span></th>
              <td mat-cell *matCellDef="let w" class="photo-cell">
                @if (w.photoIds.length) {
                  <img class="thumb" [src]="thumbnailUrl(w)" alt="" loading="lazy" />
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | t }}</th>
              <td mat-cell *matCellDef="let w">
                <span class="inline"><app-color-swatch [color]="swatch(w)" [label]="w.color" /> {{ w.name }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="woolType">
              <th mat-header-cell *matHeaderCellDef>{{ 'wools.woolType' | t }}</th>
              <td mat-cell *matCellDef="let w">{{ w.woolType }}</td>
            </ng-container>
            <ng-container matColumnDef="color">
              <th mat-header-cell *matHeaderCellDef>{{ 'wools.color' | t }}</th>
              <td mat-cell *matCellDef="let w">{{ w.color }}</td>
            </ng-container>
            <ng-container matColumnDef="origin">
              <th mat-header-cell *matHeaderCellDef>{{ 'wools.origin' | t }}</th>
              <td mat-cell *matCellDef="let w" class="muted">{{ w.origin }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef class="num">{{ 'common.weight' | t }}</th>
              <td mat-cell *matCellDef="let w" class="num">{{ w.weightGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns()"></tr>
            <tr mat-row *matRowDef="let w; columns: columns()" class="clickable" (click)="open(w)"></tr>
          </table>
          @if (!filtered().length) {
            <div class="empty">{{ 'wools.noneFound' | t: { term: filter() } }}</div>
          }
        </div>
      } @else {
        <div class="empty">{{ 'wools.empty' | t }}</div>
      }
    }
  `,
  styles: `
    .photo-cell {
      width: 48px;
      padding-right: 0;
    }
    .thumb {
      display: block;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
    }
    .filter {
      width: 100%;
      max-width: 360px;
      margin-bottom: 8px;
    }
  `,
})
export class WoolList {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly baseColumns = ['name', 'woolType', 'color', 'origin', 'weight'];
  /** De fotokolom alleen als er partijen met een foto zijn. */
  protected readonly columns = computed(() =>
    (this.wools() ?? []).some((w) => w.photoIds.length) ? ['photo', ...this.baseColumns] : this.baseColumns,
  );
  protected readonly swatch = (w: Wool) => swatchColor(w.colorHex, w.color);
  protected readonly wools = signal<Wool[] | null>(null);
  protected readonly filter = signal('');

  protected readonly filtered = computed(() => {
    const term = this.filter().trim().toLowerCase();
    const all = this.wools() ?? [];
    return term
      ? all.filter((w) => [w.name, w.woolType, w.color, w.origin].some((v) => v?.toLowerCase().includes(term)))
      : all;
  });
  protected readonly totalWeight = computed(() => (this.wools() ?? []).reduce((sum, w) => sum + w.weightGrams, 0));
  protected readonly typeCount = computed(() => new Set((this.wools() ?? []).map((w) => w.woolType.toLowerCase())).size);

  constructor() {
    this.api.wools.list().subscribe((wools) => this.wools.set(wools));
  }

  protected thumbnailUrl(wool: Wool): string {
    return this.api.wools.photoUrl(wool.id, wool.photoIds[0], true);
  }

  protected open(wool: Wool): void {
    this.router.navigate(['/voorraad', wool.id]);
  }
}
