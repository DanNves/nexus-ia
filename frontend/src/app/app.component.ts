import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NexusApi } from './core/api/nexus-api.service';
import { Notificacao, ResultadoBusca } from './core/api/models';
import { AuthService } from './core/auth/auth.service';
import { SessionService } from './core/session.service';
import { TemaService } from './core/tema.service';
import { ToastService } from './shared/ui/toast.service';
import { UI } from './shared/ui/ui.components';
import { AjudaComponent } from './shared/ajuda/ajuda.component';
import { relativo } from './shared/labels';

@Component({
  selector: 'nx-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, AjudaComponent, ...UI],
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

  readonly nav = [
    { rotulo: 'Visão geral', link: '/visao-geral', icone: 'home' },
    { rotulo: 'Demandas', link: '/demandas', icone: 'demand' },
    { rotulo: 'Calendário', link: '/calendario', icone: 'calendar' },
    { rotulo: 'Soluções', link: '/solucoes', icone: 'layers' },
    { rotulo: 'Fila', link: '/fila', icone: 'queue' },
  ];

  // /entrar e /criar-conta: só o conteúdo da página e os avisos, sem o topo.
  private readonly rotaPublica = signal(ehRotaPublica(location.pathname));
  readonly mostrarTopo = computed(() => this.auth.autenticado() && !this.rotaPublica());

  readonly menuMobile = signal(false);
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
      this.rotaPublica.set(ehRotaPublica(e.urlAfterRedirects));
      this.fecharMenus();
    });
    // Notificações do usuário logado; sem sessão não há o que buscar.
    effect(() => {
      const u = this.auth.usuario();
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
    this.api.restaurarDemo().subscribe(() => {
      this.fecharMenus();
      this.toast.ok('Dados de demonstração restaurados.');
      this.carregarNotificacoes();
      void this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigateByUrl('/visao-geral'));
    });
  }

  sair() {
    this.fecharMenus();
    this.auth.sair().subscribe(() => this.toast.ok('Você saiu do NEXUS.'));
  }

  abrirBusca() {
    this.fecharMenus();
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
    this.menuMobile.set(false);
    this.menuUsuario.set(false);
    this.painelNotificacoes.set(false);
  }

  @HostListener('document:keydown', ['$event'])
  atalho(e: KeyboardEvent) {
    if (!this.mostrarTopo()) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.abrirBusca(); }
    if (e.key === 'Escape') this.fecharMenus();
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
