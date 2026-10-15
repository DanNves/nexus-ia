import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, DadosRegistro } from '../../core/auth/auth.service';
import { lerErro } from '../../core/api/nexus-api.service';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { AcessoLayoutComponent } from './acesso-layout.component';
import { DESTINO_PADRAO, lerVoltar } from './destino';

// Espelha as regras do RegistroSerializer do Django (backend/apps/contas/api/serializers.py).
// É só conveniência: a validação definitiva continua no backend (inclusive senhas comuns e parecidas com o usuário).
const USUARIO_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'nx-criar-conta-page',
  imports: [FormsModule, RouterLink, AcessoLayoutComponent, ...UI],
  templateUrl: './criar-conta.page.html',
  styleUrl: './acesso-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CriarContaPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly voltar = lerVoltar(inject(ActivatedRoute));

  form: DadosRegistro = { nome: '', usuario: '', email: '', organizacao: '', senha: '', confirmacao: '' };
  readonly senha = signal('');
  readonly erros = signal<Record<string, string[]>>({});
  readonly erroGeral = signal('');
  readonly enviando = signal(false);
  readonly verSenha = signal(false);
  readonly capsLigado = signal(false);

  readonly regraTamanho = computed(() => this.senha().length >= 8);
  readonly regraNumeros = computed(() => this.senha().length > 0 && !/^\d+$/.test(this.senha()));

  criar() {
    if (this.enviando()) return;
    const d: DadosRegistro = {
      nome: this.form.nome.trim(),
      usuario: this.form.usuario.trim(),
      email: this.form.email.trim().toLowerCase(),
      organizacao: (this.form.organizacao ?? '').trim(),
      senha: this.form.senha,
      confirmacao: this.form.confirmacao,
    };

    const erros = this.validar(d);
    this.erros.set(erros);
    this.erroGeral.set('');
    if (Object.keys(erros).length) { this.focarInvalido(); return; }

    this.enviando.set(true);
    this.auth.registrar(d)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.toast.ok('Conta criada. Bem-vindo(a) ao NEXUS.');
          this.router.navigateByUrl(this.voltar ?? DESTINO_PADRAO);
        },
        error: (e) => {
          const r = lerErro(e);
          if (r.campos && Object.keys(r.campos).length) {
            this.erros.set(r.campos);
            this.focarInvalido();
          } else {
            this.erroGeral.set(r.mensagem);
          }
        },
      });
  }

  mudouSenha(valor: string) {
    this.senha.set(valor);
    this.limpar('senha');
  }

  limpar(campo: string) {
    if (this.erros()[campo]) this.erros.update(({ [campo]: _, ...resto }) => resto);
  }

  verCaps(ev: KeyboardEvent) {
    if (typeof ev.getModifierState === 'function') this.capsLigado.set(ev.getModifierState('CapsLock'));
  }

  private validar(d: DadosRegistro): Record<string, string[]> {
    const e: Record<string, string[]> = {};
    if (!d.nome) e['nome'] = ['Informe seu nome.'];
    else if (d.nome.length < 3) e['nome'] = ['Informe um nome com pelo menos 3 letras.'];

    if (!d.usuario) e['usuario'] = ['Escolha um nome de usuário.'];
    else if (!USUARIO_RE.test(d.usuario)) e['usuario'] = ['Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.'];

    if (!d.email) e['email'] = ['Informe seu e-mail.'];
    else if (!EMAIL_RE.test(d.email)) e['email'] = ['Informe um e-mail válido.'];

    if (!d.senha) e['senha'] = ['Crie uma senha.'];
    else if (d.senha.length < 8) e['senha'] = ['A senha precisa ter pelo menos 8 caracteres.'];
    else if (/^\d+$/.test(d.senha)) e['senha'] = ['A senha não pode ter só números.'];

    if (!d.confirmacao) e['confirmacao'] = ['Repita a senha.'];
    else if (d.senha && d.confirmacao !== d.senha) e['confirmacao'] = ['As senhas não são iguais.'];
    return e;
  }

  private focarInvalido() {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }
}
