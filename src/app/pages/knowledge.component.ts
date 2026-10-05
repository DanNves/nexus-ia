import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-knowledge',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './knowledge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeComponent {
  readonly store = inject(NexusStore);
  readonly filter = signal('Todos');

  readonly items = computed(() => {
    const query = this.store.search().trim().toLowerCase();
    return this.store.knowledgeRecords()
      .filter(item => {
        if (this.filter() === 'Mais reutilizados' return (item.reuseCount ?? 0) > 0;
        if (this.filter() === 'Originados de chamados') return Boolean(item.sourceTicketId);
        return true;
      })
      .filter(item => !query || [
        item.id,
        item.title,
        item.description,
        item.solution,
        item.version,
        item.sourceTicketId ?? ''
      ].join(' ').toLowerCase().includes(query));
  });

  readonly total = computed(() => this.store.knowledgeRecords().length);
  readonly reuseTotal = computed(() => this.store.knowledgeRecords().reduce((sum, item) => sum + (item.reuseCount ?? 0), 0));
  readonly originCount = computed(() => this.store.knowledgeRecords().filter(item => item.sourceTicketId || item.relatedIds.some(id => id.startsWith('CH-'))).length);

  setFilter(value: string) { this.filter.set(value); }
  onSearchInput(event: Event) { this.store.setSearch((event.target as HTMLInputElement).value); }

  open(item: NexusRecord) {
    this.store.select(item);
  }
}
