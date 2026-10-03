import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NxIconComponent } from '../shared/icon.component';

@Component({
  selector: 'nx-not-found',
  standalone: true,
  imports: [RouterLink, NxIconComponent],
  template: `
    <main class="page empty-page">
      <section class="panel empty-state">
        <span class="empty-icon"><nx-icon name="search" [size]="28"/></span>
        <span class="section-kicker">404 · CONTEXTO NÃO ENCONTRADO</span>
        <h1>Esta página não existe.</h1>
        <p>O endereço informado não corresponde a uma área disponível no NEXUS.</p>
        <a class="btn primary" routerLink="/dashboard"><nx-icon name="home" [size]="15"/> Voltar para a visão geral</a>
      </section>
    </main>
  `
})
export class NotFoundComponent {}
