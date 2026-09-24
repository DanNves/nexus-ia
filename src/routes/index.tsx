import * as React from "react";
import { Activity, ArrowRight, BarChart3, Bell, BookOpen, Check, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, CircleAlert, ClipboardList, Clock3, Database, Headset, Home, Layers3, Plus, Search, Settings, UserRound, X } from "lucide-react";

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

type View = "Dashboard" | "Demandas" | "Atividades" | "Requisitos" | "Produtos e Versões" | "Chamados" | "Conhecimento" | "Indicadores" | "Configurações";
type WizardType = "demanda" | "atividade";

const menu: {label: View; icon: React.ComponentType<{size?: number; strokeWidth?: number}>}[] = [
  { label: "Dashboard", icon: Home }, { label: "Demandas", icon: ClipboardList }, { label: "Atividades", icon: Activity }, { label: "Requisitos", icon: CheckSquare },
  { label: "Produtos e Versões", icon: Layers3 }, { label: "Chamados", icon: Headset }, { label: "Conhecimento", icon: BookOpen },
  { label: "Indicadores", icon: BarChart3 }, { label: "Configurações", icon: Settings },
];

const recent = [
  { icon: ClipboardList, text: "Nova demanda registrada: integração com atendimento.", time: "Hoje, 09:42", user: "Equipe de análise", tone: "blue" },
  { icon: CheckCircle2, text: "Requisito REQ-014 validado e vinculado à versão 1.2.0.", time: "Hoje, 08:17", user: "Analista responsável", tone: "green" },
  { icon: text: "Chamado CH-028 aguarda validação da sugestão da IA.", time: "Ontem, 16:31", user: "Suporte", tone: "orange" },
  { icon: Database, text: "Solução validada adicionada à Base de Conhecimento.", time: "Ontem, 14:05", user: "Equipe de suporte", tone: "purple" },
];

const records: Record<Exclude<View, "Dashboard">, { title: string; description: string; action: string; rows: string[] }> = {
  Demandas: { title: "Demandas", description: "Registre e acompanhe as necessidades que originam novas soluções.", action: "+ Nova Demanda", rows: ["Sistema de Atendimento — Em análise", "Portal do Cliente — Aprovada", "Relatório Financeiro — Concluída"] },
  Atividades: { title: "Atividades", description: "Acompanhe o trabalho planejado mantendo cada atividade ligada ao contexto da solução.", action: "+ Nova Atividade", rows: ["Implementar recuperação de senha — Em andamento", "Validar regra de negócio — Pendente", "Publicar versão 1.2.0 — Concluída"] },
  Requisitos: { title: "Requisitos", description: "Organize requisitos, regras de negócio e critérios de aceitação.", action: "+ Novo Requisito", rows: ["REQ-214 — Recuperação de senha", "REQ-215 — Cadastro de usuários", "REQ-216 — Notificação de atendimento"] },
  "Produtos e Versões": { title: "Produtos e Versões", description: "Relacione soluções, versões publicadas e requisitos vinculados.", action: "+ Novo Produto", rows: ["Sistema de Atendimento — v2.4.0", "Portal do Cliente — v1.8.2", "Central de Relatórios — v3.1.0"] },
  Chamados: { title: "Chamados", description: "Atenda chamados mantendo o contexto produzido durante o desenvolvimento.", action: "+ Novo Chamado", rows: ["#4421 — Erro de login — Em atendimento", "#4420 — Relatório não carrega — Resolvido", "#4419 — Usuário sem acesso — Aberto"] },
  Conhecimento: { title: "Base de Conhecimento", description: "Reutilize soluções validadas e preserve conhecimento dos atendimentos.", action: "+ Novo Conhecimento", rows: ["Recuperação de senha — 12 utilizações", "Erro de envio de e-mail — 7 utilizações", "Permissão de usuário — 4 utilizações"] },
  Indicadores: { title: "Indicadores", description: "Acompanhe os dados utilizados para avaliar a contribuição do NEXUS.", action: "Exportar", rows: ["Tempo médio de atendimento", "Sugestões da IA: aceitas, editadas e rejeitadas", "Reuso do conhecimento e avaliação dos profissionais"] },
  Configurações: { title: "Configurações", description: "Gerencie usuários, preferências e parâmetros do sistema.", action: "Salvar alterações", rows: ["Usuários e permissões", "Preferências da plataforma", "Parâmetros da IA e validação"] },
};

