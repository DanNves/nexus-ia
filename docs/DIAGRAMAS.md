# NEXUS — Diagramas oficiais

## 1. Contexto

```
┌───────────────┐
│   SOLICITANTE │
└───────┬───────┘
        │ necessidade
        ▼
┌─────────────────────────────┐
│           NEXUS             │
│ levantamento → suporte      │
│ contexto + IA + validação   │
└───────┬─────────────┬───────┘
        │             │
        ▼             ▼
┌─────────────┐  ┌─────────────┐
│ Django/DRF  │  │ Provedor IA │
│ SQLite      │  │ via porta   │
└─────────────┘  └─────────────┘
```

## 2. Arquitetura

```
                    NEXUS
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌─────────────────┐       ┌────────────────────┐
│ Angular 22      │ HTTP  │ Django + DRF       │
│ Router/Signals  │◄─────►│ API /api/v1/       │
│ Features        │       │ monólito modular   │
└─────────────────┘       └─────────┬──────────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │   SQLite    │
                             └─────────────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │ Auditoria   │
                             └─────────────┘

                       ┌──────────────────┐
                       │ LLMProvider      │
                       │ + fake adapter   │
                       └──────────────────┘
```

## 3. Fluxo funcional

```
NECESSIDADE
    ↓
ENTREVISTA
    ↓
CENÁRIO
    ↓
PROTÓTIPO
    ↓
SOLICITAÇÃO
    ↓
VIABILIDADE
    ↓
REUNIÃO
    ↓
METODOLOGIA
    ↓
REQUISITOS
    ↓
DOCUMENTO
    ↓
PRODUTO / VERSÃO
    ↓
CHAMADO
    ↓
CONTEXTO
    ↓
IA PROPÕE
    ↓
HUMANO VALIDA
   ↙       ↘
REJEITA    APROVA
  ↓          ↓
REVISÃO   CONHECIMENTO
             ↓
            REUSO
```

## 4. Rastreabilidade

```
Demanda
  │
  ├── Fonte / Entrevista
  │
  ├── Cenário
  │
  ├── Protótipo
  │
  ├── Requisitos
  │      └── Baseline
  │
  └── Produto
         └── Versão
               │
               └── Chamado
                     │
                     ├── Triagem
                     └── Conhecimento
```

## 5. Máquina de estados da IA

```
GERAÇÃO
   ↓
PROPOSTO
   ↓
EM_REVISAO
 ┌─┼───────────────┐
 ↓ ↓               ↓
APROVADO  EDITADO  REJEITADO
            ↓          ↓
       EM_REVISAO   NOVA GERAÇÃO
```

Não existe transição automática para APROVADO.

## 6. Implantação local

```
GitHub
  │
  ▼
main
  │
  ├── frontend
  │     └── Angular 22 :4200
  │
  └── backend
        └── Django/DRF :8000
              │
              └── SQLite

development
  └── referência da arquitetura
      (não recebe alterações desta migração)
```

## 7. Regra para a banca

O diagrama principal da apresentação deve mostrar somente:

**DEMANDA → REQUISITO → VERSÃO → CHAMADO → CONTEXTO → IA → SUGESTÃO → VALIDAÇÃO → CONHECIMENTO**

e, abaixo:

**IA SUGERE → HUMANO VALIDA → SISTEMA CONSOLIDA**

A arquitetura técnica detalhada fica para o slide de arquitetura.
