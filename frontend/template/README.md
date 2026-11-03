# Template do protótipo gerado

`shadcn-dashboard/` é o **template de referência das telas que a IA gera para o solicitante** (Shadcn Dashboard Free, licença MIT, React 19 + Vite + Tailwind v4 + Base UI, estilo shadcn `base-lyra`).

Decisão do autor (2026-11-03):

| Vale para | Não vale para |
|---|---|
| **Protótipo gerado** (`CLAUDE.md` §5.5): as telas de como ficaria a aplicação do solicitante, mostradas na aba Protótipo da demanda | **Interface do NEXUS** (navbar, páginas, componentes, tela de acesso). Ela mantém o padrão próprio (`CLAUDE.md` §10 e §12, `frontend/src/styles.css`) |
| Futuras telas/templates gerados que forem para o ADM (§30 #10) | Qualquer outra tela do sistema |

Histórico: no mesmo dia o template chegou a ser aplicado à interface inteira (commit `e5719f7`). Isso foi desfeito (`7b6e7d0`), porque o pedido era usá-lo só no que a IA gera.

## Como o template entra no protótipo

O template **não é compilado nem importado**. É a fonte visual que o kit do protótipo reproduz em HTML + CSS puros:

**`frontend/src/app/core/api/prototipo-template.ts`**

| Função do kit | O que monta | Equivalente no template |
|---|---|---|
| `documento(corpo)` | página completa (vai para o `srcdoc` do iframe), com os tokens e o CSS | `src/css/globals.css` (`:root`) + `src/css/styles/style-lyra.css` |
| `casca({ marca, secao, menu, ativo, conteudo })` | menu lateral (marca, seção, itens com ícone, usuário no rodapé) + área contornada com cabeçalho (trilha, busca, notificações) | `src/layouts/full/FullLayout.tsx`, `vertical/sidebar/*`, `vertical/header/*`, `NavUser.tsx` |
| `janela(titulo, corpo)` | moldura de janela de computador (cenário desktop) | — (moldura do NEXUS) |
| `celular({ marca, abas, ativa, conteudo })` | moldura de celular com cabeçalho e barra de abas (cenário mobile) | — (moldura do NEXUS, com os componentes do template) |
| `cabecalhoPagina(titulo, descricao, acoes)` | título da página, descrição e ações | cabeçalho das views (`src/views/*`) |
| `cartao({ titulo, descricao, corpo, rodape })` | cartão lyra (sem raio, anel de 1px) | `.cn-card*` |
| `kpis([...])` | indicadores em blocos encostados | `src/views/dashboards/` |
| `tabela(colunas, linhas)` | tabela | `.cn-table`, `src/components/ui/table.tsx` |
| `badge(texto, variante)` | selo: `default`, `secondary`, `outline`, `sucesso`, `aviso`, `destrutivo` | `.cn-badge-variant-*` |
| `botao(texto, variante, { icone, pequeno })` | botão: `default`, `outline`, `secondary`, `ghost` | `.cn-button-variant-*`, `-size-sm` |
| `campo(rotulo, exemplo, alto)` | rótulo + campo de entrada (ou área de texto) | `.cn-field`, `.cn-input` |
| `icone(nome)` | ícone SVG no traço do Lucide (lista fechada em `ICONES`) | `lucide-react` |
| `esc(texto)` | escapa texto vindo do usuário | — |

Quem usa o kit hoje: `gerarPrototipo()` em `frontend/src/app/core/api/mock-ia.ts` (simulador), com telas para web, desktop, mobile, rotina agendada (job) e API.

## Regras

1. **Toda tela de protótipo é montada com o kit.** Não escreva CSS solto numa tela. Se o visual precisa mudar, mude o kit.
2. **Cores neutras do template, sem o azul NEXUS.** O protótipo mostra a aplicação do solicitante, não o NEXUS. A primária é a quase preta do shadcn; sucesso, aviso e erro vêm dos tokens do template.
3. **Segurança (`CLAUDE.md` §19):** nada de `<script>`, `on*=`, `javascript:` nem recurso externo. Texto do usuário entra sempre por `esc()`. O resultado é exibido em `<nx-prototipo>`, um iframe com `sandbox` vazio.
4. **Fonte:** pilha `Geist, ui-sans-serif, system-ui…`. O iframe sem origem não carrega arquivos de fonte, então na prática aparece a fonte do sistema. É intencional: nada de rede dentro do protótipo.
5. **Conteúdo:** em português, com dados fictícios genéricos. Não copiar conteúdo de demonstração do template (produtos, blog, fotos, textos em inglês).
6. **Selo de IA:** fica **fora** do iframe, na tela do NEXUS ("Gerado por… · ainda não validado", `CLAUDE.md` §3).
7. **Quando o protótipo for para o Django** (módulo `prototipo` + tarefa de IA): portar o kit para o backend, para que o sistema monte o HTML. A IA devolve só a **estrutura** das telas em JSON (telas, itens de menu, cartões, tabelas, campos), validada por esquema, e o sistema monta o HTML com o kit e sanitiza. A IA não escreve HTML livre.

## Onde olhar no template

| Precisa de… | Arquivo no template |
|---|---|
| Tokens (cores, raio, fontes) | `src/css/globals.css` (`:root`) |
| Visual de cada componente (`cn-button`, `cn-card`, `cn-badge`…) | `src/css/styles/style-lyra.css` |
| Casca (sidebar + cabeçalho + conteúdo) | `src/layouts/full/FullLayout.tsx`, `vertical/sidebar/*`, `vertical/header/*` |
| Painéis com indicadores | `src/views/dashboards/`, `src/components/dashboards/` |
| Tabelas | `src/components/tables/`, `src/components/ui/table.tsx` |
| Formulários | `src/components/form/`, `src/components/ui/{field,input,select,textarea}.tsx` |
| Lista + detalhe (ex.: chamados) | `src/views/apps/tickets/` |

Para ver o template rodando (opcional): `cd frontend/template/shadcn-dashboard && npm install && npm run dev` → http://localhost:5173.

## Arquivos que não valem para o NEXUS

`_instrucoes-originais/` guarda as instruções que vieram com o template (CLAUDE.md, AGENTS.md e skills para desenvolver o próprio template em React). Foram renomeadas para não serem carregadas como regra do projeto. Para o NEXUS valem o `CLAUDE.md` da raiz e este arquivo.
