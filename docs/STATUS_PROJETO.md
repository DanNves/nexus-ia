# NEXUS — Status da Consolidação

Data: 2026-10-07

## Estado geral

O repositório principal agora está consolidado como Angular 22.

### GitHub

- Repositório: DanNves/nexus-ia
- branch principal: main
- consolidação: PR #26 mesclada
- commit de consolidação: 75d3a89905b7e7fa30026e36f95f489d63aaadb4
- React/TanStack legado removido do runtime principal
- package.json alinhado ao Angular
- TypeScript alinhado ao Angular
- documentação técnica atualizada

### Vercel

- projeto configurado como Angular
- Node 24.x
- instalação: npm ci
- build: npm run build
- produção: READY
- domínio principal: nexus-ia-self.vercel.app
- runtime errors nas últimas 1h: nenhum
- build de produção validado pela Vercel

### Supabase

- banco PostgreSQL provisionado
- RLS habilitado nas tabelas existentes
- políticas atuais para authenticated
- nenhuma escrita anônima liberada
- schema contempla pessoas, demandas, atividades, requisitos, soluções, versões, chamados, IA, conhecimento, comentários, relações e auditoria

### Pendente

1. integrar Angular com a camada de persistência Supabase;
2. concluir Supabase Auth;
3. validar RLS por perfil;
4. migrar/confirmar seeds;
5. substituir localStorage como fonte principal;
6. concluir a Fase 6 de arquitetura;
7. executar/regularizar GitHub Actions, pois não há workflow run registrado no commit de consolidação;
8. corrigir warnings Angular restantes;
9. executar testes funcionais completos do fluxo DEMANDA → REQUISITO → VERSÃO → CHAMADO → CONTEXTO → IA → VALIDAÇÃO → CONHECIMENTO.

## Decisão arquitetural

O Supabase é uma evolução posterior à Fase 4 original. A Fase 4 histórica continua registrada com localStorage e seus critérios próprios. O novo banco não deve ser apresentado como se tivesse sido implementado naquela fase.

## Critério para considerar o MVP realmente pronto

O MVP só deve ser considerado fechado quando o fluxo completo persistir e recuperar dados do Supabase, houver autenticação/RLS funcionando, o conhecimento validado puder ser reutilizado, o build/CI estiver verde e a demonstração acadêmica puder ser executada sem intervenção técnica manual.
