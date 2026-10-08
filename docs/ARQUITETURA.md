# NEXUS — Arquitetura de Software

Resumo fiel de `docs/Nexus_Arquitetura.pdf` (Tauan, UCSal, ADS, out/2026). Em caso de dúvida, o PDF prevalece sobre este resumo; as **adaptações vigentes** abaixo prevalecem sobre o PDF.

> **Adaptações vigentes (decisões do autor):**
> - Execução em **localhost**, sem nuvem e sem contêineres por enquanto.
> - Banco **SQLite** temporariamente (o PDF prevê PostgreSQL + pgvector). Evitar recursos exclusivos de PostgreSQL até a migração.
> - Arquivos em `MEDIA_ROOT` local (o PDF prevê MinIO/S3).
> - Busca por similaridade calculada em Python sobre embeddings armazenados, enquanto não houver pgvector.
> - IA: **modelo real** será usado (provedor a definir) via porta `LLMProvider`; `fake_adapter` para testes e demonstração.
> - Tarefas longas: forma de execução **pendente** (fila simples vs. Celery + Redis). O contrato `202 + job_id` + polling é mantido em qualquer caso.
> - Anexos no MVP: somente texto (ata/transcrição; .txt decidido, .docx/.pdf a confirmar). Áudio/vídeo é evolução.
> - **Ordem das etapas** segue o fluxo do autor: levantamento → cenário → protótipo → solicitação → viabilidade/reunião/metodologia → requisitos/documento (no PDF, requisitos vêm logo após o levantamento).
> - Máquina de estados aplicada também ao documento de requisitos e à sugestão de suporte (proposta).
> - Módulo `planejamento` ganha Solicitacao, Viabilidade, Reuniao e Metodologia (proposta).
> - "Demanda" no PDF = "processo" do cliente na interface.

---

## 1. Visão geral
Aplicação web que apoia o ciclo de vida de uma demanda de tecnologia:
recebe a necessidade (transcrição de reunião ou **entrevista guiada em chat**) → estrutura o **levantamento** → gera **requisitos** com IA → **recomenda o cenário técnico** mais aderente → produz **protótipo estático** de telas → organiza o **plano de trabalho** conforme a metodologia → após a entrega, concentra os **chamados** abertos de dentro do produto construído.

Três características que determinam a arquitetura:
- **Operações longas** (transcrever, gerar requisitos) → fora do ciclo HTTP.
- **Resultado não determinístico e sujeito a revisão** → versionamento, estados explícitos, auditoria.
- **Dependência de serviço externo instável e tarifado** (LLM) → isolamento por interface.

## 2. Estilo: monólito modular em Django
Uma única aplicação Django, dividida em módulos (apps) por **contexto de negócio**, com fronteiras explícitas. Front-end Angular desacoplado consumindo API REST.
Descartados: monólito tradicional (regra espalhada) e microsserviços (custo operacional injustificável para TCC).

**Regra de fronteira:** um módulo **nunca importa models de outro** diretamente. Comunicação por **serviços expostos** do módulo de destino ou **eventos de domínio**.

## 3. ADRs
| ID | Decisão | Preterida | Consequência aceita |
|---|---|---|---|
| ADR01 | Monólito modular em Django | Microsserviços | Escala vertical; separação depende de disciplina |
| ADR02 | Angular desacoplado consumindo API REST | Templates Django | Dois projetos; CORS e auth por token |
| ADR03 | Toda chamada à IA é assíncrona (Celery + Redis) | Chamada síncrona na requisição | Complexidade de fila e estado de tarefa |
| ADR04 | Acesso ao LLM por porta `LLMProvider` com adaptadores | SDK direto no serviço | Uma indireção a mais; troca de provedor sem reescrita |
| ADR05 | Busca vetorial no PostgreSQL (pgvector) | Banco vetorial dedicado | Desempenho inferior em escala muito alta (irrelevante) |
| ADR06 | Auditoria em tabela append-only | Histórico por campos de data | Crescimento da tabela; rastreabilidade íntegra |
| ADR07 | Acompanhamento de tarefas por polling HTTP | WebSocket / SSE | Latência de segundos; infra muito mais simples |
| ADR08 | Regra de negócio em camada de domínio sem Django | Regra nos models | Mais arquivos; testes sem banco |

