import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, finalize, forkJoin, of, switchMap } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Atividade, Demanda, Job, Pergunta, Pessoa, ProximaPergunta, Requisito, TipoCenario } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { RASCUNHO, RascunhoService } from '../../shared/rascunho/rascunho';
import {
  CENARIO, ESTADO_ATIVIDADE, ESTADO_DEMANDA, PRIORIDADE, dataCurta, dataHora, paraInputData, paraInputDataHora, relativo,
} from '../../shared/labels';

type Aba = 'resumo' | 'levantamento' | 'prototipo' | 'solicitacao' | 'requisitos' | 'documento';

const ABAS: Aba[] = ['resumo', 'levantamento', 'prototipo', 'solicitacao', 'requisitos', 'documento'];

/** Situação de cada etapa na barra: feito (✓), atual (número azul), espera (cinza), pausado (stand-by), erro (inviável). */
type SituacaoEtapa = 'feito' | 'atual' | 'espera' | 'pausado' | 'erro';

interface Etapa { id: Aba; rotulo: string; numero?: number; situacao: SituacaoEtapa; status: string }

/** O que a pessoa deve fazer agora (faixa no topo do Resumo). */
interface ProximoPasso {
  titulo: string;
  texto: string;
  icone: string;
  tom: 'acao' | 'neutra' | 'ok' | 'erro';
  acao?: { rotulo: string; aba?: Aba; retomar?: boolean };
}

const LEVANTANDO = ['RASCUNHO', 'EM_LEVANTAMENTO'];

