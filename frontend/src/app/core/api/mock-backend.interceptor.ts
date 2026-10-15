// Backend HÍBRIDO. Intercepta /api/v1/* e responde o domínio (demandas, chamados...) como o Django responderia.
// Passam direto para o Django real (proxy do ng serve): /auth/*, /me, /ia/*, /usuarios* e /jobs/:id de jobs reais.
// Requisitos e sugestão de suporte usam a IA real: o mock monta a entrada, cria o job no Django
// (POST /ia/jobs) e aplica o resultado no "banco" local quando o polling recebe CONCLUIDO.
// Cenário, protótipo e entrevista continuam determinísticos aqui (mock-ia.ts).
// Para usar só o backend real: environment.useMock = false (o interceptor sai da cadeia em app.config.ts).
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, defaultIfEmpty, delay, dematerialize, filter, forkJoin, isObservable, map, materialize, of, throwError } from 'rxjs';
import {
  Atividade, Chamado, Conhecimento, Demanda, EstadoAtividade, Evento, FilaResumo, ItemHistorico, Job, Notificacao, Pendencia, Perfil, Pessoa, Prioridade,
  Requisito, ResultadoBusca, RespostaEntrevista, Solucao, TipoEvento, VisaoGeral,
} from './models';
import { MockDb, NotificacaoMock, VERSAO_SEED, criarSeed } from './mock-seed';
import { gerarPrototipo, gerarRanking, gerarSugestao, nomeCenario, perguntaPorId, proximaPergunta } from './mock-ia';
import { AuthService, Usuario } from '../auth/auth.service';
import { SessionService, pessoaIdDe } from '../session.service';

const CHAVE = 'nexus.mockdb';

// ---------- Persistência local do mock ----------

let db: MockDb = carregar();

function carregar(): MockDb {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const salvo = JSON.parse(bruto) as MockDb;
      if (salvo.versao === VERSAO_SEED) return migrar(salvo);
    }
  } catch { /* sem localStorage: usa seed em memória */ }
  return criarSeed();
}

/** Completa campos que bancos salvos antes de uma mudança não têm (sem trocar VERSAO_SEED e sem perder dados). */
function migrar(salvo: MockDb): MockDb {
  type Antiga = NotificacaoMock & { lida?: boolean };
  const notificacoes = (salvo.notificacoes as Antiga[]).map(({ lida, ...n }) => ({
    ...n,
    // Sem destinatário registrado: só a equipe recebe (nunca vaza para um cliente).
    para: n.para ?? { perfis: ['EQUIPE' as Perfil] },
    lidaPor: n.lidaPor ?? (lida ? ['p2'] : []),
  }));
  return { ...salvo, notificacoes, iaPendentes: salvo.iaPendentes ?? {} };
}

function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch { /* ignora */ }
}

function proximo(prefixo: string) {
  db.sequencias[prefixo] = (db.sequencias[prefixo] ?? 0) + 1;
  return `${prefixo}-${String(db.sequencias[prefixo]).padStart(3, '0')}`;
}

const agora = () => new Date().toISOString();
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- Respostas ----------

class ApiErro {
  constructor(public status: number, public mensagem: string, public campos?: Record<string, string[]>) {}
}

function exigir(cond: unknown, campo: string, msg: string, erros: Record<string, string[]>) {
  if (!cond) (erros[campo] ??= []).push(msg);
}

