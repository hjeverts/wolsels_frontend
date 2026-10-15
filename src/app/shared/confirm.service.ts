import { Component, Injectable, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';

@Component({
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuleren</button>
      <button mat-flat-button [mat-dialog-close]="true">{{ data.confirm }}</button>
    </mat-dialog-actions>
  `,
})
class ConfirmDialog {
  protected readonly data = inject<{ title: string; message: string; confirm: string }>(MAT_DIALOG_DATA);
}

@Component({
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Annuleren</button>
      @for (choice of data.choices; track choice.value; let last = $last) {
        @if (last) {
          <button mat-flat-button [mat-dialog-close]="choice.value">{{ choice.label }}</button>
        } @else {
          <button mat-stroked-button [mat-dialog-close]="choice.value">{{ choice.label }}</button>
        }
      }
    </mat-dialog-actions>
  `,
})
class ChoiceDialog {
  protected readonly data = inject<{ title: string; message: string; choices: { label: string; value: string }[] }>(MAT_DIALOG_DATA);
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly dialog = inject(MatDialog);

  ask(title: string, message: string, confirm = 'Verwijderen'): Observable<boolean> {
    return this.dialog
      .open(ConfirmDialog, { data: { title, message, confirm } })
      .afterClosed()
      .pipe(map((result) => result === true));
  }

  /** Vraagt een keuze uit meerdere opties; de laatste optie is de hoofdknop. Geeft null bij annuleren. */
  choose<T extends string>(title: string, message: string, choices: { label: string; value: T }[]): Observable<T | null> {
    return this.dialog
      .open(ChoiceDialog, { data: { title, message, choices } })
      .afterClosed()
      .pipe(map((result) => (result as T | undefined) ?? null));
  }
}
