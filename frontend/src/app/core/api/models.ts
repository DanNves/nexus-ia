// Contratos da API /api/v1. Espelham o que o backend Django deverá devolver.
// Enquanto o backend não existe, o mock-backend.interceptor responde com estes formatos.

export type Perfil = 'CLIENTE' | 'EQUIPE';
export type Prioridade = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface Pessoa {
  id: string;
  nome: string;
  cargo: string;
  organizacao: string;
  perfil: Perfil;
}

// ---------- Demandas ----------

export type EstadoDemanda =
  | 'RASCUNHO'
  | 'EM_LEVANTAMENTO'
  | 'STAND_BY'
  | 'SOLICITADO'
  | 'EM_ANALISE'
  | 'INVIAVEL'
  | 'REUNIAO_AGENDADA'
  | 'PLANEJADO'
  | 'EM_DESENVOLVIMENTO'
  | 'ENTREGUE';

export type EstadoArtefato = 'PROPOSTO' | 'APROVADO' | 'REJEITADO';
export type TipoCenario = 'WEB' | 'DESKTOP' | 'MOBILE' | 'JOB' | 'API';

export interface Fonte {
  id: string;
  tipo: 'TEXTO' | 'ATA';
  titulo: string;
  conteudo: string;
  criadaEm: string;
}

export interface OpcaoPergunta {
  valor: string;
  rotulo: string;
  /** Códigos do catálogo de sinais (backend/apps/cenario/domain/sinais.py) que esta opção indica. */
  sinais?: string[];
}

/**
 * De onde veio a pergunta (CLAUDE.md §3: rótulo honesto).
 * IA = provedor real (Gemini); SIMULADOR = provedor `fake` do backend; ROTEIRO = roteiro padrão fixo (BANCO do mock).
 */
export type OrigemPergunta = 'IA' | 'SIMULADOR' | 'ROTEIRO';

export interface Pergunta {
  id: string;
  enunciado: string;
  ajuda?: string;
  multipla: boolean;
  opcoes: OpcaoPergunta[];
  /** Ausente em dados antigos = roteiro padrão. */
  origem?: OrigemPergunta;
  /** Modelo que sugeriu a pergunta (origem IA ou SIMULADOR). */
  modelo?: string;
}

export interface RespostaEntrevista {
  perguntaId: string;
  enunciado: string;
  valores: string[];
  rotulos: string[];
  outro?: string;
  /** Escolheu "Não sei" (sem valores e sem "Outro"). */
  naoSei?: boolean;
  /** Sinais das opções escolhidas; ausente em dados antigos (derivado pela equivalência do roteiro padrão). */
  sinais?: string[];
  /** Rodada da entrevista em que foi respondida (ausente/0 = antes das rodadas). */
  rodada?: number;
  origem?: OrigemPergunta;
}

/** Uma rodada de perguntas: gerada pela IA (até 5) ou servida pelo roteiro padrão quando a IA não está disponível. */
export interface RodadaEntrevista {
  numero: number;
  fonte: OrigemPergunta;
  modelo?: string;
  /** IA: perguntas geradas (fila). ROTEIRO: vazio (as perguntas saem do roteiro na hora, adaptativas). */
  perguntas: Pergunta[];
  /** A IA indicou que não precisa de outra rodada. */
  suficiente: boolean;
  /** "O que já entendemos", escrito pela IA (sugestão). */
  resumo?: string;
  lacunas?: string[];
  /** ROTEIRO: por que a IA não foi usada nesta rodada (linguagem simples). */
  motivo?: string;
}

export interface EstadoEntrevista {
  rodadas: RodadaEntrevista[];
  /** IA_ENTREVISTA_MAX_RODADAS do backend (GET /ia/status → cota.entrevistaMaxRodadas). */
  rodadaMaxima: number;
  /** Preenchido quando a IA não pode mais ser usada nesta demanda (rodadas esgotadas ou cota do registro): motivo. */
  semIa?: string;
}

export interface CenarioPontuado {
  tipo: TipoCenario;
  nome: string;
  pontuacao: number;
  motivos: string[];
}

export interface Cenario {
  estado: EstadoArtefato;
  recomendado: TipoCenario;
  ranking: CenarioPontuado[];
  geradoEm: string;
}

export interface TelaPrototipo {
  id: string;
  nome: string;
  html: string;
}

export interface Prototipo {
  estado: EstadoArtefato;
  telas: TelaPrototipo[];
  geradoEm: string;
}

