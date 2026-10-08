import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NxIconComponent } from '../../shared/icon.component';

@Component({
  selector: 'nx-configuracoes',
  imports: [NxIconComponent],
  templateUrl: './configuracoes.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracoesPage {}
