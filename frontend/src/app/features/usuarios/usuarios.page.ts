import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Perfil, UsuarioGestao } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { relativo } from '../../shared/labels';

type Filtro = 'todos' | 'EQUIPE' | 'CLIENTE' | 'inativos';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'EQUIPE', rotulo: 'Equipe' },
  { id: 'CLIENTE', rotulo: 'Clientes' },
  { id: 'inativos', rotulo: 'Inativos' },
];

const NOVO = { nome: '', usuario: '', email: '', organizacao: '', perfil: 'CLIENTE' as Perfil, admin: false, senha: '' };

// Gestão de usuários (somente administrador, na visão da equipe). Dados reais do Django: /api/v1/usuarios.
// Senhas nunca são guardadas em rascunho nem exibidas depois de enviadas.
@Component({
  selector: 'nx-usuarios',
  imports: [FormsModule, ...UI],
  templateUrl: './usuarios.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuariosPage {
  private api = inject(NexusApi);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly FILTROS = FILTROS;
  readonly relativo = relativo;

  readonly usuarios = signal<UsuarioGestao[] | null>(null);
  readonly erroCarga = signal('');
  readonly busca = signal('');
  readonly filtro = signal<Filtro>('todos');

  readonly euId = computed(() => this.auth.usuario()?.id ?? '');

  readonly filtrados = computed(() => {
    const t = this.busca().trim().toLowerCase();
    return (this.usuarios() ?? [])
      .filter((u) => this.passaFiltro(u, this.filtro()))
      .filter((u) => !t || `${u.nome} ${u.usuario} ${u.email} ${u.organizacao}`.toLowerCase().includes(t));
  });

  readonly numeros = computed(() => {
    const l = this.usuarios() ?? [];
    return {
      total: l.filter((u) => u.ativo).length,
      equipe: l.filter((u) => u.ativo && u.perfil === 'EQUIPE').length,
      clientes: l.filter((u) => u.ativo && u.perfil === 'CLIENTE').length,
      admins: l.filter((u) => u.ativo && u.admin).length,
    };
  });

  // Novo usuário
  readonly novoAberto = signal(false);
  novo = { ...NOVO };

  // Edição
  readonly editando = signal<UsuarioGestao | null>(null);
  edicao = { nome: '', email: '', organizacao: '', perfil: 'CLIENTE' as Perfil, admin: false, ativo: true };
  novaSenha = '';

  readonly erros = signal<Record<string, string[]>>({});
  readonly salvando = signal(false);

  readonly souEu = computed(() => this.editando()?.id === this.euId());

  constructor() {
    this.carregar();
  }

  carregar() {
    this.erroCarga.set('');
    this.api.usuarios().subscribe({
      next: (l) => this.usuarios.set(l),
      error: (e) => this.erroCarga.set(lerErro(e).mensagem),
    });
  }

  contagem(f: Filtro) { return (this.usuarios() ?? []).filter((u) => this.passaFiltro(u, f)).length; }

  private passaFiltro(u: UsuarioGestao, f: Filtro) {
    if (f === 'inativos') return !u.ativo;
    if (f === 'todos') return true;
    return u.ativo && u.perfil === f;
  }

  // ---------- Novo ----------

  abrirNovo() {
    this.novo = { ...NOVO };
    this.erros.set({});
    this.novoAberto.set(true);
  }

  /** Cliente não pode ser administrador: ao trocar o perfil, desmarca. */
  perfilNovo(p: Perfil) {
    this.novo.perfil = p;
    if (p === 'CLIENTE') this.novo.admin = false;
  }

  criar() {
    const n = this.novo;
    const erros: Record<string, string[]> = {};
    if (n.nome.trim().length < 3) erros['nome'] = ['Informe um nome com pelo menos 3 letras.'];
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(n.usuario.trim())) erros['usuario'] = ['Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email.trim())) erros['email'] = ['Informe um e-mail válido.'];
    if (n.senha.length < 8) erros['senha'] = ['A senha inicial precisa de pelo menos 8 caracteres.'];
    this.erros.set(erros);
    if (Object.keys(erros).length) return;
    this.salvando.set(true);
    this.api.criarUsuario({ ...n, nome: n.nome.trim(), usuario: n.usuario.trim(), email: n.email.trim(), organizacao: n.organizacao.trim() })
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (u) => {
          this.novo = { ...NOVO };
          this.novoAberto.set(false);
          this.usuarios.update((l) => [u, ...(l ?? [])]);
          this.toast.ok(`${u.nome} foi cadastrado. Passe a senha inicial para a pessoa por um canal seguro.`);
        },
        error: (e) => { const er = lerErro(e); this.erros.set(er.campos ?? {}); this.toast.erro(er.mensagem); },
      });
  }

  // ---------- Editar ----------

  abrirEdicao(u: UsuarioGestao) {
    this.edicao = { nome: u.nome, email: u.email, organizacao: u.organizacao, perfil: u.perfil, admin: u.admin, ativo: u.ativo };
    this.novaSenha = '';
    this.erros.set({});
    this.editando.set(u);
  }

  perfilEdicao(p: Perfil) {
    this.edicao.perfil = p;
    if (p === 'CLIENTE') this.edicao.admin = false;
  }

  salvar() {
    const u = this.editando();
    if (!u) return;
    const e = this.edicao;
    const erros: Record<string, string[]> = {};
    if (e.nome.trim().length < 3) erros['nome'] = ['Informe um nome com pelo menos 3 letras.'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email.trim())) erros['email'] = ['Informe um e-mail válido.'];
    this.erros.set(erros);
    if (Object.keys(erros).length) return;
    // Envia só o que mudou (PATCH).
    const corpo: Record<string, unknown> = {};
    const novo = { ...e, nome: e.nome.trim(), email: e.email.trim().toLowerCase(), organizacao: e.organizacao.trim() };
    (['nome', 'email', 'organizacao', 'perfil', 'admin', 'ativo'] as const).forEach((k) => { if (novo[k] !== u[k]) corpo[k] = novo[k]; });
    if (!Object.keys(corpo).length) { this.editando.set(null); return; }
    this.salvando.set(true);
    this.api.alterarUsuario(u.id, corpo).pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: (alterado) => {
        this.usuarios.update((l) => (l ?? []).map((x) => (x.id === alterado.id ? alterado : x)));
        this.editando.set(null);
        const acesso = 'perfil' in corpo || 'admin' in corpo || 'ativo' in corpo;
        this.toast.ok(acesso ? `${alterado.nome} atualizado. A pessoa precisa entrar de novo para valer o novo acesso.` : `${alterado.nome} atualizado.`);
      },
      error: (er) => { const x = lerErro(er); this.erros.set(x.campos ?? {}); this.toast.erro(x.mensagem); },
    });
  }

  redefinirSenha() {
    const u = this.editando();
    if (!u) return;
    if (this.novaSenha.length < 8) { this.erros.set({ senha: ['A nova senha precisa de pelo menos 8 caracteres.'] }); return; }
    this.salvando.set(true);
    this.api.redefinirSenha(u.id, this.novaSenha).pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: () => { this.novaSenha = ''; this.erros.set({}); this.toast.ok(`Senha de ${u.nome} redefinida. As sessões abertas dela foram encerradas.`); },
      error: (er) => { const x = lerErro(er); this.erros.set(x.campos ?? {}); this.toast.erro(x.mensagem); },
    });
  }
}
