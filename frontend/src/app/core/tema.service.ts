import { Injectable, effect, signal } from '@angular/core';

export type Tema = 'claro' | 'escuro';
const CHAVE = 'nexus.tema';

// Preferência de tema por pessoa (só no navegador). O index.html aplica o tema antes do Angular carregar.
@Injectable({ providedIn: 'root' })
export class TemaService {
  readonly tema = signal<Tema>(this.ler());

  constructor() {
    effect(() => {
      const t = this.tema();
      document.documentElement.dataset['tema'] = t;
      try { localStorage.setItem(CHAVE, t); } catch { /* ignora */ }
    });
  }

  escuro() { return this.tema() === 'escuro'; }
  alternar() { this.tema.update((t) => (t === 'escuro' ? 'claro' : 'escuro')); }

  private ler(): Tema {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo === 'claro' || salvo === 'escuro') return salvo;
    } catch { /* ignora */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }
}
