import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AcessoArteComponent } from './acesso-arte.component';

// Casca das telas de acesso (Entrar e Criar conta): arte à esquerda, formulário projetado à direita.
// Em telas até 980px a arte vira uma faixa compacta no topo.
@Component({
  selector: 'nx-acesso-layout',
  imports: [AcessoArteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="acesso">
      <nx-acesso-arte />
      <div class="lado">
        <div class="miolo"><ng-content /></div>
        <p class="rodape">NEXUS · projeto acadêmico de ADS (UCSal)</p>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .acesso {
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(440px, 1fr);
      align-items: start;
      min-height: 100dvh;
      background: var(--superficie);
    }
    .lado {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      padding: 40px 48px 24px;
    }
    .miolo { width: 100%; max-width: 392px; margin: auto; padding: 24px 0; }
    .rodape { text-align: center; font-size: 12px; color: var(--texto-2); }

    @media (max-width: 1120px) {
      .acesso { grid-template-columns: minmax(0, 1fr) minmax(420px, 1fr); }
      .lado { padding: 32px 32px 20px; }
    }
    @media (max-width: 980px) {
      .acesso { grid-template-columns: minmax(0, 1fr); }
      .lado { min-height: 0; padding: 12px 24px 20px; }
      .miolo { margin: 0 auto; padding: 24px 0 32px; }
    }
    @media (max-width: 520px) {
      .lado { padding: 8px 16px 16px; }
      .miolo { padding: 20px 0 28px; }
    }
  `,
})
export class AcessoLayoutComponent {}
