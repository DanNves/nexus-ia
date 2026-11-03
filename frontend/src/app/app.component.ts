import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, Injector, afterNextRender, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NexusApi } from './core/api/nexus-api.service';
import { Notificacao, Perfil, ResultadoBusca } from './core/api/models';
import { AuthService } from './core/auth/auth.service';
import { SessionService } from './core/session.service';
import { TemaService } from './core/tema.service';
import { ToastService } from './shared/ui/toast.service';
import { UI } from './shared/ui/ui.components';
import { AjudaComponent } from './shared/ajuda/ajuda.component';
import { RascunhoService } from './shared/rascunho/rascunho';
import { relativo } from './shared/labels';
import { AVISO_VISAO, ROTULO_VISAO, itemAtivo, menuDa, paginaDaUrl, trilhaDa } from './shared/perfis';

const CHAVE_RECOLHIDO = 'nexus.menu-recolhido';
/** Até aqui o menu lateral vira gaveta (sheet do template). Mesmo valor do CSS. */
const MOBILE = '(max-width: 760px)';

function lerRecolhido(): boolean {
  try {
    const v = localStorage.getItem(CHAVE_RECOLHIDO);
    if (v === '1' || v === '0') return v === '1';
  } catch { /* ignora */ }
  // Sem preferência salva: em telas médias começa só com ícones, para o conteúdo respirar.
  return window.matchMedia?.('(max-width: 980px)').matches ?? false;
}

