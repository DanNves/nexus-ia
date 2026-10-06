import { Injectable, computed, signal } from '@angular/core';
import { seedRecords, people, team, solutions, versions, currentUser } from '../data/nexus.data';
import { AiValidationStatus, NexusRecord, Person, RecordType, Status, WizardDraft, WizardType } from '../models/nexus.models';

@Injectable({ providedIn: 'root' })
export class NexusStore {
  private readonly storageKey = 'nexus-angular-records-v2';
  private readonly legacyStorageKey = 'nexus-angular-records';
  readonly records = signal<NexusRecord[]>(this.load());
  readonly selected = signal<NexusRecord | null>(null);
  readonly wizard = signal<WizardType | null>(null);
  readonly search = signal('');
  readonly feedback = signal<string | null>(null);

  readonly openTickets = computed(() => this.records().filter(r => r.type === 'Chamado' && r.status !== 'Concluído').length);
  readonly activeDemands = computed(() => this.records().filter(r => r.type === 'Demanda' && r.status === 'Em desenvolvimento').length);
  readonly validationCount = computed(() => this.records().filter(r => r.type === 'Chamado' && r.aiStatus === 'pending').length);
  readonly aiAcceptedCount = computed(() => this.records().filter(r => r.type === 'Chamado' && r.aiStatus === 'approved').length);
  readonly aiRejectedCount = computed(() => this.records().filter(r => r.type === 'Chamado' && r.aiStatus === 'rejected').length);
  readonly aiEditedCount = computed(() => this.records().filter(r => r.type === 'Chamado' && r.aiWasEdited === true).length);
  readonly knowledgeReuseCount = computed(() => this.records()
    .filter(r => r.type === 'Conhecimento')
    .reduce((sum, record) => sum + (record.reuseCount ?? 0), 0));
  readonly aiDecisionCount = computed(() => this.aiAcceptedCount() + this.aiRejectedCount());
  readonly aiAcceptanceRate = computed(() => {
    const total = this.aiDecisionCount();
    return total ? Math.round((this.aiAcceptedCount() / total) * 100) : 0;
  });
  readonly aiRejectionRate = computed(() => {
    const total = this.aiDecisionCount();
    return total ? Math.round((this.aiRejectedCount() / total) * 100) : 0;
  });
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
      const raw = localStorage.getItem(this.storageKey) ?? localStorage.getItem(this.legacyStorageKey);
      if (raw) {
        const saved = JSON.parse(raw) as NexusRecord[];
        const normalized = saved.map(record => this.normalize(record));
        const savedById = new Map(normalized.map(record => [record.id, record]));
        const merged = seedRecords.map(seed => this.normalize({ ...seed, ...(savedById.get(seed.id) ?? {}) }))
          .concat(normalized.filter(record => !seedRecords.some(seed => seed.id === record.id)));
        return this.rebuildRelationships(merged);
      }
    } catch {
      // Se houver JSON inválido ou armazenamento indisponível, inicia com os dados seed.
    }
    return this.rebuildRelationships(seedRecords.map(record => this.normalize(record)));
  }

  private normalize(record: NexusRecord): NexusRecord {
    const legacy = record as NexusRecord & { aiValidated?: boolean };
    const aiStatus: AiValidationStatus | undefined = record.aiStatus
      ?? (legacy.aiValidated === true ? 'approved' : legacy.aiValidated === false ? 'rejected' : undefined);

    // Protege o MVP contra dados antigos/incompletos salvos no navegador.
    // Isso evita que uma informação ausente quebre a abertura do detalhe de um registro.
    const fallbackPerson = team[0] ?? people.marina;
    const requester = record.requester ?? { ...fallbackPerson, kind: 'Solicitante' as const };
    const assignee = record.assignee ?? { ...fallbackPerson, kind: 'Responsável' as const };
    const participants = Array.isArray(record.participants) ? record.participants : [];
    const relatedIds = Array.isArray(record.relatedIds) ? record.relatedIds : [];
    const comments = Array.isArray(record.comments) ? record.comments : [];
    const solutionId = record.solutionId ?? solutions.find(item => item.name === record.solution)?.id;
    const versionId = record.versionId ?? versions.find(item => item.label === record.version)?.id;

    return {
      ...record,
      requester,
      assignee,
      participants,
      relatedIds,
      comments,
      context: record.context || 'Contexto não informado',
      solution: record.solution || 'A definir',
      version: record.version || 'A definir',
      ...(solutionId ? { solutionId } : {}),
      ...(versionId ? { versionId } : {}),
      description: record.description || 'Sem descrição registrada.',
      ...(aiStatus !== undefined ? { aiStatus } : {})
    };
  }

  private persist() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.records()));
      localStorage.removeItem(this.legacyStorageKey);
    } catch {
      this.flash('Não foi possível persistir os dados neste navegador.');
    }
  }

  private rebuildRelationships(records: NexusRecord[]): NexusRecord[] {
    const byId = new Map(records.map(record => [record.id, record]));
    return records.map(record => {
      const related = new Set(record.relatedIds);
      const parent = record.parentId ? byId.get(record.parentId) : undefined;
      if (parent) related.add(parent.id);
      for (const other of records) {
        if (other.id === record.id) continue;
        if (record.parentId === other.id || other.parentId === record.id) related.add(other.id);
        if (record.solutionId && record.solutionId === other.solutionId && record.versionId && record.versionId === other.versionId) {
          if (['Demanda','Atividade','Requisito','Versão','Chamado','Conhecimento'].includes(other.type)) related.add(other.id);
        }
      }
      return { ...record, relatedIds: [...related].filter(id => id !== record.id) };
    });
  }

  private flash(message: string) {
    this.feedback.set(message);
    window.setTimeout(() => {
      if (this.feedback() === message) this.feedback.set(null);
    }, 2600);
  }

  select(record: NexusRecord) {
    // Abrir um registro é somente leitura. A análise da IA só acontece
    // quando o profissional aciona explicitamente "Analisar com IA".
    this.selected.set(record);
  }
  selectById(id: string) {
    const record = this.records().find(item => item.id === id);
    if (record) this.selected.set(record);
  }
  closeDetail() { this.selected.set(null); }

  resetDemoData() {
    if (!window.confirm('Restaurar os dados de demonstração? Os registros criados neste navegador serão removidos.')) return;
    const fresh = seedRecords.map(record => this.normalize(record));
    this.records.set(fresh);
    this.selected.set(null);
    this.search.set('');
    localStorage.removeItem('nexus-angular-demanda-draft');
    localStorage.removeItem('nexus-angular-atividade-draft');
    localStorage.removeItem('nexus-angular-chamado-draft');
    localStorage.removeItem(this.legacyStorageKey);
    this.persist();
    this.flash('Dados de demonstração restaurados. O fluxo NEXUS voltou ao estado inicial.');
  }
  openWizard(type: WizardType) { this.wizard.set(type); }
  closeWizard() { this.wizard.set(null); }
  setSearch(value: string) { this.search.set(value); }

  addRecord(draft: WizardDraft, type: WizardType) {
    const recordType = type === 'demanda' ? 'Demanda' : type === 'atividade' ? 'Atividade' : 'Chamado';
    const prefix = type === 'demanda' ? 'DEM' : type === 'atividade' ? 'ATV' : 'CH';
    const maxId = this.records()
      .filter(r => r.type === recordType)
      .map(r => Number(r.id.split('-')[1]) || 0)
      .reduce((max, value) => Math.max(max, value), 0);

    const requester = this.findPerson(draft.requester) ?? people.marina;
    const assignee = this.findPerson(draft.assignee) ?? (type === 'demanda' ? people.carlos : people.joao);
    const participants = draft.participants.split(',').map(name => name.trim()).filter(Boolean)
      .map(name => this.findPerson(name))
      .filter((person): person is Person => Boolean(person))
      .map(person => ({ ...person, kind: 'Participante' as const }));

    const solution = solutions.find(item => item.id === draft.solutionId);
    const version = versions.find(item => item.id === draft.versionId && item.solutionId === draft.solutionId);
    const id = `${prefix}-${String(maxId + 1).padStart(3, '0')}`;

    const record: NexusRecord = {
      id,
      title: draft.title.trim(),
      description: draft.description.trim(),
      type: recordType,
      status: 'Pendente',
      context: draft.context.trim() || 'Contexto a completar',
      solution: solution?.name ?? 'A definir',
      version: version?.label ?? 'A definir',
      ...(solution ? { solutionId: solution.id } : {}),
      ...(version ? { versionId: version.id } : {}),
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

    const existing = this.records();
    const selectedRequirement = existing.find(item =>
      item.type === 'Requisito' &&
      item.id === draft.requirementId &&
      (!version || item.versionId === version.id) &&
      (!solution || item.solutionId === solution.id)
    );

    if (selectedRequirement) {
      if (type === 'demanda') {
        const nextExisting = existing.map(item => item.id === selectedRequirement.id
          ? { ...item, parentId: record.id }
          : item);
        this.records.set(this.rebuildRelationships([...nextExisting, record]));
        this.persist();
        this.closeWizard();
        this.selectById(record.id);
        this.flash(`${record.id} criado e requisito ${selectedRequirement.id} relacionado.`);
        return;
      }
      record.parentId = selectedRequirement.id;
    }

    if (type === 'atividade' && !record.parentId) {
      const demand = existing.find(item =>
        item.type === 'Demanda' &&
        ((version && item.versionId === version.id) || (solution && item.solutionId === solution.id))
      );
      if (demand) record.parentId = demand.id;
    }

    if (type === 'chamado' && !record.parentId) {
      const requirement = existing.find(item =>
        item.type === 'Requisito' &&
        ((version && item.versionId === version.id) || (solution && item.solutionId === solution.id))
      );
      if (requirement) record.parentId = requirement.id;
    }

    const next = this.rebuildRelationships([...existing, record]);
    this.records.set(next);
    this.persist();
    this.closeWizard();
    this.selectById(record.id);
    this.flash(`${record.id} criado e contexto preservado por relacionamento.`);
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
      comments: [...r.comments, {
        id: crypto.randomUUID(),
        author: currentUser.name,
        text: clean,
        date: new Date().toLocaleString('pt-BR'),
        ...(recipient !== undefined ? { recipient } : {})
      }]
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

    const existingKnowledge = this.records().find(
      item => item.type === 'Conhecimento' && item.sourceTicketId === id
    );

    if (existingKnowledge) {
      this.flash(`O conhecimento ${existingKnowledge.id} já foi registrado para ${id}. A análise existente foi preservada.`);
      return;
    }

    const hasPreviousAnalysis = Boolean(ticket.aiSummary);
    if (hasPreviousAnalysis) {
      const confirmed = window.confirm(
        `Este chamado já possui uma análise da IA com decisão humana registrada. Deseja executar uma nova análise? A decisão anterior será preservada no histórico.`
      );
      if (!confirmed) return;
    }

    const previousDecision = ticket.aiStatus
      ? `Análise anterior: ${ticket.aiStatus === 'approved' ? 'aprovada' : ticket.aiStatus === 'rejected' ? 'rejeitada' : 'pendente'}${ticket.aiHumanNote ? ` · observação: ${ticket.aiHumanNote}` : ''}.`
      : null;

    const related = this.aiContextFor(id);
    const requirement = related.find(record => record.type === 'Requisito');
    const version = related.find(record => record.type === 'Versão' || record.type === 'Solução');
    const demand = related.find(record => record.type === 'Demanda');
    const activity = related.find(record => record.type === 'Atividade');
    const previousTickets = related.filter(record => record.type === 'Chamado' && record.id !== id);
    const knowledge = related.filter(record => record.type === 'Conhecimento');

    const terms = this.contextTerms(ticket);
    const score = (record: NexusRecord) => {
      const text = this.contextTerms(record);
      const overlap = text.filter(term => terms.includes(term)).length;
      return overlap + (record.solution === ticket.solution ? 2 : 0) + (record.version === ticket.version ? 2 : 0);
    };

    const matchedKnowledge = knowledge.slice().sort((a,b) => score(b) - score(a)).find(record => score(record) >= 3);
    const matchedTicket = previousTickets.slice().sort((a,b) => score(b) - score(a)).find(record => score(record) >= 3);

    const procedure = matchedKnowledge?.procedure?.length
      ? matchedKnowledge.procedure
      : matchedKnowledge?.aiProcedure?.length
        ? matchedKnowledge.aiProcedure
        : [
            `Reproduzir o comportamento relatado na versão ${ticket.version}.`,
            `Conferir ${requirement?.id ?? 'o requisito relacionado'} e as regras registradas.`,
            `Comparar o comportamento encontrado com o que foi projetado e publicado na versão ${ticket.version}.`,
            'Registrar a causa confirmada e a correção somente após a validação humana.'
          ];

    const resolution = matchedKnowledge
      ? `Já existe uma solução validada em ${matchedKnowledge.id}. A orientação é partir desse procedimento, confirmar se o cenário atual corresponde à versão ${ticket.version} e registrar qualquer diferença encontrada.`
      : requirement
        ? `Não foi encontrado conhecimento validado específico. A resolução sugerida é reproduzir o problema, conferir ${requirement.id}, comparar com a versão publicada e validar a correção antes de concluir.`
        : `Não foi encontrada uma solução anterior específica. A orientação é reproduzir o problema, comparar com o contexto recuperado e validar a causa antes de concluir.`;

    const findings = [
      demand ? `Demanda: ${demand.id} — ${demand.title}.` : 'Demanda relacionada: não identificada.',
      activity ? `Atividade: ${activity.id} — ${activity.title}.` : 'Atividade relacionada: não identificada.',
      requirement ? `Requisito: ${requirement.id} — ${requirement.title}.` : 'Requisito relacionado: não identificado.',
      version ? `Publicado em: ${version.id} — ${version.version}.` : `Versão informada: ${ticket.version}.`,
      matchedKnowledge ? `Solução anterior encontrada e anexada: ${matchedKnowledge.id}.` : 'Solução anterior específica: não encontrada.',
      matchedTicket ? `Chamado anterior semelhante: ${matchedTicket.id}.` : 'Chamado anterior semelhante: não identificado.'
    ];

    const attachments = [
      ...(matchedKnowledge ? [matchedKnowledge.id] : []),
      ...(matchedTicket ? [matchedTicket.id] : [])
    ];

    this.records.update(items => items.map(record => record.id === id ? {
      ...record,
      relatedIds: Array.from(new Set([...record.relatedIds, ...attachments])),
      aiStatus: 'pending' as const,
      aiCategory: matchedKnowledge ? 'Incidente com solução anterior identificada' : requirement ? 'Falha funcional / regra de negócio' : 'Incidente / diagnóstico',
      aiConfidence: matchedKnowledge && requirement && version ? 96 : matchedKnowledge ? 90 : requirement && version ? 84 : 72,
      aiSummary: matchedKnowledge
        ? `A IA leu o chamado e recuperou ${related.length} registros do ciclo. Ela identificou ${matchedKnowledge.id} como solução anterior compatível e anexou a referência ao próprio chamado.`
        : `A IA leu o chamado e recuperou ${related.length} registros do ciclo. Não encontrou uma solução anterior específica e montou uma orientação com base no que foi projetado e publicado.`,
      aiCause: matchedKnowledge?.aiCause || requirement?.description || 'Possível falha funcional relacionada ao contexto da solução publicada.',
      aiProcedure: procedure,
      aiEvidence: Array.from(new Set([record.id, ...related.slice(0,8).map(item => item.id), ...attachments])),
      aiFindings: findings,
      aiResolution: resolution,
      aiHumanNote: '',
      aiWasEdited: false,
      aiValidatedBy: '',
      aiValidatedAt: '',
      aiValidationNote: '',
      ...(matchedKnowledge ? { aiExistingKnowledgeId: matchedKnowledge.id } : { aiExistingKnowledgeId: '' }),
      ...(matchedTicket ? { aiExistingTicketId: matchedTicket.id } : { aiExistingTicketId: '' }),
      comments: previousDecision
        ? [...record.comments, {
            id: crypto.randomUUID(),
            author: record.assignee.name,
            text: `Reanálise solicitada pelo responsável. ${previousDecision}`,
            date: new Date().toLocaleString('pt-BR')
          }]
        : record.comments,
      nextAction: matchedKnowledge ? `Validar a solução existente ${matchedKnowledge.id}` : 'Validar diagnóstico e resolução sugerida',
      nextActionHint: matchedKnowledge
        ? `A referência ${matchedKnowledge.id} foi anexada automaticamente porque pertence ao mesmo contexto e apresenta correspondência com o problema.`
        : 'A IA não encontrou uma solução anterior específica. O responsável precisa validar a causa e o procedimento.'
    } : record));

    this.syncSelected(id);
    this.persist();
    this.flash(
      matchedKnowledge
        ? `IA analisou ${id} e anexou ${matchedKnowledge.id} como solução anterior.`
        : `IA analisou ${id} usando o contexto completo do ciclo.`
    );
  }

  private contextTerms(record: NexusRecord): string[] {
    const stopwords = new Set(['para','com','sem','uma','uns','das','dos','que','por','nao','não','sobre','este','esta','esse','essa','isso','como','deve','de','da','do','e','em','no','na','o','a','os','as','um','ao','aos','se','ou','mais']);
    return [record.title, record.description, record.solution, record.version, record.context]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length >= 4 && !stopwords.has(term));
  }

  validateAi(id: string, accepted: boolean, humanNote = '') {
    const record = this.records().find(item => item.id === id);
    if (!record || record.type !== 'Chamado' || !record.aiSummary) return;

    const cleanNote = humanNote.trim();
    if (!accepted && !cleanNote) {
      this.flash('Informe o motivo ou ajuste antes de rejeitar a sugestão.');
      return;
    }

    if (accepted && record.aiStatus === 'approved') {
      this.flash('Esta sugestão já foi aprovada. Reanalise o chamado se precisar de uma nova orientação.');
      return;
    }

    if (!accepted && record.aiStatus === 'approved') {
      this.flash('Uma sugestão aprovada não pode ser rejeitada sem uma nova análise.');
      return;
    }

    const now = new Date().toLocaleString('pt-BR');
    const wasEdited = accepted && Boolean(cleanNote);
    const note = accepted
      ? wasEdited
        ? `Sugestão da IA aprovada com ajuste humano: ${cleanNote}`
        : 'Sugestão da IA aprovada pelo responsável. O procedimento pode seguir para registro de conhecimento.'
      : `Sugestão da IA rejeitada pelo responsável. Motivo/ajuste: ${cleanNote}`;

    this.records.update(items => items.map(r => r.id === id ? {
      ...r,
      aiStatus: accepted ? 'approved' as AiValidationStatus : 'rejected' as AiValidationStatus,
      aiValidatedBy: 'Tester',
      aiValidatedAt: now,
      aiValidationNote: note,
      aiHumanNote: cleanNote,
      aiWasEdited: wasEdited,
      status: accepted ? 'Em validação' as Status : 'Em análise' as Status,
      nextAction: accepted ? 'Registrar conhecimento validado' : 'Revisar sugestão da IA',
      nextActionHint: accepted
        ? wasEdited
          ? 'A decisão humana aprovou a sugestão com ajuste registrado. O texto do ajuste permanece associado ao atendimento.'
          : 'A decisão humana foi registrada. Registre o conhecimento para fechar o ciclo e disponibilizar o procedimento para reuso.'
        : 'A decisão humana foi registrada como rejeição. Revise a análise ou execute uma nova análise antes de concluir.',
      comments: [...r.comments, {
        id: crypto.randomUUID(),
        author: 'Tester',
        text: note,
        date: now
      }]
    } : r));

    this.syncSelected(id);
    this.persist();
    this.flash(
      accepted
        ? wasEdited ? 'Aprovação com ajuste humano registrada.' : 'Validação humana registrada. O próximo passo é registrar conhecimento.'
        : 'Rejeição registrada com o motivo informado.'
    );
  }

  registerKnowledge(ticketId: string) {
    const ticket = this.records().find(item => item.id === ticketId);
    if (!ticket || ticket.type !== 'Chamado' || ticket.aiStatus !== 'approved') {
      this.flash('A validação humana da IA é necessária antes de registrar conhecimento.');
      return;
    }

    // A origem oficial de um conhecimento é sourceTicketId.
    // relatedIds pode conter referências de contexto e, portanto, não determina
    // se este chamado já gerou um conhecimento.
    const existing = this.records().find(
      item => item.type === 'Conhecimento' && item.sourceTicketId === ticketId
    );
    if (existing) {
      this.flash(`Conhecimento ${existing.id} já foi registrado a partir deste chamado.`);
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
        author: ticket.assignee.name,
        text: `Conhecimento registrado após validação humana da sugestão do atendimento ${ticket.id}.`,
        date: new Date().toLocaleString('pt-BR')
      }],
      objective: 'Preservar e reutilizar o procedimento validado no suporte.',
      procedure: ticket.aiProcedure ?? [],
      sourceTicketId: ticket.id,
      validatedBy: ticket.assignee.name,
      validatedAt: new Date().toLocaleString('pt-BR'),
      revision: 1,
      reuseCount: 0,
      nextAction: 'Reutilizar em chamados relacionados',
      nextActionHint: `Conhecimento originado do atendimento ${ticket.id}.`
    };

    const reusedKnowledgeId = ticket.aiExistingKnowledgeId;

    this.records.update(items => items
      .map(r => {
        if (r.id === ticketId) {
          return {
            ...r,
            status: 'Concluído' as Status,
            nextAction: 'Conhecimento registrado',
            nextActionHint: `Ciclo encerrado com ${knowledge.id}.`,
            relatedIds: Array.from(new Set([...r.relatedIds, knowledge.id]))
          };
        }

        if (reusedKnowledgeId && r.id === reusedKnowledgeId && r.type === 'Conhecimento') {
          return {
            ...r,
            reuseCount: (r.reuseCount ?? 0) + 1
          };
        }

        return r;
      })
      .concat(knowledge));
    this.persist();
    this.select(knowledge);
    this.flash(`${knowledge.id} registrado. O contexto agora pode ser reutilizado.`);
  }

  changeStatus(id: string, status: Status): boolean {
    const record = this.records().find(item => item.id === id);
    if (!record) return false;

    const allowed: Record<RecordType, Status[]> = {
      Demanda: ['Pendente', 'Em desenvolvimento', 'Em validação', 'Concluído'],
      Atividade: ['Pendente', 'Em desenvolvimento', 'Em validação', 'Concluído'],
      Requisito: ['Pendente', 'Em desenvolvimento', 'Em validação', 'Concluído'],
      Solução: ['Em desenvolvimento', 'Em validação', 'Concluído'],
      Versão: ['Em desenvolvimento', 'Em validação', 'Concluído'],
      Chamado: ['Pendente', 'Em análise', 'Em validação', 'Concluído'],
      Conhecimento: ['Em validação', 'Concluído']
    };

    if (!allowed[record.type].includes(status)) {
      this.flash('Status não permitido para este tipo de registro.');
      return false;
    }

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