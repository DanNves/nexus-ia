// Autenticação real contra o Django (/api/v1/auth/*). Contrato em claude/front/contratos.md (2026-10-15).
// - Access token (15 min) fica SÓ em memória (signal). Nunca em localStorage/sessionStorage.
// - Refresh token fica no cookie HttpOnly `nexus_refresh` (Path=/api/v1/auth/), que o Angular não lê.
//   Como o `ng serve` faz proxy de /api para o Django, front e API têm a mesma origem e o cookie vai sozinho.
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, firstValueFrom, map, of, shareReplay, tap } from 'rxjs';
import { Perfil } from '../api/models';

export interface Usuario { id: string; usuario: string; nome: string; email: string; organizacao: string; perfil: Perfil }
export interface DadosRegistro { nome: string; usuario: string; email: string; organizacao?: string; senha: string; confirmacao: string }
export interface Sessao { access: string; usuario: Usuario }

export const AUTH_API = '/api/v1/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly access = signal<string | null>(null);
  readonly usuario = signal<Usuario | null>(null);
  readonly autenticado = computed(() => this.usuario() !== null);
  /** Access token atual (só em memória). Usado pelo authInterceptor. */
  readonly token = this.access.asReadonly();

  // Uma única renovação em voo: várias requisições com 401 ao mesmo tempo compartilham a mesma.
  private renovacao$: Observable<Usuario> | null = null;

  entrar(usuario: string, senha: string): Observable<Usuario> {
    return this.http.post<Sessao>(`${AUTH_API}/entrar`, { usuario: usuario.trim(), senha }).pipe(map((s) => this.aplicar(s)));
  }

  registrar(dados: DadosRegistro): Observable<Usuario> {
    const corpo: DadosRegistro = {
      nome: dados.nome.trim(),
      usuario: dados.usuario.trim(),
      email: dados.email.trim(),
      senha: dados.senha,
      confirmacao: dados.confirmacao,
    };
    const organizacao = dados.organizacao?.trim();
    if (organizacao) corpo.organizacao = organizacao;
    return this.http.post<Sessao>(`${AUTH_API}/registro`, corpo).pipe(map((s) => this.aplicar(s)));
  }

  /** Troca o cookie de refresh por um novo access token (com rotação do cookie). Erra com 401 se não houver sessão. */
  renovar(): Observable<Usuario> {
    this.renovacao$ ??= this.http.post<Sessao>(`${AUTH_API}/renovar`, {}).pipe(
      map((s) => this.aplicar(s)),
      finalize(() => (this.renovacao$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.renovacao$;
  }

  /** Revoga o refresh no servidor (mesmo que falhe, a sessão local é limpa) e volta para /entrar. */
  sair(): Observable<void> {
    return this.http.post<void>(`${AUTH_API}/sair`, {}).pipe(
      catchError(() => of(undefined)),
      map(() => undefined),
      tap(() => {
        this.limpar();
        void this.router.navigateByUrl('/entrar');
      }),
    );
  }

  /** Executado no bootstrap: tenta recuperar a sessão pelo cookie. Sem cookie (401) segue como visitante, em silêncio. */
  restaurarSessao(): Promise<void> {
    return firstValueFrom(this.renovar().pipe(map(() => undefined), catchError(() => of(undefined))));
  }

  /** Limpa o estado local (não chama o servidor). */
  limpar() {
    this.access.set(null);
    this.usuario.set(null);
  }

  private aplicar(s: Sessao): Usuario {
    this.access.set(s.access);
    this.usuario.set(s.usuario);
    return s.usuario;
  }
}
