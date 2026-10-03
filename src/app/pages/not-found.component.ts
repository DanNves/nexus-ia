import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NxIconComponent } from '../shared/icon.component';

@Component({
  selector: 'nx-not-found',
  standalone: true,
  imports: [RouterLink, NxIconComponent],
  template: `
    <main class="page empty-state" style="min-height:60vh">
      <nx-icon name="search" [size]="32"/>
      <strong>Página não encontrada</strong>
      <span>O endereço acessado não corresponde a uma área do NEXUS.</span>
      <a class="btn primary" routerLink="/dashboard">Voltar para a visão geral</a>
    </main>
  `
})
export class NotFoundComponent {}