## 4. Containers (alvo do PDF)
| Container | Tecnologia | Responsabilidade |
|---|---|---|
| Nexus Web | Angular | UI, sessão, acompanhamento de tarefas, renderização do protótipo |
| Nexus API | Django + DRF | Auth, autorização, validação, regras síncronas, enfileiramento |
| Workers | Celery | Transcrição, levantamento/requisitos, pontuação de cenário, protótipo, indexação |
| Banco | PostgreSQL + pgvector | Relacional, versionamento, auditoria, índice vetorial |
| Fila/cache | Redis | Fila Celery, cache, rate limit |
| Object storage | MinIO (dev) / S3 (prod) | Transcrições, áudio, vídeo, anexos, protótipos |
| Provedor LLM | externo | Texto estruturado a partir do contexto |
| Transcrição | externo | Áudio/vídeo → texto |

API e workers = mesmo projeto Django, comandos diferentes.

## 5. Módulos (apps Django)
| App | Responsabilidade | Entidades |
|---|---|---|
| core | modelo-base (id, datas), exceções, paginação, auditoria, **máquina de estados comum** | EventoAuditoria |
| contas | usuários, perfis, permissões, atribuição de validadores | Usuario, Perfil, Atribuicao |
| demandas | registro e acompanhamento das necessidades | Demanda, Anexo |
| levantamento | processamento de transcrições e **entrevista guiada adaptativa** | FonteInformacao, SessaoEntrevista, Levantamento |
| requisitos | RF, RNF, regras, critérios de aceite, versionamento | Requisito, VersaoRequisito, Baseline |
| validacao | fila de aprovação, decisões, histórico de revisões | SolicitacaoValidacao, Decisao |
| cenario | extração de sinais e pontuação de aderência dos cenários técnicos | AnaliseCenario, Sinal, Recomendacao |
| prototipo | geração, versionamento e comentários do protótipo estático | Prototipo, Tela, Comentario |
| planejamento | metodologia escolhida e artefatos | PlanoTrabalho, ItemBacklog, Iteracao |
| produtos | soluções publicadas, versões, vínculo com projeto de origem | Produto, Versao, Publicacao |
| chamados | abertura, triagem assistida, atendimento, **conversão em nova demanda** | Chamado, Triagem, Atendimento |
| conhecimento | procedimentos validados, indexação vetorial, reuso | ItemConhecimento, Trecho, Embedding |
| ia | orquestração de chamadas ao modelo, prompts versionados, log | Job, PromptTemplate, LogIA |

## 6. Camadas internas de cada módulo
| Camada | Contém | Nunca contém |
|---|---|---|
| API | rotas, views DRF, serializers, permissões | regra de negócio, consulta complexa, chamada externa |
| Aplicação | casos de uso em `services/`, tarefas em `tasks.py`, transação | decisão de negócio do domínio; detalhes HTTP |
| Domínio | entidades, máquina de estados, políticas, pontuação de cenário, **portas** | qualquer import de Django/ORM/rede/SDK |
| Infraestrutura | models ORM, repositórios, adaptadores (LLM, transcrição, storage) | decisão de negócio; orquestração |

Aplicação é a única que fala com as outras três. Domínio define interfaces; infraestrutura implementa (inversão de dependência). Domínio testável sem banco, sem servidor, sem gastar API.

