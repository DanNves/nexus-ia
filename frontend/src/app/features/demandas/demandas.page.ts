import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Atividade, Demanda, EstadoAtividade, EstadoDemanda, Pessoa } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { ESTADO_ATIVIDADE, ESTADO_DEMANDA, ETAPAS, PRIORIDADE, dataCurta, etapaAtual, paraInputData, relativo } from '../../shared/labels';

type Filtro = 'todas' | 'levantamento' | 'equipe' | 'desenvolvimento' | 'standby' | 'entregues';

const FILTROS: { id: Filtro; rotulo: string; estados: EstadoDemanda[] }[] = [
  { id: 'todas', rotulo: 'Todas', estados: [] },
  { id: 'levantamento', rotulo: 'Em levantamento', estados: ['RASCUNHO', 'EM_LEVANTAMENTO'] },
  { id: 'equipe', rotulo: 'Com a equipe', estados: ['SOLICITADO', 'EM_ANALISE', 'REUNIAO_AGENDADA', 'PLANEJADO'] },
  { id: 'desenvolvimento', rotulo: 'Em desenvolvimento', estados: ['EM_DESENVOLVIMENTO'] },
  { id: 'standby', rotulo: 'Stand-by', estados: ['STAND_BY'] },
  { id: 'entregues', rotulo: 'Entregues', estados: ['ENTREGUE', 'INVIAVEL'] },
];

@Component({
  selector: 'nx-demandas',
  imports: [RouterLink, FormsModule, ...UI],
  templateUrl: './demandas.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemandasPage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  private router = inject(Router);
  private toast = inject(ToastService);

  /** ?aba=atividades vindo da URL */
  aba = input<string>();
  readonly abaAtual = computed(() => (this.aba() === 'atividades' ? 'atividades' : 'demandas'));

  readonly demandas = signal<Demanda[] | null>(null);
  readonly atividades = signal<Atividade[] | null>(null);
  readonly pessoas = signal<Pessoa[]>([]);
  readonly filtro = signal<Filtro>('todas');
  readonly busca = signal('');
  readonly visao = signal<'quadro' | 'lista'>('quadro');

  readonly FILTROS = FILTROS;
  readonly ESTADO_DEMANDA = ESTADO_DEMANDA;
  readonly ESTADO_ATIVIDADE = ESTADO_ATIVIDADE;
  readonly PRIORIDADE = PRIORIDADE;
  readonly ETAPAS = ETAPAS;
  readonly COLUNAS: EstadoAtividade[] = ['A_FAZER', 'EM_DESENVOLVIMENTO', 'EM_REVISAO', 'CONCLUIDA'];
  readonly etapaAtual = etapaAtual;
  readonly relativo = relativo;
  readonly dataCurta = dataCurta;

  readonly demandasFiltradas = computed(() => {
    const lista = this.demandas() ?? [];
    const f = FILTROS.find((x) => x.id === this.filtro())!;
    const t = this.busca().toLowerCase().trim();
    return lista
      .filter((d) => !f.estados.length || f.estados.includes(d.estado))
      .filter((d) => !t || `${d.codigo} ${d.nome}`.toLowerCase().includes(t));
  });

  readonly atividadesFiltradas = computed(() => {
    const t = this.busca().toLowerCase().trim();
    return (this.atividades() ?? []).filter((a) => !t || `${a.codigo} ${a.titulo}`.toLowerCase().includes(t));
  });

  // Nova atividade
  readonly novaAberta = signal(false);
  readonly salvando = signal(false);
  readonly erros = signal<Record<string, string[]>>({});
  nova = { titulo: '', demandaId: '', responsavelId: '', prazo: '' };

  constructor() {
    effect(() => {
      this.sessao.perfil();
      untracked(() => this.carregar());
    });
  }

  carregar() {
    this.demandas.set(null);
    this.atividades.set(null);
    forkJoin({ d: this.api.demandas(), a: this.api.atividades(), p: this.api.pessoas() }).subscribe(({ d, a, p }) => {
      this.demandas.set(d);
      this.atividades.set(a);
      this.pessoas.set(p);
    });
  }

  contagem(f: Filtro) {
    const def = FILTROS.find((x) => x.id === f)!;
    return (this.demandas() ?? []).filter((d) => !def.estados.length || def.estados.includes(d.estado)).length;
  }

  trocarAba(aba: 'demandas' | 'atividades') {
    void this.router.navigate([], { queryParams: { aba: aba === 'atividades' ? 'atividades' : null }, replaceUrl: true });
  }

  daColuna(e: EstadoAtividade) { return this.atividadesFiltradas().filter((a) => a.estado === e); }

  nomeDemanda(id: string) { return this.demandas()?.find((d) => d.id === id)?.nome ?? ''; }
  nomePessoa(id?: string) { return this.pessoas().find((p) => p.id === id)?.nome ?? '—'; }
  equipe() { return this.pessoas().filter((p) => p.perfil === 'EQUIPE'); }
  atrasada(a: Atividade) { return a.estado !== 'CONCLUIDA' && new Date(a.prazo) < new Date(); }

  mover(a: Atividade, estado: EstadoAtividade) {
    if (a.estado === estado) return;
    const anterior = a.estado;
    this.atividades.update((l) => l?.map((x) => (x.id === a.id ? { ...x, estado } : x)) ?? null);
    this.api.moverAtividade(a.id, estado).subscribe({
      next: () => this.toast.ok(`${a.codigo} agora está em "${ESTADO_ATIVIDADE[estado].rotulo}".`),
      error: (e) => {
        this.atividades.update((l) => l?.map((x) => (x.id === a.id ? { ...x, estado: anterior } : x)) ?? null);
        this.toast.erro(lerErro(e).mensagem);
      },
    });
  }

  abrirNova() {
    const prazo = new Date(); prazo.setDate(prazo.getDate() + 7);
    this.nova = { titulo: '', demandaId: '', responsavelId: '', prazo: paraInputData(prazo) };
    this.erros.set({});
    this.novaAberta.set(true);
  }

  demandasAtivas() { return (this.demandas() ?? []).filter((d) => !['ENTREGUE', 'INVIAVEL', 'STAND_BY'].includes(d.estado)); }

  criarAtividade() {
    const erros: Record<string, string[]> = {};
    if (this.nova.titulo.trim().length < 3) erros['titulo'] = ['Informe o título.'];
    if (!this.nova.demandaId) erros['demandaId'] = ['Escolha a demanda.'];
    if (!this.nova.responsavelId) erros['responsavelId'] = ['Escolha o responsável.'];
    if (!this.nova.prazo) erros['prazo'] = ['Informe o prazo.'];
    this.erros.set(erros);
    if (Object.keys(erros).length) return;
    this.salvando.set(true);
    this.api.criarAtividade({ ...this.nova, titulo: this.nova.titulo.trim(), prazo: `${this.nova.prazo}T18:00` }).subscribe({
      next: (a) => {
        this.atividades.update((l) => [...(l ?? []), a]);
        this.novaAberta.set(false);
        this.salvando.set(false);
        this.toast.ok(`Atividade ${a.codigo} criada. O prazo já está no calendário.`);
      },
      error: (e) => { this.salvando.set(false); this.erros.set(lerErro(e).campos ?? {}); this.toast.erro(lerErro(e).mensagem); },
    });
  }
}
