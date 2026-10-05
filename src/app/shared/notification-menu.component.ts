import { Component, inject, input, output } from '@angular/core';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-notification-menu',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './notification-menu.component.html',
})
export class NotificationMenuComponent {
  readonly store=inject(NexusStore);
  readonly open=input(false);
  readonly closed=output<void>();
  readonly recordSelected=output<NexusRecord>();
  readonly notifications = this.store.records;
  pending() { return this.store.pendingNotifications(); }
  select(record:NexusRecord) { this.recordSelected.emit(record); this.closed.emit(); }
}