# NEXUS — Orientações de desenvolvimento

Leia [`CLAUDE.md`](CLAUDE.md) antes de qualquer alteração. Ele é a especificação mestra.

## Fonte do desenvolvimento

- GitHub (`DanNves/nexus-ia`) é a fonte oficial do código.
- Lovable e Supabase não são mais usados.
- Não reescrever histórico publicado: sem force push, rebase, amend ou squash de commits já enviados.

## Arquitetura

- `frontend/`: Angular 22, standalone components, Signals, Router, TypeScript strict.
- `backend/`: Django + DRF, monólito modular (apps por contexto de negócio; camadas api/services/domain/infra).
- Banco SQLite em localhost (temporário).
- IA via porta `LLMProvider` (modelo real a definir; `fake_adapter` para testes e demonstração).
- Detalhes: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Regra central do produto

**IA propõe → humano valida → sistema consolida.**

Nenhuma implementação pode permitir que a IA aprove artefatos, conclua chamados, decida viabilidade/metodologia, publique conhecimento ou envie documento ao cliente de forma autônoma.

## Antes de alterar

1. Ler `CLAUDE.md` (escopo §4, fluxo §5, regras §19 e §23).
2. Verificar modelo, serviço, rota, componente e CSS relacionados.
3. Preservar rastreabilidade e a máquina de estados dos artefatos.
4. Não adicionar funcionalidade fora do escopo.
5. Rodar as validações: `npm run check` e `npm run build` em `frontend/`; `python manage.py check` e `python manage.py test` em `backend/`.

## Segurança

- Nenhum segredo no código nem no frontend; usar `backend/.env` (não versionado).
- Permissão por objeto em toda rota da API.
- Anonimizar dados pessoais antes de enviar à IA.
- Componentes Angular não chamam a API diretamente; usar serviços.
- Mudanças de schema via migrations do Django.

## Dados

Os registros de demonstração são fictícios e devem permanecer coerentes. Não apresentá-los como resultados experimentais.

## Git

Branches pequenas e commits objetivos. `.claude/` e `claude/` são locais e não são versionados.
