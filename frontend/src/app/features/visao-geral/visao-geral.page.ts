import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { VisaoGeral } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ESTADO_DEMANDA, ETAPAS, TIPO_EVENTO, dataCurta, diaRelativo, etapaAtual, hora, relativo } from '../../shared/labels';

/** Fatia de um gráfico empilhado. `serie` = posição na paleta validada (--serie-1..4). */
interface Fatia { rotulo: string; valor: number; serie: 1 | 2 | 3 | 4 }

// Painel (dashboard) da visão geral. Todo número vem de /visao-geral e é calculado sobre o que a pessoa
// pode ver (CLAUDE.md §18: indicadores derivados dos dados, nunca inventados).
@Component({
  selector: 'nx-visao-geral',
  imports: [RouterLink, ...UI],
  templateUrl: './visao-geral.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaoGeralPage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  readonly dados = signal<VisaoGeral | null>(null);
  readonly erro = signal('');

  readonly ESTADO_DEMANDA = ESTADO_DEMANDA;
  readonly TIPO_EVENTO = TIPO_EVENTO;
  readonly ETAPAS = ETAPAS;
  readonly etapaAtual = etapaAtual;
  readonly diaRelativo = diaRelativo;
  readonly hora = hora;
  readonly relativo = relativo;
  readonly dataCurta = dataCurta;

  /** Cartões de número no topo: cada um leva para onde a pessoa age. */
  readonly kpis = computed(() => {
    const d = this.dados();
    if (!d) return [];
    const i = d.indicadores;
    const abertos = i.chamados.naFila + i.chamados.emAtendimento;
    return this.sessao.ehEquipe()
      ? [
          { rotulo: 'Demandas ativas', valor: d.numeros.demandasAtivas, dica: 'em todas as etapas', icone: 'demand', link: '/demandas' },
          { rotulo: 'Validações pendentes', valor: d.numeros.validacoesPendentes, dica: 'sugestões da IA esperando alguém', icone: 'check-circle', link: '/demandas' },
          { rotulo: 'Chamados na fila', valor: i.chamados.naFila, dica: `${i.chamados.emAtendimento} em atendimento`, icone: 'queue', link: '/fila' },
          { rotulo: 'Entregues', valor: d.numeros.entregues, dica: 'demandas concluídas', icone: 'package', link: '/solucoes' },
        ]
      : [
          { rotulo: 'Suas demandas ativas', valor: d.numeros.demandasAtivas, dica: 'em andamento', icone: 'demand', link: '/demandas' },
          { rotulo: 'Esperando você', valor: d.pendencias.length, dica: d.pendencias.length ? 'veja abaixo' : 'nada pendente', icone: 'bell', link: '/visao-geral' },
          { rotulo: 'Chamados abertos', valor: abertos, dica: `${i.chamados.naFila} na fila`, icone: 'queue', link: '/fila' },
          { rotulo: 'Entregues', valor: d.numeros.entregues, dica: 'demandas concluídas', icone: 'package', link: '/solucoes' },
        ];
  });

  /** Barras horizontais: demandas em cada etapa (uma série, um tom). */
  readonly etapas = computed(() => {
    const l = this.dados()?.indicadores.demandasPorEtapa ?? [];
    const max = Math.max(1, ...l);
    return ETAPAS.map((rotulo, i) => ({ rotulo, valor: l[i] ?? 0, pct: ((l[i] ?? 0) / max) * 100 }));
  });
  readonly totalDemandas = computed(() => this.etapas().reduce((a, e) => a + e.valor, 0));

  readonly chamados = computed<Fatia[]>(() => {
    const c = this.dados()?.indicadores.chamados;
    if (!c) return [];
    return [
      { rotulo: 'Na fila', valor: c.naFila, serie: 2 },
      { rotulo: 'Em atendimento', valor: c.emAtendimento, serie: 1 },
      { rotulo: 'Resolvidos', valor: c.resolvidos, serie: 3 },
    ];
  });

  readonly requisitos = computed<Fatia[]>(() => {
    const r = this.dados()?.indicadores.requisitos;
    if (!r) return [];
    return [
      { rotulo: 'Aprovados sem edição', valor: r.aprovados, serie: 3 },
      { rotulo: 'Aprovados com edição', valor: r.editados, serie: 1 },
      { rotulo: 'Rejeitados', valor: r.rejeitados, serie: 2 },
      { rotulo: 'Aguardando validação', valor: r.aguardando, serie: 4 },
    ];
  });

  /** % de sugestões decididas que foram aprovadas sem edição (indicador do TCC). */
  readonly aceitacao = computed(() => {
    const r = this.dados()?.indicadores.requisitos;
    if (!r) return null;
    const decididos = r.aprovados + r.editados + r.rejeitados;
    return decididos ? Math.round((r.aprovados / decididos) * 100) : null;
  });

  /** Colunas agrupadas: demandas abertas × chamados abertos por semana (mesma unidade, um eixo). */
  readonly semanas = computed(() => {
    const l = this.dados()?.indicadores.semanas ?? [];
    const max = Math.max(1, ...l.flatMap((s) => [s.demandas, s.chamados]));
    const topo = max <= 4 ? 4 : Math.ceil(max / 2) * 2;
    return {
      topo,
      marcas: [topo, topo / 2, 0],
      itens: l.map((s, i) => ({
        ...s,
        rotulo: i === l.length - 1 ? 'Esta' : dataCurta(s.inicio),
        hD: (s.demandas / topo) * 100,
        hC: (s.chamados / topo) * 100,
      })),
      vazio: l.every((s) => !s.demandas && !s.chamados),
    };
  });

  constructor() {
    effect(() => {
      this.sessao.perfil();
      untracked(() => this.carregar());
    });
  }

  carregar() {
    this.dados.set(null);
    this.erro.set('');
    this.api.visaoGeral().subscribe({ next: (d) => this.dados.set(d), error: (e) => this.erro.set(lerErro(e).mensagem) });
  }

  total(f: Fatia[]) { return f.reduce((a, x) => a + x.valor, 0); }
  pct(f: Fatia[], x: Fatia) { const t = this.total(f); return t ? (x.valor / t) * 100 : 0; }

  saudacao() {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  primeiroNome() { return this.sessao.usuario.nome.split(' ')[0]; }
}
