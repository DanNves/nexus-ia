// Simulação determinística do que ainda não tem API no Django (equivalente ao fake_adapter do backend):
// roteiro padrão da entrevista (BANCO), pontuação do cenário por sinais, protótipo, requisitos e sugestão de suporte.
// As perguntas da entrevista vêm da IA real em rodadas (tarefa `entrevista`, ver mock-entrevista.ts);
// o BANCO abaixo é o ROTEIRO PADRÃO, usado quando a IA falha ou a cota acaba (claude/front/contratos.md, 2026-11-03).
import {
  CenarioPontuado, Chamado, Conhecimento, Demanda, FonteContexto, Pergunta, RespostaEntrevista,
  Requisito, Solucao, Sugestao, TelaPrototipo, TipoCenario,
} from './models';
import {
  ItemMenu, badge, botao, cabecalhoPagina, campo, cartao, casca, celular, documento, esc, janela, kpis, tabela,
} from './prototipo-template';

type Pesos = Partial<Record<TipoCenario, number>>;

// ---------- Catálogo de sinais e pesos ----------
// ESPELHO TEMPORÁRIO de backend/apps/cenario/domain/sinais.py (CATALOGO), até o módulo cenário ter API no Django.
// Mudou lá? Atualize aqui e em claude/front/contratos.md. A IA marca em cada opção só códigos deste catálogo;
// a pontuação é regra determinística (CLAUDE.md §5.4: a IA extrai sinais, a regra pontua).
export const SINAIS: Readonly<Record<string, { motivo: string; pesos: Pesos }>> = {
  USO_INDIVIDUAL: { motivo: 'Uso individual', pesos: { DESKTOP: 2, WEB: 1 } },
  EQUIPE_INTERNA: { motivo: 'Usado por uma equipe interna', pesos: { WEB: 2, DESKTOP: 2 } },
  PUBLICO_EXTERNO: { motivo: 'Usado por pessoas de fora da organização', pesos: { WEB: 3, MOBILE: 2 } },
  SEM_OPERADOR: { motivo: 'Funciona sem ninguém operando', pesos: { JOB: 4, API: 2 } },
  USO_COMPUTADOR: { motivo: 'Uso no computador', pesos: { DESKTOP: 3, WEB: 2 } },
  USO_CELULAR: { motivo: 'Uso principal no celular', pesos: { MOBILE: 4, WEB: 1 } },
  USO_MULTIPLATAFORMA: { motivo: 'Precisa funcionar no computador e no celular', pesos: { WEB: 4, MOBILE: 1 } },
  USO_EM_CAMPO: { motivo: 'Uso em campo, fora do escritório', pesos: { MOBILE: 5 } },
  PRECISA_OFFLINE: { motivo: 'Precisa funcionar sem internet', pesos: { DESKTOP: 4, MOBILE: 2 } },
  INTERNET_INSTAVEL: { motivo: 'Internet instável', pesos: { DESKTOP: 2, MOBILE: 1 } },
  INTERNET_DISPONIVEL: { motivo: 'Internet sempre disponível', pesos: { WEB: 2 } },
  PERIFERICOS_LOCAIS: { motivo: 'Usa equipamento ligado ao computador (leitor, impressora)', pesos: { DESKTOP: 2 } },
  SEM_PERIFERICOS: { motivo: 'Sem equipamentos especiais', pesos: { WEB: 1 } },
  LOCALIZACAO: { motivo: 'Usa a localização do aparelho', pesos: { MOBILE: 3 } },
  USO_CAMERA: { motivo: 'Usa a câmera do aparelho (fotos, leitura de códigos)', pesos: { MOBILE: 2 } },
  AVISO_NO_CELULAR: { motivo: 'Precisa de avisos no celular', pesos: { MOBILE: 2 } },
  USO_CONTINUO: { motivo: 'Uso contínuo', pesos: { WEB: 1, DESKTOP: 1, MOBILE: 1 } },
  EXECUCAO_AGENDADA: { motivo: 'Acontece todo dia em horário fixo', pesos: { JOB: 4 } },
  EXECUCAO_PERIODICA: { motivo: 'Acontece em datas fixas', pesos: { JOB: 3 } },
  SOB_DEMANDA: { motivo: 'Acontece sob demanda', pesos: { WEB: 1, API: 1 } },
  RESULTADO_EMAIL: { motivo: 'Entrega o resultado por e-mail', pesos: { JOB: 2 } },
  RESULTADO_ARQUIVO: { motivo: 'Gera arquivos automaticamente', pesos: { JOB: 2 } },
  RESULTADO_OUTRO_SISTEMA: { motivo: 'Troca dados com outro sistema', pesos: { API: 4, JOB: 1 } },
  INTEGRA_SISTEMA: { motivo: 'Integra com um sistema existente', pesos: { API: 2, WEB: 1 } },
  POUCOS_USUARIOS: { motivo: 'Poucos usuários simultâneos', pesos: { DESKTOP: 1 } },
  DEZENAS_USUARIOS: { motivo: 'Dezenas de usuários simultâneos', pesos: { WEB: 2 } },
  MUITOS_USUARIOS: { motivo: 'Muitos usuários simultâneos', pesos: { WEB: 3 } },
};

