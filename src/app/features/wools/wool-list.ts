import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Wool } from '../../core/models';
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
  ],
  template: `
    <div class="page-header">
      <h1>Wolvoorraad</h1>
      <a mat-flat-button routerLink="/voorraad/nieuw"><mat-icon>add</mat-icon> Wol toevoegen</a>
    </div>

    @if (wools(); as all) {
      @if (all.length) {
        <div class="stat-row">
          <div class="stat">
            <div class="label">Totaal op voorraad</div>
            <div class="value">{{ totalWeight() | grams }}</div>
          </div>
          <div class="stat">
            <div class="label">Partijen</div>
            <div class="value">{{ all.length }}</div>
          </div>
          <div class="stat">
            <div class="label">Wolsoorten</div>
            <div class="value">{{ typeCount() }}</div>
          </div>
        </div>

        <mat-form-field class="filter" subscriptSizing="dynamic">
          <mat-label>Zoeken</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [value]="filter()" (input)="filter.set($any($event.target).value)" placeholder="Naam, soort of kleur" />
        </mat-form-field>

        <div class="table-wrap">
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Naam</th>
              <td mat-cell *matCellDef="let w">
                <span class="inline"><app-color-swatch [color]="w.colorHex" [label]="w.color" /> {{ w.name }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="woolType">
              <th mat-header-cell *matHeaderCellDef>Wolsoort</th>
              <td mat-cell *matCellDef="let w">{{ w.woolType }}</td>
            </ng-container>
            <ng-container matColumnDef="color">
              <th mat-header-cell *matHeaderCellDef>Kleur</th>
              <td mat-cell *matCellDef="let w">{{ w.color }}</td>
            </ng-container>
            <ng-container matColumnDef="origin">
              <th mat-header-cell *matHeaderCellDef>Herkomst</th>
              <td mat-cell *matCellDef="let w" class="muted">{{ w.origin }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef class="num">Gewicht</th>
              <td mat-cell *matCellDef="let w" class="num">{{ w.weightGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let w; columns: columns" class="clickable" (click)="open(w)"></tr>
          </table>
          @if (!filtered().length) {
            <div class="empty">Geen wol gevonden voor "{{ filter() }}".</div>
          }
        </div>
      } @else {
        <div class="empty">Nog geen wol op voorraad. Voeg je eerste partij toe.</div>
      }
    }
  `,
  styles: `
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

  protected readonly columns = ['name', 'woolType', 'color', 'origin', 'weight'];
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

  protected open(wool: Wool): void {
    this.router.navigate(['/voorraad', wool.id]);
  }
}
