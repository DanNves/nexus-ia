import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../core/session.service';
import { NxIconComponent } from '../icon.component';
import { PassoTour, passosDoTour } from './passos';

const CHAVE_VISTO = 'nexus.ajuda.tour-visto';
const MARGEM = 12;   // distância mínima do balão até a borda da tela
const FOLGA = 6;     // respiro do destaque em volta do elemento
const DISTANCIA = 14; // espaço entre o destaque e o balão (cabe a seta)
const SETA_BORDA = 18; // a seta não encosta nos cantos arredondados do balão

interface Retangulo { top: number; left: number; width: number; height: number; }

// Botão "Ajuda" do topo + tour guiado pelas abas.
// Usa <dialog> nativo com showModal(): fica na camada superior (acima do topo sticky),
// prende o foco e deixa o resto da página inerte. Nada é salvo no servidor.
@Component({
  selector: 'nx-ajuda',
  imports: [NxIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button #botao type="button" class="btn-icone ajuda-botao" (click)="abrir()"
      aria-label="Ajuda: conhecer as abas" aria-haspopup="dialog" [attr.aria-expanded]="aberto()">
      <span class="ajuda-icone">
        <nx-icon name="help" />
        @if (!visto()) { <span class="ajuda-ponto" aria-hidden="true"></span> }
      </span>
      <span class="ajuda-texto" aria-hidden="true">Ajuda</span>
    </button>

    <dialog #dialogo class="tour" aria-modal="true" aria-labelledby="tour-titulo" aria-describedby="tour-texto"
      (cancel)="aoCancelar($event)" (close)="aoFecharNativo()" (keydown)="teclas($event)">
      @if (aberto() && passo(); as p) {
        @if (destaque(); as d) {
          <div class="tour-destaque" aria-hidden="true"
            [style.top.px]="d.top" [style.left.px]="d.left" [style.width.px]="d.width" [style.height.px]="d.height"></div>
        } @else {
          <div class="tour-veu" aria-hidden="true"></div>
        }

        <div #balao class="tour-balao" tabindex="-1" [class.posicionado]="!!posicao()" [class.animar]="animar()"
          [style.top.px]="posicao()?.top" [style.left.px]="posicao()?.left">
          @if (seta(); as s) { <span class="tour-seta" aria-hidden="true" [attr.data-lado]="s.lado" [style.left.px]="s.x"></span> }
          <div aria-live="polite" aria-atomic="true">
            <div class="tour-cabeca">
              <p class="tour-contador">Passo {{ indice() + 1 }} de {{ passos().length }}</p>
              <span class="tour-progresso" aria-hidden="true"><i [style.width.%]="(indice() + 1) / passos().length * 100"></i></span>
            </div>
            <h2 id="tour-titulo" class="tour-titulo">{{ p.titulo }}</h2>
            <p id="tour-texto" class="tour-texto">{{ p.texto }}</p>
            @if (dica(); as dc) { <p class="tour-dica"><nx-icon name="menu" [size]="14" /> {{ dc }}</p> }
          </div>
          <div class="tour-acoes">
            <button type="button" class="link tour-pular" (click)="fechar()">Pular tour</button>
            <span class="tour-navegacao">
              @if (indice() > 0) {
                <button type="button" class="btn btn-secundario btn-p" (click)="voltar()">Voltar</button>
              }
              @if (ultimo()) {
                <button type="button" class="btn btn-primario btn-p" (click)="fechar()">Concluir</button>
              } @else {
                <button type="button" class="btn btn-primario btn-p" (click)="proximo()">Próximo</button>
              }
            </span>
          </div>
        </div>
      }
    </dialog>
  `,
  styles: `
    :host { display: contents; }

    .ajuda-botao { width: auto; display: inline-flex; align-items: center; gap: 6px; padding: 0 10px 0 8px; font-weight: 500; }
    .ajuda-icone { position: relative; display: inline-flex; }
    .ajuda-ponto {
      position: absolute; top: -2px; right: -3px; width: 8px; height: 8px; border-radius: 50%;
      background: var(--azul); box-shadow: 0 0 0 2px var(--superficie);
    }

    /* Véu do tour: um pouco mais denso no escuro, onde a página já é escura e o recorte some. */
    .tour { --tour-veu: rgb(2 10 29 / 0.5); }
    :host-context(:root[data-tema='escuro']) .tour { --tour-veu: rgb(0 0 0 / 0.7); }

    .tour {
      position: fixed; inset: 0; width: 100%; height: 100%; max-width: 100%; max-height: 100%;
      margin: 0; padding: 0; border: 0; background: transparent; overflow: hidden; color: var(--texto);
    }
    .tour::backdrop { background: transparent; }

    .tour-veu { position: fixed; inset: 0; background: var(--tour-veu); }
    .tour-destaque {
      position: fixed; border-radius: var(--r-2); outline: 2px solid var(--azul); outline-offset: 0;
      box-shadow: 0 0 0 5px rgb(8 120 255 / 0.22), 0 0 0 9999px var(--tour-veu); pointer-events: none;
      transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease;
    }

    .tour-balao {
      position: fixed; top: 0; left: 0; width: min(340px, calc(100% - 24px)); visibility: hidden;
      background: var(--superficie); border: 1px solid var(--borda); border-radius: var(--r-3);
      box-shadow: var(--sombra-menu); padding: 16px 18px 14px;
    }
    .tour-balao.posicionado { visibility: visible; }
    .tour-balao.animar { transition: top 0.2s ease, left 0.2s ease; }
    .tour-balao:focus { outline: none; }
    .tour-balao:focus-visible { outline: 2px solid var(--azul); outline-offset: 2px; }

    /* Seta: quadrado girado com a mesma cor e borda do balão, apontando para o centro do destaque. */
    .tour-seta {
      position: absolute; width: 12px; height: 12px; margin-left: -6px;
      background: var(--superficie); border: 1px solid var(--borda); rotate: 45deg;
    }
    .tour-seta[data-lado='cima'] { top: -7px; border-right: 0; border-bottom: 0; }
    .tour-seta[data-lado='baixo'] { bottom: -7px; border-left: 0; border-top: 0; }
    .tour-balao.animar .tour-seta { transition: left 0.2s ease; }

    .tour-cabeca { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .tour-contador { margin: 0; font-size: 12px; font-weight: 500; color: var(--tom-azul-tx); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .tour-progresso { flex: 1; height: 3px; border-radius: 2px; background: var(--borda); overflow: hidden; }
    .tour-progresso i { display: block; height: 100%; border-radius: 2px; background: var(--azul); transition: width 0.2s ease; }
    .tour-titulo { margin: 0 0 4px; font-size: 17px; line-height: 1.3; letter-spacing: -0.01em; color: var(--titulo); }
    .tour-texto { margin: 0; font-size: 14px; line-height: 1.55; color: var(--texto); }
    .tour-dica {
      display: flex; gap: 6px; align-items: flex-start; margin: 10px 0 0; padding: 8px 10px; border-radius: var(--r-1);
      font-size: 13px; color: var(--texto); background: var(--tom-azul-bg);
    }
    .tour-dica nx-icon { color: var(--tom-azul-tx); margin-top: 2px; }

    .tour-acoes {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--borda);
    }
    .tour-pular { font-size: 13px; color: var(--texto-2); font-weight: 500; padding: 6px 0; }
    .tour-pular:hover { color: var(--texto); }
    .tour-navegacao { display: flex; gap: 6px; }

    /* Até 1280px o texto sai para a navbar caber sem quebrar (ícone + aria-label continuam). */
    @media (max-width: 1280px) {
      .ajuda-botao { width: 36px; padding: 0; justify-content: center; }
      .ajuda-texto { display: none; }
    }
    @media (max-width: 520px) {
      .tour-balao { padding: 16px 16px 12px; }
      .tour-navegacao .btn { height: 40px; padding: 0 16px; font-size: 14px; }
      .tour-pular { padding: 10px 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .tour-destaque, .tour-balao.animar, .tour-balao.animar .tour-seta, .tour-progresso i { transition: none; }
    }
  `,
})
export class AjudaComponent {
  private sessao = inject(SessionService);
  private router = inject(Router);
  private injector = inject(Injector);

  private botao = viewChild.required<ElementRef<HTMLButtonElement>>('botao');
  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');
  private balao = viewChild<ElementRef<HTMLElement>>('balao');

  readonly aberto = signal(false);
  readonly visto = signal(this.lerVisto());
  readonly passos = signal<PassoTour[]>([]);
  readonly indice = signal(0);
  readonly destaque = signal<Retangulo | null>(null);
  readonly posicao = signal<{ top: number; left: number } | null>(null);
  readonly dica = signal('');
  /** Seta do balão: lado em que fica (cima = balão abaixo do alvo) e posição x dentro do balão. */
  readonly seta = signal<{ lado: 'cima' | 'baixo'; x: number } | null>(null);
  /** Liga a transição do balão só depois da 1ª posição (senão ele "desliza" a partir do canto). */
  readonly animar = signal(false);

  readonly passo = computed(() => this.passos()[this.indice()] ?? null);
  readonly ultimo = computed(() => this.indice() === this.passos().length - 1);

  private quadro = 0;
  private readonly aoMudarTela = () => {
    cancelAnimationFrame(this.quadro);
    this.quadro = requestAnimationFrame(() => this.posicionar(false));
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.removerOuvintes());
  }

  abrir() {
    // Conteúdo calculado na hora: perfil atual e abas da página atual.
    this.passos.set(passosDoTour(this.router.url, { equipe: this.sessao.ehEquipe(), podeAlternarVisao: this.sessao.podeAlternarVisao(), admin: this.sessao.ehAdmin() }));
    this.indice.set(0);
    this.posicao.set(null);
    this.animar.set(false);
    this.aberto.set(true);
    this.marcarVisto();

    const dialogo = this.dialogo().nativeElement;
    if (!dialogo.open) dialogo.showModal();
    window.addEventListener('resize', this.aoMudarTela);
    window.addEventListener('scroll', this.aoMudarTela, true);
    this.irPara(0, true);
  }

  proximo() {
    if (!this.ultimo()) this.irPara(this.indice() + 1);
  }

  voltar() {
    if (this.indice() > 0) this.irPara(this.indice() - 1);
  }

  fechar() {
    if (!this.aberto()) return;
    this.aberto.set(false);
    this.destaque.set(null);
    this.posicao.set(null);
    this.removerOuvintes();
    const dialogo = this.dialogo().nativeElement;
    if (dialogo.open) dialogo.close();
    this.botao().nativeElement.focus();
  }

  aoCancelar(e: Event) {
    // Esc: fecha pelo nosso caminho para devolver o foco ao botão.
    e.preventDefault();
    this.fechar();
  }

  aoFecharNativo() {
    // O navegador pode fechar o <dialog> por conta própria; mantém o estado coerente.
    if (this.aberto()) this.fechar();
  }

  teclas(e: KeyboardEvent) {
    if (e.altKey || e.metaKey) return;
    if (e.ctrlKey) {
      // Evita abrir a busca (Ctrl K do topo) por cima do tour.
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (e.key === 'ArrowRight') { e.preventDefault(); this.proximo(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.voltar(); }
  }

  private irPara(i: number, focarBalao = false) {
    this.indice.set(i);
    afterNextRender(() => {
      this.posicionar(true);
      if (!this.animar()) requestAnimationFrame(() => this.animar.set(true));
      const balao = this.balao()?.nativeElement;
      const ativo = document.activeElement as HTMLElement | null;
      // Foco no balão ao abrir ou quando o botão focado deixou de existir (ex.: "Voltar" no 1º passo).
      if (balao && (focarBalao || !ativo || !balao.contains(ativo))) balao.focus({ preventScroll: true });
    }, { injector: this.injector });
  }

  private posicionar(rolar: boolean) {
    const p = this.passo();
    const balao = this.balao()?.nativeElement;
    if (!this.aberto() || !p || !balao) return;

    let alvo = this.elementoVisivel(p.seletor);
    let dica = '';
    if (!alvo && p.alternativa) {
      alvo = this.elementoVisivel(p.alternativa.seletor);
      if (alvo) dica = p.alternativa.dica;
    }
    this.dica.set(dica);

    const larguraTela = document.documentElement.clientWidth;
    const alturaTela = document.documentElement.clientHeight;

    if (alvo && rolar && this.foraDaTela(alvo.getBoundingClientRect(), larguraTela, alturaTela)) {
      const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      alvo.scrollIntoView({ block: 'center', inline: 'nearest', behavior: suave ? 'smooth' : 'auto' });
    }

    const w = balao.offsetWidth;
    const h = balao.offsetHeight;

    if (!alvo) {
      this.destaque.set(null);
      this.seta.set(null);
      this.posicao.set({
        top: Math.max(MARGEM, (alturaTela - h) / 2),
        left: Math.max(MARGEM, (larguraTela - w) / 2),
      });
      return;
    }

    const r = alvo.getBoundingClientRect();
    const d: Retangulo = { top: r.top - FOLGA, left: r.left - FOLGA, width: r.width + FOLGA * 2, height: r.height + FOLGA * 2 };
    this.destaque.set(d);

    const abaixo = d.top + d.height + DISTANCIA;
    const acima = d.top - DISTANCIA - h;
    let top: number;
    let lado: 'cima' | 'baixo' | null = null;
    if (abaixo + h <= alturaTela - MARGEM) { top = abaixo; lado = 'cima'; }
    else if (acima >= MARGEM) { top = acima; lado = 'baixo'; }
    else top = alturaTela - h - MARGEM; // sem espaço: encosta no rodapé da tela (sem seta)

    const centro = d.left + d.width / 2 - w / 2;
    const left = Math.min(Math.max(MARGEM, centro), Math.max(MARGEM, larguraTela - w - MARGEM));
    this.posicao.set({ top: Math.max(MARGEM, top), left });
    const x = d.left + d.width / 2 - left;
    this.seta.set(lado && x >= SETA_BORDA && x <= w - SETA_BORDA ? { lado, x } : null);
  }

  private elementoVisivel(seletor: string): HTMLElement | null {
    let el: HTMLElement | null = null;
    try { el = document.querySelector<HTMLElement>(seletor); } catch { return null; }
    if (!el || el.closest('dialog.tour')) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return getComputedStyle(el).visibility === 'hidden' ? null : el;
  }

  private foraDaTela(r: DOMRect, largura: number, altura: number) {
    return r.top < 0 || r.left < 0 || r.bottom > altura || r.right > largura;
  }

  private removerOuvintes() {
    cancelAnimationFrame(this.quadro);
    window.removeEventListener('resize', this.aoMudarTela);
    window.removeEventListener('scroll', this.aoMudarTela, true);
  }

  private lerVisto() {
    try { return localStorage.getItem(CHAVE_VISTO) === '1'; } catch { return true; }
  }

  private marcarVisto() {
    this.visto.set(true);
    try { localStorage.setItem(CHAVE_VISTO, '1'); } catch { /* só um lembrete visual */ }
  }
}
