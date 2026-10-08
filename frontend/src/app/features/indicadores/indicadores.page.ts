import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { NexusApi } from '../../core/api/nexus-api.service';
import { VisaoGeral, Demanda, Chamado, Solucao, Conhecimento } from '../../core/api/models';
import { UI } from '../../shared/ui/ui.components';

@Component({
  selector: 'nx-indicadores',
  imports: [...UI],
  templateUrl: './indicadores.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndicadoresPage {
  private api = inject(NexusApi);
  readonly dados = signal<VisaoGeral | null>(null);
  readonly demandas = signal<Demanda[]>([]);
  readonly chamados = signal<Chamado[]>([]);
  readonly solucoes = signal<Solucao[]>([]);
  readonly conhecimentos = signal<Conhecimento[]>([]);

  constructor() {
    effect(() => untracked(() => {
      this.api.visaoGeral().subscribe(v => this.dados.set(v));
      this.api.demandas().subscribe(v => this.demandas.set(v));
      this.api.chamados().subscribe(v => this.chamados.set(v));
      this.api.solucoes().subscribe(v => this.solucoes.set(v));
      this.api.conhecimentos().subscribe(v => this.conhecimentos.set(v));
    }));
  }

  cobertura() {
    const d = this.demandas();
    return d.length ? Math.round(d.filter(x => x.requisitos.length > 0 || !!x.solucaoId).length / d.length * 100) : 0;
  }
  requisitos() { return this.demandas().reduce((n, d) => n + d.requisitos.length, 0); }
  versoes() { return this.solucoes().reduce((n, s) => n + s.versoes.length, 0); }
  pendentesIa() { return this.chamados().filter(c => c.sugestao?.estado === 'PROPOSTO').length; }
  aprovadasIa() { return this.chamados().filter(c => c.sugestao?.estado === 'APROVADO').length; }
  rejeitadasIa() { return this.chamados().filter(c => c.sugestao?.estado === 'REJEITADO').length; }
  reusos() { return this.conhecimentos().reduce((n, k) => n + k.usos, 0); }
}
