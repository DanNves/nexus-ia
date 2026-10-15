import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NxIconComponent } from '../../shared/icon.component';

interface Etapa { rotulo: string; icone: string; angulo: number }

// Arte da tela de acesso (Entrar / Criar conta). Puramente decorativa: aria-hidden no host.
// Efeitos recriados em CSS/SVG puros, sem dependências, inspirados em:
// ReactBits Aurora (blobs desfocados), Squares (grade com máscara radial), ShinyText/GradientText (título),
// SpotlightCard (luz que segue o ponteiro), Magic UI Orbiting Circles (etapas orbitando o logo) e
// uiverse glassmorphism card (sugestão da IA aguardando validação humana).
// Exclusivo do fluxo de autenticação: nada daqui é usado no resto do app.
@Component({
  selector: 'nx-acesso-arte',
  imports: [NxIconComponent],
  templateUrl: './acesso-arte.component.html',
  styleUrl: './acesso-arte.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '(pointermove)': 'mover($event)' },
})
export class AcessoArteComponent {
  // Anel interno: levantamento. Anel externo: especificação e pós-entrega.
  readonly interno: Etapa[] = [
    { rotulo: 'Necessidade', icone: 'demand', angulo: -90 },
    { rotulo: 'Entrevista', icone: 'message', angulo: 0 },
    { rotulo: 'Cenário', icone: 'layers', angulo: 90 },
    { rotulo: 'Protótipo', icone: 'monitor', angulo: 180 },
  ];
  readonly externo: Etapa[] = [
    { rotulo: 'Requisitos', icone: 'list', angulo: -45 },
    { rotulo: 'Versão', icone: 'package', angulo: 45 },
    { rotulo: 'Chamado', icone: 'inbox', angulo: 135 },
    { rotulo: 'Conhecimento', icone: 'book', angulo: 225 },
  ];

  // Grade "Squares": algumas células acendem em sequência (coluna, linha, atraso em s).
  readonly celulas = [
    [2, 3, 0], [9, 2, 1.6], [12, 6, 3.1], [4, 11, 2.2], [11, 13, 4.4], [1, 8, 5.2], [7, 15, 0.8], [14, 10, 3.8],
  ] as const;

  mover(ev: PointerEvent) {
    const el = ev.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--foco-x', `${ev.clientX - r.left}px`);
    el.style.setProperty('--foco-y', `${ev.clientY - r.top}px`);
  }
}
