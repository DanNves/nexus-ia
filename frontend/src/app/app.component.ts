import { ChangeDetectionStrategy, Component, HostListener, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NexusApi } from './core/api/nexus-api.service';
import { Notificacao, Perfil, ResultadoBusca } from './core/api/models';
import { SessionService } from './core/session.service';
import { ToastService } from './shared/ui/toast.service';
import { UI } from './shared/ui/ui.components';
import { relativo } from './shared/labels';

@Component({
  selector: 'nx-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, ...UI],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly sessao = inject(SessionService);
  readonly toast = inject(ToastService);
  private api = inject(NexusApi);
  private router = inject(Router);

  readonly nav = [
    { rotulo: 'Visão geral', link: '/visao-geral', icone: 'home' },
    { rotulo: 'Demandas', link: '/demandas', icone: 'demand' },
    { rotulo: 'Calendário', link: '/calendario', icone: 'calendar' },
    { rotulo: 'Soluções', link: '/solucoes', icone: 'layers' },
    { rotulo: 'Fila', link: '/fila', icone: 'queue' },
  ];

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
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.fecharMenus());
    effect(() => {
      this.sessao.perfil();
      this.api.notificacoes().subscribe((n) => this.notificacoes.set(n));
    });
    this.termo$.pipe(
      debounceTime(200), distinctUntilChanged(),
      switchMap((t) => { this.buscando.set(true); return this.api.buscar(t); }),
      takeUntilDestroyed(),
    ).subscribe((r) => { this.resultados.set(r); this.buscando.set(false); });
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

  verComo(perfil: Perfil) {
    this.sessao.trocarPerfil(perfil);
    this.fecharMenus();
    this.toast.ok(perfil === 'EQUIPE' ? 'Agora você vê o NEXUS como a equipe responsável.' : 'Agora você vê o NEXUS como cliente.');
    void this.router.navigateByUrl('/visao-geral');
  }

  restaurar() {
    this.api.restaurarDemo().subscribe(() => {
      this.fecharMenus();
      this.toast.ok('Dados de demonstração restaurados.');
      this.sessao.trocarPerfil(this.sessao.perfil());
      void this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => this.router.navigateByUrl('/visao-geral'));
    });
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); this.abrirBusca(); }
    if (e.key === 'Escape') this.fecharMenus();
  }

  @HostListener('document:click', ['$event'])
  cliqueFora(e: MouseEvent) {
    const alvo = e.target as HTMLElement | null;
    if (alvo && !alvo.closest('.menu-ancora')) { this.menuUsuario.set(false); this.painelNotificacoes.set(false); }
  }
}
