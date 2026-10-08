import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UI } from '../shared/ui/ui.components';

@Component({
  selector: 'nx-nao-encontrada',
  imports: [RouterLink, ...UI],
  template: `
    <div class="pagina pagina-estreita">
      <nx-vazio icone="alert" titulo="Esta página não existe" texto="O endereço pode estar errado ou o registro foi removido.">
        <a routerLink="/visao-geral" class="btn btn-primario">Ir para a visão geral</a>
      </nx-vazio>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NaoEncontradaPage {}