/** Igual a `PESO_MINIMO_MOTIVO` do backend: o motivo só aparece no cenário em que o sinal pesa pelo menos isto. */
const PESO_MINIMO_MOTIVO = 2;

export const ehSinal = (s: unknown): s is string => typeof s === 'string' && Object.prototype.hasOwnProperty.call(SINAIS, s);

/** Só códigos do catálogo, sem repetição, na ordem em que vieram (igual a `filtrar` do backend). */
export function filtrarSinais(sinais: unknown): string[] {
  return Array.isArray(sinais) ? [...new Set(sinais.filter(ehSinal))] : [];
}

// ---------- Roteiro padrão (BANCO) ----------

interface PerguntaBanco extends Pergunta {
  quando?: (r: Map<string, string[]>) => boolean;
  /** Equivalência opção → sinais (contrato de 2026-11-03). Opção sem entrada não gera sinal. */
  sinais: Record<string, string[]>;
}

const tem = (r: Map<string, string[]>, id: string, ...valores: string[]) =>
  (r.get(id) ?? []).some((v) => valores.includes(v));

const BANCO: PerguntaBanco[] = [
  {
    id: 'usuarios', enunciado: 'Quem vai usar o sistema no dia a dia?', ajuda: 'Pode escolher mais de uma opção.', multipla: true,
    opcoes: [
      { valor: 'so_eu', rotulo: 'Só eu' },
      { valor: 'equipe', rotulo: 'Uma equipe interna' },
      { valor: 'externos', rotulo: 'Clientes ou pacientes' },
      { valor: 'ninguem', rotulo: 'Ninguém, ele roda sozinho' },
    ],
    sinais: { so_eu: ['USO_INDIVIDUAL'], equipe: ['EQUIPE_INTERNA'], externos: ['PUBLICO_EXTERNO'], ninguem: ['SEM_OPERADOR'] },
  },
  {
    id: 'onde', enunciado: 'Onde as pessoas vão usar?', multipla: false,
    quando: (r) => !tem(r, 'usuarios', 'ninguem'),
    opcoes: [
      { valor: 'computador', rotulo: 'No computador do escritório' },
      { valor: 'celular', rotulo: 'No celular' },
      { valor: 'ambos', rotulo: 'No computador e no celular' },
      { valor: 'campo', rotulo: 'Na rua, em campo' },
    ],
    sinais: { computador: ['USO_COMPUTADOR'], celular: ['USO_CELULAR'], ambos: ['USO_MULTIPLATAFORMA'], campo: ['USO_EM_CAMPO'] },
  },
  {
    id: 'internet', enunciado: 'Precisa funcionar sem internet?', multipla: false,
    quando: (r) => !tem(r, 'usuarios', 'ninguem'),
    opcoes: [
      { valor: 'sempre', rotulo: 'Sim, precisa funcionar sempre' },
      { valor: 'as_vezes', rotulo: 'Às vezes a internet cai' },
      { valor: 'nao', rotulo: 'Não, sempre haverá internet' },
    ],
    sinais: { sempre: ['PRECISA_OFFLINE'], as_vezes: ['INTERNET_INSTAVEL'], nao: ['INTERNET_DISPONIVEL'] },
  },
  {
    id: 'perifericos', enunciado: 'Vai usar algum equipamento ligado ao computador?', multipla: true,
    quando: (r) => tem(r, 'onde', 'computador'),
    opcoes: [
      { valor: 'leitor', rotulo: 'Leitor de código de barras' },
      { valor: 'impressora', rotulo: 'Impressora de etiquetas' },
      { valor: 'nenhum', rotulo: 'Nenhum equipamento' },
    ],
    sinais: { leitor: ['PERIFERICOS_LOCAIS'], impressora: ['PERIFERICOS_LOCAIS'], nenhum: ['SEM_PERIFERICOS'] },
  },
  {
    id: 'localizacao', enunciado: 'Precisa saber onde a pessoa está quando usa?', multipla: false,
    quando: (r) => tem(r, 'onde', 'celular', 'campo'),
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, a localização é importante' },
      { valor: 'nao', rotulo: 'Não precisa' },
    ],
    sinais: { sim: ['LOCALIZACAO'] },
  },
  {
    id: 'frequencia', enunciado: 'Com que frequência a tarefa acontece?', multipla: false,
    opcoes: [
      { valor: 'continuo', rotulo: 'O tempo todo, ao longo do dia' },
      { valor: 'diario', rotulo: 'Uma vez por dia, em horário fixo' },
      { valor: 'periodico', rotulo: 'De vez em quando, em datas fixas' },
      { valor: 'sob_demanda', rotulo: 'Quando alguém pede' },
    ],
    sinais: { continuo: ['USO_CONTINUO'], diario: ['EXECUCAO_AGENDADA'], periodico: ['EXECUCAO_PERIODICA'], sob_demanda: ['SOB_DEMANDA'] },
  },
  {
    id: 'resultado', enunciado: 'O que deve acontecer no final?', multipla: false,
    quando: (r) => tem(r, 'usuarios', 'ninguem'),
    opcoes: [
      { valor: 'email', rotulo: 'Enviar um relatório por e-mail' },
      { valor: 'arquivo', rotulo: 'Gerar um arquivo em uma pasta' },
      { valor: 'outro_sistema', rotulo: 'Atualizar outro sistema' },
    ],
    sinais: { email: ['RESULTADO_EMAIL'], arquivo: ['RESULTADO_ARQUIVO'], outro_sistema: ['RESULTADO_OUTRO_SISTEMA'] },
  },
  {
    id: 'integracao', enunciado: 'Precisa conversar com algum sistema que vocês já usam?', multipla: false,
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, com um sistema que já usamos' },
      { valor: 'nao', rotulo: 'Não, funciona sozinho' },
    ],
    sinais: { sim: ['INTEGRA_SISTEMA'] },
  },
  {
    id: 'volume', enunciado: 'Quantas pessoas usariam ao mesmo tempo, mais ou menos?', multipla: false,
    quando: (r) => tem(r, 'usuarios', 'equipe', 'externos'),
    opcoes: [
      { valor: 'poucos', rotulo: 'Até 10' },
      { valor: 'medio', rotulo: 'Entre 10 e 100' },
      { valor: 'muitos', rotulo: 'Mais de 100' },
    ],
    sinais: { poucos: ['POUCOS_USUARIOS'], medio: ['DEZENAS_USUARIOS'], muitos: ['MUITOS_USUARIOS'] },
  },
];

