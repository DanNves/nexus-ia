import { Component, computed, inject } from '@angular/core';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-ai',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './ai.component.html',
})
export class AiComponent {
  readonly store = inject(NexusStore);

  readonly tickets = computed(() => this.store.records()
    .filter(r => r.type === 'Chamado')
    .sort((a, b) => (a.aiStatus === 'pending' ? 0 : 1) - (b.aiStatus === 'pending' ? 0 : 1)));

  readonly activeTicket = computed(() => {
    const selected = this.store.selected();
    if (selected?.type === 'Chamado') return selected;
    return this.tickets()[0] ?? null;
  });

  contextFor(ticket: NexusRecord) {
    return ticket.relatedIds
      .map(id => this.store.records().find(record => record.id === id))
      .filter((record): record is NexusRecord => Boolean(record));
  }

  analyze(ticket: NexusRecord) {
    this.store.analyzeAi(ticket.id);
  }

  approve(ticket: NexusRecord) {
    this.store.validateAi(ticket.id, true);
  }

  reject(ticket: NexusRecord) {
    this.store.validateAi(ticket.id, false);
  }

  open(ticket: NexusRecord) {
    this.store.select(ticket);
  }
}