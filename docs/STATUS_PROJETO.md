# NEXUS — Status do projeto

Data: 2026-10-07

## Fase atual: 0 — Documentação

Nenhuma implementação nova até a liberação do autor. Objetivo da fase: deixar escopo, fluxo, arquitetura e modelo de dados consistentes antes de começar.

## Repositório

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

- `backend/config/settings.py`: `SECRET_KEY` fixa no código e `DEBUG = True` — mover para `.env` antes do primeiro commit do backend.
- Aviso NG8107 no template do `AiComponent` (frontend).
- Frontend ainda organizado em `pages/` (alvo: `core/shared/features`) e sem integração com API.
- Vercel não é usada; `frontend/vercel.json` é legado.

## Próximas fases (após liberação)

Ver `CLAUDE.md` §31.
