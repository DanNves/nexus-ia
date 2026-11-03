# Perfis do NEXUS — quem é quem e o que cada um faz

> Fonte única dos papéis. Complementa `CLAUDE.md` §3 (IA propõe, humano valida), §5 (fluxo), §9–10 (rotas e navegação) e §19 (permissão por objeto).
> Vigente desde 2026-11-03. Itens marcados *(proposta)* dependem de `CLAUDE.md` §30 #16.

## 1. Os três papéis

| Papel (na tela) | Perfil no código | Quem é | Em uma frase |
|---|---|---|---|
| **Solicitante** | `CLIENTE` | a pessoa ou área que precisa de um software (ex.: Marina, da Clínica Bem Viver) | **pede** e **acompanha** |
| **Equipe responsável** | `EQUIPE` | quem avalia, especifica, desenvolve e dá suporte (ex.: Rafael) | **avalia**, **valida** e **atende** |
| **Administrador** | `EQUIPE` + `admin` (`is_staff`) | alguém da equipe que também cuida das contas | tudo da equipe + **gerencia usuários** |

- O código continua usando `CLIENTE` (enum do Django e do front); na interface o papel se chama **Solicitante**. "Cliente" na tela só aparece no sentido da organização atendida.
- **A IA não é um papel.** Ela só sugere (perguntas, cenário, protótipo, requisitos, sugestão de suporte); quem decide é sempre uma pessoa do papel indicado abaixo.
- Cadastro público cria sempre Solicitante. Equipe e administrador são definidos pelo administrador (tela Usuários).

## 2. Visão ativa

Quem é da equipe alterna no cabeçalho entre **Solicitante** e **Equipe**:
- **Visão Solicitante:** vê o NEXUS exatamente como um solicitante vê e pode abrir as próprias demandas (útil para demandas internas e para demonstrar).
- **Visão Equipe:** fila de trabalho, validações e atendimento.

Trocar de visão só **reduz** o que aparece; as permissões reais continuam no backend, pelo perfil da conta. Solicitante não tem seletor.

## 3. O que cada papel faz, etapa por etapa

| Etapa (CLAUDE.md §5) | Solicitante | Equipe responsável | IA |
|---|---|---|---|
| Iniciar demanda | **cria** (nome, descrição) | — (na visão Equipe não abre demanda) | — |
| Necessidade | **escreve** e anexa ata/transcrição (.txt) | lê | recebe só a versão anonimizada |
| Entrevista guiada | **responde** (pode alterar respostas antes de concluir) | lê as respostas | **sugere** as perguntas (em rodadas, com cota); sem IA, vale o roteiro padrão |
| Cenário técnico | vê o ranking e a justificativa (sugestão não validada) | confirma o cenário *(proposta, §30 #12)* | extrai sinais; a pontuação é regra fixa |
| Protótipo | vê as telas (sugestão não validada) | valida | sugere |
| Encerramento | **escolhe** stand-by ou abrir solicitação; retoma o stand-by | — | — |
| Viabilidade | acompanha | **decide** se é possível, com justificativa obrigatória ("com ressalvas": *proposta*, §30 #7) | não decide |
| Reunião | participa | **agenda** | — |
| Metodologia e datas | acompanha | **define** | não decide |
| Requisitos | vê só os **aprovados** | pede a sugestão e **aprova / edita / rejeita com motivo** | sugere; nunca aprova |
| Documento de requisitos | **recebe** | o documento é montado do que a equipe aprovou | — (sem IA) |
| Atividades (quadro interno) | não vê | **cria e move** | — |
| Soluções e versões | vê as que solicitou e as que observa; adiciona observadores nas suas | vê todas; registra versões *(ainda não implementado, §30 #15)* | — |
| Chamados | **abre** e acompanha a posição na fila | **atende** (próximo da fila), pede a sugestão, **aprova/rejeita**, resolve | sugere possível causa e procedimento; nunca fecha chamado |
| Conhecimento | vê o ligado aos seus chamados | **registra** a partir da sugestão validada | não publica |
| Usuários | — | — (só administrador) | — |

## 4. Navegação por papel

Menu lateral do template oficial (`CLAUDE.md` §10), definido em `frontend/src/app/shared/perfis.ts`:

| Seção | Solicitante | Equipe responsável |
|---|---|---|
| — | Visão geral | Visão geral |
| Meus pedidos / Projetos | Minhas demandas · Nova demanda | Demandas · Atividades · Calendário |
| Acompanhamento / Pós-entrega | Agenda · Minhas soluções · Meus chamados | Soluções · Fila de atendimento |
| Administração | — | Usuários (só administrador) |

As rotas são as mesmas para os dois papéis (`/demandas`, `/fila`…); o título, os textos e as ações mudam conforme a visão.

## 5. Visibilidade dos dados (permissão por objeto)

Regra implementada no mock (`core/api/mock-backend.interceptor.ts`, `REGRAS`) e a repetir nos querysets do Django:

| Registro | Solicitante vê | Equipe vê |
|---|---|---|
| Demanda | as que ele abriu | todas |
| Chamado | os que ele abriu | todos |
| Solução | as que solicitou e as em que é observador (pelo e-mail) | todas |
| Evento do calendário | os em que participa e as entregas das suas demandas | todos |
| Conhecimento | o ligado às suas soluções/chamados | todo |
| Atividade | nenhuma (quadro interno) | todas |
| Pessoa | ele mesmo e a equipe envolvida nos seus registros | todas |
| Notificação / job de IA | só as suas | só as suas |

Registro de outra pessoa responde **404** (não revela que existe).

## 6. Pendências

- `CLAUDE.md` §30 #16: perfis acumuláveis, uma ou várias equipes, separar "suporte" da equipe de projeto.
- §30 #12: quem confirma o cenário final.
