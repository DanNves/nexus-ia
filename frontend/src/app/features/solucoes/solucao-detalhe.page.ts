import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Chamado, Demanda, Pessoa, Solucao } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/ui/toast.service';
import { UI } from '../../shared/ui/ui.components';
import { CENARIO, ESTADO_CHAMADO, dataCurta, relativo } from '../../shared/labels';

@Component({
  selector: 'nx-solucao-detalhe',
  imports: [RouterLink, FormsModule, ...UI],
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
              <div class="secao-topo">
                <h2>Observadores</h2>
                @if (observando()) { <nx-badge tom="roxo"><nx-icon name="eye" [size]="12" /> Você observa</nx-badge> }
              </div>
              <p class="mudo obs-dica">Pessoas que acompanham esta solução pelo e-mail da conta: veem as versões e recebem os avisos, mesmo sem ter feito o pedido.</p>
              @if (s.observadores.length) {
                <ul class="lista lista-compacta">
                  @for (e of s.observadores; track e) {
                    <li class="lista-item">
                      <span class="lista-icone"><nx-icon name="eye" [size]="15" /></span>
                      <div class="lista-texto"><strong>{{ e }}</strong>@if (e === meuEmail()) { <span class="mudo">você</span> }</div>
                      @if (podeGerenciar() || e === meuEmail()) {
                        <button type="button" class="btn btn-secundario btn-p" [disabled]="ocupado()" (click)="remover(e)">{{ e === meuEmail() ? 'Deixar de observar' : 'Remover' }}</button>
                      }
                    </li>
                  }
                </ul>
              } @else {
                <p class="mudo">Ninguém observa esta solução ainda.</p>
              }
              @if (podeGerenciar()) {
                <form class="form obs-form" (ngSubmit)="adicionar()" novalidate>
                  <label class="campo"><span>Adicionar observador</span>
                    <div class="obs-linha">
                      <input class="input" type="email" name="email" [(ngModel)]="novoEmail" placeholder="email@empresa.com" maxlength="254" autocomplete="off" [class.invalido]="erroEmail()" />
                      <button type="submit" class="btn btn-primario" [disabled]="ocupado()">Adicionar</button>
                    </div>
                    @if (erroEmail()) { <p class="erro-campo" role="alert">{{ erroEmail() }}</p> }
                  </label>
                </form>
              }
            </section>

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
  styles: [`
    .obs-dica { font-size: 13px; margin-top: -4px; }
    .obs-linha { display: flex; gap: 8px; }
    .obs-linha .input { flex: 1; min-width: 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolucaoDetalhePage {
  private sessao = inject(SessionService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private api = inject(NexusApi);
  novoEmail = '';
  readonly erroEmail = signal('');
  readonly ocupado = signal(false);

  readonly meuEmail = computed(() => (this.auth.usuario()?.email ?? '').trim().toLowerCase());
  readonly observando = computed(() => !!this.s()?.observadores.includes(this.meuEmail()));
  /** Quem solicitou e a equipe gerenciam os observadores; o observador só pode sair. */
  readonly podeGerenciar = computed(() => this.sessao.ehEquipe() || this.s()?.clienteId === this.sessao.pessoaId());
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

  adicionar() {
    const s = this.s();
    if (!s) return;
    const email = this.novoEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.erroEmail.set('Informe um e-mail válido.'); return; }
    if (s.observadores.includes(email)) { this.erroEmail.set('Este e-mail já acompanha a solução.'); return; }
    this.erroEmail.set('');
    this.ocupado.set(true);
    this.api.adicionarObservador(s.id, email).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: (n) => { this.s.set(n); this.novoEmail = ''; this.toast.ok(`${email} agora observa esta solução.`); },
      error: (e) => { const er = lerErro(e); this.erroEmail.set(er.campos?.['email']?.[0] ?? er.mensagem); },
    });
  }

  remover(email: string) {
    const s = this.s();
    if (!s) return;
    const euMesmo = email === this.meuEmail();
    this.ocupado.set(true);
    this.api.removerObservador(s.id, email).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: (n) => {
        this.toast.ok(euMesmo ? 'Você deixou de observar esta solução.' : `${email} não observa mais esta solução.`);
        // Quem só observava perde o acesso: volta para a lista.
        if (euMesmo && !this.podeGerenciar()) { this.s.set(null); this.erro.set('Você não observa mais esta solução.'); return; }
        this.s.set(n);
      },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  chamadosDaVersao(vid: string) { return this.chamados().filter((c) => c.versaoId === vid).length; }
}
