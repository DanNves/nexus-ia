# NEXUS — Orientações de desenvolvimento

Leia CLAUDE.md antes de qualquer alteração. Ele é a especificação mestra.

## Fonte do desenvolvimento

- main é a branch de implementação oficial do MVP.
- development é somente a referência usada para esta reconstrução e não deve ser modificada neste trabalho.
- GitHub é a fonte oficial do código.
- Não reescrever histórico publicado: sem force push, rebase, amend ou squash.

## Arquitetura

- frontend/: Angular 22, standalone components, Signals, Router, TypeScript strict.
- backend/: Django 6.1 + Django REST Framework.
- Banco: SQLite local no MVP.
- IA: porta LLMProvider, com fake_adapter para testes/demonstração e provedor real definido posteriormente.
- API versionada em /api/v1/.
- Monólito modular Django; módulos não importam models de outros módulos diretamente.
- Detalhes: docs/ARQUITETURA.md.

## Regra central

IA propõe → humano valida → sistema consolida.

Nenhuma implementação pode permitir que a IA aprove artefatos sozinha, conclua chamados, decida viabilidade/metodologia, publique conhecimento, altere infraestrutura ou execute comandos críticos.

## Antes de alterar

1. Ler CLAUDE.md.
2. Verificar se a funcionalidade pertence ao escopo.
3. Verificar modelo, serviço, rota, componente e CSS existentes.
4. Preservar rastreabilidade e máquina de estados.
5. Preservar a identidade visual NEXUS.
6. Garantir navegação real e responsiva.
7. Rodar validações do frontend e backend.

## Dados e segurança

- SQLite é o banco do MVP local.
- Segredos ficam em backend/.env; nunca no frontend ou Git.
- Permissões devem ser aplicadas por perfil e objeto na API.
- Dados de demonstração são fictícios.
- Dados pessoais devem ser anonimizados antes de qualquer envio a provedor de IA.
- Auditoria é append-only.
- Migrações de schema são feitas pelo Django.

## Git

Branches pequenas e commits objetivos. development não deve receber commits como parte da reconstrução da main.
