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
- Persistência em localStorage.
- IA como simulação controlada.
- Sem backend, PostgreSQL, autenticação completa, LLM real ou RAG vetorial no MVP.

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

## Prévia no Lovable
- A prévia serve o build oficial do Angular (`frontend/` de DanNves/nexus-ia): os arquivos montados ficam em `public/` e `src/nexus-angular.html`, e as rotas `src/routes/index.tsx` e `src/routes/$.tsx` devolvem esse HTML. Motivo: o Lovable não roda o Angular CLI, e assim a prévia mostra exatamente o código do repositório. Para atualizar, monte de novo o `frontend/` com Node >= 24.15 e copie os arquivos gerados.
