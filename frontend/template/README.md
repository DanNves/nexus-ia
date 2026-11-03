# Template visual oficial do NEXUS

`shadcn-dashboard/` é o **template de referência da interface** (Shadcn Dashboard Free, licença MIT, React 19 + Vite + Tailwind v4 + Base UI, estilo shadcn `base-lyra`).
Decisão do autor (2026-11-03): **toda tela ou componente novo do NEXUS segue este template** — layout, espaçamentos, tipografia, cores, estados e padrões de componente.

O NEXUS **continua em Angular** (`frontend/src`). O template **não é compilado nem importado**: ele é a fonte visual que o Angular reproduz em CSS próprio (sem React, sem Tailwind, sem dependência nova).

## Como usar

1. Antes de criar ou alterar uma tela, procure no template a tela ou o componente equivalente (tabela abaixo).
2. Reproduza no Angular a **estrutura** (hierarquia de elementos) e o **visual** (tokens de `src/css/globals.css` e classes de `src/css/styles/style-lyra.css`), usando os componentes oficiais de `frontend/src/app/shared/` e as classes globais de `frontend/src/styles.css`.
3. Se o componente ainda não existe no Angular, crie **um** componente oficial em `shared/` a partir do equivalente do template (CLAUDE.md §12: um componente por tipo) e registre-o em `claude/front/padroes.md`.
4. Não copie conteúdo de demonstração do template (produtos, blog, fotos, textos em inglês). Só o visual e a estrutura.

Para ver o template rodando (opcional): `cd frontend/template/shadcn-dashboard && npm install && npm run dev` → http://localhost:5173.

## Onde olhar no template

| Precisa de… | Arquivo no template |
|---|---|
| Tokens (cores, raio, fontes, modo escuro) | `src/css/globals.css` (`:root` e `.dark`) |
| Visual de cada componente (`cn-button`, `cn-card`, `cn-badge`…) | `src/css/styles/style-lyra.css` |
| Casca da aplicação (sidebar + cabeçalho + conteúdo) | `src/layouts/full/FullLayout.tsx`, `vertical/sidebar/*`, `vertical/header/*` |
| Itens e seções do menu lateral | `src/layouts/full/vertical/sidebar/sidebaritems.ts`, `nav-items/`, `nav-collapse/`, `NavUser.tsx` |
| Painel com indicadores e gráficos | `src/views/dashboards/`, `src/components/dashboards/` |
| Tabelas (busca, filtro, paginação) | `src/components/tables/`, `src/components/ui/table.tsx` |
| Formulários e campos | `src/components/form/`, `src/components/ui/{field,input,select,textarea,checkbox,radio-group,switch}.tsx` |
| Lista + detalhe de chamados (equivale à Fila) | `src/views/apps/tickets/`, `src/components/apps/tickets/` |
| Diálogo, gaveta, menu suspenso, abas, avisos | `src/components/ui/{dialog,sheet,drawer,dropdown-menu,tabs,sonner}.tsx` |
| Telas de acesso (entrar, criar conta) e erro 404 | `src/views/auth/` |
| Perfil do usuário | `src/views/pages/user-profile/`, `src/components/user-profile/` |
| Ícones | `lucide` (o Angular usa `shared/icon.component.ts`, com traços no estilo Lucide) |

## Adaptações do NEXUS sobre o template

- **Cor primária:** o template usa primária neutra (quase preta). O NEXUS mantém o **azul `#0878FF`** como `--primary`, e verde/laranja/roxo de `CLAUDE.md` §12 como sucesso/atenção/visão da equipe. Superfícies, bordas, texto e raio seguem o template.
- **Fonte:** Geist (arquivos em `frontend/public/fonts/`, copiados de `shadcn-dashboard/public/fonts/`).
- **Idioma:** tudo em português do Brasil.
- **Selos de IA:** todo conteúdo gerado continua marcado como sugestão e com quem valida (CLAUDE.md §3), mesmo que o template não tenha esse padrão.
- **Tela de acesso:** mantém a arte própria decidida em 2026-10-15; campos e botões seguem o template.

## Arquivos que não valem para o NEXUS

`_instrucoes-originais/` guarda as instruções que vieram com o template (CLAUDE.md, AGENTS.md e skills para desenvolver o próprio template em React). Foram renomeadas para não serem carregadas como regra do projeto. Para o NEXUS valem o `CLAUDE.md` da raiz e este arquivo.
