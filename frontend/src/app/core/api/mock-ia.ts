// Simulação determinística da IA (equivalente ao fake_adapter do backend).
// Entrevista adaptativa, pontuação de cenário, protótipo, requisitos e sugestão de suporte.
import {
  CenarioPontuado, Chamado, Conhecimento, Demanda, FonteContexto, Pergunta, RespostaEntrevista,
  Requisito, Solucao, Sugestao, TelaPrototipo, TipoCenario,
} from './models';

type Pesos = Partial<Record<TipoCenario, number>>;

interface PerguntaBanco extends Pergunta {
  quando?: (r: Map<string, string[]>) => boolean;
  pesos: Record<string, { pesos: Pesos; motivo: string }>;
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
    pesos: {
      so_eu: { pesos: { DESKTOP: 2, WEB: 1 }, motivo: 'Uso individual' },
      equipe: { pesos: { WEB: 2, DESKTOP: 2 }, motivo: 'Usado por uma equipe interna' },
      externos: { pesos: { WEB: 3, MOBILE: 2 }, motivo: 'Usado por pessoas de fora da organização' },
      ninguem: { pesos: { JOB: 4, API: 2 }, motivo: 'Funciona sem ninguém operando' },
    },
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
    pesos: {
      computador: { pesos: { DESKTOP: 3, WEB: 2 }, motivo: 'Uso no computador' },
      celular: { pesos: { MOBILE: 4, WEB: 1 }, motivo: 'Uso principal no celular' },
      ambos: { pesos: { WEB: 4, MOBILE: 1 }, motivo: 'Precisa funcionar no computador e no celular' },
      campo: { pesos: { MOBILE: 5 }, motivo: 'Uso em campo, fora do escritório' },
    },
  },
  {
    id: 'internet', enunciado: 'Precisa funcionar sem internet?', multipla: false,
    quando: (r) => !tem(r, 'usuarios', 'ninguem'),
    opcoes: [
      { valor: 'sempre', rotulo: 'Sim, precisa funcionar sempre' },
      { valor: 'as_vezes', rotulo: 'Às vezes a internet cai' },
      { valor: 'nao', rotulo: 'Não, sempre haverá internet' },
    ],
    pesos: {
      sempre: { pesos: { DESKTOP: 4, MOBILE: 2 }, motivo: 'Precisa funcionar sem internet' },
      as_vezes: { pesos: { DESKTOP: 2, MOBILE: 1 }, motivo: 'Internet instável' },
      nao: { pesos: { WEB: 2 }, motivo: 'Internet sempre disponível' },
    },
  },
  {
    id: 'perifericos', enunciado: 'Vai usar algum equipamento ligado ao computador?', multipla: true,
    quando: (r) => tem(r, 'onde', 'computador'),
    opcoes: [
      { valor: 'leitor', rotulo: 'Leitor de código de barras' },
      { valor: 'impressora', rotulo: 'Impressora de etiquetas' },
      { valor: 'nenhum', rotulo: 'Nenhum equipamento' },
    ],
    pesos: {
      leitor: { pesos: { DESKTOP: 2 }, motivo: 'Usa leitor de código de barras' },
      impressora: { pesos: { DESKTOP: 2 }, motivo: 'Imprime etiquetas' },
      nenhum: { pesos: { WEB: 1 }, motivo: 'Sem equipamentos especiais' },
    },
  },
  {
    id: 'localizacao', enunciado: 'Precisa saber onde a pessoa está quando usa?', multipla: false,
    quando: (r) => tem(r, 'onde', 'celular', 'campo'),
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, a localização é importante' },
      { valor: 'nao', rotulo: 'Não precisa' },
    ],
    pesos: {
      sim: { pesos: { MOBILE: 3 }, motivo: 'Usa a localização do aparelho' },
      nao: { pesos: {}, motivo: '' },
    },
  },
  {
    id: 'frequencia', enunciado: 'Com que frequência a tarefa acontece?', multipla: false,
    opcoes: [
      { valor: 'continuo', rotulo: 'O tempo todo, ao longo do dia' },
      { valor: 'diario', rotulo: 'Uma vez por dia, em horário fixo' },
      { valor: 'periodico', rotulo: 'De vez em quando, em datas fixas' },
      { valor: 'sob_demanda', rotulo: 'Quando alguém pede' },
    ],
    pesos: {
      continuo: { pesos: { WEB: 1, DESKTOP: 1, MOBILE: 1 }, motivo: 'Uso contínuo' },
      diario: { pesos: { JOB: 4 }, motivo: 'Acontece todo dia em horário fixo' },
      periodico: { pesos: { JOB: 3 }, motivo: 'Acontece em datas fixas' },
      sob_demanda: { pesos: { WEB: 1, API: 1 }, motivo: 'Acontece sob demanda' },
    },
  },
  {
    id: 'resultado', enunciado: 'O que deve acontecer no final?', multipla: false,
    quando: (r) => tem(r, 'usuarios', 'ninguem'),
    opcoes: [
      { valor: 'email', rotulo: 'Enviar um relatório por e-mail' },
      { valor: 'arquivo', rotulo: 'Gerar um arquivo em uma pasta' },
      { valor: 'outro_sistema', rotulo: 'Atualizar outro sistema' },
    ],
    pesos: {
      email: { pesos: { JOB: 2 }, motivo: 'Entrega o resultado por e-mail' },
      arquivo: { pesos: { JOB: 2 }, motivo: 'Gera arquivos automaticamente' },
      outro_sistema: { pesos: { API: 4, JOB: 1 }, motivo: 'Troca dados com outro sistema' },
    },
  },
  {
    id: 'integracao', enunciado: 'Precisa conversar com algum sistema que vocês já usam?', multipla: false,
    opcoes: [
      { valor: 'sim', rotulo: 'Sim, com um sistema que já usamos' },
      { valor: 'nao', rotulo: 'Não, funciona sozinho' },
    ],
    pesos: {
      sim: { pesos: { API: 2, WEB: 1 }, motivo: 'Integra com um sistema existente' },
      nao: { pesos: {}, motivo: '' },
    },
  },
  {
    id: 'volume', enunciado: 'Quantas pessoas usariam ao mesmo tempo, mais ou menos?', multipla: false,
    quando: (r) => tem(r, 'usuarios', 'equipe', 'externos'),
    opcoes: [
      { valor: 'poucos', rotulo: 'Até 10' },
      { valor: 'medio', rotulo: 'Entre 10 e 100' },
      { valor: 'muitos', rotulo: 'Mais de 100' },
    ],
    pesos: {
      poucos: { pesos: { DESKTOP: 1 }, motivo: 'Poucos usuários simultâneos' },
      medio: { pesos: { WEB: 2 }, motivo: 'Dezenas de usuários simultâneos' },
      muitos: { pesos: { WEB: 3 }, motivo: 'Muitos usuários simultâneos' },
    },
  },
];

