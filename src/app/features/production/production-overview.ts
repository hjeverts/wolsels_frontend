import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Harvest } from '../../core/models';
import { GramsPipe } from '../../shared/grams.pipe';

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

@Component({
  selector: 'app-production-overview',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    GramsPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Productie ruwe wol</h1>
      <div class="inline">
        <mat-form-field subscriptSizing="dynamic" class="year">
          <mat-label>Jaar</mat-label>
          <mat-select [value]="year()" (selectionChange)="year.set($event.value)">
            <mat-option [value]="0">Alle jaren</mat-option>
            @for (y of years; track y) {
              <mat-option [value]="y">{{ y }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <a mat-flat-button routerLink="/productie/nieuw"><mat-icon>add</mat-icon> Oogst registreren</a>
      </div>
    </div>

    @if (summary.value(); as s) {
      <div class="stat-row">
        <div class="stat">
          <div class="label">Totaal geoogst</div>
          <div class="value">{{ s.totalGrams | grams }}</div>
        </div>
        <div class="stat">
          <div class="label">Oogstmomenten</div>
          <div class="value">{{ s.harvestCount }}</div>
        </div>
        <div class="stat">
          <div class="label">Gemiddeld per oogst</div>
          <div class="value">{{ s.harvestCount ? s.totalGrams / s.harvestCount : null | grams }}</div>
        </div>
      </div>

      @if (s.harvestCount) {
        <div class="charts">
          <mat-card appearance="outlined">
            <mat-card-content>
              <h2 class="section-title">Per maand</h2>
              <div class="bars">
                @for (m of months(); track m.label) {
                  <div class="bar-row">
                    <span class="bar-label muted">{{ m.label }}</span>
                    <span class="bar-track"><span class="bar" [style.width.%]="m.share"></span></span>
                    <span class="num">{{ m.totalGrams | grams }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card appearance="outlined">
            <mat-card-content>
              <h2 class="section-title">Per dier / locatie</h2>
              <div class="bars">
                @for (src of sources(); track src.kind + src.id) {
                  <div class="bar-row">
                    <span class="bar-label">
                      <mat-icon inline class="muted">{{ src.kind === 'animal' ? 'cruelty_free' : 'location_on' }}</mat-icon>
                      {{ src.name }}
                    </span>
                    <span class="bar-track"><span class="bar tertiary" [style.width.%]="src.share"></span></span>
                    <span class="num">{{ src.totalGrams | grams }}</span>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }
    }

    <h2 class="section-title">Oogsten</h2>
    @if (harvests.value(); as list) {
      @if (list.length) {
        <div class="table-wrap">
          <table mat-table [dataSource]="list">
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Datum</th>
              <td mat-cell *matCellDef="let h">{{ h.date | date: 'd MMM y' }}</td>
            </ng-container>
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>Dier / locatie</th>
              <td mat-cell *matCellDef="let h">
                <span class="inline">
                  <mat-icon inline class="muted">{{ h.animalId ? 'cruelty_free' : 'location_on' }}</mat-icon>
                  {{ h.animalName ?? h.locationName }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="method">
              <th mat-header-cell *matHeaderCellDef>Methode</th>
              <td mat-cell *matCellDef="let h" class="muted">{{ h.method }}</td>
            </ng-container>
            <ng-container matColumnDef="grade">
              <th mat-header-cell *matHeaderCellDef>Kwaliteit</th>
              <td mat-cell *matCellDef="let h" class="muted">{{ h.grade }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef class="num">Gewicht</th>
              <td mat-cell *matCellDef="let h" class="num">{{ h.weightGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let h; columns: columns" class="clickable" (click)="open(h)"></tr>
          </table>
        </div>
      } @else {
        <div class="empty">
          Nog geen oogsten geregistreerd{{ year() ? ' in ' + year() : '' }}.
          <br />Maak eerst <a routerLink="/dieren/nieuw">dieren</a> of <a routerLink="/locaties">locaties</a> aan.
        </div>
      }
    }
  `,
  styles: `
    .year {
      width: 140px;
    }
    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .bars {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .bar-row {
      display: grid;
      grid-template-columns: 110px 1fr 72px;
      align-items: center;
      gap: 8px;
    }
    .bar-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bar-track {
      height: 12px;
    }
    .bar {
      display: block;
      height: 100%;
      min-width: 2px;
      border-radius: 0 4px 4px 0;
      background: var(--mat-sys-primary);
      &.tertiary {
        background: var(--mat-sys-tertiary);
      }
    }
  `,
})
export class ProductionOverview {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly columns = ['date', 'source', 'method', 'grade', 'weight'];
  protected readonly years = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);
  protected readonly year = signal(new Date().getFullYear());

  protected readonly summary = rxResource({
    params: () => this.year(),
    stream: ({ params: year }) => this.api.harvests.summary(year || undefined),
  });
  protected readonly harvests = rxResource({
    params: () => this.year(),
    stream: ({ params: year }) => this.api.harvests.list(year ? { year } : undefined),
  });

  protected readonly months = computed(() => {
    const perMonth = this.summary.value()?.perMonth ?? [];
    const max = Math.max(...perMonth.map((m) => m.totalGrams), 1);
    const multiYear = new Set(perMonth.map((m) => m.year)).size > 1;
    return perMonth.map((m) => ({
      label: multiYear ? `${MONTHS[m.month - 1]} ${m.year}` : MONTHS[m.month - 1],
      totalGrams: m.totalGrams,
      share: (m.totalGrams / max) * 100,
    }));
  });

  protected readonly sources = computed(() => {
    const perSource = this.summary.value()?.perSource ?? [];
    const max = Math.max(...perSource.map((s) => s.totalGrams), 1);
    return perSource.map((s) => ({ ...s, share: (s.totalGrams / max) * 100 }));
  });

  protected open(harvest: Harvest): void {
    this.router.navigate(['/productie', harvest.id]);
  }
}
