# NEXUS — Modelo de dados (proposta)

Base: `docs/ARQUITETURA.md` §5 e §11 + fluxo em `docs/FLUXO.md`.
**Status: proposta para revisão do back-senior e do PO antes da implementação.** Campos podem mudar; os princípios não.

## 1. Convenções

- PK `id` UUID em todas as entidades.
- `codigo` legível e estável para exibição/rastreabilidade (ex.: `DEM-012`/`PRC-001` — prefixo pendente —, `REQ-014`, `VER-120`, `CH-028`, `KB-007`).
- Modelo-base (`core`): `id`, `criado_em`, `atualizado_em`, `atualizado_por`.
- Artefatos da IA herdam o **mixin de artefato**: `estado` (PROPOSTO, EM_REVISAO, APROVADO, EDITADO, REJEITADO, OBSOLETO), `versao`, `versao_anterior` (FK para si), `vigente` (bool), `origem` (IA/humano), `job` (FK), `confianca`, `validador`, `motivo_rejeicao`.
- Exclusão lógica (`excluido_em`) para artefatos de projeto.
- Auditoria append-only.
- Um módulo não referencia models de outro por import; FKs entre módulos usam referência por string do app (`"demandas.Demanda"`) e o acesso a dados passa por serviços.
- Compatível com SQLite (sem `ArrayField`, sem lookups exclusivos de PostgreSQL).

## 2. Entidades por módulo

### core
| Entidade | Campos principais |
|---|---|
| EventoAuditoria | ator, acao, entidade_tipo, entidade_id, estado_anterior, estado_novo, versao, dados (JSON), criado_em — **sem update/delete** |
| VinculoRegistro | origem_tipo, origem_id, destino_tipo, destino_id, tipo_relacao (origina, implementado_em, afetado_por, originou, melhoria_de…) |

