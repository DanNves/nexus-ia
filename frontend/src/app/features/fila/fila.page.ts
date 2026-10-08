import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Chamado, FilaResumo, Pessoa, Prioridade, Solucao } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { ESTADO_CHAMADO, IMPACTO, PRIORIDADE, duracao, relativo } from '../../shared/labels';

const ATUALIZACAO_MS = 15_000;

@Component({
  selector: 'nx-fila',
  imports: [RouterLink, FormsModule, ...UI],
  templateUrl: './fila.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaPage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  private router = inject(Router);
  private toast = inject(ToastService);

  novo = input<string>();
  solucao = input<string>();

  readonly fila = signal<FilaResumo | null>(null);
  readonly meus = signal<Chamado[]>([]);
  readonly solucoes = signal<Solucao[]>([]);
  readonly pessoas = signal<Pessoa[]>([]);
  readonly atualizadoEm = signal(new Date().toISOString());

  readonly ESTADO_CHAMADO = ESTADO_CHAMADO;
  readonly PRIORIDADE = PRIORIDADE;
  readonly IMPACTOS = (['ALTA', 'MEDIA', 'BAIXA'] as Prioridade[]).map((p) => ({ valor: p, texto: IMPACTO[p] }));
  readonly duracao = duracao;
  readonly relativo = relativo;

  readonly meusNaFila = computed(() => this.meus().filter((c) => c.estado === 'NA_FILA').sort((a, b) => (a.posicao ?? 0) - (b.posicao ?? 0)));
  readonly meusEmAtendimento = computed(() => this.meus().filter((c) => c.estado === 'EM_ATENDIMENTO'));
  readonly meusResolvidos = computed(() => this.meus().filter((c) => c.estado === 'RESOLVIDO'));

  // Abrir chamado
  readonly abrirAberto = signal(false);
  readonly salvando = signal(false);
  readonly erros = signal<Record<string, string[]>>({});
  form = { solucaoId: '', versaoId: '', titulo: '', descricao: '', prioridade: '' as Prioridade | '' };

  constructor() {
    effect(() => {
      this.sessao.perfil();
      untracked(() => this.carregar());
    });
    effect(() => {
      if (this.novo() && this.solucoes().length) untracked(() => this.abrirFormulario(this.solucao()));
    });
    const timer = setInterval(() => this.atualizar(), ATUALIZACAO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  carregar() {
    this.fila.set(null);
    forkJoin({ f: this.api.fila(), m: this.api.chamados(), s: this.api.solucoes(), p: this.api.pessoas() }).subscribe(({ f, m, s, p }) => {
      this.solucoes.set(s);
      this.pessoas.set(p);
      this.meus.set(m);
      this.fila.set(f);
      this.atualizadoEm.set(new Date().toISOString());
    });
  }

  atualizar() {
    forkJoin({ f: this.api.fila(), m: this.api.chamados() }).subscribe(({ f, m }) => {
      this.fila.set(f);
      this.meus.set(m);
      this.atualizadoEm.set(new Date().toISOString());
    });
  }

  /** Blocos da linha da fila: quem está sendo atendido, depois cada posição. */
  linha(meu?: Chamado) {
    const f = this.fila();
    if (!f) return [];
    return [
      ...f.emAtendimento.map((c) => ({ id: c.id, tipo: 'atendimento' as const, meu: c.id === meu?.id, rotulo: 'Em atendimento' })),
      ...f.naFila.map((c) => ({ id: c.id, tipo: 'fila' as const, meu: c.id === meu?.id, rotulo: `${c.posicao}º na fila` })),
    ];
  }

  aFrente(c: Chamado) { return Math.max(0, (c.posicao ?? 1) - 1); }

  nomeSolucao(id: string) { return this.solucoes().find((s) => s.id === id)?.nome ?? ''; }
  nomePessoa(id?: string) { return this.pessoas().find((p) => p.id === id)?.nome ?? ''; }

  atenderProximo() {
    this.api.atenderProximo().subscribe({
      next: (c) => { this.toast.ok(`Você está atendendo ${c.codigo}.`); void this.router.navigate(['/fila', c.id]); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  atender(c: Chamado) {
    this.api.atender(c.id).subscribe({
      next: () => { this.toast.ok(`Você está atendendo ${c.codigo}.`); void this.router.navigate(['/fila', c.id]); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  // ---------- Abrir chamado ----------

  versoesDisponiveis() {
    return this.solucoes().find((s) => s.id === this.form.solucaoId)?.versoes ?? [];
  }

  abrirFormulario(solucaoId?: string) {
    this.form = { solucaoId: solucaoId ?? '', versaoId: '', titulo: '', descricao: '', prioridade: '' };
    this.trocarSolucao();
    this.erros.set({});
    this.abrirAberto.set(true);
  }

  fecharFormulario() {
    this.abrirAberto.set(false);
    if (this.novo()) void this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  trocarSolucao() {
    this.form.versaoId = this.versoesDisponiveis()[0]?.id ?? '';
  }

  enviar() {
    const erros: Record<string, string[]> = {};
    if (!this.form.solucaoId) erros['solucaoId'] = ['Escolha a solução.'];
    if (!this.form.versaoId) erros['versaoId'] = ['Escolha a versão.'];
    if (this.form.titulo.trim().length < 5) erros['titulo'] = ['Resuma o problema em pelo menos 5 caracteres.'];
    if (this.form.descricao.trim().length < 10) erros['descricao'] = ['Conte o que aconteceu (mínimo de 10 caracteres).'];
    if (!this.form.prioridade) erros['prioridade'] = ['Diga o quanto isso atrapalha.'];
    this.erros.set(erros);
    if (Object.keys(erros).length) return;
    this.salvando.set(true);
    this.api.abrirChamado({
      solucaoId: this.form.solucaoId, versaoId: this.form.versaoId, titulo: this.form.titulo.trim(),
      descricao: this.form.descricao.trim(), prioridade: this.form.prioridade as Prioridade,
    }).subscribe({
      next: (c) => {
        this.salvando.set(false);
        this.fecharFormulario();
        this.toast.ok(`Chamado ${c.codigo} aberto. Você está em ${c.posicao}º na fila.`);
        this.atualizar();
      },
      error: (e) => { this.salvando.set(false); this.erros.set(lerErro(e).campos ?? {}); this.toast.erro(lerErro(e).mensagem); },
    });
  }
}
