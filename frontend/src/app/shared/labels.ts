import { EstadoAtividade, EstadoChamado, EstadoDemanda, Prioridade, TipoCenario, TipoEvento } from '../core/api/models';

export type Tom = 'azul' | 'verde' | 'laranja' | 'roxo' | 'cinza' | 'vermelho';

export const ESTADO_DEMANDA: Record<EstadoDemanda, { rotulo: string; tom: Tom }> = {
  RASCUNHO: { rotulo: 'Rascunho', tom: 'cinza' },
  EM_LEVANTAMENTO: { rotulo: 'Em levantamento', tom: 'azul' },
  STAND_BY: { rotulo: 'Stand-by', tom: 'cinza' },
  SOLICITADO: { rotulo: 'Aguardando análise', tom: 'laranja' },
  EM_ANALISE: { rotulo: 'Em análise', tom: 'laranja' },
  INVIAVEL: { rotulo: 'Inviável', tom: 'vermelho' },
  REUNIAO_AGENDADA: { rotulo: 'Reunião agendada', tom: 'roxo' },
  PLANEJADO: { rotulo: 'Planejado', tom: 'roxo' },
  EM_DESENVOLVIMENTO: { rotulo: 'Em desenvolvimento', tom: 'azul' },
  ENTREGUE: { rotulo: 'Entregue', tom: 'verde' },
};

export const ETAPAS = ['Levantamento', 'Solicitação', 'Análise', 'Planejamento', 'Desenvolvimento', 'Entregue'] as const;

export function etapaAtual(e: EstadoDemanda): number {
  switch (e) {
    case 'RASCUNHO': case 'EM_LEVANTAMENTO': case 'STAND_BY': return 0;
    case 'SOLICITADO': return 1;
    case 'EM_ANALISE': case 'INVIAVEL': case 'REUNIAO_AGENDADA': return 2;
    case 'PLANEJADO': return 3;
    case 'EM_DESENVOLVIMENTO': return 4;
    case 'ENTREGUE': return 5;
  }
}

export const ESTADO_ATIVIDADE: Record<EstadoAtividade, { rotulo: string; tom: Tom }> = {
  A_FAZER: { rotulo: 'A fazer', tom: 'cinza' },
  EM_DESENVOLVIMENTO: { rotulo: 'Em desenvolvimento', tom: 'azul' },
  EM_REVISAO: { rotulo: 'Em revisão', tom: 'roxo' },
  CONCLUIDA: { rotulo: 'Concluída', tom: 'verde' },
};

export const ESTADO_CHAMADO: Record<EstadoChamado, { rotulo: string; tom: Tom }> = {
  NA_FILA: { rotulo: 'Na fila', tom: 'laranja' },
  EM_ATENDIMENTO: { rotulo: 'Em atendimento', tom: 'azul' },
  RESOLVIDO: { rotulo: 'Resolvido', tom: 'verde' },
};

export const PRIORIDADE: Record<Prioridade, { rotulo: string; tom: Tom }> = {
  ALTA: { rotulo: 'Alta', tom: 'vermelho' },
  MEDIA: { rotulo: 'Média', tom: 'laranja' },
  BAIXA: { rotulo: 'Baixa', tom: 'cinza' },
};

export const IMPACTO_CURTO: Record<Prioridade, string> = { ALTA: 'alto', MEDIA: 'médio', BAIXA: 'baixo' };

export const IMPACTO: Record<Prioridade, string> = {
  ALTA: 'Estou parado, não consigo trabalhar',
  MEDIA: 'Atrapalha, mas consigo contornar',
  BAIXA: 'Incômodo pequeno',
};

export const TIPO_EVENTO: Record<TipoEvento, { rotulo: string; tom: Tom }> = {
  REUNIAO: { rotulo: 'Reunião', tom: 'azul' },
  PRAZO: { rotulo: 'Prazo', tom: 'laranja' },
  ENTREGA: { rotulo: 'Entrega', tom: 'verde' },
  ITERACAO: { rotulo: 'Sprint', tom: 'roxo' },
};

export const CENARIO: Record<TipoCenario, { nome: string; resumo: string; icone: string }> = {
  WEB: { nome: 'Aplicação web', resumo: 'Acessada pelo navegador, no computador ou no celular.', icone: 'globe' },
  DESKTOP: { nome: 'Software desktop', resumo: 'Instalado no computador, funciona mesmo sem internet.', icone: 'monitor' },
  MOBILE: { nome: 'Aplicativo mobile', resumo: 'Instalado no celular, usa recursos como localização.', icone: 'phone' },
  JOB: { nome: 'Rotina automática', resumo: 'Roda sozinha em horários definidos, sem tela para operar.', icone: 'clock' },
  API: { nome: 'API / integração', resumo: 'Conecta sistemas que já existem e troca dados entre eles.', icone: 'plug' },
};

// ---------- Datas ----------

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function dataCurta(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function hora(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function dataHora(iso?: string) {
  if (!iso) return '';
  return `${dataCurta(iso)}, ${hora(iso)}`;
}

export function diaRelativo(iso: string) {
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  const h = new Date(); h.setHours(0, 0, 0, 0);
  const dif = Math.round((d.getTime() - h.getTime()) / 86_400_000);
  if (dif === 0) return 'Hoje';
  if (dif === 1) return 'Amanhã';
  if (dif === -1) return 'Ontem';
  if (dif > 1 && dif < 7) return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^./, (c) => c.toUpperCase());
  return dataCurta(iso);
}

export function relativo(iso?: string) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

export function duracao(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function paraInputData(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function paraInputDataHora(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${paraInputData(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
