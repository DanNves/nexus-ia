// Conteúdo do tour de ajuda (<nx-ajuda>). Só texto e seletores: nada aqui acessa o DOM.
// Os seletores da casca vêm de app.component.html (itens do menu lateral: data-tour="menu-<id>");
// os das páginas usam atributos data-tour. Itens do menu por visão: shared/perfis.ts.
import { ChavePagina, ROTULO_VISAO, menuDa } from '../perfis';

export interface PassoTour {
  id: string;
  /** Elemento a destacar. Se não existir ou estiver invisível, tenta `alternativa`; senão, balão centralizado. */
  seletor: string;
  titulo: string;
  texto: string;
  /** Usado quando o elemento principal está escondido (ex.: menu lateral fechado em telas estreitas). */
  alternativa?: { seletor: string; dica: string };
}

const MENU_MOBILE = {
  seletor: '[data-tour="alternar-menu"]',
  dica: 'Nesta largura de tela, o menu lateral abre por este botão.',
};

export interface OpcoesTour { equipe: boolean; podeAlternarVisao: boolean; admin: boolean }

/** O que cada item do menu lateral faz, por visão (solicitante × equipe). */
const TEXTO_ITEM: Partial<Record<ChavePagina, { solicitante?: string; equipe?: string }>> = {
  'visao-geral': {
    solicitante: 'Seu ponto de partida. Mostra suas demandas, em que etapa cada uma está e o que está esperando uma ação sua.',
    equipe: 'O resumo do dia da equipe: solicitações novas, validações pendentes, reuniões marcadas e demandas em andamento.',
  },
  demandas: {
    solicitante: 'Tudo o que você já pediu. Cada demanda guarda a sua necessidade, as respostas da entrevista, o protótipo, a solicitação e o documento de requisitos.',
    equipe: 'Todas as demandas dos solicitantes. Abra uma demanda para avaliar se é possível fazer, validar o que a IA sugeriu e acompanhar os requisitos.',
  },
  'nova-demanda': {
    solicitante: 'Comece aqui quando precisar de algo novo. Você descreve o que precisa (ou anexa a ata da reunião em .txt) e o NEXUS faz perguntas simples, com opções, para entender o que se encaixa.',
  },
  atividades: {
    equipe: 'As tarefas da equipe para entregar as demandas, em quadro (por situação) ou em lista. Só a equipe vê.',
  },
  calendario: {
    solicitante: 'Sua agenda com a equipe: a reunião para validar as regras do seu sistema, prazos e entregas.',
    equipe: 'Reuniões para validar as regras com o solicitante, prazos, sprints e entregas. Marque aqui os compromissos de cada demanda.',
  },
  solucoes: {
    solicitante: 'Os sistemas que a equipe já entregou para você e as versões de cada um. Daqui você abre um chamado se algo não funcionar.',
    equipe: 'Os sistemas já entregues e suas versões. Cada versão lembra de qual demanda veio e quais chamados recebeu: é a ponte entre o desenvolvimento e o suporte.',
  },
  fila: {
    solicitante: 'Seus chamados de suporte: a posição de cada um na fila de atendimento e quanto falta para ser atendido.',
    equipe: 'Os chamados de suporte por ordem de impacto. Ao atender, o NEXUS reúne o histórico da solução e a IA sugere um caminho; uma pessoa sempre valida antes de concluir.',
  },
  usuarios: {
    equipe: 'Só para administradores: cadastre pessoas, defina quem é solicitante e quem é da equipe responsável, desative contas e redefina senhas.',
  },
};

