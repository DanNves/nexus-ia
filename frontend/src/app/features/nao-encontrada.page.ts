import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UI } from '../shared/ui/ui.components';

// Mesma aparência do estado vazio oficial (.vazio), mas com o título como h1:
// aqui ele é o título da página (CLAUDE.md §12), não de uma seção.
@Component({
  selector: 'nx-nao-encontrada',
  imports: [RouterLink, ...UI],
  template: `
    <div class="pagina pagina-estreita">
      <div class="vazio">
        <nx-icon name="alert" [size]="22" />
        <h1 class="vazio-titulo">Esta página não existe</h1>
        <p class="mudo">O endereço pode estar errado ou o registro foi removido.</p>
        <a routerLink="/visao-geral" class="btn btn-primario">Ir para a visão geral</a>
      </div>
    </div>`,
  styles: `h1.vazio-titulo { font-size: 18px; line-height: 1.3; letter-spacing: -0.01em; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NaoEncontradaPage {}