function validar(erros: Record<string, string[]>) {
  if (Object.keys(erros).length) throw new ApiErro(400, 'Revise os campos destacados.', erros);
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

// ---------- Jobs (operações longas) ----------

interface JobInterno { job: Job; donoId: string; inicio: number; duracao: number; etapas: string[]; aoConcluir: () => void; concluido: boolean }
const jobs = new Map<string, JobInterno>();

function criarJob(ctx: Ctx, etapas: string[], duracao: number, aoConcluir: () => void): Job {
  const job: Job = { id: uid('job'), estado: 'PENDENTE', percentual: 0, etapa: etapas[0] };
  jobs.set(job.id, { job, donoId: ctx.userId, inicio: Date.now(), duracao, etapas, aoConcluir, concluido: false });
  return job;
}

function consultarJob(ctx: Ctx, id: string): Job {
  const j = jobs.get(id);
  // Job de outro usuário responde igual a inexistente (sem revelar que existe).
  if (!j || !podeVer(ctx, 'job', j)) throw new ApiErro(404, 'Tarefa não encontrada.');
  const frac = Math.min(1, (Date.now() - j.inicio) / j.duracao);
  if (frac >= 1 && !j.concluido) {
    j.concluido = true;
    j.aoConcluir();
    salvar();
  }
  const percentual = Math.round(frac * 100);
  j.job = {
    ...j.job,
    estado: frac >= 1 ? 'CONCLUIDO' : frac > 0.05 ? 'EM_EXECUCAO' : 'PENDENTE',
    percentual,
    etapa: j.etapas[Math.min(j.etapas.length - 1, Math.floor(frac * j.etapas.length))],
  };
  return j.job;
}

// ---------- IA real (Django) ----------

type TarefaIa = MockDb['iaPendentes'][string]['tarefa'];
const LIMITE_NECESSIDADE = 20_000;
/** Pendência cujo job não responde mais (Django fora, job apagado) expira depois disso. */
const VALIDADE_PENDENCIA_MS = 15 * 60_000;

const cortar = (t: string, max: number) => (t.length > max ? t.slice(0, max) : t);

/** Rejeições do chamado; inclui a sugestão atual rejeitada de bancos anteriores ao histórico. */
function rejeitadasDoChamado(c: Chamado): { causa: string; motivo: string }[] {
  const lista = [...(c.sugestoesRejeitadas ?? [])];
  const atual = c.sugestao;
  if (atual?.estado === 'REJEITADO' && !lista.some((r) => r.causa === atual.causa)) {
    lista.push({ causa: atual.causa, motivo: atual.motivo || 'Rejeitada sem motivo registrado.', decididoPor: atual.decididoPor ?? '', decididoEm: atual.decididoEm ?? '' });
  }
  return lista.filter((r) => ehTexto(r.causa) && ehTexto(r.motivo));
}

function temPendencia(alvoId: string) {
  return Object.values(db.iaPendentes).some((p) => p.alvoId === alvoId);
}

function expirarSeAntiga(jobId: string) {
  const p = db.iaPendentes[jobId];
  if (!p) return;
  const criado = p.criadoEm ? Date.parse(p.criadoEm) : 0;
  if (Date.now() - criado > VALIDADE_PENDENCIA_MS) {
    delete db.iaPendentes[jobId];
    salvar();
  }
}

/** Consulta UMA vez no Django os jobs pendentes do alvo: aplica os concluídos, descarta falhos/inexistentes, expira os antigos. */
function reconsultarPendencias(ctx: Ctx, alvoId: string): Observable<void> {
  const ids = Object.entries(db.iaPendentes).filter(([, p]) => p.alvoId === alvoId).map(([id]) => id);
  return forkJoin(ids.map((id) =>
    ctx.next(new HttpRequest('GET', `${PREFIXO}/jobs/${id}`, { headers: ctx.req.headers, withCredentials: ctx.req.withCredentials })).pipe(
      filter((ev): ev is HttpResponse<Job> => ev instanceof HttpResponse),
      map((res) => { if (res.body) aplicarResultadoIa(res.body, ctx); }),
      catchError((e: unknown) => {
        // 404/403: o job não existe (ou não é deste usuário) no Django; não há o que esperar.
        if (e instanceof HttpErrorResponse && (e.status === 404 || e.status === 403)) { delete db.iaPendentes[id]; salvar(); }
        return of(undefined);
      }),
      defaultIfEmpty(undefined),
      map(() => expirarSeAntiga(id)),
    ))).pipe(map(() => undefined), defaultIfEmpty(undefined));
}

/** Corta a lista de textos para que a soma não passe do limite (contrato: 20 mil caracteres no total). */
function truncarTextos(textos: string[], limite: number): string[] {
  const saida: string[] = [];
  let resta = limite;
  for (const t of textos.map((x) => x.trim()).filter(Boolean)) {
    if (resta <= 0) break;
    saida.push(t.length > resta ? t.slice(0, resta) : t);
    resta -= t.length;
  }
  return saida;
}

/** POST /api/v1/ia/jobs no Django com os headers da requisição original; devolve o Job real (202). */
function criarJobIa(ctx: Ctx, tarefa: TarefaIa, alvoTipo: 'demanda' | 'chamado', alvoId: string, entrada: unknown): Observable<Resposta> {
  const req = new HttpRequest('POST', `${PREFIXO}/ia/jobs`, { tarefa, alvoTipo, alvoId, entrada }, {
    headers: ctx.req.headers,
    withCredentials: ctx.req.withCredentials,
  });
  return ctx.next(req).pipe(
    filter((ev): ev is HttpResponse<Job> => ev instanceof HttpResponse),
    map((res) => {
      const job = res.body;
      if (!job?.id) throw new ApiErro(502, 'O servidor de IA respondeu de forma inesperada.');
      db.iaPendentes[job.id] = { tarefa, alvoId, criadoEm: agora() };
      salvar();
      return { status: res.status, body: job };
    }),
  );
}

interface ResultadoRequisitos { requisitos?: { tipo?: unknown; titulo?: unknown; descricao?: unknown }[] }
interface ResultadoSugestao {
  categoria?: unknown; causa?: unknown; procedimento?: unknown; confianca?: unknown;
  conhecimentoUsado?: unknown; semHistorico?: unknown;
}

const TIPOS_REQUISITO: readonly string[] = ['RF', 'RNF', 'REGRA'];
const ehTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Chamado no polling de um job real. Aplica (uma vez) o resultado no banco local antes de devolver a resposta. */
function aplicarResultadoIa(job: Job, ctx: Ctx) {
  const pendente = db.iaPendentes[job.id];
  if (!pendente || (job.estado !== 'CONCLUIDO' && job.estado !== 'FALHOU')) return;
  delete db.iaPendentes[job.id];
  if (job.estado === 'CONCLUIDO') {
    const modelo = job.modelo || 'modelo não informado';
    if (pendente.tarefa === 'requisitos') aplicarRequisitos(pendente.alvoId, job.resultado as ResultadoRequisitos | undefined, modelo, ctx);
    else aplicarSugestao(pendente.alvoId, job.resultado as ResultadoSugestao | undefined, modelo);
  }
  salvar();
}

function aplicarRequisitos(demandaId: string, r: ResultadoRequisitos | undefined, modelo: string, ctx: Ctx) {
  const d = db.demandas.find((x) => x.id === demandaId);
  if (!d) return;
  const itens = Array.isArray(r?.requisitos) ? r.requisitos : [];
  const novos: Requisito[] = itens
    .filter((x) => typeof x.tipo === 'string' && TIPOS_REQUISITO.includes(x.tipo) && ehTexto(x.titulo))
    .map((x) => ({
      id: uid('r'),
      codigo: proximo('REQ'),
      tipo: x.tipo as Requisito['tipo'],
      titulo: String(x.titulo).trim(),
      descricao: ehTexto(x.descricao) ? x.descricao.trim() : '',
      estado: 'PROPOSTO' as const,
      modelo,
    }));
  // Aprovados e rejeitados (com motivo) ficam; só as sugestões ainda não decididas são substituídas.
  d.requisitos = [...d.requisitos.filter((x) => x.estado !== 'PROPOSTO'), ...novos];
  registrar(d, ctx, `A IA (${modelo}) sugeriu ${novos.length} requisitos para validação.`);
}

function aplicarSugestao(chamadoId: string, r: ResultadoSugestao | undefined, modelo: string) {
  const c = db.chamados.find((x) => x.id === chamadoId);
  if (!c) return;
  const base = gerarSugestao(c, db.solucoes.find((s) => s.id === c.solucaoId), db.demandas, db.conhecimentos, db.chamados);
  const procedimento = Array.isArray(r?.procedimento) ? r.procedimento.filter(ehTexto).map((p) => p.trim()) : [];
  const codigoKb = r?.conhecimentoUsado;
  const kb = ehTexto(codigoKb) ? db.conhecimentos.find((k) => k.codigo === codigoKb) : undefined;
  if (kb && !base.fontes.some((f) => f.codigo === kb.codigo)) base.fontes.unshift({ tipo: 'Conhecimento', codigo: kb.codigo, titulo: kb.titulo });
  c.sugestao = {
    ...base,
    categoria: ehTexto(r?.categoria) ? r.categoria.trim() : base.categoria,
    causa: ehTexto(r?.causa) ? r.causa.trim() : base.causa,
    procedimento: procedimento.length ? procedimento : base.procedimento,
    confianca: typeof r?.confianca === 'number' ? Math.min(1, Math.max(0, r.confianca)) : base.confianca,
    semHistorico: typeof r?.semHistorico === 'boolean' ? r.semHistorico : base.semHistorico,
    estado: 'PROPOSTO',
    modelo,
  };
  c.historico.push({ data: agora(), autor: `IA (${modelo})`, texto: `Sugestão da IA (${modelo}): possível causa e procedimento, aguardando validação.` });
}

// ---------- Regras de acesso ----------

interface Ctx {
  perfil: Perfil;
  userId: string;
  nome: string;
  /** Requisição original (já com o Bearer) e o próximo handler: para repassar ao Django. */
  req: HttpRequest<unknown>;
  next: HttpHandlerFn;
}

/** Mantém a pessoa do usuário logado em db.pessoas com nome/organização/perfil reais. */
function sincronizarPessoa(u: Usuario): string {
  const id = pessoaIdDe(u);
  const atual = db.pessoas.find((p) => p.id === id);
  const organizacao = u.organizacao || (u.perfil === 'EQUIPE' ? 'Equipe NEXUS' : '');
  if (!atual) {
    db.pessoas.push({ id, nome: u.nome, cargo: u.perfil === 'EQUIPE' ? 'Equipe responsável' : 'Cliente', organizacao, perfil: u.perfil });
    salvar();
  } else if (atual.nome !== u.nome || atual.organizacao !== organizacao || atual.perfil !== u.perfil) {
    Object.assign(atual, { nome: u.nome, organizacao, perfil: u.perfil });
    salvar();
  }
  return id;
}

// ---------- Visibilidade: REGRA ÚNICA (o Django deve repetir; contrato em claude/front/contratos.md) ----------
// EQUIPE (responsáveis pela aprovação) vê tudo. CLIENTE vê só o que é dele.
// Notificações e jobs são pessoais para todos os perfis. Registro fora do alcance → 404 (não 403), sem revelar que existe.

interface Alvos {
  demanda: Demanda;
  chamado: Chamado;
  solucao: Solucao;
  evento: Evento;
  conhecimento: Conhecimento;
  atividade: Atividade;
  pessoa: Pessoa;
  notificacao: NotificacaoMock;
  job: JobInterno;
}
type TipoAlvo = keyof Alvos;

const ehEquipe = (ctx: Ctx) => ctx.perfil === 'EQUIPE';
const ehDono = (ctx: Ctx, id: string | undefined) => !!id && id === ctx.userId;

/** Pessoas da equipe que aparecem nos registros do cliente (responsáveis e participantes). */
function equipeEnvolvida(ctx: Ctx): Set<string> {
  const ids = new Set<string>();
  db.demandas.filter((d) => ehDono(ctx, d.solicitanteId)).forEach((d) => d.responsavelId && ids.add(d.responsavelId));
  db.chamados.filter((c) => ehDono(ctx, c.solicitanteId)).forEach((c) => c.responsavelId && ids.add(c.responsavelId));
  db.eventos.filter((e) => REGRAS.evento(ctx, e)).forEach((e) => e.participantes.forEach((p) => ids.add(p)));
  return ids;
}

const REGRAS: { [K in TipoAlvo]: (ctx: Ctx, r: Alvos[K]) => boolean } = {
  demanda: (ctx, d) => ehEquipe(ctx) || ehDono(ctx, d.solicitanteId),
  chamado: (ctx, c) => ehEquipe(ctx) || ehDono(ctx, c.solicitanteId),
  solucao: (ctx, s) => ehEquipe(ctx) || ehDono(ctx, s.clienteId),
  // Cliente: eventos em que é participante + as ENTREGAS das demandas dele. Reuniões/análises internas,
  // sprints da equipe e prazos de atividades não aparecem.
  evento: (ctx, e) => ehEquipe(ctx) || e.participantes.includes(ctx.userId)
    || (e.tipo === 'ENTREGA' && !!e.demandaId && db.demandas.some((d) => d.id === e.demandaId && ehDono(ctx, d.solicitanteId))),
  // Conhecimento: do chamado de origem dele ou da solução dele.
  conhecimento: (ctx, k) => ehEquipe(ctx)
    || db.chamados.some((c) => c.id === k.chamadoOrigemId && ehDono(ctx, c.solicitanteId))
    || db.solucoes.some((s) => s.id === k.solucaoId && ehDono(ctx, s.clienteId)),
  // Atividades são o quadro interno da equipe.
  atividade: (ctx) => ehEquipe(ctx),
  pessoa: (ctx, p) => ehEquipe(ctx) || p.id === ctx.userId || (p.perfil === 'EQUIPE' && equipeEnvolvida(ctx).has(p.id)),
  notificacao: (ctx, n) => !!n.para.perfis?.includes(ctx.perfil) || !!n.para.usuarios?.includes(ctx.userId),
  job: (ctx, j) => ehDono(ctx, j.donoId),
};

function podeVer<K extends TipoAlvo>(ctx: Ctx, tipo: K, registro: Alvos[K]): boolean {
  return REGRAS[tipo](ctx, registro);
}

function visiveis<K extends TipoAlvo>(ctx: Ctx, tipo: K, lista: Alvos[K][]): Alvos[K][] {
  return lista.filter((r) => podeVer(ctx, tipo, r));
}

const NAO_ENCONTRADO: Record<'demanda' | 'chamado' | 'solucao' | 'conhecimento' | 'atividade' | 'evento', string> = {
  demanda: 'Demanda não encontrada.', chamado: 'Chamado não encontrado.', solucao: 'Solução não encontrada.',
  conhecimento: 'Conhecimento não encontrado.', atividade: 'Atividade não encontrada.', evento: 'Evento não encontrado.',
};

/** Busca por id respeitando a regra: inexistente ou de outro cliente → 404 (IDOR). */
function obter<K extends keyof typeof NAO_ENCONTRADO>(ctx: Ctx, tipo: K, lista: (Alvos[K] & { id: string })[], id: string): Alvos[K] {
  const r = lista.find((x) => x.id === id);
  if (!r || !podeVer(ctx, tipo, r)) throw new ApiErro(404, NAO_ENCONTRADO[tipo]);
  return r;
}

function demandasVisiveis(ctx: Ctx) {
  return visiveis(ctx, 'demanda', db.demandas);
}

function demanda(ctx: Ctx, id: string): Demanda {
  return obter(ctx, 'demanda', db.demandas, id);
}

// ---------- Serialização para o CLIENTE (CLAUDE.md §3: conteúdo da IA sem validação não vai para o cliente) ----------
// Aplicada num ponto só (saída do responder) a toda demanda/chamado de qualquer rota: detalhe, listas, visão geral, fila.

/** Histórico que revela a validação interna (sugestões da IA, rejeições) não vai para o cliente. */
function historicoPublico(h: ItemHistorico[]): ItemHistorico[] {
  return h.filter((i) => !/^IA\b/.test(i.autor) && !/\bIA\b|^Rejeitou\b/.test(i.texto));
}

function demandaParaCliente(d: Demanda): Demanda {
  return {
    ...d,
    // Só requisitos aprovados, sem campos internos da validação.
    requisitos: d.requisitos.filter((r) => r.estado === 'APROVADO')
      .map(({ id, codigo, tipo, titulo, descricao, estado, decididoPor, decididoEm }) => ({ id, codigo, tipo, titulo, descricao, estado, decididoPor, decididoEm })),
    historico: historicoPublico(d.historico),
  };
}

function chamadoParaCliente(c: Chamado): Chamado {
  const { sugestao: _sugestao, sugestoesRejeitadas: _rejeitadas, ...publico } = c;
  return { ...publico, historico: historicoPublico(c.historico) };
}

const pareceDemanda = (v: Record<string, unknown>) => 'requisitos' in v && 'respostas' in v && 'solicitanteId' in v;
const pareceChamado = (v: Record<string, unknown>) => 'versaoId' in v && 'solicitanteId' in v && 'historico' in v;

/** Percorre a resposta (já clonada) e troca cada demanda/chamado pela versão do cliente. */
function paraCliente(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(paraCliente);
  if (!valor || typeof valor !== 'object') return valor;
  const v = valor as Record<string, unknown>;
  if (pareceDemanda(v)) return demandaParaCliente(v as unknown as Demanda);
  if (pareceChamado(v)) return chamadoParaCliente(v as unknown as Chamado);
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, paraCliente(x)]));
}

