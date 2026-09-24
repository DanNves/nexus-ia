import * as React from "react";
import { Bell, BookOpen, CheckSquare, ClipboardList, Headset, Home, Layers3, BarChart3, Settings, ArrowUpRight, Clock3, BrainCircuit, Database, CircleCheck, CircleAlert, Sparkles } from "lucide-react";

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
  { icon: "+", text: "Nova demanda registrada: integração com atendimento.", time: "Hoje, 09:42", user: "Equipe de análise", tone: "blue" },
  { icon: "✓", text: "Requisito REQ-014 validado e vinculado à versão 1.2.0.", time: "Hoje, 08:17", user: "Analista responsável", tone: "green" },
  { icon: "!", text: "Chamado CH-028 aguarda validação da sugestão da IA.", time: "Ontem, 16:31", user: "Suporte", tone: "orange" },
  { icon: "◆", text: "Solução validada adicionada à Base de Conhecimento.", time: "Ontem, 14:05", user: "Equipe de suporte", tone: "purple" },
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
  return <aside className="sidebar"><div className="brand"><img className="brand-logo" src="/nexus-logo.svg" alt="NEXUS" /><span>NEXUS</span></div><nav>{menu.map((item) => <button key={item.label} className={active === item.label ? "nav-item active" : "nav-item"} onClick={() => onChange(item.label)}><span className="nav-icon"><item.icon size={15} strokeWidth={1.8} /></span><span>{item.label}</span></button>)}</nav><div className="sidebar-footer"><img className="mini-logo" src="/nexus-logo.svg" alt="" /><span>Conectando pessoas,<br/>tecnologia e soluções.</span></div></aside>;
}

function NotificationIcon() {
  return <span className="notification-icon" aria-label="Notificações" title="Notificações"><Bell size={17} strokeWidth={1.8} /></span>;
}

function Header() {
  return <header className="topbar">
    <div className="top-brand"><img className="top-logo" src="/nexus-logo.svg" alt="NEXUS" /><div className="top-brand-text"><strong>NEXUS</strong><small>CONEXÃO ENTRE DEMANDA, DESENVOLVIMENTO E SUPORTE</small></div></div>
    <div className="top-actions"><div className="search">⌕ <span>Pesquisar...</span></div><NotificationIcon/><div className="user"><span>Usuário<small>ADMIN</small></span><div className="avatar">U</div></div></div>
  </header>;
}

