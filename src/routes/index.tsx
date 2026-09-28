import * as React from "react";
import { Activity, ArrowRight, BarChart3, Bell, BookOpen, Check, CheckCircle2, CheckSquare, ChevronLeft, ChevronRight, ChevronDown, CircleAlert, ClipboardList, Clock3, Database, Headset, Home, Layers3, Plus, Search, Settings, UserRound, X, MoreHorizontal } from "lucide-react";

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

type View = "Dashboard" | "Demandas" | "Atividades" | "Requisitos" | "Soluções e Versões" | "Chamados" | "Conhecimento" | "Indicadores" | "Configurações";
type WizardType = "demanda" | "atividade";

const menu: {label: View; icon: React.ComponentType<{size?: number; strokeWidth?: number}>}[] = [
  { label: "Dashboard", icon: Home }, { label: "Demandas", icon: ClipboardList }, { label: "Atividades", icon: Activity }, { label: "Requisitos", icon: CheckSquare },
  { label: "Soluções e Versões", icon: Layers3 }, { label: "Chamados", icon: Headset }, { label: "Conhecimento", icon: BookOpen },
  { label: "Indicadores", icon: BarChart3 }, { label: "Configurações", icon: Settings },
];

const recent = [
  { icon: ClipboardList, text: "Nova demanda registrada: integração com atendimento.", time: "Hoje, 09:42", user: "Equipe de análise", tone: "blue" },
  { icon: CheckCircle2, text: "Requisito REQ-014 validado e vinculado à versão 1.2.0.", time: "Hoje, 08:17", user: "Analista responsável", tone: "green" },
  { icon: CircleAlert, text: "Chamado CH-028 aguarda validação do atendimento.", time: "Ontem, 16:31", user: "Suporte", tone: "orange" },
  { icon: Database, text: "Solução validada adicionada à Base de Conhecimento.", time: "Ontem, 14:05", user: "Equipe de suporte", tone: "purple" },
];

const records: Record<Exclude<View, "Dashboard">, { title: string; description: string; action: string; rows: string[] }> = {
  Demandas: { title: "Demandas", description: "Registre e acompanhe as necessidades que originam novas soluções.", action: "+ Nova Demanda", rows: ["Sistema de Atendimento — Em análise", "Portal do Cliente — Aprovada", "Relatório Financeiro — Concluída"] },
  Atividades: { title: "Atividades", description: "Acompanhe o trabalho planejado mantendo cada atividade ligada ao contexto da solução.", action: "+ Nova Atividade", rows: ["Implementar recuperação de senha — Em andamento", "Validar regra de negócio — Pendente", "Publicar versão 1.2.0 — Concluída"] },
  Requisitos: { title: "Requisitos", description: "Organize requisitos, regras de negócio e critérios de aceitação.", action: "+ Novo Requisito", rows: ["REQ-214 — Recuperação de senha", "REQ-215 — Cadastro de usuários", "REQ-216 — Notificação de atendimento"] },
  "Soluções e Versões": { title: "Soluções e Versões", description: "Relacione soluções, versões publicadas e requisitos vinculados.", action: "+ Novo Produto", rows: ["Sistema de Atendimento — v2.4.0", "Portal do Cliente — v1.8.2", "Central de Relatórios — v3.1.0"] },
  Chamados: { title: "Chamados", description: "Atenda chamados mantendo o contexto produzido durante o desenvolvimento.", action: "+ Novo Chamado", rows: ["#4421 — Erro de login — Em atendimento", "#4420 — Relatório não carrega — Resolvido", "#4419 — Usuário sem acesso — Aberto"] },
  Conhecimento: { title: "Base de Conhecimento", description: "Reutilize soluções validadas e preserve conhecimento dos atendimentos.", action: "+ Novo Conhecimento", rows: ["Recuperação de senha — 12 utilizações", "Erro de envio de e-mail — 7 utilizações", "Permissão de usuário — 4 utilizações"] },
  Indicadores: { title: "Indicadores", description: "Acompanhe os dados utilizados para avaliar a contribuição do NEXUS.", action: "Exportar", rows: ["Tempo médio de atendimento", "Sugestões da IA: aceitas, editadas e rejeitadas", "Reuso do conhecimento e avaliação dos profissionais"] },
  Configurações: { title: "Configurações", description: "Gerencie usuários, preferências e parâmetros do sistema.", action: "Salvar alterações", rows: ["Usuários e permissões", "Preferências da plataforma", "Parâmetros da IA e validação"] },
};

