import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NexusApi } from '../../core/api/nexus-api.service';
import { Demanda, Requisito } from '../../core/api/models';
import { UI } from '../../shared/ui/ui.components';

type Item = Requisito & { demandaId: string; demandaCodigo: string; demandaNome: string };

@Component({
  selector: 'nx-requisitos',
  imports: [RouterLink, FormsModule, ...UI],
  templateUrl: './requisitos.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequisitosPage {
  private api = inject(NexusApi);
  readonly itens = signal<Item[]>([]);
  readonly busca = signal('');
  readonly filtro = signal<'todos'|'pendentes'|'aprovados'>('todos');

  constructor() {
    effect(() => untracked(() => this.api.demandas().subscribe(ds =>
      this.itens.set(ds.flatMap((d: Demanda) => d.requisitos.map((r: Requisito) => ({
        ...r, demandaId: d.id, demandaCodigo: d.codigo, demandaNome: d.nome,
      }))))
    )));
  }

  readonly filtrados = computed(() => {
    const q = this.busca().toLowerCase().trim();
    return this.itens().filter(r =>
      (!q || [r.codigo, r.titulo, r.descricao, r.demandaCodigo, r.demandaNome].join(' ').toLowerCase().includes(q)) &&
      (this.filtro() === 'todos' || (this.filtro() === 'pendentes' ? r.estado === 'PROPOSTO' : r.estado === 'APROVADO'))
    );
  });

  pendentes() { return this.itens().filter(r => r.estado === 'PROPOSTO').length; }
  aprovados() { return this.itens().filter(r => r.estado === 'APROVADO').length; }
  regras() { return this.itens().filter(r => r.tipo === 'REGRA').length; }
}