/** Pessoa como o usuário pode vê-la: o cliente não recebe a organização de outras pessoas. */
function pessoaPara(ctx: Ctx, p: Pessoa): Pessoa {
  return ehEquipe(ctx) || p.id === ctx.userId ? p : { ...p, organizacao: p.perfil === 'EQUIPE' ? p.organizacao : '' };
}

function exigirEquipe(ctx: Ctx) {
  if (ctx.perfil !== 'EQUIPE') throw new ApiErro(403, 'Somente a equipe responsável pode fazer isso.');
}

function registrar(d: Demanda, ctx: Ctx, txt: string) {
  d.historico.push({ data: agora(), autor: ctx.nome, texto: txt });
  d.atualizadaEm = agora();
}

/** Notifica só os destinatários: a equipe (perfil) e/ou usuários específicos (ex.: o cliente dono da demanda). */
function notificar(txt: string, link: string, para: NotificacaoMock['para']) {
  db.notificacoes.unshift({ id: uid('n'), texto: txt, quando: agora(), link, para, lidaPor: [] });
}

function notificacoesDe(ctx: Ctx): Notificacao[] {
  return visiveis(ctx, 'notificacao', db.notificacoes).slice(0, 8)
    .map(({ para: _para, lidaPor, ...n }) => ({ ...n, lida: lidaPor.includes(ctx.userId) }));
}

const PARA_EQUIPE: NotificacaoMock['para'] = { perfis: ['EQUIPE'] };

const ORDEM_PRIORIDADE: Record<Prioridade, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
const TEMPO_MEDIO_MIN = 25;
const ATENDENTES = 2;

function filaOrdenada() {
  return db.chamados
    .filter((c) => c.estado === 'NA_FILA')
    .sort((a, b) => ORDEM_PRIORIDADE[a.prioridade] - ORDEM_PRIORIDADE[b.prioridade] || a.abertoEm.localeCompare(b.abertoEm));
}

function comPosicao(c: Chamado): Chamado {
  if (c.estado !== 'NA_FILA') return { ...c, posicao: undefined, esperaEstimadaMin: undefined };
  const pos = filaOrdenada().findIndex((x) => x.id === c.id) + 1;
  return { ...c, posicao: pos, esperaEstimadaMin: Math.max(5, Math.round((pos * TEMPO_MEDIO_MIN) / ATENDENTES)) };
}

function chamadosVisiveis(ctx: Ctx) {
  return visiveis(ctx, 'chamado', db.chamados);
}

function chamado(ctx: Ctx, id: string): Chamado {
  return obter(ctx, 'chamado', db.chamados, id);
}

// ---------- Rotas ----------

interface Resposta { status?: number; body: unknown }
// Handlers síncronos respondem do "banco" local; os que falam com o Django devolvem Observable.
type Handler = (ctx: Ctx, p: string[], body: Record<string, unknown>, q: URLSearchParams) => Resposta | Observable<Resposta>;
const rotas: [string, RegExp, Handler][] = [];
const rota = (m: string, padrao: string, h: Handler) => rotas.push([m, new RegExp(`^${padrao.replace(/:[a-z]+/g, '([^/]+)')}$`), h]);

