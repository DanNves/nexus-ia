import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { perfilInterceptor } from './core/session.service';
import { mockBackendInterceptor } from './core/api/mock-backend.interceptor';
import { environment } from './environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    // Com o backend Django pronto: environment.useMock = false e o interceptor sai da cadeia.
    provideHttpClient(withInterceptors(environment.useMock ? [perfilInterceptor, mockBackendInterceptor] : [perfilInterceptor])),
  ],
};
