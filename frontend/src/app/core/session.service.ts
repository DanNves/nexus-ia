import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { Perfil } from './api/models';
import { AuthService, Usuario } from './auth/auth.service';

// Os usuários semeados no Django ocupam as pessoas da demonstração; os demais usam o próprio id.
const PESSOA_SEMEADA: Record<string, string> = { usuario: 'p1', equipeadmin: 'p2' };

/** Id do usuário nos registros (solicitanteId, responsavelId…). Usado pela tela e pelo backend simulado. */
export function pessoaIdDe(u: Usuario) {
  return PESSOA_SEMEADA[u.usuario.toLowerCase()] ?? u.id;
}

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

  /** Id de quem está logado nos registros: compara com solicitanteId para saber se a demanda/o chamado é seu. */
  readonly pessoaId = computed(() => {
    const u = this.auth.usuario();
    return u ? pessoaIdDe(u) : '';
  });

  get usuario() {
    return this.identificacao();
  }

  ehEquipe() {
    return this.perfil() === 'EQUIPE';
  }
}
