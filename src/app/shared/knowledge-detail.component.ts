import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-knowledge-detail',
  standalone: true,
  imports: [NxIconComponent],
  templateUrl: './knowledge-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeDetailComponent {
  readonly store = inject(NexusStore);
  readonly item = input.required<NexusRecord>();
  openRelated(id: string) { this.store.selectById(id); }
}