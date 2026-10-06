import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-ticket-ai-detail',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
  templateUrl: './ticket-ai-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketAiDetailComponent {
  readonly store = inject(NexusStore);
  readonly ticket = input.required<NexusRecord>();
  aiHumanNote = '';
  aiValidationError = '';

  analyze() { this.store.analyzeAi(this.ticket().id); }
  approve() {
    this.store.validateAi(this.ticket().id, true, this.aiHumanNote);
    this.aiValidationError = '';
  }
  reject() {
    if (!this.aiHumanNote.trim()) {
      this.aiValidationError = 'Para rejeitar, informe o motivo ou o ajuste que o profissional identificou.';
      return;
    }
    this.store.validateAi(this.ticket().id, false, this.aiHumanNote);
    this.aiValidationError = '';
  }
  openRelated(id: string) { this.store.selectById(id); }
  context() { return this.store.aiContextFor(this.ticket().id); }
}