import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-dashboard',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  readonly store = inject(NexusStore);
  private readonly router = inject(Router);

  readonly tickets = computed(() => this.store.records()
    .filter(r => r.type === 'Chamado')
    .sort((a,b) => {
      const rank = (record: NexusRecord) => record.aiStatus === 'pending' ? 0 : record.status !== 'Concluído' ? 1 : 2;
      return rank(a) - rank(b);
    })
    .slice(0, 3));

  readonly attention = computed(() => {
    const priorityRank: Record<string, number> = { Alta: 0, Média: 1, Normal: 2, Baixa: 3 };
    return this.store.records()
      .filter(r => r.nextAction || r.status === 'Em validação' || (r.type === 'Chamado' && r.status !== 'Concluído'))
      .sort((a,b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) || a.date.localeCompare(b.date))
      .slice(0, 3);
  });

  readonly nextAction = computed(() => this.attention()[0] ?? this.tickets()[0] ?? null);

  readonly trace = computed(() => {
    const ticket = this.tickets()[0];
    if (!ticket) return [];
    return [ticket, ...this.store.aiContextFor(ticket.id)].slice(0, 6);
  });

  open(record: NexusRecord) { this.store.select(record); }
  openTrace(id: string) { this.store.selectById(id); }
  go(view: string) { this.router.navigate(['/', view]); }

  advance(record: NexusRecord) {
    // O dashboard nunca toma a decisão humana sobre uma sugestão da IA.
    // Ele apenas leva o profissional ao registro onde a decisão deve ocorrer.
    this.store.select(record);
  }
}