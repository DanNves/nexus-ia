// Conteúdo do tour de ajuda (<nx-ajuda>). Só texto e seletores: nada aqui acessa o DOM.
// Os seletores do topo vêm de app.component.html; os das páginas usam atributos data-tour.

export interface PassoTour {
  id: string;
  /** Elemento a destacar. Se não existir ou estiver invisível, tenta `alternativa`; senão, balão centralizado. */
  seletor: string;
  titulo: string;
  texto: string;
  /** Usado quando o elemento principal está escondido (ex.: navbar recolhida em telas estreitas). */
  alternativa?: { seletor: string; dica: string };
}

const MENU_MOBILE = {
  seletor: 'button[aria-label="Abrir menu"]',
  dica: 'Nesta largura de tela, as abas ficam no botão de menu.',
};

function passosGlobais(equipe: boolean): PassoTour[] {
  return [
    {
      id: 'visao-geral',
      seletor: '.nav a[href="/visao-geral"]',
      titulo: 'Visão geral',
      texto: equipe
        ? 'O resumo do dia da equipe: solicitações novas, validações pendentes, reuniões marcadas e demandas em andamento.'
        : 'Seu ponto de partida. Mostra suas demandas, em que etapa cada uma está e o que está esperando uma ação sua.',
      alternativa: MENU_MOBILE,
    },
    {
      id: 'demandas',
      seletor: '.nav a[href="/demandas"]',
      titulo: 'Demandas',
      texto: equipe
        ? 'Todas as demandas dos clientes e as atividades da equipe. Abra uma demanda para avaliar se é possível fazer, validar o que a IA sugeriu e acompanhar os requisitos.'
        : 'Tudo o que você já pediu. Cada demanda guarda a sua necessidade, as respostas da entrevista, o protótipo, a solicitação e o documento de requisitos.',
      alternativa: MENU_MOBILE,
    },
    {
      id: 'calendario',
      seletor: '.nav a[href="/calendario"]',
      titulo: 'Calendário',
      texto: equipe
        ? 'Reuniões para validar as regras com o cliente, prazos, sprints e entregas. Marque aqui os compromissos de cada demanda.'
        : 'As datas combinadas com a equipe, como a reunião para validar as regras do seu sistema, prazos e entregas.',
      alternativa: MENU_MOBILE,
    },
    {
      id: 'solucoes',
      seletor: '.nav a[href="/solucoes"]',
      titulo: 'Soluções',
      texto:
        'Os sistemas já entregues e suas versões. Cada versão lembra de qual demanda veio e quais chamados recebeu: é a ponte entre o desenvolvimento e o suporte.',
      alternativa: MENU_MOBILE,
    },
    {
      id: 'fila',
      seletor: '.nav a[href="/fila"]',
      titulo: 'Fila',
      texto: equipe
        ? 'Os chamados de suporte por ordem de impacto. Ao atender, o NEXUS reúne o histórico da solução e a IA sugere um caminho; uma pessoa sempre valida antes de concluir.'
        : 'Acompanhe a posição do seu chamado na fila de atendimento e quanto falta para ele ser atendido.',
      alternativa: MENU_MOBILE,
    },
    {
      id: 'buscar',
      seletor: '.busca-gatilho',
      titulo: 'Buscar',
      texto: 'Encontre qualquer demanda, chamado ou solução pelo nome ou pelo código. Atalho: Ctrl K.',
    },
    {
      id: 'notificacoes',
      seletor: 'button[aria-label="Notificações"]',
      titulo: 'Notificações',
      texto: equipe
        ? 'Avisos do que mudou: solicitação nova, conteúdo aguardando validação, chamado aberto. O ponto vermelho indica que há algo não lido.'
        : 'Avisos do que mudou: resposta da equipe, reunião marcada, documento disponível. O ponto vermelho indica que há algo não lido.',
    },
    {
      id: 'nova-demanda',
      seletor: '.btn-nova',
      titulo: 'Nova demanda',
      texto: equipe
        ? 'Abre uma demanda pelo mesmo caminho do cliente: descrição da necessidade, ata em .txt e entrevista guiada.'
        : 'Comece aqui quando precisar de algo novo. Você descreve o que precisa (ou anexa a ata da reunião em .txt) e o NEXUS faz perguntas simples, com opções, para entender o que se encaixa.',
      alternativa: MENU_MOBILE,
    },
    {
      id: 'usuario',
      seletor: '.usuario',
      titulo: 'Seu menu',
      texto: 'Veja com qual conta você entrou, ligue o modo escuro ou saia do NEXUS.',
    },
  ];
}

function passosListaDemandas(equipe: boolean): PassoTour[] {
  return [
    {
      id: 'aba-demandas',
      seletor: '[data-tour="aba-demandas"]',
      titulo: 'Aba Demandas',
      texto: 'A lista do que foi pedido, com a etapa de cada demanda. Clique em uma para ver tudo o que ela guarda.',
    },
    {
      id: 'aba-atividades',
      seletor: '[data-tour="aba-atividades"]',
      titulo: 'Aba Atividades',
      texto: equipe
        ? 'As tarefas da equipe para entregar as demandas, em quadro (por situação) ou em lista.'
        : 'O trabalho que a equipe está fazendo para entregar as suas demandas, em quadro ou em lista.',
    },
  ];
}

function passosDetalheDemanda(equipe: boolean): PassoTour[] {
  return [
    {
      id: 'etapas',
      seletor: '[data-tour="etapas"]',
      titulo: 'Etapas da demanda',
      texto: 'A linha mostra o caminho da demanda, da necessidade ao documento de requisitos, e em que ponto ela está agora.',
    },
    {
      id: 'aba-resumo',
      seletor: '[data-tour="aba-resumo"]',
      titulo: 'Resumo',
      texto: 'Uma visão rápida: o que foi pedido, quem está envolvido, a solução recomendada e o histórico do que já aconteceu.',
    },
    {
      id: 'aba-levantamento',
      seletor: '[data-tour="aba-levantamento"]',
      titulo: 'Levantamento',
      texto: equipe
        ? 'A necessidade contada pelo cliente e as respostas da entrevista guiada, com o tipo de solução recomendado e os sinais que pesaram na escolha.'
        : 'Onde você responde a entrevista guiada: perguntas simples, uma por vez, com opções ou "Outro". Suas respostas indicam o tipo de solução que faz sentido (web, desktop, rotina agendada…).',
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
export function passosDoTour(url: string, equipe: boolean): PassoTour[] {
  const caminho = url.split(/[?#]/)[0].replace(/\/+$/, '');
  const passos = passosGlobais(equipe);
  if (caminho === '/demandas') return [...passos, ...passosListaDemandas(equipe)];
  if (/^\/demandas\/(?!nova$)[^/]+(\/[^/]+)?$/.test(caminho)) return [...passos, ...passosDetalheDemanda(equipe)];
  return passos;
}
