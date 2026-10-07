# NEXUS — Conexão entre Demanda, Desenvolvimento e Suporte

Plataforma web para preservar o contexto produzido durante o desenvolvimento de uma solução de software e utilizá-lo no atendimento de chamados de suporte.

## MVP
Demanda → Requisitos → Versão da solução → Chamado → Recuperação do contexto → IA generativa → Sugestão → Validação humana → Base de conhecimento

**Regra central:** IA sugere → humano valida → sistema consolida.

O GitHub é a fonte principal do desenvolvimento. O escopo poderá evoluir durante o TCC sem perder o foco central.


## Arquitetura atual

O MVP oficial usa **Angular 22**, standalone components, Signals, Angular Router, TypeScript strict e persistência em `localStorage`. A aplicação utiliza o application builder do Angular e possui fallback de SPA configurado para publicação na Vercel. A persistência do MVP consolidado utiliza Supabase/PostgreSQL com RLS; localStorage permanece como fallback temporário durante a migração.

A IA do MVP é uma **simulação controlada**: ela demonstra recuperação de contexto, classificação, possíveis causas e procedimentos sugeridos, sempre com validação humana. Não há LLM real ou RAG vetorial nesta etapa. O Supabase é a camada de persistência gerenciada do MVP, sem backend próprio.

## Qualidade

Antes de concluir alterações:

```bash
npm ci
npm run check
npm run build
```

O `check` verifica alguns contratos arquiteturais do MVP, como ausência de `!important`, `100vh` e `$any()` no código da aplicação. O GitHub Actions executa essa verificação antes do build.

## Fluxo demonstrável

**Demanda → Requisito → Versão → Chamado → Recuperação do contexto → IA sugere → Humano valida → Conhecimento**

O cenário de demonstração utiliza dados fictícios. Indicadores e reuso iniciais são dados do MVP e não representam resultados experimentais do TCC.


## Arquitetura e documentação

- [Arquitetura do MVP](docs/ARQUITETURA_MVP.md)
- [Modelo de dados](docs/MODELO_DADOS.md)
- [Supabase](docs/SUPABASE.md)
- [Parte/Fase 4](docs/PARTE_4_IMPLEMENTACAO.md)
- [Diagramas](docs/DIAGRAMAS.md)

A documentação da Fase 4 original permanece como histórico e critérios de validação. A adoção do Supabase é tratada como evolução posterior e não altera retroativamente o histórico acadêmico.

## Validação

```bash
npm ci
npm run check
npm run build
```
