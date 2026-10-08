# NEXUS — ESPECIFICAÇÃO MESTRA E GUIA DE IMPLEMENTAÇÃO PARA CLAUDE

> **Documento único de referência do projeto.**
> Claude e os agentes do time devem ler este arquivo antes de modificar o sistema e manter o projeto coerente com ele.
> Versão 2 (2026-10-07): escopo ampliado para o ciclo completo — do levantamento guiado da necessidade até o suporte pós-entrega.
> Arquitetura de referência: `docs/Nexus_Arquitetura.pdf` (resumo em `docs/ARQUITETURA.md`). Este arquivo registra as adaptações vigentes.

> **ESTADO ATUAL: FRONTEND COM BACKEND SIMULADO.** O Angular navega como se estivesse conectado à API (`/api/v1` respondido por `core/api/mock-backend.interceptor.ts`). Backend Django ainda não é usado. Ver §31.

---

## 1. IDENTIDADE DO PROJETO

**Nome:** NEXUS
**Nome técnico/repositório:** nexus-ia
**Repositório oficial:** DanNves/nexus-ia
**Natureza:** Trabalho de Conclusão de Curso — Análise e Desenvolvimento de Sistemas (UCSal). Autor: Tauan.
**Título de trabalho:** NEXUS — Plataforma inteligente de apoio ao levantamento, especificação, prototipação e suporte pós-entrega de soluções de software.

### Conceito

O NEXUS acompanha uma necessidade de software do começo ao fim. O cliente descreve o que precisa (texto ou ata/transcrição de reunião); o sistema conduz uma **entrevista guiada** com perguntas simples de múltipla escolha; recomenda o **tipo de solução** (web, desktop, job…); gera um **protótipo** de telas; encaminha a **solicitação** para a equipe responsável; produz o **documento de requisitos**; e, depois da entrega, usa todo esse contexto para apoiar o **suporte** e formar uma **base de conhecimento**.

Fluxo central:

**PROCESSO → NECESSIDADE → ENTREVISTA GUIADA → CENÁRIO → PROTÓTIPO → SOLICITAÇÃO → VIABILIDADE/REUNIÃO/METODOLOGIA → REQUISITOS → PRODUTO/VERSÃO → CHAMADO → CONTEXTO → IA SUGERE → HUMANO VALIDA → CONHECIMENTO**

A IA não é autônoma. Ela propõe; uma pessoa decide.

---

## 2. RECORTE DO TCC

### Problema (registrado)

Dificuldade de preservar, recuperar e utilizar de forma organizada o contexto produzido durante o desenvolvimento de uma solução de software no atendimento de chamados de suporte.

### Pergunta de pesquisa (registrada)

Como uma plataforma que preserva e recupera o contexto produzido durante o desenvolvimento de uma solução de software pode auxiliar o atendimento de chamados de suporte por meio de IA generativa com validação humana?

### Objetivo geral (registrado)

Desenvolver e avaliar uma plataforma web que preserve e disponibilize o contexto produzido durante o desenvolvimento de soluções de software para apoiar o atendimento de chamados de suporte, utilizando IA generativa para auxiliar na análise e sugestão de soluções, sempre com validação humana.

### Objetivos específicos (registrados)

1. Registrar demanda e requisitos, mantendo relação entre informações produzidas na especificação.
2. Relacionar requisitos, versões e informações relevantes aos chamados.
3. Implementar recuperação de contexto para apresentar informações relacionadas ao chamado.
4. Usar IA generativa para auxiliar classificação, análise, possíveis causas e procedimentos/soluções, sem retirar a decisão final do profissional.
5. Transformar soluções validadas em conhecimento reutilizável e avaliar a contribuição por meio de casos controlados e indicadores de tempo, utilidade, aceitação, edição, rejeição e reuso.

> **Pendente (autor) — §30 #5.** O texto acadêmico acima é o registrado e **não deve ser alterado sem o autor**. Com a ampliação do escopo, ele pode precisar de revisão. Proposta de redação (não adotada):
> - *Objetivo geral:* desenvolver e avaliar uma plataforma web que apoie, com IA generativa e validação humana, o levantamento da necessidade, a especificação, a prototipação e o suporte pós-entrega de soluções de software, preservando o contexto entre as etapas.
> - *Específicos adicionais:* conduzir entrevista guiada para completar a necessidade; recomendar o cenário técnico; gerar protótipo de telas; encaminhar a solicitação à equipe e gerar o documento de requisitos.

---

## 3. REGRA FUNDAMENTAL DO PRODUTO

**IA PROPÕE → HUMANO VALIDA → SISTEMA CONSOLIDA**

Vale para **todo** conteúdo produzido com IA, em dois níveis:
- **Perguntas da entrevista:** não passam pela máquina de estados — a resposta do cliente já é a ação humana sobre elas. *(Alternativa pendente, §30: perguntas vindas de um banco validado no ADM.)*
- **Artefatos** (levantamento, recomendação de cenário, protótipo, requisitos, documento de requisitos, sugestão de suporte, procedimento de conhecimento): seguem a máquina de estados (§6). Antes da solicitação, o cliente vê cenário e protótipo em estado PROPOSTO, marcados como **"sugestão ainda não validada"**; a validação formal é da equipe, depois da solicitação (§5.7).

