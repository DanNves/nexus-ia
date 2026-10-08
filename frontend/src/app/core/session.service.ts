import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Perfil } from './api/models';

const CHAVE = 'nexus.perfil';

const USUARIOS: Record<Perfil, { nome: string; papel: string }> = {
  CLIENTE: { nome: 'Marina Costa', papel: 'Clínica Bem Viver' },
  EQUIPE: { nome: 'Rafael Lima', papel: 'Equipe responsável' },
};

// Sessão simulada. No backend real, o perfil vem do token JWT do usuário logado.
@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly perfil = signal<Perfil>(this.lerPerfil());

  get usuario() {
    return USUARIOS[this.perfil()];
  }

  ehEquipe() {
    return this.perfil() === 'EQUIPE';
  }

  trocarPerfil(perfil: Perfil) {
    this.perfil.set(perfil);
    try { localStorage.setItem(CHAVE, perfil); } catch { /* ignora */ }
  }

  private lerPerfil(): Perfil {
    try { return localStorage.getItem(CHAVE) === 'EQUIPE' ? 'EQUIPE' : 'CLIENTE'; } catch { return 'CLIENTE'; }
  }
}

export const perfilInterceptor: HttpInterceptorFn = (req, next) => {
  const sessao = inject(SessionService);
  return next(req.clone({ setHeaders: { 'X-Nexus-Perfil': sessao.perfil() } }));
};
