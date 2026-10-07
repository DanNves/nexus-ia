# NEXUS — Supabase

## 1. Papel

O Supabase é a camada de persistência gerenciada do MVP consolidado.

Stack:
- PostgreSQL;
- Data API;
- Row Level Security;
- Auth, quando a autenticação do MVP for ativada;
- Storage somente se surgir necessidade real.

## 2. Estado

O banco Supabase do projeto de preview conectado ao NEXUS foi provisionado.

O schema encontrado já contém:

`people`, `solutions`, `versions`, `demands`, `activities`, `requirements`, `tickets`, `ai_suggestions`, `knowledge`, `comments`, `record_links` e `audit_events`.

Todas as tabelas encontradas estão com RLS habilitado.

As políticas atuais permitem acesso completo ao papel `authenticated`. Não foi criada política aberta para `anon`. Isso é intencional: o frontend não deve ganhar escrita pública antes da autenticação.

## 3. Segurança

Para aplicações de navegador, o Supabase recomenda usar a chave publicável e proteger os dados com RLS. Chaves secretas/service role nunca devem chegar ao navegador. 

O NEXUS seguirá:

```
Angular
  |
  | publishable key
  v
Supabase Data API
  |
  | RLS
  v
PostgreSQL
```

Após autenticação:

```
Usuário → Auth → JWT → Data API → RLS → dados permitidos
```

## 4. Credenciais

Não armazenar:
- secret key;
- service role;
- senha do banco;
- tokens administrativos

no GitHub.

No Vercel, as variáveis devem ser cadastradas como ambiente de produção/preview conforme a necessidade:

- `SUPABASE_URL` ou variável equivalente adotada pelo frontend;
- `SUPABASE_PUBLISHABLE_KEY`.

Como o Angular roda no navegador, apenas a chave publicável pode ser incorporada ao bundle.

## 5. Migrações

A estrutura versionável deve ficar em:

`supabase/migrations/`

A migração deve ser idempotente quando possível e nunca apagar dados de produção sem operação explícita.

## 6. Política de dados

- Dados seed são fictícios.
- Dados reais de usuários não devem ser usados na demonstração.
- O TCC não deve apresentar seed como resultado experimental.
- Conhecimento só deve ser consolidado após validação humana.
- Auditoria deve preservar a decisão.

## 7. Transição localStorage → Supabase

A migração deve ocorrer em etapas:

1. manter o modelo TypeScript;
2. criar repositório Supabase;
3. carregar dados remotos;
4. mapear dados para os modelos do frontend;
5. persistir novas operações no Supabase;
6. manter localStorage apenas como fallback temporário;
7. migrar seeds;
8. testar reload;
9. remover dependência de localStorage como fonte principal.

## 8. Teste de segurança

Antes de produção:
- usuário não autenticado não deve acessar dados protegidos;
- usuário autenticado deve acessar somente o permitido;
- secret/service role não deve existir no bundle;
- políticas RLS devem ser testadas;
- chamadas de API devem retornar erro compreensível quando não autorizadas.

## 9. Referências técnicas

A documentação oficial do Supabase descreve o Data API como uma API REST gerada sobre o PostgreSQL e orienta combinar chave publicável com RLS. urlSupabase Data APIhttps://supabase.com/docs/guides/api

A inicialização do cliente JavaScript utiliza URL do projeto e chave publicável. urlSupabase JavaScript — Initializinghttps://supabase.com/docs/reference/javascript/initializing

Para Angular, o próprio Supabase possui tutorial oficial de integração com Database/Auth/RLS. urlSupabase + Angularhttps://supabase.com/docs/guides/getting-started/tutorials/with-angular
