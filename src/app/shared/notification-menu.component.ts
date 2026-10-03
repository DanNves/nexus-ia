import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { NexusStore } from '../services/nexus.store';
import { NexusRecord } from '../models/nexus.models';
import { NxIconComponent } from './icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nx-notification-menu',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './notification-menu.component.html',
})
export class NotificationMenuComponent {
  readonly store = inject(NexusStore);
  @Output() selected = new EventEmitter<NexusRecord>();
  readonly notifications = computed(() => this.store.records()
    .filter(r => (r.type === 'Chamado' && r.aiStatus === 'pending') || r.status === 'Em validação')
    .slice(0, 5));
  open(record: NexusRecord) { this.selected.emit(record); }
}