function passosGlobais({ equipe, podeAlternarVisao, admin }: OpcoesTour): PassoTour[] {
  const passos: PassoTour[] = [];

  // Primeiro passo para quem é da equipe: deixar claro de que lado está.
  if (podeAlternarVisao) {
    passos.push({
      id: 'visao',
      seletor: '[data-tour="visao"]',
      titulo: `${ROTULO_VISAO.CLIENTE} ou ${ROTULO_VISAO.EQUIPE.toLowerCase()}?`,
      texto: equipe
        ? `Você está na visão da EQUIPE responsável (linha roxa no topo): solicitações, validações e atendimento. Clique em "${ROTULO_VISAO.CLIENTE}" para ver o NEXUS exatamente como quem pede a solução vê.`
        : `Você está na visão do SOLICITANTE: vê só o que quem pede a solução veria e pode abrir demandas. Clique em "${ROTULO_VISAO.EQUIPE}" para voltar ao trabalho da equipe.`,
    });
  }

  passos.push({
    id: 'menu',
    seletor: '#menu-lateral .sidebar-nav',
    titulo: 'Menu lateral',
    texto: equipe
      ? 'O menu da equipe responsável, em seções: Projetos (demandas, atividades e calendário), Pós-entrega (soluções e fila de atendimento)' + (admin ? ' e Administração.' : '.') + ' O botão no alto do cabeçalho recolhe o menu para ficar só com os ícones.'
      : 'O menu do solicitante, em seções: Meus pedidos (suas demandas e uma nova) e Acompanhamento (agenda, soluções entregues e chamados). O botão no alto do cabeçalho recolhe o menu para ficar só com os ícones.',
    alternativa: MENU_MOBILE,
  });

  for (const secao of menuDa(equipe ? 'EQUIPE' : 'CLIENTE', admin)) {
    for (const item of secao.itens) {
      const texto = TEXTO_ITEM[item.id]?.[equipe ? 'equipe' : 'solicitante'];
      if (!texto) continue;
      passos.push({
        id: item.id,
        seletor: `[data-tour="menu-${item.id}"]`,
        titulo: secao.titulo ? `${secao.titulo} · ${item.rotulo}` : item.rotulo,
        texto,
        alternativa: MENU_MOBILE,
      });
    }
  }

  passos.push(
    {
      id: 'busca',
      seletor: '.cabecalho-busca',
      titulo: 'Buscar',
      texto: equipe
        ? 'Encontre qualquer demanda, chamado ou solução pelo código ou pelo nome. Atalho: Ctrl K.'
        : 'Encontre suas demandas, chamados e soluções pelo código ou pelo nome. Atalho: Ctrl K.',
    },
    {
      id: 'notificacoes',
      seletor: 'button[aria-label="Notificações"]',
      titulo: 'Notificações',
      texto: equipe
        ? 'Avisos do que mudou: solicitação nova, conteúdo aguardando validação, chamado aberto. O ponto vermelho indica que há algo não lido.'
        : 'Avisos sobre o que é seu: resposta da equipe à sua solicitação, reunião marcada, requisito aprovado, chamado em atendimento ou resolvido. O ponto vermelho indica que há algo não lido.',
    },
    {
      id: 'usuario',
      seletor: '.usuario',
      titulo: 'Seu menu',
      texto: 'Veja com qual conta você entrou e o seu perfil, ligue o modo escuro ou saia do NEXUS. Seu nome e perfil também ficam no rodapé do menu lateral.',
    },
  );
  return passos;
}

function passosListaDemandas(equipe: boolean): PassoTour[] {
  const passos: PassoTour[] = [
    {
      id: 'aba-demandas',
      seletor: '[data-tour="aba-demandas"]',
      titulo: 'Aba Demandas',
      texto: equipe
        ? 'A lista do que foi pedido, com a etapa de cada demanda. Clique em uma para ver tudo o que ela guarda.'
        : 'A lista do que você pediu, com a etapa de cada demanda. Clique em uma para ver tudo o que ela guarda.',
    },
  ];
  // Atividades são o quadro interno da equipe; o solicitante não vê a aba.
  if (equipe) {
    passos.push({
      id: 'aba-atividades',
      seletor: '[data-tour="aba-atividades"]',
      titulo: 'Aba Atividades',
      texto: 'As tarefas da equipe para entregar as demandas, em quadro (por situação) ou em lista.',
    });
  }
  return passos;
}

