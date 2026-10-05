import { ChangeDetectionStrategy, Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NexusStore } from './services/nexus.store';
import { NxIconComponent } from './shared/icon.component';
import { GlobalSearchComponent } from './shared/global-search.component';
import { NotificationMenuComponent } from './shared/notification-menu.component';
import { DetailDrawerComponent } from './shared/detail-drawer.component';
import { WizardComponent } from './shared/wizard.component';
import { currentUser } from './data/nexus.data';
import { NexusRecord } from './models/nexus.models';

@Component({
  selector: 'nx-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NxIconComponent, GlobalSearchComponent, NotificationMenuComponent, DetailDrawerComponent, WizardComponent],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly store=inject(NexusStore);
  readonly router=inject(Router);
  readonly currentUser=currentUser;
  mobileOpen=false; userOpen=false; searchOpen=false; notificationOpen=false;

  readonly navItems=[
    ['Visão geral','/dashboard','home'],['Demandas','/demandas','demand'],['Atividades','/atividades','activity'],
    ['Requisitos','/requisitos','requirement'],['Soluções','/solucoes-e-versoes','solution'],['Chamados','/chamados','ticket'],
    ['IA','/ia','spark'],['Conhecimento','/conhecimento','knowledge'],
  ] as const;

  readonly mobileSections=[
    {label:'Operação',items:this.navItems.slice(0,2)},
    {label:'Desenvolvimento',items:this.navItems.slice(2,5)},
    {label:'Suporte e inteligência',items:this.navItems.slice(5,8)},
  ] as const;

  navigate(path:string){void this.router.navigateByUrl(path);this.mobileOpen=false;this.userOpen=false;}
  openSearch(){this.searchOpen=true;this.notificationOpen=false;this.userOpen=false;}
  closeSearch(){this.searchOpen=false;}
  closeDetail(){this.store.closeDetail();}
  closeWizard(){this.store.closeWizard();}
  openRecord(record:NexusRecord){this.store.select(record);}
  openWizard(type:'demanda'|'atividade'|'chamado'){this.notificationOpen=false;this.userOpen=false;this.mobileOpen=false;this.store.openWizard(type);}

  @HostListener('document:keydown',['$event'])
  onDocumentKeydown(event:KeyboardEvent){
    if(event.key!=='Escape')return;
    if(this.store.wizard()){event.preventDefault();this.closeWizard();return;}
    if(this.store.selected()){event.preventDefault();this.closeDetail();return;}
    if(this.searchOpen){event.preventDefault();this.closeSearch();return;}
    if(this.notificationOpen||this.userOpen||this.mobileOpen){event.preventDefault();this.notificationOpen=false;this.userOpen=false;this.mobileOpen=false;}
  }
}