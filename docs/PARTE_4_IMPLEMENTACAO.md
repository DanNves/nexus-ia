# NEXUS — Parte/Fase 4 — Dados, Modelo, Persistência e Rastreabilidade

## 1. Regra acadêmica

O documento original da Fase 4 define a fase como **plano de implementação**, não como declaração automática de conclusão. O documento também determinava que a aplicação permanecesse sem backend nessa fase e utilizasse localStorage.

Portanto, não devemos reescrever retroativamente o histórico.

A adoção do Supabase é registrada aqui como **evolução arquitetural posterior à Fase 4 original**, mantendo os critérios originais como referência de validação do modelo.

## 2. O que a Fase 4 original pediu

- modelos tipados de Solução e Versão;
- IDs estáveis;
- rastreabilidade Demanda → Atividade → Requisito → Versão → Chamado → Conhecimento;
- remoção de IDs fixos das telas;
- persistência versionada;
- migração resiliente;
- restauração dos dados de demonstração;
- indicadores derivados;
- transições de status válidas;
- página 404;
- TypeScript strict;
- instalação limpa e build;
- PR rastreável.

O documento original determina também que a IA continue sendo simulação controlada e que a validação humana seja obrigatória. fileciteturn0file0

## 3. O que já foi consolidado

No histórico do GitHub:
- Fase 4 foi mesclada;
- Fase 5 foi mesclada;
- Fase 6 está em desenvolvimento.

No código:
- SolutionEntity e VersionEntity existem;
- relatedIds/parentId existem;
- store possui persistência versionada;
- há recuperação de contexto;
- indicadores são derivados;
- há validação humana;
- há rota 404;
- há dados demo coerentes.

## 4. Evolução para Supabase

O banco passa a ser preparado como persistência principal do MVP consolidado.

Isso não significa que a Fase 4 original tenha sido diferente do que realmente foi.

A leitura correta é:

```
Fase 4 original
localStorage + modelo + rastreabilidade
        |
        v
consolidação posterior
Supabase/PostgreSQL + RLS + persistência compartilhada
```

## 5. Tarefas restantes da Parte 4 consolidada

### P4.1 — Contrato de dados

- alinhar todos os modelos TypeScript com o schema;
- eliminar divergências de nomes;
- definir mapeadores banco ↔ domínio;
- manter códigos funcionais legíveis.

### P4.2 — Repositório

Criar uma camada única para:
- listar;
- buscar por ID;
- criar;
- atualizar;
- alterar status;
- registrar comentários;
- registrar relações.

Componentes não devem chamar Supabase diretamente.

### P4.3 — Migração

- carregar seed atual;
- converter pessoas;
- converter soluções;
- converter versões;
- converter demandas;
- converter atividades;
- converter requisitos;
- converter chamados;
- converter conhecimento;
- converter relações;
- converter histórico de IA.

### P4.4 — Autenticação

Ativar Supabase Auth antes de liberar escrita no ambiente público.

Perfis iniciais:
- Administrador;
- Gestor;
- Analista/Suporte.

O usuário de demonstração continua identificado como fictício.

### P4.5 — RLS

Validar:
- usuário autenticado;
- leitura;
- criação;
- edição;
- validação de IA;
- criação de conhecimento;
- auditoria.

### P4.6 — Chamado

Garantir:

Chamado → contexto → sugestão → decisão humana → conhecimento.

### P4.7 — Indicadores

Derivar do banco:
- chamados abertos;
- validações pendentes;
- aprovações;
- rejeições;
- edições;
- conhecimento validado;
- reuso;
- cobertura de contexto.

### P4.8 — Testes

Testar:
1. criação de demanda;
2. criação de atividade;
3. criação de requisito;
4. criação de versão;
5. criação de chamado;
6. recuperação de contexto;
7. geração da sugestão simulada;
8. aprovação;
9. rejeição;
10. edição;
11. criação de conhecimento;
12. reuso;
13. reload;
14. acesso sem autorização;
15. rota 404.

### P4.9 — Infra

- npm ci;
- npm run check;
- npm run build;
- CI verde;
- Vercel com Angular;
- ambiente Supabase configurado;
- produção acessível.

## 6. Critério final de conclusão

A Parte 4 consolidada só será marcada como concluída quando todos os itens acima estiverem demonstrados e o PR correspondente estiver revisado e mesclado.

Até lá:

**STATUS: EM IMPLEMENTAÇÃO.**

## 7. O que não fazer

Não adicionar:
- LLM real;
- RAG vetorial;
- execução autônoma;
- geração de código;
- infraestrutura própria;
- funcionalidades não previstas.

Esses temas podem ser documentados como evolução futura.
