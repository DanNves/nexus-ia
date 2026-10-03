import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nx-detail-drawer',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
  templateUrl: './detail-drawer.component.html',
})
export class DetailDrawerComponent {
  readonly store = inject(NexusStore);
  commentText = '';
  analyzeAi() { const item = this.store.selected(); if (item?.type === 'Chamado') this.store.analyzeAi(item.id); }
  approveAi() { const item = this.store.selected(); if (item) this.store.validateAi(item.id, true); }
  rejectAi() { const item = this.store.selected(); if (item) this.store.validateAi(item.id, false, 'Revisão solicitada pelo responsável.'); }
  addComment() {
    const item = this.store.selected();
    if (!item || !this.commentText.trim()) return;
    this.store.addComment(item.id, this.commentText);
    this.commentText = '';
  }
  openRelated(id: string) { this.store.selectById(id); }
  close() { this.store.closeDetail(); }
  registerKnowledge() { const item = this.store.selected(); if (item) this.store.registerKnowledge(item.id); }
}
