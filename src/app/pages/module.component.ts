import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from '../shared/icon.component';
import { View, NexusRecord } from '../models/nexus.models';
import { RECORD_UI } from '../shared/nexus-ui.config';

@Component({
  selector: 'nx-module',
  standalone: true,
  imports: [NxIconComponent, RouterLink, RouterLinkActive],
  templateUrl: './module.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModuleComponent {
  readonly store = inject(NexusStore);
  private readonly route = inject(ActivatedRoute);
  readonly view = signal<View>('Demandas');
  readonly filter = signal('Todos');

  constructor() {
    this.route.data.subscribe(data => {
      this.view.set((data['view'] as View | undefined) ?? 'Demandas');
      this.filter.set('Todos');
      this.store.setSearch('');
    });
  }

  readonly items = computed(() => {
    const all = this.store.filteredRecords(this.view());
    return this.filter() === 'Todos' ? all : all.filter(r => r.status === this.filter());
  });

  readonly statusOptions = computed(() => {
    const base = ['Todos'];
    if (this.view() === 'Chamados') return [...base, 'Pendente', 'Em análise', 'Em validação', 'Concluído'];
    if (this.view() === 'Requisitos' || this.view() === 'Conhecimento') return [...base, 'Pendente', 'Em validação', 'Concluído'];
    if (this.view() === 'Soluções e Versões') return [...base, 'Em desenvolvimento', 'Em validação', 'Concluído'];
    return [...base, 'Pendente', 'Em desenvolvimento', 'Em validação', 'Concluído'];
  });

  statusFilters() {
    const base = ['Todos'];
    if (this.view() === 'Chamados') return [...base, 'Pendente', 'Em análise', 'Em validação', 'Concluído'];
    if (this.view() === 'Requisitos' || this.view() === 'Conhecimento') return [...base, 'Pendente', 'Em validação', 'Concluído'];
    if (this.view() === 'Soluções e Versões') return [...base, 'Em desenvolvimento', 'Em validação', 'Concluído'];
    return this.statusOptions();
  }

  title() { return this.view(); }

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
    return map[this.view()] ?? 'Acompanhe o contexto do ciclo de vida da solução.';
  }

  open(item: NexusRecord) { this.store.select(item); }

  create() {
    if (this.view() === 'Demandas') this.store.openWizard('demanda');
    if (this.view() === 'Atividades') this.store.openWizard('atividade');
    if (this.view() === 'Chamados') this.store.openWizard('chamado');
  }

  openNextTicket() {
    const ticket = this.store.records().find(r => r.type === 'Chamado' && r.status !== 'Concluído');
    if (ticket) this.store.select(ticket);
  }

  setFilter(value: string) { this.filter.set(value); }

  ui(record: NexusRecord) { return RECORD_UI[record.type]; }
  onSearchInput(event: Event) { this.store.setSearch((event.target as HTMLInputElement).value); }

  confirmReset() {
    if (window.confirm('Restaurar os dados de demonstração apagará alterações locais e rascunhos deste navegador. Deseja continuar?')) {
      this.store.resetDemoData();
    }
  }

  contextReadyCount() {
    return this.items().filter(r => r.relatedIds.length > 0 && !/parcial|Aguardando/i.test(r.context)).length;
  }
}