function Sidebar({ active, onChange }: { active: View; onChange: (view: View) => void }) {
  return <aside className="sidebar"><div className="brand"><img className="brand-logo" src="/nexus-logo.svg" alt="NEXUS" /><span>NEXUS</span></div><div className="sidebar-caption">GESTÃO DO CICLO DE SOFTWARE</div><nav>{menu.map((item) => <button key={item.label} className={active === item.label ? "nav-item active" : "nav-item"} onClick={() => onChange(item.label)}><span className="nav-icon"><item.icon size={16} strokeWidth={1.8} /></span><span>{item.label}</span></button>)}</nav><div className="sidebar-footer"><img className="mini-logo" src="/nexus-logo.svg" alt="" /><span>Contexto conectado<br/>do desenvolvimento ao suporte.</span></div></aside>;
}

function NotificationIcon() {
  return <span className="notification-icon" aria-label="Notificações" title="Notificações"><Bell size={17} strokeWidth={1.8} /></span>;
}

function Header() {
  return <header className="topbar">
    <div className="top-location"><span className="top-section">NEXUS</span><ChevronRight size={13}/><strong>Dashboard</strong></div>
    <div className="top-actions"><button className="global-search" onClick={() => window.dispatchEvent(new CustomEvent("nexus:search"))}><Search size={15}/><span>Pesquisar no NEXUS</span><kbd>⌘ K</kbd></button><button className="notification-icon" aria-label="Notificações"><Bell size={17} strokeWidth={1.8}/><i/></button><div className="user"><div className="avatar"><UserRound size={14}/></div><span>Usuário<small>ADMIN</small></span></div></div>
  </header>;
}
function Dashboard({ onChange, onCreate }: { onChange: (view: View) => void; onCreate: (type: WizardType) => void }) {
  const priorities = [
    { icon: <CircleAlert size={15}/>, title: "Validar atendimento", detail: "CH-028 · Falha na autenticação", tag: "5 pendentes", tone: "orange" },
    { icon: <ClipboardList size={15}/>, title: "Revisar requisito", detail: "REQ-014 · Recuperação de senha", tag: "2 hoje", tone: "blue" },
    { icon: <Clock3 size={15}/>, title: "Atividade próxima do prazo", detail: "Publicar versão 1.2.0 · vence amanhã", tag: "Atenção", tone: "orange" },
  ];
  return <div className="content dashboard-content">
    <div className="welcome-row">
      <div><span className="eyebrow">DASHBOARD</span><h1>Bom dia, Usuário.</h1><p>Tenha uma visão rápida do trabalho e continue de onde parou.</p></div>
      <div className="dashboard-actions"><button className="secondary-action" onClick={() => onCreate("atividade")}><Activity size={15}/> Nova atividade</button><button className="primary" onClick={() => onCreate("demanda")}><Plus size={15}/> Nova demanda</button></div>
    </div>

    <section className="stats dashboard-stats">
      <Stat title="Demandas em andamento" value="12" trend="4 aguardando análise" icon={<ClipboardList size={17}/>} tone="blue"/>
      <Stat title="Atividades em andamento" value="18" trend="6 vencem esta semana" icon={<Activity size={17}/>} tone="green"/>
      <Stat title="Chamados abertos" value="8" trend="3 com contexto recuperado" icon={<Headset size={17}/>} tone="orange"/>
      <Stat title="Pendências de validação" value="5" trend="Requerem revisão" icon={<CheckSquare size={17}/>} tone="purple"/>
    </section>

    <section className="dashboard-layout">
      <div className="dashboard-main-column">
        <div className="panel priority-panel">
          <div className="panel-head"><div><span className="section-kicker">PRÓXIMAS AÇÕES</span><h2>O que precisa da sua atenção</h2><span>Resolva as tarefas prioritárias sem navegar por vários menus.</span></div><button className="text-button" onClick={() => onChange("Atividades")}>Ver atividades <ArrowRight size={12}/></button></div>
          <div className="priority-list">{priorities.map((item) => <div className="priority-item" key={item.title}><span className={"priority-icon "+item.tone}>{item.icon}</span><div className="priority-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><span className={"priority-tag "+item.tone}>{item.tag}</span><ChevronRight size={15} className="priority-arrow"/></div>)}</div>
        </div>

        <div className="panel support-overview">
          <div className="panel-head"><div><span className="section-kicker">SUPORTE</span><h2>Evolução do atendimento</h2><span>Chamados recebidos e resolvidos nos últimos seis meses.</span></div><span className="period-label">Mar — Ago</span></div>
          <div className="support-chart"><div className="chart-legend"><span><i className="legend-dot received"/>Recebidos</span><span><i className="legend-dot resolved"/>Resolvidos</span></div><div className="chart-grid"><span>30</span><span>20</span><span>10</span><span>0</span></div><svg viewBox="0 0 720 210" preserveAspectRatio="none"><path d="M0 150 C80 130 100 145 145 132 S230 118 290 125 S380 78 435 96 S525 80 575 88 S660 48 720 62" fill="none" stroke="#1479ff" strokeWidth="3"/><path d="M0 175 C75 160 105 168 145 155 S230 145 290 152 S380 105 435 118 S525 108 575 115 S660 82 720 90" fill="none" stroke="#5c69d8" strokeWidth="3"/></svg><div className="chart-months"><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span></div></div>
        </div>
      </div>

      <div className="dashboard-side-column">
        <div className="panel quick-create">
          <div className="panel-head"><div><span className="section-kicker">ACESSO RÁPIDO</span><h2>Comece por aqui</h2></div><Zap size={17} className="quick-icon"/></div>
          <button onClick={() => onCreate("demanda")}><span className="quick-button-icon blue"><Plus size={17}/></span><span><strong>Criar demanda</strong><small>Registrar uma nova necessidade</small></span><ArrowRight size={14}/></button>
          <button onClick={() => onCreate("atividade")}><span className="quick-button-icon green"><Activity size={17}/></span><span><strong>Criar atividade</strong><small>Adicionar trabalho ao fluxo</small></span><ArrowRight size={14}/></button>
          <button onClick={() => onChange("Chamados")}><span className="quick-button-icon orange"><Headset size={17}/></span><span><strong>Atender chamados</strong><small>3 aguardam contexto</small></span><ArrowRight size={14}/></button>
        </div>

        <div className="panel context-focus">
          <div className="panel-head"><div><span className="section-kicker">CONTEXTO NEXUS</span><h2>Contexto em foco</h2></div><BrainCircuit size={17} className="context-focus-icon"/></div>
          <div className="context-score"><div className="score-ring"><strong>82%</strong><span>com contexto</span></div><div><strong>3 chamados</strong><p>precisam de informações adicionais para completar o contexto.</p></div></div>
          <div className="context-flow-mini"><span>Desenvolvimento</span><ArrowRight size={12}/><span>Suporte</span><ArrowRight size={12}/><span>Conhecimento</span></div>
        </div>
      </div>
    </section>

    <section className="dashboard-lower">
      <div className="panel recent-panel"><div className="panel-head"><div><span className="section-kicker">ATIVIDADE</span><h2>Últimas movimentações</h2></div></div>{recent.map((item, i) => <div className="activity-item" key={i}><span className={"activity-icon "+item.tone}><item.icon size={14}/></span><div><p>{item.text}</p><small>{item.time} · {item.user}</small></div></div>)}</div>
      <div className="panel indicators-panel"><div className="panel-head"><div><span className="section-kicker">RESUMO</span><h2>Indicadores rápidos</h2></div><BarChart3 size={17} className="indicator-icon"/></div><div className="indicator-grid"><Metric icon={<Clock3 size={15}/>} title="Tempo médio" value="2h 18min"/><Metric icon={<Database size={15}/>} title="Conhecimentos reutilizados" value="24"/><Metric icon={<CheckCircle2 size={15}/>} title="Soluções validadas" value="31"/><Metric icon={<CircleAlert size={15}/>} title="Sem contexto" value="3"/></div></div>
    </section>
  </div>;
}
function Stat({ title, value, trend, icon, tone }: { title: string; value: string; trend: string; icon: React.ReactNode; tone: string }) {
  return <article className="stat-card"><div className={"stat-icon "+tone}>{icon}</div><span>{title}</span><strong>{value}</strong><small className={tone === "orange" ? "negative" : ""}>{trend}</small></article>;
}

function Metric({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return <article className="metric-card"><div className="metric-icon">{icon}</div><div><span>{title}</span><strong>{value}</strong></div></article>;
}

function ModuleView({ view, onCreate }: { view: Exclude<View, "Dashboard">; onCreate: (type: WizardType) => void }) {
  const data = records[view];
  const isWizard = view === "Demandas" || view === "Atividades";
  return <div className="content">
    <div className="page-heading"><div><span className="eyebrow">{view.toUpperCase()}</span><h1>{data.title}</h1><p>{data.description}</p></div>{isWizard && <button className="primary" onClick={() => onCreate(view === "Demandas" ? "demanda" : "atividade")}><Plus size={15}/>{data.action.replace("+ ","")}</button>}</div>
    <div className="module-panel"><div className="module-toolbar"><div className="module-search"><Search size={14}/><span>Pesquisar...</span></div><select><option>Todos os status</option></select></div>{data.rows.map((row) => <div className="module-row" key={row}><div><strong>{row.split(" — ")[0]}</strong><span>{row.split(" — ").slice(1).join(" — ")}</span></div><button>Ver detalhes <ArrowRight size={12}/></button></div>)}</div>
  </div>;
}

function Stepper({ type, onClose }: { type: WizardType; onClose: () => void }) {
  const isDemand = type === "demanda";
  const steps = isDemand ? ["Identificação","Contexto","Objetivo","Revisão"] : ["Identificação","Planejamento","Execução","Revisão"];
  const [step,setStep]=React.useState(0);
  const [saved,setSaved]=React.useState(false);
  const [data,setData]=React.useState<Record<string,string>>({});
  React.useEffect(() => {
    const raw=localStorage.getItem("nexus-"+type+"-draft");
    if(raw){try{const draft=JSON.parse(raw);setData(draft.data||{});setStep(Math.min(draft.step||0,3));}catch{}}
  },[type]);
  const update=(key:string,value:string)=>setData(current=>({...current,[key]:value}));
  const saveStep=()=>{
    localStorage.setItem("nexus-"+type+"-draft",JSON.stringify({step:Math.min(step+1,steps.length-1),data,savedAt:new Date().toISOString()}));
    setSaved(true);window.setTimeout(()=>setSaved(false),1600);
  };
  const next=()=>{saveStep();setStep(current=>Math.min(current+1,steps.length-1));};
  const back=()=>setStep(current=>Math.max(current-1,0));
  return <div className="wizard-overlay" role="dialog" aria-modal="true">
    <div className="wizard-modal">
      <div className="wizard-header"><div><span className="section-kicker">NOVA {isDemand?"DEMANDA":"ATIVIDADE"}</span><h2>{isDemand?"Criar demanda":"Criar atividade"}</h2><p>Preencha por etapas. O progresso é salvo ao avançar.</p></div><button className="close-button" onClick={onClose}><X size={18}/></button></div>
      <div className="stepper">{steps.map((item,index)=><React.Fragment key={item}><div className={index===step?"step active":index<step?"step done":"step"}><span>{index<step?<Check size={14}/>:index+1}</span><small>{item}</small></div>{index<steps.length-1&&<div className={index<step?"step-line done":"step-line"}/>}</React.Fragment>)}</div>
      <div className="wizard-body">{step<3?<WizardFields type={type} step={step} data={data} update={update}/>:<div className="review-box"><div className="review-icon"><CheckCircle2 size={24}/></div><h3>Revise antes de concluir</h3><p>As informações serão mantidas para os próximos estágios do fluxo.</p><div className="review-summary"><span>Tipo</span><strong>{isDemand?"Demanda":"Atividade"}</strong><span>Título</span><strong>{data.titulo||"Não informado"}</strong><span>Descrição</span><strong>{data.descricao||"Não informado"}</strong><span>Prioridade</span><strong>{data.prioridade||"Não definida"}</strong></div></div>}</div>
      <div className="wizard-footer"><span className={saved?"save-status visible":"save-status"}><CheckCircle2 size={14}/> Salvo automaticamente</span><span className="step-count">Etapa {step+1} de {steps.length}</span><div className="wizard-actions"><button className="secondary-action" onClick={step===0?onClose:back}>{step===0?"Cancelar":<><ChevronLeft size={15}/>Voltar</>}</button>{step<steps.length-1?<button className="primary" onClick={next}>Salvar e continuar <ChevronRight size={15}/></button>:<button className="primary" onClick={()=>{saveStep();onClose();}}>Concluir <Check size={15}/></button>}</div></div>
    </div>
  </div>;
}

function WizardFields({ type, step, data, update }: { type: WizardType; step: number; data: Record<string,string>; update: (key:string,value:string)=>void }) {
  const demand=type==="demanda";
  if(step===0)return <div className="wizard-form"><WizardIntro icon={<ClipboardList size={18}/>} title={demand?"Comece pelo essencial":"Comece pelo trabalho"} text={demand?"Registre a necessidade de forma simples.":"Defina o que precisa ser feito."}/><label>{demand?"Título da demanda":"Título da atividade"}<input value={data.titulo||""} onChange={e=>update("titulo",e.target.value)} placeholder={demand?"Ex.: Melhorar recuperação de senha":"Ex.: Implementar validação de senha"}/></label><label>{demand?"Descrição inicial":"Descrição da atividade"}<textarea value={data.descricao||""} onChange={e=>update("descricao",e.target.value)} placeholder="Descreva de forma objetiva..." rows={5}/></label></div>;
  if(step===1)return <div className="wizard-form"><WizardIntro icon={<BrainCircuit size={18}/>} title={demand?"Preserve o contexto":"Organize o planejamento"} text={demand?"Essas informações serão relacionadas ao restante do ciclo.":"Relacione a atividade à demanda e registre o necessário para executá-la."}/><div className="form-grid"><label>{demand?"Área solicitante":"Demanda relacionada"}<input value={data.area||""} onChange={e=>update("area",e.target.value)} placeholder={demand?"Ex.: Atendimento":"Ex.: DEM-012"}/></label><label>{demand?"Origem":"Responsável"}<input value={data.origem||""} onChange={e=>update("origem",e.target.value)} placeholder={demand?"Ex.: Suporte":"Ex.: João Silva"}/></label></div><label>{demand?"Informações adicionais":"Critério de conclusão"}<textarea value={data.contexto||""} onChange={e=>update("contexto",e.target.value)} placeholder={demand?"Registre regras, exemplos ou informações relevantes...":"Como saberemos que a atividade foi concluída?"} rows={5}/></label></div>;
  return <div className="wizard-form"><WizardIntro icon={<ClipboardList size={18}/>} title={demand?"Defina o objetivo":"Defina prioridade e prazo"} text={demand?"Um objetivo claro facilita a transformação em requisito.":"Esses dados ajudam a equipe a visualizar o que precisa acontecer primeiro."}/><label>{demand?"Objetivo esperado":"Resultado esperado"}<textarea value={data.objetivo||""} onChange={e=>update("objetivo",e.target.value)} placeholder={demand?"Ex.: reduzir chamados de recuperação de senha":"Ex.: usuários conseguem redefinir a senha sem suporte"} rows={4}/></label><div className="form-grid"><label>Prioridade<select value={data.prioridade||""} onChange={e=>update("prioridade",e.target.value)}><option value="">Selecionar</option><option>Alta</option><option>Média</option><option>Baixa</option></select></label><label>{demand?"Prazo desejado":"Prazo"}<input type="date" value={data.prazo||""} onChange={e=>update("prazo",e.target.value)}/></label></div></div>;
}

function WizardIntro({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="wizard-intro"><div className="wizard-intro-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div></div>;
}

function Index() {
  const [active,setActive]=React.useState<View>("Dashboard");
  const [wizard,setWizard]=React.useState<WizardType|null>(null);
  const [searchOpen,setSearchOpen]=React.useState(false);
  React.useEffect(()=>{const open=()=>setSearchOpen(true);const onKeyDown=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setSearchOpen(true);}if(event.key==="Escape"){setSearchOpen(false);setWizard(null);}};window.addEventListener("nexus:search",open);window.addEventListener("keydown",onKeyDown);return()=>{window.removeEventListener("nexus:search",open);window.removeEventListener("keydown",onKeyDown);};},[]);
  const openCreate=(type:WizardType)=>setWizard(type);
  return <div className="app"><Sidebar active={active} onChange={setActive}/><div className="main"><Header/>{active==="Dashboard"?<Dashboard onChange={setActive} onCreate={openCreate}/>:<ModuleView view={active} onCreate={openCreate}/>}</div>{wizard&&<Stepper type={wizard} onClose={()=>setWizard(null)}/>} {searchOpen&&<div className="search-overlay" onClick={()=>setSearchOpen(false)}><div className="search-dialog" onClick={e=>e.stopPropagation()}><div className="search-dialog-head"><Search size={16}/><input autoFocus placeholder="Pesquisar demandas, atividades, requisitos, chamados..."/><button onClick={()=>setSearchOpen(false)}><X size={16}/></button></div><div className="search-empty"><Search size={22}/><strong>Pesquisa global</strong><span>Encontre informações do NEXUS sem precisar navegar entre módulos.</span></div></div></div>}</div>;
}