/** Sinal → [pergunta do roteiro, opção]: o tema que uma resposta da IA já cobriu (para o roteiro não repetir). */
const TEMA_DO_SINAL = new Map<string, [string, string]>();
for (const p of BANCO) {
  for (const [valor, sinais] of Object.entries(p.sinais)) {
    sinais.forEach((s) => { if (!TEMA_DO_SINAL.has(s)) TEMA_DO_SINAL.set(s, [p.id, valor]); });
  }
}

const NOMES: Record<TipoCenario, string> = {
  WEB: 'Aplicação web', DESKTOP: 'Software desktop', MOBILE: 'Aplicativo mobile', JOB: 'Rotina automática (job)', API: 'API / integração',
};

export const nomeCenario = (t: TipoCenario) => NOMES[t];

const doBanco = (id: string) => BANCO.find((p) => p.id === id);

/** Pergunta do roteiro pronta para a API: opções com os sinais equivalentes e origem ROTEIRO. */
function publica(p: PerguntaBanco): Pergunta {
  const { id, enunciado, ajuda, multipla, opcoes } = p;
  return { id, enunciado, ajuda, multipla, opcoes: opcoes.map((o) => ({ ...o, sinais: p.sinais[o.valor] ?? [] })), origem: 'ROTEIRO' };
}

