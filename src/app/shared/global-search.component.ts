import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusStore } from '../services/nexus.store';
import { NxIconComponent } from './icon.component';
import { NexusRecord } from '../models/nexus.models';

@Component({
  selector: 'nx-global-search',
  standalone: true,
  imports: [FormsModule, NxIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchComponent {
  readonly store = inject(NexusStore);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly query = signal('');
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('input') private input?: ElementRef<HTMLInputElement>;

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    return this.store.records().filter(r => [r.id,r.title,r.description,r.solution,r.version].join(' ').toLowerCase().includes(q)).slice(0,6);
  });

  ngOnChanges() {
    if (this.open()) {
      this.query.set('');
      window.setTimeout(() => this.input?.nativeElement.focus(), 0);
    }
  }

  select(record: NexusRecord) {
    this.store.select(record);
    this.close();
  }

  close() {
    this.closed.emit();
  }

  trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !this.dialog) return;
    const focusable = Array.from(this.dialog.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])')).filter(e => e.offsetParent !== null);
    if (!focusable.length) return;
    const first=focusable[0], last=focusable[focusable.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}