## 7. Estrutura de diretórios
### Back-end
```
backend/
├── config/  settings/{base,dev,prod}.py · urls.py (/api/v1/) · celery.py · asgi.py · wsgi.py
├── apps/    core contas demandas levantamento requisitos validacao cenario prototipo planejamento produtos chamados conhecimento ia
├── requirements/ base.txt dev.txt prod.txt
├── .env.example
└── manage.py
```
Módulo (ex.: requisitos):
```
apps/requisitos/
├── api/        urls.py views.py serializers.py (campos explícitos, nunca "__all__") permissions.py (por objeto)
├── services/   gerar_requisitos.py aprovar_requisito.py fechar_baseline.py
├── domain/     entities.py estados.py policies.py ports.py
├── models.py   repositories.py  tasks.py  admin.py  migrations/
└── tests/      test_dominio.py (sem banco) test_services.py test_api.py
```
### Front-end
```
frontend/src/app/
├── core/      auth/ (sessão, guard, renovação de token) http/ (interceptors: token, erro, correlação) config/
├── shared/    ui/ pipes/ models/ (tipos espelhando contratos da API)
├── features/  demandas levantamento requisitos validacao cenario prototipo planejamento produtos chamados conhecimento
│              (cada uma: pages/ components/ data/ — lazy loaded)
├── app.routes.ts  app.config.ts
└── environments/
```
Standalone components, lazy loading por feature, signals (sem lib de estado). Features espelham os módulos do back.

## 8. Máquina de estados comum (core) — "IA propõe, humano decide"
Aplica-se a levantamento, requisito, recomendação de cenário, protótipo e procedimento de conhecimento.

| Transição | Quem | Efeito registrado |
|---|---|---|
| geração → PROPOSTO | sistema (worker) | artefato com referência ao job, modelo e origem |
| PROPOSTO → EM_REVISAO | sistema, ao atribuir validador | responsável e prazo |
| EM_REVISAO → APROVADO | validador designado | evento com autor, data, versão aprovada |
| EM_REVISAO → EDITADO | validador designado | nova versão com autoria humana; anterior preservada |
| EM_REVISAO → REJEITADO | validador designado | **motivo obrigatório** |
| EDITADO → EM_REVISAO | autor da edição | reenvio |
| REJEITADO → PROPOSTO | sistema, nova geração | vinculada ao motivo da rejeição |
| APROVADO → OBSOLETO | sistema, ao aprovar versão posterior | encadeamento; baseline aponta para a vigente |

Métricas do TCC (aprovação sem edição, rejeição, motivos) = consultas sobre esses eventos. **Não existe transição automática para APROVADO.**

## 9. Processamento assíncrono — contrato da API
| Operação | Rota | Resposta |
|---|---|---|
| Solicitar geração | `POST /api/v1/demandas/{id}/requisitos/gerar` | `202` + `job_id` |
| Consultar situação | `GET /api/v1/jobs/{job_id}` | PENDENTE / EM_EXECUCAO / CONCLUIDO / FALHOU (+ %) |
| Obter resultado | `GET /api/v1/demandas/{id}/requisitos` | artefatos PROPOSTO com origem e confiança |
| Decidir validação | `POST /api/v1/requisitos/{id}/decisao` | artefato atualizado + evento de auditoria |

Front faz polling com intervalo crescente começando em 2s. Tarefas com máx. de tentativas, backoff e timeout. Falha registrada com mensagem tratada, nunca exceção bruta.

## 10. IA
- **Porta** `LLMProvider` (em `apps/ia/domain/ports.py`, sem framework):
  `gerar_estruturado(prompt, schema, contexto) -> ResultadoGeracao` e `embedding(texto) -> list[float]`.
- **Adaptadores** em `apps/ia/adapters/`: `openai_adapter.py`, `anthropic_adapter.py`, **`fake_adapter.py`** (resposta fixa; usado em testes e demonstração). Troca por configuração.
- **Respostas estruturadas:** sempre com esquema JSON; resposta validada antes de persistir; fora do formato = falha da tarefa (retry), nunca conteúdo válido.
- **RAG:** itens de conhecimento e artefatos aprovados fragmentados, vetorizados e indexados (pgvector); recupera fragmentos próximos da demanda antes de gerar.
- **LogIA:** modelo, versão, template de prompt, parâmetros, tokens, custo estimado, duração, artefato gerado.
- **Prompts versionados no banco**, não no código.

## 11. Persistência — convenções
- PK **UUID** em todas as entidades (não expor sequência).
- Modelo-base em core: id, criado_em, atualizado_em, autor da última alteração.
- Versionamento por encadeamento (versão referencia anterior; flag de vigente).
- **Exclusão lógica** para artefatos de projeto; física só para temporários.
- Auditoria **append-only** (sem update/delete pela aplicação).
- Arquivos fora do banco; banco guarda referência.

