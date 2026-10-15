# NEXUS — Status do projeto

Data: 2026-10-15

## Fase atual: backend iniciado + mock híbrido

Autenticação e IA já são **reais** no Django. O restante do domínio (demandas, atividades, calendário, soluções, chamados, cenário, protótipo e entrevista) continua no interceptor `core/api/mock-backend.interceptor.ts`, que repassa ao Django as rotas reais (`/api/v1/auth/*`, `/api/v1/me`, `/api/v1/ia/*`, `/api/v1/jobs/:id`). Contrato em `claude/front/contratos.md`.

### Entregue em 2026-10-15
- **Backend (`backend/`):** settings por ambiente com `.env` (nova `SECRET_KEY`); `core` (modelo-base UUID, auditoria append-only, erros sempre em JSON `{mensagem, campos}` em português claro); `contas` (usuário com perfil CLIENTE/EQUIPE, cadastro público que cria sempre CLIENTE, login por usuário ou e-mail, JWT de 15 min com refresh rotativo em cookie HttpOnly e revogação no logout, checagem de origem e limites de tentativas, `seed_demo`); `ia` (porta `LLMProvider`; adaptadores `gemini`, `openai_compat` e `fake`; cadeia de modelos de reserva; anonimização LGPD antes do envio; esquema JSON validado; prompts versionados no banco; Job em thread com contrato 202 + polling; LogIA por tentativa; cota por alvo e limite por usuário; comandos `ia_testar` e `ia_avaliar`).
- **IA real:** Gemini free tier. Principal `gemini-3.5-flash-lite`, reservas `gemini-3.8-flash` e `gemini-3.6-flash`, 20 s por tentativa (medições em `claude/ia.md`). Usada em **requisitos** e **sugestão de suporte**; rejeições anteriores (com motivo) entram na nova geração (§6).
- **Frontend:** telas **Entrar** e **Criar conta** (arte inspirada em uiverse/21st.dev/ReactBits, só nessas telas), guards e sessão real, botão **Ajuda** com tour guiado aba por aba, contraste AA do botão primário.
- **Usuários de demonstração:** `EquipeAdmin`/`123` (Equipe) e `Usuario`/`123` (Cliente), só com DEBUG.
- **Time:** novos agentes `ia-arquiteto` e `ia-engenheiro` (memória em `claude/ia.md`).

### Verificação (2026-10-15)
- Backend: `manage.py check`, `makemigrations --check` e `manage.py test` (148 testes) passando.
- Frontend: `npm run check` e `npm run build` passando.
- QA ponta a ponta com Django real, Angular e Gemini real (login, cadastro, perfis, requisitos, sugestão de suporte, falha do backend, tour, 17 rotas em 2 larguras e 2 perfis, contrato). Gerações reais concluíram em 2,9–5,0 s na tela. Defeitos encontrados foram corrigidos e retestados (`claude/qa.md`).
- Segurança: sem achados críticos/altos; limite de login contornável por `X-Forwarded-For` corrigido; pendências médias em `claude/seguranca.md`.

### Como rodar
Ver `CLAUDE.md` §8 ("Como rodar"). Front obrigatoriamente na porta 4200.

## Fase anterior: frontend com backend simulado (2026-10-07)

A documentação (Fase 0) foi concluída. O frontend Angular foi reconstruído e navega como se estivesse ligado à API: o `HttpClient` chama `/api/v1/...` e o interceptor `core/api/mock-backend.interceptor.ts` responde com dados fictícios persistidos no navegador (localStorage), com latência simulada, validação de campos (erros 400 no formato do DRF), regras por perfil e operações longas no contrato `202 + job` com polling.

### Telas implementadas
Visão geral · Demandas (lista e filtros) e Atividades (quadro/lista) · Nova demanda (2 etapas + anexo .txt) · Detalhe da demanda (resumo, entrevista guiada adaptativa, cenário recomendado, protótipo em HTML isolado, solicitação com viabilidade/reunião/metodologia, requisitos com aprovar/editar/rejeitar, documento imprimível) · Calendário (mês, agenda, novo compromisso) · Soluções e versões · Fila (posição do cliente, fila ordenada da equipe) · Chamado (apoio da IA com contexto recuperado, aprovação/rejeição humana, resolução e registro de conhecimento).

### Verificação feita (2026-10-07)
- `npm run check` e `npm run build` sem erros e sem avisos.
- Fluxo completo executado clicando no navegador (Edge headless via CDP): cliente cria demanda → responde 6 perguntas → recebe cenário e protótipo → envia à equipe; equipe marca possível → agenda reunião → define Scrum → IA sugere 5 requisitos → 1 rejeitado com motivo, 4 aprovados → inicia desenvolvimento → documento com 4 requisitos; cliente abre chamado (2º na fila); equipe atende, IA sugere, humano aprova, chamado resolvido e KB-008 registrado. Nenhum erro de console.
- Sem rolagem horizontal em 375 px em todas as rotas.

### Para trocar pelo backend real
À medida que cada módulo de domínio existir no Django, remover as rotas correspondentes do mock (ele já repassa ao Django tudo que não responde). Quando não restar nenhuma: `src/app/environment.ts` → `useMock: false`. Contratos em `src/app/core/api/models.ts` e `claude/front/contratos.md`.

## Repositório

```
frontend/   Angular 22 — telas completas; auth e IA reais, restante via mock híbrido
backend/    Django 6.1 + DRF — apps core, contas e ia; SQLite; 148 testes
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
| 2026-10-15 | Backend liberado: autenticação JWT real e IA real com **Gemini** (free tier) atrás da porta `LLMProvider` |
| 2026-10-15 | Tarefas longas em **thread** com contrato 202 + job (§30 #2) |
| 2026-10-15 | Modelo principal `gemini-3.5-flash-lite` (reservas 3.8-flash e 3.6-flash) após medição de latência e avaliação |
| 2026-10-15 | Refresh token em cookie HttpOnly + proxy de mesma origem no `ng serve` |
| 2026-10-15 | Dependências do backend: DRF, SimpleJWT, python-dotenv, httpx (`backend/requirements/base.txt`) |

## Decisões em aberto

Ver `CLAUDE.md` §30.

## Pendências técnicas conhecidas

- ~~`SECRET_KEY` fixa e `DEBUG = True` no código~~ — resolvido em 2026-10-15 (`.env`, settings por ambiente).
- ~~Frontend em `pages/` e sem integração~~ — resolvido (`core/shared/features`; auth e IA integradas).
- Máquina de estados genérica (§6) e auditoria das decisões de validação ainda não existem no backend (vêm com os módulos de domínio).
- Entrada e alvo das gerações de IA ainda chegam montados pelo front (`claude/seguranca.md`); o servidor passará a montá-los do banco quando `demandas`/`chamados` existirem.
- Anonimização não detecta nomes fora do cadastro; no free tier do Gemini usar só dados fictícios.
- Vercel não é usada; `frontend/vercel.json` é legado.

## Próximas fases (após liberação)

Ver `CLAUDE.md` §31.
