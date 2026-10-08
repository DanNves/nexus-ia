// Backend simulado. Intercepta /api/v1/* e responde como a API Django responderia.
// Para usar o backend real: remover este interceptor em app.config.ts (environment.useMock = false).
import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, delay, dematerialize, materialize, of, throwError } from 'rxjs';
import {
  Atividade, Chamado, Demanda, EstadoAtividade, Evento, FilaResumo, Job, Pendencia, Perfil, Prioridade,
  ResultadoBusca, RespostaEntrevista, TipoEvento, VisaoGeral,
} from './models';
import { MockDb, VERSAO_SEED, criarSeed } from './mock-seed';
import { gerarPrototipo, gerarRanking, gerarRequisitos, gerarSugestao, nomeCenario, perguntaPorId, proximaPergunta } from './mock-ia';

const CHAVE = 'nexus.mockdb';
export const USUARIO_POR_PERFIL: Record<Perfil, string> = { CLIENTE: 'p1', EQUIPE: 'p2' };

// ---------- Persistência local do mock ----------

let db: MockDb = carregar();

function carregar(): MockDb {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const salvo = JSON.parse(bruto) as MockDb;
      if (salvo.versao === VERSAO_SEED) return salvo;
    }
  } catch { /* sem localStorage: usa seed em memória */ }
  return criarSeed();
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

interface JobInterno { job: Job; inicio: number; duracao: number; etapas: string[]; aoConcluir: () => void; concluido: boolean }
const jobs = new Map<string, JobInterno>();

function criarJob(etapas: string[], duracao: number, aoConcluir: () => void): Job {
  const job: Job = { id: uid('job'), estado: 'PENDENTE', percentual: 0, etapa: etapas[0] };
  jobs.set(job.id, { job, inicio: Date.now(), duracao, etapas, aoConcluir, concluido: false });
  return job;
}

function consultarJob(id: string): Job {
  const j = jobs.get(id);
  if (!j) throw new ApiErro(404, 'Tarefa não encontrada.');
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

// ---------- Regras de acesso ----------

interface Ctx { perfil: Perfil; userId: string; nome: string }

function demandasVisiveis(ctx: Ctx) {
  return ctx.perfil === 'EQUIPE' ? db.demandas : db.demandas.filter((d) => d.solicitanteId === ctx.userId);
}

function demanda(ctx: Ctx, id: string): Demanda {
  const d = demandasVisiveis(ctx).find((x) => x.id === id);
  if (!d) throw new ApiErro(404, 'Demanda não encontrada.');
  return d;
}

function exigirEquipe(ctx: Ctx) {
  if (ctx.perfil !== 'EQUIPE') throw new ApiErro(403, 'Somente a equipe responsável pode fazer isso.');
}

function registrar(d: Demanda, ctx: Ctx, txt: string) {
  d.historico.push({ data: agora(), autor: ctx.nome, texto: txt });
  d.atualizadaEm = agora();
}

function notificar(txt: string, link: string) {
  db.notificacoes.unshift({ id: uid('n'), texto: txt, quando: agora(), link, lida: false });
}

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
  return ctx.perfil === 'EQUIPE' ? db.chamados : db.chamados.filter((c) => c.solicitanteId === ctx.userId);
}

function chamado(ctx: Ctx, id: string): Chamado {
  const c = chamadosVisiveis(ctx).find((x) => x.id === id);
  if (!c) throw new ApiErro(404, 'Chamado não encontrado.');
  return c;
}

function anonimizar(c: Chamado, ctx: Ctx): Chamado {
  if (ctx.perfil === 'EQUIPE' || c.solicitanteId === ctx.userId) return comPosicao(c);
  // Cliente vê a fila inteira, mas não os dados de outros clientes.
  return { ...comPosicao(c), titulo: 'Chamado de outro cliente', descricao: '', solicitanteId: '', historico: [], sugestao: undefined };
}

// ---------- Rotas ----------

type Handler = (ctx: Ctx, p: string[], body: Record<string, unknown>, q: URLSearchParams) => { status?: number; body: unknown };
const rotas: [string, RegExp, Handler][] = [];
const rota = (m: string, padrao: string, h: Handler) => rotas.push([m, new RegExp(`^${padrao.replace(/:[a-z]+/g, '([^/]+)')}$`), h]);

