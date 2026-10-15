import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Rotas internas: sem sessão vai para /entrar?voltar=<url pedida>. */
export const autenticadoGuard: CanActivateFn = (_rota, estado) => {
  if (inject(AuthService).autenticado()) return true;
  const voltar = estado.url && estado.url !== '/' ? { voltar: estado.url } : {};
  return inject(Router).createUrlTree(['/entrar'], { queryParams: voltar });
};

/** /entrar e /criar-conta: quem já está logado vai direto para a visão geral. */
export const visitanteGuard: CanActivateFn = () =>
  inject(AuthService).autenticado() ? inject(Router).createUrlTree(['/visao-geral']) : true;
