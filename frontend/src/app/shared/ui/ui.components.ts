// Componentes de UI oficiais. Um por tipo: não criar variações em outras telas.
import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { Tom } from '../labels';
import { NxIconComponent } from '../icon.component';

@Component({
  selector: 'nx-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [attr.data-tom]="tom()"><ng-content /></span>`,
})
export class BadgeComponent {
  tom = input<Tom>('cinza');
}

const CORES = ['#0878FF', '#159B70', '#7355C8', '#C27A16', '#1F3550', '#D0456B'];

@Component({
  selector: 'nx-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="avatar" [style.background]="cor()" [style.width.px]="tamanho()" [style.height.px]="tamanho()" [attr.title]="nome()">{{ iniciais() }}</span>`,
})
export class AvatarComponent {
  nome = input.required<string>();
  tamanho = input(28);
  iniciais() {
    const p = this.nome().split(' ').filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  cor() {
    const n = [...this.nome()].reduce((a, c) => a + c.charCodeAt(0), 0);
    return CORES[n % CORES.length];
  }
}

// Painel lateral / modal. Usa <dialog> nativo para foco e Esc acessíveis.
@Component({
  selector: 'nx-dialog',
  imports: [NxIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="dialog" [class.dialog-lateral]="lateral()" (close)="fechou.emit()" (click)="cliqueFora($event)">
      <div class="dialog-corpo">
        <header class="dialog-topo">
          <h2>{{ titulo() }}</h2>
          <button type="button" class="btn-icone" (click)="dlg.close()" aria-label="Fechar"><nx-icon name="close" /></button>
        </header>
        <ng-content />
      </div>
    </dialog>`,
})
export class DialogComponent {
  titulo = input.required<string>();
  aberto = input(false);
  lateral = input(false);
  fechou = output<void>();
  private dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.aberto() && !el.open) el.showModal();
      if (!this.aberto() && el.open) el.close();
    });
  }

  cliqueFora(e: MouseEvent) {
    if (e.target === this.dlg().nativeElement) this.dlg().nativeElement.close();
  }
}

@Component({
  selector: 'nx-vazio',
  imports: [NxIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vazio">
      <nx-icon [name]="icone()" [size]="22" />
      <p class="vazio-titulo">{{ titulo() }}</p>
      @if (texto()) { <p class="mudo">{{ texto() }}</p> }
      <ng-content />
    </div>`,
})
export class VazioComponent {
  icone = input('inbox');
  titulo = input.required<string>();
  texto = input('');
}

@Component({
  selector: 'nx-erro-campo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (m of mensagens(); track m) { <p class="erro-campo" role="alert">{{ m }}</p> }`,
})
export class ErroCampoComponent {
  mensagens = input<string[] | undefined>([]);
}

// Renderiza HTML de protótipo isolado: iframe com sandbox vazio (sem scripts, sem acesso à página).
// O HTML é montado pelo próprio sistema, com textos do usuário escapados.
@Component({
  selector: 'nx-prototipo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<iframe #frame class="prototipo-frame" sandbox="" [attr.title]="titulo()"></iframe>`,
})
export class PrototipoFrameComponent {
  html = input.required<string>();
  titulo = input('Protótipo');
  private frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');

  constructor() {
    effect(() => {
      this.frame().nativeElement.srcdoc = this.html();
    });
  }
}

export const UI = [BadgeComponent, AvatarComponent, DialogComponent, VazioComponent, ErroCampoComponent, PrototipoFrameComponent, NxIconComponent] as const;
