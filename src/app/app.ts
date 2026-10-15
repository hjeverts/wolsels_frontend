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
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly households = inject(HouseholdService);
  private readonly router = inject(Router);

  constructor() {
    // Na inloggen de huishoudens laden (voor de keuzelijst en het actieve huishouden).
    effect(() => {
      if (this.auth.user()) this.households.load().subscribe();
    });
  }

  protected readonly links = [
    { path: '/voorraad', label: 'Voorraad', icon: 'inventory_2' },
    { path: '/mengsels', label: 'Mengsels', icon: 'blender' },
    { path: '/productie', label: 'Productie', icon: 'agriculture' },
    { path: '/dieren', label: 'Dieren', icon: 'cruelty_free' },
    { path: '/locaties', label: 'Locaties', icon: 'location_on' },
  ];

  protected logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/inloggen']));
  }

  protected switchHousehold(id: number): void {
    if (id !== this.households.activeId()) this.households.switchTo(id);
  }
}
