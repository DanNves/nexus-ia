import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
  { path: 'visao-geral', title: 'Visão geral · NEXUS', loadComponent: () => import('./features/visao-geral/visao-geral.page').then((m) => m.VisaoGeralPage) },
  { path: 'demandas', title: 'Demandas · NEXUS', loadComponent: () => import('./features/demandas/demandas.page').then((m) => m.DemandasPage) },
  { path: 'demandas/nova', title: 'Nova demanda · NEXUS', loadComponent: () => import('./features/demandas/nova-demanda.page').then((m) => m.NovaDemandaPage) },
  { path: 'demandas/:id', title: 'Demanda · NEXUS', loadComponent: () => import('./features/demandas/demanda-detalhe.page').then((m) => m.DemandaDetalhePage) },
  { path: 'demandas/:id/:aba', title: 'Demanda · NEXUS', loadComponent: () => import('./features/demandas/demanda-detalhe.page').then((m) => m.DemandaDetalhePage) },
  { path: 'calendario', title: 'Calendário · NEXUS', loadComponent: () => import('./features/calendario/calendario.page').then((m) => m.CalendarioPage) },
  { path: 'solucoes', title: 'Soluções · NEXUS', loadComponent: () => import('./features/solucoes/solucoes.page').then((m) => m.SolucoesPage) },
  { path: 'solucoes/:id', title: 'Solução · NEXUS', loadComponent: () => import('./features/solucoes/solucao-detalhe.page').then((m) => m.SolucaoDetalhePage) },
  { path: 'fila', title: 'Fila de atendimento · NEXUS', loadComponent: () => import('./features/fila/fila.page').then((m) => m.FilaPage) },
  { path: 'fila/:id', title: 'Chamado · NEXUS', loadComponent: () => import('./features/fila/chamado-detalhe.page').then((m) => m.ChamadoDetalhePage) },
  { path: '**', title: 'Página não encontrada · NEXUS', loadComponent: () => import('./features/nao-encontrada.page').then((m) => m.NaoEncontradaPage) },
];