const NOMES: Record<TipoCenario, string> = {
  WEB: 'Aplicação web', DESKTOP: 'Software desktop', MOBILE: 'Aplicativo mobile', JOB: 'Rotina automática (job)', API: 'API / integração',
};

export const nomeCenario = (t: TipoCenario) => NOMES[t];

function mapa(respostas: RespostaEntrevista[]) {
  return new Map(respostas.map((r) => [r.perguntaId, r.valores]));
}

export function proximaPergunta(respostas: RespostaEntrevista[]): { pergunta?: Pergunta; estimadas: number } {
  const r = mapa(respostas);
  const aplicaveis = BANCO.filter((p) => !p.quando || p.quando(r));
  const pendente = aplicaveis.find((p) => !r.has(p.id));
  if (!pendente) return { estimadas: respostas.length };
  const { id, enunciado, ajuda, multipla, opcoes } = pendente;
  return { pergunta: { id, enunciado, ajuda, multipla, opcoes }, estimadas: Math.max(aplicaveis.length, respostas.length + 1) };
}

export function perguntaPorId(id: string): Pergunta | undefined {
  return BANCO.find((p) => p.id === id);
}

export function gerarRanking(respostas: RespostaEntrevista[]): CenarioPontuado[] {
  const pontos: Record<TipoCenario, number> = { WEB: 0, DESKTOP: 0, MOBILE: 0, JOB: 0, API: 0 };
  const motivos: Record<TipoCenario, string[]> = { WEB: [], DESKTOP: [], MOBILE: [], JOB: [], API: [] };
  for (const resp of respostas) {
    const p = BANCO.find((b) => b.id === resp.perguntaId);
    if (!p) continue;
    for (const v of resp.valores) {
      const regra = p.pesos[v];
      if (!regra) continue;
      for (const [tipo, peso] of Object.entries(regra.pesos) as [TipoCenario, number][]) {
        pontos[tipo] += peso;
        if (regra.motivo && peso >= 2) motivos[tipo].push(regra.motivo);
      }
    }
  }
  const total = Object.values(pontos).reduce((a, b) => a + b, 0) || 1;
  return (Object.keys(pontos) as TipoCenario[])
    .map((tipo) => ({ tipo, nome: NOMES[tipo], pontuacao: Math.round((pontos[tipo] / total) * 100), motivos: motivos[tipo] }))
    .sort((a, b) => b.pontuacao - a.pontuacao);
}

