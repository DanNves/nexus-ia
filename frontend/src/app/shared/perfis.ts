// Fonte única dos perfis na interface: rótulos, menu lateral por visão e títulos das páginas.
// Os valores de código continuam CLIENTE / EQUIPE (+ admin); só o que aparece na tela mora aqui.
//
//  - Solicitante (CLIENTE): pede a solução, responde a entrevista, acompanha, recebe o documento e abre chamados.
//  - Equipe responsável (EQUIPE): avalia solicitações, valida artefatos, toca atividades e atende a fila.
//  - Administrador (EQUIPE + admin): o que a equipe faz + gestão de usuários.
import { Perfil } from '../core/api/models';

/** Nome curto da visão (seletor do cabeçalho, selo do menu). */
export const ROTULO_VISAO: Record<Perfil, string> = { CLIENTE: 'Solicitante', EQUIPE: 'Equipe' };

/** Nome completo do perfil (cadastro, listas de usuários, menu do usuário). */
export const ROTULO_PERFIL = { CLIENTE: 'Solicitante', EQUIPE: 'Equipe responsável', ADMIN: 'Administrador' } as const;

/** Linha de papel abaixo do nome: "Solicitante · Clínica Bem Viver", "Equipe responsável · administrador". */
export function papelDe(u: { perfil: Perfil; admin: boolean; organizacao?: string }): string {
  if (u.perfil === 'EQUIPE') return u.admin ? `${ROTULO_PERFIL.EQUIPE} · administrador` : ROTULO_PERFIL.EQUIPE;
  return u.organizacao ? `${ROTULO_PERFIL.CLIENTE} · ${u.organizacao}` : ROTULO_PERFIL.CLIENTE;
}

/** Aviso ao trocar de visão (toast). */
export const AVISO_VISAO: Record<Perfil, string> = {
  CLIENTE: 'Visão do solicitante: você vê o NEXUS como quem pede a solução.',
  EQUIPE: 'Visão da equipe: solicitações, validações e atendimento.',
};

// ---------------------------------------------------------------- Páginas

export type ChavePagina =
  | 'visao-geral' | 'demandas' | 'atividades' | 'nova-demanda' | 'demanda'
  | 'calendario' | 'solucoes' | 'solucao' | 'fila' | 'chamado' | 'usuarios';

interface TextoPagina { titulo: string; subtitulo: string }

const PAGINAS: Record<ChavePagina, Record<Perfil, TextoPagina>> = {
  'visao-geral': {
    CLIENTE: { titulo: 'Visão geral', subtitulo: 'Seu painel: o andamento dos seus pedidos e chamados.' },
    EQUIPE: { titulo: 'Visão geral', subtitulo: 'Painel da equipe: o que entrou, o que espera validação e como está o atendimento.' },
  },
  demandas: {
    CLIENTE: { titulo: 'Minhas demandas', subtitulo: 'Tudo o que você pediu e em que etapa cada pedido está.' },
    EQUIPE: { titulo: 'Demandas', subtitulo: 'Tudo o que foi pedido pelos solicitantes e o trabalho para entregar.' },
  },
  atividades: {
    CLIENTE: { titulo: 'Minhas demandas', subtitulo: 'Tudo o que você pediu e em que etapa cada pedido está.' },
    EQUIPE: { titulo: 'Atividades', subtitulo: 'As tarefas da equipe para entregar as demandas, em quadro ou em lista.' },
  },
  'nova-demanda': {
    CLIENTE: { titulo: 'Nova demanda', subtitulo: 'Conte o que você precisa. Depois, o NEXUS faz perguntas simples para entender o resto.' },
    EQUIPE: { titulo: 'Nova demanda', subtitulo: 'Conte o que você precisa. Depois, o NEXUS faz perguntas simples para entender o resto.' },
  },
  demanda: {
    CLIENTE: { titulo: 'Demanda', subtitulo: '' },
    EQUIPE: { titulo: 'Demanda', subtitulo: '' },
  },
  calendario: {
    CLIENTE: { titulo: 'Agenda', subtitulo: 'As datas combinadas com a equipe: reuniões, prazos e entregas dos seus pedidos.' },
    EQUIPE: { titulo: 'Calendário', subtitulo: 'Reuniões, prazos, sprints e entregas de todas as demandas.' },
  },
  solucoes: {
    CLIENTE: { titulo: 'Minhas soluções', subtitulo: 'O que já foi entregue para você e as versões publicadas, incluindo as soluções em que você é observador.' },
    EQUIPE: { titulo: 'Soluções', subtitulo: 'O que já foi entregue e as versões publicadas: a ponte entre o desenvolvimento e o suporte.' },
  },
  solucao: {
    CLIENTE: { titulo: 'Solução', subtitulo: '' },
    EQUIPE: { titulo: 'Solução', subtitulo: '' },
  },
  fila: {
    CLIENTE: { titulo: 'Meus chamados', subtitulo: 'Acompanhe onde seu chamado está e quanto falta para ser atendido.' },
    EQUIPE: { titulo: 'Fila de atendimento', subtitulo: 'Chamados por ordem de atendimento: primeiro o impacto, depois a hora de abertura.' },
  },
  chamado: {
    CLIENTE: { titulo: 'Chamado', subtitulo: '' },
    EQUIPE: { titulo: 'Chamado', subtitulo: '' },
  },
  usuarios: {
    CLIENTE: { titulo: 'Usuários', subtitulo: '' },
    EQUIPE: {
      titulo: 'Usuários',
      subtitulo: 'Quem acessa o NEXUS e o que cada pessoa pode fazer. Solicitantes veem só os próprios pedidos; a equipe responsável avalia e valida; administradores também gerenciam esta lista.',
    },
  },
};