## 12. Segurança (OWASP API Top 10)
| Categoria | Risco | Controle |
|---|---|---|
| BOLA (objeto) | acessar demanda/requisito de projeto alheio | permissão por objeto; consultas filtradas pelo vínculo do usuário |
| Autenticação | roubo/reuso de token | JWT curto, refresh rotativo com revogação, invalidação no logout |
| Propriedade | editar campos indevidos (ex.: situação de validação) | serializers com campos explícitos e read-only; transição só por caso de uso |
| Consumo de recursos | abuso das rotas de IA | rate limit por usuário/projeto, cota de gerações por demanda, limite de upload |
| Função | solicitante executando ação de responsável técnico | permissão por perfil + políticas de domínio |
| Configuração | exposição em produção | settings por ambiente, segredos em env, DEBUG off, headers, CORS restrito |
| Inventário | rotas antigas sem controle | versionamento `/api/v1/`, OpenAPI |
| Consumo inseguro de serviço externo | resposta do modelo tratada como confiável | validação por schema, timeout, retries, falha = erro de tarefa |

- **LGPD:** anonimização (nomes, e-mails, telefones, identificadores) **antes** de enviar ao provedor; original fica na plataforma; registrado no log.
- **Auditoria:** toda decisão de validação, publicação de produto e alteração da base de conhecimento gera evento imutável (autor, data, ação, artefato, versão).

## 13. Requisitos não funcionais
| RNF | Requisito | Mecanismo |
|---|---|---|
| 01 | Autenticação e acesso por perfil | JWT + permissões por perfil e objeto (DRF) |
| 02 | Auditoria de aprovações/edições/rejeições | eventos append-only no core |
| 03 | IA sempre como sugestão | estado PROPOSTO; front identifica a origem visualmente |
| 04 | Interface responsiva | Angular responsivo |
| 05 | Proteção de dados em repouso/trânsito | HTTPS, segredos em env, acesso assinado a arquivos |
| 06 | Anonimização antes do modelo | rotina obrigatória no adaptador |
| 07 | Trocar provedor de IA sem reescrita | porta LLMProvider |
| 08 | Tempo de resposta; tarefas longas em 2º plano | fila; 202 + job |
| 09 | Nenhuma ação crítica automática | sem transição automática para APROVADO |
| 10 | Registro de modelo/versão/parâmetros | LogIA + prompts versionados |

## 14. Ambientes (PDF)
Serviços: web (Gunicorn), worker, beat, db (postgres+pgvector), redis, minio, front (Node+Nginx), nginx.
Perfis: **desenvolvimento** (reload, provedor falso), **homologação** (provedor real, dados fictícios), **demonstração** (banca, dados preparados dos casos de teste).

## 15. Testes
| Nível | Alvo | Característica |
|---|---|---|
| Domínio | máquina de estados, políticas, pontuação de cenário | sem banco/rede; maior cobertura |
| Serviços | casos de uso com banco de teste + provedor falso | transação, efeitos, eventos de auditoria |
| API | rotas DRF: auth, permissão, entrada/saída | inclui tentativa de acesso a objeto alheio |
| Integração IA | contrato do adaptador vs resposta gravada | sob demanda (custo) |
| Aceitação | casos CT01–CT10 da proposta | avaliação final, coleta de métricas |

## 16. Riscos
| Risco | Impacto | Mitigação |
|---|---|---|
| Provedor de IA indisponível na banca | Alto | provedor falso + resultados pré-gerados |
| Custo acima do previsto | Médio | cota, cache, provedor falso em dev, custo por execução |
| Vazamento da disciplina de módulos | Médio | convenção + análise estática na CI |
| Protótipo mais complexo que o estimado | Alto | segunda prioridade; conjunto fixo de componentes |
| Índice vetorial degradando | Baixo | índice adequado, reindexação |
| Escopo além do prazo | Alto | guiado pelo MVP; extras como trabalho futuro |

## 17. Evolução prevista
Extrair IA para serviço próprio · tempo real (ASGI) no lugar de polling · cache semântico · app móvel na mesma API · integrações com repositórios e gestão de tarefas via novos adaptadores.
