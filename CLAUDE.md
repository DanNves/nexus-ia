# NEXUS — ESPECIFICAÇÃO MESTRA E GUIA DE IMPLEMENTAÇÃO PARA CLAUDE

> **Documento único de referência do projeto.**
> Claude deve ler este arquivo antes de modificar o sistema e deve manter o projeto coerente com esta especificação.
> Este documento descreve o produto, o recorte do TCC, o MVP, a arquitetura atual, o contrato visual, o fluxo funcional, as regras de implementação, o estado atual e a ordem de trabalho.

---

## 1. IDENTIDADE DO PROJETO

**Nome:** NEXUS  
**Nome técnico/repositório:** nexus-ia  
**Repositório oficial:** DanNves/nexus-ia  
**Título do TCC:** NEXUS — Conexão entre Demanda, Desenvolvimento e Suporte

### Conceito

O NEXUS é uma plataforma web para preservar e recuperar o contexto produzido durante o desenvolvimento de uma solução de software e utilizar esse contexto no atendimento de suporte.

Fluxo central:

**DEMANDA → REQUISITOS → VERSÃO DA SOLUÇÃO → CHAMADO DE SUPORTE → RECUPERAÇÃO DO CONTEXTO → IA GENERATIVA → SUGESTÃO → VALIDAÇÃO HUMANA → BASE DE CONHECIMENTO**

A ideia central não é criar uma IA autônoma. A IA apoia o profissional de suporte; a decisão final permanece humana.

---

## 2. RECORTE DO TCC

### Problema

Dificuldade de preservar, recuperar e utilizar de forma organizada o contexto produzido durante o desenvolvimento de uma solução de software no atendimento de chamados de suporte.

### Pergunta de pesquisa

Como uma plataforma que preserva e recupera o contexto produzido durante o desenvolvimento de uma solução de software pode auxiliar o atendimento de chamados de suporte por meio de IA generativa com validação humana?

### Objetivo geral

Desenvolver e avaliar uma plataforma web que preserve e disponibilize o contexto produzido durante o desenvolvimento de soluções de software para apoiar o atendimento de chamados de suporte, utilizando IA generativa para auxiliar na análise e sugestão de soluções, sempre com validação humana.

### Objetivos específicos

1. Registrar demanda e requisitos, mantendo relação entre informações produzidas na especificação.
2. Relacionar requisitos, versões e informações relevantes aos chamados.
3. Implementar recuperação de contexto para apresentar informações relacionadas ao chamado.
4. Usar IA generativa para auxiliar classificação, análise, possíveis causas e procedimentos/soluções, sem retirar a decisão final do profissional.
5. Transformar soluções validadas em conhecimento reutilizável e avaliar a contribuição por meio de casos controlados e indicadores de tempo, utilidade, aceitação, edição, rejeição e reuso.

---

## 3. REGRA FUNDAMENTAL DO PRODUTO

A arquitetura e a interface devem sempre deixar evidente:

**IA SUGERE → HUMANO VALIDA → SISTEMA CONSOLIDA**

A IA não pode:
- fechar chamado de forma autônoma;
- confirmar diagnóstico como fato;
- executar comandos críticos;
- alterar infraestrutura;
- alterar banco de dados;
- publicar conhecimento sem validação;
- tomar decisão crítica no lugar do profissional.

Quando houver IA no sistema, deve existir indicação clara de que a decisão é humana.

---

## 4. ESCOPO DO MVP

### Deve existir

- Dashboard
- Demandas
- Atividades
- Requisitos
- Soluções e Versões
- Chamados
- Recuperação de contexto
- IA de apoio ao suporte
- Validação humana
- Base de Conhecimento
- Indicadores
- Configurações
- Busca global
- Notificações
- Pessoas relacionadas
- Comentários/atualizações
- Rastreabilidade entre registros
- Criação de demanda/atividade em passo a passo
- Persistência em Supabase/PostgreSQL como caminho principal do MVP
- localStorage mantido como fallback controlado e mecanismo de migração/demonstração

### Fora do escopo atual

