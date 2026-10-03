import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NexusStore } from './services/nexus.store';
import { NxIconComponent } from './shared/icon.component';
import { NexusRecord, WizardDraft } from './models/nexus.models';
import { team, currentUser } from './data/nexus.data';

@Component({
  selector: 'nx-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, NxIconComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(NexusStore);
  readonly router = inject(Router);
  readonly team = team;
  readonly currentUser = currentUser;
  mobileOpen = false;
  moreOpen = false;
  userOpen = false;
  searchOpen = false;
  notificationOpen = false;
  globalQuery = '';
  commentText = '';
  wizardStep = 1;
  readonly saved = signal(false);
  wizardError = '';
  aiHumanNote = '';
  aiValidationError = '';
  private validationTicketId = '';
  draft: WizardDraft = this.emptyDraft();

  constructor() {
    effect(() => {
      const wizard = this.store.wizard();
      if (!wizard) return;

      // O wizard pode ser aberto pelo dashboard ou por qualquer tela.
      // Mantemos o rascunho e os valores padrão coerentes com o tipo escolhido.
      const savedDraft = this.readDraft(this.draftKey(wizard));
      this.draft = savedDraft ?? this.emptyDraft(wizard);
      this.wizardStep = 1;
      this.saved.set(Boolean(savedDraft));
      this.wizardError = '';
    });

    effect(() => {
      const selected = this.store.selected();
      if (selected?.type === 'Chamado' && selected.id !== this.validationTicketId) {
        this.validationTicketId = selected.id;
        this.aiHumanNote = '';
        this.aiValidationError = '';
      }
    });
  }

  readonly navItems = [
    ['Visão geral','/dashboard','home'],
    ['Demandas','/demandas','demand'],
    ['Atividades','/atividades','activity'],
    ['Requisitos','/requisitos','requirement'],
    ['Soluções','/solucoes-e-versoes','solution'],
    ['Chamados','/chamados','ticket'],
    ['IA','/ia','spark'],
    ['Conhecimento','/conhecimento','knowledge'],
    ['Indicadores','/indicadores','chart'],
    ['Configurações','/configuracoes','settings'],
  ] as const;

  readonly mobileSections = [
    { label: 'Operação', items: this.navItems.slice(0, 2) },
    { label: 'Desenvolvimento', items: this.navItems.slice(2, 5) },
    { label: 'Suporte e inteligência', items: this.navItems.slice(5, 8) },
    { label: 'Gestão', items: this.navItems.slice(8) },
  ] as const;

  readonly searchResults = computed(() => {
    const q = this.globalQuery.trim().toLowerCase();
    if (!q) return [];
    return this.store.records()
      .filter(r => [r.id,r.title,r.description,r.solution,r.version].join(' ').toLowerCase().includes(q))
      .slice(0,6);
  });

  readonly notifications = computed(() => this.store.records()
    .filter(r => (r.type === 'Chamado' && r.aiStatus === 'pending') || r.status === 'Em validação')
    .slice(0,5));

  navigate(path: string) {
    this.router.navigateByUrl(path);
    this.mobileOpen = false;
    this.moreOpen = false;
    this.userOpen = false;
  }

  openSearch() {
    this.notificationOpen = false;
    this.searchOpen = true;
    this.globalQuery = '';
  }

  closeSearch() { this.searchOpen = false; this.globalQuery = ''; }

  openRecord(item: NexusRecord) {
    this.store.select(item);
    this.closeSearch();
    this.notificationOpen = false;
  }

  openWizard(type: 'demanda'|'atividade'|'chamado') {
    this.notificationOpen = false;
    const key = this.draftKey(type);
    const savedDraft = this.readDraft(key);
    this.draft = savedDraft ?? this.emptyDraft(type);
    this.wizardStep = 1;
    this.saved.set(Boolean(savedDraft));
    this.wizardError = '';
    this.store.openWizard(type);
    this.mobileOpen = false;
  }

  closeWizard() {
    this.store.closeWizard();
    this.wizardError = '';
  }

  nextStep() {
    if (!this.isStepValid()) return;
    this.saveDraft();
    if (this.wizardStep < 5) {
      this.wizardStep++;
      this.wizardError = '';
      this.saveDraft();
    }
  }

  previousStep() {
    if (this.wizardStep > 1) {
      this.wizardStep--;
      this.wizardError = '';
    }
  }

  saveDraft() {
    const wizard = this.store.wizard();
    if (!wizard) return;
    localStorage.setItem(this.draftKey(wizard), JSON.stringify(this.draft));
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1200);
  }

  finishWizard() {
    if (!this.isStepValid()) return;
    const wizard = this.store.wizard() ?? 'demanda';
    this.store.addRecord(this.draft, wizard);
    localStorage.removeItem(this.draftKey(wizard));
    this.draft = this.emptyDraft(wizard);
    this.wizardStep = 1;
    this.wizardError = '';
  }

  isStepValid(): boolean {
    const errors: Record<number,string> = {
      1: !this.draft.title.trim() || !this.draft.description.trim() ? 'Informe título e descrição para continuar.' : '',
      2: !this.draft.requester || !this.draft.assignee ? 'Defina solicitante e responsável.' : '',
      3: !this.draft.context.trim() ? 'Explique o contexto conhecido para preservar a origem do registro.' : '',
      4: !this.draft.objective.trim() ? 'Informe o objetivo ou resultado esperado.' : '',
      5: !this.draft.title.trim() || !this.draft.description.trim() || !this.draft.requester || !this.draft.assignee || !this.draft.context.trim() || !this.draft.objective.trim() ? 'Complete os campos obrigatórios antes de criar o registro.' : '',
    };
    this.wizardError = errors[this.wizardStep] ?? '';
    return !this.wizardError;
  }

  onSolutionChange() {
    if (!this.draft.versionId) return;
    const version = this.store.versions.find(item => item.id === this.draft.versionId);
    if (version?.solutionId !== this.draft.solutionId) this.draft.versionId = '';
    this.saveDraft();
  }

  toggleParticipant(name: string) {
    const current = this.draft.participants.split(',').map(value => value.trim()).filter(Boolean);
    const exists = current.some(value => value === name);
    this.draft.participants = exists ? current.filter(value => value !== name).join(', ') : [...current, name].join(', ');
    this.saveDraft();
  }

  isParticipantSelected(name: string) {
    return this.draft.participants.split(',').map(value => value.trim()).includes(name);
  }

  addComment() {
    const selected = this.store.selected();
    if (!selected || !this.commentText.trim()) return;
    this.store.addComment(selected.id, this.commentText);
    this.commentText = '';
  }

  analyzeAi() {
    const selected = this.store.selected();
    if (selected?.type === 'Chamado') this.store.analyzeAi(selected.id);
  }

  approveAi() {
    const selected = this.store.selected();
    if (!selected) return;
    this.store.validateAi(selected.id, true, this.aiHumanNote);
    this.aiValidationError = '';
  }

  rejectAi() {
    const selected = this.store.selected();
    if (!selected) return;
    if (!this.aiHumanNote.trim()) {
      this.aiValidationError = 'Para rejeitar, informe o motivo ou o ajuste que o profissional identificou.';
      return;
    }
    this.store.validateAi(selected.id, false, this.aiHumanNote);
    this.aiValidationError = '';
  }

  registerKnowledge() {
    const selected = this.store.selected();
    if (selected) this.store.registerKnowledge(selected.id);
  }

  openRelated(id: string) {
    this.store.selectById(id);
  }

  private draftKey(type: 'demanda'|'atividade'|'chamado') {
    return type === 'demanda'
      ? 'nexus-angular-demanda-draft'
      : type === 'atividade'
        ? 'nexus-angular-atividade-draft'
        : 'nexus-angular-chamado-draft';
  }

  private readDraft(key: string): WizardDraft | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as WizardDraft : null;
    } catch {
      return null;
    }
  }

  private emptyDraft(type: 'demanda'|'atividade'|'chamado' = 'demanda'): WizardDraft {
    return {
      title:'',
      description:'',
      requester:currentUser.name,
      assignee:type === 'atividade' ? 'João Silva' : type === 'chamado' ? 'Ana Souza' : 'Carlos Lima',
      participants:'',
      context:'',
      solution:'',
      version:'',
      priority:'Média',
      objective:'',
      dueDate:'',
      solutionId:'',
      versionId:'',
      relatedRequirementId:''
    };
  }
}