function mapa(respostas: RespostaEntrevista[]) {
  return new Map(respostas.map((r) => [r.perguntaId, r.valores]));
}

/**
 * Respostas vistas pelo roteiro: as do próprio roteiro (por id) + os temas que respostas da IA já cobriram
 * (pelo sinal escolhido). Assim o roteiro pula "Quem vai usar?" se a IA já perguntou isso com outras palavras.
 */
function mapaRoteiro(respostas: RespostaEntrevista[]): Map<string, string[]> {
  const direto = new Map(respostas.filter((r) => doBanco(r.perguntaId)).map((r) => [r.perguntaId, r.valores]));
  const coberto = new Map<string, string[]>();
  for (const r of respostas) {
    if (doBanco(r.perguntaId)) continue;
    for (const s of r.sinais ?? []) {
      const tema = TEMA_DO_SINAL.get(s);
      if (tema && !direto.has(tema[0])) coberto.set(tema[0], [...(coberto.get(tema[0]) ?? []), tema[1]]);
    }
  }
  return new Map([...coberto, ...direto]);
}

/** Próxima pergunta do roteiro padrão (sem rótulo de IA) e quantas ainda se aplicam. */
export function proximaPergunta(respostas: RespostaEntrevista[]): { pergunta?: Pergunta; restantes: number } {
  const r = mapaRoteiro(respostas);
  const pendentes = BANCO.filter((p) => (!p.quando || p.quando(r)) && !r.has(p.id));
  return { pergunta: pendentes[0] ? publica(pendentes[0]) : undefined, restantes: pendentes.length };
}

export function perguntaPorId(id: string): Pergunta | undefined {
  const p = doBanco(id);
  return p ? publica(p) : undefined;
}

/** Sinais de uma resposta: os gravados nela ou, em dados antigos, a equivalência do roteiro padrão. */
export function sinaisDaResposta(r: RespostaEntrevista): string[] {
  if (r.sinais) return filtrarSinais(r.sinais);
  const p = doBanco(r.perguntaId);
  return p ? filtrarSinais(r.valores.flatMap((v) => p.sinais[v] ?? [])) : [];
}

/** Igual a `pontuar(sinais)` do backend: cada sinal conta uma vez; empate mantém a ordem WEB, DESKTOP, MOBILE, JOB, API. */
export function pontuar(sinais: string[]): CenarioPontuado[] {
  const pontos: Record<TipoCenario, number> = { WEB: 0, DESKTOP: 0, MOBILE: 0, JOB: 0, API: 0 };
  const motivos: Record<TipoCenario, string[]> = { WEB: [], DESKTOP: [], MOBILE: [], JOB: [], API: [] };
  for (const codigo of filtrarSinais(sinais)) {
    const { motivo, pesos } = SINAIS[codigo];
    for (const [tipo, peso] of Object.entries(pesos) as [TipoCenario, number][]) {
      pontos[tipo] += peso;
      if (peso >= PESO_MINIMO_MOTIVO) motivos[tipo].push(motivo);
    }
  }
  const total = Object.values(pontos).reduce((a, b) => a + b, 0) || 1;
  return (Object.keys(pontos) as TipoCenario[])
    .map((tipo) => ({ tipo, nome: NOMES[tipo], pontuacao: Math.round((pontos[tipo] / total) * 100), motivos: motivos[tipo] }))
    .sort((a, b) => b.pontuacao - a.pontuacao);
}