Não implementar como parte central do MVP:
- IA em todas as etapas do ciclo;
- entrevista adaptativa complexa;
- transcrição de áudio/vídeo em tempo real;
- geração automática de código;
- execução autônoma de comandos;
- automação de servidor;
- automação de banco;
- infraestrutura;
- aplicativo mobile nativo;
- dezenas de integrações externas;
- LLM real obrigatoriamente conectado;
- RAG vetorial real;
- backend completo além dos serviços gerenciados do Supabase;
- infraestrutura própria de PostgreSQL;
- autenticação empresarial complexa.

Esses itens podem aparecer como evolução arquitetural/documentação, mas não devem desviar o MVP.

---

## 5. IA — LOCAL EXATO

A IA é demonstrada principalmente dentro do atendimento de suporte.

Entrada:

- chamado;
- descrição do problema;
- solução;
- versão;
- demanda relacionada;
- atividade relacionada;
- requisito relacionado;
- chamados anteriores;
- conhecimento validado.

Processamento conceitual:

1. recuperar contexto;
2. organizar evidências;
3. classificar o chamado;
4. sugerir possível causa;
5. sugerir procedimento;
6. apresentar evidências/contexto;
7. aguardar decisão humana.

Saída:

- categoria;
- resumo;
- possível causa;
- procedimento sugerido;
- evidências;
- confiança simulada;
- estado de validação.

A implementação atual é uma **simulação controlada**. Não afirmar que existe um LLM real conectado.

---

## 6. FLUXO DE DEMONSTRAÇÃO DO TCC

A demonstração principal deve seguir esta sequência:

1. Dashboard
2. Demandas
3. abrir uma demanda
4. verificar relacionamento
5. Requisitos
6. verificar requisito relacionado
7. Soluções e Versões
8. verificar versão da solução
9. Chamados
10. abrir CH-028
11. executar “Analisar com IA”
12. verificar contexto recuperado
13. verificar possível causa
14. verificar procedimento sugerido
15. verificar evidências
16. aprovar ou rejeitar a sugestão
17. após aprovação, registrar conhecimento
18. abrir Conhecimento
19. verificar origem do conhecimento
20. verificar solução/versão
21. verificar procedimento validado
22. verificar reuso/rastreabilidade.

O sistema deve parecer um fluxo único, e não módulos isolados.

---

## 7. MODELO CONCEITUAL

Tipos principais:

- Demanda
- Atividade
- Requisito
- Solução
- Versão
- Chamado
- Conhecimento

Cada registro deve preservar, quando aplicável:

- id;
- título;
- descrição;
- contexto;
- solução;
- versão;
- status;
- prioridade;
- responsável;
- solicitante;
- participantes;
- data;
- prazo;
- objetivo;
- relacionamentos;
- comentários.

Registros de suporte/IA podem possuir:

- aiCategory;
- aiSummary;
- aiConfidence;
- aiCause;
- aiProcedure;
- aiEvidence;
- aiStatus;
- nextAction;
- nextActionHint.

Conhecimento validado pode possuir:

- sourceTicketId;
- procedure;
- validatedBy;
- validatedAt;
- revision;
- reuseCount.

---

## 8. ARQUITETURA ATUAL

### Frontend

**Angular 22**

Uso de:
- standalone components;
- Angular Router;
- Signals;
- FormsModule;
- TypeScript strict;
- CSS global organizado por componentes/áreas.

### Estrutura

```
src/
├── main.ts
├── index.html
├── styles.css
└── app/
    ├── app.component.ts
    ├── app.component.html
    ├── app.routes.ts
    ├── models/
    │   └── nexus.models.ts
    ├── data/
    │   └── nexus.data.ts
    ├── services/
    │   └── nexus.store.ts
    ├── pages/
    │   ├── dashboard.component.ts
    │   ├── dashboard.component.html
    │   ├── module.component.ts
    │   ├── module.component.html
    │   ├── ai.component.ts
    │   ├── ai.component.html
    │   ├── knowledge.component.ts
    │   └── knowledge.component.html
    └── shared/
        └── icon.component.ts
```

### Persistência

**Supabase PostgreSQL** é a persistência principal planejada para o MVP consolidado.

- Supabase fornece PostgreSQL e Data API;
- RLS deve permanecer habilitado nas tabelas expostas;
- o frontend usa apenas chave publicável;
- chaves secretas nunca entram no Angular;
- localStorage permanece como fallback controlado durante a transição e para restauração/demonstração.

