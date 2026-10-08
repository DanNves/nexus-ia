# NEXUS — Arquitetura do MVP

## 1. Objetivo

A arquitetura do NEXUS existe para preservar, recuperar e utilizar o contexto produzido no desenvolvimento de uma solução de software durante o suporte.

O princípio arquitetural é:

**desenvolvimento produz contexto → persistência preserva → suporte recupera → IA sugere → humano valida → sistema consolida conhecimento.**

## 2. Visão geral

```
[Navegador]
     |
     v
[Angular 22]
     |
     +--> Router / páginas
     +--> Store / Signals
     +--> Recuperação de contexto
     +--> Regras de status
     +--> Validação humana
     |
     v
[API REST Django]
     |
     v
[SQLite — localhost]
     |
     +--> pessoas
     +--> demandas
     +--> atividades
     +--> requisitos
     +--> soluções
     +--> versões
     +--> chamados
     +--> sugestões IA
     +--> conhecimento
     +--> relacionamentos
     +--> comentários
     +--> auditoria

[GitHub] --> fonte oficial do código e CI
[Vercel] --> publicação do Angular
[Lovable] --> preview/apoio visual
```

## 3. Camadas

### Apresentação

Angular 22, standalone components, Router, Signals e componentes compartilhados.

Responsabilidades:
- apresentar registros;
- coletar dados;
- orientar o fluxo;
- exibir relações;
- deixar evidente a validação humana;
- não conter regras de persistência espalhadas.

### Aplicação e contexto

O Store e serviços do NEXUS concentram:
- recuperação de contexto;
- derivados reativos;
- regras de mudança de status;
- criação/atualização de registros;
- preparação da sugestão simulada;
- validação humana;
- consolidação do conhecimento.

### Persistência

O backend Django com SQLite (localhost) é o destino persistente do MVP consolidado.

O Angular consulta e altera dados somente pela API REST do Django, que valida as entradas e aplica as permissões. Segredos nunca são colocados no navegador.

### Publicação

GitHub → CI → Vercel.

O build deve gerar:

`dist/nexus-ia/browser`

## 4. Fluxo do chamado

```
Chamado
  |
  v
Recuperar contexto
  |
  +--> Demanda
  +--> Atividade
  +--> Requisito
  +--> Solução
  +--> Versão
  +--> Chamados anteriores
  +--> Conhecimento
  |
  v
Simulação controlada de IA
  |
  v
Sugestão
  |
  v
Humano aprova / edita / rejeita
  |
  +--> rejeitada -> revisão do chamado
  |
  +--> aprovada -> pode consolidar conhecimento
```

## 5. Rastreabilidade

A rastreabilidade deve ser representada por IDs estáveis e pela tabela `record_links`.

Exemplo de demonstração:

```
DEM-012
   |
REQ-014
   |
VER-120
   |
CH-028
   |
KB-007
```

A existência de uma relação não deve depender do texto do título.

## 6. Segurança

- Autorização feita pela autenticação/permissões do Django.
- Toda entrada é validada no backend.
- Segredos nunca aparecem no Angular.
- Dados fictícios devem permanecer identificáveis.
- Auditoria deve registrar alterações relevantes e decisões humanas.

## 7. Fallback

Durante a migração, localStorage pode continuar como fallback para demonstração e recuperação de dados locais.

O fallback não deve criar uma segunda fonte de verdade permanente. A meta é:

**API Django + SQLite = persistência principal.**

## 8. O que não pertence à arquitetura do MVP

Não fazem parte do núcleo:
- LLM real obrigatório;
- RAG vetorial real;
- geração de código;
- execução autônoma;
- infraestrutura própria;
- aplicativo mobile nativo;
- dezenas de integrações externas.

A arquitetura pode permitir evolução futura sem exigir essas funcionalidades agora.
