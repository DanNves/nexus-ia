// Entrevista guiada em RODADAS (claude/front/contratos.md, 2026-11-03). Regras puras sobre a demanda guardada no mock;
// o interceptor cuida do HTTP (cria o job `entrevista` no Django e chama estas funções). Quando a demanda for para o
// Django, esta lógica vai para o servidor e a API mantém o mesmo formato de ProximaPergunta/RespostaRodada.
//
// - Rodada de IA: até 5 perguntas geradas de uma vez (fila). Rodada do ROTEIRO: até 5 perguntas do roteiro padrão
//   (BANCO), servidas uma a uma porque o roteiro é adaptativo.
// - A entrevista acaba quando a fila da última rodada termina e (a IA disse "suficiente" ou chegou à rodada máxima).
//   Com a IA bloqueada para a demanda (`semIa`), o roteiro segue até acabar.
// - Alterar uma resposta descarta as respostas seguintes e as rodadas posteriores à dela. As perguntas da mesma rodada
//   voltam para a fila (foram geradas antes de qualquer resposta da rodada, então continuam válidas).
import { Demanda, EstadoEntrevista, OpcaoPergunta, Pergunta, ProximaPergunta, RespostaEntrevista, RodadaEntrevista } from './models';
import { filtrarSinais, perguntaPorId, proximaPergunta } from './mock-ia';

export const PERGUNTAS_POR_RODADA = 5;
/** Padrão de IA_ENTREVISTA_MAX_RODADAS até o /ia/status responder. */
export const RODADAS_PADRAO = 3;
/** Limites da entrada da tarefa `entrevista` (serializer do Django). */
export const MAX_RESPOSTAS_IA = 40;
export const LIMITE_NECESSIDADE = 20_000;
/** Estimativa de perguntas a mais enquanto ainda pode haver outra rodada (só para "Pergunta X de cerca de Y"). */
const ESTIMATIVA_PROXIMA_RODADA = 3;

/** Motivos da queda para o roteiro padrão, em linguagem simples (completam "…porque <motivo>."). */
export const MOTIVO_ROTEIRO = {
  falhou: 'a IA não conseguiu preparar as perguntas agora',
  conexao: 'não foi possível falar com o servidor da IA',
  cotaDiaria: 'o limite diário de uso da IA foi atingido (ela volta amanhã)',
  rodadas: 'esta demanda já usou as rodadas de perguntas com IA de hoje',
  cotaAlvo: 'esta demanda atingiu o limite de uso da IA por hoje',
  minuto: 'houve muitos pedidos à IA em pouco tempo',
  entrada: 'os dados desta demanda não puderam ser enviados à IA',
} as const;

export const cortar = (t: string, max: number) => (t.length > max ? t.slice(0, max) : t);

/** Corta a lista de textos para que a soma não passe do limite. */
export function truncarTextos(textos: string[], limite: number): string[] {
  const saida: string[] = [];
  let resta = limite;
  for (const t of textos.map((x) => x.trim()).filter(Boolean)) {
    if (resta <= 0) break;
    saida.push(t.length > resta ? t.slice(0, resta) : t);
    resta -= t.length;
  }
  return saida;
}

export function garantirEstado(d: Demanda): EstadoEntrevista {
  return (d.entrevista ??= { rodadas: [], rodadaMaxima: RODADAS_PADRAO });
}

const ultimaRodada = (d: Demanda): RodadaEntrevista | undefined => d.entrevista?.rodadas.at(-1);

/** Pergunta por id: primeiro as geradas nas rodadas (mais recente primeiro), depois o roteiro padrão. */
export function perguntaDa(d: Demanda, id: string): Pergunta | undefined {
  for (const r of [...(d.entrevista?.rodadas ?? [])].reverse()) {
    const p = r.perguntas.find((x) => x.id === id);
    if (p) return p;
  }
  return perguntaPorId(id);
}

/** Assinatura das respostas atuais: um resultado de IA pedido com outras respostas não é aplicado. */
export function assinatura(d: Demanda): string {
  return d.respostas.map((r) => r.perguntaId).join('|');
}

