import * as React from "react";
import { Bell, BookOpen, CheckSquare, ClipboardList, Headset, Home, Layers3, BarChart3, Settings } from "lucide-react";

import { createFileRoute } from "@tanstack/react-router";
import "../nexus-app.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS — Conexão entre Demanda, Desenvolvimento e Suporte" },
      { name: "description", content: "Plataforma web que preserva o contexto produzido durante o desenvolvimento de uma solução de software e o utiliza no atendimento de chamados de suporte, com IA generativa e validação humana." },
    ],
  }),
  component: Index,
});

type View = "Dashboard" | "Demandas" | "Requisitos" | "Produtos e Versões" | "Chamados" | "Conhecimento" | "Indicadores" | "Configurações";

const menu: {label: View; icon: React.ComponentType<{size?: number; strokeWidth?: number}>}[] = [
  { label: "Dashboard", icon: Home }, { label: "Demandas", icon: ClipboardList }, { label: "Requisitos", icon: CheckSquare },
  { label: "Produtos e Versões", icon: Layers3 }, { label: "Chamados", icon: Headset }, { label: "Conhecimento", icon: BookOpen },
  { label: "Indicadores", icon: BarChart3 }, { label: "Configurações", icon: Settings },
];

const recent = [
  { icon: "+", text: "Nova demanda criada para o módulo de pagamentos.", time: "Há 2 horas", user: "Ana Costa", tone: "blue" },
  { icon: "✓", text: "Requisito REQ-214 validado com sucesso.", time: "Há 5 horas", user: "Rafael Dias", tone: "green" },
  { icon: "▤", text: "Chamado #4421 resolvido — erro de login.", time: "Ontem", user: "Suporte N1", tone: "orange" },
  { icon: "◆", text: "Release v2.4.0 publicado em produção.", time: "Ontem", user: "DevOps", tone: "purple" },
];

const records: Record<Exclude<View, "Dashboard">, { title: string; description: string; action: string; rows: string[] }> = {
  Demandas: { title: "Demandas", description: "Registre e acompanhe as necessidades que originam novas soluções.", action: "+ Nova Demanda", rows: ["Sistema de Atendimento — Em análise", "Portal do Cliente — Aprovada", "Relatório Financeiro — Concluída"] },
  Requisitos: { title: "Requisitos", description: "Organize requisitos, regras de negócio e critérios de aceitação.", action: "+ Novo Requisito", rows: ["REQ-214 — Recuperação de senha", "REQ-215 — Cadastro de usuários", "REQ-216 — Notificação de atendimento"] },
  "Produtos e Versões": { title: "Produtos e Versões", description: "Relacione soluções, versões publicadas e requisitos vinculados.", action: "+ Novo Produto", rows: ["Sistema de Atendimento — v2.4.0", "Portal do Cliente — v1.8.2", "Central de Relatórios — v3.1.0"] },
  Chamados: { title: "Chamados", description: "Atenda chamados mantendo o contexto produzido durante o desenvolvimento.", action: "+ Novo Chamado", rows: ["#4421 — Erro de login — Em atendimento", "#4420 — Relatório não carrega — Resolvido", "#4419 — Usuário sem acesso — Aberto"] },
  Conhecimento: { title: "Base de Conhecimento", description: "Reutilize soluções validadas e preserve conhecimento dos atendimentos.", action: "+ Novo Conhecimento", rows: ["Recuperação de senha — 12 utilizações", "Erro de envio de e-mail — 7 utilizações", "Permissão de usuário — 4 utilizações"] },
  Indicadores: { title: "Indicadores", description: "Acompanhe os dados utilizados para avaliar a contribuição do NEXUS.", action: "Exportar", rows: ["Tempo médio de atendimento", "Sugestões da IA: aceitas, editadas e rejeitadas", "Reuso do conhecimento e avaliação dos profissionais"] },
  Configurações: { title: "Configurações", description: "Gerencie usuários, preferências e parâmetros do sistema.", action: "Salvar alterações", rows: ["Usuários e permissões", "Preferências da plataforma", "Parâmetros da IA e validação"] },
};

