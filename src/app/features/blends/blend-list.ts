import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Blend, BlendStatus } from '../../core/models';
import { swatchColor } from '../../shared/color-names';
import { ColorSwatch } from '../../shared/color-swatch';
import { GramsPipe } from '../../shared/grams.pipe';

@Component({
  selector: 'app-blend-list',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatIconModule,
    MatTableModule,
    ColorSwatch,
    GramsPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Mengsels</h1>
      <a mat-flat-button routerLink="/mengsels/nieuw"><mat-icon>add</mat-icon> Nieuw mengsel</a>
    </div>

    @if (blends(); as all) {
      @if (all.length) {
        <mat-button-toggle-group [value]="statusFilter()" (change)="statusFilter.set($event.value)" class="status-filter"
          hideSingleSelectionIndicator aria-label="Filter op status">
          <mat-button-toggle value="all">Alle</mat-button-toggle>
          <mat-button-toggle value="Planned">Gepland</mat-button-toggle>
          <mat-button-toggle value="Spun">Gesponnen</mat-button-toggle>
        </mat-button-toggle-group>

        <div class="table-wrap">
          <table mat-table [dataSource]="filtered()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Mengsel</th>
              <td mat-cell *matCellDef="let b">
                <div class="name">
                  {{ b.name }}
                  @if (b.status === 'Spun') {
                    <mat-icon inline class="spun" title="Gesponnen">check_circle</mat-icon>
                  }
                </div>
                <div class="ratio-bar" [title]="describe(b)">
                  @for (c of b.components; track $index) {
                    <span [style.flex]="c.percentage" [style.background]="c.colorHex || null"></span>
                  }
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="ratio">
              <th mat-header-cell *matHeaderCellDef>Verhouding</th>
              <td mat-cell *matCellDef="let b" class="muted">{{ describe(b) }}</td>
            </ng-container>
            <ng-container matColumnDef="input">
              <th mat-header-cell *matHeaderCellDef class="num">Input</th>
              <td mat-cell *matCellDef="let b" class="num">{{ b.inputWeightGrams | grams }}</td>
            </ng-container>
            <ng-container matColumnDef="output">
              <th mat-header-cell *matHeaderCellDef class="num">Output</th>
              <td mat-cell *matCellDef="let b" class="num">
                {{ b.outputWeightGrams | grams }}
                @if (b.yieldPercentage !== null) {
                  <div class="muted small">{{ b.yieldPercentage | number: '1.0-1' }}%</div>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="yarn">
              <th mat-header-cell *matHeaderCellDef>Garen</th>
              <td mat-cell *matCellDef="let b">
                <span class="inline">
                  @if (b.isDyed) {
                    <app-color-swatch [color]="dyeSwatch(b)" [label]="b.dyeColor" />
                  }
                  {{ yarn(b) }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Gesponnen</th>
              <td mat-cell *matCellDef="let b" class="muted">{{ b.spunOn | date: 'd MMM y' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let b; columns: columns" class="clickable" (click)="open(b)"></tr>
          </table>
          @if (!filtered().length) {
            <div class="empty">Geen mengsels met deze status.</div>
          }
        </div>
      } @else {
        <div class="empty">Nog geen mengsels. Maak je eerste mengsel aan.</div>
      }
    }
  `,
  styles: `
    .status-filter {
      margin-bottom: 12px;
    }
    .name {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .spun {
      color: var(--mat-sys-primary);
    }
    .ratio-bar {
      display: flex;
      height: 6px;
      width: 120px;
      border-radius: 3px;
      overflow: hidden;
      gap: 1px;
      margin-top: 4px;
      span {
        background: var(--mat-sys-surface-container-highest);
      }
    }
    .small {
      font: var(--mat-sys-body-small);
    }
  `,
})
export class BlendList {
  private readonly api = inject(ApiService);
  protected readonly dyeSwatch = (b: Blend) => swatchColor(b.dyeColorHex, b.dyeColor);
  private readonly router = inject(Router);

  protected readonly columns = ['name', 'ratio', 'input', 'output', 'yarn', 'date'];
  protected readonly blends = signal<Blend[] | null>(null);
  protected readonly statusFilter = signal<BlendStatus | 'all'>('all');
  protected readonly filtered = computed(() => {
    const status = this.statusFilter();
    return (this.blends() ?? []).filter((b) => status === 'all' || b.status === status);
  });

  constructor() {
    this.api.blends.list().subscribe((blends) => this.blends.set(blends));
  }

  protected describe(blend: Blend): string {
    return blend.components.map((c) => `${c.percentage}% ${c.woolName}`).join(' · ');
  }

  protected yarn(blend: Blend): string {
    return [blend.yarnWeight, blend.plyMethod ?? (blend.plyCount ? `${blend.plyCount}-draads` : null), blend.isDyed ? blend.dyeColor : null]
      .filter(Boolean)
      .join(', ');
  }

  protected open(blend: Blend): void {
    this.router.navigate(['/mengsels', blend.id]);
  }
}