@Component({
  selector: 'nx-demanda-detalhe',
  imports: [RouterLink, FormsModule, ...UI, ...RASCUNHO],
  templateUrl: './demanda-detalhe.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemandaDetalhePage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  private rascunhos = inject(RascunhoService);

  id = input.required<string>();
  aba = input<string>();

  readonly abaAtual = computed<Aba>(() => (ABAS.includes(this.aba() as Aba) ? (this.aba() as Aba) : 'resumo'));
  readonly d = signal<Demanda | null>(null);
  readonly erroCarga = signal('');
  readonly pessoas = signal<Pessoa[]>([]);
  readonly atividades = signal<Atividade[]>([]);

  readonly ESTADO_DEMANDA = ESTADO_DEMANDA;
  readonly ESTADO_ATIVIDADE = ESTADO_ATIVIDADE;
  readonly PRIORIDADE = PRIORIDADE;
  readonly CENARIO = CENARIO;
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
  readonly carregandoPergunta = signal(false);
  readonly erroCargaPergunta = signal('');

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

  /** Quem abriu a demanda responde a entrevista e decide como seguir, seja cliente ou alguém da equipe. */
  readonly souSolicitante = computed(() => !!this.d() && this.d()!.solicitanteId === this.sessao.pessoaId());

  readonly podeEditarLevantamento = computed(() => {
    const d = this.d();
    return !!d && this.souSolicitante() && LEVANTANDO.includes(d.estado);
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

  /** Barra única de etapas: substitui a antiga linha do tempo + abas (CLAUDE.md §11). */
  readonly etapas = computed<Etapa[]>(() => {
    const d = this.d();
    if (!d) return [];
    const e = d.estado;
    const equipe = this.sessao.ehEquipe();
    const aprovados = this.aprovados().length;
    const propostos = this.propostos();

    let lev: Pick<Etapa, 'situacao' | 'status'>;
    if (e === 'STAND_BY') lev = { situacao: 'pausado', status: 'Em stand-by' };
    else if (!LEVANTANDO.includes(e)) lev = { situacao: 'feito', status: 'Concluído' };
    else if (!this.souSolicitante()) lev = { situacao: 'atual', status: 'Cliente respondendo' };
    else if (d.cenario) lev = { situacao: 'atual', status: 'Escolha como seguir' };
    else if (d.respostas.length) lev = { situacao: 'atual', status: `${d.respostas.length} respondidas` };
    else lev = { situacao: 'atual', status: 'Comece por aqui' };

    const proto: Pick<Etapa, 'situacao' | 'status'> = d.prototipo
      ? { situacao: 'feito', status: d.prototipo.estado === 'PROPOSTO' ? 'Sugestão pronta' : 'Validado' }
      : { situacao: 'espera', status: 'Após as perguntas' };

    let sol: Pick<Etapa, 'situacao' | 'status'>;
    if (!d.solicitacao) sol = { situacao: 'espera', status: 'Não enviada' };
    else if (e === 'INVIAVEL') sol = { situacao: 'erro', status: 'Inviável' };
    else if (e === 'EM_DESENVOLVIMENTO' || e === 'ENTREGUE') sol = { situacao: 'feito', status: ESTADO_DEMANDA[e].rotulo };
    else if (e === 'SOLICITADO' || e === 'EM_ANALISE') sol = { situacao: 'atual', status: equipe && !d.solicitacao.viabilidade ? 'Avaliar' : 'Em análise' };
    else sol = { situacao: 'atual', status: ESTADO_DEMANDA[e].rotulo };

    let req: Pick<Etapa, 'situacao' | 'status'>;
    if (equipe && propostos) req = { situacao: 'atual', status: `${propostos} para validar` };
    else if (aprovados) req = { situacao: 'feito', status: `${aprovados} aprovados` };
    else req = { situacao: 'espera', status: d.solicitacao?.viabilidade?.possivel ? 'Em elaboração' : 'Após a análise' };

    const doc: Pick<Etapa, 'situacao' | 'status'> = aprovados
      ? { situacao: 'feito', status: 'Disponível' }
      : { situacao: 'espera', status: 'Após os requisitos' };

    return [
      { id: 'resumo', rotulo: 'Resumo', situacao: 'espera', status: 'Visão da demanda' },
      { id: 'levantamento', rotulo: 'Levantamento', numero: 1, ...lev },
      { id: 'prototipo', rotulo: 'Protótipo', numero: 2, ...proto },
      { id: 'solicitacao', rotulo: 'Solicitação', numero: 3, ...sol },
      { id: 'requisitos', rotulo: 'Requisitos', numero: 4, ...req },
      { id: 'documento', rotulo: 'Documento', numero: 5, ...doc },
    ];
  });

  readonly proximoPasso = computed<ProximoPasso | null>(() => {
    const d = this.d();
    if (!d) return null;
    const e = d.estado;
    const meu = this.souSolicitante();
    const equipe = this.sessao.ehEquipe();
    const s = d.solicitacao;

    if (e === 'STAND_BY') {
      return meu
        ? { titulo: 'Esta demanda está em stand-by', texto: 'Retome quando quiser continuar o levantamento ou enviar para a equipe.', icone: 'pause', tom: 'neutra', acao: { rotulo: 'Retomar', retomar: true } }
        : { titulo: 'Em stand-by', texto: 'O cliente guardou a demanda para decidir depois.', icone: 'pause', tom: 'neutra' };
    }
    if (LEVANTANDO.includes(e)) {
      if (!meu) return { titulo: 'O cliente ainda está no levantamento', texto: `${d.respostas.length} perguntas respondidas até agora. A demanda chega para a equipe quando ele enviar a solicitação.`, icone: 'clock', tom: 'neutra' };
      if (d.cenario) return { titulo: 'Falta escolher como seguir', texto: 'Veja o tipo de solução recomendado e o protótipo, e decida entre stand-by ou enviar para a equipe.', icone: 'send', tom: 'acao', acao: { rotulo: 'Decidir', aba: 'levantamento' } };
      return d.respostas.length
        ? { titulo: 'Continue o levantamento', texto: `${d.respostas.length} perguntas respondidas. Suas respostas ficam salvas: continue de onde parou.`, icone: 'spark', tom: 'acao', acao: { rotulo: 'Continuar', aba: 'levantamento' } }
        : { titulo: 'Responda algumas perguntas rápidas', texto: 'São perguntas simples, com opções, para entender o que se encaixa na sua necessidade.', icone: 'spark', tom: 'acao', acao: { rotulo: 'Começar', aba: 'levantamento' } };
    }
    if (e === 'INVIAVEL') {
      return { titulo: 'A equipe marcou como inviável', texto: s?.viabilidade?.justificativa ?? '', icone: 'x-circle', tom: 'erro', acao: { rotulo: 'Ver detalhes', aba: 'solicitacao' } };
    }
    if (equipe && this.propostos()) {
      return { titulo: `${this.propostos()} requisitos aguardando sua validação`, texto: 'Aprove, edite ou rejeite cada sugestão. Nada é aprovado sozinho.', icone: 'check-circle', tom: 'acao', acao: { rotulo: 'Validar', aba: 'requisitos' } };
    }
    if (e === 'SOLICITADO' || e === 'EM_ANALISE') {
      if (equipe && !s?.viabilidade) return { titulo: 'Avalie se é possível fazer', texto: 'Marque a viabilidade com uma justificativa. Depois, agende a reunião com o cliente.', icone: 'send', tom: 'acao', acao: { rotulo: 'Avaliar', aba: 'solicitacao' } };
      if (equipe) return { titulo: 'Agende a reunião com o cliente', texto: 'A reunião serve para validar as regras de negócio antes do planejamento.', icone: 'calendar', tom: 'acao', acao: { rotulo: 'Agendar', aba: 'solicitacao' } };
      return { titulo: 'A equipe está analisando sua solicitação', texto: 'Você recebe uma notificação quando ela responder.', icone: 'clock', tom: 'neutra', acao: { rotulo: 'Acompanhar', aba: 'solicitacao' } };
    }
    if (e === 'REUNIAO_AGENDADA') {
      return equipe
        ? { titulo: 'Defina a metodologia e as datas', texto: s?.reuniao ? `Reunião em ${dataHora(s.reuniao.data)}.` : '', icone: 'calendar', tom: 'acao', acao: { rotulo: 'Planejar', aba: 'solicitacao' } }
        : { titulo: 'Reunião marcada', texto: s?.reuniao ? `${dataHora(s.reuniao.data)}. ${s.reuniao.pauta}` : '', icone: 'calendar', tom: 'neutra', acao: { rotulo: 'Ver detalhes', aba: 'solicitacao' } };
    }
    if (e === 'PLANEJADO') {
      if (equipe) {
        return this.aprovados().length
          ? { titulo: 'Tudo pronto para começar', texto: 'Planejamento definido e requisitos aprovados.', icone: 'play', tom: 'acao', acao: { rotulo: 'Iniciar', aba: 'solicitacao' } }
          : { titulo: 'Escreva e aprove os requisitos', texto: 'O desenvolvimento só começa com requisitos aprovados.', icone: 'check-circle', tom: 'acao', acao: { rotulo: 'Ir para requisitos', aba: 'requisitos' } };
      }
      const pl = s?.planejamento;
      return { titulo: 'Trabalho planejado', texto: pl ? `${pl.metodologia}, de ${dataCurta(pl.inicio)} a ${dataCurta(pl.previsao)}.` : '', icone: 'calendar', tom: 'neutra' };
    }
    if (e === 'EM_DESENVOLVIMENTO') {
      return { titulo: 'Em desenvolvimento', texto: 'O documento de requisitos reúne tudo o que foi aprovado.', icone: 'play', tom: 'ok', acao: this.aprovados().length ? { rotulo: 'Ver documento', aba: 'documento' } : undefined };
    }
    if (e === 'ENTREGUE') {
      return { titulo: 'Entregue', texto: 'A solução foi publicada. Se algo não funcionar, abra um chamado pela solução.', icone: 'check-circle', tom: 'ok', acao: { rotulo: 'Ver documento', aba: 'documento' } };
    }
    return null;
  });

  /** Recarrega a pergunta só quando muda a demanda ou a permissão, não a cada atualização da demanda. */
  private readonly gatilhoPergunta = computed(() => {
    const d = this.d();
    return this.abaAtual() === 'levantamento' && d && this.podeEditarLevantamento() ? d.id : '';
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.sessao.perfil();
      untracked(() => this.carregar(id));
    });
    effect(() => {
      if (this.gatilhoPergunta()) untracked(() => this.carregarPergunta());
    });
  }

  carregar(id: string) {
    this.d.set(null);
    this.erroCarga.set('');
    // Atividades são internas da equipe; o cliente não as consulta.
    const atividades$ = this.sessao.ehEquipe() ? this.api.atividades(id) : of<Atividade[]>([]);
    forkJoin({ d: this.api.demanda(id), p: this.api.pessoas(), a: atividades$ }).subscribe({
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

  seguirProximo(p: ProximoPasso) {
    if (p.acao?.retomar) this.retomar();
    else if (p.acao?.aba) this.irAba(p.acao.aba);
  }

  pessoa(id?: string) { return this.pessoas().find((p) => p.id === id); }

  /** Chave de rascunho por demanda (autosave). */
  rascunho(parte: string) { return `demanda.${this.id()}.${parte}`; }

  // ---------- Entrevista ----------

  carregarPergunta() {
    const d = this.d();
    if (!d || !this.podeEditarLevantamento()) return;
    this.carregandoPergunta.set(true);
    this.erroCargaPergunta.set('');
    this.api.proximaPergunta(d.id).pipe(finalize(() => this.carregandoPergunta.set(false))).subscribe({
      next: (r) => this.aplicarPergunta(r),
      error: (e) => this.erroCargaPergunta.set(lerErro(e).mensagem),
    });
  }

  private aplicarPergunta(r: ProximaPergunta) {
    this.pergunta.set(r.pergunta ?? null);
    this.progresso.set(r.progresso);
    this.entrevistaFim.set(r.concluida);
    this.escolhidas.set([]);
    this.outro = '';
    this.usarOutro.set(false);
    this.erroPergunta.set('');
    // Autosave: a escolha feita antes de sair (sem clicar em Continuar) volta marcada.
    const salvo = this.rascunhos.ler<{ perguntaId: string; valores: string[]; outro: string; usarOutro: boolean }>(this.rascunho('entrevista'));
    if (salvo && r.pergunta && salvo.valor.perguntaId === r.pergunta.id) {
      const validos = salvo.valor.valores.filter((v) => r.pergunta!.opcoes.some((o) => o.valor === v));
      this.escolhidas.set(validos);
      this.outro = salvo.valor.outro;
      this.usarOutro.set(salvo.valor.usarOutro);
    }
  }

  /** Guarda a escolha em andamento da pergunta atual (autosave). */
  guardarEscolha() {
    const p = this.pergunta();
    if (!p) return;
    this.rascunhos.salvar(this.rascunho('entrevista'), { perguntaId: p.id, valores: this.escolhidas(), outro: this.outro, usarOutro: this.usarOutro() });
  }

  alternar(valor: string) {
    const p = this.pergunta();
    if (!p) return;
    if (p.multipla) this.escolhidas.update((l) => (l.includes(valor) ? l.filter((v) => v !== valor) : [...l, valor]));
    else { this.escolhidas.set([valor]); this.usarOutro.set(false); }
    this.guardarEscolha();
  }

  marcarOutro() {
    const p = this.pergunta();
    if (p && !p.multipla) this.escolhidas.set([]);
    this.usarOutro.set(!this.usarOutro() || !p?.multipla);
    this.guardarEscolha();
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
          this.rascunhos.descartar(this.rascunho('entrevista'));
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

  private salvar(req: Observable<Demanda>, msg: string, rascunho?: string) {
    this.salvando.set(true);
    this.erros.set({});
    req.pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: (nd) => {
        if (rascunho) this.rascunhos.descartar(this.rascunho(rascunho));
        this.d.set(nd);
        this.toast.ok(msg);
      },
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
      this.viab.possivel ? 'Demanda marcada como possível. Agora agende a reunião.' : 'Demanda marcada como inviável.', 'viabilidade');
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
      'Reunião agendada. Ela já aparece no calendário.', 'reuniao');
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
      'Planejamento definido. Início e entrega já estão no calendário.', 'planejamento');
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
