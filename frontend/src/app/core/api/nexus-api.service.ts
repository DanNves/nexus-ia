import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, defer, expand, filter, retry, switchMap, take, throwError, timer } from 'rxjs';
import {
  Atividade, Chamado, Conhecimento, Demanda, ErroApi, EstadoAtividade, Evento, FilaResumo, Job, Notificacao,
  Perfil, Pergunta, Pessoa, Prioridade, ProximaPergunta, ResultadoBusca, Solucao, TipoEvento, UsuarioGestao, VisaoGeral,
} from './models';

const API = '/api/v1';

// Ponto único de acesso à API. As telas nunca chamam HttpClient diretamente.
@Injectable({ providedIn: 'root' })
export class NexusApi {
  private http = inject(HttpClient);

  // Transversal
  visaoGeral() { return this.http.get<VisaoGeral>(`${API}/visao-geral`); }
  pessoas() { return this.http.get<Pessoa[]>(`${API}/pessoas`); }
  notificacoes() { return this.http.get<Notificacao[]>(`${API}/notificacoes`); }
  lerNotificacoes() { return this.http.post<Notificacao[]>(`${API}/notificacoes/ler`, {}); }
  buscar(q: string) { return this.http.get<ResultadoBusca[]>(`${API}/busca`, { params: { q } }); }
  restaurarDemo() { return this.http.post<{ ok: boolean }>(`${API}/demo/restaurar`, {}); }

  // Demandas
  demandas(filtro: { q?: string; estado?: string } = {}) {
    const params: Record<string, string> = {};
    if (filtro.q) params['q'] = filtro.q;
    if (filtro.estado) params['estado'] = filtro.estado;
    return this.http.get<Demanda[]>(`${API}/demandas`, { params });
  }
  demanda(id: string) { return this.http.get<Demanda>(`${API}/demandas/${id}`); }
  criarDemanda(body: { nome: string; descricao: string; prioridade: Prioridade; necessidade?: string; processoPaiId?: string }) {
    return this.http.post<Demanda>(`${API}/demandas`, body);
  }
  anexarFonte(id: string, body: { titulo: string; conteudo: string }) { return this.http.post<Demanda>(`${API}/demandas/${id}/fontes`, body); }
  pergunta(id: string, perguntaId: string) { return this.http.get<Pergunta>(`${API}/demandas/${id}/entrevista/perguntas/${perguntaId}`); }
  proximaPergunta(id: string) { return this.http.get<ProximaPergunta>(`${API}/demandas/${id}/entrevista/proxima`); }
  responder(id: string, body: { perguntaId: string; valores: string[]; outro?: string }) {
    return this.http.post<ProximaPergunta>(`${API}/demandas/${id}/entrevista/respostas`, body);
  }
  gerarCenario(id: string) { return this.http.post<Job>(`${API}/demandas/${id}/cenario/gerar`, {}); }
  escolherCenario(id: string, tipo: string) { return this.http.post<Demanda>(`${API}/demandas/${id}/cenario/escolher`, { tipo }); }
  encerrar(id: string, opcao: 'STAND_BY' | 'SOLICITAR') { return this.http.post<Demanda>(`${API}/demandas/${id}/encerrar`, { opcao }); }
  retomar(id: string) { return this.http.post<Demanda>(`${API}/demandas/${id}/retomar`, {}); }
  viabilidade(id: string, body: { possivel: boolean; justificativa: string }) { return this.http.post<Demanda>(`${API}/demandas/${id}/viabilidade`, body); }
  agendarReuniao(id: string, body: { data: string; pauta: string; local?: string }) { return this.http.post<Demanda>(`${API}/demandas/${id}/reuniao`, body); }
  planejar(id: string, body: { metodologia: string; inicio: string; previsao: string }) { return this.http.post<Demanda>(`${API}/demandas/${id}/planejamento`, body); }
  gerarRequisitos(id: string) { return this.http.post<Job>(`${API}/demandas/${id}/requisitos/gerar`, {}); }
  decidirRequisito(id: string, rid: string, body: { decisao: 'APROVAR' | 'REJEITAR'; motivo?: string; titulo?: string; descricao?: string }) {
    return this.http.post<Demanda>(`${API}/demandas/${id}/requisitos/${rid}/decisao`, body);
  }
  iniciarDesenvolvimento(id: string) { return this.http.post<Demanda>(`${API}/demandas/${id}/iniciar`, {}); }

  // Atividades
  atividades(demandaId?: string) {
    return this.http.get<Atividade[]>(`${API}/atividades`, { params: demandaId ? { demanda: demandaId } : {} });
  }
  criarAtividade(body: { titulo: string; demandaId: string; responsavelId: string; prazo: string }) { return this.http.post<Atividade>(`${API}/atividades`, body); }
  moverAtividade(id: string, estado: EstadoAtividade) { return this.http.patch<Atividade>(`${API}/atividades/${id}`, { estado }); }

  // Calendário
  eventos(de?: string, ate?: string) {
    const params: Record<string, string> = {};
    if (de) params['de'] = de;
    if (ate) params['ate'] = ate;
    return this.http.get<Evento[]>(`${API}/eventos`, { params });
  }
  criarEvento(body: { titulo: string; tipo: TipoEvento; inicio: string; demandaId?: string; local?: string; descricao?: string }) {
    return this.http.post<Evento>(`${API}/eventos`, body);
  }

  // Soluções
  solucoes() { return this.http.get<Solucao[]>(`${API}/solucoes`); }
  solucao(id: string) { return this.http.get<Solucao>(`${API}/solucoes/${id}`); }

