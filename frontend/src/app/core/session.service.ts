import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { Perfil } from './api/models';
import { AuthService, Usuario } from './auth/auth.service';

// Os usuários semeados no Django ocupam as pessoas da demonstração; os demais usam o próprio id.
const PESSOA_SEMEADA: Record<string, string> = { usuario: 'p1', equipeadmin: 'p2' };

/** Id do usuário nos registros (solicitanteId, responsavelId…). Usado pela tela e pelo backend simulado. */
export function pessoaIdDe(u: Usuario) {
  return PESSOA_SEMEADA[u.usuario.toLowerCase()] ?? u.id;
}

const CHAVE_VISAO = 'nexus.visao.';

function lerVisao(usuarioId: string): Perfil | null {
  try {
    const v = localStorage.getItem(CHAVE_VISAO + usuarioId);
    return v === 'CLIENTE' || v === 'EQUIPE' ? v : null;
  } catch {
    return null;
  }
}

// Perfil e identificação de quem está logado, derivados do AuthService (usuário vindo do Django).
//
// PERFIL REAL x VISÃO: quem é da equipe escolhe ver o NEXUS como cliente ou como equipe (seletor no topo).
// `perfil()` é a VISÃO ativa: tudo na tela (menu, abas, ações, mock) segue ela. Cliente só tem a visão de cliente.
// Ver como cliente só REDUZ o que aparece; as permissões reais continuam no Django (perfil e admin do usuário).
// As páginas usam `effect(() => this.sessao.perfil(); ...)` para recarregar quando o usuário ou a visão muda.
@Injectable({ providedIn: 'root' })
export class SessionService {
  private auth = inject(AuthService);

  // Ao sair, o usuário vira null mas a visão mantém o último valor: assim os `effect` das páginas que ainda estão
  // na tela não recarregam dados sem sessão (o que gerava 401 no mock e erro no console). Novo login → nova visão.
  // A fonte é "id|perfil" (string): renovar o token não recalcula nem desfaz a escolha.
  private readonly visao = linkedSignal<string | null, Perfil>({
    source: () => {
      const u = this.auth.usuario();
      return u ? `${u.id}|${u.perfil}` : null;
    },
    computation: (fonte, anterior) => {
      if (!fonte) return anterior?.value ?? 'CLIENTE';
      const [id, perfil] = fonte.split('|');
      return perfil === 'EQUIPE' ? (lerVisao(id) ?? 'EQUIPE') : 'CLIENTE';
    },
  });
  readonly perfil = this.visao.asReadonly();

  /** Só quem é da equipe alterna entre a visão de cliente e a da equipe. */
  readonly podeAlternarVisao = computed(() => this.auth.usuario()?.perfil === 'EQUIPE');

  /** Administrador (gerencia usuários). A tela de usuários aparece só na visão da equipe. */
  readonly ehAdmin = computed(() => {
    const u = this.auth.usuario();
    return !!u && u.perfil === 'EQUIPE' && u.admin;
  });

  private readonly identificacao = computed(() => {
    const u = this.auth.usuario();
    if (!u) return { nome: '', papel: '' };
    const papel = u.perfil === 'EQUIPE' ? (u.admin ? 'Equipe · administrador' : 'Equipe') : `Cliente${u.organizacao ? ' · ' + u.organizacao : ''}`;
    return { nome: u.nome, papel };
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

  /** Troca a visão (só equipe). A escolha fica lembrada neste navegador para o usuário. */
  trocarVisao(v: Perfil) {
    const u = this.auth.usuario();
    if (!u || u.perfil !== 'EQUIPE' || this.visao() === v) return;
    this.visao.set(v);
    try { localStorage.setItem(CHAVE_VISAO + u.id, v); } catch { /* ignora */ }
  }
}
