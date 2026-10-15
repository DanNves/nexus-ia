// Acrescenta o Bearer nas chamadas /api/v1 e trata o access token vencido (401):
// renova UMA vez (renovação compartilhada no AuthService) e repete a requisição.
// Se a renovação falhar, limpa a sessão e manda para /entrar?voltar=<url atual>.
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AUTH_API, AuthService } from './auth.service';

const API = '/api/v1';
const ROTAS_PUBLICAS = ['/entrar', '/criar-conta'];

function comToken(req: HttpRequest<unknown>, token: string | null) {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API) || req.url.startsWith(`${AUTH_API}/`)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(comToken(req, auth.token())).pipe(
    catchError((erro: unknown) => {
      if (!(erro instanceof HttpErrorResponse) || erro.status !== 401) return throwError(() => erro);
      return auth.renovar().pipe(
        catchError(() => {
          auth.limpar();
          const atual = router.url;
          if (!ROTAS_PUBLICAS.some((r) => atual.startsWith(r))) {
            void router.navigate(['/entrar'], { queryParams: atual && atual !== '/' ? { voltar: atual } : {} });
          }
          return throwError(() => erro);
        }),
        // Repete uma única vez; um novo 401 aqui sobe como erro normal.
        switchMap(() => next(comToken(req, auth.token()))),
      );
    }),
  );
};
