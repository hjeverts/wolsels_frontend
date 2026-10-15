import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatTabsModule, MatIconModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly links = [
    { path: '/voorraad', label: 'Voorraad', icon: 'inventory_2' },
    { path: '/mengsels', label: 'Mengsels', icon: 'blender' },
    { path: '/productie', label: 'Productie', icon: 'agriculture' },
    { path: '/dieren', label: 'Dieren', icon: 'cruelty_free' },
    { path: '/locaties', label: 'Locaties', icon: 'location_on' },
  ];
}
