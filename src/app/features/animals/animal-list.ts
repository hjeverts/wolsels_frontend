import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Animal } from '../../core/models';
import { downloadCsv } from '../../shared/csv';
import { today } from '../../shared/form-utils';
import { GramsPipe } from '../../shared/grams.pipe';
import { animalsToCsv } from './animal-csv';

@Component({
  selector: 'app-animal-list',
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatSlideToggleModule, MatTableModule, GramsPipe],
  template: `
    <div class="page-header">
      <h1>Dieren</h1>
      <div class="actions">
        <a mat-stroked-button routerLink="/dieren/importeren"><mat-icon>upload</mat-icon> Importeren</a>
        <button mat-stroked-button type="button" [matMenuTriggerFor]="exportMenu">
          <mat-icon>download</mat-icon> Exporteren
        </button>
        <mat-menu #exportMenu>
          <button mat-menu-item type="button" (click)="exportAll()" [disabled]="!animals()?.length">
            Alle dieren (CSV)
          </button>
          <button mat-menu-item type="button" (click)="exportTemplate()">Leeg sjabloon (CSV)</button>
        </mat-menu>
        <a mat-flat-button routerLink="/dieren/nieuw"><mat-icon>add</mat-icon> Dier toevoegen</a>
      </div>
    </div>

    @if (animals(); as all) {
      @if (all.length) {
        @if (hasInactive()) {
          <mat-slide-toggle [checked]="showInactive()" (change)="showInactive.set($event.checked)" class="toggle">
            Toon ook inactieve dieren
          </mat-slide-toggle>
        }
        <div class="table-wrap">
          <table mat-table [dataSource]="visible()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Naam</th>
              <td mat-cell *matCellDef="let a" [class.muted]="!a.active">
                {{ a.name }}
                @if (!a.active) {
                  <span class="muted">(inactief)</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="breed">
              <th mat-header-cell *matHeaderCellDef>Soort / ras</th>
              <td mat-cell *matCellDef="let a">{{ a.species }}{{ a.breed ? ' · ' + a.breed : '' }}</td>
            </ng-container>
            <ng-container matColumnDef="color">
              <th mat-header-cell *matHeaderCellDef>Kleur</th>
              <td mat-cell *matCellDef="let a" class="muted">{{ a.color }}</td>
            </ng-container>
            <ng-container matColumnDef="location">
              <th mat-header-cell *matHeaderCellDef>Locatie</th>
              <td mat-cell *matCellDef="let a" class="muted">{{ a.locationName }}</td>
            </ng-container>
            <ng-container matColumnDef="last">
              <th mat-header-cell *matHeaderCellDef>Laatste oogst</th>
              <td mat-cell *matCellDef="let a" class="muted">{{ a.lastHarvestDate | date: 'd MMM y' }}</td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef class="num">Totaal geoogst</th>
              <td mat-cell *matCellDef="let a" class="num">{{ a.totalHarvestedGrams | grams }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let a; columns: columns" class="clickable" (click)="open(a)"></tr>
          </table>
        </div>
      } @else {
        <div class="empty">
          Nog geen dieren. Voeg je konijnen (of andere wolproducenten) toe, of registreer oogsten per
          <a routerLink="/locaties">locatie</a> als je geen afzonderlijke dieren bijhoudt.
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
    downloadCsv(`wolsels-dieren-${today()}.csv`, animalsToCsv(this.animals() ?? []));
  }

  protected exportTemplate(): void {
    downloadCsv('wolsels-dieren-sjabloon.csv', animalsToCsv());
  }

  protected open(animal: Animal): void {
    this.router.navigate(['/dieren', animal.id]);
  }
}
