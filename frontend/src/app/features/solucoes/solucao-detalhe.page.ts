import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Chamado, Demanda, Pessoa, Solucao } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { CENARIO, ESTADO_CHAMADO, dataCurta, relativo } from '../../shared/labels';

@Component({
  selector: 'nx-solucao-detalhe',
  imports: [RouterLink, ...UI],
  template: `
    <div class="pagina">
      <a routerLink="/solucoes" class="voltar"><nx-icon name="arrow-left" [size]="16" /> Soluções</a>
      @if (erro()) {
        <nx-vazio icone="alert" titulo="Não foi possível abrir esta solução" [texto]="erro()">
          <a routerLink="/solucoes" class="btn btn-secundario">Voltar</a>
        </nx-vazio>
      } @else if (s(); as s) {
        <header class="detalhe-topo">
          <div class="detalhe-titulo">
            <span class="codigo mudo">{{ s.codigo }}</span>
            <h1>{{ s.nome }}</h1>
            <p class="mudo">{{ s.descricao }}</p>
          </div>
          <div class="detalhe-meta">
            <span class="pessoa"><nx-icon [name]="CENARIO[s.tipo].icone" [size]="16" /> {{ CENARIO[s.tipo].nome }}</span>
            <a class="btn btn-primario" routerLink="/fila" [queryParams]="{ novo: 1, solucao: s.id }"><nx-icon name="plus" [size]="16" /> Abrir chamado</a>
          </div>
        </header>

        <div class="grade-2">
          <div class="coluna">
            <section class="secao">
              <h2>Versões</h2>
              <ol class="versoes">
                @for (v of s.versoes; track v.id; let primeira = $first) {
                  <li class="versao" [class.atual]="primeira">
                    <div class="versao-topo">
                      <strong>v{{ v.numero }}</strong>
                      @if (v.estado === 'PUBLICADA') { <span class="mudo">Publicada em {{ dataCurta(v.publicadaEm) }}</span> }
                      @else { <nx-badge tom="azul">Em desenvolvimento</nx-badge> }
                      @if (primeira && v.estado === 'PUBLICADA') { <nx-badge tom="verde">Atual</nx-badge> }
                    </div>
                    <ul class="versao-notas">@for (n of v.notas; track n) { <li>{{ n }}</li> }</ul>
                    <span class="mudo">{{ chamadosDaVersao(v.id) }} chamados nesta versão</span>
                  </li>
                }
              </ol>
            </section>
          </div>
          <aside class="coluna">
            @if (origem(); as o) {
              <section class="secao">
                <h2>De onde veio</h2>
                <a class="lista-item lista-link" [routerLink]="['/demandas', o.id]">
                  <span class="lista-icone" data-tipo="demanda"><nx-icon name="demand" [size]="16" /></span>
                  <div class="lista-texto"><strong>{{ o.nome }}</strong><span class="mudo">{{ o.codigo }}, {{ o.requisitos.length }} requisitos</span></div>
                </a>
                <p class="mudo">O suporte usa essa demanda, os requisitos e as versões como contexto quando um chamado é aberto.</p>
              </section>
            }
            <section class="secao">
              <h2>Chamados</h2>
              @if (chamadosDaSolucao().length) {
                <ul class="lista lista-compacta">
                  @for (c of chamadosDaSolucao(); track c.id) {
                    <li>
                      <a class="lista-item lista-link" [routerLink]="['/fila', c.id]">
                        <div class="lista-texto"><strong>{{ c.titulo }}</strong><span class="mudo">{{ c.codigo }}, {{ relativo(c.abertoEm) }}</span></div>
                        <nx-badge [tom]="ESTADO_CHAMADO[c.estado].tom">{{ ESTADO_CHAMADO[c.estado].rotulo }}</nx-badge>
                      </a>
                    </li>
                  }
                </ul>
              } @else {
                <p class="mudo">Nenhum chamado para esta solução.</p>
              }
            </section>
          </aside>
        </div>
      } @else {
        <div class="carregando" aria-busy="true"><span></span><span></span><span></span></div>
      }
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolucaoDetalhePage {
  private sessao = inject(SessionService);
  private api = inject(NexusApi);
  id = input.required<string>();
  readonly s = signal<Solucao | null>(null);
  readonly erro = signal('');
  readonly chamados = signal<Chamado[]>([]);
  readonly demandas = signal<Demanda[]>([]);
  readonly pessoas = signal<Pessoa[]>([]);
  readonly CENARIO = CENARIO;
  readonly ESTADO_CHAMADO = ESTADO_CHAMADO;
  readonly dataCurta = dataCurta;
  readonly relativo = relativo;

  readonly chamadosDaSolucao = computed(() => this.chamados().filter((c) => c.solucaoId === this.s()?.id));
  readonly origem = computed(() => this.demandas().find((d) => d.id === this.s()?.demandaOrigemId));

  constructor() {
    effect(() => {
      const id = this.id();
      this.sessao.perfil();
      untracked(() => {
        this.s.set(null);
        this.erro.set('');
        forkJoin({ s: this.api.solucao(id), c: this.api.chamados(), d: this.api.demandas() }).subscribe({
          next: ({ s, c, d }) => { this.chamados.set(c); this.demandas.set(d); this.s.set(s); },
          error: (e) => this.erro.set(lerErro(e).mensagem),
        });
      });
    });
  }

  chamadosDaVersao(vid: string) { return this.chamados().filter((c) => c.versaoId === vid).length; }
}
