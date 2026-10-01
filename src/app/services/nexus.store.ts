import { Injectable, computed, signal } from '@angular/core';
import { seedRecords, people, team } from '../data/nexus.data';
import { NexusRecord, Status, WizardDraft, WizardType } from '../models/nexus.models';

@Injectable({ providedIn: 'root' })
export class NexusStore {
  private readonly storageKey = 'nexus-angular-records';
  readonly records = signal<NexusRecord[]>(this.load());
  readonly selected = signal<NexusRecord | null>(null);
  readonly wizard = signal<WizardType | null>(null);
  readonly search = signal('');
  readonly notificationCount = signal(3);

  readonly openTickets = computed(() => this.records().filter(r => r.type === 'Chamado' && r.status !== 'Concluído').length);
  readonly activeDemands = computed(() => this.records().filter(r => r.type === 'Demanda' && r.status === 'Em desenvolvimento').length);
  readonly validationCount = computed(() => this.records().filter(r => r.status === 'Em validação').length);
  readonly validatedKnowledge = computed(() => this.records().filter(r => r.type === 'Conhecimento' && r.status === 'Concluído').length);

  private load(): NexusRecord[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw) as NexusRecord[];
    } catch { /* use seed */ }
    return seedRecords;
  }

  private persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.records()));
  }

  select(record: NexusRecord) { this.selected.set(record); }
  closeDetail() { this.selected.set(null); }
  openWizard(type: WizardType) { this.wizard.set(type); }
  closeWizard() { this.wizard.set(null); }
  setSearch(value: string) { this.search.set(value); }

  addRecord(draft: WizardDraft, type: WizardType) {
    const idPrefix = type === 'demanda' ? 'DEM' : 'ATV';
    const count = this.records().filter(r => r.type === (type === 'demanda' ? 'Demanda' : 'Atividade')).length + 1;
    const requester = people.marina;
    const assignee = type === 'demanda' ? people.carlos : people.joao;
    const record: NexusRecord = {
      id: `${idPrefix}-${String(count + 12).padStart(3, '0')}`,
      title: draft.title,
      description: draft.description,
      type: type === 'demanda' ? 'Demanda' : 'Atividade',
      status: 'Pendente',
      context: draft.context || 'Contexto a completar',
      solution: draft.solution || 'A definir',
      version: draft.version || 'A definir',
      date: new Date().toLocaleDateString('pt-BR'),
      priority: draft.priority,
      requester,
      assignee,
      participants: team.filter(person => draft.participants.toLowerCase().includes(person.name.toLowerCase())),
      relatedIds: [],
      comments: [],
      objective: draft.objective,
      dueDate: draft.dueDate,
    };
    this.records.update(items => [record, ...items]);
    this.persist();
    this.closeWizard();
    this.select(record);
  }

  addComment(id: string, text: string, recipient?: string) {
    const clean = text.trim();
    if (!clean) return;
    this.records.update(items => items.map(r => r.id === id ? {
      ...r,
      comments: [...r.comments, { id: crypto.randomUUID(), author: 'Tester', text: clean, date: new Date().toLocaleString('pt-BR'), recipient }]
    } : r));
    this.syncSelected(id);
    this.persist();
  }

  validateAi(id: string, accepted: boolean) {
    this.records.update(items => items.map(r => r.id === id ? { ...r, aiValidated: accepted, status: accepted ? 'Concluído' : 'Em análise' } : r));
    this.syncSelected(id);
    this.persist();
  }

  changeStatus(id: string, status: Status) {
    this.records.update(items => items.map(r => r.id === id ? { ...r, status } : r));
    this.syncSelected(id);
    this.persist();
  }

  private syncSelected(id: string) {
    const current = this.records().find(r => r.id === id);
    if (current) this.selected.set(current);
  }

  filteredRecords(view: string): NexusRecord[] {
    const q = this.search().trim().toLowerCase();
    return this.records()
      .filter(r => view === 'Conhecimento' ? r.type === 'Conhecimento' : view === 'Chamados' ? r.type === 'Chamado' : view === 'Demandas' ? r.type === 'Demanda' : view === 'Atividades' ? r.type === 'Atividade' : view === 'Requisitos' ? r.type === 'Requisito' : view === 'Soluções e Versões' ? ['Solução','Versão'].includes(r.type) : true)
      .filter(r => !q || [r.id,r.title,r.description,r.solution,r.version].join(' ').toLowerCase().includes(q));
  }
}