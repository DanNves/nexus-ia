import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { Perfil } from './api/models';
import { AuthService } from './auth/auth.service';

// Perfil e identificação de quem está logado, derivados do AuthService (usuário vindo do Django).
// As páginas usam `effect(() => this.sessao.perfil(); ...)` para recarregar quando o usuário muda.
@Injectable({ providedIn: 'root' })
export class SessionService {
  private auth = inject(AuthService);

  // Ao sair, o usuário vira null mas o perfil mantém o último valor: assim os `effect` das páginas que ainda estão
  // na tela não recarregam dados sem sessão (o que gerava 401 no mock e erro no console). Novo login → novo perfil.
  private readonly perfilAtual = linkedSignal<Perfil | undefined, Perfil>({
    source: () => this.auth.usuario()?.perfil,
    computation: (perfil, anterior) => perfil ?? anterior?.value ?? 'CLIENTE',
  });
  readonly perfil = this.perfilAtual.asReadonly();

  private readonly identificacao = computed(() => {
    const u = this.auth.usuario();
    if (!u) return { nome: '', papel: '' };
    return { nome: u.nome, papel: u.perfil === 'EQUIPE' ? 'Equipe responsável' : u.organizacao || 'Cliente' };
  });

  get usuario() {
    return this.identificacao();
  }

  ehEquipe() {
    return this.perfil() === 'EQUIPE';
  }
}
