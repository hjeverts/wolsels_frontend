import { Component, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { HouseholdService } from './core/household.service';
import { TranslatePipe, TranslationKey } from './core/i18n/i18n';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatDividerModule,
    MatToolbarModule,
    MatTabsModule,
    MatIconModule,
    MatMenuModule,
    TranslatePipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly households = inject(HouseholdService);
  private readonly router = inject(Router);

  constructor() {
    // Load the households after logging in (for the selector and the active household).
    effect(() => {
      if (this.auth.user()) this.households.load().subscribe();
    });
  }

  protected readonly links: { path: string; label: TranslationKey; icon: string }[] = [
    { path: '/voorraad', label: 'nav.stock', icon: 'inventory_2' },
    { path: '/mengsels', label: 'nav.blends', icon: 'blender' },
    { path: '/productie', label: 'nav.production', icon: 'agriculture' },
    { path: '/dieren', label: 'nav.animals', icon: 'cruelty_free' },
    { path: '/locaties', label: 'nav.locations', icon: 'location_on' },
  ];

  protected logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/inloggen']));
  }

  protected switchHousehold(id: number): void {
    if (id !== this.households.activeId()) this.households.switchTo(id);
  }
}