export function textoPagina(chave: ChavePagina, visao: Perfil): TextoPagina {
  return PAGINAS[chave][visao];
}

// ---------------------------------------------------------------- Menu lateral

export interface ItemMenu {
  /** Usado no data-tour do item (`menu-<id>`) e na trilha do cabeçalho. */
  id: ChavePagina;
  rotulo: string;
  link: string;
  query?: Record<string, string>;
  icone: string;
}

export interface SecaoMenu {
  /** Seção sem título = itens soltos no topo (Visão geral). */
  titulo: string | null;
  itens: ItemMenu[];
}

export function menuDa(visao: Perfil, admin: boolean): SecaoMenu[] {
  const visaoGeral: SecaoMenu = { titulo: null, itens: [{ id: 'visao-geral', rotulo: 'Visão geral', link: '/visao-geral', icone: 'home' }] };
  if (visao === 'CLIENTE') {
    return [
      visaoGeral,
      {
        titulo: 'Meus pedidos',
        itens: [
          { id: 'demandas', rotulo: 'Minhas demandas', link: '/demandas', icone: 'demand' },
          { id: 'nova-demanda', rotulo: 'Nova demanda', link: '/demandas/nova', icone: 'plus' },
        ],
      },
      {
        titulo: 'Acompanhamento',
        itens: [
          { id: 'calendario', rotulo: 'Agenda', link: '/calendario', icone: 'calendar' },
          { id: 'solucoes', rotulo: 'Minhas soluções', link: '/solucoes', icone: 'layers' },
          { id: 'fila', rotulo: 'Meus chamados', link: '/fila', icone: 'queue' },
        ],
      },
    ];
  }
  const secoes: SecaoMenu[] = [
    visaoGeral,
    {
      titulo: 'Projetos',
      itens: [
        { id: 'demandas', rotulo: 'Demandas', link: '/demandas', icone: 'demand' },
        { id: 'atividades', rotulo: 'Atividades', link: '/demandas', query: { aba: 'atividades' }, icone: 'board' },
        { id: 'calendario', rotulo: 'Calendário', link: '/calendario', icone: 'calendar' },
      ],
    },
    {
      titulo: 'Pós-entrega',
      itens: [
        { id: 'solucoes', rotulo: 'Soluções', link: '/solucoes', icone: 'layers' },
        { id: 'fila', rotulo: 'Fila de atendimento', link: '/fila', icone: 'queue' },
      ],
    },
  ];
  if (admin) secoes.push({ titulo: 'Administração', itens: [{ id: 'usuarios', rotulo: 'Usuários', link: '/usuarios', icone: 'users' }] });
  return secoes;
}

/** Em que página a URL está (chave de PAGINAS). `/demandas?aba=atividades` conta como Atividades. */
export function paginaDaUrl(url: string): ChavePagina | null {
  const [caminho, busca = ''] = url.split('#')[0].split('?');
  const partes = caminho.replace(/\/+$/, '').split('/').filter(Boolean);
  const aba = new URLSearchParams(busca).get('aba');
  switch (partes[0]) {
    case 'visao-geral': return 'visao-geral';
    case 'demandas':
      if (partes.length === 1) return aba === 'atividades' ? 'atividades' : 'demandas';
      return partes[1] === 'nova' ? 'nova-demanda' : 'demanda';
    case 'calendario': return 'calendario';
    case 'solucoes': return partes.length > 1 ? 'solucao' : 'solucoes';
    case 'fila': return partes.length > 1 ? 'chamado' : 'fila';
    case 'usuarios': return 'usuarios';
    default: return null;
  }
}

/** Item do menu que fica ativo em cada página (detalhes acendem a lista de origem). */
const ITEM_DA_PAGINA: Record<ChavePagina, ChavePagina> = {
  'visao-geral': 'visao-geral', demandas: 'demandas', atividades: 'atividades', 'nova-demanda': 'nova-demanda',
  demanda: 'demandas', calendario: 'calendario', solucoes: 'solucoes', solucao: 'solucoes',
  fila: 'fila', chamado: 'fila', usuarios: 'usuarios',
};

export function itemAtivo(pagina: ChavePagina | null): ChavePagina | null {
  return pagina ? ITEM_DA_PAGINA[pagina] : null;
}

export interface Trilha {
  secao: string | null;
  /** Lista de origem (link) quando a página é um detalhe. */
  pai: { rotulo: string; link: string; query?: Record<string, string> } | null;
  atual: string;
}

/** Trilha do cabeçalho: "Projetos / Demandas", "Meus pedidos / Minhas demandas / Demanda". */
export function trilhaDa(pagina: ChavePagina | null, visao: Perfil, admin: boolean): Trilha | null {
  if (!pagina) return null;
  const alvo = itemAtivo(pagina);
  for (const secao of menuDa(visao, admin)) {
    const item = secao.itens.find((i) => i.id === alvo);
    if (!item) continue;
    const detalhe = alvo !== pagina;
    return {
      secao: secao.titulo,
      pai: detalhe ? { rotulo: item.rotulo, link: item.link, query: item.query } : null,
      atual: detalhe ? textoPagina(pagina, visao).titulo : item.rotulo,
    };
  }
  return { secao: null, pai: null, atual: textoPagina(pagina, visao).titulo };
}
