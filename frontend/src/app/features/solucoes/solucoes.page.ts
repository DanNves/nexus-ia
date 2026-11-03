import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Chamado, Pessoa, Solucao } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { CENARIO, dataCurta } from '../../shared/labels';

type Filtro = 'todas' | 'minhas' | 'observando';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'minhas', rotulo: 'Solicitadas por mim' },
  { id: 'observando', rotulo: 'Observando' },
];

@Component({
  selector: 'nx-solucoes',
  imports: [RouterLink, ...UI],
  template: `
    <div class="pagina">
      <header class="pagina-topo">
        <div>
          <h1>Soluções</h1>
          <p class="mudo">O que já foi entregue e as versões publicadas. Aparecem aqui as que você solicitou e aquelas em que alguém colocou o seu e-mail como observador.</p>
        </div>
      </header>

      @if (erro()) {
        <nx-vazio icone="alert" titulo="Não foi possível carregar as soluções" [texto]="erro()">
          <button type="button" class="btn btn-primario" (click)="carregar()">Tentar de novo</button>
        </nx-vazio>
      } @else if (solucoes(); as lista) {
        <div class="barra-ferramentas">
          <div class="filtros" role="group" aria-label="Filtrar soluções">
            @for (f of FILTROS; track f.id) {
              <button type="button" class="filtro" [class.ativo]="filtro() === f.id" [attr.aria-pressed]="filtro() === f.id" (click)="filtro.set(f.id)">
                {{ f.rotulo }} <span class="mudo">{{ contagem(f.id) }}</span>
              </button>
            }
          </div>
          <p class="mudo filtro-dica">{{ dicaFiltro() }}</p>
        </div>

        @if (filtradas().length) {
          <ul class="solucoes">
            @for (s of filtradas(); track s.id) {
              <li>
                <a class="solucao" [routerLink]="['/solucoes', s.id]">
                  <span class="solucao-icone"><nx-icon [name]="CENARIO[s.tipo].icone" [size]="20" /></span>
                  <div class="lista-texto">
                    <strong>{{ s.nome }}</strong>
                    <span class="mudo">{{ s.descricao }}</span>
                    <span class="solucao-relacao">
                      @if (minha(s)) { <nx-badge tom="azul"><nx-icon name="user" [size]="12" /> Solicitada por você</nx-badge> }
                      @if (observando(s)) { <nx-badge tom="roxo"><nx-icon name="eye" [size]="12" /> Você observa</nx-badge> }
                      @if (s.observadores.length) { <span class="mudo">{{ s.observadores.length }} {{ s.observadores.length === 1 ? 'observador' : 'observadores' }}</span> }
                    </span>
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
        } @else if (lista.length) {
          <nx-vazio [icone]="filtro() === 'observando' ? 'eye' : 'layers'" [titulo]="filtro() === 'observando' ? 'Você não observa nenhuma solução' : 'Nenhuma solução solicitada por você'"
            [texto]="filtro() === 'observando' ? 'Quando alguém colocar o seu e-mail como observador de uma solução, ela aparece aqui.' : 'As soluções que nascem das suas demandas aparecem aqui.'" />
        } @else {
          <nx-vazio icone="layers" titulo="Nenhuma solução ainda" texto="Quando uma demanda for entregue, a solução aparece aqui." />
        }
      } @else {
        <div class="carregando" aria-busy="true"><span></span><span></span><span></span></div>
      }
    </div>`,
  styles: [`
    .filtro-dica { font-size: 13px; }
    .solucao-relacao { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 6px; font-size: 12px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolucoesPage {
  private sessao = inject(SessionService);
  private auth = inject(AuthService);
  private api = inject(NexusApi);
  readonly solucoes = signal<Solucao[] | null>(null);
  readonly pessoas = signal<Pessoa[]>([]);
  readonly chamados = signal<Chamado[]>([]);
  readonly erro = signal('');
  readonly filtro = signal<Filtro>('todas');
  readonly FILTROS = FILTROS;
  readonly CENARIO = CENARIO;
  readonly dataCurta = dataCurta;

  /** Vínculo do observador é pelo e-mail da conta. */
  private readonly meuEmail = computed(() => (this.auth.usuario()?.email ?? '').trim().toLowerCase());

  readonly filtradas = computed(() => (this.solucoes() ?? []).filter((s) => this.passa(s, this.filtro())));

  readonly dicaFiltro = computed(() => {
    switch (this.filtro()) {
      case 'minhas': return 'Soluções que nasceram de pedidos seus.';
      case 'observando': return `Soluções de outras pessoas que colocaram ${this.meuEmail() || 'o seu e-mail'} como observador.`;
      default: return this.sessao.ehEquipe() ? 'Todas as soluções entregues pela equipe.' : 'As que você solicitou e as que você observa.';
    }
  });

  constructor() {
    effect(() => {
      this.sessao.perfil();
      untracked(() => this.carregar());
    });
  }

  carregar() {
    this.solucoes.set(null);
    this.erro.set('');
    forkJoin({ s: this.api.solucoes(), p: this.api.pessoas(), c: this.api.chamados() }).subscribe({
      next: ({ s, p, c }) => {
        this.pessoas.set(p);
        this.chamados.set(c);
        this.solucoes.set(s);
      },
      error: (e) => this.erro.set(lerErro(e).mensagem),
    });
  }

  minha(s: Solucao) { return s.clienteId === this.sessao.pessoaId(); }
  observando(s: Solucao) { return !!this.meuEmail() && (s.observadores ?? []).includes(this.meuEmail()); }

  private passa(s: Solucao, f: Filtro) {
    if (f === 'minhas') return this.minha(s);
    if (f === 'observando') return this.observando(s);
    return true;
  }

  contagem(f: Filtro) { return (this.solucoes() ?? []).filter((s) => this.passa(s, f)).length; }

  versaoAtual(s: Solucao) { return s.versoes[0] ? `v${s.versoes[0].numero}` : '—'; }
  emDesenvolvimento(s: Solucao) { return s.versoes[0]?.estado === 'EM_DESENVOLVIMENTO'; }
  cliente(s: Solucao) { return this.pessoas().find((p) => p.id === s.clienteId)?.organizacao ?? ''; }
  abertos(s: Solucao) { return this.chamados().filter((c) => c.solucaoId === s.id && c.estado !== 'RESOLVIDO').length; }
}
