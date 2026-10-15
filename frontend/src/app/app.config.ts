import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { mockBackendInterceptor } from './core/api/mock-backend.interceptor';
import { environment } from './environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    // Ordem importa: o authInterceptor põe o Bearer e trata o 401; o mock (híbrido) responde o domínio
    // e repassa ao Django (/auth, /me, /ia, jobs reais) com o mesmo header.
    // Com toda a API no Django: environment.useMock = false e o mock sai da cadeia.
    provideHttpClient(withInterceptors(environment.useMock ? [authInterceptor, mockBackendInterceptor] : [authInterceptor])),
    // Recupera a sessão pelo cookie HttpOnly antes da primeira navegação (os guards já encontram o usuário).
    provideAppInitializer(() => inject(AuthService).restaurarSessao()),
  ],
};