/** Ranking do cenário pelos sinais de todas as respostas (perguntas da IA ou do roteiro). */
export function gerarRanking(respostas: RespostaEntrevista[]): CenarioPontuado[] {
  return pontuar(respostas.flatMap(sinaisDaResposta));
}

// ---------- Protótipo ----------
// Telas no padrão do template oficial do protótipo (shadcn-dashboard, ver prototipo-template.ts). Só o que é gerado
// usa esse visual; a interface do NEXUS segue o próprio padrão.

const T = {
  ok: (t: string) => badge(t, 'sucesso'),
  aviso: (t: string) => badge(t, 'aviso'),
  falha: (t: string) => badge(t, 'destrutivo'),
  neutro: (t: string) => badge(t, 'secondary'),
};

export function gerarPrototipo(nomeDemanda: string, tipo: TipoCenario): TelaPrototipo[] {
  const n = esc(nomeDemanda);

  if (tipo === 'JOB') {
    const menu: ItemMenu[] = [
      { rotulo: 'Rotina', icone: 'relogio' }, { rotulo: 'Resumo enviado', icone: 'arquivo' }, { rotulo: 'Execuções', icone: 'atividade' },
    ];
    const tela = (ativo: string, conteudo: string) => documento(casca({ marca: n, secao: 'Rotina agendada', menu, ativo, conteudo }));
    return [
      { id: 't1', nome: 'Configuração da rotina', html: tela('Rotina',
        cabecalhoPagina(n, 'Roda sozinha, sem ninguém precisar abrir o sistema.', botao('Executar agora', 'outline'))
        + cartao({ titulo: 'Quando executar', descricao: 'Horário e destino do resumo.', corpo: `<div class="campos"><div class="grade2">${campo('Frequência', 'Todos os dias')}${campo('Horário', '06:00')}</div>${campo('Enviar para', 'operacoes@empresa.com')}${campo('Origem dos dados', 'Exportação diária do sistema atual (CSV)')}</div>`, rodape: botao('Cancelar', 'outline') + botao('Salvar rotina') })) },
      { id: 't2', nome: 'Exemplo do resumo enviado', html: tela('Resumo enviado',
        cabecalhoPagina('Resumo de ontem', 'Enviado por e-mail pela rotina automática.')
        + kpis([{ rotulo: 'Concluídas', valor: '128', detalhe: '+6% que anteontem' }, { rotulo: 'Com atraso', valor: '9' }, { rotulo: 'Pendentes', valor: '4' }])
        + cartao({ titulo: 'Itens que pedem atenção', corpo: tabela(['Item', 'Situação', 'Responsável'], [['Pedido 4471', T.aviso('Atraso de 2h'), 'Equipe B'], ['Pedido 4480', T.ok('Concluído'), 'Equipe A'], ['Pedido 4492', T.neutro('Pendente'), '—']]) })) },
      { id: 't3', nome: 'Histórico de execuções', html: tela('Execuções',
        cabecalhoPagina('Execuções', 'Cada vez que a rotina rodou.')
        + cartao({ corpo: tabela(['Data', 'Duração', 'Resultado'], [['Hoje, 06:00', '42 s', T.ok('Sucesso')], ['Ontem, 06:00', '39 s', T.ok('Sucesso')], ['Anteontem, 06:00', '—', T.falha('Falhou, reenviado')]]) })) },
    ];
  }

  if (tipo === 'MOBILE') {
    const abas: ItemMenu[] = [{ rotulo: 'Início', icone: 'home' }, { rotulo: 'Registrar', icone: 'mais' }, { rotulo: 'Histórico', icone: 'lista' }];
    const tela = (ativa: string, conteudo: string) => documento(celular({ marca: n, abas, ativa, conteudo }));
    return [
      { id: 't1', nome: 'Início', html: tela('Início',
        cabecalhoPagina('Olá!', 'O que você quer fazer?')
        + cartao({ titulo: 'Registrar agora', descricao: 'Toque para começar um novo registro.', corpo: botao('Começar', 'default', { icone: 'mais' }) })
        + cartao({ titulo: 'Meus registros', descricao: '3 hoje · 1 aguardando envio', corpo: T.aviso('Sem internet: envia depois') })) },
      { id: 't2', nome: 'Registro', html: tela('Registrar',
        cabecalhoPagina('Novo registro')
        + `<div class="campos">${campo('Local', 'Usando sua localização')}${campo('Observação', 'Opcional', true)}</div>`
        + botao('Confirmar', 'default', { icone: 'check' })) },
      { id: 't3', nome: 'Confirmação', html: tela('Histórico',
        cartao({ titulo: 'Registrado', descricao: 'Hoje às 14:32', corpo: T.ok('Enviado') })
        + botao('Voltar ao início', 'outline')) },
    ];
  }

  if (tipo === 'API') {
    const menu: ItemMenu[] = [{ rotulo: 'Endpoints', icone: 'lista' }, { rotulo: 'Chaves', icone: 'chave' }, { rotulo: 'Logs', icone: 'atividade' }];
    const tela = (ativo: string, conteudo: string) => documento(casca({ marca: n, secao: 'Integração', menu, ativo, conteudo }));
    return [
      { id: 't1', nome: 'Documentação', html: tela('Endpoints',
        cabecalhoPagina('Endpoints', 'Rotas que os outros sistemas podem chamar.', botao('Gerar chave', 'outline', { icone: 'chave' }))
        + cartao({ corpo: tabela(['Método', 'Rota', 'Descrição'], [[badge('GET', 'outline'), '/registros', 'Lista registros'], [badge('POST', 'default'), '/registros', 'Cria um registro'], [badge('GET', 'outline'), '/registros/{id}', 'Detalhe de um registro']]) })) },
      { id: 't2', nome: 'Logs de integração', html: tela('Logs',
        cabecalhoPagina('Últimas chamadas')
        + kpis([{ rotulo: 'Chamadas hoje', valor: '1.284' }, { rotulo: 'Com erro', valor: '12', detalhe: '0,9%' }])
        + cartao({ corpo: tabela(['Hora', 'Rota', 'Status'], [['10:41', '/registros', T.ok('200')], ['10:39', '/registros', T.aviso('422')], ['10:12', '/registros/88', T.ok('200')]]) })) },
    ];
  }

  // WEB e DESKTOP: mesma casca; no desktop, dentro de uma janela de computador.
  const desktop = tipo === 'DESKTOP';
  const menu: ItemMenu[] = desktop
    ? [{ rotulo: 'Início', icone: 'home' }, { rotulo: 'Cadastro', icone: 'lista' }, { rotulo: 'Novo item', icone: 'mais' }, { rotulo: 'Relatórios', icone: 'grafico' }]
    : [{ rotulo: 'Início', icone: 'home' }, { rotulo: 'Registros', icone: 'lista' }, { rotulo: 'Novo registro', icone: 'mais' }, { rotulo: 'Configurações', icone: 'config' }];
  const tela = (ativo: string, conteudo: string) => {
    const c = casca({ marca: n, secao: desktop ? 'Aplicação' : 'Plataforma', menu, ativo, conteudo });
    return documento(desktop ? janela(n, c) : c);
  };
  return [
    { id: 't1', nome: 'Início', html: tela('Início',
      cabecalhoPagina('Bom dia', 'Resumo do que acontece hoje.', botao(menu[2].rotulo, 'default', { icone: 'mais' }))
      + kpis([{ rotulo: 'Hoje', valor: '24', detalhe: '+3 que ontem' }, { rotulo: 'Pendentes', valor: '5' }, { rotulo: 'Concluídos', valor: '19' }])
      + cartao({ titulo: 'Próximos', descricao: 'O que vem a seguir.', corpo: tabela(['Hora', 'Registro', 'Situação'], [['09:00', 'Registro 1', T.ok('Confirmado')], ['09:30', 'Registro 2', T.aviso('Aguardando')], ['10:15', 'Registro 3', T.neutro('Agendado')]]) })) },
    { id: 't2', nome: 'Lista', html: tela(menu[1].rotulo,
      cabecalhoPagina(menu[1].rotulo, 'Todos os registros cadastrados.', botao('Novo', 'default', { icone: 'mais' }))
      + cartao({ corpo: `<div class="linha filtro"><span class="in">Buscar…</span>${botao('Filtrar', 'outline', { pequeno: true })}</div>`
        + tabela(['Nome', 'Data', 'Situação'], [['Registro 1', '12/10', T.ok('Concluído')], ['Registro 2', '12/10', T.neutro('Em andamento')], ['Registro 3', '13/10', T.aviso('Pendente')]]) })) },
    { id: 't3', nome: 'Formulário', html: tela(menu[2].rotulo,
      cabecalhoPagina(menu[2].rotulo, 'Preencha os dados e salve.')
      + cartao({ titulo: 'Dados principais', corpo: `<div class="campos"><div class="grade2">${campo('Nome', 'Digite o nome')}${campo('Data', 'dd/mm/aaaa')}</div>${campo('Observações', 'Opcional', true)}</div>`, rodape: botao('Cancelar', 'outline') + botao('Salvar') })) },
  ];
}