export function proximaDaEntrevista(d: Demanda): ProximaPergunta {
  const est = d.entrevista;
  const maxima = est?.rodadaMaxima ?? RODADAS_PADRAO;
  const atual = ultimaRodada(d);
  const n = d.respostas.length;
  const respondidas = new Set(d.respostas.map((r) => r.perguntaId));
  const comResumo = [...(est?.rodadas ?? [])].reverse().find((r) => r.fonte !== 'ROTEIRO' && r.resumo);
  const base: Omit<ProximaPergunta, 'concluida' | 'progresso'> = {
    rodada: atual ? { numero: atual.numero, maxima } : undefined,
    resumo: comResumo?.resumo ? { texto: comResumo.resumo, origem: comResumo.fonte, modelo: comResumo.modelo } : undefined,
  };
  const podeHaverMais = !!atual && !atual.suficiente && atual.numero < maxima && !est?.semIa;
  const extra = podeHaverMais ? ESTIMATIVA_PROXIMA_RODADA : 0;

  if (atual && atual.fonte !== 'ROTEIRO') {
    const fila = atual.perguntas.filter((p) => !respondidas.has(p.id));
    if (fila.length) return { ...base, concluida: false, pergunta: fila[0], progresso: { respondidas: n, estimadas: n + fila.length + extra } };
  }
  const roteiroAteOFim = !!est?.semIa;
  if (atual && (atual.fonte === 'ROTEIRO' || roteiroAteOFim)) {
    const naRodada = d.respostas.filter((r) => r.rodada === atual.numero).length;
    if (roteiroAteOFim || naRodada < PERGUNTAS_POR_RODADA) {
      const { pergunta, restantes } = proximaPergunta(d.respostas);
      const motivo = est?.semIa ?? atual.motivo;
      if (pergunta) {
        const estimadas = n + (roteiroAteOFim ? restantes : Math.min(restantes, PERGUNTAS_POR_RODADA - naRodada) + extra);
        return { ...base, concluida: false, pergunta, roteiro: motivo, progresso: { respondidas: n, estimadas } };
      }
    }
    if (roteiroAteOFim) return { ...base, concluida: true, progresso: { respondidas: n, estimadas: n } };
  }
  if (atual && (atual.suficiente || atual.numero >= maxima)) return { ...base, concluida: true, progresso: { respondidas: n, estimadas: n } };
  return { ...base, concluida: false, precisaRodada: true, progresso: { respondidas: n, estimadas: n + ESTIMATIVA_PROXIMA_RODADA } };
}

/** Número da próxima rodada a pedir. */
export function proximaRodada(d: Demanda): number {
  return (ultimaRodada(d)?.numero ?? 0) + 1;
}

/** Entrada da tarefa `entrevista`, determinística (mesmas respostas → mesma entrada → o backend reaproveita o job). */
export function montarEntrada(d: Demanda, rodada: number) {
  return {
    demanda: {
      codigo: cortar(d.codigo, 30),
      nome: cortar(d.nome, 200),
      descricao: cortar(d.descricao, 4000),
      necessidade: truncarTextos(d.fontes.map((f) => f.conteudo), LIMITE_NECESSIDADE).slice(0, 20),
    },
    // As mais recentes ficam (contrato: no máximo 40).
    respostas: d.respostas.slice(-MAX_RESPOSTAS_IA).map((r) => ({
      id: cortar(r.perguntaId, 40),
      pergunta: cortar(r.enunciado, 300),
      respostas: r.rotulos.slice(0, 10).map((x) => cortar(x, 200)),
      ...(r.outro ? { outro: cortar(r.outro, 300) } : {}),
      ...(r.naoSei ? { naoSei: true } : {}),
    })),
    rodada,
  };
}

// ---------- Resultado da IA ----------

const SLUG = /^[a-z0-9_]{1,40}$/;
const textoAte = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t.length <= max ? t : undefined;
};