### contas
| Entidade | Campos principais |
|---|---|
| Usuario | (usuário Django) nome, e-mail, perfil |
| Perfil | CLIENTE, EQUIPE, SUPORTE, ADMIN — acumuláveis? pendente (`CLAUDE.md` §30 #16) |
| Atribuicao | usuario, tipo_artefato, escopo (processo) — quem valida o quê |

### demandas
| Entidade | Campos principais |
|---|---|
| Demanda (Processo) | codigo, nome, descricao, area, solicitante, contato, prioridade, prazo_desejado, tipo (NOVO, MELHORIA, DE_CHAMADO), processo_pai, produto_relacionado, estado (ver `FLUXO.md` §5) |
| Anexo | demanda, arquivo, nome_original, tipo_mime, tamanho, enviado_por |

### levantamento
| Entidade | Campos principais |
|---|---|
| FonteInformacao | demanda, tipo (TEXTO, ATA, TRANSCRICAO, REUNIAO_EQUIPE), conteudo_original, conteudo_anonimizado, anexo |
| SessaoEntrevista | demanda, estado (EM_ANDAMENTO, PAUSADA, CONCLUIDA), iniciada_em, concluida_em |
| Pergunta | sessao, ordem, enunciado, tipo (UNICA, MULTIPLA), opcoes (JSON: rótulo, valor), permite_outro, permite_nao_sei, gerada_por (IA/banco), job |
| Resposta | pergunta, opcoes_escolhidas (JSON), texto_outro, nao_sei, respondida_em, alterada_em |
| Levantamento *(artefato)* | demanda, resumo, objetivos, atores, restricoes, conteudo (JSON) |

### cenario
| Entidade | Campos principais |
|---|---|
| Sinal | demanda, chave, valor, peso, origem (resposta/fonte), origem_id |
| CenarioTecnico | nome (WEB, DESKTOP, MOBILE, JOB, API…), descricao, regras_pontuacao (JSON), ativo — mantido no ADM |
| AnaliseCenario | demanda, sinais_considerados (JSON), calculada_em |
| Recomendacao *(artefato)* | analise, cenario, pontuacao, justificativa, posicao, escolhido_pelo_cliente, escolhido_pela_equipe |

### prototipo
| Entidade | Campos principais |
|---|---|
| TemplateTela | nome, categoria (LOGIN, LISTAGEM, FORMULARIO, PAINEL, DETALHE, RELATORIO…), cenarios_aplicaveis, html_base, origem (ADM / gerado de protótipo), ativo — direção pendente (`CLAUDE.md` §30 #10) |
| Prototipo *(artefato)* | demanda, cenario, observacoes |
| Tela | prototipo, ordem, nome, template_origem, html (sanitizado), imagem |
| Comentario | tela, autor, texto, criado_em |

### validacao
| Entidade | Campos principais |
|---|---|
| SolicitacaoValidacao | artefato_tipo, artefato_id, validador, prazo, estado |
| Decisao | solicitacao, decisao (APROVAR, EDITAR, REJEITAR), motivo, versao_resultante, decidido_por, decidido_em |

### requisitos
| Entidade | Campos principais |
|---|---|
| Requisito *(artefato)* | demanda, codigo, tipo (RF, RNF, REGRA), titulo, descricao, prioridade, criterios_aceite (JSON) |
| Baseline | demanda, numero, requisitos (M2M versões aprovadas), fechada_em, fechada_por |
| DocumentoRequisitos *(artefato)* | demanda, baseline, versao, conteudo, arquivo_gerado |

### planejamento
*PDF: PlanoTrabalho, ItemBacklog, Iteracao. Adaptação proposta: Solicitacao, Viabilidade, Reuniao, Metodologia.*

| Entidade | Campos principais |
|---|---|
| Solicitacao | demanda, aberta_em, responsavel, estado |
| Viabilidade | solicitacao, resultado (POSSIVEL, INVIAVEL; COM_RESSALVAS proposta), justificativa, decidido_por, decidido_em |
| Reuniao | solicitacao, data_hora, participantes, pauta, ata (texto → pode virar FonteInformacao) |
| Metodologia | nome (SCRUM, KANBAN, CASCATA, HIBRIDA…), descricao, ativo — mantido no ADM |
| PlanoTrabalho | solicitacao, metodologia, data_inicio, data_previsao, responsavel |
| ItemBacklog | plano, requisito, titulo, estado, ordem |
| Iteracao | plano, numero, inicio, fim, objetivo |

### produtos
| Entidade | Campos principais |
|---|---|
| Produto | codigo, nome, demanda_origem, descricao |
| Versao | produto, numero (ex.: 1.2.0), publicada_em, baseline, notas |
| Publicacao | versao, publicada_por, publicada_em |

### chamados
| Entidade | Campos principais |
|---|---|
| Chamado | codigo, titulo, descricao, produto, versao, solicitante, responsavel, prioridade, estado, demanda_gerada |
| Triagem *(artefato)* | chamado, categoria, resumo, causa_possivel, procedimento, evidencias (JSON), fontes (JSON), conhecimento_encontrado |
| Atendimento | chamado, responsavel, observacao, criado_em |

### conhecimento
| Entidade | Campos principais |
|---|---|
| ItemConhecimento *(artefato)* | codigo, titulo, chamado_origem, produto, versao, procedimento, revisao, validado_por, validado_em, usos |
| Trecho | item, texto, embedding (JSON/bytes — sem pgvector por enquanto) |

### ia
| Entidade | Campos principais |
|---|---|
| Job | tipo, alvo_tipo, alvo_id, estado (PENDENTE, EM_EXECUCAO, CONCLUIDO, FALHOU), percentual, tentativas, erro_tratado, criado_em, concluido_em |
| PromptTemplate | chave, versao, texto, schema_json, ativo |
| LogIA | job, provedor, modelo, versao_modelo, prompt_template, parametros, tokens_entrada, tokens_saida, custo_estimado, duracao_ms, anonimizado (bool), artefato_tipo, artefato_id |

## 3. Relações principais

```
Usuario ──< Demanda >── Demanda (processo_pai: melhoria)
Demanda ──< FonteInformacao, Anexo
Demanda ──< SessaoEntrevista ──< Pergunta ──1 Resposta
Demanda ──< Sinal (cenario) ──▶ AnaliseCenario ──< Recomendacao ──▶ CenarioTecnico
Demanda ──< Prototipo ──< Tela ──< Comentario ;  Tela ──▶ TemplateTela
Demanda ──1 Solicitacao ──1 Viabilidade, ──< Reuniao, ──1 PlanoTrabalho ──▶ Metodologia
Demanda ──< Requisito ;  Baseline ──< Requisito (versões aprovadas) ;  DocumentoRequisitos ──▶ Baseline
Demanda ──< Produto ──< Versao ──▶ Baseline
Versao ──< Chamado ──< Triagem ;  Chamado ──▶ Demanda (conversão)
Chamado ──< ItemConhecimento ──< Trecho
Job ──< LogIA ;  qualquer artefato ──▶ Job
qualquer registro ──< VinculoRegistro >── qualquer registro
qualquer mudança relevante ──▶ EventoAuditoria
```

## 4. Regras de integridade

1. Versão pertence a um produto; produto aponta para o processo de origem.
2. Documento de requisitos só referencia baseline fechada, e baseline só contém versões APROVADAS.
3. Rejeição exige motivo.
4. Não existe transição automática para APROVADO.
5. Conhecimento originado de suporte aponta para o chamado de origem e exige validação humana.
6. Chamado não é concluído sem a validação prevista.
7. Viabilidade INVIAVEL exige justificativa e encerra o processo.
8. Processo de melhoria referencia o processo pai ou o produto.
9. Cliente só acessa os próprios processos (filtro por vínculo, não só por ID).
10. Estados respeitam as transições permitidas por entidade.
11. Eventos de auditoria nunca são alterados nem excluídos.
12. Indicadores nunca usam IDs de demonstração fixos.
