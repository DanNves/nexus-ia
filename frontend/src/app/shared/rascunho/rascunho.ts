// Autosave (rascunhos) dos formulários. Fica só neste navegador, separado por usuário, e some quando
// o envio dá certo ou quando a demonstração é restaurada. Nunca usar em campos de senha.
import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Directive, Injectable, inject, input, signal,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Subject, filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { NxIconComponent } from '../icon.component';

const PREFIXO = 'nexus.rascunho.';

export interface Rascunho<T> { valor: T; salvoEm: Date }

@Injectable({ providedIn: 'root' })
export class RascunhoService {
  private auth = inject(AuthService);
  /** Avisa os formulários abertos que o rascunho deles foi descartado (somem do indicador). */
  readonly descartados = new Subject<string>();

  private chaveDe(chave: string) {
    const u = this.auth.usuario();
    return u ? `${PREFIXO}${u.id}.${chave}` : null;
  }

  ler<T>(chave: string): Rascunho<T> | null {
    const k = this.chaveDe(chave);
    if (!k) return null;
    try {
      const bruto = localStorage.getItem(k);
      if (!bruto) return null;
      const salvo = JSON.parse(bruto) as { valor: T; salvoEm: string };
      return { valor: salvo.valor, salvoEm: new Date(salvo.salvoEm) };
    } catch {
      return null;
    }
  }

  /** Grava o rascunho e devolve quando foi salvo (null se não deu: sem sessão ou armazenamento cheio/bloqueado). */
  salvar<T>(chave: string, valor: T): Date | null {
    const k = this.chaveDe(chave);
    if (!k) return null;
    const salvoEm = new Date();
    try {
      localStorage.setItem(k, JSON.stringify({ valor, salvoEm: salvoEm.toISOString() }));
      return salvoEm;
    } catch {
      return null;
    }
  }

  descartar(chave: string) {
    const k = this.chaveDe(chave);
    if (!k) return;
    try { localStorage.removeItem(k); } catch { /* ignora */ }
    this.descartados.next(chave);
  }

  /** Remove os rascunhos de todos os usuários deste navegador (restaurar dados de demonstração). */
  descartarTodos() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(PREFIXO)).forEach((k) => localStorage.removeItem(k));
    } catch { /* ignora */ }
  }
}

/**
 * `<form nxRascunho="chave" #r="nxRascunho">`: restaura o que foi digitado antes e salva a cada alteração feita
 * pelo usuário. A página chama `RascunhoService.descartar(chave)` quando o envio dá certo.
 */
@Directive({ selector: 'form[nxRascunho]', exportAs: 'nxRascunho' })
export class RascunhoDirective implements AfterViewInit {
  readonly chave = input.required<string>({ alias: 'nxRascunho' });
  readonly salvoEm = signal<Date | null>(null);

  private ngForm = inject(NgForm);
  private rascunhos = inject(RascunhoService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private destruido = false;

  constructor() {
    this.destroyRef.onDestroy(() => (this.destruido = true));
    this.rascunhos.descartados
      .pipe(filter((c) => c === this.chave()), takeUntilDestroyed())
      .subscribe(() => { this.salvoEm.set(null); this.ngForm.form.markAsPristine(); });
  }

  ngAfterViewInit() {
    // Os controles do ngModel entram no NgForm de forma assíncrona: restaura depois que todos existirem.
    setTimeout(() => {
      if (this.destruido) return;
      const salvo = this.rascunhos.ler<Record<string, unknown>>(this.chave());
      if (salvo) {
        // patchValue também atualiza o objeto ligado por [(ngModel)] (ngModelChange) e ignora campos que não existem mais.
        this.ngForm.form.patchValue(salvo.valor);
        this.salvoEm.set(salvo.salvoEm);
        this.cdr.markForCheck();
      }
      // Só o que a pessoa alterou (dirty) vira rascunho; valores iniciais e restaurados não.
      this.ngForm.form.valueChanges
        .pipe(filter(() => !!this.ngForm.dirty), takeUntilDestroyed(this.destroyRef))
        .subscribe((valor: Record<string, unknown>) => this.salvoEm.set(this.rascunhos.salvar(this.chave(), valor)));
    });
  }
}

/** Indicador discreto de autosave, para ficar ao lado dos botões do formulário. */
@Component({
  selector: 'nx-salvo',
  imports: [NxIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (em(); as quando) {
      <span class="salvo-auto" role="status"><nx-icon name="check" [size]="13" [stroke]="2.25" /> Rascunho salvo às {{ hora(quando) }}</span>
    } @else if (dica()) {
      <span class="salvo-auto">{{ dica() }}</span>
    }`,
})
export class SalvoComponent {
  readonly em = input<Date | null>(null);
  /** Texto mostrado enquanto nada foi salvo ainda. */
  readonly dica = input('');
  hora(d: Date) { return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
}

export const RASCUNHO = [RascunhoDirective, SalvoComponent] as const;