export interface Requisito {
  id: string;
  codigo: string;
  tipo: 'RF' | 'RNF' | 'REGRA';
  titulo: string;
  descricao: string;
  estado: EstadoArtefato;
  motivoRejeicao?: string;
  decididoPor?: string;
  decididoEm?: string;
  /** Modelo de IA que sugeriu (IA real). Ausente = dado do simulador/seed de demonstração. */
  modelo?: string;
  /** Aprovado com edição humana (métrica do TCC: aprovado sem edição × editado × rejeitado, CLAUDE.md §6/§18). */
  editado?: boolean;
}

export interface Solicitacao {
  abertaEm: string;
  viabilidade?: { possivel: boolean; justificativa: string; decididoPor: string; decididoEm: string };
  reuniao?: { eventoId: string; data: string; pauta: string };
  planejamento?: { metodologia: string; inicio: string; previsao: string };
}

export interface ItemHistorico {
  data: string;
  autor: string;
  texto: string;
}

export interface Demanda {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  estado: EstadoDemanda;
  prioridade: Prioridade;
  solicitanteId: string;
  responsavelId?: string;
  criadaEm: string;
  atualizadaEm: string;
  processoPaiId?: string;
  solucaoId?: string;
  fontes: Fonte[];
  respostas: RespostaEntrevista[];
  entrevistaConcluida: boolean;
  /** Rodadas da entrevista guiada (ausente em demandas antigas). */
  entrevista?: EstadoEntrevista;
  cenario?: Cenario;
  prototipo?: Prototipo;
  solicitacao?: Solicitacao;
  requisitos: Requisito[];
  historico: ItemHistorico[];
}

export interface ProximaPergunta {
  concluida: boolean;
  pergunta?: Pergunta;
  progresso: { respondidas: number; estimadas: number };
  /** Não há pergunta na fila e a entrevista não acabou: peça a próxima rodada (POST /entrevista/rodada). */
  precisaRodada?: boolean;
  rodada?: { numero: number; maxima: number };
  /** Motivo (linguagem simples) de as perguntas atuais virem do roteiro padrão. */
  roteiro?: string;
  /** Resumo da última rodada gerada (IA ou simulador), com a origem para o rótulo. */
  resumo?: { texto: string; origem: OrigemPergunta; modelo?: string };
}

/** POST /demandas/:id/entrevista/rodada: ou um job de IA para acompanhar, ou a próxima pergunta já pronta (roteiro). */
export interface RespostaRodada {
  job?: Job;
  proxima?: ProximaPergunta;
}

// ---------- Atividades ----------

export type EstadoAtividade = 'A_FAZER' | 'EM_DESENVOLVIMENTO' | 'EM_REVISAO' | 'CONCLUIDA';

export interface Atividade {
  id: string;
  codigo: string;
  titulo: string;
  demandaId: string;
  responsavelId: string;
  estado: EstadoAtividade;
  prazo: string;
}

// ---------- Calendário ----------

export type TipoEvento = 'REUNIAO' | 'PRAZO' | 'ENTREGA' | 'ITERACAO';

export interface Evento {
  id: string;
  titulo: string;
  tipo: TipoEvento;
  inicio: string;
  fim?: string;
  demandaId?: string;
  participantes: string[];
  local?: string;
  descricao?: string;
}

// ---------- Soluções ----------

export interface Versao {
  id: string;
  numero: string;
  estado: 'PUBLICADA' | 'EM_DESENVOLVIMENTO';
  publicadaEm?: string;
  notas: string[];
}

export interface Solucao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  tipo: TipoCenario;
  clienteId: string;
  demandaOrigemId?: string;
  versoes: Versao[];
  /** E-mails de quem acompanha a solução sem ser o solicitante (vínculo pelo e-mail da conta). */
  observadores: string[];
}

// ---------- Fila / Chamados ----------

export type EstadoChamado = 'NA_FILA' | 'EM_ATENDIMENTO' | 'RESOLVIDO';

export interface FonteContexto {
  tipo: 'Demanda' | 'Requisito' | 'Versão' | 'Chamado' | 'Conhecimento';
  codigo: string;
  titulo: string;
  link?: string;
}

export interface Sugestao {
  estado: EstadoArtefato;
  categoria: string;
  causa: string;
  procedimento: string[];
  fontes: FonteContexto[];
  confianca: number;
  semHistorico: boolean;
  decididoPor?: string;
  decididoEm?: string;
  motivo?: string;
  /** Modelo que gerou a sugestão (IA real). Ausente em sugestões antigas/simuladas. */
  modelo?: string;
}

/** Sugestão da IA rejeitada neste chamado. Vai na próxima geração para a IA não repetir a hipótese (CLAUDE.md §6). */
export interface SugestaoRejeitada {
  causa: string;
  motivo: string;
  decididoPor: string;
  decididoEm: string;
  modelo?: string;
}

