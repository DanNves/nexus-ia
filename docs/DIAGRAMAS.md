# NEXUS — Diagramas de Arquitetura e Modelagem

Este documento define os diagramas que devem acompanhar o TCC e orientar a implementação.

## 1. Diagrama de contexto

```
                    +----------------------+
                    |      Usuário         |
                    | suporte / gestão     |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |       NEXUS          |
                    | contexto + suporte   |
                    +----------+-----------+
                               |
             +-----------------+------------------+
             |                                    |
             v                                    v
      +--------------+                     +--------------+
      |   Supabase   |                     |    IA        |
      | PostgreSQL   |                     | simulada     |
      +--------------+                     +--------------+
             |                                    |
             +----------------+-------------------+
                              |
                              v
                    +----------------------+
                    | Conhecimento validado|
                    +----------------------+
```

## 2. Diagrama de arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                       NAVEGADOR                             │
│                                                             │
│  Angular 22                                                 │
│  ├─ Router                                                  │
│  ├─ Pages                                                   │
│  ├─ Shared Components                                       │
│  └─ Signals / Store                                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           v
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE DATA API                         │
│                    + Row Level Security                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           v
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                               │
│ people | demands | activities | requirements | solutions   │
│ versions | tickets | ai_suggestions | knowledge             │
│ comments | record_links | audit_events                       │
└─────────────────────────────────────────────────────────────┘

GitHub → CI → Vercel → Angular
Lovable → preview/apoio visual
```

## 3. Diagrama do fluxo do TCC

```
[DEMANDA]
    |
    v
[REQUISITO]
    |
    v
[VERSÃO]
    |
    v
[CHAMADO]
    |
    v
[RECUPERAÇÃO DO CONTEXTO]
    |
    v
[IA — SIMULAÇÃO CONTROLADA]
    |
    v
[SUGESTÃO]
    |
    v
[VALIDAÇÃO HUMANA]
    |
    +---- rejeitar/editar ----> [CHAMADO]
    |
    v
[CONHECIMENTO]
    |
    v
[REUSO EM NOVO CHAMADO]
```

## 4. Diagrama de decisão da IA

```
              +------------------+
              | Chamado aberto   |
              +--------+---------+
                       |
                       v
             +----------------------+
             | Há contexto?         |
             +----+------------+----+
                  |            |
                 sim           não
                  |            |
                  v            v
        +---------------+   +----------------+
        | Recuperar     |   | Registrar      |
        | relações      |   | contexto parcial|
        +-------+-------+   +--------+-------+
                |                    |
                +---------+----------+
                          v
                 +-------------------+
                 | Sugestão simulada |
                 +---------+---------+
                           |
                    +------+------+
                    |             |
                 aprovar       rejeitar
                    |             |
                    v             v
             +-------------+   +---------+
             | Conhecimento|   | Revisão |
             | consolidado |   | humana  |
             +-------------+   +---------+
```

## 5. Diagrama ER simplificado

```
PEOPLE
  |
  +---- DEMANDS ---- ACTIVITIES
  |       |
  |       +---- REQUIREMENTS
  |       |
  |       +---- TICKETS ---- AI_SUGGESTIONS
  |                    |
  |                    +---- KNOWLEDGE
  |
  +---- COMMENTS
  |
  +---- AUDIT_EVENTS

SOLUTIONS ---- VERSIONS
     |
     +---- DEMANDS
     +---- REQUIREMENTS
     +---- TICKETS
     +---- KNOWLEDGE

RECORD_LINKS conecta registros de tipos diferentes.
```

## 6. Diagrama de implantação

```
GitHub
  |
  | push / PR
  v
GitHub Actions
  |
  | npm ci + check + build
  v
Vercel
  |
  v
Angular 22
  |
  | HTTPS
  v
Supabase
  |
  v
PostgreSQL
```

## 7. Diagrama para apresentação da banca

A versão visual deve destacar somente o fluxo essencial:

**DEMANDA → REQUISITO → VERSÃO → CHAMADO → CONTEXTO → IA → SUGESTÃO → VALIDAÇÃO → CONHECIMENTO**

Abaixo dele:

**IA SUGERE → HUMANO VALIDA → SISTEMA CONSOLIDA**

À direita:
- Angular 22;
- Supabase;
- GitHub;
- Vercel.

O diagrama não deve transformar a apresentação em um mapa de infraestrutura.

## 8. Arquivo visual de orientação

Foi produzido também um infográfico visual detalhado para servir como referência durante a implementação e a montagem da apresentação. Ele contempla arquitetura geral, fluxo, modelo de entidades, organização Angular, GitHub, Vercel, Lovable e próximos passos.

A imagem é material de orientação; os arquivos Markdown deste diretório são a fonte textual oficial.