// ---------- Requisitos ----------

export function gerarRequisitos(d: Demanda, proximoCodigo: () => string): Requisito[] {
  const r = mapa(d.respostas);
  const lista: Omit<Requisito, 'id' | 'codigo' | 'estado'>[] = [
    { tipo: 'RF', titulo: `Funcionalidade principal: ${d.nome}`, descricao: d.descricao },
  ];
  if (tem(r, 'usuarios', 'equipe', 'externos')) lista.push({ tipo: 'RF', titulo: 'Acesso por perfil', descricao: 'Cada pessoa entra com o próprio usuário e vê somente o que o perfil permite.' });
  if (tem(r, 'onde', 'celular', 'ambos', 'campo')) lista.push({ tipo: 'RNF', titulo: 'Uso no celular', descricao: 'As telas funcionam bem em celulares.' });
  if (tem(r, 'internet', 'sempre', 'as_vezes')) lista.push({ tipo: 'RNF', titulo: 'Funcionamento sem internet', descricao: 'O sistema continua funcionando sem conexão e sincroniza quando ela voltar.' });
  if (tem(r, 'perifericos', 'leitor')) lista.push({ tipo: 'RF', titulo: 'Leitura de código de barras', descricao: 'Itens podem ser identificados pelo leitor de código de barras.' });
  if (tem(r, 'perifericos', 'impressora')) lista.push({ tipo: 'RF', titulo: 'Impressão de etiquetas', descricao: 'O sistema imprime etiquetas na impressora conectada.' });
  if (tem(r, 'localizacao', 'sim')) lista.push({ tipo: 'RF', titulo: 'Registro de localização', descricao: 'Cada registro guarda a localização do aparelho.' });
  if (tem(r, 'frequencia', 'diario', 'periodico')) lista.push({ tipo: 'RF', titulo: 'Execução agendada', descricao: 'A rotina executa sozinha no horário configurado.' });
  if (tem(r, 'resultado', 'email')) lista.push({ tipo: 'RF', titulo: 'Envio por e-mail', descricao: 'O resultado é enviado por e-mail aos destinatários cadastrados.' });
  if (tem(r, 'integracao', 'sim')) lista.push({ tipo: 'RF', titulo: 'Integração com o sistema atual', descricao: 'Os dados são trocados com o sistema que a organização já usa.' });
  if (tem(r, 'volume', 'medio', 'muitos')) lista.push({ tipo: 'RNF', titulo: 'Usuários simultâneos', descricao: tem(r, 'volume', 'muitos') ? 'Suporta mais de 100 pessoas usando ao mesmo tempo.' : 'Suporta até 100 pessoas usando ao mesmo tempo.' });
  lista.push({ tipo: 'REGRA', titulo: 'Registro de alterações', descricao: 'Toda alteração guarda quem fez e quando.' });
  return lista.map((x, i) => ({ ...x, id: `r${Date.now()}${i}`, codigo: proximoCodigo(), estado: 'PROPOSTO' as const }));
}

