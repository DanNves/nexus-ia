import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { View, NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-module',
  standalone: true,
  imports: [NxIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './module.component.html',
})
export class ModuleComponent {
  readonly store = inject(NexusStore);
  private readonly route = inject(ActivatedRoute);
  view: View = 'Demandas';
  filter = 'Todos';

  constructor() {
    this.route.data.subscribe(data => {
      this.view = (data['view'] as View | undefined) ?? 'Demandas';
      this.filter = 'Todos';
      this.store.setSearch('');
    });
  }

  get items() {
    const all = this.store.filteredRecords(this.view);
    if (this.filter === 'Todos') return all;
    return all.filter(r => r.status === this.filter);
  }

  statusFilters() {
    const base = ['Todos'];
    if (this.view === 'Chamados') return [...base, 'Pendente', 'Em análise', 'Em validação', 'Concluído'];
    if (this.view === 'Conhecimento') return [...base, 'Em validação', 'Concluído'];
    return [...base, 'Pendente', 'Em desenvolvimento', 'Em validação', 'Concluído'];
  }

  title() { return this.view; }

  description() {
    const map: Partial<Record<View,string>> = {
      Demandas:'Registre necessidades e acompanhe sua transformação em requisitos, versão e suporte.',
      Atividades:'Organize o trabalho que materializa uma demanda e acompanhe responsáveis.',
      Requisitos:'Mantenha a especificação vinculada à demanda e à versão da solução.',
      'Soluções e Versões':'Visualize o que foi publicado e quais informações chegam ao suporte.',
      Chamados:'Recupere contexto do desenvolvimento, analise o chamado e valide a sugestão da IA.',
      Conhecimento:'Transforme soluções validadas em conhecimento reutilizável no suporte.',
      Indicadores:'Acompanhe contexto recuperável, validação humana, chamados e conhecimento.',
      Configurações:'Visualize as regras e limites funcionais deste MVP.'
    };
    return map[this.view] ?? 'Acompanhe o contexto do ciclo de vida da solução.';
  }

  open(item: NexusRecord) { this.store.select(item); }

  create() {
    if (this.view === 'Demandas') this.store.openWizard('demanda');
    if (this.view === 'Atividades') this.store.openWizard('atividade');
  }

  openNextTicket() {
    const ticket = this.store.records().find(r => r.type === 'Chamado' && r.status !== 'Concluído');
    if (ticket) this.store.select(ticket);
  }

  setFilter(value: string) { this.filter = value; }

  contextReadyCount() {
    return this.items.filter(r => r.relatedIds.length > 0 && !/parcial|Aguardando/i.test(r.context)).length;
  }
}