// GET /me vai para o Django. GET /jobs/:id só chega aqui para jobs simulados (ver interceptor).
rota('GET', '/jobs/:id', (ctx, [id]) => ({ body: consultarJob(ctx, id) }));
rota('GET', '/pessoas', (ctx) => ({ body: visiveis(ctx, 'pessoa', db.pessoas).map((p) => pessoaPara(ctx, p)) }));

rota('POST', '/demo/restaurar', (ctx) => {
  exigirEquipe(ctx);
  db = criarSeed();
  jobs.clear();
  salvar();
  return { body: { ok: true } };
});

// Visão geral
rota('GET', '/visao-geral', (ctx) => {
  const demandas = demandasVisiveis(ctx);
  const chamados = chamadosVisiveis(ctx).map(comPosicao);
  const pendencias: Pendencia[] = [];
  // Quem abriu a demanda responde a entrevista, seja cliente ou equipe.
  const minhas = demandas.filter((d) => ehDono(ctx, d.solicitanteId));
  minhas.filter((d) => d.estado === 'EM_LEVANTAMENTO' || d.estado === 'RASCUNHO').forEach((d) =>
    pendencias.push({ id: d.id, tipo: 'demanda', texto: `Continue a entrevista de "${d.nome}"`, detalhe: `${d.respostas.length} perguntas respondidas`, acao: 'Continuar', link: `/demandas/${d.id}/levantamento` }));
  minhas.filter((d) => d.estado === 'STAND_BY').forEach((d) =>
    pendencias.push({ id: d.id, tipo: 'demanda', texto: `"${d.nome}" está em stand-by`, detalhe: 'Retome quando quiser enviar para a equipe', acao: 'Abrir', link: `/demandas/${d.id}` }));
  if (ctx.perfil === 'EQUIPE') {
    demandas.filter((d) => d.estado === 'SOLICITADO').forEach((d) =>
      pendencias.push({ id: d.id, tipo: 'demanda', texto: `Nova solicitação: ${d.nome}`, detalhe: 'Avaliar se é possível', acao: 'Avaliar', link: `/demandas/${d.id}/solicitacao` }));
    demandas.forEach((d) => {
      const n = d.requisitos.filter((r) => r.estado === 'PROPOSTO').length;
      if (n) pendencias.push({ id: `${d.id}-r`, tipo: 'requisito', texto: `${n} requisitos aguardando validação`, detalhe: d.nome, acao: 'Validar', link: `/demandas/${d.id}/requisitos` });
    });
    const sug = chamadosVisiveis(ctx).filter((c) => c.sugestao?.estado === 'PROPOSTO');
    sug.forEach((c) => pendencias.push({ id: c.id, tipo: 'chamado', texto: `Sugestão de suporte aguardando validação`, detalhe: `${c.codigo} ${c.titulo}`, acao: 'Validar', link: `/fila/${c.id}` }));
  }
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const proximosEventos = visiveis(ctx, 'evento', db.eventos)
    .filter((e) => new Date(e.inicio) >= hoje)
    .sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 4);
  const corpo: VisaoGeral = {
    pendencias,
    demandas: [...demandas].filter((d) => d.estado !== 'ENTREGUE').sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)).slice(0, 5),
    proximosEventos,
    chamados: chamados.filter((c) => c.estado !== 'RESOLVIDO').slice(0, 4),
    numeros: {
      demandasAtivas: demandas.filter((d) => !['ENTREGUE', 'INVIAVEL'].includes(d.estado)).length,
      // Números sempre sobre o que o usuário vê (cliente: só os chamados dele).
      naFila: chamados.filter((c) => c.estado === 'NA_FILA').length,
      validacoesPendentes: pendencias.filter((p) => p.tipo !== 'demanda').length,
      entregues: demandas.filter((d) => d.estado === 'ENTREGUE').length,
    },
  };
  return { body: corpo };
});

// Demandas
rota('GET', '/demandas', (ctx, _p, _b, q) => {
  const busca = (q.get('q') ?? '').toLowerCase();
  const estado = q.get('estado');
  return {
    body: demandasVisiveis(ctx)
      .filter((d) => !busca || `${d.codigo} ${d.nome} ${d.descricao}`.toLowerCase().includes(busca))
      .filter((d) => !estado || d.estado === estado)
      .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)),
  };
});

rota('GET', '/demandas/:id', (ctx, [id]) => {
  demanda(ctx, id);
  // Pendência de IA de outra visita (polling interrompido): reconsulta o job uma vez antes de responder.
  return temPendencia(id) ? reconsultarPendencias(ctx, id).pipe(map(() => ({ body: demanda(ctx, id) }))) : { body: demanda(ctx, id) };
});

rota('POST', '/demandas', (ctx, _p, b) => {
  const nome = texto(b['nome']);
  const descricao = texto(b['descricao']);
  const necessidade = texto(b['necessidade']);
  const prioridade = b['prioridade'] as Prioridade;
  const erros: Record<string, string[]> = {};
  exigir(nome.length >= 3, 'nome', 'Informe um nome com pelo menos 3 letras.', erros);
  exigir(nome.length <= 80, 'nome', 'Use no máximo 80 caracteres.', erros);
  exigir(descricao.length >= 10, 'descricao', 'Descreva em pelo menos 10 caracteres.', erros);
  exigir(['ALTA', 'MEDIA', 'BAIXA'].includes(prioridade), 'prioridade', 'Escolha uma prioridade.', erros);
  const paiId = texto(b['processoPaiId']);
  exigir(!paiId || db.demandas.some((x) => x.id === paiId && podeVer(ctx, 'demanda', x)), 'processoPaiId', 'Demanda de origem não encontrada.', erros);
  validar(erros);
  const d: Demanda = {
    id: uid('d'), codigo: proximo('DEM'), nome, descricao, estado: 'EM_LEVANTAMENTO', prioridade,
    solicitanteId: ctx.userId, criadaEm: agora(), atualizadaEm: agora(),
    processoPaiId: paiId || undefined,
    fontes: necessidade ? [{ id: uid('f'), tipo: 'TEXTO', titulo: 'Descrição da necessidade', conteudo: necessidade, criadaEm: agora() }] : [],
    respostas: [], entrevistaConcluida: false, requisitos: [], historico: [],
  };
  registrar(d, ctx, 'Criou a demanda.');
  db.demandas.push(d);
  salvar();
  return { status: 201, body: d };
});

rota('POST', '/demandas/:id/fontes', (ctx, [id], b) => {
  const d = demanda(ctx, id);
  const conteudo = texto(b['conteudo']);
  const titulo = texto(b['titulo']) || 'Ata da reunião';
  const erros: Record<string, string[]> = {};
  exigir(conteudo.length >= 10, 'conteudo', 'O arquivo está vazio ou muito curto.', erros);
  exigir(conteudo.length <= 200_000, 'conteudo', 'O arquivo é grande demais (máximo de 200 mil caracteres).', erros);
  validar(erros);
  d.fontes.push({ id: uid('f'), tipo: 'ATA', titulo, conteudo, criadaEm: agora() });
  registrar(d, ctx, `Anexou "${titulo}".`);
  salvar();
  return { status: 201, body: d };
});

rota('GET', '/demandas/:id/entrevista/proxima', (ctx, [id]) => {
  const d = demanda(ctx, id);
  const { pergunta, estimadas } = proximaPergunta(d.respostas);
  return { body: { concluida: !pergunta, pergunta, progresso: { respondidas: d.respostas.length, estimadas } } };
});

rota('GET', '/demandas/:id/entrevista/perguntas/:pid', (ctx, [id, pid]) => {
  demanda(ctx, id);
  const p = perguntaPorId(pid);
  if (!p) throw new ApiErro(404, 'Pergunta não encontrada.');
  const { enunciado, ajuda, multipla, opcoes } = p;
  return { body: { id: p.id, enunciado, ajuda, multipla, opcoes } };
});

