import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NexusApi } from '../../core/api/nexus-api.service';
import { Chamado, Pessoa, Solucao } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { CENARIO, dataCurta } from '../../shared/labels';

@Component({
  selector: 'nx-solucoes',
  imports: [RouterLink, ...UI],
  template: `
    <div class="pagina">
      <header class="pagina-topo">
        <div>
          <h1>Soluções</h1>
          <p class="mudo">O que já foi entregue e as versões publicadas. É aqui que o desenvolvimento encontra o suporte.</p>
        </div>
      </header>

      @if (solucoes(); as lista) {
        @if (lista.length) {
          <ul class="solucoes">
            @for (s of lista; track s.id) {
              <li>
                <a class="solucao" [routerLink]="['/solucoes', s.id]">
                  <span class="solucao-icone"><nx-icon [name]="CENARIO[s.tipo].icone" [size]="20" /></span>
                  <div class="lista-texto">
                    <strong>{{ s.nome }}</strong>
                    <span class="mudo">{{ s.descricao }}</span>
                  </div>
                  <dl class="solucao-meta">
                    <div><dt>Versão atual</dt><dd>{{ versaoAtual(s) }}</dd></div>
                    <div><dt>Cliente</dt><dd>{{ cliente(s) }}</dd></div>
                    <div><dt>Chamados abertos</dt><dd>{{ abertos(s) }}</dd></div>
                  </dl>
                  @if (emDesenvolvimento(s)) { <nx-badge tom="azul">Em desenvolvimento</nx-badge> }
                  @else { <nx-badge tom="verde">Publicada {{ dataCurta(s.versoes[0].publicadaEm) }}</nx-badge> }
                </a>
              </li>
            }
          </ul>
        } @else {
          <nx-vazio icone="layers" titulo="Nenhuma solução publicada ainda" texto="Quando uma demanda for entregue, a solução aparece aqui." />
        }
      } @else {
        <div class="carregando" aria-busy="true"><span></span><span></span><span></span></div>
      }
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolucoesPage {
  private sessao = inject(SessionService);
  private api = inject(NexusApi);
  readonly solucoes = signal<Solucao[] | null>(null);
  readonly pessoas = signal<Pessoa[]>([]);
  readonly chamados = signal<Chamado[]>([]);
  readonly CENARIO = CENARIO;
  readonly dataCurta = dataCurta;

  constructor() {
    effect(() => {
      this.sessao.perfil();
      untracked(() => {
        this.solucoes.set(null);
        forkJoin({ s: this.api.solucoes(), p: this.api.pessoas(), c: this.api.chamados() }).subscribe(({ s, p, c }) => {
          this.pessoas.set(p);
          this.chamados.set(c);
          this.solucoes.set(s);
        });
      });
    });
  }

  versaoAtual(s: Solucao) { return s.versoes[0] ? `v${s.versoes[0].numero}` : '—'; }
  emDesenvolvimento(s: Solucao) { return s.versoes[0]?.estado === 'EM_DESENVOLVIMENTO'; }
  cliente(s: Solucao) { return this.pessoas().find((p) => p.id === s.clienteId)?.organizacao ?? ''; }
  abertos(s: Solucao) { return this.chamados().filter((c) => c.solucaoId === s.id && c.estado !== 'RESOLVIDO').length; }
}