O schema atual já possui: people, solutions, versions, demands, activities, requirements, tickets, ai_suggestions, knowledge, comments, record_links e audit_events.

---

## 9. ROTAS

```
/dashboard
/demandas
/atividades
/requisitos
/solucoes-e-versoes
/chamados
/ia
/conhecimento
/indicadores
/configuracoes
```

Cada rota deve abrir uma tela real.

Nunca criar links visuais que não possuam rota correspondente.

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

Marca NEXUS à esquerda.

Depois:

**Visão geral | Demandas | Atividades | Requisitos | Soluções | Chamados | IA | Conhecimento**

E ações à direita:

**Nova demanda | Busca | Notificações | Usuário**

O item atual deve possuir:
- texto azul;
- fundo azul muito suave;
- linha inferior azul;
- ícone azul.

Os itens não ativos:
- fundo transparente;
- texto azul/cinza;
- sem borda externa;
- sem caixa individual.

Separadores verticais muito discretos são aceitáveis.

### Mobile

No mobile:
- esconder a navegação horizontal;
- mostrar botão de menu;
- abrir painel organizado por seções;
- cada opção deve ser grande o suficiente para toque;
- destacar a rota ativa.

---

## 11. NAVEGAÇÃO INTERNA DOS MÓDULOS

Demandas, Atividades, Requisitos, Soluções e Versões e Chamados pertencem ao mesmo ciclo.

A navegação contextual pode aparecer abaixo do cabeçalho da página:

**Demandas | Atividades | Requisitos | Soluções e Versões | Chamados**

Deve parecer uma barra de navegação secundária.

Não transformar cada opção em cartão.

O item atual deve ser identificado por:
- texto azul;
- fundo azul muito suave;
- linha inferior.

---

## 12. PADRÃO VISUAL

### Identidade

NEXUS deve parecer:
- profissional;
- corporativo;
- moderno;
- limpo;
- orientado a software;
- confiável;
- acadêmico/profissional.

Evitar:
- aparência excessivamente futurista;
- aparência de “IA genérica”;
- neon;
- excesso de gradientes;
- excesso de sombras;
- excesso de cards;
- excesso de elementos arredondados.

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

Título da página > título da seção > título do registro > texto auxiliar.

Não utilizar textos auxiliares maiores que títulos.

---

## 13. DASHBOARD

O Dashboard deve responder rapidamente:

- o que está acontecendo;
- quais chamados precisam de atenção;
- quanto contexto está recuperável;
- onde a IA entra;
- quais conhecimentos foram validados;
- qual é o fluxo do NEXUS.

Elementos:

### Indicadores

- Demandas em andamento
- Atividades em desenvolvimento
- Chamados abertos
- Validações humanas

### Fluxo

**Demanda → Requisito → Versão → Chamado → IA sugere → Humano valida → Conhecimento**

### Contexto da solução

Mostrar:
- cobertura de contexto;
- registros a completar;
- versões rastreáveis;
- desenvolvimento → suporte → conhecimento.

### Atenção

Mostrar registros que exigem ação.

Cada item deve abrir seu registro.

### Rastreabilidade

Exemplo:

**DEM-012 → REQ-014 → v1.2.0 → CH-028 → KB-007**

Cada nó deve ser clicável.

---

## 14. DEMANDAS

A tela deve permitir:

- pesquisar;
- filtrar;
- visualizar status;
- visualizar responsável;
- visualizar contexto;
- abrir detalhe;
- criar nova demanda.

Criação deve ser passo a passo:

1. Identificação
2. Pessoas
3. Contexto
4. Objetivo
5. Revisão

Cada etapa salva o rascunho.

Campos importantes:
- título;
- descrição;
- prioridade;
- prazo;
- solicitante;
- responsável;
- participantes;
- contexto;
- solução;
- versão;
- objetivo.

---

## 15. ATIVIDADES

Mesmo padrão das demandas, porém representando o trabalho que materializa a demanda.

Deve possuir:
- responsável;
- participantes;
- contexto;
- objetivo;
- status;
- relação com demanda quando disponível.

Deve permitir marcar como:
**Em desenvolvimento**

---

## 16. REQUISITOS

Deve mostrar a especificação produzida no desenvolvimento.

Detalhe deve apresentar:

