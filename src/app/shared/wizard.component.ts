import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { WizardDraft, WizardType } from '../models/nexus.models';
import { team } from '../data/nexus.data';
import { NxIconComponent } from './icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nx-wizard',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
  templateUrl: './wizard.component.html',
})
export class WizardComponent {
  readonly store = inject(NexusStore);
  readonly team = team;
  readonly saved = signal(false);
  wizardStep = 1;
  wizardError = '';
  draft: WizardDraft = this.emptyDraft();

  constructor() {
    effect(() => {
      if (this.store.wizard()) this.openDraft();
    });
  }

  get type(): WizardType | null { return this.store.wizard(); }

  openDraft() {
    const type = this.type;
    if (!type) return;
    const key = this.draftKey(type);
    try {
      const raw = localStorage.getItem(key);
      this.draft = raw ? JSON.parse(raw) as WizardDraft : this.emptyDraft(type);
      this.saved.set(Boolean(raw));
    } catch {
      this.draft = this.emptyDraft(type);
      this.saved.set(false);
    }
    this.wizardStep = 1;
    this.wizardError = '';
  }

  close() { this.store.closeWizard(); this.wizardError = ''; }

  nextStep() {
    if (!this.isStepValid()) return;
    this.saveDraft();
    if (this.wizardStep < 5) { this.wizardStep++; this.wizardError = ''; this.saveDraft(); }
  }
  previousStep() { if (this.wizardStep > 1) { this.wizardStep--; this.wizardError = ''; } }

  saveDraft() {
    const type=this.type; if (!type) return;
    localStorage.setItem(this.draftKey(type), JSON.stringify(this.draft));
    this.saved.set(true);
    window.setTimeout(() => this.saved.set(false), 1200);
  }

  finishWizard() {
    if (!this.isStepValid()) return;
    const type=this.type; if (!type) return;
    this.store.addRecord(this.draft, type);
    localStorage.removeItem(this.draftKey(type));
    this.draft=this.emptyDraft(type); this.wizardStep=1; this.wizardError='';
  }

  isStepValid() {
    const errors: Record<number,string> = {
      1: !this.draft.title.trim() || !this.draft.description.trim() ? 'Informe título e descrição para continuar.' : '',
      2: !this.draft.requester || !this.draft.assignee ? 'Defina solicitante e responsável.' : '',
      3: !this.draft.context.trim() ? 'Explique o contexto conhecido para preservar a origem do registro.' : '',
      4: !this.draft.objective.trim() ? 'Informe o objetivo ou resultado esperado.' : '',
      5: !this.draft.title.trim() || !this.draft.description.trim() || !this.draft.requester || !this.draft.assignee || !this.draft.context.trim() || !this.draft.objective.trim() ? 'Complete os campos obrigatórios antes de criar o registro.' : ''
    };
    this.wizardError=errors[this.wizardStep] ?? '';
    return !this.wizardError;
  }

  toggleParticipant(name:string) {
    const current=this.draft.participants.split(',').map(v=>v.trim()).filter(Boolean);
    this.draft.participants=current.includes(name) ? current.filter(v=>v!==name).join(', ') : [...current,name].join(', ');
    this.saveDraft();
  }
  isParticipantSelected(name:string) { return this.draft.participants.split(',').map(v=>v.trim()).includes(name); }

  private draftKey(type:WizardType) {
    return type==='demanda'?'nexus-angular-demanda-draft':type==='atividade'?'nexus-angular-atividade-draft':'nexus-angular-chamado-draft';
  }
  private emptyDraft(type:WizardType='demanda'):WizardDraft {
    return {title:'',description:'',requester:'Marina Costa',assignee:type==='atividade'?'João Silva':type==='chamado'?'Ana Souza':'Carlos Lima',participants:'',context:'',solution:'',version:'',priority:'Média',objective:'',dueDate:''};
  }
}
