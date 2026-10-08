import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-dashboard',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly attention = computed(() => this.store.records()
    .filter(r => Boolean(r.nextAction) || r.status === 'Em validação' || (r.type === 'Chamado' && r.status !== 'Concluído'))
    .sort((a, b) => {
      const priority = { Alta: 0, Média: 1, Normal: 2, Baixa: 3 };
      const aPending = a.type === 'Chamado' && a.aiStatus === 'pending' ? 0 : 1;
      const bPending = b.type === 'Chamado' && b.aiStatus === 'pending' ? 0 : 1;
      return aPending - bPending || (priority[a.priority] ?? 9) - (priority[b.priority] ?? 9);
    })
    .slice(0, 3));

  readonly nextAction = computed(() => this.attention()[0] ?? this.tickets()[0] ?? null);

  readonly trace = computed(() => {
    const records = this.store.records();
    const demand = records.find(r => r.type === 'Demanda' && r.relatedIds.some(id => records.find(x => x.id === id)?.type === 'Requisito'));
    if (!demand) return [];
    const requirement = records.find(r => r.type === 'Requisito' && (demand.relatedIds.includes(r.id) || r.parentId === demand.id));
    const version = records.find(r => r.type === 'Versão' && (demand.relatedIds.includes(r.id) || r.relatedIds.includes(demand.id)));
    const ticket = records.find(r => r.type === 'Chamado' && (demand.relatedIds.includes(r.id) || r.relatedIds.includes(version?.id ?? '')));
    const knowledge = ticket ? records.find(r => r.type === 'Conhecimento' && (ticket.relatedIds.includes(r.id) || r.sourceTicketId === ticket.id)) : undefined;
    return [demand, requirement, version, ticket, knowledge].filter((item): item is NexusRecord => Boolean(item)).map(item => item.id);
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