  // Fila e chamados
  fila() { return this.http.get<FilaResumo>(`${API}/fila`); }
  chamados() { return this.http.get<Chamado[]>(`${API}/chamados`); }
  chamado(id: string) { return this.http.get<Chamado>(`${API}/chamados/${id}`); }
  abrirChamado(body: { titulo: string; descricao: string; solucaoId: string; versaoId: string; prioridade: Prioridade }) {
    return this.http.post<Chamado>(`${API}/chamados`, body);
  }
  atenderProximo() { return this.http.post<Chamado>(`${API}/fila/proximo`, {}); }
  atender(id: string) { return this.http.post<Chamado>(`${API}/chamados/${id}/atender`, {}); }
  gerarSugestao(id: string) { return this.http.post<Job>(`${API}/chamados/${id}/sugestao/gerar`, {}); }
  decidirSugestao(id: string, body: { decisao: 'APROVAR' | 'REJEITAR'; motivo?: string }) { return this.http.post<Chamado>(`${API}/chamados/${id}/sugestao/decisao`, body); }
  resolver(id: string, body: { solucao: string; registrarConhecimento: boolean }) { return this.http.post<Chamado>(`${API}/chamados/${id}/resolver`, body); }
  conhecimento(id: string) { return this.http.get<Conhecimento>(`${API}/conhecimentos/${id}`); }

  // Usuários (rotas reais no Django; só administrador)
  usuarios(filtro: { q?: string; perfil?: Perfil | ''; ativo?: boolean } = {}) {
    const params: Record<string, string> = {};
    if (filtro.q) params['q'] = filtro.q;
    if (filtro.perfil) params['perfil'] = filtro.perfil;
    if (filtro.ativo !== undefined) params['ativo'] = String(filtro.ativo);
    return this.http.get<UsuarioGestao[]>(`${API}/usuarios`, { params });
  }
  criarUsuario(body: { nome: string; usuario: string; email: string; organizacao: string; perfil: Perfil; admin: boolean; senha: string }) {
    return this.http.post<UsuarioGestao>(`${API}/usuarios`, body);
  }
  alterarUsuario(id: string, body: Partial<Pick<UsuarioGestao, 'nome' | 'email' | 'organizacao' | 'perfil' | 'admin' | 'ativo'>>) {
    return this.http.patch<UsuarioGestao>(`${API}/usuarios/${id}`, body);
  }
  redefinirSenha(id: string, senha: string) { return this.http.post<void>(`${API}/usuarios/${id}/senha`, { senha }); }

  // Operação longa: 202 + job_id, depois polling até CONCLUIDO/FALHOU.
  // Intervalo crescente: 1 s, 1,4 s, 2 s, 2,7 s e depois 3 s fixos. O CLAUDE.md §8 fala em "a partir de 2 s";
  // começamos em 1 s porque os jobs simulados duram ~3 s e a IA real costuma levar poucos segundos.
  // Falha transitória (servidor fora/reiniciando: 0, 502, 503, 504) não encerra o acompanhamento: tenta de novo
  // até 5 vezes com espera crescente (~22 s no total). Desistindo, o erro sobe e a tela mostra lerErro();
  // a pendência no mock é reconsultada quando a demanda/o chamado for aberto de novo.
  acompanharJob(jobId: string): Observable<Job> {
    return defer(() => {
      let tentativa = 0;
      const consultar = () => timer(intervaloPolling(tentativa++)).pipe(
        switchMap(() => this.http.get<Job>(`${API}/jobs/${jobId}`).pipe(
          retry({ count: 5, delay: (e: unknown, n: number) => (falhaTransitoria(e) ? timer(1500 * n) : throwError(() => e)) }),
        )),
      );
      return consultar().pipe(expand((j) => (jobTerminou(j) ? EMPTY : consultar())));
    });
  }

  aguardarJob(jobId: string): Observable<Job> {
    return this.acompanharJob(jobId).pipe(filter(jobTerminou), take(1));
  }
}

export const falhaTransitoria = (e: unknown) => e instanceof HttpErrorResponse && [0, 502, 503, 504].includes(e.status);

export const jobTerminou = (j: Job) => j.estado === 'CONCLUIDO' || j.estado === 'FALHOU';

export function intervaloPolling(tentativa: number) {
  return Math.min(3000, Math.round(1000 * 1.4 ** tentativa));
}

const SEM_SERVIDOR = 'Não foi possível falar com o servidor. Verifique se o backend está rodando.';

export function lerErro(e: unknown): ErroApi {
  if (!(e instanceof HttpErrorResponse)) return { mensagem: 'Não foi possível concluir. Tente de novo.' };
  const corpo: unknown = e.error;
  if (corpo && typeof corpo === 'object') {
    if ('mensagem' in corpo && typeof corpo.mensagem === 'string') return corpo as ErroApi;
    if ('detail' in corpo && typeof corpo.detail === 'string') return { mensagem: corpo.detail };
  }
  // status 0: sem conexão. 502/503/504 ou 500 sem corpo JSON: o proxy do `ng serve` não alcançou o Django.
  if (e.status === 0 || e.status === 502 || e.status === 503 || e.status === 504 || (e.status === 500 && typeof corpo !== 'object')) {
    return { mensagem: SEM_SERVIDOR };
  }
  if (e.status === 429) return { mensagem: 'Muitas tentativas em pouco tempo. Aguarde um pouco e tente de novo.' };
  return { mensagem: 'Não foi possível concluir. Tente de novo.' };
}