- demanda relacionada;
- solução;
- versão;
- regras de negócio;
- critérios de aceitação;
- pessoas;
- relacionamentos.

O requisito precisa ser recuperável no suporte.

---

## 17. SOLUÇÕES E VERSÕES

A tela deve representar o que foi publicado.

Exemplo:

**Portal de Atendimento — v1.2.0**

O detalhe deve deixar claro que a versão é uma ponte entre desenvolvimento e suporte.

Informações:
- solução;
- versão;
- publicação;
- estado;
- contexto;
- requisitos relacionados.

---

## 18. CHAMADOS

É o ponto principal do TCC.

Cada chamado deve mostrar:

- problema;
- contexto;
- solução;
- versão;
- responsável;
- solicitante;
- prioridade;
- relacionamento;
- chamados anteriores;
- conhecimento relacionado.

Dentro do chamado:

### IA

Mostrar:

**APOIO DA IA GENERATIVA**

Depois:

- fontes recuperadas;
- possível causa;
- procedimento sugerido;
- evidências;
- validação humana.

Botões:

**Rejeitar e revisar**

**Aprovar sugestão**

Depois de aprovado:

**Registrar conhecimento**

---

## 19. RECUPERAÇÃO DE CONTEXTO

A função de recuperação deve atravessar o ciclo.

Para um chamado, procurar:

- próprio chamado;
- relatedIds;
- parentId;
- demanda;
- atividade;
- requisito;
- solução;
- versão;
- chamados relacionados;
- conhecimento validado;
- registros da mesma solução/versão quando aplicável.

A recuperação deve ser apresentada de forma compreensível.

Não basta mostrar “X fontes”.

O usuário deve conseguir abrir as fontes.

---

## 20. CONHECIMENTO

Conhecimento só se torna oficial depois da validação humana.

Fluxo:

**Chamado → Validação humana → Conhecimento → Reuso**

Detalhe deve mostrar:

- origem;
- chamado;
- solução;
- versão;
- revisão;
- validado por;
- validado em;
- procedimento validado;
- contexto de origem;
- relacionamentos;
- número de usos.

---

## 21. INDICADORES

Os indicadores devem apoiar a avaliação do TCC.

Indicadores possíveis:

- cobertura de contexto;
- chamados abertos;
- validações pendentes;
- conhecimentos validados;
- reuso de conhecimento.

Avaliação experimental futura:

- tempo de atendimento;
- utilidade do contexto;
- aceitação da sugestão;
- edição da sugestão;
- rejeição;
- reuso;
- percepção de qualidade/usabilidade.

Não inventar resultados experimentais.

---

## 22. CONFIGURAÇÕES

No MVP, configurações servem para deixar explícitas as regras:

- validação humana obrigatória;
- IA como apoio;
- persistência local;
- notificações;
- limites do MVP.

Não criar uma tela artificial cheia de configurações que não possuem função real.

---

## 23. DETALHE / DRAWER

Ao clicar em qualquer registro:

- abrir detalhe;
- não perder a página atual;
- permitir voltar/fechar;
- mostrar contexto;
- mostrar relacionamentos;
- mostrar envolvidos;
- mostrar comunicação;
- mostrar ações adequadas ao tipo.

Para Chamado:
- IA deve ficar integrada ao detalhe.

Para Requisito:
- regras e critérios.

Para Versão:
- baseline/contexto publicado.

Para Conhecimento:
- origem e procedimento validado.

---

## 24. DADOS DE DEMONSTRAÇÃO

Os dados são fictícios, porém devem ser coerentes.

Registros importantes atuais:

- DEM-012 — Implementar autenticação de dois fatores
- DEM-011 — Melhorar navegação do dashboard
- DEM-010 — Relatório de atendimento
- REQ-014 — Recuperação de senha
- REQ-015 — Notificação de atendimento
- VER-120 — Portal de Atendimento · v1.2.0
- VER-210 — Dashboard de Relatórios · v2.1.0
- CH-028 — Falha na autenticação
- CH-027 — Relatório não carrega
- CH-026 — Usuário sem acesso
- KB-007 — Falha de autenticação na versão 1.2.0
- KB-006 — Permissão de usuário

Esses registros devem formar relações coerentes.

---

## 25. REGRA PARA NOVAS IMPLEMENTAÇÕES