function Navbar({ active, onChange, onCreate }: { active: View; onChange: (view: View) => void; onCreate: (type: WizardType) => void }) {
  const primary: View[] = ["Dashboard","Demandas","Requisitos","Soluções e Versões","Chamados","Conhecimento"];
  const secondary: View[] = ["Atividades","Indicadores","Configurações"];
  return <header className="nx-navbar">
    <div className="nx-nav-brand">
      <img src="/nexus-logo.svg" alt="NEXUS" />
      <div><strong>NEXUS</strong><small>CONEXÃO DE CONTEXTO</small></div>
    </div>
    <nav className="nx-nav-links" aria-label="Navegação principal">
      {primary.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => onChange(item)}>{item === "Dashboard" && <Home size={14}/>} {item}</button>)}
      <div className="nx-nav-more">
        <button className={secondary.includes(active) ? "active" : ""}><MoreHorizontal size={15}/> Mais <ChevronDown size={12}/></button>
        <div className="nx-nav-dropdown">
          {secondary.map((item) => <button key={item} onClick={() => onChange(item)}><span>{item === "Atividades" ? <Activity size={14}/> : item === "Indicadores" ? <BarChart3 size={14}/> : <Settings size={14}/>}</span>{item}</button>)}
        </div>
      </div>
    </nav>
    <div className="nx-nav-actions">
      <button className="nx-nav-create" onClick={() => onCreate("demanda")}><Plus size={14}/> Nova demanda</button>
      <button className="global-search" onClick={() => window.dispatchEvent(new CustomEvent("nexus:search"))}><Search size={15}/><span>Pesquisar</span><kbd>⌘ K</kbd></button>
      <button className="notification-icon" aria-label="Notificações"><Bell size={17} strokeWidth={1.8}/><i/></button>
      <div className="user"><div className="avatar"><UserRound size={14}/></div><span>Tester<small>USUÁRIO</small></span></div>
    </div>
  </header>;
}

function Header({ active }: { active: View }) {
  return <header className="topbar">
    <div className="top-location"><span className="top-section">NEXUS</span><ChevronRight size={13}/><strong>{active}</strong></div>
    <div className="top-actions"><button className="global-search" onClick={() => window.dispatchEvent(new CustomEvent("nexus:search"))}><Search size={15}/><span>Pesquisar no NEXUS</span><kbd>⌘ K</kbd></button><button className="notification-icon" aria-label="Notificações"><Bell size={17} strokeWidth={1.8}/><i/></button><div className="user"><div className="avatar"><UserRound size={14}/></div><span>Tester<small>USUÁRIO</small></span></div></div>
  </header>;
}

