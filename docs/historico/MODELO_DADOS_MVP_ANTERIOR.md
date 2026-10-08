# NEXUS — Modelo de Dados e Rastreabilidade

## 1. Objetivo

O modelo deve representar o ciclo completo do NEXUS sem transformar relações em texto livre.

## 2. Entidades

| Entidade | Função |
|---|---|
| people | pessoas envolvidas |
| demands | origem da necessidade |
| activities | trabalho relacionado à demanda |
| requirements | especificação do que deve ser atendido |
| solutions | solução/produto |
| versions | versão publicada da solução |
| tickets | problema pós-entrega |
| ai_suggestions | sugestão simulada e decisão humana |
| knowledge | conhecimento validado e reutilizável |
| comments | comunicação associada aos registros |
| record_links | relações explícitas entre registros |
| audit_events | trilha de alterações relevantes |

## 3. Chaves

Os códigos legíveis atuais, como `DEM-012`, `REQ-014`, `VER-120`, `CH-028` e `KB-007`, continuam sendo identificadores de demonstração.

Na persistência do backend (Django + SQLite), cada registro possui uma chave interna e mantém o código funcional para apresentação e rastreabilidade.

## 4. Relações principais

```
people
  ├── requester/assignee
  └── validated_by

solutions
  └── versions

demands
  ├── activities
  ├── requirements
  ├── tickets
  └── solution/version

requirements
  └── demand + solution/version

versions
  └── solution

tickets
  ├── demand
  ├── activity
  ├── requirement
  ├── solution
  ├── version
  └── ai_suggestions

ai_suggestions
  └── ticket + validated_by

knowledge
  ├── source_ticket
  ├── solution
  ├── version
  └── validated_by

record_links
  └── qualquer origem ↔ qualquer destino permitido
```

## 5. Regras de integridade

1. Versão pertence a uma solução.
2. Requisito pode apontar para demanda, solução e versão.
3. Chamado deve preservar solução/versão quando conhecidos.
4. Sugestão IA pertence a um chamado.
5. Conhecimento originado de suporte deve apontar para o chamado de origem.
6. Conhecimento oficial deve possuir validação humana.
7. Relações importantes devem ser navegáveis nos dois sentidos.
8. IDs de demonstração não devem ser embutidos em indicadores.
9. Status devem respeitar o conjunto permitido por entidade.
10. Conclusão de chamado deve exigir a validação humana prevista pelo TCC.

## 6. Record links

A tabela `record_links` permite registrar relações que não precisam virar dezenas de colunas específicas.

Exemplos:

```
('Demanda', 'DEM-012', 'Requisito', 'REQ-014', 'origina')
('Requisito', 'REQ-014', 'Versão', 'VER-120', 'implementado_em')
('Versão', 'VER-120', 'Chamado', 'CH-028', 'afetado_por')
('Chamado', 'CH-028', 'Conhecimento', 'KB-007', 'originou')
```

A implementação física atual utiliza IDs textuais para compatibilidade com o modelo existente do MVP. A migração futura para UUID interno não deve remover os códigos funcionais.

## 7. IA

`ai_suggestions` registra:
- categoria;
- resumo;
- confiança simulada;
- causa possível;
- procedimento;
- evidências;
- conhecimento/chamado anterior encontrado;
- estado pending/approved/rejected;
- responsável pela validação;
- data da validação;
- indicação de edição.

Isso permite calcular indicadores sem inventar resultados.

## 8. Auditoria

`audit_events` deve registrar:
- ator;
- entidade;
- ação;
- estado anterior;
- estado posterior;
- data.

Prioridade inicial:
- aprovação/rejeição de IA;
- criação de conhecimento;
- mudança de status;
- alterações relevantes de chamados.

## 9. Diagrama ER textual

```
SOLUTION 1 ─── N VERSION
    |
    +── N DEMAND ─── N ACTIVITY
    |       |
    |       +── N REQUIREMENT
    |       |
    |       +── N TICKET
    |
    +── N REQUIREMENT
    |
    +── N TICKET

TICKET 1 ─── N AI_SUGGESTION
TICKET 1 ─── N KNOWLEDGE

PEOPLE 1 ─── N DEMAND / ACTIVITY / REQUIREMENT / TICKET
PEOPLE 1 ─── N AI_SUGGESTION / KNOWLEDGE / COMMENTS

ANY RECORD N ─── N ANY RECORD
             via RECORD_LINKS
```

## 10. Critério de aceite

O modelo está coerente quando é possível iniciar em uma demanda, chegar ao requisito e à versão, abrir um chamado, recuperar contexto, registrar a decisão humana e transformar o resultado aprovado em conhecimento reutilizável.
