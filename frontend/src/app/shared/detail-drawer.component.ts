import { ChangeDetectionStrategy, Component, computed, ElementRef, effect, inject, output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-detail-drawer',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
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
  @ViewChild('drawerDialog') private drawer?: ElementRef<HTMLElement>;

  constructor(){
    effect(() => {
      if (!this.item()) return;
      window.setTimeout(() => {
        this.drawer?.nativeElement.querySelector<HTMLElement>('button.close-btn')?.focus();
      }, 0);
    });
  }

  trapFocus(event: KeyboardEvent, container: HTMLElement) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])')).filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  close(){ this.closed.emit(); }
  addComment(){ const item=this.store.selected(); if(!item||!this.commentText.trim())return; this.store.addComment(item.id,this.commentText); this.commentText=''; }
  analyzeAi(){ const item=this.store.selected(); if(item?.type==='Chamado')this.store.analyzeAi(item.id); }
  approveAi(){ const item=this.store.selected(); if(!item)return; this.store.validateAi(item.id,true,this.aiHumanNote); this.aiValidationError=''; }
  rejectAi(){ const item=this.store.selected(); if(!item)return; if(!this.aiHumanNote.trim()){this.aiValidationError='Para rejeitar, informe o motivo ou o ajuste que o profissional identificou.';return;} this.store.validateAi(item.id,false,this.aiHumanNote); this.aiValidationError=''; }
  registerKnowledge(){ const item=this.store.selected(); if(item)this.store.registerKnowledge(item.id); }
  openRelated(id:string){this.store.selectById(id);}
}