// ---------- Protótipo ----------

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

const BASE_CSS = `*{box-sizing:border-box;margin:0}body{font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#1F3550;background:#F5F8FC}
.bar{display:flex;align-items:center;gap:16px;padding:12px 20px;background:#fff;border-bottom:1px solid #E1E8F0}.logo{font-weight:700;color:#020A1D}
.bar a{color:#718198;text-decoration:none}.bar a.on{color:#0878FF;font-weight:600}.sp{flex:1}.av{width:28px;height:28px;border-radius:50%;background:#DCE9FB}
main{padding:20px;display:grid;gap:14px}h1{font-size:20px;color:#020A1D}h2{font-size:15px;color:#020A1D;margin-bottom:8px}.mut{color:#718198}
.box{background:#fff;border:1px solid #E1E8F0;border-radius:10px;padding:16px}.row{display:flex;gap:12px;align-items:center}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kpi b{display:block;font-size:22px;color:#020A1D}.btn{display:inline-block;background:#0878FF;color:#fff;border-radius:8px;padding:8px 14px;font-weight:600}
.btn.sec{background:#fff;color:#1F3550;border:1px solid #E1E8F0}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:9px 6px;border-bottom:1px solid #EEF2F7}th{color:#718198;font-weight:500}
.tag{display:inline-block;padding:2px 8px;border-radius:99px;background:#EAF3FF;color:#0866D6;font-size:12px}.tag.ok{background:#E6F6F0;color:#127F5C}.tag.warn{background:#FBF1E2;color:#9C6210}
label{display:block;font-size:13px;color:#718198;margin:10px 0 4px}.in{border:1px solid #E1E8F0;border-radius:8px;padding:9px 10px;background:#fff;color:#9AA7B8}`;