Antes de criar qualquer funcionalidade:

1. verificar se ela pertence ao recorte do TCC;
2. verificar se já existe algo equivalente;
3. verificar modelo;
4. verificar store;
5. verificar rota;
6. verificar template;
7. verificar CSS;
8. verificar impacto na rastreabilidade;
9. verificar responsividade;
10. verificar se a ação realmente funciona.

Não criar somente aparência.

---

## 26. REGRA PARA NAVEGAÇÃO

Toda navegação deve funcionar de verdade.

Ao clicar:

- Demandas → /demandas
- Atividades → /atividades
- Requisitos → /requisitos
- Soluções → /solucoes-e-versoes
- Chamados → /chamados
- IA → /ia
- Conhecimento → /conhecimento
- Indicadores → /indicadores
- Configurações → /configuracoes

Não usar botões que apenas parecem links.

Não usar navegação falsa.

---

## 27. REGRA PARA CSS

O projeto já acumulou camadas de CSS de várias iterações.

Ao fazer manutenção:

- não continuar acumulando overrides indefinidamente;
- procurar regras duplicadas;
- consolidar quando uma área for alterada;
- evitar !important sem necessidade;
- evitar estilos específicos que quebram outras telas;
- manter breakpoints coerentes.

Breakpoints de referência:

- desktop;
- 1280px;
- 1120px;
- 980px;
- 760px;
- 520px.

---

## 28. ESTADO ATUAL DA MIGRAÇÃO

O projeto foi migrado de React/TanStack para Angular 22.

O Lovable antigo continha uma versão React/TanStack e pode apresentar erros que não representam o código Angular atual.

**O desenvolvimento oficial deve continuar no GitHub.**

Não regenerar o projeto no Lovable.

Lovable deve ser tratado apenas como preview quando houver integração/sincronização disponível.

---

## 29. VERCEL

Existe configuração explícita para Angular:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/nexus-ia/browser",
  "framework": "angular",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Não alterar essa estratégia sem verificar o build do Angular.

---

## 30. LIMITAÇÕES ATUAIS

Já existe um banco Supabase/PostgreSQL provisionado e estruturado para o MVP, com RLS habilitado e políticas para usuários autenticados. A integração completa do frontend com autenticação Supabase ainda deve ser concluída antes de substituir definitivamente o localStorage.

Ainda não existem no MVP consolidado:

- LLM real;
- RAG vetorial real;
- execução autônoma;
- infraestrutura própria;
- armazenamento de objetos;
- testes E2E completos.

A IA continua sendo uma simulação controlada. O banco real não altera essa regra acadêmica.

---

## 31. ORDEM DE TRABALHO A PARTIR DE AGORA

Claude deve começar pela estabilização, não por adicionar funcionalidades aleatórias.

### FASE 1 — Estrutura visual

- corrigir navbar;
- corrigir navegação contextual;
- remover aparência de botões/abas excessivas;
- padronizar cabeçalhos;
- padronizar cards;
- padronizar tabelas/listas;
- corrigir espaçamentos;
- corrigir tipografia;
- corrigir responsividade.

### FASE 2 — Rotas e interação

Testar todas as rotas:

- Dashboard
- Demandas
- Atividades
- Requisitos
- Soluções e Versões
- Chamados
- IA
- Conhecimento
- Indicadores
- Configurações

Nenhuma tela pode ficar em branco ou abaixo da estrutura principal.

### FASE 3 — Fluxo funcional

Testar:

Demanda → Requisito → Versão → Chamado → Contexto → IA → Validação → Conhecimento.

### FASE 4 — Dados e persistência

Esta fase é a consolidação do modelo de dados e da rastreabilidade. O plano detalhado está em docs/PARTE_4_IMPLEMENTACAO.md.

Garantir:

- relacionamentos por IDs estáveis;
- Solução e Versão tipadas;
- persistência Supabase/PostgreSQL;
- fallback/migração local quando necessário;
- recuperação de contexto;
- atualização de status válida;
- comentários;
- participantes;
- conhecimento;
- auditoria das decisões humanas;
- RLS e permissões coerentes.

### FASE 5 — Apresentação do TCC

Garantir que a interface consiga demonstrar claramente:

**“O contexto criado no desenvolvimento é recuperado no suporte e utilizado pela IA para gerar uma sugestão que precisa ser validada por uma pessoa.”**

