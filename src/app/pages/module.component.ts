import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { View, NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-module',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './module.component.html',
})
export class ModuleComponent {
  readonly store = inject(NexusStore);
  private readonly route = inject(ActivatedRoute);
  view: View = 'Demandas';
  filter = 'Todos';

  constructor() {
    this.route.paramMap.subscribe(params => {
      const value = params.get('view') as View | null;
      this.view = value ?? 'Demandas';
      this.store.setSearch('');
    });
  }

  get items() {
    const all = this.store.filteredRecords(this.view);
    if (this.filter === 'Todos') return all;
    return all.filter(r => r.status === this.filter);
  }

  title() { return this.view; }
  description() {
    const map: Partial<Record<View,string>> = {
      Demandas:'Registre necessidades e acompanhe sua transformação em requisitos e solução.',
      Atividades:'Organize o trabalho que materializa uma demanda e acompanhe responsáveis.',
      Requisitos:'Mantenha a especificação vinculada à demanda e à versão da solução.',
      'Soluções e Versões':'Visualize a solução publicada e o contexto que chega ao suporte.',
      Chamados:'Atenda ocorrências recuperando o contexto produzido durante o desenvolvimento.',
      Conhecimento:'Reutilize soluções validadas e transforme atendimento em conhecimento.',
      Indicadores:'Acompanhe sinais do fluxo de contexto, atendimento e validação.',
      Configurações:'Preferências e parâmetros operacionais do ambiente NEXUS.'
    };
    return map[this.view] ?? 'Acompanhe o contexto do ciclo de vida da solução.';
  }
  open(item: NexusRecord) { this.store.select(item); }
  create() {
    if (this.view === 'Demandas') this.store.openWizard('demanda');
    if (this.view === 'Atividades') this.store.openWizard('atividade');
  }
  setFilter(value: string) { this.filter = value; }
}