export interface Chamado {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  solucaoId: string;
  versaoId: string;
  solicitanteId: string;
  responsavelId?: string;
  prioridade: Prioridade;
  estado: EstadoChamado;
  abertoEm: string;
  atendimentoIniciadoEm?: string;
  resolvidoEm?: string;
  posicao?: number;
  esperaEstimadaMin?: number;
  sugestao?: Sugestao;
  /** Histórico das sugestões rejeitadas (mais antiga primeiro). */
  sugestoesRejeitadas?: SugestaoRejeitada[];
  conhecimentoId?: string;
  historico: ItemHistorico[];
}

export interface FilaResumo {
  /** EQUIPE: todos os chamados. CLIENTE: só os dele (posição e espera calculadas na fila inteira). */
  emAtendimento: Chamado[];
  naFila: Chamado[];
  /** Totais da fila inteira (só números, sem os registros de outros clientes). */
  totalEmAtendimento: number;
  totalNaFila: number;
  tempoMedioMin: number;
}

export interface Conhecimento {
  id: string;
  codigo: string;
  titulo: string;
  chamadoOrigemId: string;
  solucaoId: string;
  procedimento: string[];
  validadoPor: string;
  validadoEm: string;
  usos: number;
}

// ---------- Jobs (operações longas) ----------

export type EstadoJob = 'PENDENTE' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'FALHOU';

export interface Job {
  id: string;
  /** Tarefa do job real (`requisitos`, `sugestao_suporte`). Jobs simulados não têm. */
  tarefa?: string;
  estado: EstadoJob;
  percentual: number;
  etapa: string;
  /** Mensagem já tratada pelo backend quando FALHOU. */
  erro?: string;
  /** Só quando CONCLUIDO (job real). Formato depende da tarefa (ver claude/front/contratos.md). */
  resultado?: unknown;
  /** Modelo de IA que executou (job real, CONCLUIDO). */
  modelo?: string;
}

/** GET /api/v1/ia/status (rota real no Django). */
export interface StatusIa {
  provedor: string;
  modelo: string;
  modelosReserva: string[];
  /** false = provedor `fake` (simulador): nada pode ser rotulado como IA. */
  real: boolean;
  cota?: { usadasHoje: number; limiteDiario: number; entrevistaMaxRodadas: number };
}

// ---------- Visão geral / transversal ----------

export interface Pendencia {
  id: string;
  texto: string;
  detalhe: string;
  acao: string;
  link: string;
  tipo: 'demanda' | 'chamado' | 'evento' | 'requisito';
}

export interface VisaoGeral {
  pendencias: Pendencia[];
  demandas: Demanda[];
  proximosEventos: Evento[];
  chamados: Chamado[];
  numeros: { demandasAtivas: number; naFila: number; validacoesPendentes: number; entregues: number };
  /** Indicadores do painel, sempre calculados sobre o que o usuário pode ver (CLAUDE.md §18: nunca inventados). */
  indicadores: Indicadores;
}

export interface Indicadores {
  /** Quantidade de demandas em cada etapa, na ordem de ETAPAS (labels.ts). */
  demandasPorEtapa: number[];
  chamados: { naFila: number; emAtendimento: number; resolvidos: number };
  /** Decisões humanas sobre requisitos sugeridos. */
  requisitos: { aprovados: number; editados: number; rejeitados: number; aguardando: number };
  /** Últimas 8 semanas (mais antiga primeiro). `inicio` = segunda-feira da semana. */
  semanas: { inicio: string; demandas: number; chamados: number }[];
}

export interface Notificacao {
  id: string;
  texto: string;
  quando: string;
  link: string;
  lida: boolean;
}

export interface ResultadoBusca {
  tipo: 'Demanda' | 'Atividade' | 'Solução' | 'Chamado' | 'Evento';
  codigo: string;
  titulo: string;
  link: string;
}

/** Usuário na gestão de usuários (GET /usuarios, só administrador). Rota real no Django. */
export interface UsuarioGestao {
  id: string;
  usuario: string;
  nome: string;
  email: string;
  organizacao: string;
  perfil: Perfil;
  admin: boolean;
  ativo: boolean;
  ultimoAcesso: string | null;
  criadoEm: string;
}

export interface ErroApi {
  mensagem: string;
  campos?: Record<string, string[]>;
  /** Código estável de alguns erros (ex.: 429 de cota: IA_COTA_DIARIA, IA_RODADAS_ESGOTADAS, IA_COTA_ALVO). */
  codigo?: string;
}
