import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    const order = ['CH-028','DEM-011','ATV-021'];
    return this.store.records()
      .filter(r => r.nextAction || r.status === 'Em validação' || (r.type === 'Chamado' && r.status !== 'Concluído'))
      .sort((a,b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      })
      .slice(0, 3);
  });

  readonly nextAction = computed(() => this.attention()[0] ?? this.tickets()[0] ?? null);
  readonly trace = ['DEM-012','REQ-014','VER-120','CH-028','KB-007'];

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