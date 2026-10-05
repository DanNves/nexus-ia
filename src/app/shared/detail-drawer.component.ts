import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-detail-drawer',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detail-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailDrawerComponent {
  readonly store=inject(NexusStore);
  readonly closed=output<void>();
  commentText='';
  aiHumanNote='';
  aiValidationError='';
  readonly item=computed(()=>this.store.selected());

  close(){ this.closed.emit(); }
  addComment(){ const item=this.store.selected(); if(!item||!this.commentText.trim())return; this.store.addComment(item.id,this.commentText); this.commentText=''; }
  analyzeAi(){ const item=this.store.selected(); if(item?.type==='Chamado')this.store.analyzeAi(item.id); }
  approveAi(){ const item=this.store.selected(); if(!item)return; this.store.validateAi(item.id,true,this.aiHumanNote); this.aiValidationError=''; }
  rejectAi(){ const item=this.store.selected(); if(!item)return; if(!this.aiHumanNote.trim()){this.aiValidationError='Para rejeitar, informe o motivo ou o ajuste que o profissional identificou.';return;} this.store.validateAi(item.id,false,this.aiHumanNote); this.aiValidationError=''; }
  registerKnowledge(){ const item=this.store.selected(); if(item)this.store.registerKnowledge(item.id); }
  openRelated(id:string){this.store.selectById(id);}
}