---

## 32. PRIMEIRA TAREFA DE CLAUDE

Ao iniciar o trabalho neste repositório:

1. ler este `CLAUDE.md`;
2. verificar o estado atual do Git;
3. inspecionar `src/app/app.component.*`;
4. inspecionar `src/styles.css`;
5. inspecionar `src/app/app.routes.ts`;
6. inspecionar `src/app/pages/module.component.*`;
7. inspecionar `src/app/services/nexus.store.ts`;
8. verificar se todas as rotas possuem tela;
9. verificar se a navbar não possui aparência de cartões;
10. verificar se os módulos realmente navegam;
11. verificar o fluxo CH-028;
12. corrigir problemas encontrados antes de criar novos módulos.

### Primeira entrega esperada

A primeira entrega deve deixar:

- navbar funcional;
- navbar visualmente limpa;
- módulos navegáveis;
- telas consistentes;
- contexto preservado;
- chamado CH-028 funcional;
- análise de IA simulada funcional;
- validação humana funcional;
- registro de conhecimento funcional.

---

## 33. CHECKLIST DE ACEITAÇÃO

### Navegação

- [ ] Dashboard abre
- [ ] Demandas abre
- [ ] Atividades abre
- [ ] Requisitos abre
- [ ] Soluções abre
- [ ] Chamados abre
- [ ] IA abre
- [ ] Conhecimento abre
- [ ] Indicadores abre
- [ ] Configurações abre
- [ ] Item ativo é visualmente identificável
- [ ] Nenhum item parece botão/cartão sem necessidade

### Demandas

- [ ] pesquisa
- [ ] filtro
- [ ] detalhe
- [ ] criação
- [ ] salvamento por etapa
- [ ] pessoas
- [ ] contexto
- [ ] objetivo
- [ ] revisão

### Atividades

- [ ] pesquisa
- [ ] filtro
- [ ] detalhe
- [ ] pessoas
- [ ] contexto
- [ ] status
- [ ] criação

### Requisitos

- [ ] relacionamento
- [ ] regras
- [ ] critérios
- [ ] detalhe

### Soluções/Versões

- [ ] solução
- [ ] versão
- [ ] publicação
- [ ] contexto
- [ ] relacionamento

### Chamados

- [ ] abertura
- [ ] contexto
- [ ] análise
- [ ] IA
- [ ] possível causa
- [ ] procedimento
- [ ] evidências
- [ ] validação humana
- [ ] conhecimento

### Conhecimento

- [ ] origem
- [ ] validação
- [ ] procedimento
- [ ] versão
- [ ] revisão
- [ ] reuso

### Qualidade

- [ ] responsivo
- [ ] sem tela em branco
- [ ] sem navegação falsa
- [ ] sem erro de runtime conhecido
- [ ] sem estilos duplicados críticos
- [ ] sem afirmar que IA simulada é LLM real

---

## 34. PRINCÍPIO FINAL

O NEXUS não deve parecer um conjunto de páginas administrativas.

Ele deve parecer **um único sistema de continuidade de contexto**.

A pessoa deve perceber:

> “Eu registrei uma necessidade, essa necessidade virou especificação, a solução foi publicada, surgiu um problema no suporte, o sistema recuperou o que foi produzido antes, a IA analisou esse contexto, eu validei a sugestão e o resultado virou conhecimento reutilizável.”

Esse é o produto.

Tudo que não reforçar essa compreensão deve ser questionado antes de entrar no MVP.

---

## 35. FLUXO DO CHAMADO — REGRA ATUAL

O chamado é o ponto central da atuação da IA no MVP.

Ao abrir um chamado, o sistema deve:

1. recuperar o contexto relacionado;
2. identificar demanda, atividade, requisito, solução/versão e histórico de suporte;
3. procurar conhecimento validado e chamados anteriores compatíveis;
4. anexar as referências encontradas ao próprio chamado;
5. apresentar o que foi considerado;
6. indicar possível causa;
7. apresentar resolução/procedimento sugerido;
8. deixar explícito quando não existir solução anterior suficiente;
9. exigir validação humana;
10. registrar a decisão humana;
11. após aprovação, permitir registrar conhecimento.

A IA nunca deve transformar uma hipótese em diagnóstico confirmado automaticamente.

