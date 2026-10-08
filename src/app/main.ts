import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withNavigationErrorHandler } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withNavigationErrorHandler((error) => {
        console.error('Erro de navegação do NEXUS:', error);
      }),
    ),
  ],
}).catch((error) => console.error('Erro ao inicializar o NEXUS:', error));