// ---------- Suporte ----------

function palavras(s: string) {
  return new Set(s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\W+/).filter((w) => w.length > 3));
}

export function gerarSugestao(c: Chamado, solucao: Solucao | undefined, demandas: Demanda[], conhecimentos: Conhecimento[], chamados: Chamado[]): Sugestao {
  const alvo = palavras(`${c.titulo} ${c.descricao}`);
  const candidatos = conhecimentos
    .filter((k) => k.solucaoId === c.solucaoId)
    .map((k) => ({ k, score: [...palavras(k.titulo + ' ' + k.procedimento.join(' '))].filter((w) => alvo.has(w)).length }))
    .sort((a, b) => b.score - a.score);
  const kb = candidatos[0]?.score ? candidatos[0].k : undefined;

  const versao = solucao?.versoes.find((v) => v.id === c.versaoId);
  const origem = demandas.find((d) => d.id === solucao?.demandaOrigemId);
  const fontes: FonteContexto[] = [];
  if (kb) fontes.push({ tipo: 'Conhecimento', codigo: kb.codigo, titulo: kb.titulo });
  if (solucao && versao) fontes.push({ tipo: 'Versão', codigo: `v${versao.numero}`, titulo: `${solucao.nome} ${versao.numero}`, link: `/solucoes/${solucao.id}` });
  if (origem) {
    fontes.push({ tipo: 'Demanda', codigo: origem.codigo, titulo: origem.nome, link: `/demandas/${origem.id}` });
    origem.requisitos.filter((rq) => rq.estado === 'APROVADO').slice(0, 2)
      .forEach((rq) => fontes.push({ tipo: 'Requisito', codigo: rq.codigo, titulo: rq.titulo, link: `/demandas/${origem.id}` }));
  }
  chamados.filter((x) => x.id !== c.id && x.solucaoId === c.solucaoId && x.estado === 'RESOLVIDO').slice(0, 1)
    .forEach((x) => fontes.push({ tipo: 'Chamado', codigo: x.codigo, titulo: x.titulo, link: `/fila/${x.id}` }));

  if (kb) {
    return {
      estado: 'PROPOSTO', categoria: 'Ocorrência conhecida', confianca: 0.78, semHistorico: false, fontes,
      causa: `O relato é parecido com "${kb.titulo}". Pode ser a mesma causa, mas isso precisa ser confirmado no atendimento.`,
      procedimento: kb.procedimento,
    };
  }
  return {
    estado: 'PROPOSTO', categoria: 'Nova ocorrência', confianca: 0.46, semHistorico: true, fontes,
    causa: `Pela descrição, pode estar ligado a uma regra ou configuração introduzida na versão ${versao?.numero ?? 'atual'}.`,
    procedimento: [
      'Reproduzir o problema com o mesmo usuário e a mesma versão.',
      'Comparar com as regras dos requisitos aprovados da versão.',
      'Verificar configurações e permissões do usuário afetado.',
      'Registrar a causa confirmada antes de resolver.',
    ],
  };
}
