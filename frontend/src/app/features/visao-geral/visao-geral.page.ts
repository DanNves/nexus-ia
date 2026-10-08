import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NexusApi } from '../../core/api/nexus-api.service';
import { VisaoGeral } from '../../core/api/models';
import { SessionService } from '../../core/session.service';
import { UI } from '../../shared/ui/ui.components';
import { ESTADO_CHAMADO, ESTADO_DEMANDA, ETAPAS, TIPO_EVENTO, diaRelativo, duracao, etapaAtual, hora, relativo } from '../../shared/labels';

@Component({
  selector: 'nx-visao-geral',
  imports: [RouterLink, ...UI],
  templateUrl: './visao-geral.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaoGeralPage {
  readonly sessao = inject(SessionService);
  private api = inject(NexusApi);
  readonly dados = signal<VisaoGeral | null>(null);

  readonly ESTADO_DEMANDA = ESTADO_DEMANDA;
  readonly ESTADO_CHAMADO = ESTADO_CHAMADO;
  readonly TIPO_EVENTO = TIPO_EVENTO;
  readonly ETAPAS = ETAPAS;
  readonly etapaAtual = etapaAtual;
  readonly diaRelativo = diaRelativo;
  readonly hora = hora;
  readonly relativo = relativo;
  readonly duracao = duracao;

  constructor() {
    effect(() => {
      this.sessao.perfil();
      untracked(() => {
        this.dados.set(null);
        this.api.visaoGeral().subscribe((d) => this.dados.set(d));
      });
    });
  }

  saudacao() {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  primeiroNome() { return this.sessao.usuario.nome.split(' ')[0]; }
}