rota('POST', '/demandas/:id/entrevista/respostas', (ctx, [id], b) => {
  const d = demanda(ctx, id);
  const perguntaId = texto(b['perguntaId']);
  const p = perguntaPorId(perguntaId);
  const valores = Array.isArray(b['valores']) ? (b['valores'] as string[]) : [];
  const outro = texto(b['outro']);
  const erros: Record<string, string[]> = {};
  exigir(p, 'perguntaId', 'Pergunta inválida.', erros);
  exigir(valores.length > 0 || outro, 'valores', 'Escolha uma opção ou escreva em "Outro".', erros);
  exigir(!p || valores.every((v) => p.opcoes.some((o) => o.valor === v)), 'valores', 'Opção inválida.', erros);
  exigir(p?.multipla || valores.length <= 1, 'valores', 'Esta pergunta aceita só uma opção.', erros);
  validar(erros);
  const resp: RespostaEntrevista = {
    perguntaId, enunciado: p!.enunciado, valores,
    rotulos: valores.map((v) => p!.opcoes.find((o) => o.valor === v)!.rotulo), outro: outro || undefined,
  };
  // Alterar uma resposta descarta as seguintes, porque as próximas perguntas dependem dela.
  const idx = d.respostas.findIndex((r) => r.perguntaId === perguntaId);
  if (idx >= 0) d.respostas = d.respostas.slice(0, idx);
  d.respostas.push(resp);
  d.entrevistaConcluida = false;
  // Respostas mudaram: a recomendação anterior deixa de valer.
  d.cenario = undefined;
  d.prototipo = undefined;
  d.atualizadaEm = agora();
  salvar();
  const { pergunta, estimadas } = proximaPergunta(d.respostas);
  return { body: { concluida: !pergunta, pergunta, progresso: { respondidas: d.respostas.length, estimadas } } };
});

rota('POST', '/demandas/:id/cenario/gerar', (ctx, [id]) => {
  const d = demanda(ctx, id);
  if (!d.respostas.length) throw new ApiErro(400, 'Responda pelo menos uma pergunta antes de gerar o cenário.');
  const job = criarJob(ctx, ['Lendo suas respostas', 'Extraindo sinais', 'Comparando cenários', 'Montando o protótipo'], 3200, () => {
    const ranking = gerarRanking(d.respostas);
    d.entrevistaConcluida = true;
    d.cenario = { estado: 'PROPOSTO', recomendado: ranking[0].tipo, ranking, geradoEm: agora() };
    d.prototipo = { estado: 'PROPOSTO', telas: gerarPrototipo(d.nome, ranking[0].tipo), geradoEm: agora() };
    d.estado = 'EM_LEVANTAMENTO';
    registrar(d, ctx, `O simulador de demonstração recomendou o cenário "${nomeCenario(ranking[0].tipo)}" e montou um protótipo.`);
  });
  return { status: 202, body: job };
});

rota('POST', '/demandas/:id/cenario/escolher', (ctx, [id], b) => {
  const d = demanda(ctx, id);
  const tipo = texto(b['tipo']);
  const escolhido = d.cenario?.ranking.find((c) => c.tipo === tipo);
  if (!d.cenario || !escolhido) throw new ApiErro(400, 'Cenário inválido.');
  d.cenario.recomendado = escolhido.tipo;
  d.prototipo = { estado: 'PROPOSTO', telas: gerarPrototipo(d.nome, escolhido.tipo), geradoEm: agora() };
  registrar(d, ctx, `Escolheu o cenário "${escolhido.nome}".`);
  salvar();
  return { body: d };
});

rota('POST', '/demandas/:id/encerrar', (ctx, [id], b) => {
  const d = demanda(ctx, id);
  const opcao = texto(b['opcao']);
  if (!d.cenario) throw new ApiErro(400, 'Conclua a entrevista antes de encerrar o levantamento.');
  if (opcao === 'STAND_BY') {
    d.estado = 'STAND_BY';
    registrar(d, ctx, 'Colocou a demanda em stand-by.');
  } else if (opcao === 'SOLICITAR') {
    d.estado = 'SOLICITADO';
    d.solicitacao = { abertaEm: agora() };
    registrar(d, ctx, 'Abriu solicitação para a equipe.');
    notificar(`Nova solicitação: ${d.nome}`, `/demandas/${d.id}/solicitacao`, PARA_EQUIPE);
  } else throw new ApiErro(400, 'Opção inválida.');
  salvar();
  return { body: d };
});

rota('POST', '/demandas/:id/retomar', (ctx, [id]) => {
  const d = demanda(ctx, id);
  if (d.estado !== 'STAND_BY') throw new ApiErro(400, 'Só é possível retomar uma demanda em stand-by.');
  d.estado = 'EM_LEVANTAMENTO';
  registrar(d, ctx, 'Retomou a demanda.');
  salvar();
  return { body: d };
});

rota('POST', '/demandas/:id/viabilidade', (ctx, [id], b) => {
  exigirEquipe(ctx);
  const d = demanda(ctx, id);
  const justificativa = texto(b['justificativa']);
  const erros: Record<string, string[]> = {};
  exigir(typeof b['possivel'] === 'boolean', 'possivel', 'Marque se é possível.', erros);
  exigir(justificativa.length >= 10, 'justificativa', 'Explique a decisão em pelo menos 10 caracteres.', erros);
  validar(erros);
  if (!d.solicitacao || !['SOLICITADO', 'EM_ANALISE'].includes(d.estado)) throw new ApiErro(400, 'Esta demanda não está aguardando análise.');
  d.solicitacao.viabilidade = { possivel: b['possivel'] as boolean, justificativa, decididoPor: ctx.nome, decididoEm: agora() };
  d.estado = b['possivel'] ? 'EM_ANALISE' : 'INVIAVEL';
  d.responsavelId ??= ctx.userId;
  registrar(d, ctx, b['possivel'] ? 'Marcou a demanda como possível.' : 'Marcou a demanda como inviável.');
  notificar(b['possivel'] ? `A equipe avaliou "${d.nome}": é possível fazer.` : `A equipe avaliou "${d.nome}": não é possível fazer agora.`,
    `/demandas/${d.id}/solicitacao`, { usuarios: [d.solicitanteId] });
  salvar();
  return { body: d };
});

rota('POST', '/demandas/:id/reuniao', (ctx, [id], b) => {
  exigirEquipe(ctx);
  const d = demanda(ctx, id);
  const data = texto(b['data']);
  const pauta = texto(b['pauta']);
  const erros: Record<string, string[]> = {};
  exigir(data && !isNaN(Date.parse(data)), 'data', 'Informe data e horário.', erros);
  exigir(!data || Date.parse(data) > Date.now() - 60_000, 'data', 'Escolha uma data futura.', erros);
  exigir(pauta.length >= 5, 'pauta', 'Descreva a pauta.', erros);
  validar(erros);
  if (!d.solicitacao?.viabilidade?.possivel) throw new ApiErro(400, 'Marque a demanda como possível antes de agendar a reunião.');
  const inicio = new Date(data);
  const ev: Evento = {
    id: uid('e'), titulo: `Validação de regras — ${d.nome}`, tipo: 'REUNIAO', inicio: inicio.toISOString(),
    fim: new Date(inicio.getTime() + 3_600_000).toISOString(), demandaId: d.id, participantes: [d.solicitanteId, ctx.userId],
    local: texto(b['local']) || 'Videochamada', descricao: pauta,
  };
  db.eventos.push(ev);
  d.solicitacao.reuniao = { eventoId: ev.id, data: ev.inicio, pauta };
  d.estado = 'REUNIAO_AGENDADA';
  registrar(d, ctx, 'Agendou reunião de validação das regras.');
  notificar(`Reunião de validação marcada para "${d.nome}".`, '/calendario', { usuarios: [d.solicitanteId] });
  salvar();
  return { body: d };
});