function pagina(corpo: string, extra = '') {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${BASE_CSS}${extra}</style></head><body>${corpo}</body></html>`;
}

export function gerarPrototipo(nomeDemanda: string, tipo: TipoCenario): TelaPrototipo[] {
  const n = esc(nomeDemanda);
  const barra = (ativo: string, itens: string[]) =>
    `<div class="bar"><span class="logo">${n}</span>${itens.map((i) => `<a class="${i === ativo ? 'on' : ''}">${i}</a>`).join('')}<span class="sp"></span><span class="av"></span></div>`;

  if (tipo === 'JOB') {
    return [
      { id: 't1', nome: 'Configuração da rotina', html: pagina(`<main><h1>${n}</h1><div class="box"><h2>Quando executar</h2><div class="row"><span class="in">Todos os dias</span><span class="in">às 06:00</span></div><label>Enviar para</label><div class="in">operacoes@empresa.com</div><label>Origem dos dados</label><div class="in">Exportação diária do sistema atual (CSV)</div></div><div class="row"><span class="btn">Salvar rotina</span><span class="btn sec">Executar agora</span></div></main>`) },
      { id: 't2', nome: 'Exemplo do e-mail enviado', html: pagina(`<main><div class="box"><p class="mut">De: rotina automática</p><h1>Resumo de ontem</h1><div class="grid" style="margin-top:12px"><div class="kpi box"><span class="mut">Concluídas</span><b>128</b></div><div class="kpi box"><span class="mut">Com atraso</span><b>9</b></div><div class="kpi box"><span class="mut">Pendentes</span><b>4</b></div></div><table style="margin-top:12px"><tr><th>Item</th><th>Situação</th></tr><tr><td>Pedido 4471</td><td><span class="tag warn">Atraso de 2h</span></td></tr><tr><td>Pedido 4480</td><td><span class="tag ok">Concluído</span></td></tr></table></div></main>`) },
      { id: 't3', nome: 'Histórico de execuções', html: pagina(`<main><h1>Execuções</h1><div class="box"><table><tr><th>Data</th><th>Duração</th><th>Resultado</th></tr><tr><td>Hoje, 06:00</td><td>42 s</td><td><span class="tag ok">Sucesso</span></td></tr><tr><td>Ontem, 06:00</td><td>39 s</td><td><span class="tag ok">Sucesso</span></td></tr><tr><td>Anteontem, 06:00</td><td>—</td><td><span class="tag warn">Falhou, reenviado</span></td></tr></table></div></main>`) },
    ];
  }

  if (tipo === 'MOBILE') {
    const phone = 'body{display:grid;place-items:center;min-height:100%;padding:16px}.ph{width:260px;border:8px solid #020A1D;border-radius:28px;overflow:hidden;background:#F5F8FC}.ph main{padding:14px}';
    const tela = (conteudo: string) => pagina(`<div class="ph"><div class="bar"><span class="logo">${n}</span></div><main>${conteudo}</main></div>`, phone);
    return [
      { id: 't1', nome: 'Início', html: tela(`<h1>Olá!</h1><p class="mut">O que você quer fazer?</p><div class="box"><b>Registrar agora</b><p class="mut">Toque para começar</p></div><div class="box"><b>Meus registros</b><p class="mut">3 hoje</p></div>`) },
      { id: 't2', nome: 'Registro', html: tela(`<h2>Novo registro</h2><label>Local</label><div class="in">Usando sua localização</div><label>Observação</label><div class="in">Opcional</div><p style="margin-top:14px"><span class="btn">Confirmar</span></p>`) },
      { id: 't3', nome: 'Confirmação', html: tela(`<div class="box" style="text-align:center"><h1>Registrado</h1><p class="mut">Hoje às 14:32</p></div><p><span class="btn sec">Voltar ao início</span></p>`) },
    ];
  }

  if (tipo === 'API') {
    return [
      { id: 't1', nome: 'Documentação', html: pagina(`${barra('Endpoints', ['Endpoints', 'Chaves', 'Logs'])}<main><h1>Endpoints</h1><div class="box"><table><tr><th>Método</th><th>Rota</th><th>Descrição</th></tr><tr><td><span class="tag">GET</span></td><td>/registros</td><td>Lista registros</td></tr><tr><td><span class="tag ok">POST</span></td><td>/registros</td><td>Cria um registro</td></tr></table></div></main>`) },
      { id: 't2', nome: 'Logs de integração', html: pagina(`${barra('Logs', ['Endpoints', 'Chaves', 'Logs'])}<main><h1>Últimas chamadas</h1><div class="box"><table><tr><th>Hora</th><th>Rota</th><th>Status</th></tr><tr><td>10:41</td><td>/registros</td><td><span class="tag ok">200</span></td></tr><tr><td>10:39</td><td>/registros</td><td><span class="tag warn">422</span></td></tr></table></div></main>`) },
    ];
  }

  const itens = tipo === 'DESKTOP' ? ['Início', 'Cadastro', 'Relatórios'] : ['Início', 'Registros', 'Novo'];
  const janela = tipo === 'DESKTOP' ? '.win{margin:12px;border:1px solid #C9D4E2;border-radius:8px;overflow:hidden;background:#F5F8FC}.tt{background:#E9EEF5;padding:6px 10px;font-size:12px;color:#718198}' : '';
  const wrap = (s: string) => (tipo === 'DESKTOP' ? `<div class="win"><div class="tt">● ● ●  ${n}</div>${s}</div>` : s);
  return [
    { id: 't1', nome: 'Início', html: pagina(wrap(`${barra(itens[0], itens)}<main><h1>Bom dia</h1><div class="grid"><div class="box kpi"><span class="mut">Hoje</span><b>24</b></div><div class="box kpi"><span class="mut">Pendentes</span><b>5</b></div><div class="box kpi"><span class="mut">Concluídos</span><b>19</b></div></div><div class="box"><h2>Próximos</h2><table><tr><td>09:00</td><td>Registro 1</td><td><span class="tag">Confirmado</span></td></tr><tr><td>09:30</td><td>Registro 2</td><td><span class="tag warn">Aguardando</span></td></tr></table></div></main>`), janela) },
    { id: 't2', nome: 'Lista', html: pagina(wrap(`${barra(itens[1], itens)}<main><div class="row"><h1>${itens[1]}</h1><span class="sp"></span><span class="btn">Novo</span></div><div class="box"><div class="in" style="margin-bottom:10px">Buscar…</div><table><tr><th>Nome</th><th>Data</th><th>Situação</th></tr><tr><td>Registro 1</td><td>12/10</td><td><span class="tag ok">Concluído</span></td></tr><tr><td>Registro 2</td><td>12/10</td><td><span class="tag">Em andamento</span></td></tr><tr><td>Registro 3</td><td>13/10</td><td><span class="tag warn">Pendente</span></td></tr></table></div></main>`), janela) },
    { id: 't3', nome: 'Formulário', html: pagina(wrap(`${barra(itens[2], itens)}<main><h1>Novo registro</h1><div class="box"><label>Nome</label><div class="in">Digite o nome</div><label>Data</label><div class="in">dd/mm/aaaa</div><label>Observações</label><div class="in" style="height:64px">Opcional</div><p style="margin-top:14px" class="row"><span class="btn">Salvar</span><span class="btn sec">Cancelar</span></p></div></main>`), janela) },
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
