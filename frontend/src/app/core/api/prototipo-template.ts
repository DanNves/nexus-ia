// Kit do protótipo gerado: reproduz o template oficial do PROTÓTIPO (frontend/template/shadcn-dashboard, estilo
// shadcn "base-lyra") em HTML + CSS puros, para as telas que a IA (hoje, o simulador) sugere ao solicitante.
// Vale SÓ para o que é gerado (CLAUDE.md §5.5 e §12): a interface do NEXUS não usa este kit nem este visual.
//
// Equivalências com o template (guia em frontend/template/README.md):
//   documento()   → src/css/globals.css (tokens :root, neutros do shadcn) + base do style-lyra.css
//   casca()       → src/layouts/full/FullLayout.tsx (Sidebar variant inset + SidebarInset + Header)
//   cartao()      → .cn-card (lyra: sem raio, anel de 1px, p-4, text-xs/relaxed)
//   kpis()        → views/dashboards: blocos encostados (grade com 1px de borda)
//   tabela()      → .cn-table · badge() → .cn-badge · botao() → .cn-button · campo() → .cn-field + .cn-input
//
// Segurança (CLAUDE.md §19): o HTML sai sem scripts e vai para <nx-prototipo> (iframe com sandbox vazio). Texto vindo
// do usuário entra SEMPRE por esc(); os helpers recebem trechos já escapados ou fixos do sistema.

export function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

