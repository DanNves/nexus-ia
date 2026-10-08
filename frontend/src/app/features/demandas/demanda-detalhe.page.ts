import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, forkJoin, switchMap } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Atividade, Demanda, Job, Pergunta, Pessoa, ProximaPergunta, Requisito, TipoCenario } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import {
  CENARIO, ESTADO_ATIVIDADE, ESTADO_DEMANDA, ETAPAS, PRIORIDADE, dataCurta, dataHora, etapaAtual, paraInputData, paraInputDataHora, relativo,
} from '../../shared/labels';

type Aba = 'resumo' | 'levantamento' | 'prototipo' | 'solicitacao' | 'requisitos' | 'documento';

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'resumo', rotulo: 'Resumo' },
  { id: 'levantamento', rotulo: 'Levantamento' },
  { id: 'prototipo', rotulo: 'Protótipo' },
  { id: 'solicitacao', rotulo: 'Solicitação' },
  { id: 'requisitos', rotulo: 'Requisitos' },
  { id: 'documento', rotulo: 'Documento' },
];

@Component({
  selector: 'nx-demanda-detalhe',
  imports: [RouterLink, FormsModule, ...UI],
  templateUrl: './demanda-detalhe.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemandaDetalhePage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  private router = inject(Router);
  private toast = inject(ToastService);

  id = input.required<string>();
  aba = input<string>();

  readonly abaAtual = computed<Aba>(() => (ABAS.some((a) => a.id === this.aba()) ? (this.aba() as Aba) : 'resumo'));
  readonly d = signal<Demanda | null>(null);
  readonly erroCarga = signal('');
  readonly pessoas = signal<Pessoa[]>([]);
  readonly atividades = signal<Atividade[]>([]);

  readonly ABAS = ABAS;
  readonly ETAPAS = ETAPAS;
  readonly ESTADO_DEMANDA = ESTADO_DEMANDA;
  readonly ESTADO_ATIVIDADE = ESTADO_ATIVIDADE;
  readonly PRIORIDADE = PRIORIDADE;
  readonly CENARIO = CENARIO;
  readonly etapaAtual = etapaAtual;
  readonly dataCurta = dataCurta;
  readonly dataHora = dataHora;
  readonly relativo = relativo;

  // Entrevista
  readonly pergunta = signal<Pergunta | null>(null);
  readonly progresso = signal({ respondidas: 0, estimadas: 1 });
  readonly entrevistaFim = signal(false);
  readonly escolhidas = signal<string[]>([]);
  outro = '';
  readonly usarOutro = signal(false);
  readonly respondendo = signal(false);
  readonly erroPergunta = signal('');

  // Jobs
  readonly job = signal<Job | null>(null);

  // Formulários da equipe
  readonly erros = signal<Record<string, string[]>>({});
  readonly salvando = signal(false);
  viab = { possivel: null as boolean | null, justificativa: '' };
  reuniao = { data: '', local: 'Videochamada', pauta: 'Validar as regras de negócio com o cliente.' };
  plano = { metodologia: '', inicio: '', previsao: '' };

  // Requisitos
  readonly editando = signal<string | null>(null);
  readonly rejeitando = signal<string | null>(null);
  edicao = { titulo: '', descricao: '' };
  motivo = '';

  readonly telaAtual = signal(0);

  readonly progressoPct = computed(() => {
    const p = this.progresso();
    return Math.min(100, Math.round((p.respondidas / Math.max(1, p.estimadas)) * 100));
  });

  readonly podeEditarLevantamento = computed(() => {
    const d = this.d();
    return !!d && !this.sessao.ehEquipe() && ['RASCUNHO', 'EM_LEVANTAMENTO'].includes(d.estado);
  });

  readonly requisitosPorTipo = computed(() => {
    const lista = this.d()?.requisitos ?? [];
    const visiveis = this.sessao.ehEquipe() ? lista : lista.filter((r) => r.estado === 'APROVADO');
    return (['RF', 'RNF', 'REGRA'] as const)
      .map((t) => ({ tipo: t, nome: t === 'RF' ? 'Funcionais' : t === 'RNF' ? 'Não funcionais' : 'Regras de negócio', itens: visiveis.filter((r) => r.tipo === t) }))
      .filter((g) => g.itens.length);
  });

  readonly aprovados = computed(() => (this.d()?.requisitos ?? []).filter((r) => r.estado === 'APROVADO'));
  readonly propostos = computed(() => (this.d()?.requisitos ?? []).filter((r) => r.estado === 'PROPOSTO').length);

  constructor() {
    effect(() => {
      const id = this.id();
      this.sessao.perfil();
      untracked(() => this.carregar(id));
    });
    effect(() => {
      if (this.abaAtual() === 'levantamento' && this.d()) untracked(() => this.carregarPergunta());
    });
  }

  carregar(id: string) {
    this.d.set(null);
    this.erroCarga.set('');
    forkJoin({ d: this.api.demanda(id), p: this.api.pessoas(), a: this.api.atividades(id) }).subscribe({
      next: ({ d, p, a }) => { this.d.set(d); this.pessoas.set(p); this.atividades.set(a); this.prepararFormularios(d); },
      error: (e) => this.erroCarga.set(lerErro(e).mensagem),
    });
  }

  private prepararFormularios(d: Demanda) {
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 2); amanha.setHours(10, 0, 0, 0);
    this.reuniao.data = paraInputDataHora(amanha);
    const ini = new Date(); ini.setDate(ini.getDate() + 7);
    const fim = new Date(); fim.setDate(fim.getDate() + 60);
    this.plano = { metodologia: '', inicio: paraInputData(ini), previsao: paraInputData(fim) };
    this.viab = { possivel: null, justificativa: '' };
    if (d.cenario && this.telaAtual() >= (d.prototipo?.telas.length ?? 0)) this.telaAtual.set(0);
  }

  irAba(a: Aba) { void this.router.navigate(['/demandas', this.id(), a === 'resumo' ? [] : a].flat()); }

  pessoa(id?: string) { return this.pessoas().find((p) => p.id === id); }

  // ---------- Entrevista ----------

  carregarPergunta() {
    const d = this.d();
    if (!d || !this.podeEditarLevantamento()) return;
    this.api.proximaPergunta(d.id).subscribe((r) => this.aplicarPergunta(r));
  }

  private aplicarPergunta(r: ProximaPergunta) {
    this.pergunta.set(r.pergunta ?? null);
    this.progresso.set(r.progresso);
    this.entrevistaFim.set(r.concluida);
    this.escolhidas.set([]);
    this.outro = '';
    this.usarOutro.set(false);
    this.erroPergunta.set('');
  }

  alternar(valor: string) {
    const p = this.pergunta();
    if (!p) return;
    if (p.multipla) this.escolhidas.update((l) => (l.includes(valor) ? l.filter((v) => v !== valor) : [...l, valor]));
    else { this.escolhidas.set([valor]); this.usarOutro.set(false); }
  }

  marcarOutro() {
    const p = this.pergunta();
    if (p && !p.multipla) this.escolhidas.set([]);
    this.usarOutro.set(!this.usarOutro() || !p?.multipla);
  }

  responder() {
    const d = this.d();
    const p = this.pergunta();
    if (!d || !p) return;
    const outro = this.usarOutro() ? this.outro.trim() : '';
    if (!this.escolhidas().length && !outro) { this.erroPergunta.set('Escolha uma opção ou escreva em "Outro".'); return; }
    this.respondendo.set(true);
    this.api.responder(d.id, { perguntaId: p.id, valores: this.escolhidas(), outro: outro || undefined })
      .pipe(finalize(() => this.respondendo.set(false)))
      .subscribe({
        next: (r) => {
          this.api.demanda(d.id).subscribe((nd) => this.d.set(nd));
          this.aplicarPergunta(r);
        },
        error: (e) => this.erroPergunta.set(lerErro(e).campos?.['valores']?.[0] ?? lerErro(e).mensagem),
      });
  }

  refazer(perguntaId: string) {
    const d = this.d();
    const r = d?.respostas.find((x) => x.perguntaId === perguntaId);
    if (!d || !r) return;
    this.api.pergunta(d.id, perguntaId).subscribe((p) => {
      this.pergunta.set(p);
      this.entrevistaFim.set(false);
      this.escolhidas.set(r.valores);
      this.outro = r.outro ?? '';
      this.usarOutro.set(!!r.outro);
      this.erroPergunta.set('');
      this.progresso.set({ respondidas: d.respostas.indexOf(r), estimadas: this.progresso().estimadas });
    });
  }

  gerarCenario() {
    const d = this.d();
    if (!d) return;
    this.rodarJob(this.api.gerarCenario(d.id), 'Recomendação pronta. Veja o cenário e o protótipo.');
  }

  escolherCenario(tipo: TipoCenario) {
    const d = this.d();
    if (!d) return;
    this.api.escolherCenario(d.id, tipo).subscribe({
      next: (nd) => { this.d.set(nd); this.telaAtual.set(0); this.toast.ok(`Cenário "${CENARIO[tipo].nome}" escolhido. O protótipo foi refeito.`); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  encerrar(opcao: 'STAND_BY' | 'SOLICITAR') {
    const d = this.d();
    if (!d) return;
    this.salvando.set(true);
    this.api.encerrar(d.id, opcao).pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: (nd) => {
        this.d.set(nd);
        this.toast.ok(opcao === 'SOLICITAR' ? 'Solicitação enviada. A equipe responsável vai avaliar.' : 'Demanda guardada em stand-by.');
        this.irAba(opcao === 'SOLICITAR' ? 'solicitacao' : 'resumo');
      },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  retomar() {
    const d = this.d();
    if (!d) return;
    this.api.retomar(d.id).subscribe({
      next: (nd) => { this.d.set(nd); this.toast.ok('Demanda retomada.'); this.irAba('levantamento'); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  // ---------- Equipe ----------

  private salvar(req: Observable<Demanda>, msg: string) {
    this.salvando.set(true);
    this.erros.set({});
    req.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: (nd) => { this.d.set(nd); this.toast.ok(msg); },
      error: (e) => { const er = lerErro(e); this.erros.set(er.campos ?? {}); this.toast.erro(er.mensagem); },
    });
  }

  decidirViabilidade() {
    const d = this.d();
    if (!d) return;
    const erros: Record<string, string[]> = {};
    if (this.viab.possivel === null) erros['possivel'] = ['Marque se é possível.'];
    if (this.viab.justificativa.trim().length < 10) erros['justificativa'] = ['Explique a decisão em pelo menos 10 caracteres.'];
    if (Object.keys(erros).length) { this.erros.set(erros); return; }
    this.salvar(this.api.viabilidade(d.id, { possivel: this.viab.possivel!, justificativa: this.viab.justificativa.trim() }),
      this.viab.possivel ? 'Demanda marcada como possível. Agora agende a reunião.' : 'Demanda marcada como inviável.');
  }

  agendar() {
    const d = this.d();
    if (!d) return;
    const erros: Record<string, string[]> = {};
    if (!this.reuniao.data) erros['data'] = ['Informe data e horário.'];
    else if (new Date(this.reuniao.data) < new Date()) erros['data'] = ['Escolha uma data futura.'];
    if (this.reuniao.pauta.trim().length < 5) erros['pauta'] = ['Descreva a pauta.'];
    if (Object.keys(erros).length) { this.erros.set(erros); return; }
    this.salvar(this.api.agendarReuniao(d.id, { data: this.reuniao.data, pauta: this.reuniao.pauta.trim(), local: this.reuniao.local.trim() }),
      'Reunião agendada. Ela já aparece no calendário.');
  }

  planejar() {
    const d = this.d();
    if (!d) return;
    const erros: Record<string, string[]> = {};
    if (!this.plano.metodologia) erros['metodologia'] = ['Escolha a metodologia.'];
    if (!this.plano.inicio) erros['inicio'] = ['Informe o início.'];
    if (!this.plano.previsao) erros['previsao'] = ['Informe a previsão.'];
    else if (this.plano.inicio && this.plano.previsao <= this.plano.inicio) erros['previsao'] = ['A entrega deve ser depois do início.'];
    if (Object.keys(erros).length) { this.erros.set(erros); return; }
    this.salvar(this.api.planejar(d.id, { metodologia: this.plano.metodologia, inicio: `${this.plano.inicio}T09:00`, previsao: `${this.plano.previsao}T18:00` }),
      'Planejamento definido. Início e entrega já estão no calendário.');
  }

  iniciar() {
    const d = this.d();
    if (d) this.salvar(this.api.iniciarDesenvolvimento(d.id), 'Desenvolvimento iniciado.');
  }

  gerarRequisitos() {
    const d = this.d();
    if (d) this.rodarJob(this.api.gerarRequisitos(d.id), 'Requisitos sugeridos. Revise cada um antes de aprovar.');
  }

  aprovar(r: Requisito, editado = false) {
    const d = this.d();
    if (!d) return;
    const body = editado
      ? { decisao: 'APROVAR' as const, titulo: this.edicao.titulo.trim(), descricao: this.edicao.descricao.trim() }
      : { decisao: 'APROVAR' as const };
    if (editado && (body.titulo!.length < 3 || body.descricao!.length < 5)) { this.toast.erro('Preencha título e descrição.'); return; }
    this.api.decidirRequisito(d.id, r.id, body).subscribe({
      next: (nd) => { this.d.set(nd); this.editando.set(null); this.toast.ok(`${r.codigo} aprovado${editado ? ' com edição' : ''}.`); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  abrirEdicao(r: Requisito) {
    this.rejeitando.set(null);
    this.edicao = { titulo: r.titulo, descricao: r.descricao };
    this.editando.set(r.id);
  }

  abrirRejeicao(r: Requisito) {
    this.editando.set(null);
    this.motivo = '';
    this.rejeitando.set(r.id);
  }

  rejeitar(r: Requisito) {
    const d = this.d();
    if (!d) return;
    if (this.motivo.trim().length < 5) { this.toast.erro('Informe o motivo da rejeição.'); return; }
    this.api.decidirRequisito(d.id, r.id, { decisao: 'REJEITAR', motivo: this.motivo.trim() }).subscribe({
      next: (nd) => { this.d.set(nd); this.rejeitando.set(null); this.toast.ok(`${r.codigo} rejeitado. O motivo ficou registrado.`); },
      error: (e) => this.toast.erro(lerErro(e).mensagem),
    });
  }

  temAprovado(itens: Requisito[]) { return itens.some((i) => i.estado === 'APROVADO'); }
  nomesTelas(d: Demanda) { return (d.prototipo?.telas ?? []).map((t) => t.nome).join(', '); }

  imprimir() { window.print(); }

  private rodarJob(inicio: Observable<Job>, msg: string) {
    const d = this.d();
    if (!d) return;
    inicio.pipe(switchMap((j) => { this.job.set(j); return this.api.acompanharJob(j.id); })).subscribe({
      next: (j) => {
        this.job.set(j);
        if (j.estado === 'CONCLUIDO') {
          this.api.demanda(d.id).subscribe((nd) => { this.d.set(nd); this.job.set(null); this.entrevistaFim.set(false); this.toast.ok(msg); });
        }
        if (j.estado === 'FALHOU') { this.job.set(null); this.toast.erro(j.erro ?? 'A geração falhou. Tente de novo.'); }
      },
      error: (e) => { this.job.set(null); this.toast.erro(lerErro(e).mensagem); },
    });
  }
}