rota('POST', '/demandas/:id/planejamento', (ctx, [id], b) => {
  exigirEquipe(ctx);
  const d = demanda(ctx, id);
  const metodologia = texto(b['metodologia']);
  const inicio = texto(b['inicio']);
  const previsao = texto(b['previsao']);
  const erros: Record<string, string[]> = {};
  exigir(['Scrum', 'Kanban', 'Cascata'].includes(metodologia), 'metodologia', 'Escolha a metodologia.', erros);
  exigir(inicio && !isNaN(Date.parse(inicio)), 'inicio', 'Informe a data de início.', erros);
  exigir(previsao && !isNaN(Date.parse(previsao)), 'previsao', 'Informe a previsão de entrega.', erros);
  exigir(!inicio || !previsao || Date.parse(previsao) > Date.parse(inicio), 'previsao', 'A entrega deve ser depois do início.', erros);
  validar(erros);
  if (!d.solicitacao?.reuniao) throw new ApiErro(400, 'Agende a reunião de validação antes do planejamento.');
  d.solicitacao.planejamento = { metodologia, inicio: new Date(inicio).toISOString(), previsao: new Date(previsao).toISOString() };
  db.eventos.push({ id: uid('e'), titulo: `Início — ${d.nome}`, tipo: 'ITERACAO', inicio: new Date(inicio).toISOString(), demandaId: d.id, participantes: [ctx.userId] });
  db.eventos.push({ id: uid('e'), titulo: `Entrega prevista — ${d.nome}`, tipo: 'ENTREGA', inicio: new Date(previsao).toISOString(), demandaId: d.id, participantes: [d.solicitanteId, ctx.userId] });
  d.estado = 'PLANEJADO';
  registrar(d, ctx, `Definiu a metodologia ${metodologia} e as datas.`);
  notificar(`A equipe definiu como e quando "${d.nome}" será feita (${metodologia}).`, `/demandas/${d.id}/solicitacao`, { usuarios: [d.solicitanteId] });
  salvar();
  return { body: d };
});

// IA real: o resultado é aplicado em aplicarResultadoIa() quando o polling recebe CONCLUIDO.
rota('POST', '/demandas/:id/requisitos/gerar', (ctx, [id]) => {
  exigirEquipe(ctx);
  const d = demanda(ctx, id);
  if (!d.respostas.length) throw new ApiErro(400, 'A demanda ainda não tem levantamento.');
  const entrada = {
    demanda: {
      codigo: d.codigo,
      nome: cortar(d.nome, 200),
      descricao: cortar(d.descricao, 4000),
      cenario: d.cenario ? nomeCenario(d.cenario.recomendado) : undefined,
      necessidade: truncarTextos(d.fontes.map((f) => f.conteudo), LIMITE_NECESSIDADE).slice(0, 20),
      respostas: d.respostas.slice(0, 100).map((r) => ({
        pergunta: cortar(r.enunciado, 500), respostas: r.rotulos.slice(0, 20).map((x) => cortar(x, 300)), outro: r.outro ? cortar(r.outro, 500) : undefined,
      })),
    },
    requisitosAprovados: d.requisitos.filter((r) => r.estado === 'APROVADO').slice(0, 200).map((r) => ({ tipo: r.tipo, titulo: cortar(r.titulo, 300) })),
    // Os mais recentes primeiro ficam de fora do corte: manda os últimos 30.
    requisitosRejeitados: d.requisitos.filter((r) => r.estado === 'REJEITADO').slice(-30)
      .map((r) => ({ tipo: r.tipo, titulo: cortar(r.titulo, 300), motivo: cortar(r.motivoRejeicao || 'Rejeitado sem motivo registrado.', 1000) })),
  };
  return criarJobIa(ctx, 'requisitos', 'demanda', d.id, entrada);
});

rota('POST', '/demandas/:id/requisitos/:rid/decisao', (ctx, [id, rid], b) => {
  exigirEquipe(ctx);
  const d = demanda(ctx, id);
  const r = d.requisitos.find((x) => x.id === rid);
  if (!r) throw new ApiErro(404, 'Requisito não encontrado.');
  const decisao = texto(b['decisao']);
  const motivo = texto(b['motivo']);
  const erros: Record<string, string[]> = {};
  exigir(['APROVAR', 'REJEITAR'].includes(decisao), 'decisao', 'Decisão inválida.', erros);
  exigir(decisao !== 'REJEITAR' || motivo.length >= 5, 'motivo', 'Informe o motivo da rejeição.', erros);
  validar(erros);
  const titulo = texto(b['titulo']);
  const descricao = texto(b['descricao']);
  if (titulo) r.titulo = titulo;
  if (descricao) r.descricao = descricao;
  r.estado = decisao === 'APROVAR' ? 'APROVADO' : 'REJEITADO';
  r.motivoRejeicao = decisao === 'REJEITAR' ? motivo : undefined;
  r.decididoPor = ctx.nome;
  r.decididoEm = agora();
  registrar(d, ctx, `${decisao === 'APROVAR' ? 'Aprovou' : 'Rejeitou'} ${r.codigo}.`);
  // O cliente só acompanha requisitos aprovados (as rejeições são parte da validação interna).
  if (decisao === 'APROVAR') notificar(`Requisito ${r.codigo} aprovado em "${d.nome}".`, `/demandas/${d.id}/requisitos`, { usuarios: [d.solicitanteId] });
  salvar();
  return { body: d };
});

rota('POST', '/demandas/:id/iniciar', (ctx, [id]) => {
  exigirEquipe(ctx);
  const d = demanda(ctx, id);
  if (d.estado !== 'PLANEJADO') throw new ApiErro(400, 'Defina o planejamento antes de iniciar.');
  if (!d.requisitos.some((r) => r.estado === 'APROVADO')) throw new ApiErro(400, 'Aprove pelo menos um requisito antes de iniciar.');
  d.estado = 'EM_DESENVOLVIMENTO';
  registrar(d, ctx, 'Iniciou o desenvolvimento.');
  notificar(`"${d.nome}" entrou em desenvolvimento.`, `/demandas/${d.id}`, { usuarios: [d.solicitanteId] });
  salvar();
  return { body: d };
});

// Atividades
rota('GET', '/atividades', (ctx, _p, _b, q) => {
  exigirEquipe(ctx);  // quadro interno da equipe
  const demandaId = q.get('demanda');
  return { body: visiveis(ctx, 'atividade', db.atividades).filter((a) => !demandaId || a.demandaId === demandaId).sort((a, b) => a.prazo.localeCompare(b.prazo)) };
});

rota('POST', '/atividades', (ctx, _p, b) => {
  exigirEquipe(ctx);
  const titulo = texto(b['titulo']);
  const demandaId = texto(b['demandaId']);
  const responsavelId = texto(b['responsavelId']);
  const prazo = texto(b['prazo']);
  const erros: Record<string, string[]> = {};
  exigir(titulo.length >= 3, 'titulo', 'Informe o título.', erros);
  exigir(db.demandas.some((d) => d.id === demandaId), 'demandaId', 'Escolha a demanda.', erros);
  exigir(db.pessoas.some((p) => p.id === responsavelId && p.perfil === 'EQUIPE'), 'responsavelId', 'Escolha o responsável.', erros);
  exigir(prazo && !isNaN(Date.parse(prazo)), 'prazo', 'Informe o prazo.', erros);
  validar(erros);
  const a: Atividade = { id: uid('a'), codigo: proximo('ATV'), titulo, demandaId, responsavelId, estado: 'A_FAZER', prazo: new Date(prazo).toISOString() };
  db.atividades.push(a);
  db.eventos.push({ id: uid('e'), titulo: `Prazo — ${titulo}`, tipo: 'PRAZO', inicio: a.prazo, demandaId, participantes: [responsavelId] });
  salvar();
  return { status: 201, body: a };
});

rota('PATCH', '/atividades/:id', (ctx, [id], b) => {
  exigirEquipe(ctx);
  const a = obter(ctx, 'atividade', db.atividades, id);
  const estado = texto(b['estado']) as EstadoAtividade;
  if (!['A_FAZER', 'EM_DESENVOLVIMENTO', 'EM_REVISAO', 'CONCLUIDA'].includes(estado)) throw new ApiErro(400, 'Situação inválida.', { estado: ['Situação inválida.'] });
  a.estado = estado;
  salvar();
  return { body: a };
});

// Calendário
rota('GET', '/eventos', (ctx, _p, _b, q) => {
  const de = q.get('de');
  const ate = q.get('ate');
  return {
    body: visiveis(ctx, 'evento', db.eventos)
      .filter((e) => (!de || e.inicio >= de) && (!ate || e.inicio <= ate))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
  };
});

