import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; texto: string; tipo: 'ok' | 'erro' }

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly itens = signal<Toast[]>([]);
  private seq = 0;

  ok(texto: string) { this.mostrar(texto, 'ok'); }
  erro(texto: string) { this.mostrar(texto, 'erro'); }

  fechar(id: number) { this.itens.update((l) => l.filter((t) => t.id !== id)); }

  private mostrar(texto: string, tipo: Toast['tipo']) {
    const id = ++this.seq;
    this.itens.update((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => this.fechar(id), 4200);
  }
}