function passosDetalheDemanda(equipe: boolean): PassoTour[] {
  return [
    {
      id: 'etapas',
      seletor: '[data-tour="etapas"]',
      titulo: 'Etapas da demanda',
      texto: 'O caminho da demanda, em ordem: levantamento, protótipo, solicitação, requisitos e documento. Clique numa etapa para abri-la. O número azul marca a etapa atual, o ✓ as concluídas, e a linha de baixo diz a situação de cada uma.',
    },
    {
      id: 'aba-resumo',
      seletor: '[data-tour="aba-resumo"]',
      titulo: 'Resumo',
      texto: 'Comece por aqui: o aviso no topo diz o que fazer agora. Abaixo, o que foi pedido, quem está envolvido, a solução recomendada e o histórico.',
    },
    {
      id: 'aba-levantamento',
      seletor: '[data-tour="aba-levantamento"]',
      titulo: 'Levantamento',
      texto: equipe
        ? 'A necessidade contada pelo solicitante e as respostas da entrevista guiada (perguntas sugeridas pela IA em rodadas, ou do roteiro padrão quando ela não está disponível), com o tipo de solução calculado por regra e os sinais que pesaram na escolha.'
        : 'Onde você responde a entrevista guiada: perguntas simples, uma por vez, com opções, "Outro" ou "Não sei". A IA prepara as perguntas em poucas rodadas a partir do que você contou; se ela não estiver disponível, seguimos com um roteiro padrão. Suas respostas indicam, por uma regra fixa, o tipo de solução que faz sentido (web, desktop, rotina agendada…).',
    },
    {
      id: 'aba-prototipo',
      seletor: '[data-tour="aba-prototipo"]',
      titulo: 'Protótipo',
      texto: equipe
        ? 'Telas de exemplo montadas pelo simulador de demonstração a partir do tipo de solução. Revise e valide: até lá, elas ficam marcadas como sugestão.'
        : 'Telas de exemplo de como o seu sistema pode ficar, montadas pelo simulador de demonstração. É uma sugestão ainda não validada; a equipe revisa depois que você enviar a solicitação.',
    },
    {
      id: 'aba-solicitacao',
      seletor: '[data-tour="aba-solicitacao"]',
      titulo: 'Solicitação',
      texto: equipe
        ? 'Marque se é possível fazer, agende a reunião para validar as regras e defina a metodologia e as datas.'
        : 'Quando o levantamento estiver pronto, escolha: deixar em stand-by para decidir depois ou enviar para a equipe. Aqui você acompanha a resposta.',
    },
    {
      id: 'aba-requisitos',
      seletor: '[data-tour="aba-requisitos"]',
      titulo: 'Requisitos',
      texto: equipe
        ? 'Revise cada requisito proposto pela IA: aprovar, editar ou rejeitar com motivo. Nada é aprovado sozinho.'
        : 'O que o sistema deve fazer e como. A IA sugere, e uma pessoa da equipe aprova, edita ou rejeita cada requisito.',
    },
    {
      id: 'aba-documento',
      seletor: '[data-tour="aba-documento"]',
      titulo: 'Documento',
      texto: 'O documento de requisitos, montado só com o que foi aprovado: visão geral, solução escolhida, requisitos, protótipo, metodologia e datas. Pode ser impresso.',
    },
  ];
}

/** Passos do tour: abas principais primeiro e, depois, as abas da página atual (se houver). */
export function passosDoTour(url: string, opcoes: OpcoesTour): PassoTour[] {
  const { equipe } = opcoes;
  const caminho = url.split(/[?#]/)[0].replace(/\/+$/, '');
  const passos = passosGlobais(opcoes);
  if (caminho === '/demandas') return [...passos, ...passosListaDemandas(equipe)];
  if (/^\/demandas\/(?!nova$)[^/]+(\/[^/]+)?$/.test(caminho)) return [...passos, ...passosDetalheDemanda(equipe)];
  return passos;
}
