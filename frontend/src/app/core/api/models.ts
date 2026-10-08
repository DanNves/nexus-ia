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
}

export interface Pergunta {
  id: string;
  enunciado: string;
  ajuda?: string;
  multipla: boolean;
  opcoes: OpcaoPergunta[];
}

export interface RespostaEntrevista {
  perguntaId: string;
  enunciado: string;
  valores: string[];
  rotulos: string[];
  outro?: string;
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
  conhecimentoId?: string;
  historico: ItemHistorico[];
}

export interface FilaResumo {
  emAtendimento: Chamado[];
  naFila: Chamado[];
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
  estado: EstadoJob;
  percentual: number;
  etapa: string;
  erro?: string;
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

export interface ErroApi {
  mensagem: string;
  campos?: Record<string, string[]>;
}