A IA não pode:
- aprovar artefato (não existe transição automática para APROVADO);
- fechar chamado;
- confirmar diagnóstico como fato;
- decidir viabilidade, metodologia ou prazo;
- executar comandos, alterar infraestrutura ou banco;
- publicar conhecimento ou enviar documento ao cliente sem validação;
- receber dados pessoais sem anonimização (§19).

Toda tela com conteúdo gerado deve indicar visualmente que é **sugestão da IA** e quem valida.

---

## 4. ESCOPO DO MVP

### Deve existir

**Levantamento e especificação (lado do cliente)**
- Iniciar processo (nome, descrição breve, dados básicos)
- Informar a necessidade: digitar e/ou anexar ata/transcrição **em texto** (.txt decidido; .docx/.pdf *(proposta — a confirmar)*)
- Entrevista guiada adaptativa com perguntas de múltipla escolha
- Recomendação de cenário técnico
- Protótipo: telas geradas (relação com os templates do ADM pendente, §30) + protótipo em HTML puro ou imagem (pendente, §30)
- Encerramento: stand-by ou abrir solicitação
- Documento de requisitos para o cliente
- Novo processo de melhoria/adição vinculado ao original

**Equipe responsável**
- Fila de solicitações
- Viabilidade: marcar se é possível (valores e justificativa *(proposta — a confirmar)*)
- Agendamento de reunião de validação de regras
- Definição de metodologia e datas
- Validação dos artefatos gerados (aprovar / editar / rejeitar com motivo)

**Administração (ADM)**
- Templates de telas
- Catálogo de cenários técnicos *(proposta — a confirmar)*
- Metodologias disponíveis *(proposta — a confirmar)*
- Usuários e perfis
- Templates de prompt versionados e log de execuções da IA

**Pós-entrega**
- Produtos e versões
- Chamados com recuperação de contexto e sugestão da IA
- Base de conhecimento validada
- Conversão de chamado em novo processo

**Transversal**
- Painel (dashboard), busca global, notificações, comentários, rastreabilidade entre registros, auditoria, indicadores, configurações.

### Fora do escopo do MVP

- Upload de áudio/vídeo com transcrição automática (evolução);
- geração do código da aplicação do cliente;
- execução autônoma de comandos ou automação de infraestrutura/banco;
- banco ou serviços em nuvem; o projeto roda em **localhost**;
- aplicativo mobile do NEXUS;
- dezenas de integrações externas;
- autenticação empresarial complexa (SSO, AD).

---

## 5. FLUXO DO CLIENTE (DETALHADO)

### 5.1 Iniciar processo
Campos decididos: nome do projeto e descrição breve. Demais *(proposta — a confirmar)*: área/setor, solicitante, contato, prioridade desejada, prazo desejado. Tipo do processo: **novo**, **melhoria/adição** (vinculado a um processo ou produto existente) ou **originado de chamado**.

### 5.2 Informar a necessidade
Uma ou mais fontes, todas preservadas como **FonteInformacao**:
- texto digitado ("descreva o problema / o que você precisa");
- arquivo de ata ou transcrição em texto (.txt decidido; .docx/.pdf *(proposta — a confirmar)*), com limite de tamanho.

O conteúdo original fica na plataforma; o que vai para a IA é a versão anonimizada (§19).

### 5.3 Entrevista guiada
**Decidido (autor):**
- **Inúmeras** perguntas **simples e fáceis**, para entender exatamente o que se encaixa na solução.
- Normalmente **3 ou mais opções** (1, 2, 3…) **ou "Outro"**.

**Detalhamento *(proposta — a confirmar)*:**
- uma pergunta por vez, em linguagem não técnica;
- opção "Não sei";
- escolha única ou múltipla;
- próximas perguntas se adaptam às respostas e ao que já está na necessidade;
- cada resposta gera **sinais** (ex.: "precisa funcionar offline", "uso em celular", "processamento noturno") usados no cenário;
- encerramento por suficiência de informação ou limite de perguntas;
- pausar/retomar e revisar respostas antes de concluir.

Exemplo:
> Quem vai usar o sistema no dia a dia?
> 1) Só eu  2) Uma equipe interna  3) Clientes externos  4) Outro: ___  5) Não sei

### 5.4 Cenário técnico
A partir dos sinais, o sistema recomenda o tipo de solução: **aplicação web, software desktop, aplicativo mobile, job/rotina agendada, API/integração** ou outro do catálogo do ADM.
- A **pontuação de aderência** de cada cenário é calculada na camada de domínio, de forma determinística, a partir dos sinais (a IA extrai sinais; a regra pontua).
- Mostrar ranking, justificativa e sinais que pesaram.
- É uma **recomendação**. Quem decide o cenário final (cliente, equipe ou ambos) está pendente (§30).
- Catálogo de cenários e pontuação por sinais: *(proposta — a confirmar)*.

