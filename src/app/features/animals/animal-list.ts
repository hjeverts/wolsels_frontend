import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { TranslatePipe, t } from '../../core/i18n/i18n';
import { Animal } from '../../core/models';
import { downloadCsv } from '../../shared/csv';
import { today } from '../../shared/form-utils';
import { GramsPipe } from '../../shared/grams.pipe';
import { animalsToCsv } from './animal-csv';

@Component({
  selector: 'app-animal-list',
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatSlideToggleModule, MatTableModule, GramsPipe, TranslatePipe],
  template: `
    <div class="page-header">
      <h1>{{ 'nav.animals' | t }}</h1>
      <div class="actions">
        <a mat-stroked-button routerLink="/dieren/importeren"><mat-icon>upload</mat-icon> {{ 'animals.import' | t }}</a>
        <button mat-stroked-button type="button" [matMenuTriggerFor]="exportMenu">
          <mat-icon>download</mat-icon> {{ 'animals.export' | t }}
        </button>
        <mat-menu #exportMenu>
          <button mat-menu-item type="button" (click)="exportAll()" [disabled]="!animals()?.length">
            {{ 'animals.exportAll' | t }}
          </button>
          <button mat-menu-item type="button" (click)="exportTemplate()">{{ 'animals.exportTemplate' | t }}</button>
        </mat-menu>
        <a mat-flat-button routerLink="/dieren/nieuw"><mat-icon>add</mat-icon> {{ 'animals.add' | t }}</a>
      </div>
    </div>

    @if (animals(); as all) {
      @if (all.length) {
        @if (hasInactive()) {
          <mat-slide-toggle [checked]="showInactive()" (change)="showInactive.set($event.checked)" class="toggle">
            {{ 'animals.showInactive' | t }}
          </mat-slide-toggle>
        }
        <div class="table-wrap">
          <table mat-table [dataSource]="visible()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ 'common.name' | t }}</th>
              <td mat-cell *matCellDef="let a" [class.muted]="!a.active">
                {{ a.name }}
                @if (!a.active) {
                  <span class="muted">{{ 'harvest.inactive' | t }}</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="breed">
              <th mat-header-cell *matHeaderCellDef>{{ 'animals.speciesBreed' | t }}</th>
              <td mat-cell *matCellDef="let a">{{ a.species }}{{ a.breed ? ' · ' + a.breed : '' }}</td>
            </ng-container>
            <ng-container matColumnDef="color">
              <th mat-header-cell *matHeaderCellDef>{{ 'wools.color' | t }}</th>
              <td mat-cell *matCellDef="let a" class="muted">{{ a.color }}</td>
            </ng-container>
            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef>{{ 'harvest.location' | t }}</th>
              <td mat-cell *matCellDef="let a" class="muted">{{ a.locationName }}</td>
            </ng-container>
            <ng-container matColumnDef="last">
              <th mat-header-cell *matHeaderCellDef>{{ 'animals.lastHarvest' | t }}</th>
              <td mat-cell *matCellDef="let a" class="muted">{{ a.lastHarvestDate | date: 'd MMM y' }}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef class="num">{{ 'production.totalHarvested' | t }}</th>
              <td mat-cell *matCellDef="let a" class="num">{{ a.totalHarvestedGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let a; columns: columns" class="clickable" (click)="open(a)"></tr>
          </table>
        </div>
      } @else {
        <div class="empty">
          {{ 'animals.empty' | t }}
          <a routerLink="/locaties">{{ 'animals.emptyLocations' | t }}</a>
        </div>
      }
    }
  `,
  styles: `
    .toggle {
      margin-bottom: 12px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class AnimalList {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly columns = ['name', 'breed', 'color', 'location', 'last', 'total'];
  protected readonly animals = signal<Animal[] | null>(null);
  protected readonly showInactive = signal(false);
  protected readonly hasInactive = computed(() => (this.animals() ?? []).some((a) => !a.active));
  protected readonly visible = computed(() => (this.animals() ?? []).filter((a) => a.active || this.showInactive()));

  constructor() {
    this.api.animals.list().subscribe((animals) => this.animals.set(animals));
  }

  /** Alle dieren, ook inactieve; het bestand kan na bewerken weer geïmporteerd worden. */
  protected exportAll(): void {
    downloadCsv(`${t('animals.exportFileName')}-${today()}.csv`, animalsToCsv(this.animals() ?? []));
  }

  protected exportTemplate(): void {
    downloadCsv(`${t('animals.templateFileName')}.csv`, animalsToCsv());
  }

  protected open(animal: Animal): void {
    this.router.navigate(['/dieren', animal.id]);
  }
}
