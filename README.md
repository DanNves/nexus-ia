# NEXUS — Conexão entre Demanda, Desenvolvimento e Suporte

Plataforma web para acompanhar a necessidade de software desde o levantamento até o suporte pós-entrega, preservando o contexto entre as etapas.

**Regra central:** IA propõe → humano valida → sistema consolida.

## Arquitetura oficial da main

A main foi reconstruída a partir da especificação atualmente mantida na branch development. A branch development permanece somente como referência e não deve ser alterada como parte desta migração.

```
frontend/   Angular 22 — interface e navegação
backend/    Django 6.1 + Django REST Framework — API
SQLite      banco local do MVP
docs/       especificação e arquitetura
```

O frontend está atualmente em modo de backend simulado para preservar o fluxo demonstrável enquanto a API Django é implementada. A meta da próxima etapa é substituir o interceptor mock pela API real sem alterar o contrato visual/funcional.

### Fluxo do produto

```
NECESSIDADE
   ↓
ENTREVISTA GUIADA
   ↓
CENÁRIO
   ↓
PROTÓTIPO
   ↓
SOLICITAÇÃO
   ↓
VIABILIDADE / REUNIÃO / METODOLOGIA
   ↓
REQUISITOS
   ↓
DOCUMENTO
   ↓
PRODUTO / VERSÃO
   ↓
CHAMADO
   ↓
RECUPERAÇÃO DO CONTEXTO
   ↓
IA SUGERE
   ↓
HUMANO VALIDA
   ↓
CONHECIMENTO
   ↓
REUSO
```

## Banco de dados

O MVP utiliza SQLite local por decisão arquitetural atual. Django suporta SQLite oficialmente e o utiliza como opção padrão; a arquitetura deixa aberta uma migração futura para PostgreSQL quando houver necessidade de ambiente compartilhado.

Não utilizar Supabase nesta arquitetura.

## Interface

A identidade NEXUS é preservada:
- Navy #020A1D
- Azul #0878FF
- Fundo claro NEXUS
- Verde #159B70
- Laranja #C27A16
- Roxo #7355C8

A navegação e a organização das telas seguem a especificação consolidada da arquitetura.

## Rodar

### Frontend

```bash
cd frontend
npm ci
npm start
```

Abre em http://localhost:4200.

### Backend

Requer Python 3.12+ para Django 6.1.

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API: http://localhost:8000/api/v1/

## Qualidade

```bash
cd frontend
npm run check
npm run build
```

Backend:

```bash
cd backend
python manage.py check
python manage.py makemigrations --check
python manage.py test
```

## Documentação

- Especificação mestra: CLAUDE.md
- Orientações: AGENTS.md
- Arquitetura: docs/ARQUITETURA.md
- Fluxo: docs/FLUXO.md
- Modelo de dados: docs/MODELO_DADOS.md
- Status: docs/STATUS_PROJETO.md
- Histórico: docs/historico/

Os dados de demonstração são fictícios e não representam resultados experimentais do TCC.
