# NEXUS — Orientações de desenvolvimento

O repositório oficial do NEXUS é a implementação **Angular 22** em `DanNves/nexus-ia`.

## Fonte do desenvolvimento

- GitHub é a fonte principal do código.
- Não regenerar o projeto no Lovable.
- Lovable/preview antigo pode conter a implementação React/TanStack anterior e não representa o runtime oficial atual.
- Não reescrever histórico publicado: não usar force push, rebase, amend ou squash em commits já enviados.

## Arquitetura atual

- Angular 22, standalone components e Signals.
- Angular Router.
- TypeScript strict.
- Persistência principal em Supabase/PostgreSQL com RLS.
- localStorage permanece como fallback temporário e mecanismo de demonstração.
- IA como simulação controlada.
- Sem backend próprio; Supabase fornece PostgreSQL/Data API.
- Autenticação Supabase deve ser concluída antes da escrita pública.
- IA simulada, sem LLM real ou RAG vetorial.

## Regra central do produto

**IA sugere → humano valida → sistema consolida.**

Nenhuma implementação deve permitir que a IA conclua chamados, publique conhecimento ou tome decisão crítica de forma autônoma.

## Antes de alterar

1. Ler `CLAUDE.md`.
2. Verificar modelo, store, rotas, componente e CSS relacionados.
3. Preservar rastreabilidade entre demanda, requisito, versão, chamado e conhecimento.
4. Evitar adicionar funcionalidade fora do recorte do TCC.
5. Executar `npm run check` e `npm run build` antes de considerar a alteração concluída.

## Dados

Os registros de demonstração são fictícios e devem permanecer coerentes. Não apresentar dados de demonstração como resultados experimentais reais.

## Git

Preferir branches pequenas e commits objetivos. Nunca force histórico publicado.


## Supabase

- Não colocar secret/service role key no frontend.
- Usar chave publicável no navegador.
- RLS deve permanecer habilitado.
- Componentes não devem acessar Supabase diretamente; usar camada de persistência.
- Versionar mudanças do schema em `supabase/migrations`.
