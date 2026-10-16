import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

/** Toont een foto op groot formaat. */
@Component({
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <mat-dialog-content>
      <img [src]="data.src" [alt]="data.alt" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Sluiten</button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-content {
      padding: 8px;
    }
    img {
      display: block;
      max-width: 100%;
      max-height: 75vh;
      margin: 0 auto;
      border-radius: 8px;
    }
  `,
})
export class PhotoDialog {
  protected readonly data = inject<{ src: string; alt: string }>(MAT_DIALOG_DATA);
}