### 5.5 Protótipo
**Decidido (autor):** o sistema gera algumas **telas** — "templates que serão inseridos no ADM como exemplo para adaptar ao sistema" — e algumas **imagens (ou HTML puro)** de protótipo de como seria a aplicação do cliente.

**Pendente (§30):**
- direção dos templates: (a) ADM mantém catálogo → sistema seleciona e adapta; (b) telas geradas → são inseridas no ADM como template; (c) ambos;
- formato: só HTML puro · imagem renderizada a partir do HTML · imagem gerada por IA.

**Regras de segurança (decididas):** HTML sem scripts, sanitizado, renderizado em `iframe sandbox` (§19). Versionado.
**Detalhamento *(proposta — a confirmar)*:** comentários por tela.

### 5.6 Encerramento do levantamento
O cliente escolhe:
- **Stand-by** — o processo fica guardado e pode ser retomado;
- **Abrir solicitação** — o processo vai para a fila da equipe responsável.

### 5.7 Equipe responsável
Sobre a solicitação:
1. **Viabilidade:** marcar se é possível. *(Valores — ex.: possível / com ressalvas / inviável — e justificativa obrigatória: proposta.)*
2. **Reunião:** marcar reunião para validar as regras. *(Data/hora, participantes, pauta e ata virando nova FonteInformacao: proposta.)*
3. **Metodologia e quando:** definir a metodologia e quando será feito. *(Catálogo Scrum/Kanban/Cascata/Híbrida no ADM: proposta.)*
4. **Validar artefatos:** levantamento, cenário, protótipo e requisitos passam pela máquina de estados (§6).

### 5.8 Documento de requisitos
Gerado **somente a partir de artefatos aprovados** (baseline vigente). Conteúdo mínimo:
- visão geral do projeto e objetivo;
- cenário técnico escolhido e justificativa;
- requisitos funcionais e não funcionais;
- regras de negócio e critérios de aceite;
- protótipo (telas);
- metodologia, datas e responsáveis;
- pendências e premissas;
- histórico de versões do documento.

Formato de saída: **pendente** (HTML imprimível / PDF / DOCX).

### 5.9 Evolução
Futuramente ou durante o processo, **a depender da metodologia**, o cliente pode abrir **novo processo** para solicitar **adição/melhorias**, vinculado ao original e herdando o contexto. Como a metodologia afeta esse momento está pendente (§30). Um chamado também pode ser convertido em novo processo *(proposta — a confirmar)*.

