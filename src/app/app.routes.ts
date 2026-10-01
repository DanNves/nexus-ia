import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard.component';
import { ModuleComponent } from './pages/module.component';
import { AiComponent } from './pages/ai.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent, title: 'NEXUS — Dashboard' },
  { path: 'demandas', component: ModuleComponent, title: 'NEXUS — Demandas', data: { view: 'Demandas' } },
  { path: 'atividades', component: ModuleComponent, title: 'NEXUS — Atividades', data: { view: 'Atividades' } },
  { path: 'requisitos', component: ModuleComponent, title: 'NEXUS — Requisitos', data: { view: 'Requisitos' } },
  { path: 'solucoes-e-versoes', component: ModuleComponent, title: 'NEXUS — Soluções e Versões', data: { view: 'Soluções e Versões' } },
  { path: 'chamados', component: ModuleComponent, title: 'NEXUS — Chamados', data: { view: 'Chamados' } },
  { path: 'ia', component: AiComponent, title: 'NEXUS — IA', data: { view: 'IA' } },
  { path: 'conhecimento', component: ModuleComponent, title: 'NEXUS — Conhecimento', data: { view: 'Conhecimento' } },
  { path: 'indicadores', component: ModuleComponent, title: 'NEXUS — Indicadores', data: { view: 'Indicadores' } },
  { path: 'configuracoes', component: ModuleComponent, title: 'NEXUS — Configurações', data: { view: 'Configurações' } },
  { path: '**', redirectTo: 'dashboard' }
];