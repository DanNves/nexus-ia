import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Chamado, Conhecimento, Job, Pessoa, Solucao } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { ESTADO_CHAMADO, IMPACTO_CURTO, PRIORIDADE, dataHora, duracao, relativo } from '../../shared/labels';

@Component({
  selector: 'nx-chamado-detalhe',
  imports: [RouterLink, FormsModule, ...UI],
  templateUrl: './chamado-detalhe.page.html',
  // Só desta tela: a sugestão rejeitada fica recolhida e riscada até a nova análise chegar.
  styles: [`
    .sugestao-rejeitada { border: 1px solid var(--borda); border-radius: var(--r-1); background: var(--fundo-2); }
    .sugestao-rejeitada summary { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; cursor: pointer; color: var(--tom-vermelho-tx); }
    .sugestao-rejeitada summary nx-icon { flex: none; margin-top: 2px; }
    .sugestao-rejeitada-corpo { display: flex; flex-direction: column; gap: 6px; padding: 0 12px 12px; color: var(--texto-2); }
    .sugestao-rejeitada-corpo del { text-decoration-color: var(--texto-fraco); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChamadoDetalhePage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  private toast = inject(ToastService);

  id = input.required<string>();
  readonly c = signal<Chamado | null>(null);
  readonly erro = signal('');
  readonly solucoes = signal<Solucao[]>([]);
  readonly pessoas = signal<Pessoa[]>([]);
  readonly kb = signal<Conhecimento | null>(null);
  readonly job = signal<Job | null>(null);
  readonly ocupado = signal(false);
  readonly rejeitando = signal(false);
  motivo = '';
  resolucao = { texto: '', registrar: true };
  readonly erroResolucao = signal('');

  readonly ESTADO_CHAMADO = ESTADO_CHAMADO;
  readonly PRIORIDADE = PRIORIDADE;
  readonly IMPACTO_CURTO = IMPACTO_CURTO;
  readonly dataHora = dataHora;
  readonly relativo = relativo;
  readonly duracao = duracao;
  readonly PASSOS = ['Aberto', 'Na fila', 'Em atendimento', 'Resolvido'];

  readonly passo = computed(() => {
    const e = this.c()?.estado;
    return e === 'RESOLVIDO' ? 3 : e === 'EM_ATENDIMENTO' ? 2 : 1;
  });

  readonly solucao = computed(() => this.solucoes().find((s) => s.id === this.c()?.solucaoId));
  readonly versao = computed(() => this.solucao()?.versoes.find((v) => v.id === this.c()?.versaoId));

  constructor() {
    effect(() => {
      const id = this.id();
      this.sessao.perfil();
      untracked(() => this.carregar(id));
    });
  }

  carregar(id: string) {
    this.c.set(null);
    this.erro.set('');
    this.kb.set(null);
    forkJoin({ c: this.api.chamado(id), s: this.api.solucoes(), p: this.api.pessoas() })
      .pipe(switchMap((r) => {
        const k$: Observable<Conhecimento | null> = r.c.conhecimentoId ? this.api.conhecimento(r.c.conhecimentoId) : of(null);
        return k$.pipe(map((k) => ({ ...r, k })));
      }))
      .subscribe({
        next: ({ c, s, p, k }) => {
          this.solucoes.set(s);
          this.pessoas.set(p);
          this.kb.set(k);
          this.c.set(c);
          this.resolucao = { texto: c.sugestao?.estado === 'APROVADO' ? c.sugestao.procedimento.join(' ') : '', registrar: true };
        },
        error: (e) => this.erro.set(lerErro(e).mensagem),
      });
  }

  pessoa(id?: string) { return this.pessoas().find((p) => p.id === id); }

  rejeitada(c: Chamado) { return c.sugestao?.estado === 'REJEITADO' ? c.sugestao : undefined; }
  rejeicoes(c: Chamado) { return Math.max(1, c.sugestoesRejeitadas?.length ?? 0); }

  /** Só na apresentação: a IA às vezes começa a causa com "Possível causa:", que já é o título do bloco. O texto salvo não muda. */
  causa(texto: string) {
    const t = texto.replace(/^\s*poss[ií]vel\s+causa\s*[:\-–—]\s*/i, '');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : texto;
  }

  atender() {
    const c = this.c();
    if (!c) return;
    this.api.atender(c.id).subscribe({
      next: (n) => { this.c.set(n); this.toast.ok(`Você está atendendo ${n.codigo}.`); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  analisar() {
    const c = this.c();
    if (!c) return;
    this.api.gerarSugestao(c.id).pipe(switchMap((j) => { this.job.set(j); return this.api.acompanharJob(j.id); })).subscribe({
      next: (j) => {
        this.job.set(j);
        if (j.estado === 'CONCLUIDO') {
          this.api.chamado(c.id).subscribe({
            next: (n) => { this.c.set(n); this.job.set(null); this.motivo = ''; this.toast.ok('Sugestão pronta. Revise antes de decidir.'); },
            error: (e) => { this.job.set(null); this.toast.erro(lerErro(e).mensagem); },
          });
        }
        if (j.estado === 'FALHOU') { this.job.set(null); this.toast.erro(j.erro || 'A análise falhou. Tente de novo.'); }
      },
      error: (e) => { this.job.set(null); this.toast.erro(lerErro(e).mensagem); },
    });
  }

  aprovar() {
    const c = this.c();
    if (!c) return;
    this.ocupado.set(true);
    this.api.decidirSugestao(c.id, { decisao: 'APROVAR' }).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: (n) => {
        this.c.set(n);
        this.resolucao = { texto: n.sugestao?.procedimento.join(' ') ?? '', registrar: true };
        this.toast.ok('Sugestão aprovada por você. Aplique o procedimento e registre a resolução.');
      },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  rejeitar() {
    const c = this.c();
    if (!c) return;
    if (this.motivo.trim().length < 5) { this.toast.erro('Informe o motivo da rejeição.'); return; }
    this.ocupado.set(true);
    this.api.decidirSugestao(c.id, { decisao: 'REJEITAR', motivo: this.motivo.trim() }).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: (n) => { this.c.set(n); this.rejeitando.set(false); this.resolucao.registrar = false; this.toast.ok('Sugestão rejeitada. O motivo ficou registrado.'); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  resolver() {
    const c = this.c();
    if (!c) return;
    if (this.resolucao.texto.trim().length < 10) { this.erroResolucao.set('Descreva como o problema foi resolvido.'); return; }
    this.erroResolucao.set('');
    this.ocupado.set(true);
    const registrar = this.resolucao.registrar && c.sugestao?.estado === 'APROVADO';
    this.api.resolver(c.id, { solucao: this.resolucao.texto.trim(), registrarConhecimento: registrar })
      .pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({
        next: (n) => {
          this.c.set(n);
          if (n.conhecimentoId) this.api.conhecimento(n.conhecimentoId).subscribe((k) => this.kb.set(k));
          this.toast.ok(registrar ? 'Chamado resolvido e conhecimento registrado.' : 'Chamado resolvido.');
        },
        error: (e) => this.toast.erro(lerErro(e).mensagem),
      });
  }
}