function Dashboard({ onChange, onCreate }: { onChange: (view: View) => void; onCreate: (type: WizardType) => void }) {
  const solutions = [
    { name: "Portal de Atendimento", version: "v1.2.0", status: "Em desenvolvimento", progress: 68, deadline: "22/09/2026", context: "12 requisitos" },
    { name: "Aplicativo Mobile", version: "v1.0.0", status: "Em especificação", progress: 32, deadline: "30/09/2026", context: "8 requisitos" },
    { name: "Dashboard de Relatórios", version: "v2.1.0", status: "Em validação", progress: 45, deadline: "05/10/2026", context: "14 requisitos" },
    { name: "Integração com API", version: "v1.1.0", status: "Em testes", progress: 80, deadline: "12/10/2026", context: "10 requisitos" },
  ];
  const demands = [
    { title: "Implementar autenticação de dois fatores", requester: "Carlos Mendes", date: "18/09/2026", status: "Em análise" },
    { title: "Melhorar navegação do dashboard", requester: "Rafael Costa", date: "17/09/2026", status: "Em andamento" },
    { title: "Correção de acesso ao login", requester: "Juliana Silva", date: "15/09/2026", status: "Concluída" },
    { title: "Adicionar relatório de atendimento", requester: "Bruna Lima", date: "14/09/2026", status: "Pendente" },
  ];
  const priorities = [
    { icon: <CircleAlert size={15}/>, title: "Validar atendimento", detail: "CH-028 · Falha na autenticação", tag: "5 pendentes", tone: "orange", view: "Chamados" as View },
    { icon: <ClipboardList size={15}/>, title: "Revisar requisito", detail: "REQ-014 · Recuperação de senha", tag: "2 hoje", tone: "blue", view: "Requisitos" as View },
    { icon: <Clock3 size={15}/>, title: "Atividade próxima do prazo", detail: "Publicar versão 1.2.0 · vence amanhã", tag: "Atenção", tone: "orange", view: "Atividades" as View },
  ];

  return <div className="content dashboard-content nexus-dashboard">
    <section className="nx-welcome">
      <div>
        <span className="eyebrow">VISÃO GERAL</span>
        <h1>Olá, Tester!</h1>
        <p>Veja o que está acontecendo nas soluções e onde o contexto precisa da sua atenção.</p>
      </div>
      <div className="nx-welcome-actions">
        <button className="secondary-action" onClick={() => onCreate("atividade")}><Activity size={15}/> Nova atividade</button>
        <button className="primary" onClick={() => onCreate("demanda")}><Plus size={15}/> Nova demanda</button>
      </div>
    </section>

    <section className="nx-stats">
      <button onClick={() => onChange("Demandas")} className="nx-stat">
        <span className="nx-stat-icon blue"><ClipboardList size={17}/></span>
        <span className="nx-stat-label">Demandas em andamento</span>
        <strong>12</strong>
        <small>4 aguardando análise</small>
      </button>
      <button onClick={() => onChange("Requisitos")} className="nx-stat">
        <span className="nx-stat-icon green"><CheckSquare size={17}/></span>
        <span className="nx-stat-label">Requisitos em validação</span>
        <strong>8</strong>
        <small>2 precisam de revisão</small>
      </button>
      <button onClick={() => onChange("Chamados")} className="nx-stat">
        <span className="nx-stat-icon orange"><Headset size={17}/></span>
        <span className="nx-stat-label">Chamados abertos</span>
        <strong>8</strong>
        <small>3 sem contexto completo</small>
      </button>
      <button onClick={() => onChange("Conhecimento")} className="nx-stat">
        <span className="nx-stat-icon purple"><BookOpen size={17}/></span>
        <span className="nx-stat-label">Conhecimentos validados</span>
        <strong>31</strong>
        <small>24 reutilizados em chamados</small>
      </button>
    </section>

    <section className="nx-dashboard-grid">
      <div className="nx-main-column">
        <article className="panel nx-panel">
          <div className="nx-panel-head">
            <div><span className="section-kicker">DESENVOLVIMENTO</span><h2>Soluções em andamento</h2><p>Versões e requisitos que formam o contexto usado posteriormente pelo suporte.</p></div>
            <button className="text-button" onClick={() => onChange("Soluções e Versões")}>Ver todas <ArrowRight size={12}/></button>
          </div>
          <div className="nx-solution-table">
            <div className="nx-solution-head"><span>Solução</span><span>Versão</span><span>Status</span><span>Progresso</span><span>Prazo</span></div>
            {solutions.map((item) => <button key={item.name} className="nx-solution-row" onClick={() => onChange("Soluções e Versões")}>
              <span className="nx-solution-name"><strong>{item.name}</strong><small>{item.context}</small></span>
              <span className="nx-version">{item.version}</span>
              <em className={"status-pill "+item.status.toLowerCase().replaceAll(" ","-")}>{item.status}</em>
              <span className="nx-progress"><b>{item.progress}%</b><i><span style={{width: item.progress+"%"}}/></i></span>
              <span className="nx-deadline">{item.deadline}</span>
            </button>)}
          </div>
        </article>

        <article className="panel nx-panel">
          <div className="nx-panel-head compact">
            <div><span className="section-kicker">DEMANDAS</span><h2>Demandas recentes</h2></div>
            <button className="text-button" onClick={() => onChange("Demandas")}>Ver todas <ArrowRight size={12}/></button>
          </div>
          <div className="nx-demand-table">
            <div className="nx-demand-head"><span>Título</span><span>Solicitante</span><span>Data</span><span>Status</span></div>
            {demands.map((item) => <button key={item.title} className="nx-demand-row" onClick={() => onChange("Demandas")}>
              <strong>{item.title}</strong><span>{item.requester}</span><span>{item.date}</span><em className={"status-pill "+item.status.toLowerCase().replaceAll(" ","-")}>{item.status}</em>
            </button>)}
          </div>
        </article>
      </div>

      <aside className="nx-side-column">
        <article className="panel nx-panel nx-quick-panel">
          <div className="nx-panel-head compact"><div><span className="section-kicker">AÇÕES RÁPIDAS</span><h2>Comece por aqui</h2></div></div>
          <button onClick={() => onCreate("demanda")}><span className="nx-action-icon blue"><Plus size={16}/></span><span><strong>Nova demanda</strong><small>Registrar uma necessidade</small></span><ArrowRight size={13}/></button>
          <button onClick={() => onCreate("atividade")}><span className="nx-action-icon green"><Activity size={16}/></span><span><strong>Nova atividade</strong><small>Adicionar trabalho ao fluxo</small></span><ArrowRight size={13}/></button>
          <button onClick={() => onChange("Chamados")}><span className="nx-action-icon orange"><Headset size={16}/></span><span><strong>Atender chamado</strong><small>Consultar contexto do suporte</small></span><ArrowRight size={13}/></button>
        </article>

        <article className="panel nx-context-card">
          <div className="nx-context-head"><div><span className="section-kicker">CONTEXTO DA SOLUÇÃO</span><h2>Continuidade do contexto</h2></div><Database size={17}/></div>
          <div className="nx-context-body">
            <div className="nx-context-ring"><strong>82%</strong><span>com contexto</span></div>
            <div className="nx-context-copy"><strong>3 chamados aguardam contexto</strong><p>Precisam de informações adicionais para completar o atendimento.</p></div>
          </div>
          <div className="nx-context-flow"><span>Desenvolvimento</span><ArrowRight size={12}/><span>Suporte</span><ArrowRight size={12}/><span>Conhecimento</span></div>
        </article>

        <article className="panel nx-panel nx-attention">
          <div className="nx-panel-head compact"><div><span className="section-kicker">ATENÇÃO</span><h2>O que precisa da sua atenção</h2></div></div>
          <div className="nx-priority-list">{priorities.map((item) => <button key={item.title} onClick={() => onChange(item.view)}>
            <span className={"nx-priority-icon "+item.tone}>{item.icon}</span><span className="nx-priority-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><em className={item.tone}>{item.tag}</em><ChevronRight size={14}/>
          </button>)}</div>
        </article>
      </aside>
    </section>

    <section className="nx-bottom-grid">
      <article className="panel nx-panel nx-chart-panel">
        <div className="nx-panel-head compact"><div><span className="section-kicker">SUPORTE</span><h2>Evolução do atendimento</h2></div><span className="nx-period">Últimos 6 meses</span></div>
        <div className="nx-chart">
          <div className="nx-chart-y"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div>
          <svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-label="Evolução de chamados">
            <polyline points="0,125 100,108 200,92 300,100 400,72 500,54 600,44" fill="none" stroke="#1677ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="0,143 100,130 200,118 300,122 400,98 500,78 600,67" fill="none" stroke="#58b89a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="nx-chart-months"><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span><span>Ago</span><span>Set</span><span>Out</span></div>
          <div className="nx-chart-legend"><span><i className="received"/>Recebidos</span><span><i className="resolved"/>Resolvidos</span></div>
        </div>
      </article>

      <article className="panel nx-panel nx-activity-panel">
        <div className="nx-panel-head compact"><div><span className="section-kicker">ATIVIDADE RECENTE</span><h2>Últimas movimentações</h2></div></div>
        <div className="nx-activity-list">{recent.slice(0,4).map((item, index) => <div className="nx-activity-item" key={index}><span className={"nx-activity-icon "+item.tone}><item.icon size={13}/></span><div><strong>{item.text}</strong><small>{item.time} · {item.user}</small></div></div>)}</div>
      </article>
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
  if(step===1)return <div className="wizard-form"><WizardIntro icon={<Database size={18}/>} title={demand?"Preserve o contexto":"Organize o planejamento"} text={demand?"Essas informações serão relacionadas ao restante do ciclo.":"Relacione a atividade à demanda e registre o necessário para executá-la."}/><div className="form-grid"><label>{demand?"Área solicitante":"Demanda relacionada"}<input value={data.area||""} onChange={e=>update("area",e.target.value)} placeholder={demand?"Ex.: Atendimento":"Ex.: DEM-012"}/></label><label>{demand?"Origem":"Responsável"}<input value={data.origem||""} onChange={e=>update("origem",e.target.value)} placeholder={demand?"Ex.: Suporte":"Ex.: João Silva"}/></label></div><label>{demand?"Informações adicionais":"Critério de conclusão"}<textarea value={data.contexto||""} onChange={e=>update("contexto",e.target.value)} placeholder={demand?"Registre regras, exemplos ou informações relevantes...":"Como saberemos que a atividade foi concluída?"} rows={5}/></label></div>;
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
  return <div className="app"><div className="main"><Navbar active={active} onChange={setActive} onCreate={openCreate}/>{active==="Dashboard"?<Dashboard onChange={setActive} onCreate={openCreate}/>:<ModuleView view={active} onCreate={openCreate}/>}</div>{wizard&&<Stepper type={wizard} onClose={()=>setWizard(null)}/>} {searchOpen&&<div className="search-overlay" onClick={()=>setSearchOpen(false)}><div className="search-dialog" onClick={e=>e.stopPropagation()}><div className="search-dialog-head"><Search size={16}/><input autoFocus placeholder="Pesquisar demandas, atividades, requisitos, chamados..."/><button onClick={()=>setSearchOpen(false)}><X size={16}/></button></div><div className="search-empty"><Search size={22}/><strong>Pesquisa global</strong><span>Encontre informações do NEXUS sem precisar navegar entre módulos.</span></div></div></div>}</div>;
}