### 5.10 Estados do processo (proposta)
Ver diagrama único em `docs/FLUXO.md` §5 (proposta). A validar pelo PO e pelo back-senior antes da implementação (§30 #7).

---

## 6. MÁQUINA DE ESTADOS DOS ARTEFATOS DA IA

Implementada **uma vez** no módulo `core`. O PDF a aplica a levantamento, requisito, recomendação de cenário, protótipo e procedimento de conhecimento. **Adaptação proposta:** aplicar também ao documento de requisitos e à sugestão de suporte (Triagem). Quem aprova uma versão EDITADA (o próprio validador ou outro) está pendente (§30).

| Transição | Quem | Registro |
|---|---|---|
| geração → PROPOSTO | sistema | job, modelo, prompt, origem da informação |
| PROPOSTO → EM_REVISAO | sistema, ao atribuir validador | responsável, prazo |
| EM_REVISAO → APROVADO | validador designado | autor, data, versão aprovada |
| EM_REVISAO → EDITADO | validador designado | nova versão com autoria humana; anterior preservada |
| EM_REVISAO → REJEITADO | validador designado | **motivo obrigatório** |
| EDITADO → EM_REVISAO | autor da edição | reenvio |
| REJEITADO → PROPOSTO | sistema, nova geração | vínculo com o motivo da rejeição |
| APROVADO → OBSOLETO | sistema, ao aprovar versão posterior | encadeamento de versões |

Não existe transição automática para APROVADO. As métricas do TCC (aprovação sem edição, edição, rejeição, motivos) são consultas sobre esses eventos.

---

## 7. MÓDULOS E MODELO CONCEITUAL

Apps Django por contexto de negócio (nomes do documento de arquitetura):

| Módulo | Responsabilidade | Entidades principais |
|---|---|---|
| core | modelo-base, exceções, paginação, auditoria, máquina de estados | EventoAuditoria |
| contas | usuários, perfis, permissões, atribuição de validadores | Usuario, Perfil, Atribuicao |
| demandas | o **processo** do cliente (nome, descrição, tipo, estado, vínculo pai) | Demanda, Anexo |
| levantamento | fontes, entrevista guiada, levantamento consolidado | FonteInformacao, SessaoEntrevista, Pergunta, Resposta, Levantamento |
| cenario | extração de sinais, catálogo, pontuação e recomendação | Sinal, CenarioTecnico, AnaliseCenario, Recomendacao |
| prototipo | templates, protótipos, telas, comentários | TemplateTela, Prototipo, Tela, Comentario |
| validacao | fila de aprovação e decisões | SolicitacaoValidacao, Decisao |
| requisitos | RF, RNF, regras, critérios, versões, baseline, documento | Requisito, VersaoRequisito, Baseline, DocumentoRequisitos |
| planejamento | solicitação à equipe, viabilidade, reunião, metodologia, plano | PlanoTrabalho, ItemBacklog, Iteracao *(PDF)* + Solicitacao, Viabilidade, Reuniao, Metodologia *(adaptação proposta)* |
| produtos | soluções publicadas, versões, vínculo com o processo de origem | Produto, Versao, Publicacao |
| chamados | abertura, triagem assistida, atendimento, conversão em processo | Chamado, Triagem, Atendimento |
| conhecimento | procedimentos validados e reuso | ItemConhecimento, Trecho |
| ia | jobs, prompts versionados, log de execuções, porta LLMProvider | Job, PromptTemplate, LogIA |

> **Pendente (§30 #3):** nome exibido ao usuário — "Processo" ou "Projeto" — e prefixo do código (`PRC-` ou `DEM-`). No código, a entidade segue `Demanda` (documento de arquitetura); "nova demanda" no PDF = "novo processo" aqui.

Relações transversais: `record_links` / vínculos explícitos entre registros de tipos diferentes (ex.: Demanda → Requisito → Versão → Chamado → Conhecimento). Rastreabilidade nunca depende de texto do título.

Detalhamento de campos: `docs/MODELO_DADOS.md`.

---

## 8. ARQUITETURA (VIGENTE)

Referência completa: `docs/ARQUITETURA.md` (resumo do PDF). Adaptações vigentes:

| Tema | Documento de arquitetura | Vigente no projeto |
|---|---|---|
| Execução | contêineres (web, worker, db, redis, minio, nginx) | **localhost**, sem Docker |
| Banco | PostgreSQL + pgvector | **SQLite** (temporário); evitar recursos exclusivos de PostgreSQL |
| Arquivos | MinIO / S3 | `MEDIA_ROOT` local |
| Tarefas longas | Celery + Redis | **pendente** (§30 #2) — o contrato 202 + job é mantido de qualquer forma |
| Busca vetorial | pgvector | similaridade calculada em Python sobre embeddings armazenados (volume pequeno); pgvector quando migrar |
| IA | porta LLMProvider + adaptadores | igual; **modelo real** será usado, provedor pendente; `fake_adapter` para testes e demonstração |
| Ordem das etapas | levantamento → requisitos → cenário → protótipo → plano | levantamento → cenário → protótipo → solicitação → viabilidade/reunião/metodologia → requisitos/documento (fluxo do autor). Se o cliente vê requisitos antes da solicitação: pendente (§30) |

### Estilo
**Monólito modular em Django** + **Angular** desacoplado consumindo **API REST** (`/api/v1/`, DRF, OpenAPI).
Regra de fronteira: um módulo **nunca importa models de outro**; usa serviços expostos ou eventos de domínio.

### Camadas de cada módulo
| Camada | Contém | Nunca contém |
|---|---|---|
| API | views DRF, serializers (campos explícitos, nunca `__all__`), permissões por objeto | regra de negócio, consulta complexa, chamada externa |
| Aplicação (`services/`, `tasks.py`) | casos de uso, transação | decisão de negócio do domínio; detalhes HTTP |
| Domínio (`domain/`) | entidades, estados, políticas, pontuação de cenário, portas | qualquer import de Django/ORM/rede/SDK |
| Infraestrutura | models, repositórios, adaptadores (LLM, arquivos) | decisão de negócio |

### Estrutura do repositório
```
nexus-ia/
├── frontend/   Angular (standalone, Signals, Router, TypeScript strict)
│   └── src/app/{core, shared, features/<modulo>}   ← alvo; hoje: pages/, services/, shared/
├── backend/    Django
│   ├── config/settings/{base,dev}.py               ← alvo; hoje: config/settings.py
│   ├── apps/<modulo>/{api, services, domain, models.py, repositories.py, tasks.py, tests}
│   └── requirements/, .env.example, manage.py
├── docs/       documentação oficial
└── CLAUDE.md, AGENTS.md, README.md
```

### Contrato de operação longa
| Operação | Rota | Resposta |
|---|---|---|
| Solicitar geração | `POST /api/v1/<recurso>/{id}/<artefato>/gerar` | `202` + `job_id` |
| Consultar job | `GET /api/v1/jobs/{job_id}` | PENDENTE / EM_EXECUCAO / CONCLUIDO / FALHOU (+ %) |
| Obter resultado | `GET /api/v1/<recurso>/{id}/<artefato>` | artefatos PROPOSTO com origem e confiança |
| Decidir | `POST /api/v1/<artefato>/{id}/decisao` | artefato atualizado + evento de auditoria |

Front faz polling com intervalo crescente a partir de 2 s. Falhas são registradas com mensagem tratada, nunca exceção bruta.

### Como rodar (localhost)
- Front: `cd frontend && npm start` → http://localhost:4200
- Back: `cd backend && venv\Scripts\activate && python manage.py runserver` → http://localhost:8000

---

## 9. ROTAS DO FRONTEND

**Implementadas (2026-10-07):**

```
/visao-geral
/demandas                      abas Demandas | Atividades (?aba=atividades, quadro ou lista)
/demandas/nova                 sobre a demanda → necessidade/ata (.txt) → entrevista
/demandas/:id[/:aba]           abas: resumo | levantamento | prototipo | solicitacao | requisitos | documento
/calendario                    mês + agenda do dia + novo compromisso
/solucoes, /solucoes/:id       versões, demanda de origem, chamados
/fila, /fila/:id               posição na fila (cliente), fila ordenada e atendimento com IA (equipe)
**                             página não encontrada
```

Visão por perfil: menu do usuário → "Ver o NEXUS como Cliente / Equipe responsável" (simulação; no backend real vem do JWT).

Proposta original do novo escopo (referência para itens ainda não implementados, como validações, indicadores e ADM):

```
/painel
/processos                     lista + "Novo processo"
/processos/novo                iniciar processo (wizard)
/processos/:id                 visão do processo (linha do tempo das etapas)
/processos/:id/necessidade     texto + anexos
/processos/:id/entrevista      entrevista guiada
/processos/:id/cenario         recomendação de cenário
/processos/:id/prototipo       protótipo
/processos/:id/solicitacao     stand-by / solicitação e acompanhamento da equipe
/processos/:id/requisitos      requisitos
/processos/:id/documento       documento de requisitos
/solicitacoes                  fila da equipe (viabilidade, reunião, metodologia)
/validacoes                    fila de artefatos em revisão
/produtos                      produtos e versões
/chamados
/conhecimento
/indicadores
/adm                           templates de tela, cenários, metodologias, usuários, prompts, log da IA
/configuracoes
```

Regra permanente: cada rota abre uma tela real; nunca criar link visual sem rota.

---

## 10. NAVEGAÇÃO — CONTRATO VISUAL

A navbar principal deve ser **horizontal, limpa e contínua**.

### NÃO usar
- uma caixa cinza para cada grupo;
- cada item parecendo um botão;
- vários cartões encaixados;
- excesso de bordas;
- aparência de template administrativo genérico;
- menus que parecem abas independentes sem hierarquia.

### USAR
Marca NEXUS à esquerda; itens principais ao centro; à direita: **Novo processo | Busca | Notificações | Usuário**.
Itens principais (implementado): **Visão geral | Demandas | Calendário | Soluções | Fila**. Busca (Ctrl K), notificações, **Nova demanda** e menu do usuário à direita. Indicadores, ADM e Configurações: ainda não implementados.
Os itens visíveis dependem do perfil (cliente não vê Solicitações/Validações/ADM). Toda rota deve ter acesso pela navegação do perfil que a usa.

Item atual: texto azul, fundo azul muito suave, linha inferior azul, ícone azul.
Itens não ativos: fundo transparente, texto azul/cinza, sem borda, sem caixa individual.
Separadores verticais muito discretos são aceitáveis.

### Mobile
Esconder a navegação horizontal; botão de menu; painel organizado por seções; opções grandes para toque; rota ativa destacada.

---

## 11. NAVEGAÇÃO INTERNA

Dentro de um processo, as etapas aparecem como barra secundária / linha do tempo:

**Necessidade | Entrevista | Cenário | Protótipo | Solicitação | Requisitos | Documento**

Mostra o estado de cada etapa (não iniciada, em andamento, aguardando validação, aprovada). Não transformar cada etapa em cartão. Item atual: texto azul, fundo azul muito suave, linha inferior.

---

## 12. PADRÃO VISUAL

### Identidade
Profissional, corporativo, moderno, limpo, orientado a software, confiável, acadêmico/profissional.
Evitar: aparência futurista, "IA genérica", neon, excesso de gradientes, sombras, cards e arredondamentos.
A entrevista guiada deve parecer uma **conversa simples e humana**, não um formulário burocrático nem um chatbot genérico.

### Paleta base
- Navy: #020A1D
- Azul principal: #0878FF
- Fundo: #F5F8FC
- Borda: #E1E8F0
- Texto: #1F3550
- Texto secundário: #718198
- Verde: #159B70
- Laranja: #C27A16
- Roxo: #7355C8

### Hierarquia
Título da página > título da seção > título do registro > texto auxiliar. Texto auxiliar nunca maior que títulos.

### Componentes
Um único componente oficial por tipo (um select, um botão, um drawer…). Catálogo mantido pelo front-techlead.

---

## 13. PAINEL (DASHBOARD)

Deve responder rapidamente, conforme o perfil:
- **Cliente:** meus processos e em que etapa estão; o que espera minha ação; documentos disponíveis.
- **Equipe:** solicitações novas; validações pendentes; reuniões agendadas; processos em desenvolvimento.
- **Suporte:** chamados abertos; sugestões aguardando validação; conhecimentos recentes.
Fluxo resumido do NEXUS visível; cada item abre seu registro.

---

## 14. PÓS-ENTREGA — PRODUTOS E VERSÕES

Produto = solução entregue a partir de um processo. Versão = o que foi publicado. A versão é a ponte entre desenvolvimento e suporte: guarda o vínculo com o processo, os requisitos da baseline e o protótipo aprovados.

---

## 15. CHAMADOS

Cada chamado mostra: problema, produto, versão, solicitante, responsável, prioridade, processo/requisitos de origem, chamados anteriores e conhecimento relacionado.

Dentro do chamado, bloco **APOIO DA IA** com: fontes recuperadas (abríveis), possível causa, procedimento sugerido, evidências, validação humana.
Ações: **Rejeitar e revisar** | **Aprovar sugestão** → depois: **Registrar conhecimento**. Um chamado pode ser **convertido em novo processo**.

Regras:
1. recuperar o contexto: processo, levantamento, requisitos, protótipo, produto/versão, chamados relacionados, conhecimento validado;
2. quando houver conhecimento compatível, anexar a referência e recuperar o procedimento;
3. quando não houver, deixar explícito;
4. exigir validação humana; registrar responsável, data/hora, decisão e observação;
5. rejeição devolve o chamado para análise;
6. chamado não pode ser concluído sem a validação prevista;
7. a IA nunca transforma hipótese em diagnóstico confirmado.

---

## 16. RECUPERAÇÃO DE CONTEXTO

Atravessa o ciclo inteiro. Para um chamado (ou para uma nova geração), procurar: o próprio registro, vínculos explícitos, processo de origem e processos de melhoria, fontes de informação, levantamento, requisitos aprovados, protótipo, produto/versão, chamados relacionados, conhecimento validado e registros do mesmo produto/versão.
Apresentar de forma compreensível — não basta "X fontes"; o usuário abre cada fonte.

---

## 17. CONHECIMENTO

Só se torna oficial após validação humana. Fluxo: **Chamado → Validação humana → Conhecimento → Reuso**.
Detalhe: origem, chamado, produto, versão, revisão, validado por/em, procedimento validado, contexto de origem, relacionamentos, número de usos.

---

## 18. INDICADORES

Derivados dos dados, nunca inventados:
- processos por etapa; tempo médio por etapa; stand-by vs. solicitados; viáveis vs. inviáveis;
- artefatos aprovados sem edição, editados, rejeitados (e motivos), por tipo;
- chamados abertos; validações pendentes; conhecimentos validados; reuso;
- custo/tokens da IA por processo (LogIA) *(proposta — a confirmar)*.
Avaliação experimental (casos CT01–CT10 da proposta) é feita à parte. **Não inventar resultados.**

---

## 19. IA, SEGURANÇA E PRIVACIDADE

### IA
- Acesso ao modelo **somente** pela porta `LLMProvider` (`apps/ia/domain/ports.py`): `gerar_estruturado(prompt, schema, contexto)` e `embedding(texto)`.
- Adaptadores em `apps/ia/adapters/`: provedor real (a definir) e `fake_adapter` (resposta fixa — testes e demonstração sem internet).
- Toda geração usa **esquema JSON**; resposta validada antes de persistir; fora do formato = falha da tarefa.
- **Prompts versionados no banco** (PromptTemplate); cada execução grava **LogIA** (modelo, versão, prompt, parâmetros, tokens, custo, duração, artefato).
- Cota de gerações por processo e limite de requisições por usuário (documento de arquitetura; valores *(proposta — a confirmar)*).
- Nunca afirmar na interface que algo foi decidido pela IA.

### Privacidade (LGPD)
Antes de qualquer envio ao provedor, anonimizar nomes, e-mails, telefones e identificadores pessoais. O original fica na plataforma; o envio anonimizado é registrado no log.

### Segurança (OWASP API Top 10)
- Permissão **por objeto** em todas as rotas; consultas filtradas pelo vínculo do usuário (cliente só vê os próprios processos).
- JWT de curta duração com renovação rotativa e revogação no logout.
- Serializers com campos explícitos e read-only; mudança de estado só por caso de uso.
- Segredos em `.env` (nunca no código nem no Angular); `DEBUG` desligado fora de dev; CORS restrito a `localhost:4200`.
- Upload: somente tipos de texto permitidos (.txt; .docx/.pdf se confirmados), limite de tamanho, nome de arquivo sanitizado.
- Protótipo HTML gerado: renderizar em `iframe sandbox` sem scripts; sanitizar antes de salvar.
- Nunca SQL concatenado com dados do usuário.
- Auditoria **append-only**: decisões de validação, viabilidade, publicação de versão, alterações na base de conhecimento.

### Persistência — convenções
PK UUID; código legível estável para exibição (ex.: `DEM-012`/`PRC-001` — prefixo pendente —, `REQ-014`, `CH-028`, `KB-007`); modelo-base com datas e autor; versionamento por encadeamento; exclusão lógica para artefatos de projeto.

---

## 20. CONFIGURAÇÕES E ADM

**Configurações** deixam explícitas as regras: validação humana obrigatória, IA como apoio, provedor de IA ativo (real/falso), notificações, limites do MVP, e a ação **restaurar dados de demonstração** (restaura seeds, limpa rascunhos, informa por toast).

**ADM** mantém: usuários/perfis, templates de prompt, log da IA e, *(proposta, ver §30 #10)*, templates de telas, catálogo de cenários e pesos, metodologias. Não criar configurações sem função real.

---

## 21. DETALHE / DRAWER

Ao clicar em qualquer registro: abrir detalhe sem perder a página atual; permitir fechar; mostrar contexto, relacionamentos, envolvidos, comentários e ações adequadas ao tipo e ao perfil. Conteúdo gerado por IA sempre com o estado de validação visível.

---

## 22. DADOS DE DEMONSTRAÇÃO

Fictícios e coerentes. O cenário de demonstração deve cobrir o fluxo inteiro: um processo com necessidade, entrevista respondida, cenário recomendado, protótipo, solicitação viável com reunião e metodologia, documento de requisitos, produto/versão publicado, chamado com sugestão validada e conhecimento gerado.

Registros do MVP anterior que podem ser reaproveitados no pós-entrega: DEM-012 (2FA), REQ-014 (recuperação de senha), VER-120 (Portal de Atendimento v1.2.0), CH-028 (falha na autenticação), KB-007 (falha de autenticação na v1.2.0). Trilha: **DEM-012 → REQ-014 → VER-120 → CH-028 → KB-007**.

> **Pendente:** definir o cenário de demonstração completo (processo de exemplo) com o PO.

---

## 23. REGRA PARA NOVAS IMPLEMENTAÇÕES

Antes de criar qualquer funcionalidade:
1. verificar se pertence ao escopo (§4);
2. verificar se já existe algo equivalente;
3. verificar modelo, serviço, rota, template, CSS;
4. verificar impacto na rastreabilidade e na máquina de estados;
5. verificar permissões por perfil;
6. verificar responsividade;
7. verificar se a ação realmente funciona.

Não criar somente aparência.

---

## 24. REGRA PARA NAVEGAÇÃO

Toda navegação funciona de verdade. Não usar botões que só parecem links. Não usar navegação falsa.

---

## 25. REGRA PARA CSS

- Não acumular overrides indefinidamente; consolidar ao alterar uma área.
- Procurar regras duplicadas.
- Evitar `!important` e `100vh` (o quality gate bloqueia).
- Evitar estilos específicos que quebram outras telas.
- Breakpoints: desktop, 1280px, 1120px, 980px, 760px, 520px.

---

## 26. VALIDAÇÃO TÉCNICA

Front (`frontend/`): `npm ci`, `npm run check`, `npm run build`.
Back (`backend/`): `python manage.py check`, `python manage.py makemigrations --check`, `python manage.py test`.
GitHub Actions executa o build do front. Build e testes passando são requisito de aceite.

Testes por nível (documento de arquitetura): domínio (sem banco), serviços (banco de teste + fake_adapter), API (auth, permissão, acesso a objeto alheio), integração com IA (sob demanda), aceitação (CT01–CT10).

---

## 27. HISTÓRICO

- O projeto foi migrado de React/TanStack (Lovable) para Angular 22. Lovable não é mais usado.
- Supabase foi descartado; o projeto roda em localhost.
- Vercel não é usada no momento (projeto local); `frontend/vercel.json` é legado.
- O MVP anterior (suporte-centrado, com localStorage) está documentado em `docs/` como histórico acadêmico. A ampliação de escopo é evolução posterior e não reescreve o histórico.

---

## 28. PRINCÍPIO FINAL

O NEXUS não deve parecer um conjunto de páginas administrativas. Ele deve parecer **um único sistema de continuidade de contexto**.

A pessoa deve perceber:

> "Eu descrevi o que precisava, o sistema me fez perguntas simples, me mostrou que tipo de solução fazia sentido e como ela ficaria. A equipe avaliou, marcou a reunião e definiu como seria feito. Recebi um documento com tudo o que meu sistema terá. Depois da entrega, quando surgiu um problema, o suporte encontrou todo esse histórico, a IA sugeriu um caminho, uma pessoa validou e isso virou conhecimento."

---

## 29. TIME DE AGENTES E MEMÓRIA

Agentes em `.claude/agents/` (locais, fora do Git):
- **Todo o projeto:** `po`, `qa`, `seguranca`.
- **Frontend (Angular):** `front-techlead`, `front-senior`, `front-pleno`, `front-junior`.
- **Backend (Django):** `back-techlead`, `back-senior`, `back-pleno`.

Memória do time em `claude/` (local, fora do Git): `README.md` (protocolo), `produto.md`, `arquitetura-referencia.md`, `decisoes.md`, `po.md`, `qa.md`, `seguranca.md`, `front/`, `back/`.

---

## 30. DECISÕES EM ABERTO

| # | Decisão | Opções / recomendação |
|---|---|---|
| 1 | Provedor do modelo real de IA | a definir (porta LLMProvider permite qualquer um) |
| 2 | Execução de tarefas longas em localhost | fila simples em thread/banco mantendo o contrato 202 + job (recomendado) · Celery + Redis · síncrono |
| 3 | Nome exibido: "Processo" ou "Projeto" | — |
| 4 | Formato do documento de requisitos | HTML imprimível · PDF · DOCX |
| 5 | Revisão acadêmica do problema/pergunta/objetivos | autor |
| 6 | Cenário de demonstração completo | PO + autor |
| 7 | Estados do processo (`docs/FLUXO.md` §5) | validar com PO e back-senior; inclui: estado para requisitos em validação/documento entregue, "possível com ressalvas", INVIÁVEL pode ser reaberto?, duração do STAND_BY |
| 8 | Remover `frontend/vercel.json` | — |
| 9 | Perguntas da entrevista | geradas pela IA ao vivo (resposta do cliente = ação humana) · banco de perguntas validado no ADM · híbrido |
| 10 | Direção dos templates de tela | ADM → protótipo · protótipo → ADM · ambos |
| 11 | Formato do protótipo | só HTML puro (recomendado) · imagem renderizada do HTML · imagem gerada por IA |
| 12 | Quem decide o cenário final | cliente · equipe · cliente propõe e equipe confirma |
| 13 | Aceite do documento de requisitos | cliente dá aceite / pode pedir revisão? |
| 14 | Metodologia × processo de melhoria | como a metodologia define quando abrir novo processo |
| 15 | Produto/Versão | quem registra e como o processo chega a ENTREGUE |
| 16 | Perfis | perfis acumuláveis? uma ou várias equipes? quem abre chamado (cliente ou suporte)? |
| 17 | Formatos de anexo | .txt decidido; .docx/.pdf? |
| 18 | Quem aprova versão EDITADA | o próprio validador · outro validador |
| 19 | Cliente vê requisitos antes da solicitação? | — |
| 20 | Detalhes marcados como *proposta* neste arquivo | confirmar ou descartar (entrevista, viabilidade, reunião, metodologias, campos do processo, comentários, cota, custo) |

---

## 31. ORDEM DE TRABALHO

**Fase 0 — Documentação.** Concluída e aprovada pelo PO (com ressalvas registradas no §30).

**Fase 1-front — Frontend com backend simulado (ATUAL, 2026-10-07).** Angular reconstruído em `core/shared/features`; CSS consolidado do zero; dados mockados coerentes; ações reais via HttpClient + interceptor; fluxo completo testado (cliente e equipe). Detalhes em `docs/STATUS_PROJETO.md`.

Quando liberado:
1. **Base do backend:** `.env` + `SECRET_KEY`, DRF, settings por ambiente, `core` (modelo-base, auditoria, máquina de estados), `contas` (JWT, perfis), `ia` (porta + fake_adapter + Job + LogIA).
2. **Fluxo do cliente:** demandas → levantamento (fontes + entrevista) → cenário → protótipo → encerramento (stand-by/solicitação).
3. **Equipe:** solicitações (viabilidade, reunião, metodologia) → validações → requisitos → documento.
4. **Pós-entrega:** produtos/versões → chamados → conhecimento (portar a lógica do MVP Angular atual para a API).
5. **Front:** reorganizar em `core/shared/features`, integrar com a API, aplicar o padrão visual.
6. **Indicadores, ADM, dados de demonstração e testes de aceitação.**

---

## 32. CHECKLIST DE ACEITAÇÃO (ALTO NÍVEL)

### Cliente
- [ ] inicia processo
- [ ] informa necessidade por texto e por arquivo de texto
- [ ] responde entrevista guiada com 3+ opções ou "Outro"
- [ ] vê cenário recomendado com justificativa
- [ ] vê protótipo
- [ ] escolhe stand-by ou abre solicitação
- [ ] recebe documento de requisitos
- [ ] abre processo de melhoria vinculado

### Equipe
- [ ] vê fila de solicitações
- [ ] marca se é possível
- [ ] marca reunião para validar as regras
- [ ] define metodologia e quando será feito
- [ ] aprova / edita / rejeita (com motivo) cada artefato

### Pós-entrega
- [ ] produto e versão vinculados ao processo
- [ ] chamado recupera o contexto do processo
- [ ] sugestão da IA validada por humano
- [ ] conhecimento registrado e reutilizado
- [ ] chamado convertido em novo processo

### Qualidade
- [ ] permissões por perfil e por objeto
- [ ] auditoria das decisões
- [ ] anonimização antes da IA
- [ ] IA sempre marcada como sugestão
- [ ] responsivo; sem tela em branco; sem navegação falsa
- [ ] build e testes passando