function Sidebar({ active, onChange }: { active: View; onChange: (view: View) => void }) {
  return <aside className="sidebar"><div className="brand"><div className="brand-mark">N</div><span>NEXUS</span></div><nav>{menu.map((item) => <button key={item.label} className={active === item.label ? "nav-item active" : "nav-item"} onClick={() => onChange(item.label)}><span className="nav-icon"><item.icon size={15} strokeWidth={1.8} /></span><span>{item.label}</span></button>)}</nav><div className="sidebar-footer"><div className="mini-mark">N</div><span>Conectando pessoas,<br/>tecnologia e soluções.</span></div></aside>;
}

function NotificationIcon() {
  return <span className="notification-icon" aria-label="Notificações" title="Notificações"><Bell size={17} strokeWidth={1.8} /></span>;
}

function Header() {
  return <header className="topbar">
    <div className="top-brand"><div className="top-mark">N</div><div className="top-brand-text"><strong>NEXUS</strong><small>CONEXÃO ENTRE DEMANDA, DESENVOLVIMENTO E SUPORTE</small></div></div>
    <div className="top-actions"><div className="search">⌕ <span>Pesquisar...</span></div><NotificationIcon/><div className="user"><span>Usuário<small>ADMIN</small></span><div className="avatar">U</div></div></div>
  </header>;
}

function Dashboard({ onChange }: { onChange: (view: View) => void }) {
  return <div className="content"><div className="page-heading"><div><h1>Painel de Controle</h1><p>Bem-vindo ao Nexus, aqui está o resumo operacional de hoje.</p></div><button className="primary" onClick={() => onChange("Demandas")}>+ Nova Demanda</button></div><section className="stats"><Stat title="Total de Demandas" value="124" trend="+12% vs mês anterior" icon="⚑" tone="blue"/><Stat title="Chamados Abertos" value="15" trend="-8% vs mês anterior" icon="▤" tone="orange"/><Stat title="Produtos Ativos" value="8" trend="Em 3 ambientes" icon="▰" tone="purple"/><Stat title="Saúde do Sistema" value="98%" trend="Operacional estável" icon="♥" tone="green"/></section><section className="dashboard-grid"><div className="panel trend-panel"><div className="panel-head"><div><h2>Tendência de Demandas</h2><span>Volume de demandas registradas</span></div><small>Últimos 6 meses</small></div><div className="chart"><div className="y-labels"><span>35</span><span>30</span><span>25</span><span>20</span><span>15</span><span>10</span><span>5</span></div><svg viewBox="0 0 600 190" preserveAspectRatio="none"><path d="M0 145 L120 105 L240 125 L360 62 L480 88 L600 30 L600 190 L0 190 Z" fill="rgba(52,112,245,.08)"/><path d="M0 145 L120 105 L240 125 L360 62 L480 88 L600 30" fill="none" stroke="#3470f5" strokeWidth="2.5"/></svg><div className="x-labels"><span>Dez</span><span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span></div></div></div><div className="panel activity"><div className="panel-head"><div><h2>Atividade Recente</h2><span>Últimas atualizações</span></div></div>{recent.map((item, i) => <div className="activity-item" key={i}><span className={"activity-icon " + item.tone}>{item.icon}</span><div><p>{item.text}</p><small>{item.time} • {item.user}</small></div></div>)}</div></section></div>;
}

function Stat({ title, value, trend, icon, tone }: { title: string; value: string; trend: string; icon: string; tone: string }) {
  return <article className="stat-card"><div className={"stat-icon " + tone}>{icon}</div><span>{title}</span><strong>{value}</strong><small className={tone === "orange" ? "negative" : ""}>{trend}</small></article>;
}

function ModuleView({ view }: { view: Exclude<View, "Dashboard"> }) {
  const data = records[view];
  return <div className="content"><div className="page-heading"><div><h1>{data.title}</h1><p>{data.description}</p></div><button className="primary">{data.action}</button></div><div className="module-panel"><div className="module-toolbar"><div className="module-search">⌕ <span>Pesquisar...</span></div><select><option>Todos os status</option></select></div>{data.rows.map((row) => <div className="module-row" key={row}><div><strong>{row.split(" — ")[0]}</strong><span>{row.split(" — ").slice(1).join(" — ")}</span></div><button>Ver detalhes →</button></div>)}</div></div>;
}

function Index() {
  const [active, setActive] = React.useState<View>("Dashboard");
  return <div className="app"><Sidebar active={active} onChange={setActive}/><div className="main"><Header/>{active === "Dashboard" ? <Dashboard onChange={setActive}/> : <ModuleView view={active}/>}</div></div>;
}

