import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { NexusRecord } from '../models/nexus.models';
import { currentUser } from '../data/nexus.data';

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

  readonly currentUser = currentUser;

  readonly attention = computed(() => {
    const priority = { 'Alta': 0, 'Média': 1, 'Normal': 2, 'Baixa': 3 };
    return this.store.records()
      .filter(r => r.nextAction || r.status === 'Em validação' || (r.type === 'Chamado' && r.status !== 'Concluído'))
      .sort((a, b) => (priority[a.priority] - priority[b.priority]) || a.date.localeCompare(b.date))
      .slice(0, 3);
  });

  readonly nextAction = computed(() => this.attention()[0] ?? this.tickets()[0] ?? null);
  readonly trace = computed(() => {
    const ticket = this.tickets()[0];
    if (!ticket) return [] as string[];
    const context = this.store.aiContextFor(ticket.id);
    const pick = (type: string) => context.find(record => record.type === type)?.id;
    return [pick('Demanda'), pick('Requisito'), pick('Versão'), ticket.id, pick('Conhecimento')].filter((id): id is string => Boolean(id));
  });


  open(record: NexusRecord) { this.store.select(record); }
  openTrace(id: string) { this.store.selectById(id); }
  go(view: string) { this.router.navigate(['/', view]); }

  traceRecord(id: string) {
    return this.store.records().find(record => record.id === id);
  }

  traceLabel(id: string) {
    const type = this.traceRecord(id)?.type;
    return type === 'Demanda' ? 'Demanda'
      : type === 'Requisito' ? 'Requisito'
      : type === 'Versão' ? 'Versão'
      : type === 'Chamado' ? 'Chamado'
      : 'Conhecimento';
  }

  advance(record: NexusRecord) {
    // O dashboard nunca toma a decisão humana sobre uma sugestão da IA.
    // Ele apenas leva o profissional ao registro onde a decisão deve ocorrer.
    this.store.select(record);
  }
}