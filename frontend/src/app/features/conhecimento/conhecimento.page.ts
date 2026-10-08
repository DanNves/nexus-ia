import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NexusApi } from '../../core/api/nexus-api.service';
import { Conhecimento } from '../../core/api/models';
import { UI } from '../../shared/ui/ui.components';

@Component({
  selector: 'nx-conhecimento',
  imports: [RouterLink, FormsModule, ...UI],
  templateUrl: './conhecimento.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConhecimentoPage {
  private api = inject(NexusApi);
  readonly itens = signal<Conhecimento[]>([]);
  readonly busca = signal('');

  constructor() { effect(() => untracked(() => this.api.conhecimentos().subscribe(v => this.itens.set(v)))); }

  readonly filtrados = computed(() => {
    const q = this.busca().toLowerCase().trim();
    return this.itens().filter(k => !q || [k.codigo, k.titulo, k.chamadoOrigemId, k.procedimento.join(' ')].join(' ').toLowerCase().includes(q));
  });

  reusos() { return this.itens().reduce((s, k) => s + k.usos, 0); }
  maisUsado() { return this.itens().length ? Math.max(...this.itens().map(k => k.usos)) : 0; }
}
