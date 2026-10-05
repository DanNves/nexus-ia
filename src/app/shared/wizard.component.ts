import { Component, effect, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';
import { WizardDraft, WizardType } from '../models/nexus.models';
import { team, currentUser } from '../data/nexus.data';

@Component({
  selector: 'nx-wizard',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
  templateUrl: './wizard.component.html',
})
export class WizardComponent {
  readonly store=inject(NexusStore);
  readonly closed=output<void>();
  readonly team=team;
  readonly solutions=this.store.solutions;
  readonly versions=this.store.versions;
  wizardStep=1;
  readonly saved=signal(false);
  wizardError='';
  draft:WizardDraft=this.emptyDraft();

  constructor(){
    effect(()=>{const wizard=this.store.wizard(); if(!wizard)return; const saved=this.readDraft(this.draftKey(wizard)); this.draft=saved??this.emptyDraft(wizard); this.wizardStep=1; this.saved.set(Boolean(saved)); this.wizardError='';});
  }
  close(){this.saveDraft();this.closed.emit();}
  nextStep(){if(!this.isStepValid())return;this.saveDraft();if(this.wizardStep<5){this.wizardStep++;this.wizardError='';this.saveDraft();}}
  previousStep(){if(this.wizardStep>1){this.wizardStep--;this.wizardError='';}}
  saveDraft(){const wizard=this.store.wizard();if(!wizard)return;try{localStorage.setItem(this.draftKey(wizard),JSON.stringify(this.draft));}catch{this.wizardError='Não foi possível salvar o rascunho neste navegador.';return;}this.saved.set(true);window.setTimeout(()=>this.saved.set(false),1200);}
  finishWizard(){if(!this.isStepValid())return;const wizard=this.store.wizard()??'demanda';this.store.addRecord(this.draft,wizard);localStorage.removeItem(this.draftKey(wizard));this.draft=this.emptyDraft(wizard);this.wizardStep=1;this.wizardError='';}
  isStepValid(){const errors:Record<number,string>={1:!this.draft.title.trim()||!this.draft.description.trim()?'Informe título e descrição para continuar.':'',2:!this.draft.requester||!this.draft.assignee?'Defina solicitante e responsável.':'',3:!this.draft.context.trim()?'Explique o contexto conhecido para preservar a origem do registro.':'',4:!this.draft.objective.trim()?'Informe o objetivo ou resultado esperado.':'',5:!this.draft.title.trim()||!this.draft.description.trim()||!this.draft.requester||!this.draft.assignee||!this.draft.context.trim()||!this.draft.objective.trim()?'Complete os campos obrigatórios antes de criar o registro.':''};this.wizardError=errors[this.wizardStep]??'';return !this.wizardError;}
  toggleParticipant(name:string){const current=this.draft.participants.split(',').map(v=>v.trim()).filter(Boolean);const exists=current.some(v=>v===name);this.draft.participants=exists?current.filter(v=>v!==name).join(', '):[...current,name].join(', ');this.saveDraft();}
  isParticipantSelected(name:string){return this.draft.participants.split(',').map(v=>v.trim()).includes(name);}
  availableVersions(){return this.versions.filter(v=>!this.draft.solutionId||v.solutionId===this.draft.solutionId);}
  onSolutionChange(){if(!this.availableVersions().some(v=>v.id===this.draft.versionId))this.draft.versionId=this.availableVersions()[0]?.id??'';this.saveDraft();}
  selectedSolutionName(){return this.solutions.find(v=>v.id===this.draft.solutionId)?.name??'A definir';}
  selectedVersionLabel(){return this.versions.find(v=>v.id===this.draft.versionId)?.label??'A definir';}
  private draftKey(type:WizardType){return type==='demanda'?'nexus-angular-demanda-draft':type==='atividade'?'nexus-angular-atividade-draft':'nexus-angular-chamado-draft';}
  private readDraft(key:string):WizardDraft|null{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw) as WizardDraft:null;}catch{return null;}}
  private emptyDraft(type:WizardType='demanda'):WizardDraft{return{title:'',description:'',requester:currentUser.name,assignee:team.find(p=>type==='atividade'?p.role==='Desenvolvedor':type==='chamado'?p.role==='Analista de Suporte':p.role==='Analista de Sistemas')?.name??team[0]?.name??currentUser.name,participants:'',requirementId:'',solutionId:'SOL-001',versionId:'VER-120',context:'',solution:'',version:'',priority:'Média',objective:'',dueDate:''};}
}