function Dashboard({ onChange }: { onChange: (view: View) => void }) {
  return <div className="content">
    <div className="page-heading">
      <div><h1>Painel de Controle</h1><p>Visão geral do ciclo de vida das soluções e do contexto utilizado pelo suporte.</p></div>
      <button className="primary" onClick={() => onChange("Demandas")}>+ Nova Demanda</button>
    </div>

    <section className="stats">
      <Stat title="Demandas em andamento" value="12" trend="4 aguardando análise" icon="⚑" tone="blue"/>
      <Stat title="Requisitos em validação" value="7" trend="2 atualizados hoje" icon="✓" tone="green"/>
      <Stat title="Chamados abertos" value="8" trend="3 com contexto recuperado" icon="▤" tone="orange"/>
      <Stat title="Sugestões IA pendentes" value="5" trend="Aguardando validação humana" icon="✦" tone="purple"/>
    </section>

    <section className="context-strip">
      <div className="context-title"><div className="context-icon"><BrainCircuit size={17}/></div><div><strong>Fluxo de contexto do NEXUS</strong><span>O desenvolvimento alimenta o suporte com informações rastreáveis.</span></div></div>
      <div className="context-flow">
        {["Demanda", "Requisitos", "Versão", "Chamado", "Contexto", "IA", "Validação", "Conhecimento"].map((item, i) => <React.Fragment key={item}><span className={i === 5 ? "flow-item highlight" : "flow-item"}>{item}</span>{i < 7 && <ArrowUpRight className="flow-arrow" size={12}/>}</React.Fragment>)}
      </div>
    </section>

    <section className="dashboard-grid">
      <div className="panel trend-panel">
        <div className="panel-head"><div><h2>Evolução do suporte</h2><span>Chamados recebidos e resolvidos ao longo do período</span></div><small>Últimos 6 meses</small></div>
        <div className="chart chart-dual"><div className="chart-legend"><span><i className="legend-dot received"></i>Chamados recebidos</span><span><i className="legend-dot resolved"></i>Chamados resolvidos</span></div><div className="y-labels"><span>30</span><span>25</span><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div><svg viewBox="0 0 600 190" preserveAspectRatio="none"><path d="M0 102 L120 88 L240 96 L360 70 L480 78 L600 50" fill="none" stroke="#3470f5" strokeWidth="2.5"/><path d="M0 128 L120 118 L240 126 L360 92 L480 102 L600 68" fill="none" stroke="#7b6ee8" strokeWidth="2.5"/><circle cx="0" cy="102" r="3" fill="#3470f5"/><circle cx="120" cy="88" r="3" fill="#3470f5"/><circle cx="240" cy="96" r="3" fill="#3470f5"/><circle cx="360" cy="70" r="3" fill="#3470f5"/><circle cx="480" cy="78" r="3" fill="#3470f5"/><circle cx="600" cy="50" r="3" fill="#3470f5"/><circle cx="0" cy="128" r="3" fill="#7b6ee8"/><circle cx="120" cy="118" r="3" fill="#7b6ee8"/><circle cx="240" cy="126" r="3" fill="#7b6ee8"/><circle cx="360" cy="92" r="3" fill="#7b6ee8"/><circle cx="480" cy="102" r="3" fill="#7b6ee8"/><circle cx="600" cy="68" r="3" fill="#7b6ee8"/></svg><div className="x-labels"><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span></div></div>
      </div>

      <div className="panel activity"><div className="panel-head"><div><h2>Atividade Recente</h2><span>Registros relevantes do fluxo</span></div></div>{recent.map((item, i) => <div className="activity-item" key={i}><span className={"activity-icon " + item.tone}>{item.icon}</span><div><p>{item.text}</p><small>{item.time} • {item.user}</small></div></div>)}</div>
    </section>

    <section className="dashboard-bottom">
      <div className="panel support-panel">
        <div className="panel-head"><div><h2>Chamados que precisam de atenção</h2><span>Itens do suporte relacionados ao contexto do desenvolvimento</span></div><button className="text-button" onClick={() => onChange("Chamados")}>Ver chamados →</button></div>
        {[["CH-028","Falha na autenticação","v1.2.0","Em validação","orange"],["CH-027","Relatório apresenta dados inconsistentes","v1.1.4","Em atendimento","blue"],["CH-025","Usuário sem permissão de acesso","v1.1.4","Aguardando contexto","purple"]].map(([id,title,version,status,tone]) => <div className="support-row" key={id}><div className="support-main"><strong>{id}</strong><span>{title}</span></div><span className="version">{version}</span><span className={"status "+tone}>{status}</span></div>)}
      </div>

      <div className="panel ai-panel">
        <div className="panel-head"><div><h2>IA e validação humana</h2><span>Uso da IA no apoio ao atendimento</span></div><Sparkles size={16} className="sparkle"/></div>
        <div className="ai-metrics"><div><strong>18</strong><span>sugestões geradas</span></div><div><strong>11</strong><span>validadas</span></div><div><strong>4</strong><span>editadas</span></div><div><strong>3</strong><span>rejeitadas</span></div></div>
        <div className="validation-note"><CircleCheck size={15}/><span>61% das sugestões registradas foram aprovadas sem rejeição.</span></div>
      </div>
    </section>

    <section className="quick-metrics">
      <Metric icon={<Clock3 size={15}/>} title="Tempo médio de atendimento" value="2h 18min" detail="indicador do suporte"/>
      <Metric icon={<Database size={15}/>} title="Conhecimentos reutilizados" value="24" detail="soluções validadas"/>
      <Metric icon={<CircleCheck size={15}/>} title="Soluções validadas" value="31" detail="registradas na base"/>
      <Metric icon={<CircleAlert size={15}/>} title="Chamados sem contexto" value="3" detail="necessitam complemento"/>
    </section>
  </div>;
}

function Stat({ title, value, trend, icon, tone }: { title: string; value: string; trend: string; icon: string; tone: string }) {
  return <article className="stat-card"><div className={"stat-icon " + tone}>{icon}</div><span>{title}</span><strong>{value}</strong><small className={tone === "orange" ? "negative" : ""}>{trend}</small></article>;
}

function Metric({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <article className="metric-card"><div className="metric-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}

function ModuleView({ view }: { view: Exclude<View, "Dashboard"> }) {
  const data = records[view];
  return <div className="content"><div className="page-heading"><div><h1>{data.title}</h1><p>{data.description}</p></div><button className="primary">{data.action}</button></div><div className="module-panel"><div className="module-toolbar"><div className="module-search">⌕ <span>Pesquisar...</span></div><select><option>Todos os status</option></select></div>{data.rows.map((row) => <div className="module-row" key={row}><div><strong>{row.split(" — ")[0]}</strong><span>{row.split(" — ").slice(1).join(" — ")}</span></div><button>Ver detalhes →</button></div>)}</div></div>;
}

function Index() {
  const [active, setActive] = React.useState<View>("Dashboard");
  return <div className="app"><Sidebar active={active} onChange={setActive}/><div className="main"><Header/>{active === "Dashboard" ? <Dashboard onChange={setActive}/> : <ModuleView view={active}/>}</div></div>;
}