rota('POST', '/eventos', (ctx, _p, b) => {
  const titulo = texto(b['titulo']);
  const tipo = texto(b['tipo']) as TipoEvento;
  const inicio = texto(b['inicio']);
  const erros: Record<string, string[]> = {};
  exigir(titulo.length >= 3, 'titulo', 'Informe o título.', erros);
  exigir(['REUNIAO', 'PRAZO', 'ENTREGA', 'ITERACAO'].includes(tipo), 'tipo', 'Escolha o tipo.', erros);
  exigir(inicio && !isNaN(Date.parse(inicio)), 'inicio', 'Informe data e horário.', erros);
  validar(erros);
  const demandaId = texto(b['demandaId']) || undefined;
  // Cliente só cria evento para si mesmo e para demandas dele (demanda de outro → 404).
  if (demandaId) demanda(ctx, demandaId);
  const ev: Evento = {
    id: uid('e'), titulo, tipo, inicio: new Date(inicio).toISOString(), demandaId,
    participantes: [ctx.userId], local: texto(b['local']) || undefined, descricao: texto(b['descricao']) || undefined,
  };
  db.eventos.push(ev);
  salvar();
  return { status: 201, body: ev };
});

// Soluções
rota('GET', '/solucoes', (ctx) => ({ body: visiveis(ctx, 'solucao', db.solucoes) }));
rota('GET', '/solucoes/:id', (ctx, [id]) => ({ body: obter(ctx, 'solucao', db.solucoes, id) }));

// Fila / chamados
rota('GET', '/fila', (ctx) => {
  // A posição é calculada na fila inteira, mas cada perfil só recebe os registros que pode ver
  // (cliente: os dele) e os totais como números.
  const emAtendimento = db.chamados.filter((c) => c.estado === 'EM_ATENDIMENTO');
  const naFila = filaOrdenada();
  const corpo: FilaResumo = {
    emAtendimento: visiveis(ctx, 'chamado', emAtendimento).map(comPosicao),
    naFila: visiveis(ctx, 'chamado', naFila).map(comPosicao),
    totalEmAtendimento: emAtendimento.length,
    totalNaFila: naFila.length,
    tempoMedioMin: TEMPO_MEDIO_MIN,
  };
  return { body: corpo };
});

rota('GET', '/chamados', (ctx) => ({ body: chamadosVisiveis(ctx).map(comPosicao).sort((a, b) => b.abertoEm.localeCompare(a.abertoEm)) }));
rota('GET', '/chamados/:id', (ctx, [id]) => {
  chamado(ctx, id);
  return temPendencia(id)
    ? reconsultarPendencias(ctx, id).pipe(map(() => ({ body: comPosicao(chamado(ctx, id)) })))
    : { body: comPosicao(chamado(ctx, id)) };
});

rota('POST', '/chamados', (ctx, _p, b) => {
  const titulo = texto(b['titulo']);
  const descricao = texto(b['descricao']);
  const solucaoId = texto(b['solucaoId']);
  const versaoId = texto(b['versaoId']);
  const prioridade = b['prioridade'] as Prioridade;
  const s = visiveis(ctx, 'solucao', db.solucoes).find((x) => x.id === solucaoId);
  const erros: Record<string, string[]> = {};
  exigir(titulo.length >= 5, 'titulo', 'Resuma o problema em pelo menos 5 caracteres.', erros);
  exigir(descricao.length >= 10, 'descricao', 'Descreva o que aconteceu.', erros);
  exigir(s, 'solucaoId', 'Escolha a solução.', erros);
  exigir(!s || s.versoes.some((v) => v.id === versaoId), 'versaoId', 'Escolha a versão.', erros);
  exigir(['ALTA', 'MEDIA', 'BAIXA'].includes(prioridade), 'prioridade', 'Escolha o impacto.', erros);
  validar(erros);
  const c: Chamado = {
    id: uid('c'), codigo: proximo('CH'), titulo, descricao, solucaoId, versaoId, prioridade,
    solicitanteId: ctx.userId, estado: 'NA_FILA', abertoEm: agora(),
    historico: [{ data: agora(), autor: ctx.nome, texto: 'Abriu o chamado.' }],
  };
  db.chamados.push(c);
  notificar(`Novo chamado na fila: ${c.codigo}`, `/fila/${c.id}`, PARA_EQUIPE);
  salvar();
  return { status: 201, body: comPosicao(c) };
});

rota('POST', '/fila/proximo', (ctx) => {
  exigirEquipe(ctx);
  const c = filaOrdenada()[0];
  if (!c) throw new ApiErro(400, 'Não há chamados na fila.');
  iniciarAtendimento(c, ctx);
  return { body: comPosicao(c) };
});

function iniciarAtendimento(c: Chamado, ctx: Ctx) {
  c.estado = 'EM_ATENDIMENTO';
  c.responsavelId = ctx.userId;
  c.atendimentoIniciadoEm = agora();
  c.historico.push({ data: agora(), autor: ctx.nome, texto: 'Iniciou o atendimento.' });
  notificar(`Seu chamado ${c.codigo} está em atendimento com ${ctx.nome}.`, `/fila/${c.id}`, { usuarios: [c.solicitanteId] });
  salvar();
}

rota('POST', '/chamados/:id/atender', (ctx, [id]) => {
  exigirEquipe(ctx);
  const c = chamado(ctx, id);
  if (c.estado !== 'NA_FILA') throw new ApiErro(400, 'Este chamado não está na fila.');
  iniciarAtendimento(c, ctx);
  return { body: comPosicao(c) };
});

// IA real: a recuperação de contexto (fontes) segue determinística; a IA escreve causa, procedimento e confiança.
rota('POST', '/chamados/:id/sugestao/gerar', (ctx, [id]) => {
  exigirEquipe(ctx);
  const c = chamado(ctx, id);
  if (c.estado !== 'EM_ATENDIMENTO') throw new ApiErro(400, 'Inicie o atendimento antes de pedir a análise.');
  if (c.sugestao?.estado === 'PROPOSTO') throw new ApiErro(400, 'Aprove ou rejeite a sugestão atual antes de pedir outra.');
  if (c.sugestao?.estado === 'APROVADO') throw new ApiErro(400, 'A sugestão deste chamado já foi aprovada.');
  const solucao = db.solucoes.find((s) => s.id === c.solucaoId);
  const versao = solucao?.versoes.find((v) => v.id === c.versaoId);
  const origem = db.demandas.find((d) => d.id === solucao?.demandaOrigemId);
  const entrada = {
    chamado: { codigo: c.codigo, titulo: cortar(c.titulo, 300), descricao: cortar(c.descricao, 5000), prioridade: c.prioridade },
    solucao: solucao ? { nome: cortar(solucao.nome, 200), versao: versao?.numero ?? '' } : undefined,
    requisitos: (origem?.requisitos ?? []).filter((r) => r.estado === 'APROVADO').slice(0, 50)
      .map((r) => ({ codigo: r.codigo, titulo: cortar(r.titulo, 300), descricao: cortar(r.descricao, 2000) })),
    conhecimentos: db.conhecimentos.filter((k) => k.solucaoId === c.solucaoId).slice(0, 20)
      .map((k) => ({ codigo: k.codigo, titulo: cortar(k.titulo, 300), procedimento: k.procedimento.slice(0, 30).map((p) => cortar(p, 1000)) })),
    chamadosResolvidos: db.chamados.filter((x) => x.id !== c.id && x.solucaoId === c.solucaoId && x.estado === 'RESOLVIDO').slice(0, 50)
      .map((x) => ({ codigo: x.codigo, titulo: cortar(x.titulo, 300) })),
    sugestoesRejeitadas: rejeitadasDoChamado(c).slice(-5).map((r) => ({ causa: cortar(r.causa, 1000), motivo: cortar(r.motivo, 1000) })),
  };
  return criarJobIa(ctx, 'sugestao_suporte', 'chamado', c.id, entrada);
});

