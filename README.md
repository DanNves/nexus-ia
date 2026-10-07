# NEXUS

Plataforma inteligente de apoio ao levantamento, especificação, prototipação e suporte pós-entrega de soluções de software. Trabalho de Conclusão de Curso — ADS, UCSal.

O cliente descreve a necessidade (texto ou ata/transcrição). O NEXUS conduz uma entrevista guiada com perguntas simples de múltipla escolha, recomenda o tipo de solução (web, desktop, job…), gera um protótipo de telas, encaminha a solicitação à equipe responsável e produz o documento de requisitos. Depois da entrega, usa esse contexto no atendimento de chamados e forma uma base de conhecimento.

**Regra central:** IA propõe → humano valida → sistema consolida.

> Fase atual: **documentação**. Ver [`docs/STATUS_PROJETO.md`](docs/STATUS_PROJETO.md).

## Estrutura

```
frontend/   Angular 22 (standalone, Signals, Router, TypeScript strict)
backend/    Django + Django REST Framework (SQLite em localhost)
docs/       documentação oficial
```

## Rodar em localhost

Frontend:

```bash
cd frontend
npm ci
npm start          # http://localhost:4200
```

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
python manage.py runserver     # http://localhost:8000
```

## Qualidade

```bash
# frontend/
npm run check
npm run build

# backend/
python manage.py check
python manage.py test
```

## Documentação

- [Especificação mestra](CLAUDE.md)
- [Fluxo funcional](docs/FLUXO.md)
- [Arquitetura](docs/ARQUITETURA.md) — resumo de [`docs/Nexus_Arquitetura.pdf`](docs/Nexus_Arquitetura.pdf)
- [Modelo de dados](docs/MODELO_DADOS.md)
- [Status](docs/STATUS_PROJETO.md)
- [Histórico do MVP anterior](docs/historico/)

Os dados de demonstração são fictícios e não representam resultados experimentais do TCC.
