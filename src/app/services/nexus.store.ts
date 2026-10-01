import { Injectable, computed, signal } from '@angular/core';
import { seedRecords, people, team } from '../data/nexus.data';
import { AiValidationStatus, NexusRecord, Person, Status, WizardDraft, WizardType } from '../models/nexus.models';

@Injectable({ providedIn: 'root' })
export class NexusStore {
  private readonly storageKey = 'nexus-angular-records';
  readonly records = signal<NexusRecord[]>(this.load());
  readonly selected = signal<NexusRecord | null>(null);
  readonly wizard = signal<WizardType | null>(null);
  readonly search = signal('');
  readonly feedback = signal<string | null>(null);

  readonly openTickets = computed(() => this.records().filter(r => r.type === 'Chamado' && r.status !== 'Concluído').length);
  readonly activeDemands = computed(() => this.records().filter(r => r.type === 'Demanda' && r.status === 'Em desenvolvimento').length);
  readonly validationCount = computed(() => this.records().filter(r => r.type === 'Chamado' && r.aiStatus === 'pending').length);
  readonly validatedKnowledge = computed(() => this.records().filter(r => r.type === 'Conhecimento' && r.status === 'Concluído').length);
  readonly contextCoverage = computed(() => {
    const relevant = this.records().filter(r => ['Demanda','Requisito','Versão','Chamado','Conhecimento'].includes(r.type));
    if (!relevant.length) return 0;
    const complete = relevant.filter(r => r.context && !/Aguardando|parcial/i.test(r.context) && r.relatedIds.length > 0).length;
    return Math.round((complete / relevant.length) * 100);
  });
  readonly pendingNotifications = computed(() => {
    const tickets = this.records().filter(r => r.type === 'Chamado' && r.aiStatus === 'pending').length;
    const validations = this.records().filter(r => r.status === 'Em validação' && r.type !== 'Chamado').length;
    return tickets + validations;
  });

