import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NexusStore } from './services/nexus.store';
import { NxIconComponent } from './shared/icon.component';
import { NexusRecord, WizardDraft } from './models/nexus.models';

@Component({
  selector: 'nx-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, NxIconComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(NexusStore);
  readonly router = inject(Router);
  mobileOpen = false;
  moreOpen = false;
  userOpen = false;
  searchOpen = false;
  globalQuery = '';
  commentText = '';
  wizardStep = 1;
  saved = false;
  draft: WizardDraft = this.emptyDraft();

  readonly primary = [
    ['Dashboard','/dashboard','home'],
    ['Demandas','/demandas','demand'],
    ['Atividades','/atividades','activity'],
    ['Requisitos','/requisitos','requirement'],
    ['Soluções','/solucoes-e-versoes','solution'],
    ['Chamados','/chamados','ticket'],
    ['Conhecimento','/conhecimento','knowledge'],
  ] as const;

  readonly secondary = [
    ['Indicadores','/indicadores','chart'],
    ['Configurações','/configuracoes','settings'],
  ] as const;

  readonly searchResults = computed(() => {
    const q = this.globalQuery.trim().toLowerCase();
    if (!q) return [];
    return this.store.records().filter(r => [r.id,r.title,r.description,r.solution,r.version].join(' ').toLowerCase().includes(q)).slice(0,6);
  });

  navigate(path: string) {
    this.router.navigateByUrl(path);
    this.mobileOpen = false;
    this.moreOpen = false;
  }

  openSearch() { this.searchOpen = true; this.globalQuery = ''; }
  closeSearch() { this.searchOpen = false; this.globalQuery = ''; }
  openRecord(item: NexusRecord) { this.store.select(item); this.closeSearch(); }
  openWizard(type: 'demanda'|'atividade') {
    this.draft = this.emptyDraft();
    this.wizardStep = 1;
    this.saved = false;
    this.store.openWizard(type);
    this.mobileOpen = false;
  }
  closeWizard() { this.store.closeWizard(); }

  nextStep() {
    this.saveDraft();
    if (this.wizardStep < 5) this.wizardStep++;
  }
  previousStep() { if (this.wizardStep > 1) this.wizardStep--; }
  saveDraft() {
    const key = this.store.wizard() === 'demanda' ? 'nexus-angular-demanda-draft' : 'nexus-angular-atividade-draft';
    localStorage.setItem(key, JSON.stringify(this.draft));
    this.saved = true;
    setTimeout(() => this.saved = false, 1200);
  }
  finishWizard() {
    if (!this.draft.title.trim() || !this.draft.description.trim()) return;
    this.saveDraft();
    this.store.addRecord(this.draft, this.store.wizard() ?? 'demanda');
    this.draft = this.emptyDraft();
    this.wizardStep = 1;
  }
  private emptyDraft(): WizardDraft {
    return { title:'', description:'', requester:'Marina Costa', assignee:'Carlos Lima', participants:[], context:'', solution:'', version:'', priority:'Média', objective:'', dueDate:'' };
  }

  addComment() {
    const selected = this.store.selected();
    if (!selected || !this.commentText.trim()) return;
    this.store.addComment(selected.id, this.commentText);
    this.commentText = '';
  }

  approveAi() {
    const selected = this.store.selected();
    if (selected) this.store.validateAi(selected.id, true);
  }
  rejectAi() {
    const selected = this.store.selected();
    if (selected) this.store.validateAi(selected.id, false);
  }
}