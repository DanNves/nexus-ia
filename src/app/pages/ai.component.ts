import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nx-ai',
  standalone: true,
  imports: [NxIconComponent, FormsModule],
  templateUrl: './ai.component.html',
})
export class AiComponent {
  readonly store = inject(NexusStore);
  humanNote = '';
  validationError = '';

  readonly tickets = computed(() => this.store.records()
    .filter(r => r.type === 'Chamado')
    .sort((a, b) => (a.aiStatus === 'pending' ? 0 : 1) - (b.aiStatus === 'pending' ? 0 : 1)));

  readonly activeTicket = computed(() => {
    const selected = this.store.selected();
    if (selected?.type === 'Chamado') return selected;
    return this.tickets()[0] ?? null;
  });

  contextFor(ticket: NexusRecord) {
    return this.store.aiContextFor(ticket.id);
  }

  contextCount(ticket: NexusRecord, types: string[]) {
    return this.contextFor(ticket).filter(record => types.includes(record.type)).length;
  }

  analyze(ticket: NexusRecord) {
    this.store.analyzeAi(ticket.id);
  }

  approve(ticket: NexusRecord) {
    this.store.validateAi(ticket.id, true, this.humanNote);
    this.validationError = '';
  }

  reject(ticket: NexusRecord) {
    if (!this.humanNote.trim()) {
      this.validationError = 'Informe o motivo ou ajuste antes de rejeitar.';
      return;
    }
    this.store.validateAi(ticket.id, false, this.humanNote);
    this.validationError = '';
  }

  open(ticket: NexusRecord) {
    this.store.select(ticket);
    this.humanNote = '';
    this.validationError = '';
  }
}