import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NexusStore } from './services/nexus.store';
import { NxIconComponent } from './shared/icon.component';
import { GlobalSearchComponent } from './shared/global-search.component';
import { NotificationMenuComponent } from './shared/notification-menu.component';
import { UserMenuComponent } from './shared/user-menu.component';
import { DetailDrawerComponent } from './shared/detail-drawer.component';
import { WizardComponent } from './shared/wizard.component';
import { NexusRecord } from './models/nexus.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'nx-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NxIconComponent, GlobalSearchComponent, NotificationMenuComponent, UserMenuComponent, DetailDrawerComponent, WizardComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(NexusStore);
  readonly router = inject(Router);
  mobileOpen = false;
  moreOpen = false;
  userOpen = false;
  searchOpen = false;
  notificationOpen = false;

  readonly navItems = [
    ['Visão geral','/dashboard','home'], ['Demandas','/demandas','demand'], ['Atividades','/atividades','activity'],
    ['Requisitos','/requisitos','requirement'], ['Soluções','/solucoes-e-versoes','solution'], ['Chamados','/chamados','ticket'],
    ['IA','/ia','spark'], ['Conhecimento','/conhecimento','knowledge'], ['Indicadores','/indicadores','chart'], ['Configurações','/configuracoes','settings'],
  ] as const;

  readonly mobileSections = [
    { label: 'Operação', items: this.navItems.slice(0, 2) },
    { label: 'Desenvolvimento', items: this.navItems.slice(2, 5) },
    { label: 'Suporte e inteligência', items: this.navItems.slice(5, 8) },
    { label: 'Gestão', items: this.navItems.slice(8) },
  ] as const;

  navigate(path: string) { void this.router.navigateByUrl(path); this.mobileOpen = false; this.moreOpen = false; this.userOpen = false; }
  openSearch() { this.notificationOpen = false; this.searchOpen = true; }
  closeSearch() { this.searchOpen = false; }
  openRecord(record: NexusRecord) { this.store.select(record); this.searchOpen = false; this.notificationOpen = false; }
  openWizard(type: 'demanda'|'atividade'|'chamado') { this.notificationOpen = false; this.store.openWizard(type); this.mobileOpen = false; }
  openSettings() { this.navigate('/configuracoes'); }
}