// Tokens do template (oklch convertidos para hex): neutros do shadcn, primária quase preta, raio 8px.
// O protótipo é a aplicação do SOLICITANTE, não o NEXUS: por isso não leva o azul NEXUS.
const CSS = `:root{--background:#fff;--foreground:#0a0a0a;--card:#fff;--primary:#171717;--primary-foreground:#fafafa;
--secondary:#f5f5f5;--muted:#f5f5f5;--muted-foreground:#737373;--accent:#f5f5f5;--border:#e5e5e5;--input:#e5e5e5;--ring:#a1a1a1;
--destructive:#e7000b;--success:#00a63e;--warning:#d08700;--sidebar:#fafafa;--sidebar-border:#e5e5e5;--sidebar-accent:#f5f5f5;--radius:8px;
--font:'Geist',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif}
*{box-sizing:border-box;margin:0;padding:0;border-color:var(--border)}
html,body{height:100%}
body{font:12px/1.6 var(--font);color:var(--foreground);background:var(--background);-webkit-font-smoothing:antialiased}
h1,h2,h3{font-weight:600;line-height:1.3}
svg{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.app{display:flex;min-height:100%;background:var(--sidebar)}
.sb{width:200px;flex:none;display:flex;flex-direction:column;gap:8px;padding:8px}
.sb-marca{display:flex;align-items:center;gap:8px;height:40px;padding:0 8px;font-size:13px;font-weight:600}
.sb-logo{display:grid;place-items:center;width:28px;height:28px;border-radius:var(--radius);background:var(--primary);color:var(--primary-foreground)}
.sb-logo svg{width:15px;height:15px}
.sb-titulo{padding:0 8px;height:32px;display:flex;align-items:center;font-size:11px;font-weight:500;color:var(--muted-foreground)}
.sb-item{display:flex;align-items:center;gap:8px;height:32px;padding:0 8px;border-radius:6px;color:var(--foreground);white-space:nowrap;overflow:hidden}
.sb-item.on{background:var(--sidebar-accent);font-weight:500}
.sb-usuario{margin-top:auto;display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px}
.sb-usuario span{display:flex;flex-direction:column;line-height:1.3;min-width:0}.sb-usuario small{color:var(--muted-foreground);font-size:11px}
.av{width:28px;height:28px;flex:none;border-radius:50%;background:var(--muted);border:1px solid var(--border);display:grid;place-items:center;font-size:11px;font-weight:600;color:var(--muted-foreground)}
.inset{flex:1;min-width:0;margin:8px 8px 8px 0;background:var(--background);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;overflow:hidden}
.hd{display:flex;align-items:center;gap:8px;height:48px;padding:0 16px;border-bottom:1px solid var(--border)}
.hd-sep{width:1px;height:16px;background:var(--border)}
.trilha{display:flex;gap:6px;color:var(--muted-foreground)}.trilha b{color:var(--foreground);font-weight:500}
.sp{flex:1}
.busca{display:flex;align-items:center;gap:6px;height:32px;width:180px;padding:0 10px;border:1px solid var(--input);border-radius:6px;color:var(--muted-foreground)}
.ico{display:grid;place-items:center;width:32px;height:32px;border-radius:6px;color:var(--foreground)}
main{padding:16px;display:grid;gap:16px;align-content:start}
.pg{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}.pg h1{font-size:18px}.pg p{color:var(--muted-foreground)}
.mut{color:var(--muted-foreground)}
.card{background:var(--card);box-shadow:0 0 0 1px rgba(10,10,10,.1);display:flex;flex-direction:column;gap:16px;padding:16px 0}
.card-hd{padding:0 16px;display:flex;flex-direction:column;gap:4px}.card-hd h2{font-size:13px;font-weight:500}.card-hd p{color:var(--muted-foreground)}
.card-ct{padding:0 16px}.card-ft{border-top:1px solid var(--border);padding:12px 16px 0;display:flex;gap:8px;justify-content:flex-end}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--border);border:1px solid var(--border)}
.kpi{background:var(--card);padding:14px 16px;display:flex;flex-direction:column;gap:4px}
.kpi b{font-size:22px;font-weight:600;line-height:1.2}.kpi small{color:var(--muted-foreground)}
table{width:100%;border-collapse:collapse}
th{height:36px;padding:0 8px;text-align:left;font-weight:500;color:var(--muted-foreground);border-bottom:1px solid var(--border);white-space:nowrap}
td{padding:8px;border-bottom:1px solid var(--border)}tr:last-child td{border-bottom:0}
.bdg{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:6px;border:1px solid transparent;font-size:11px;font-weight:500;white-space:nowrap;background:var(--primary);color:var(--primary-foreground)}
.bdg.secondary{background:var(--secondary);color:var(--foreground)}
.bdg.outline{background:transparent;border-color:var(--border);color:var(--foreground)}
.bdg.sucesso{background:color-mix(in srgb,var(--success) 12%,transparent);color:var(--success)}
.bdg.aviso{background:color-mix(in srgb,var(--warning) 14%,transparent);color:var(--warning)}
.bdg.destrutivo{background:color-mix(in srgb,var(--destructive) 10%,transparent);color:var(--destructive)}
.btn{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 10px;border-radius:6px;border:1px solid transparent;font-size:12px;font-weight:500;white-space:nowrap;background:var(--primary);color:var(--primary-foreground)}
.btn.outline{background:var(--background);border-color:var(--border);color:var(--foreground)}
.btn.secondary{background:var(--secondary);color:var(--foreground)}
.btn.ghost{background:transparent;color:var(--foreground)}
.btn.sm{height:28px;border-radius:0;padding:0 10px}
.btn svg{width:14px;height:14px}
.campos{display:grid;gap:12px}
.campo{display:flex;flex-direction:column;gap:6px}.campo>span{font-weight:500}
.in{display:flex;align-items:center;height:32px;padding:0 10px;border:1px solid var(--input);border-radius:6px;color:var(--muted-foreground)}
.in.alto{height:72px;align-items:flex-start;padding-top:8px}
.linha{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.filtro{margin-bottom:12px}.filtro .in{width:220px}
.grade2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.janela{margin:12px;border:1px solid #d4d4d4;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(133,146,173,.2)}
.janela-tt{display:flex;align-items:center;gap:6px;height:30px;padding:0 10px;background:#f0f0f0;border-bottom:1px solid #d4d4d4;color:var(--muted-foreground);font-size:11px}
.janela-tt i{width:10px;height:10px;border-radius:50%;background:#d4d4d4}
.palco-cel{min-height:100%;display:grid;place-items:center;padding:16px;background:var(--muted)}
.cel{width:270px;height:500px;border:8px solid #0a0a0a;border-radius:32px;overflow:hidden;background:var(--background);display:flex;flex-direction:column}
.cel .hd{height:52px}.cel main{flex:1;padding:14px;gap:12px;overflow:hidden}
.tabbar{display:flex;border-top:1px solid var(--border);height:52px}
.tabbar span{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:10px;color:var(--muted-foreground)}
.tabbar span.on{color:var(--foreground);font-weight:500}
@media (max-width:620px){.sb{width:52px}.sb-marca span,.sb-titulo,.sb-item span,.sb-usuario span{display:none}.busca{width:auto}.busca span{display:none}.grade2{grid-template-columns:1fr}}`;

// Ícones no traço do template (Lucide). Só SVG estático: nada executável.
const ICONES = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  grafico: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  busca: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sino: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  painel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  chave: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  atividade: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  arquivo: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  usuario: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  local: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  caixa: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
} as const;
export type Icone = keyof typeof ICONES;

export const icone = (nome: Icone) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;

