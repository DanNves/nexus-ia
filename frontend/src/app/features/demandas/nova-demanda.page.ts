import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of, switchMap } from 'rxjs';
import { NexusApi, lerErro } from '../../core/api/nexus-api.service';
import { Prioridade } from '../../core/api/models';
import { UI } from '../../shared/ui/ui.components';
import { ToastService } from '../../shared/ui/toast.service';
import { RASCUNHO, RascunhoService } from '../../shared/rascunho/rascunho';
import { dataHora } from '../../shared/labels';

const TAMANHO_MAX = 200 * 1024;

// Chaves do autosave: uma por etapa do formulário e outra para o arquivo anexado.
const RASCUNHO_SOBRE = 'nova-demanda.sobre';
const RASCUNHO_NECESSIDADE = 'nova-demanda.necessidade';
const RASCUNHO_ANEXO = 'nova-demanda.anexo';

type Anexo = { nome: string; conteudo: string };

@Component({
  selector: 'nx-nova-demanda',
  imports: [RouterLink, FormsModule, ...UI, ...RASCUNHO],
  templateUrl: './nova-demanda.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NovaDemandaPage {
  private api = inject(NexusApi);
  private router = inject(Router);
  private toast = inject(ToastService);
  private rascunhos = inject(RascunhoService);

  readonly etapa = signal<1 | 2>(1);
  readonly erros = signal<Record<string, string[]>>({});
  readonly enviando = signal(false);
  readonly arquivo = signal<Anexo | null>(this.rascunhos.ler<Anexo>(RASCUNHO_ANEXO)?.valor ?? null);

  readonly RASCUNHO_SOBRE = RASCUNHO_SOBRE;
  readonly RASCUNHO_NECESSIDADE = RASCUNHO_NECESSIDADE;

  /** Quando o rascunho recuperado foi salvo (mostra o aviso com a opção de descartar). */
  readonly recuperado = signal<Date | null>(this.rascunhoMaisRecente());

  form = { nome: '', descricao: '', prioridade: 'MEDIA' as Prioridade, necessidade: '' };

  readonly PRIORIDADES: { valor: Prioridade; rotulo: string; texto: string }[] = [
    { valor: 'BAIXA', rotulo: 'Sem pressa', texto: 'Pode esperar algumas semanas' },
    { valor: 'MEDIA', rotulo: 'Importante', texto: 'Gostaria de começar em breve' },
    { valor: 'ALTA', rotulo: 'Urgente', texto: 'Está atrapalhando o trabalho hoje' },
  ];

  readonly dataHora = (d: Date) => dataHora(d.toISOString());

  private rascunhoMaisRecente(): Date | null {
    const datas = [RASCUNHO_SOBRE, RASCUNHO_NECESSIDADE, RASCUNHO_ANEXO]
      .map((k) => this.rascunhos.ler(k)?.salvoEm.getTime() ?? 0)
      .filter(Boolean);
    return datas.length ? new Date(Math.max(...datas)) : null;
  }

  descartarRascunho() {
    [RASCUNHO_SOBRE, RASCUNHO_NECESSIDADE, RASCUNHO_ANEXO].forEach((k) => this.rascunhos.descartar(k));
    this.form = { nome: '', descricao: '', prioridade: 'MEDIA', necessidade: '' };
    this.arquivo.set(null);
    this.erros.set({});
    this.etapa.set(1);
    this.recuperado.set(null);
  }

  avancar() {
    const erros: Record<string, string[]> = {};
    const nome = this.form.nome.trim();
    const descricao = this.form.descricao.trim();
    if (nome.length < 3) erros['nome'] = ['Dê um nome com pelo menos 3 letras.'];
    if (nome.length > 80) erros['nome'] = ['Use no máximo 80 caracteres.'];
    if (descricao.length < 10) erros['descricao'] = ['Conte em uma frase do que se trata (mínimo de 10 caracteres).'];
    this.erros.set(erros);
    if (!Object.keys(erros).length) this.etapa.set(2);
  }

  escolherArquivo(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    // Decisão vigente: somente arquivos de texto (.txt). .docx/.pdf ainda não confirmados.
    if (!f.name.toLowerCase().endsWith('.txt')) { this.erros.set({ arquivo: ['Envie a ata ou transcrição em .txt.'] }); return; }
    if (f.size > TAMANHO_MAX) { this.erros.set({ arquivo: ['O arquivo passa de 200 KB.'] }); return; }
    const leitor = new FileReader();
    leitor.onload = () => {
      const conteudo = String(leitor.result ?? '').trim();
      if (conteudo.length < 10) { this.erros.set({ arquivo: ['O arquivo está vazio.'] }); return; }
      this.erros.set({});
      this.arquivo.set({ nome: f.name, conteudo });
      this.rascunhos.salvar(RASCUNHO_ANEXO, { nome: f.name, conteudo });
    };
    leitor.onerror = () => this.erros.set({ arquivo: ['Não foi possível ler o arquivo.'] });
    leitor.readAsText(f, 'utf-8');
  }

  removerArquivo() {
    this.arquivo.set(null);
    this.rascunhos.descartar(RASCUNHO_ANEXO);
  }

  criar() {
    const necessidade = this.form.necessidade.trim();
    if (!necessidade && !this.arquivo()) {
      this.erros.set({ necessidade: ['Escreva o que você precisa ou anexe a ata da reunião.'] });
      return;
    }
    this.erros.set({});
    this.enviando.set(true);
    const arq = this.arquivo();
    this.api.criarDemanda({ nome: this.form.nome.trim(), descricao: this.form.descricao.trim(), prioridade: this.form.prioridade, necessidade })
      .pipe(switchMap((d) => (arq ? this.api.anexarFonte(d.id, { titulo: arq.nome, conteudo: arq.conteudo }) : of(d))))
      .subscribe({
        next: (d) => {
          [RASCUNHO_SOBRE, RASCUNHO_NECESSIDADE, RASCUNHO_ANEXO].forEach((k) => this.rascunhos.descartar(k));
          this.toast.ok(`Demanda ${d.codigo} criada. Agora algumas perguntas rápidas.`);
          void this.router.navigate(['/demandas', d.id, 'levantamento']);
        },
        error: (e) => {
          const erro = lerErro(e);
          this.enviando.set(false);
          this.erros.set(erro.campos ?? {});
          if (erro.campos?.['nome'] || erro.campos?.['descricao']) this.etapa.set(1);
          this.toast.erro(erro.mensagem);
        },
      });
  }
}
