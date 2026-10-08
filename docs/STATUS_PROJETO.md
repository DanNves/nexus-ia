# NEXUS — Status do projeto

Data: 2026-10-08

## Fase atual: main reconstruída; backend real em implementação

A documentação (Fase 0) foi concluída. O frontend Angular foi reconstruído e navega como se estivesse ligado à API: o `HttpClient` chama `/api/v1/...` e o interceptor `core/api/mock-backend.interceptor.ts` responde com dados fictícios persistidos no navegador (localStorage), com latência simulada, validação de campos (erros 400 no formato do DRF), regras por perfil e operações longas no contrato `202 + job` com polling.

### Telas implementadas
Visão geral · Demandas (lista e filtros) e Atividades (quadro/lista) · Nova demanda (2 etapas + anexo .txt) · Detalhe da demanda (resumo, entrevista guiada adaptativa, cenário recomendado, protótipo em HTML isolado, solicitação com viabilidade/reunião/metodologia, requisitos com aprovar/editar/rejeitar, documento imprimível) · Calendário (mês, agenda, novo compromisso) · Soluções e versões · Fila (posição do cliente, fila ordenada da equipe) · Chamado (apoio da IA com contexto recuperado, aprovação/rejeição humana, resolução e registro de conhecimento).

### Verificação feita (2026-10-07)
- `npm run check` e `npm run build` sem erros e sem avisos.
- Fluxo completo executado clicando no navegador (Edge headless via CDP): cliente cria demanda → responde 6 perguntas → recebe cenário e protótipo → envia à equipe; equipe marca possível → agenda reunião → define Scrum → IA sugere 5 requisitos → 1 rejeitado com motivo, 4 aprovados → inicia desenvolvimento → documento com 4 requisitos; cliente abre chamado (2º na fila); equipe atende, IA sugere, humano aprova, chamado resolvido e KB-008 registrado. Nenhum erro de console.
- Sem rolagem horizontal em 375 px em todas as rotas.

### Para trocar pelo backend real
`src/app/environment.ts` → `useMock: false`. Os contratos esperados estão em `src/app/core/api/models.ts` e `nexus-api.service.ts`.

## Repositório

A main foi reconstruída usando a árvore da development como referência, sem alterar a development. A estrutura oficial agora é frontend/ + backend/ + docs/. A identidade visual NEXUS foi preservada nos tokens principais.


```
frontend/   Angular 22 — MVP anterior (suporte-centrado, dados em localStorage); build e check passando
backend/    Django — projeto `config` recém-criado, SQLite, sem apps
docs/       documentação oficial (este diretório)
```

## Decisões tomadas

| Data | Decisão |
|---|---|
| 2026-10-07 | Separação em `frontend/` (Angular 22, mantido) e `backend/` (Django) |
| 2026-10-07 | Sobras do Lovable (React/TanStack) removidas |
| 2026-10-07 | Supabase descartado; execução em **localhost** |
| 2026-10-07 | Banco **SQLite** temporário |
| 2026-10-07 | Escopo ampliado: levantamento guiado → cenário → protótipo → solicitação → requisitos → pós-entrega |
| 2026-10-07 | Arquitetura de referência: `docs/Nexus_Arquitetura.pdf` (monólito modular Django + Angular + API REST) |
| 2026-10-07 | IA usará **modelo real** via porta `LLMProvider` (provedor a definir); `fake_adapter` em testes/demonstração |
| 2026-10-07 | Anexos do MVP: somente texto (ata/transcrição); .txt decidido, .docx/.pdf a confirmar |
| 2026-10-07 | Parecer do PO sobre a documentação v2: aprovado com ressalvas; correções aplicadas e lacunas levadas ao §30 |

## Decisões em aberto

Ver `CLAUDE.md` §30.

## Pendências técnicas conhecidas

- Configurar SECRET_KEY, DEBUG, hosts e CORS por .env no backend real.
- Criar os apps Django e migrations do modelo definido em docs/MODELO_DADOS.md.
- Aviso NG8107 no template do `AiComponent` (frontend).
- Frontend segue a estrutura core/shared/features e ainda usa mock enquanto a API real é construída.
- Integrar useMock false somente depois dos endpoints reais e testes.
- Vercel não faz parte da arquitetura atual; publicação é tratada como evolução posterior.

## Próximas fases na main

Ver `CLAUDE.md` §31.