rota('GET', '/me', (ctx) => ({ body: db.pessoas.find((p) => p.id === ctx.userId) }));
rota('GET', '/jobs/:id', (_ctx, [id]) => ({ body: consultarJob(id) }));
rota('GET', '/pessoas', () => ({ body: db.pessoas }));

rota('POST', '/demo/restaurar', () => {
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
  if (ctx.perfil === 'CLIENTE') {
    demandas.filter((d) => d.estado === 'EM_LEVANTAMENTO' || d.estado === 'RASCUNHO').forEach((d) =>
      pendencias.push({ id: d.id, tipo: 'demanda', texto: `Continue a entrevista de "${d.nome}"`, detalhe: `${d.respostas.length} perguntas respondidas`, acao: 'Continuar', link: `/demandas/${d.id}/levantamento` }));
    demandas.filter((d) => d.estado === 'STAND_BY').forEach((d) =>
      pendencias.push({ id: d.id, tipo: 'demanda', texto: `"${d.nome}" está em stand-by`, detalhe: 'Retome quando quiser enviar para a equipe', acao: 'Abrir', link: `/demandas/${d.id}` }));
  } else {
    demandas.filter((d) => d.estado === 'SOLICITADO').forEach((d) =>
      pendencias.push({ id: d.id, tipo: 'demanda', texto: `Nova solicitação: ${d.nome}`, detalhe: 'Avaliar se é possível', acao: 'Avaliar', link: `/demandas/${d.id}/solicitacao` }));
    demandas.forEach((d) => {
      const n = d.requisitos.filter((r) => r.estado === 'PROPOSTO').length;
      if (n) pendencias.push({ id: `${d.id}-r`, tipo: 'requisito', texto: `${n} requisitos aguardando validação`, detalhe: d.nome, acao: 'Validar', link: `/demandas/${d.id}/requisitos` });
    });
    const sug = db.chamados.filter((c) => c.sugestao?.estado === 'PROPOSTO');
    sug.forEach((c) => pendencias.push({ id: c.id, tipo: 'chamado', texto: `Sugestão da IA aguardando validação`, detalhe: `${c.codigo} ${c.titulo}`, acao: 'Validar', link: `/fila/${c.id}` }));
  }
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const visiveisIds = new Set(demandas.map((d) => d.id));
  const proximosEventos = db.eventos
    .filter((e) => new Date(e.inicio) >= hoje && (ctx.perfil === 'EQUIPE' || e.participantes.includes(ctx.userId) || (e.demandaId && visiveisIds.has(e.demandaId))))
    .sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 4);
  const corpo: VisaoGeral = {
    pendencias,
    demandas: [...demandas].filter((d) => d.estado !== 'ENTREGUE').sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm)).slice(0, 5),
    proximosEventos,
    chamados: chamados.filter((c) => c.estado !== 'RESOLVIDO').slice(0, 4),
    numeros: {
      demandasAtivas: demandas.filter((d) => !['ENTREGUE', 'INVIAVEL'].includes(d.estado)).length,
      naFila: db.chamados.filter((c) => c.estado === 'NA_FILA').length,
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

rota('GET', '/demandas/:id', (ctx, [id]) => ({ body: demanda(ctx, id) }));

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
  validar(erros);
  const d: Demanda = {
    id: uid('d'), codigo: proximo('DEM'), nome, descricao, estado: 'EM_LEVANTAMENTO', prioridade,
    solicitanteId: ctx.userId, criadaEm: agora(), atualizadaEm: agora(),
    processoPaiId: texto(b['processoPaiId']) || undefined,
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
  const job = criarJob(['Lendo suas respostas', 'Extraindo sinais', 'Comparando cenários', 'Montando o protótipo'], 3200, () => {
    const ranking = gerarRanking(d.respostas);
    d.entrevistaConcluida = true;
    d.cenario = { estado: 'PROPOSTO', recomendado: ranking[0].tipo, ranking, geradoEm: agora() };
    d.prototipo = { estado: 'PROPOSTO', telas: gerarPrototipo(d.nome, ranking[0].tipo), geradoEm: agora() };
    d.estado = 'EM_LEVANTAMENTO';
    registrar(d, ctx, `A IA sugeriu o cenário "${nomeCenario(ranking[0].tipo)}" e gerou um protótipo.`);
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
    notificar(`Nova solicitação: ${d.nome}`, `/demandas/${d.id}/solicitacao`);
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
  salvar();
  return { body: d };
});

rota('POST', '/demandas/:id/requisitos/gerar', (ctx, [id]) => {
  exigirEquipe(ctx);
  const d = demanda(ctx, id);
  if (!d.respostas.length) throw new ApiErro(400, 'A demanda ainda não tem levantamento.');
  const job = criarJob(['Lendo o levantamento', 'Escrevendo requisitos', 'Revisando regras'], 2800, () => {
    d.requisitos = [...d.requisitos.filter((r) => r.estado === 'APROVADO'), ...gerarRequisitos(d, () => proximo('REQ'))];
    registrar(d, ctx, 'A IA sugeriu requisitos para validação.');
  });
  return { status: 202, body: job };
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
  salvar();
  return { body: d };
});

// Atividades
rota('GET', '/atividades', (ctx, _p, _b, q) => {
  const ids = new Set(demandasVisiveis(ctx).map((d) => d.id));
  const demandaId = q.get('demanda');
  return { body: db.atividades.filter((a) => ids.has(a.demandaId) && (!demandaId || a.demandaId === demandaId)).sort((a, b) => a.prazo.localeCompare(b.prazo)) };
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
  const a = db.atividades.find((x) => x.id === id);
  if (!a) throw new ApiErro(404, 'Atividade não encontrada.');
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
  const ids = new Set(demandasVisiveis(ctx).map((d) => d.id));
  return {
    body: db.eventos
      .filter((e) => ctx.perfil === 'EQUIPE' || e.participantes.includes(ctx.userId) || (e.demandaId && ids.has(e.demandaId)))
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
rota('GET', '/solucoes', (ctx) => ({ body: ctx.perfil === 'EQUIPE' ? db.solucoes : db.solucoes.filter((s) => s.clienteId === ctx.userId) }));
rota('GET', '/solucoes/:id', (ctx, [id]) => {
  const s = db.solucoes.find((x) => x.id === id && (ctx.perfil === 'EQUIPE' || x.clienteId === ctx.userId));
  if (!s) throw new ApiErro(404, 'Solução não encontrada.');
  return { body: s };
});

// Fila / chamados
rota('GET', '/fila', (ctx) => {
  const corpo: FilaResumo = {
    emAtendimento: db.chamados.filter((c) => c.estado === 'EM_ATENDIMENTO').map((c) => anonimizar(c, ctx)),
    naFila: filaOrdenada().map((c) => anonimizar(c, ctx)),
    tempoMedioMin: TEMPO_MEDIO_MIN,
  };
  return { body: corpo };
});

rota('GET', '/chamados', (ctx) => ({ body: chamadosVisiveis(ctx).map(comPosicao).sort((a, b) => b.abertoEm.localeCompare(a.abertoEm)) }));
rota('GET', '/chamados/:id', (ctx, [id]) => ({ body: comPosicao(chamado(ctx, id)) }));

rota('POST', '/chamados', (ctx, _p, b) => {
  const titulo = texto(b['titulo']);
  const descricao = texto(b['descricao']);
  const solucaoId = texto(b['solucaoId']);
  const versaoId = texto(b['versaoId']);
  const prioridade = b['prioridade'] as Prioridade;
  const solucoes = ctx.perfil === 'EQUIPE' ? db.solucoes : db.solucoes.filter((s) => s.clienteId === ctx.userId);
  const s = solucoes.find((x) => x.id === solucaoId);
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
  notificar(`Novo chamado na fila: ${c.codigo}`, `/fila/${c.id}`);
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
  salvar();
}

rota('POST', '/chamados/:id/atender', (ctx, [id]) => {
  exigirEquipe(ctx);
  const c = chamado(ctx, id);
  if (c.estado !== 'NA_FILA') throw new ApiErro(400, 'Este chamado não está na fila.');
  iniciarAtendimento(c, ctx);
  return { body: comPosicao(c) };
});

rota('POST', '/chamados/:id/sugestao/gerar', (ctx, [id]) => {
  exigirEquipe(ctx);
  const c = chamado(ctx, id);
  if (c.estado !== 'EM_ATENDIMENTO') throw new ApiErro(400, 'Inicie o atendimento antes de pedir a análise.');
  const job = criarJob(['Recuperando o contexto', 'Procurando soluções anteriores', 'Escrevendo a sugestão'], 3000, () => {
    c.sugestao = gerarSugestao(c, db.solucoes.find((s) => s.id === c.solucaoId), db.demandas, db.conhecimentos, db.chamados);
    c.historico.push({ data: agora(), autor: 'IA (sugestão)', texto: 'Sugeriu uma possível causa e um procedimento.' });
  });
  return { status: 202, body: job };
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

rota('GET', '/conhecimentos/:id', (_ctx, [id]) => {
  const k = db.conhecimentos.find((x) => x.id === id);
  if (!k) throw new ApiErro(404, 'Conhecimento não encontrado.');
  return { body: k };
});

// Transversal
rota('GET', '/notificacoes', () => ({ body: db.notificacoes.slice(0, 8) }));
rota('POST', '/notificacoes/ler', () => {
  db.notificacoes.forEach((n) => (n.lida = true));
  salvar();
  return { body: db.notificacoes.slice(0, 8) };
});

rota('GET', '/busca', (ctx, _p, _b, q) => {
  const t = (q.get('q') ?? '').toLowerCase().trim();
  if (t.length < 2) return { body: [] };
  const casa = (s: string) => s.toLowerCase().includes(t);
  const ids = new Set(demandasVisiveis(ctx).map((d) => d.id));
  const r: ResultadoBusca[] = [
    ...demandasVisiveis(ctx).filter((d) => casa(d.codigo + d.nome)).map((d) => ({ tipo: 'Demanda' as const, codigo: d.codigo, titulo: d.nome, link: `/demandas/${d.id}` })),
    ...db.atividades.filter((a) => ids.has(a.demandaId) && casa(a.codigo + a.titulo)).map((a) => ({ tipo: 'Atividade' as const, codigo: a.codigo, titulo: a.titulo, link: '/demandas?aba=atividades' })),
    ...db.solucoes.filter((s) => (ctx.perfil === 'EQUIPE' || s.clienteId === ctx.userId) && casa(s.codigo + s.nome)).map((s) => ({ tipo: 'Solução' as const, codigo: s.codigo, titulo: s.nome, link: `/solucoes/${s.id}` })),
    ...chamadosVisiveis(ctx).filter((c) => casa(c.codigo + c.titulo)).map((c) => ({ tipo: 'Chamado' as const, codigo: c.codigo, titulo: c.titulo, link: `/fila/${c.id}` })),
  ];
  return { body: r.slice(0, 12) };
});

// ---------- Interceptor ----------

const PREFIXO = '/api/v1';

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(PREFIXO)) return next(req);
  return responder(req);
};

function responder(req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
  const latencia = 180 + Math.random() * 260;
  const [caminho, qs] = req.url.slice(PREFIXO.length).split('?');
  const query = new URLSearchParams(qs ?? '');
  req.params.keys().forEach((k) => query.set(k, req.params.get(k) ?? ''));
  const perfil: Perfil = req.headers.get('X-Nexus-Perfil') === 'EQUIPE' ? 'EQUIPE' : 'CLIENTE';
  const userId = USUARIO_POR_PERFIL[perfil];
  const ctx: Ctx = { perfil, userId, nome: db.pessoas.find((p) => p.id === userId)?.nome ?? '' };
  try {
    const achada = rotas.find(([m, rx]) => m === req.method && rx.test(caminho));
    if (!achada) throw new ApiErro(404, `Rota ${req.method} ${caminho} não existe.`);
    const params = (caminho.match(achada[1]) ?? []).slice(1);
    const res = achada[2](ctx, params, (req.body ?? {}) as Record<string, unknown>, query);
    // Clona para que a tela nunca altere o "banco" por referência.
    const body = res.body === undefined ? null : JSON.parse(JSON.stringify(res.body));
    return of(new HttpResponse({ status: res.status ?? 200, body, url: req.url })).pipe(delay(latencia));
  } catch (e) {
    const erro = e instanceof ApiErro ? e : new ApiErro(500, 'Erro inesperado no servidor simulado.');
    if (!(e instanceof ApiErro)) console.error(e);
    return throwError(() => new HttpErrorResponse({
      status: erro.status, url: req.url, error: { mensagem: erro.mensagem, campos: erro.campos },
    })).pipe(materialize(), delay(latencia), dematerialize());
  }
}
