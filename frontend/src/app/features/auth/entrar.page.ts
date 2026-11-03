import { ChangeDetectionStrategy, Component, ElementRef, inject, isDevMode, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { lerErro } from '../../core/api/nexus-api.service';
import { UI } from '../../shared/ui/ui.components';
import { AcessoLayoutComponent } from './acesso-layout.component';
import { DESTINO_PADRAO, lerVoltar } from './destino';

interface ContaDemo { usuario: string; papel: string; icone: string; tom: 'azul' | 'roxo' }

@Component({
  selector: 'nx-entrar-page',
  imports: [FormsModule, RouterLink, AcessoLayoutComponent, ...UI],
  templateUrl: './entrar.page.html',
  styleUrl: './acesso-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntrarPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly voltar = lerVoltar(inject(ActivatedRoute));
  readonly modoDev = isDevMode();
  readonly CONTAS_DEMO: ContaDemo[] = [
    { usuario: 'EquipeAdmin', papel: 'Equipe responsável', icone: 'users', tom: 'roxo' },
    { usuario: 'Usuario', papel: 'Cliente', icone: 'user', tom: 'azul' },
  ];

  form = { usuario: '', senha: '' };
  readonly erros = signal<Record<string, string[]>>({});
  readonly erroGeral = signal('');
  readonly enviando = signal(false);
  readonly verSenha = signal(false);
  readonly capsLigado = signal(false);
  readonly contaUsada = signal<string | null>(null);

  entrar() {
    if (this.enviando()) return;
    const usuario = this.form.usuario.trim();
    const erros: Record<string, string[]> = {};
    if (!usuario) erros['usuario'] = ['Informe seu usuário ou e-mail.'];
    if (!this.form.senha) erros['senha'] = ['Informe sua senha.'];
    this.erros.set(erros);
    this.erroGeral.set('');
    if (Object.keys(erros).length) { this.focarInvalido(); return; }

    this.enviando.set(true);
    this.auth.entrar(usuario, this.form.senha)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.voltar ?? DESTINO_PADRAO),
        error: (e) => {
          const r = lerErro(e);
          if (r.campos && Object.keys(r.campos).length) {
            this.erros.set(r.campos);
            this.focarInvalido();
          } else {
            this.erroGeral.set(r.mensagem);
            this.form.senha = '';
            this.focar('#entrar-senha');
          }
        },
      });
  }

  usarConta(c: ContaDemo) {
    this.form = { usuario: c.usuario, senha: '123' };
    this.erros.set({});
    this.erroGeral.set('');
    this.contaUsada.set(c.usuario);
    this.focar('#entrar-enviar');
  }

  limpar(campo: string) {
    if (this.erros()[campo]) this.erros.update(({ [campo]: _, ...resto }) => resto);
    if (this.contaUsada()) this.contaUsada.set(null);
  }

  verCaps(ev: KeyboardEvent) {
    if (typeof ev.getModifierState === 'function') this.capsLigado.set(ev.getModifierState('CapsLock'));
  }

  private focarInvalido() { this.focar('[aria-invalid="true"]'); }

  private focar(seletor: string) {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(seletor)?.focus());
  }
}