### Solução anterior

Quando houver conhecimento validado compatível:

Chamado → solução anterior encontrada → referência anexada → procedimento recuperado → humano valida

Quando não houver:

Chamado → contexto recuperado → análise → resolução sugerida → humano valida

---

## 36. ABERTURA DE CHAMADOS

O MVP permite criar chamados pelo mesmo wizard usado para demandas e atividades.

Ao criar um chamado:

- título;
- descrição do problema;
- prioridade;
- prazo;
- solicitante;
- responsável;
- participantes;
- contexto;
- solução;
- versão;
- objetivo

são registrados.

Quando solução e versão forem informadas, o sistema procura registros existentes da mesma solução/versão e usa esses IDs como contexto inicial do chamado.

---

## 37. RASTREABILIDADE DA VALIDAÇÃO

A validação humana deve deixar evidência no próprio chamado:

- estado da IA;
- responsável pela decisão;
- data/hora;
- decisão;
- observação registrada no histórico.

A aprovação não significa que a IA tomou a decisão; significa que o responsável validou a sugestão apresentada.

A rejeição devolve o chamado para análise.

---

## 38. RECUPERAÇÃO DO MVP

Como o estado é persistido em localStorage, o menu Configurações deve oferecer uma ação clara para restaurar os dados de demonstração.

Essa ação deve:

- restaurar os registros seed;
- limpar rascunhos;
- limpar seleção atual;
- manter a aplicação funcional;
- informar o usuário por toast.

Isso é especialmente importante durante demonstrações e testes do TCC.

---

## 39. VALIDAÇÃO TÉCNICA

O projeto possui GitHub Actions para executar:

npm ci
npm run check
npm run build

O build deve ser tratado como requisito de aceite antes de considerar uma alteração estrutural concluída.

A versão Angular 22 usa o application builder oficial. A compatibilidade deve seguir a matriz oficial de Angular/Node/TypeScript.

---

## 40. ARQUITETURA CONSOLIDADA DO MVP

A arquitetura alvo é:

Navegador → Angular 22 → serviços/Store → Supabase Data API → PostgreSQL

O GitHub é a fonte oficial do código e do histórico. A Vercel é o ambiente de publicação. Lovable é somente apoio de preview/sincronização e não define a arquitetura oficial.

O fluxo de dados do produto permanece:

DEMANDA → REQUISITO → VERSÃO → CHAMADO → CONTEXTO → IA → SUGESTÃO → VALIDAÇÃO HUMANA → CONHECIMENTO

O banco deve preservar esse encadeamento por chaves estáveis e pela tabela record_links.

## 41. SUPABASE E SEGURANÇA

O projeto Supabase foi provisionado para o NEXUS.

Regras obrigatórias:
- RLS habilitado;
- acesso normal do sistema por usuário autenticado;
- chave publicável somente no frontend;
- chave secreta/service role somente em backend/Edge Function;
- nenhuma credencial secreta em GitHub;
- dados de demonstração marcados como fictícios;
- validação humana persistida antes da consolidação de conhecimento.

A configuração do banco está documentada em docs/SUPABASE.md e a migração estrutural em supabase/migrations/20261007_nexus_mvp.sql.

## 42. DOCUMENTAÇÃO E DIAGRAMAS

Os diagramas oficiais do projeto ficam descritos em:
- docs/ARQUITETURA_MVP.md
- docs/MODELO_DADOS.md
- docs/DIAGRAMAS.md

## 43. PARTE 4 — REGRA DE EXECUÇÃO

A Parte 4 não deve ser considerada concluída somente porque o schema existe.

Ela será considerada concluída quando:
1. modelo e relacionamentos estiverem implementados;
2. migração de dados estiver validada;
3. frontend conseguir persistir e consultar dados;
4. autenticação/permissões estiverem funcionais;
5. RLS estiver validado;
6. fluxo completo do chamado estiver funcional;
7. validação humana estiver registrada;
8. conhecimento puder ser criado a partir de atendimento aprovado;
9. indicadores forem derivados do banco;
10. npm ci, npm run check e npm run build passarem;
11. Vercel publicar o Angular corretamente;
12. o PR da fase estiver revisado e mesclado.

Até lá, documentar como em implementação, não como concluída.