  private load(): NexusRecord[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as NexusRecord[];
        const normalized = saved.map(record => this.normalize(record));
        const savedById = new Map(normalized.map(record => [record.id, record]));
        return seedRecords.map(seed => this.normalize({ ...seed, ...(savedById.get(seed.id) ?? {}) }))
          .concat(normalized.filter(record => !seedRecords.some(seed => seed.id === record.id)));
      }
    } catch { /* use seed */ }
    return seedRecords.map(record => this.normalize(record));
  }

  private normalize(record: NexusRecord): NexusRecord {
    const legacy = record as NexusRecord & { aiValidated?: boolean };
    const aiStatus: AiValidationStatus | undefined = record.aiStatus
      ?? (legacy.aiValidated === true ? 'approved' : legacy.aiValidated === false ? 'rejected' : undefined);
    return { ...record, aiStatus };
  }

  private persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.records()));
  }

  private flash(message: string) {
    this.feedback.set(message);
    window.setTimeout(() => {
      if (this.feedback() === message) this.feedback.set(null);
    }, 2600);
  }

  select(record: NexusRecord) { this.selected.set(record); }
  selectById(id: string) {
    const record = this.records().find(item => item.id === id);
    if (record) this.selected.set(record);
  }
  closeDetail() { this.selected.set(null); }
  openWizard(type: WizardType) { this.wizard.set(type); }
  closeWizard() { this.wizard.set(null); }
  setSearch(value: string) { this.search.set(value); }

  addRecord(draft: WizardDraft, type: WizardType) {
    const recordType = type === 'demanda' ? 'Demanda' : 'Atividade';
    const prefix = type === 'demanda' ? 'DEM' : 'ATV';
    const maxId = this.records()
      .filter(r => r.type === recordType)
      .map(r => Number(r.id.split('-')[1]) || 0)
      .reduce((max, value) => Math.max(max, value), 0);
    const requester = this.findPerson(draft.requester) ?? people.marina;
    const assignee = this.findPerson(draft.assignee) ?? (type === 'demanda' ? people.carlos : people.joao);
    const participantNames = draft.participants.split(',').map(name => name.trim()).filter(Boolean);
    const participants = participantNames
      .map(name => this.findPerson(name))
      .filter((person): person is Person => Boolean(person))
      .map(person => ({ ...person, kind: 'Participante' as const }));

    const record: NexusRecord = {
      id: `${prefix}-${String(maxId + 1).padStart(3, '0')}`,
      title: draft.title.trim(),
      description: draft.description.trim(),
      type: recordType,
      status: 'Pendente',
      context: draft.context.trim() || 'Contexto a completar',
      solution: draft.solution.trim() || 'A definir',
      version: draft.version.trim() || 'A definir',
      date: new Date().toLocaleDateString('pt-BR'),
      priority: draft.priority,
      requester: { ...requester, kind: 'Solicitante' },
      assignee: { ...assignee, kind: 'Responsável' },
      participants,
      relatedIds: [],
      comments: [],
      objective: draft.objective.trim(),
      dueDate: draft.dueDate,
    };

    this.records.update(items => [record, ...items]);
    this.persist();
    this.closeWizard();
    this.select(record);
    this.flash(`${record.id} criado e contexto preservado.`);
  }

  private findPerson(name: string) {
    const normalized = name.trim().toLowerCase();
    return team.find(person => person.name.toLowerCase() === normalized);
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
    this.flash('Atualização registrada no contexto.');
  }

  aiContextFor(ticketId: string): NexusRecord[] {
    const ticket = this.records().find(item => item.id === ticketId);
    if (!ticket || ticket.type !== 'Chamado') return [];

    const all = this.records();
    const byId = new Map(all.map(record => [record.id, record]));
    const visited = new Set<string>();
    const queue = [ticket.id, ...ticket.relatedIds];
    const collected: NexusRecord[] = [];

    while (queue.length) {
      const id = queue.shift();
      if (!id || visited.has(id)) continue;
      visited.add(id);

      const record = byId.get(id);
      if (!record) continue;

      collected.push(record);
      if (record.parentId) queue.push(record.parentId);
      queue.push(...record.relatedIds);
    }

    const sameSolutionVersion = all.filter(record =>
      record.id !== ticket.id &&
      record.solution === ticket.solution &&
      record.version === ticket.version &&
      ['Demanda','Atividade','Requisito','Solução','Versão','Chamado','Conhecimento'].includes(record.type)
    );

    for (const record of sameSolutionVersion) {
      if (!visited.has(record.id)) {
        visited.add(record.id);
        collected.push(record);
      }
    }

    const order: Record<string, number> = {
      'Demanda': 1,
      'Atividade': 2,
      'Requisito': 3,
      'Solução': 4,
      'Versão': 4,
      'Chamado': 5,
      'Conhecimento': 6
    };

    return collected
      .filter(record => record.id !== ticket.id)
      .sort((a, b) => (order[a.type] ?? 99) - (order[b.type] ?? 99) || a.id.localeCompare(b.id));
  }

  analyzeAi(id: string) {
    const ticket = this.records().find(item => item.id === id);
    if (!ticket || ticket.type !== 'Chamado') return;

    const related = this.aiContextFor(id);

    const hasDemand = related.some(record => record.type === 'Demanda');
    const hasActivity = related.some(record => record.type === 'Atividade');
    const hasRequirement = related.some(record => record.type === 'Requisito');
    const hasVersion = related.some(record => record.type === 'Versão' || record.type === 'Solução');
    const hasPreviousTicket = related.some(record => record.type === 'Chamado');
    const hasKnowledge = related.some(record => record.type === 'Conhecimento');

    this.records.update(items => items.map(record => record.id === id ? {
      ...record,
      aiStatus: 'pending' as const,
      aiCategory: hasRequirement ? 'Falha funcional / regra de negócio' : 'Incidente / diagnóstico',
      aiConfidence: hasDemand && hasRequirement && hasVersion ? 92 : hasRequirement && hasVersion ? 88 : hasKnowledge ? 82 : 74,
      aiSummary: `A análise percorreu ${related.length} registro(s) do contexto do chamado, cobrindo ${[
        hasDemand ? 'demanda' : '',
        hasActivity ? 'atividade' : '',
        hasRequirement ? 'requisito' : '',
        hasVersion ? 'solução/versão' : '',
        hasPreviousTicket ? 'chamados relacionados' : '',
        hasKnowledge ? 'conhecimento validado' : ''
      ].filter(Boolean).join(', ')}.`,
      nextAction: 'Validar sugestão do atendimento',
      nextActionHint: 'A sugestão foi preparada a partir do chamado e do contexto recuperado de todas as etapas relacionadas. A decisão continua com o responsável.'
    } : record));

    this.syncSelected(id);
    this.persist();
    this.flash(`IA analisou ${id} usando o contexto recuperado.`);
  }

  validateAi(id: string, accepted: boolean) {
    const record = this.records().find(item => item.id === id);
    if (!record || record.type !== 'Chamado') return;

    const aiStatus: AiValidationStatus = accepted ? 'approved' : 'rejected';
    this.records.update(items => items.map(r => r.id === id ? {
      ...r,
      aiStatus,
      status: accepted ? 'Em validação' : 'Em análise',
      nextAction: accepted ? 'Registrar conhecimento validado' : 'Revisar sugestão da IA',
      nextActionHint: accepted
        ? 'A sugestão foi validada. Registre o conhecimento para fechar o ciclo e disponibilizar o procedimento para reuso.'
        : 'A sugestão foi rejeitada. Registre a análise humana ou gere uma nova orientação antes de concluir o chamado.'
    } : r));
    this.syncSelected(id);
    this.persist();
    this.flash(accepted ? 'Sugestão aprovada. O próximo passo é registrar o conhecimento.' : 'Sugestão rejeitada. O chamado voltou para análise.');
  }

  registerKnowledge(ticketId: string) {
    const ticket = this.records().find(item => item.id === ticketId);
    if (!ticket || ticket.type !== 'Chamado' || ticket.aiStatus !== 'approved') {
      this.flash('A validação humana da IA é necessária antes de registrar conhecimento.');
      return;
    }

    const existing = this.records().find(item => item.type === 'Conhecimento' && item.relatedIds.includes(ticketId));
    if (existing) {
      this.flash(`Conhecimento ${existing.id} já está relacionado a este chamado.`);
      return;
    }

    const maxKb = this.records()
      .filter(r => r.type === 'Conhecimento')
      .map(r => Number(r.id.split('-')[1]) || 0)
      .reduce((max, value) => Math.max(max, value), 0);

    const knowledge: NexusRecord = {
      id: `KB-${String(maxKb + 1).padStart(3, '0')}`,
      title: `Procedimento validado · ${ticket.title}`,
      description: ticket.aiCause || `Procedimento validado a partir do atendimento ${ticket.id}.`,
      type: 'Conhecimento',
      status: 'Concluído',
      context: 'Conhecimento validado',
      solution: ticket.solution,
      version: ticket.version,
      date: new Date().toLocaleDateString('pt-BR'),
      priority: 'Normal',
      requester: { ...ticket.assignee, kind: 'Solicitante' },
      assignee: { ...ticket.assignee, kind: 'Responsável' },
      participants: ticket.participants.map(person => ({ ...person, kind: 'Participante' as const })),
      relatedIds: [ticket.id, ...ticket.relatedIds.filter(id => id !== ticket.id)],
      comments: [{
        id: crypto.randomUUID(),
        author: 'Tester',
        text: `Conhecimento registrado após validação humana da sugestão do atendimento ${ticket.id}.`,
        date: new Date().toLocaleString('pt-BR')
      }],
      objective: 'Preservar e reutilizar o procedimento validado no suporte.',
      procedure: ticket.aiProcedure ?? [],
      sourceTicketId: ticket.id,
      validatedBy: 'Tester',
      validatedAt: new Date().toLocaleString('pt-BR'),
      revision: 1,
      reuseCount: 0,
      nextAction: 'Reutilizar em chamados relacionados',
      nextActionHint: `Conhecimento originado do atendimento ${ticket.id}.`
    };

    this.records.update(items => items
      .map(r => r.id === ticketId
        ? { ...r, status: 'Concluído' as Status, nextAction: 'Conhecimento registrado', nextActionHint: `Ciclo encerrado com ${knowledge.id}.`, relatedIds: Array.from(new Set([...r.relatedIds, knowledge.id])) }
        : r)
      .concat(knowledge));
    this.persist();
    this.select(knowledge);
    this.flash(`${knowledge.id} registrado. O contexto agora pode ser reutilizado.`);
  }

  changeStatus(id: string, status: Status): boolean {
    const record = this.records().find(item => item.id === id);
    if (!record) return false;

    if (record.type === 'Chamado' && status === 'Concluído' && record.aiStatus !== 'approved') {
      this.flash('O chamado só pode ser concluído após a validação humana da sugestão da IA.');
      this.syncSelected(id);
      return false;
    }

    this.records.update(items => items.map(r => r.id === id ? { ...r, status } : r));
    this.syncSelected(id);
    this.persist();
    this.flash(`${id} atualizado para “${status}”.`);
    return true;
  }

  private syncSelected(id: string) {
    const current = this.records().find(r => r.id === id);
    if (current) this.selected.set(current);
  }

  knowledgeRecords(): NexusRecord[] {
    return this.records()
      .filter(record => record.type === 'Conhecimento')
      .sort((a, b) => (b.reuseCount ?? 0) - (a.reuseCount ?? 0) || b.date.localeCompare(a.date));
  }

  filteredRecords(view: string): NexusRecord[] {
    const q = this.search().trim().toLowerCase();
    return this.records()
      .filter(r => view === 'Conhecimento' ? r.type === 'Conhecimento'
        : view === 'Chamados' ? r.type === 'Chamado'
        : view === 'Demandas' ? r.type === 'Demanda'
        : view === 'Atividades' ? r.type === 'Atividade'
        : view === 'Requisitos' ? r.type === 'Requisito'
        : view === 'Soluções e Versões' ? ['Solução','Versão'].includes(r.type)
        : true)
      .filter(r => !q || [r.id,r.title,r.description,r.solution,r.version].join(' ').toLowerCase().includes(q));
  }
}