@Component({
  selector: 'nx-root',
  imports: [RouterOutlet, RouterLink, FormsModule, AjudaComponent, ...UI],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly sessao = inject(SessionService);
  readonly auth = inject(AuthService);
  readonly toast = inject(ToastService);
  readonly tema = inject(TemaService);
  private api = inject(NexusApi);
  private router = inject(Router);
  private rascunhos = inject(RascunhoService);
  private injector = inject(Injector);

  readonly rotuloVisao = ROTULO_VISAO;

  private readonly url = signal(location.pathname + location.search);
  private readonly pagina = computed(() => paginaDaUrl(this.url()));
  /** Menu lateral da visão ativa (shared/perfis.ts): solicitante, equipe ou administrador. */
  readonly menu = computed(() => menuDa(this.sessao.perfil(), this.sessao.ehEquipe() && this.sessao.ehAdmin()));
  readonly ativo = computed(() => itemAtivo(this.pagina()));
  readonly trilha = computed(() => trilhaDa(this.pagina(), this.sessao.perfil(), this.sessao.ehEquipe() && this.sessao.ehAdmin()));

  // /entrar e /criar-conta: só o conteúdo da página e os avisos, sem a casca.
  private readonly rotaPublica = signal(ehRotaPublica(location.pathname));
  readonly mostrarTopo = computed(() => this.auth.autenticado() && !this.rotaPublica());

  /** Desktop: menu só com ícones (lembrado neste navegador). Mobile: gaveta aberta ou fechada. */
  readonly recolhida = signal(lerRecolhido());
  readonly mobile = signal(window.matchMedia?.(MOBILE).matches ?? false);
  readonly gavetaAberta = signal(false);
  readonly icones = computed(() => this.recolhida() && !this.mobile());
  private sidebar = viewChild<ElementRef<HTMLElement>>('sidebar');
  private botaoMenu = viewChild<ElementRef<HTMLButtonElement>>('alternar');

  readonly menuUsuario = signal(false);
  readonly painelNotificacoes = signal(false);
  readonly buscaAberta = signal(false);
  readonly notificacoes = signal<Notificacao[]>([]);
  readonly resultados = signal<ResultadoBusca[]>([]);
  readonly buscando = signal(false);
  termo = '';
  private termo$ = new Subject<string>();
  readonly relativo = relativo;

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe((e) => {
      this.url.set(e.urlAfterRedirects);
      this.rotaPublica.set(ehRotaPublica(e.urlAfterRedirects));
      this.fecharMenus();
      this.gavetaAberta.set(false);
    });

    const consulta = window.matchMedia?.(MOBILE);
    if (consulta) {
      const aoMudar = (e: MediaQueryListEvent) => { this.mobile.set(e.matches); if (!e.matches) this.gavetaAberta.set(false); };
      consulta.addEventListener('change', aoMudar);
      inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', aoMudar));
    }

    // Notificações do usuário logado (e da visão ativa); sem sessão não há o que buscar.
    effect(() => {
      const u = this.auth.usuario();
      this.sessao.perfil();
      untracked(() => (u ? this.carregarNotificacoes() : this.notificacoes.set([])));
    });
    this.termo$.pipe(
      debounceTime(200), distinctUntilChanged(),
      switchMap((t) => { this.buscando.set(true); return this.api.buscar(t); }),
      takeUntilDestroyed(),
    ).subscribe((r) => { this.resultados.set(r); this.buscando.set(false); });
  }

  private carregarNotificacoes() {
    this.api.notificacoes().subscribe({ next: (n) => this.notificacoes.set(n), error: () => this.notificacoes.set([]) });
  }

  naoLidas() { return this.notificacoes().filter((n) => !n.lida).length; }

  // ---------------------------------------------------------------- Menu lateral

  alternarMenu() {
    if (this.mobile()) {
      if (this.gavetaAberta()) this.fecharGaveta(true);
      else this.abrirGaveta();
      return;
    }
    const v = !this.recolhida();
    this.recolhida.set(v);
    try { localStorage.setItem(CHAVE_RECOLHIDO, v ? '1' : '0'); } catch { /* ignora */ }
  }

  private abrirGaveta() {
    this.fecharMenus();
    this.gavetaAberta.set(true);
    afterNextRender(() => this.focaveis()[0]?.focus(), { injector: this.injector });
  }

  fecharGaveta(devolverFoco = false) {
    if (!this.gavetaAberta()) return;
    this.gavetaAberta.set(false);
    if (devolverFoco) this.botaoMenu()?.nativeElement.focus();
  }

  /** Foco preso na gaveta aberta (mobile): Tab e Shift+Tab giram dentro dela. */
  teclasGaveta(e: KeyboardEvent) {
    if (!this.mobile() || !this.gavetaAberta() || e.key !== 'Tab') return;
    const lista = this.focaveis();
    if (!lista.length) return;
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  }

  private focaveis(): HTMLElement[] {
    const el = this.sidebar()?.nativeElement;
    return el ? Array.from(el.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')) : [];
  }

  // ---------------------------------------------------------------- Cabeçalho

  alternarNotificacoes() {
    const abrir = !this.painelNotificacoes();
    this.fecharMenus();
    this.painelNotificacoes.set(abrir);
    if (abrir && this.naoLidas()) this.api.lerNotificacoes().subscribe((n) => setTimeout(() => this.notificacoes.set(n), 1500));
  }

  alternarUsuario() {
    const abrir = !this.menuUsuario();
    this.fecharMenus();
    this.menuUsuario.set(abrir);
  }

  restaurar() {
    if (!this.sessao.ehEquipe()) return;
    this.api.restaurarDemo().subscribe(() => {
      this.rascunhos.descartarTodos();
      this.fecharMenus();
      this.toast.ok('Dados de demonstração restaurados.');
      this.carregarNotificacoes();
      void this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigateByUrl('/visao-geral'));
    });
  }

  /** Equipe alterna entre ver o NEXUS como solicitante ou como equipe. Volta para a visão geral (a página atual pode não existir na outra visão). */
  trocarVisao(v: Perfil) {
    if (this.sessao.perfil() === v) return;
    this.sessao.trocarVisao(v);
    this.fecharMenus();
    this.toast.ok(AVISO_VISAO[v]);
    void this.router.navigateByUrl('/visao-geral');
  }

  sair() {
    this.fecharMenus();
    this.auth.sair().subscribe(() => this.toast.ok('Você saiu do NEXUS.'));
  }

  abrirBusca() {
    this.fecharMenus();
    this.gavetaAberta.set(false);
    this.termo = '';
    this.resultados.set([]);
    this.buscaAberta.set(true);
  }

  buscar(t: string) { this.termo$.next(t.trim()); }

  irPara(link: string) {
    this.buscaAberta.set(false);
    void this.router.navigateByUrl(link);
  }

  fecharMenus() {
    this.menuUsuario.set(false);
    this.painelNotificacoes.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  atalho(e: KeyboardEvent) {
    if (!this.mostrarTopo()) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.abrirBusca(); }
    if (e.key === 'Escape') {
      if (this.gavetaAberta()) this.fecharGaveta(true);
      this.fecharMenus();
    }
  }

  @HostListener('document:click', ['$event'])
  cliqueFora(e: MouseEvent) {
    const alvo = e.target as HTMLElement | null;
    if (alvo && !alvo.closest('.menu-ancora')) { this.menuUsuario.set(false); this.painelNotificacoes.set(false); }
  }
}

function ehRotaPublica(url: string) {
  return /^\/(entrar|criar-conta)(?:[/?#]|$)/.test(url);
}