rota('POST', '/chamados/:id/sugestao/decisao', (ctx, [id], b) => {
  exigirEquipe(ctx);
  const c = chamado(ctx, id);
  if (!c.sugestao || c.sugestao.estado !== 'PROPOSTO') throw new ApiErro(400, 'Não há sugestão aguardando decisão.');
  const decisao = texto(b['decisao']);
  const motivo = texto(b['motivo']);
  const erros: Record<string, string[]> = {};
  exigir(['APROVAR', 'REJEITAR'].includes(decisao), 'decisao', 'Decisão inválida.', erros);
  exigir(decisao !== 'REJEITAR' || motivo.length >= 5, 'motivo', 'Informe o motivo da rejeição.', erros);
  validar(erros);
  c.sugestao = { ...c.sugestao, estado: decisao === 'APROVAR' ? 'APROVADO' : 'REJEITADO', decididoPor: ctx.nome, decididoEm: agora(), motivo: motivo || undefined };
  if (decisao === 'REJEITAR') {
    // Rejeição devolve o chamado para análise (CLAUDE.md §15.5); o motivo segue para a próxima geração (§6).
    (c.sugestoesRejeitadas ??= []).push({ causa: c.sugestao.causa, motivo, decididoPor: ctx.nome, decididoEm: agora(), modelo: c.sugestao.modelo });
  }
  c.historico.push({ data: agora(), autor: ctx.nome, texto: decisao === 'APROVAR' ? 'Aprovou a sugestão da IA.' : `Rejeitou a sugestão da IA: ${motivo}` });
  salvar();
  return { body: comPosicao(c) };
});

rota('POST', '/chamados/:id/resolver', (ctx, [id], b) => {
  exigirEquipe(ctx);
  const c = chamado(ctx, id);
  if (c.estado !== 'EM_ATENDIMENTO') throw new ApiErro(400, 'O chamado não está em atendimento.');
  if (c.sugestao?.estado === 'PROPOSTO') throw new ApiErro(400, 'Aprove ou rejeite a sugestão da IA antes de resolver.');
  const solucao = texto(b['solucao']);
  if (solucao.length < 10) throw new ApiErro(400, 'Descreva como o problema foi resolvido.', { solucao: ['Descreva como o problema foi resolvido.'] });
  c.estado = 'RESOLVIDO';
  c.resolvidoEm = agora();
  c.historico.push({ data: agora(), autor: ctx.nome, texto: `Resolveu: ${solucao}` });
  notificar(`Seu chamado ${c.codigo} foi resolvido.`, `/fila/${c.id}`, { usuarios: [c.solicitanteId] });
  if (b['registrarConhecimento'] && c.sugestao?.estado === 'APROVADO') {
    const k = {
      id: uid('k'), codigo: proximo('KB'), titulo: c.titulo, chamadoOrigemId: c.id, solucaoId: c.solucaoId,
      procedimento: c.sugestao.procedimento, validadoPor: ctx.nome, validadoEm: agora(), usos: 0,
    };
    db.conhecimentos.push(k);
    c.conhecimentoId = k.id;
    c.historico.push({ data: agora(), autor: ctx.nome, texto: `Registrou o conhecimento ${k.codigo}.` });
  }
  salvar();
  return { body: comPosicao(c) };
});

rota('GET', '/conhecimentos/:id', (ctx, [id]) => ({ body: obter(ctx, 'conhecimento', db.conhecimentos, id) }));

// Transversal
rota('GET', '/notificacoes', (ctx) => ({ body: notificacoesDe(ctx) }));
// Marca como lidas só as notificações do próprio usuário.
rota('POST', '/notificacoes/ler', (ctx) => {
  visiveis(ctx, 'notificacao', db.notificacoes).forEach((n) => { if (!n.lidaPor.includes(ctx.userId)) n.lidaPor.push(ctx.userId); });
  salvar();
  return { body: notificacoesDe(ctx) };
});

rota('GET', '/busca', (ctx, _p, _b, q) => {
  const t = (q.get('q') ?? '').toLowerCase().trim();
  if (t.length < 2) return { body: [] };
  const casa = (s: string) => s.toLowerCase().includes(t);
  const r: ResultadoBusca[] = [
    ...demandasVisiveis(ctx).filter((d) => casa(d.codigo + d.nome)).map((d) => ({ tipo: 'Demanda' as const, codigo: d.codigo, titulo: d.nome, link: `/demandas/${d.id}` })),
    ...visiveis(ctx, 'atividade', db.atividades).filter((a) => casa(a.codigo + a.titulo)).map((a) => ({ tipo: 'Atividade' as const, codigo: a.codigo, titulo: a.titulo, link: '/demandas?aba=atividades' })),
    ...visiveis(ctx, 'solucao', db.solucoes).filter((s) => casa(s.codigo + s.nome)).map((s) => ({ tipo: 'Solução' as const, codigo: s.codigo, titulo: s.nome, link: `/solucoes/${s.id}` })),
    ...chamadosVisiveis(ctx).filter((c) => casa(c.codigo + c.titulo)).map((c) => ({ tipo: 'Chamado' as const, codigo: c.codigo, titulo: c.titulo, link: `/fila/${c.id}` })),
  ];
  return { body: r.slice(0, 12) };
});

// ---------- Interceptor ----------

const PREFIXO = '/api/v1';
const DIRETO_PARA_DJANGO = [/^\/auth\//, /^\/me$/, /^\/ia\//, /^\/usuarios(\/|$)/];
const ROTA_JOB = /^\/jobs\/([^/]+)$/;

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(PREFIXO)) return next(req);
  const [caminho, qs] = req.url.slice(PREFIXO.length).split('?');
  if (DIRETO_PARA_DJANGO.some((rx) => rx.test(caminho))) return next(req);

  const usuario = inject(AuthService).usuario();
  if (!usuario) return erroHttp(new ApiErro(401, 'Sua sessão expirou. Entre novamente.'), req.url);
  const userId = sincronizarPessoa(usuario);
  // Responde pela VISÃO ativa (equipe vendo como cliente recebe exatamente o que um cliente receberia).
  const ctx: Ctx = { perfil: inject(SessionService).perfil(), userId, nome: usuario.nome, req, next };

  // Job real (não criado por este mock): consulta no Django e aplica o resultado pendente antes de responder.
  const job = ROTA_JOB.exec(caminho);
  if (req.method === 'GET' && job && !jobs.has(job[1])) {
    return next(req).pipe(map((ev) => {
      if (ev instanceof HttpResponse && ev.body) aplicarResultadoIa(ev.body as Job, ctx);
      return ev;
    }));
  }
  return responder(req, ctx, caminho, qs);
};

function responder(req: HttpRequest<unknown>, ctx: Ctx, caminho: string, qs: string | undefined): Observable<HttpEvent<unknown>> {
  const latencia = 180 + Math.random() * 260;
  const query = new URLSearchParams(qs ?? '');
  req.params.keys().forEach((k) => query.set(k, req.params.get(k) ?? ''));
  let saida: Observable<Resposta>;
  try {
    const achada = rotas.find(([m, rx]) => m === req.method && rx.test(caminho));
    if (!achada) throw new ApiErro(404, `Rota ${req.method} ${caminho} não existe.`);
    const params = (caminho.match(achada[1]) ?? []).slice(1);
    const res = achada[2](ctx, params, (req.body ?? {}) as Record<string, unknown>, query);
    saida = isObservable(res) ? res : of(res).pipe(delay(latencia));
  } catch (e) {
    saida = throwError(() => e).pipe(materialize(), delay(latencia), dematerialize());
  }
  return saida.pipe(
    // Clona para que a tela nunca altere o "banco" por referência.
    map((res) => {
      const copia: unknown = res.body === undefined ? null : JSON.parse(JSON.stringify(res.body));
      return new HttpResponse({ status: res.status ?? 200, body: ehEquipe(ctx) ? copia : paraCliente(copia), url: req.url });
    }),
    catchError((e: unknown) => {
      // Erros do Django (ex.: 400/403/429 de /ia/jobs) sobem como vieram, com a URL da rota original.
      if (e instanceof HttpErrorResponse) {
        return throwError(() => new HttpErrorResponse({ status: e.status, statusText: e.statusText, error: e.error, headers: e.headers, url: req.url }));
      }
      if (!(e instanceof ApiErro)) console.error(e);
      return erroHttp(e instanceof ApiErro ? e : new ApiErro(500, 'Erro inesperado no servidor simulado.'), req.url);
    }),
  );
}

function erroHttp(erro: ApiErro, url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: erro.status, url, error: { mensagem: erro.mensagem, campos: erro.campos } }));
}