/** Confere o resultado (o backend já garante o formato; aqui é defesa): pergunta inválida é descartada. */
function perguntasValidas(bruto: unknown, ja: Set<string>, origem: Pergunta['origem'], modelo: string): Pergunta[] {
  if (!Array.isArray(bruto)) return [];
  const saida: Pergunta[] = [];
  for (const item of bruto.slice(0, PERGUNTAS_POR_RODADA) as Record<string, unknown>[]) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item['id'] === 'string' && SLUG.test(item['id']) ? item['id'] : undefined;
    const enunciado = textoAte(item['enunciado'], 300);
    if (!id || !enunciado || ja.has(id)) continue;
    const valores = new Set<string>();
    const opcoes: OpcaoPergunta[] = [];
    for (const o of (Array.isArray(item['opcoes']) ? item['opcoes'] : []) as Record<string, unknown>[]) {
      const valor = o && typeof o['valor'] === 'string' && SLUG.test(o['valor']) ? o['valor'] : undefined;
      const rotulo = o ? textoAte(o['rotulo'], 200) : undefined;
      if (!valor || !rotulo || valores.has(valor)) continue;
      valores.add(valor);
      opcoes.push({ valor, rotulo, sinais: filtrarSinais(o['sinais']) });
    }
    if (opcoes.length < 3) continue;
    ja.add(id);
    saida.push({
      id, enunciado, ajuda: textoAte(item['ajuda'], 300), multipla: item['multipla'] === true,
      opcoes: opcoes.slice(0, 5), origem, modelo,
    });
  }
  return saida;
}

/** Guarda a rodada gerada pela IA (real → 'IA'; provedor fake → 'SIMULADOR'). Devolve quantas perguntas entraram. */
export function aplicarRodadaIa(d: Demanda, numero: number, resultado: unknown, real: boolean, modelo: string): number {
  const est = garantirEstado(d);
  const r = (resultado && typeof resultado === 'object' ? resultado : {}) as Record<string, unknown>;
  const fonte = real ? 'IA' : 'SIMULADOR';
  const perguntas = perguntasValidas(r['perguntas'], new Set(d.respostas.map((x) => x.perguntaId)), fonte, modelo);
  const lacunas = Array.isArray(r['lacunas']) ? r['lacunas'].map((x) => textoAte(x, 300)).filter((x): x is string => !!x).slice(0, 5) : [];
  est.rodadas = est.rodadas.filter((x) => x.numero < numero);
  est.rodadas.push({
    numero, fonte, modelo, perguntas,
    suficiente: r['suficiente'] === true || !perguntas.length || numero >= est.rodadaMaxima,
    resumo: typeof r['resumo'] === 'string' ? cortar(r['resumo'].trim(), 400) || undefined : undefined,
    lacunas,
  });
  return perguntas.length;
}

/** Rodada servida pelo roteiro padrão. `ateOFim`: a IA não volta nesta demanda (rodadas esgotadas/cota do registro). */
export function iniciarRoteiro(d: Demanda, numero: number, motivo: string, ateOFim = false) {
  const est = garantirEstado(d);
  est.rodadas = est.rodadas.filter((x) => x.numero < numero);
  // Sem IA e sem nada no roteiro: não há o que perguntar, a entrevista pode ser concluída.
  est.rodadas.push({ numero, fonte: 'ROTEIRO', perguntas: [], suficiente: !proximaPergunta(d.respostas).pergunta, motivo });
  if (ateOFim) est.semIa = motivo;
}

// ---------- Respostas ----------

/** Registra a resposta. Alterar uma antiga descarta as seguintes e as rodadas posteriores à dela. */
export function registrarResposta(d: Demanda, p: Pergunta, valores: string[], outro: string, naoSei: boolean) {
  const est = garantirEstado(d);
  const idx = d.respostas.findIndex((r) => r.perguntaId === p.id);
  let rodada: number;
  if (idx >= 0) {
    rodada = d.respostas[idx].rodada ?? 0;
    d.respostas = d.respostas.slice(0, idx);
    est.rodadas = est.rodadas.filter((x) => x.numero <= rodada);
  } else {
    rodada = ultimaRodada(d)?.numero ?? 0;
  }
  const escolhidas = p.opcoes.filter((o) => valores.includes(o.valor));
  const resp: RespostaEntrevista = {
    perguntaId: p.id,
    enunciado: p.enunciado,
    valores: escolhidas.map((o) => o.valor),
    rotulos: escolhidas.map((o) => o.rotulo),
    outro: outro || undefined,
    naoSei: naoSei || undefined,
    // "Outro" e "Não sei" não têm sinal.
    sinais: filtrarSinais(escolhidas.flatMap((o) => o.sinais ?? [])),
    rodada,
    origem: p.origem ?? 'ROTEIRO',
  };
  d.respostas.push(resp);
}
