import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Demanda, Evento, Pessoa, TipoEvento } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { TIPO_EVENTO, diaRelativo, hora, paraInputDataHora } from '../../shared/labels';

interface Dia { data: Date; chave: string; doMes: boolean; hoje: boolean; eventos: Evento[] }

const chave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

@Component({
  selector: 'nx-calendario',
  imports: [RouterLink, FormsModule, ...UI],
  templateUrl: './calendario.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioPage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  private toast = inject(ToastService);

  readonly mes = signal(this.inicioDoMes(new Date()));
  readonly selecionado = signal(chave(new Date()));
  readonly eventos = signal<Evento[] | null>(null);
  readonly demandas = signal<Demanda[]>([]);
  readonly pessoas = signal<Pessoa[]>([]);
  readonly aberto = signal<Evento | null>(null);
  readonly filtroTipo = signal<TipoEvento | ''>('');

  readonly TIPO_EVENTO = TIPO_EVENTO;
  readonly TIPOS = Object.keys(TIPO_EVENTO) as TipoEvento[];
  readonly SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  readonly hora = hora;
  readonly diaRelativo = diaRelativo;

  readonly tituloMes = computed(() => {
    const t = this.mes().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  });

  readonly visiveis = computed(() => (this.eventos() ?? []).filter((e) => !this.filtroTipo() || e.tipo === this.filtroTipo()));

  readonly dias = computed<Dia[]>(() => {
    const m = this.mes();
    const inicio = new Date(m);
    inicio.setDate(1 - m.getDay());
    const hoje = chave(new Date());
    const porDia = new Map<string, Evento[]>();
    for (const e of this.visiveis()) {
      const k = chave(new Date(e.inicio));
      porDia.set(k, [...(porDia.get(k) ?? []), e]);
    }
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      const k = chave(d);
      return { data: d, chave: k, doMes: d.getMonth() === m.getMonth(), hoje: k === hoje, eventos: porDia.get(k) ?? [] };
    });
  });

  readonly semanas = computed(() => {
    const d = this.dias();
    // Remove a última semana se ela for toda do mês seguinte.
    const n = d.slice(35).every((x) => !x.doMes) ? 5 : 6;
    return Array.from({ length: n }, (_, i) => d.slice(i * 7, i * 7 + 7));
  });

  readonly doDia = computed(() => this.dias().find((d) => d.chave === this.selecionado())?.eventos ?? this.eventosDoDiaFora());

  readonly proximos = computed(() => {
    const agora = new Date(); agora.setHours(0, 0, 0, 0);
    return this.visiveis().filter((e) => new Date(e.inicio) >= agora).slice(0, 6);
  });

  // Novo evento
  readonly novoAberto = signal(false);
  readonly salvando = signal(false);
  readonly erros = signal<Record<string, string[]>>({});
  novo = { titulo: '', tipo: 'REUNIAO' as TipoEvento, inicio: '', demandaId: '', local: '', descricao: '' };

  constructor() {
    effect(() => {
      this.sessao.perfil();
      untracked(() => this.carregar());
    });
  }

  carregar() {
    this.eventos.set(null);
    forkJoin({ e: this.api.eventos(), d: this.api.demandas(), p: this.api.pessoas() }).subscribe(({ e, d, p }) => {
      this.eventos.set(e);
      this.demandas.set(d);
      this.pessoas.set(p);
    });
  }

  private eventosDoDiaFora() {
    return this.visiveis().filter((e) => chave(new Date(e.inicio)) === this.selecionado());
  }

  inicioDoMes(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

  navegar(delta: number) {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  irHoje() {
    this.mes.set(this.inicioDoMes(new Date()));
    this.selecionado.set(chave(new Date()));
  }

  selecionar(d: Dia) { this.selecionado.set(d.chave); }

  rotuloSelecionado() {
    const d = this.dias().find((x) => x.chave === this.selecionado());
    if (!d) return 'Dia selecionado';
    return diaRelativo(d.data.toISOString()) + (d.hoje ? '' : `, ${d.data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`);
  }

  nomeDemanda(id?: string) { return this.demandas().find((d) => d.id === id)?.nome; }
  nomePessoa(id: string) { return this.pessoas().find((p) => p.id === id)?.nome ?? ''; }

  dataLonga(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  rotuloDia(d: Dia) {
    const n = d.eventos.length;
    return `${d.data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}${n ? `, ${n} ${n === 1 ? 'compromisso' : 'compromissos'}` : ''}`;
  }

  abrirNovo() {
    const base = this.dias().find((d) => d.chave === this.selecionado())?.data ?? new Date();
    const inicio = new Date(base);
    inicio.setHours(10, 0, 0, 0);
    if (inicio < new Date()) { const amanha = new Date(); amanha.setDate(amanha.getDate() + 1); amanha.setHours(10, 0, 0, 0); inicio.setTime(amanha.getTime()); }
    this.novo = { titulo: '', tipo: 'REUNIAO', inicio: paraInputDataHora(inicio), demandaId: '', local: '', descricao: '' };
    this.erros.set({});
    this.novoAberto.set(true);
  }

  criar() {
    const erros: Record<string, string[]> = {};
    if (this.novo.titulo.trim().length < 3) erros['titulo'] = ['Informe o título.'];
    if (!this.novo.inicio) erros['inicio'] = ['Informe data e horário.'];
    this.erros.set(erros);
    if (Object.keys(erros).length) return;
    this.salvando.set(true);
    this.api.criarEvento({
      titulo: this.novo.titulo.trim(), tipo: this.novo.tipo, inicio: this.novo.inicio,
      demandaId: this.novo.demandaId || undefined, local: this.novo.local.trim() || undefined, descricao: this.novo.descricao.trim() || undefined,
    }).subscribe({
      next: (e) => {
        this.eventos.update((l) => [...(l ?? []), e].sort((a, b) => a.inicio.localeCompare(b.inicio)));
        const d = new Date(e.inicio);
        this.mes.set(this.inicioDoMes(d));
        this.selecionado.set(chave(d));
        this.novoAberto.set(false);
        this.salvando.set(false);
        this.toast.ok('Compromisso adicionado ao calendário.');
      },
      error: (e) => { this.salvando.set(false); this.erros.set(lerErro(e).campos ?? {}); this.toast.erro(lerErro(e).mensagem); },
    });
  }
}
