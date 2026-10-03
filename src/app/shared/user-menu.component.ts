import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NxIconComponent } from './icon.component';

@Component({
  selector: 'nx-user-menu',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './user-menu.component.html',
})
export class UserMenuComponent {
  @Output() settings = new EventEmitter<void>();
  constructor(private readonly router: Router) {}
  openSettings() { this.settings.emit(); }
}
