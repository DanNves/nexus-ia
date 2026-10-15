import { ActivatedRoute } from '@angular/router';

/**
 * Para onde ir depois de entrar ou criar a conta.
 * Só aceita caminho interno (começa com "/" e não com "//" nem "/\"), para não virar redirecionamento aberto.
 */
export function lerVoltar(rota: ActivatedRoute): string | null {
  const v = rota.snapshot.queryParamMap.get('voltar');
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) return null;
  if (v.startsWith('/entrar') || v.startsWith('/criar-conta')) return null;
  return v;
}

export const DESTINO_PADRAO = '/visao-geral';
