import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NexusRecord } from '../models/nexus.models';
import { NxIconComponent } from './icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nx-global-search',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
  templateUrl: './global-search.component.html',
})
export class GlobalSearchComponent {
  readonly store = inject(NexusStore);
  readonly query = signal('');
  @Output() closed = new EventEmitter<void>();
  @Output() selected = new EventEmitter<NexusRecord>();

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    return this.store.records()
      .filter(r => [r.id, r.title, r.description, r.solution, r.version].join(' ').toLowerCase().includes(q))
      .slice(0, 6);
  });

  close() { this.closed.emit(); }
  open(record: NexusRecord) { this.selected.emit(record); }
}