/** Página completa do protótipo (o que vai para o srcdoc do iframe). */
export function documento(corpo: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head><body>${corpo}</body></html>`;
}

export interface ItemMenu { rotulo: string; icone: Icone }

/** Casca do template: menu lateral (marca, seção, itens, usuário) + área contornada com cabeçalho e conteúdo. */
export function casca(o: { marca: string; secao: string; menu: ItemMenu[]; ativo: string; conteudo: string }) {
  const itens = o.menu
    .map((i) => `<div class="sb-item${i.rotulo === o.ativo ? ' on' : ''}">${icone(i.icone)}<span>${i.rotulo}</span></div>`)
    .join('');
  return `<div class="app"><aside class="sb"><div class="sb-marca"><span class="sb-logo">${icone('caixa')}</span><span>${o.marca}</span></div>`
    + `<div><p class="sb-titulo">${o.secao}</p>${itens}</div>`
    + `<div class="sb-usuario"><span class="av">US</span><span><b>Usuário</b><small>usuario@empresa.com</small></span></div></aside>`
    + `<div class="inset"><header class="hd"><span class="ico">${icone('painel')}</span><span class="hd-sep"></span>`
    + `<span class="trilha"><span>${o.secao}</span><span>/</span><b>${o.ativo}</b></span><span class="sp"></span>`
    + `<span class="busca">${icone('busca')}<span>Buscar…</span></span><span class="ico">${icone('sino')}</span></header>`
    + `<main>${o.conteudo}</main></div></div>`;
}

/** Moldura de janela de computador (cenário desktop). */
export const janela = (titulo: string, corpo: string) =>
  `<div class="janela"><div class="janela-tt"><i></i><i></i><i></i><span>${titulo}</span></div>${corpo}</div>`;

/** Moldura de celular com cabeçalho e barra de abas (cenário mobile). */
export function celular(o: { marca: string; abas: ItemMenu[]; ativa: string; conteudo: string }) {
  const abas = o.abas.map((a) => `<span class="${a.rotulo === o.ativa ? 'on' : ''}">${icone(a.icone)}${a.rotulo}</span>`).join('');
  return `<div class="palco-cel"><div class="cel"><header class="hd"><b>${o.marca}</b><span class="sp"></span><span class="ico">${icone('sino')}</span></header>`
    + `<main>${o.conteudo}</main><nav class="tabbar">${abas}</nav></div></div>`;
}

export const cabecalhoPagina = (titulo: string, descricao = '', acoes = '') =>
  `<div class="pg"><div><h1>${titulo}</h1>${descricao ? `<p>${descricao}</p>` : ''}</div><span class="sp"></span>${acoes}</div>`;

export const cartao = (o: { titulo?: string; descricao?: string; corpo: string; rodape?: string }) =>
  `<section class="card">${o.titulo ? `<div class="card-hd"><h2>${o.titulo}</h2>${o.descricao ? `<p>${o.descricao}</p>` : ''}</div>` : ''}`
  + `<div class="card-ct">${o.corpo}</div>${o.rodape ? `<div class="card-ft">${o.rodape}</div>` : ''}</section>`;

export const kpis = (itens: { rotulo: string; valor: string; detalhe?: string }[]) =>
  `<div class="kpis">${itens.map((k) => `<div class="kpi"><span class="mut">${k.rotulo}</span><b>${k.valor}</b>${k.detalhe ? `<small>${k.detalhe}</small>` : ''}</div>`).join('')}</div>`;

export const tabela = (colunas: string[], linhas: string[][]) =>
  `<table><thead><tr>${colunas.map((c) => `<th>${c}</th>`).join('')}</tr></thead>`
  + `<tbody>${linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

export type VarianteBadge = 'default' | 'secondary' | 'outline' | 'sucesso' | 'aviso' | 'destrutivo';
export const badge = (texto: string, variante: VarianteBadge = 'secondary') =>
  `<span class="bdg${variante === 'default' ? '' : ' ' + variante}">${texto}</span>`;

export type VarianteBotao = 'default' | 'outline' | 'secondary' | 'ghost';
export const botao = (texto: string, variante: VarianteBotao = 'default', o: { icone?: Icone; pequeno?: boolean } = {}) =>
  `<span class="btn${variante === 'default' ? '' : ' ' + variante}${o.pequeno ? ' sm' : ''}">${o.icone ? icone(o.icone) : ''}${texto}</span>`;

export const campo = (rotulo: string, exemplo: string, alto = false) =>
  `<label class="campo"><span>${rotulo}</span><span class="in${alto ? ' alto' : ''}">${exemplo}</span></label>`;
