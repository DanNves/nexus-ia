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
  readonly tickets = computed(() => this.store.records().filter(r => r.type === 'Chamado').slice(0, 3));
  readonly attention = computed(() => { const order = ['CH-028','DEM-011','ATV-021']; return this.store.records().filter(r => r.nextAction || r.status === 'Em validação' || (r.type === 'Chamado' && r.status !== 'Concluído')).sort((a,b) => (order.indexOf(a.id) === -1 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) === -1 ? 99 : order.indexOf(b.id))).slice(0, 3); });
  readonly nextAction = computed(() => this.attention()[0] ?? this.tickets()[0] ?? null);
  readonly trace = ['DEM-012','REQ-014','v1.2.0','CH-028','KB-007'];

  open(record: NexusRecord) { this.store.select(record); }
  go(view: string) { this.router.navigate(['/', view]); }
  advance(record: NexusRecord) {
    if (record.type === 'Chamado' && record.aiValidated !== true) this.store.validateAi(record.id, true);
    else this.store.changeStatus(record.id, 'Em desenvolvimento');
  }
}