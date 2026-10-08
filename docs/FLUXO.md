# NEXUS — Fluxo funcional

Fonte: definição do autor (2026-10-07) + `docs/ARQUITETURA.md`. Regras detalhadas em `CLAUDE.md` §5.

## 1. Visão de ponta a ponta

```
[CLIENTE]                         [SISTEMA / IA]                      [EQUIPE RESPONSÁVEL]
    |
 Iniciar processo
 (nome, descrição, dados)
    |
 Informar necessidade ─────────▶ guarda fontes (original)
 (texto e/ou ata/transcrição)     anonimiza para a IA
    |
 Responder entrevista ◀────────▶ gera próxima pergunta (3+ opções,
 (opções ou Outro)               "Outro"; "Não sei" = proposta); extrai sinais
    |
 Ver cenário recomendado ◀────── pontua cenários a partir dos sinais
 (web, desktop, job, API…)        (regra determinística no domínio)
    |
 Ver protótipo ◀──────────────── gera telas e protótipo
 (HTML puro / imagem)             (relação com templates do ADM: pendente)
    |
 ┌─ Stand-by (guardar)
 └─ Abrir solicitação ─────────────────────────────────────────▶ Fila de solicitações
                                                                     |
                                                                 Viabilidade
                                                                 (marca se é possível)
                                                                     |
                                                                 Agendar reunião
                                                                 (validar regras; ata)
                                                                     |
                                                                 Metodologia e datas
                                                                     |
                                  gera requisitos (PROPOSTO) ◀───────┤
                                                                 Validar artefatos
                                                                 (aprovar / editar / rejeitar)
                                                                     |
 Recebe documento de ◀────────── monta documento a partir
 requisitos                       da baseline aprovada
    |
 Pedir melhoria/adição ──────▶ novo processo vinculado
    ⋮
 (desenvolvimento → produto/versão publicado)
    ⋮
 Abrir chamado ────────────────▶ recupera contexto do processo,
                                  requisitos, versão, conhecimento;
                                  sugere causa e procedimento ───────▶ Analista valida
                                                                       ├─ rejeita → revisão
                                                                       └─ aprova → conhecimento
                                                                                    → reuso
```

## 2. Regra que atravessa tudo

```
IA PROPÕE ──▶ PROPOSTO ──▶ EM_REVISAO ──┬─▶ APROVADO ──▶ (OBSOLETO quando surgir versão nova)
                                        ├─▶ EDITADO ──▶ EM_REVISAO
                                        └─▶ REJEITADO (motivo obrigatório) ──▶ nova geração
```
Não existe caminho automático para APROVADO.

## 3. Entrevista guiada — regras

**Decidido (autor):** inúmeras perguntas simples e fáceis; normalmente 3 ou mais opções ou "Outro". Demais linhas: **proposta**, a confirmar (`CLAUDE.md` §30 #20).

| Regra | Detalhe |
|---|---|
| Linguagem | simples, não técnica, uma pergunta por vez |
| Opções | normalmente 3 ou mais, + "Outro" (texto) · "Não sei" (proposta) |
| Tipo | escolha única ou múltipla |
| Adaptação | próxima pergunta depende das respostas e do que já está nas fontes; não repetir o que já foi dito |
| Sinais | cada resposta gera sinais usados na pontuação de cenário e nos requisitos |
| Parada | suficiência de informação ou limite de perguntas |
| Controle do cliente | pausar, retomar, revisar e alterar respostas antes de concluir |

Exemplos de perguntas:

- *Quem vai usar o sistema no dia a dia?* — Só eu · Uma equipe interna · Clientes externos · Outro · Não sei
- *Onde as pessoas vão usar?* — No computador do escritório · No celular · Nos dois · Ninguém, roda sozinho · Outro · Não sei
- *Precisa funcionar sem internet?* — Sim, sempre · Às vezes · Não · Não sei
- *Com que frequência a tarefa acontece?* — O tempo todo · Uma vez por dia · Uma vez por mês · Quando alguém pede · Outro

## 4. Cenários técnicos (catálogo inicial — proposta)

| Cenário | Sinais típicos |
|---|---|
| Aplicação web | vários usuários, acesso de qualquer lugar, uso em navegador |
| Software desktop | uso local, funciona sem internet, acesso a arquivos/periféricos da máquina |
| Aplicativo mobile | uso em campo, celular, câmera/GPS, notificações |
| Job / rotina agendada | sem interface, roda sozinho, horário fixo, processamento em lote |
| API / integração | conectar sistemas existentes, troca de dados entre sistemas |

Pesos e sinais são configuráveis no ADM. A recomendação mostra ranking, justificativa e sinais que pesaram.

## 5. Estados do processo (proposta — a validar)

Diagrama único e oficial da proposta (o `CLAUDE.md` aponta para cá).

```
RASCUNHO → EM_LEVANTAMENTO → LEVANTAMENTO_CONCLUIDO ─┬─▶ STAND_BY ──(retomar)──▶ EM_LEVANTAMENTO
                                                     └─▶ SOLICITADO → EM_ANALISE ─┬─▶ INVIAVEL
                                                                                  └─▶ VIAVEL → REUNIAO_AGENDADA → PLANEJADO
                                                                                       → REQUISITOS_EM_VALIDACAO → DOCUMENTO_ENTREGUE
                                                                                       → EM_DESENVOLVIMENTO → ENTREGUE
(qualquer estado) → CANCELADO (motivo)
```
Em aberto (`CLAUDE.md` §30 #7, #15): "possível com ressalvas", reabertura de INVIAVEL, duração do STAND_BY, quem publica Produto/Versão para chegar a ENTREGUE.

## 6. Perfis (inferidos do fluxo — proposta, `CLAUDE.md` §30 #16)

| Perfil | Pode |
|---|---|
| Cliente/Solicitante | criar e acompanhar os próprios processos; responder entrevista; ver protótipo e cenário; stand-by/solicitar; receber documento; pedir melhoria; abrir chamado |
| Equipe responsável/Gestor | ver solicitações; viabilidade; reunião; metodologia; validar artefatos |
| Analista/Suporte | atender chamados; validar sugestões; registrar conhecimento |
| Administrador | templates de tela, cenários, metodologias, usuários, prompts, log da IA |

## 7. Documento de requisitos — conteúdo

1. Identificação do projeto e versão do documento
2. Visão geral e objetivo
3. Cenário técnico escolhido e justificativa
4. Requisitos funcionais
5. Requisitos não funcionais
6. Regras de negócio
7. Critérios de aceite
8. Protótipo (telas)
9. Metodologia, datas e responsáveis
10. Premissas e pendências
11. Histórico de versões

Gerado somente a partir da baseline aprovada. Formato de saída e aceite do cliente: pendentes (`CLAUDE.md` §30 #4, #13). Estrutura acima: proposta.
