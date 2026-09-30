import * as React from "react";
import {
  Activity, ArrowRight, Bell, BookOpen, Check, CheckCircle2, CheckSquare,
  ChevronDown, ChevronLeft, ChevronRight, CircleAlert, ClipboardList, Clock3,
  Database, Headset, Home, Layers3, Link2, MessageCircle, MoreHorizontal,
  Pencil, Plus, Search, Send, Settings, ShieldCheck, Sparkles, UserRound, Users,
  X
} from "lucide-react";

type View =
  | "Dashboard" | "Demandas" | "Atividades" | "Requisitos"
  | "Soluções e Versões" | "Chamados" | "Conhecimento"
  | "Indicadores" | "Configurações";

type WizardType = "demanda" | "atividade";
type Status =
  | "Pendente" | "Em análise" | "Em desenvolvimento"
  | "Em validação" | "Concluído";

type Person = { name: string; role: string; kind: "Solicitante" | "Responsável" | "Participante" };
type Comment = { id: string; author: string; text: string; date: string; recipient?: string };

type RecordItem = {
  id: string;
  title: string;
  description: string;
  type: "Demanda" | "Atividade" | "Requisito" | "Solução" | "Versão" | "Chamado" | "Conhecimento";
  status: Status;
  context: string;
  solution: string;
  version: string;
  date: string;
  priority: "Alta" | "Média" | "Baixa" | "Normal";
  requester: Person;
  assignee: Person;
  participants: Person[];
  parentId?: string;
  relatedIds: string[];
  comments: Comment[];
  objective?: string;
  dueDate?: string;
  aiValidated?: boolean;
  reuseCount?: number;
};

const people = {
  solicitante: { name: "Marina Costa", role: "Área de Atendimento", kind: "Solicitante" as const },
  analista: { name: "Carlos Lima", role: "Analista de Sistemas", kind: "Responsável" as const },
  dev: { name: "João Silva", role: "Desenvolvedor", kind: "Responsável" as const },
  suporte: { name: "Ana Souza", role: "Analista de Suporte", kind: "Responsável" as const },
  participante: { name: "Rafael Mendes", role: "Produto", kind: "Participante" as const },
};

const seed: RecordItem[] = [
  {
    id: "DEM-012", title: "Implementar autenticação de dois fatores",
    description: "Adicionar segundo fator ao acesso dos usuários.", type: "Demanda",
    status: "Em desenvolvimento", context: "Contexto completo", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "18/09/2026", priority: "Alta", requester: people.solicitante,
    assignee: people.dev, participants: [people.analista, people.participante],
    relatedIds: ["REQ-014", "v1.2.0", "CH-028"],
    comments: [
      { id: "c1", author: "Marina Costa", text: "Precisamos reduzir os chamados de acesso sem comprometer a segurança.", date: "18/09/2026 09:10" },
      { id: "c2", author: "João Silva", text: "Demanda assumida. Estou trabalhando na implementação.", date: "18/09/2026 11:32" }
    ],
    objective: "Permitir autenticação adicional para usuários do portal."
  },
  {
    id: "DEM-011", title: "Melhorar navegação do dashboard",
    description: "Simplificar a navegação e reduzir etapas para as principais tarefas.", type: "Demanda",
    status: "Em validação", context: "Contexto completo", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "17/09/2026", priority: "Média", requester: people.solicitante,
    assignee: people.analista, participants: [people.dev],
    relatedIds: ["REQ-015", "v1.2.0"],
    comments: [{ id: "c3", author: "Carlos Lima", text: "Fluxo revisado com a equipe. Aguardando validação do solicitante.", date: "20/09/2026 14:20" }],
    objective: "Reduzir o número de etapas para acessar as funções principais."
  },
  {
    id: "DEM-010", title: "Relatório de atendimento",
    description: "Novo relatório para acompanhamento do suporte.", type: "Demanda",
    status: "Concluído", context: "Contexto completo", solution: "Dashboard de Relatórios",
    version: "v2.1.0", date: "14/09/2026", priority: "Baixa", requester: people.solicitante,
    assignee: people.analista, participants: [], relatedIds: ["v2.1.0"],
    comments: [], objective: "Acompanhar indicadores de atendimento."
  },
  {
    id: "ATV-021", title: "Validar regras de autenticação",
    description: "Conferir regras de negócio relacionadas à autenticação da demanda DEM-012.", type: "Atividade",
    status: "Em desenvolvimento", context: "Vinculada à DEM-012", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "28/09/2026", priority: "Alta", requester: people.analista,
    assignee: people.dev, participants: [people.solicitante, people.analista],
    parentId: "DEM-012", relatedIds: ["DEM-012", "REQ-014"],
    comments: [{ id: "c4", author: "João Silva", text: "Estou validando os cenários com a equipe de produto.", date: "28/09/2026 10:15" }],
    objective: "Garantir que as regras estejam coerentes antes da entrega.", dueDate: "30/09/2026"
  },
  {
    id: "REQ-014", title: "Recuperação de senha",
    description: "Usuário deve conseguir redefinir a senha sem intervenção do suporte.", type: "Requisito",
    status: "Em validação", context: "Vinculado à DEM-012", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "20/09/2026", priority: "Alta", requester: people.solicitante,
    assignee: people.analista, participants: [people.dev], parentId: "DEM-012",
    relatedIds: ["DEM-012", "v1.2.0", "CH-028"], comments: []
  },
  {
    id: "REQ-015", title: "Notificação de atendimento",
    description: "Enviar confirmação após abertura do chamado.", type: "Requisito",
    status: "Concluído", context: "Vinculado à DEM-011", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "19/09/2026", priority: "Média", requester: people.solicitante,
    assignee: people.analista, participants: [people.dev], parentId: "DEM-011",
    relatedIds: ["DEM-011", "v1.2.0"], comments: []
  },
  {
    id: "SOL-001", title: "Portal de Atendimento", description: "Solução responsável pelos fluxos de atendimento ao usuário.", type: "Solução",
    status: "Em desenvolvimento", context: "3 demandas relacionadas", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "01/09/2026", priority: "Normal", requester: people.analista,
    assignee: people.dev, participants: [people.solicitante, people.analista], relatedIds: ["DEM-012", "DEM-011", "v1.2.0"], comments: []
  },
  {
    id: "v1.2.0", title: "Versão 1.2.0", description: "Versão com autenticação, notificações e melhorias de navegação.", type: "Versão",
    status: "Em desenvolvimento", context: "Contexto consolidado", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "28/09/2026", priority: "Alta", requester: people.analista,
    assignee: people.dev, participants: [people.solicitante, people.suporte], relatedIds: ["DEM-012", "DEM-011", "REQ-014", "REQ-015", "CH-028"], comments: []
  },
  {
    id: "CH-028", title: "Falha na autenticação", description: "Usuário relata erro ao acessar a área restrita.", type: "Chamado",
    status: "Em validação", context: "Contexto recuperado", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "28/09/2026", priority: "Alta", requester: people.solicitante,
    assignee: people.suporte, participants: [people.analista, people.dev], relatedIds: ["REQ-014", "v1.2.0", "KB-007"],
    comments: [{ id: "c5", author: "Ana Souza", text: "Contexto recuperado. A sugestão da IA está aguardando validação.", date: "28/09/2026 16:31" }]
  },
  {
    id: "CH-027", title: "Relatório não carrega", description: "Tela de relatórios apresenta erro após atualização.", type: "Chamado",
    status: "Em desenvolvimento", context: "Versão relacionada", solution: "Dashboard de Relatórios",
    version: "v2.1.0", date: "27/09/2026", priority: "Média", requester: people.solicitante,
    assignee: people.suporte, participants: [people.dev], relatedIds: ["v2.1.0"], comments: []
  },
  {
    id: "CH-026", title: "Usuário sem acesso", description: "Permissão não aplicada após alteração de perfil.", type: "Chamado",
    status: "Concluído", context: "Conhecimento disponível", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "25/09/2026", priority: "Média", requester: people.solicitante,
    assignee: people.suporte, participants: [people.analista], relatedIds: ["KB-006"], comments: []
  },
  {
    id: "KB-007", title: "Falha de autenticação na versão 1.2.0", description: "Procedimento validado para diagnosticar falhas de autenticação.", type: "Conhecimento",
    status: "Concluído", context: "Reutilizado 12 vezes", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "28/09/2026", priority: "Normal", requester: people.suporte,
    assignee: people.suporte, participants: [people.analista], relatedIds: ["CH-028", "REQ-014"], comments: [],
    reuseCount: 12, aiValidated: true
  },
  {
    id: "KB-006", title: "Permissão de usuário", description: "Procedimento para revisar permissões após alteração de perfil.", type: "Conhecimento",
    status: "Concluído", context: "Reutilizado 7 vezes", solution: "Portal de Atendimento",
    version: "v1.2.0", date: "25/09/2026", priority: "Normal", requester: people.suporte,
    assignee: people.suporte, participants: [people.analista], relatedIds: ["CH-026"], comments: [],
    reuseCount: 7, aiValidated: true
  }
];

const nav: { label: View; icon: React.ElementType }[] = [
  { label: "Dashboard", icon: Home },
  { label: "Demandas", icon: ClipboardList },
  { label: "Atividades", icon: Activity },
  { label: "Requisitos", icon: CheckSquare },
  { label: "Soluções e Versões", icon: Layers3 },
  { label: "Chamados", icon: Headset },
  { label: "Conhecimento", icon: BookOpen }
];

const secondaryNav: View[] = ["Indicadores", "Configurações"];

function useRecords() {
  const [items, setItems] = React.useState<RecordItem[]>(() => {
    try {
      const raw = localStorage.getItem("nexus-mvp-records-v2");
      return raw ? JSON.parse(raw) : seed;
    } catch {
      return seed;
    }
  });

  React.useEffect(() => {
    localStorage.setItem("nexus-mvp-records-v2", JSON.stringify(items));
  }, [items]);

  return [items, setItems] as const;
}

function statusClass(status: Status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function StatusPill({ status }: { status: Status }) {
  return <em className={"status-pill " + statusClass(status)}>{status}</em>;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function Navbar({
  active, onChange, onCreate
}: {
  active: View;
  onChange: (view: View) => void;
  onCreate: (type: WizardType) => void;
}) {
  const [more, setMore] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const [userOpen, setUserOpen] = React.useState(false);

  const select = (view: View) => {
    onChange(view);
    setMore(false);
    setMobile(false);
    setUserOpen(false);
  };

  return (
    <header className="nx-navbar">
      <div className="nx-navbar-main">
        <button className="nx-nav-brand" onClick={() => select("Dashboard")} aria-label="Ir para o Dashboard">
          <img src="/nexus-logo.svg" alt="NEXUS" />
          <span><strong>NEXUS</strong><small>CONEXÃO DE CONTEXTO</small></span>
        </button>

        <div className="nx-navbar-divider" />

        <nav className="nx-nav-links" aria-label="Navegação principal">
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? "active" : ""} onClick={() => select(label)}>
              <Icon size={14} />
              <span>{label === "Soluções e Versões" ? "Soluções" : label}</span>
            </button>
          ))}
          <div className="nx-nav-more">
            <button
              className={secondaryNav.includes(active) ? "active" : ""}
              onClick={() => setMore((value) => !value)}
              aria-expanded={more}
            >
              <MoreHorizontal size={14} /><span>Mais</span><ChevronDown size={11} />
            </button>
            {more && (
              <div className="nx-nav-dropdown">
                {secondaryNav.map((view) => (
                  <button key={view} onClick={() => select(view)}>
                    {view === "Indicadores" ? "Visão e indicadores" : "Configurações"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="nx-nav-actions">
          <button className="nx-nav-create" onClick={() => onCreate("demanda")}><Plus size={14} /> Nova demanda</button>
          <button className="global-search" onClick={() => window.dispatchEvent(new CustomEvent("nexus:search"))}>
            <Search size={15} /><span>Pesquisar</span><kbd>Ctrl K</kbd>
          </button>
          <button className="notification-icon" aria-label="Notificações" onClick={() => window.dispatchEvent(new CustomEvent("nexus:notifications"))}>
            <Bell size={17} /><i />
          </button>
          <div className="nx-user-menu">
            <button className="user nx-user-button" onClick={() => setUserOpen((value) => !value)}>
              <span className="avatar">T</span>
              <span><strong>Tester</strong><small>USUÁRIO</small></span>
              <ChevronDown size={12} />
            </button>
            {userOpen && (
              <div className="nx-user-dropdown">
                <div><span className="avatar">T</span><strong>Tester</strong></div>
                <button onClick={() => select("Configurações")}><Settings size={14} /> Configurações</button>
                <button onClick={() => setUserOpen(false)}>Fechar menu</button>
              </div>
            )}
          </div>
        </div>

        <button className="nx-mobile-toggle" onClick={() => setMobile((value) => !value)} aria-label="Abrir navegação">
          <span /><span /><span />
        </button>
      </div>

      <div className={"nx-mobile-panel " + (mobile ? "open" : "")}>
        <div className="nx-mobile-primary">
          {nav.map(({ label, icon: Icon }) => (
            <button key={label} className={active === label ? "active" : ""} onClick={() => select(label)}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div className="nx-mobile-secondary">
          {secondaryNav.map((view) => (
            <button key={view} onClick={() => select(view)}><Settings size={14} /> {view}</button>
          ))}
        </div>
        <button className="nx-mobile-create" onClick={() => { onCreate("demanda"); setMobile(false); }}>
          <Plus size={15} /> Nova demanda
        </button>
      </div>
    </header>
  );
}

function ContextStrip({ item }: { item: RecordItem }) {
  return (
    <div className="mvp-context-strip">
      <div><span>SOLUÇÃO</span><strong>{item.solution}</strong></div>
      <ChevronRight size={13} />
      <div><span>VERSÃO</span><strong>{item.version}</strong></div>
      <ChevronRight size={13} />
      <div><span>ORIGEM</span><strong>{item.parentId || item.id}</strong></div>
      <ChevronRight size={13} />
      <div><span>CONTEXTO</span><strong>{item.context}</strong></div>
    </div>
  );
}

function PeopleSection({
  item, onAssign, onMessage
}: {
  item: RecordItem;
  onAssign: (name: string) => void;
  onMessage: (person: Person) => void;
}) {
  const available = [people.analista, people.dev, people.suporte];

  return (
    <section className="mvp-detail-card">
      <div className="mvp-card-title">
        <div><span className="section-kicker">ENVOLVIDOS</span><h3>Quem participa deste registro</h3></div>
        <Users size={17} />
      </div>
      <div className="mvp-people-grid">
        <div className="mvp-person-row">
          <span className="mvp-person-avatar">{initials(item.requester.name)}</span>
          <div><span>Solicitante</span><strong>{item.requester.name}</strong><small>{item.requester.role}</small></div>
          <button onClick={() => onMessage(item.requester)}><MessageCircle size={13} /> Acionar</button>
        </div>
        <div className="mvp-person-row">
          <span className="mvp-person-avatar">{initials(item.assignee.name)}</span>
          <div><span>Responsável</span><strong>{item.assignee.name}</strong><small>{item.assignee.role}</small></div>
          <select value={item.assignee.name} onChange={(event) => onAssign(event.target.value)} aria-label="Alterar responsável">
            {available.map((person) => <option key={person.name}>{person.name}</option>)}
          </select>
        </div>
        {item.participants.map((person) => (
          <div className="mvp-person-row" key={person.name}>
            <span className="mvp-person-avatar">{initials(person.name)}</span>
            <div><span>Participante</span><strong>{person.name}</strong><small>{person.role}</small></div>
            <button onClick={() => onMessage(person)}><MessageCircle size={13} /> Falar</button>
          </div>
        ))}
      </div>
      <p className="mvp-section-note">As pessoas relacionadas acompanham o contexto e podem ser acionadas durante o andamento do registro.</p>
    </section>
  );
}

function CommunicationSection({
  item, onComment
}: {
  item: RecordItem;
  onComment: (text: string, recipient?: string) => void;
}) {
  const [message, setMessage] = React.useState("");
  const [recipient, setRecipient] = React.useState(item.requester.name);

  const send = () => {
    if (!message.trim()) return;
    onComment(message.trim(), recipient);
    setMessage("");
  };

  return (
    <section className="mvp-detail-card">
      <div className="mvp-card-title">
        <div><span className="section-kicker">COMUNICAÇÃO</span><h3>Conversas e atualizações</h3></div>
        <MessageCircle size={17} />
      </div>
      <div className="mvp-comment-list">
        {item.comments.length ? item.comments.map((comment) => (
          <div className="mvp-comment" key={comment.id}>
            <span className="mvp-person-avatar">{initials(comment.author)}</span>
            <div><strong>{comment.author}</strong><small>{comment.date}{comment.recipient ? " · para " + comment.recipient : ""}</small><p>{comment.text}</p></div>
          </div>
        )) : <div className="mvp-no-comments">Ainda não há mensagens neste registro.</div>}
      </div>
      <div className="mvp-compose">
        <div className="mvp-compose-top">
          <select value={recipient} onChange={(event) => setRecipient(event.target.value)}>
            {[item.requester, item.assignee, ...item.participants].filter((person, index, list) => list.findIndex((p) => p.name === person.name) === index).map((person) => (
              <option key={person.name}>{person.name}</option>
            ))}
          </select>
          <span>Mensagem interna registrada no contexto</span>
        </div>
        <div className="mvp-compose-input">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva uma atualização, dúvida ou solicitação..." rows={3} />
          <button onClick={send} disabled={!message.trim()}><Send size={14} /> Enviar</button>
        </div>
      </div>
    </section>
  );
}

function LifecycleActions({
  item, onStatus
}: {
  item: RecordItem;
  onStatus: (status: Status) => void;
}) {
  const canDevelop = item.type === "Demanda" || item.type === "Atividade" || item.type === "Solução" || item.type === "Versão";
  return (
    <section className="mvp-lifecycle">
      <div>
        <span className="section-kicker">PRÓXIMA AÇÃO</span>
        <strong>{item.status === "Concluído" ? "Registro concluído" : item.status === "Em desenvolvimento" ? "Trabalho em andamento" : "Defina quem assume e avance o registro"}</strong>
        <small>O status representa o estágio atual do trabalho e fica visível para os envolvidos.</small>
      </div>
      <div className="mvp-lifecycle-actions">
        {item.status === "Pendente" && <button className="secondary-action" onClick={() => onStatus("Em análise")}><Clock3 size={14} /> Iniciar análise</button>}
        {item.status !== "Em desenvolvimento" && item.status !== "Concluído" && canDevelop && <button className="primary" onClick={() => onStatus("Em desenvolvimento")}><Activity size={14} /> Colocar em desenvolvimento</button>}
        {item.status === "Em desenvolvimento" && canDevelop && <button className="primary" onClick={() => onStatus("Em validação")}><ShieldCheck size={14} /> Enviar para validação</button>}
        {item.status === "Em validação" && canDevelop && <button className="primary" onClick={() => onStatus("Concluído")}><Check size={14} /> Validar e concluir</button>}
        {item.status !== "Concluído" && !canDevelop && <button className="primary" onClick={() => onStatus("Concluído")}><Check size={14} /> Concluir</button>}
      </div>
    </section>
  );
}

function Detail({
  item, onClose, onUpdate, onAddComment, onOpen
}: {
  item: RecordItem;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<RecordItem>) => void;
  onAddComment: (id: string, text: string, recipient?: string) => void;
  onOpen: (item: RecordItem) => void;
}) {
  const [approved, setApproved] = React.useState(item.aiValidated ?? false);
  const isTicket = item.type === "Chamado";
  const isWork = item.type === "Demanda" || item.type === "Atividade";
  const isCollaborative = isWork || item.type === "Chamado";

  const openRelated = (id: string) => {
    const relation = window.dispatchEvent(new CustomEvent("nexus:open-related", { detail: id }));
    void relation;
  };

  const updateStatus = (status: Status) => onUpdate(item.id, { status });
  const assign = (name: string) => {
    const person = [people.analista, people.dev, people.suporte].find((candidate) => candidate.name === name);
    if (person) onUpdate(item.id, { assignee: person });
  };

  const addComment = (text: string, recipient?: string) => onAddComment(item.id, text, recipient);

  return (
    <div className="mvp-overlay" onClick={onClose}>
      <aside className="mvp-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="mvp-drawer-head">
          <div>
            <span className="eyebrow">{item.type.toUpperCase()} · {item.id}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <ContextStrip item={item} />

        <div className="mvp-detail-body">
          <section className="mvp-detail-card">
            <div className="mvp-card-title">
              <div><span className="section-kicker">VISÃO DO REGISTRO</span><h3>Informações principais</h3></div>
              <StatusPill status={item.status} />
            </div>
            <div className="mvp-fields">
              <div><span>Prioridade</span><strong>{item.priority}</strong></div>
              <div><span>Prazo</span><strong>{item.dueDate || "Sem prazo definido"}</strong></div>
              <div><span>Solução</span><strong>{item.solution}</strong></div>
              <div><span>Versão</span><strong>{item.version}</strong></div>
              <div><span>Objetivo</span><strong>{item.objective || "Informação não definida"}</strong></div>
              <div><span>Atualizado em</span><strong>{item.date}</strong></div>
            </div>
          </section>

          {isWork && <LifecycleActions item={item} onStatus={updateStatus} />}

          {isCollaborative && <PeopleSection item={item} onAssign={assign} onMessage={(person) => addComment("Solicitação enviada para " + person.name + ".", person.name)} />}

          {isCollaborative && <CommunicationSection item={item} onComment={addComment} />}

          {isTicket && (
            <section className="mvp-ai-card">
              <div className="mvp-ai-head"><span><Sparkles size={16} /> SUGESTÃO DA IA</span><em>{approved ? "Validada pelo responsável" : "Aguardando validação"}</em></div>
              <h3>Possíveis caminhos de diagnóstico</h3>
              <p>O NEXUS recupera o contexto relacionado ao chamado e apresenta uma sugestão para apoiar o profissional. A IA não confirma a causa nem encerra o atendimento sozinha.</p>
              <div className="mvp-suggestion">
                <strong>Possível causa</strong>
                <span>Configuração de autenticação relacionada à versão {item.version}.</span>
                <strong>Procedimento sugerido</strong>
                <ol><li>Verificar a configuração de autenticação.</li><li>Validar as permissões do usuário afetado.</li><li>Comparar o comportamento com o requisito relacionado.</li></ol>
              </div>
              <div className="mvp-evidence"><span><Link2 size={13} /> Contexto utilizado</span><button onClick={() => openRelated("REQ-014")}>REQ-014</button><button onClick={() => openRelated("KB-007")}>KB-007</button><button onClick={() => openRelated(item.version)}>{item.version}</button></div>
              <div className="mvp-validation">
                <strong><ShieldCheck size={15} /> Validação humana obrigatória</strong>
                <div>
                  <button className="secondary-action" onClick={() => setApproved(false)}><Pencil size={14} /> Editar</button>
                  <button className="primary" onClick={() => { setApproved(true); onUpdate(item.id, { status: "Concluído", aiValidated: true }); }}><Check size={14} /> Aprovar sugestão</button>
                </div>
              </div>
            </section>
          )}

          {!isTicket && item.type !== "Conhecimento" && (
            <section className="mvp-detail-card">
              <div className="mvp-card-title"><div><span className="section-kicker">RASTREABILIDADE</span><h3>Próximos e anteriores no fluxo</h3></div><Link2 size={17} /></div>
              <div className="mvp-trace">
                <div><strong>Demanda</strong><span>{item.type === "Demanda" ? item.id : item.parentId || "DEM-012"}</span></div>
                <ArrowRight size={13} />
                <div><strong>Requisito</strong><span>REQ-014</span></div>
                <ArrowRight size={13} />
                <div><strong>Versão</strong><span>{item.version}</span></div>
                <ArrowRight size={13} />
                <div><strong>Suporte</strong><span>CH-028</span></div>
                <ArrowRight size={13} />
                <div><strong>Conhecimento</strong><span>KB-007</span></div>
              </div>
            </section>
          )}

          {item.type === "Conhecimento" && (
            <section className="mvp-detail-card">
              <div className="mvp-card-title"><div><span className="section-kicker">REUTILIZAÇÃO</span><h3>Conhecimento validado</h3></div><CheckCircle2 size={17} /></div>
              <div className="mvp-knowledge-box"><strong>Este conhecimento pode apoiar novos chamados.</strong><span>Origem: CH-028 · Solução: {item.solution} · Versão: {item.version}</span><b>Reutilizado {item.reuseCount || 0} vezes</b></div>
            </section>
          )}
        </div>

        <div className="mvp-drawer-footer">
          <button className="secondary-action" onClick={onClose}>Fechar</button>
          {isTicket && <button className="primary" onClick={() => onUpdate(item.id, { status: "Concluído" })}><CheckCircle2 size={14} /> Encerrar atendimento</button>}
        </div>
      </aside>
    </div>
  );
}

function Wizard({
  type, onClose, onCreate
}: {
  type: WizardType;
  onClose: () => void;
  onCreate: (record: RecordItem) => void;
}) {
  const demand = type === "demanda";
  const steps = demand ? ["Identificação", "Pessoas", "Contexto", "Objetivo", "Revisão"] : ["Identificação", "Pessoas", "Planejamento", "Execução", "Revisão"];
  const [step, setStep] = React.useState(0);
  const [saved, setSaved] = React.useState(false);
  const [data, setData] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("nexus-" + type + "-draft-v2");
      if (raw) {
        const draft = JSON.parse(raw);
        setData(draft.data || {});
        setStep(Math.min(draft.step || 0, steps.length - 1));
      }
    } catch { /* draft inválido: começa novamente */ }
  }, [type, steps.length]);

  const update = (key: string, value: string) => setData((current) => ({ ...current, [key]: value }));

  const saveStep = (nextStep = step) => {
    localStorage.setItem("nexus-" + type + "-draft-v2", JSON.stringify({
      step: Math.min(nextStep, steps.length - 1), data, savedAt: new Date().toISOString()
    }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const next = () => {
    const nextStep = Math.min(step + 1, steps.length - 1);
    saveStep(nextStep);
    setStep(nextStep);
  };

  const finish = () => {
    saveStep();
    const requester = demand ? { ...people.solicitante } : { ...people.analista };
    const assignee = data.responsavel === people.suporte.name ? people.suporte : data.responsavel === people.analista.name ? people.analista : people.dev;
    const id = (demand ? "DEM-" : "ATV-") + String(Date.now()).slice(-4);
    onCreate({
      id, title: data.titulo || (demand ? "Nova demanda" : "Nova atividade"),
      description: data.descricao || "Registro criado no NEXUS.",
      type: demand ? "Demanda" : "Atividade",
      status: "Pendente", context: data.contexto || "Contexto inicial",
      solution: data.solucao || "Portal de Atendimento", version: data.versao || "v1.2.0",
      date: new Date().toLocaleDateString("pt-BR"), priority: (data.prioridade as RecordItem["priority"]) || "Normal",
      requester, assignee, participants: data.participante ? [{ name: data.participante, role: "Participante", kind: "Participante" }] : [],
      relatedIds: data.demanda ? [data.demanda] : [], comments: [], objective: data.objetivo, dueDate: data.prazo
    });
    localStorage.removeItem("nexus-" + type + "-draft-v2");
    onClose();
  };

  return (
    <div className="wizard-overlay" role="dialog" aria-modal="true">
      <div className="wizard-modal mvp-wizard">
        <div className="wizard-header">
          <div><span className="section-kicker">NOVA {demand ? "DEMANDA" : "ATIVIDADE"}</span><h2>{demand ? "Construir uma nova demanda" : "Registrar atividade"}</h2><p>O contexto é salvo a cada etapa e continua disponível para os envolvidos.</p></div>
          <button className="close-button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="stepper">
          {steps.map((label, index) => (
            <React.Fragment key={label}>
              <div className={"step " + (index === step ? "active" : index < step ? "done" : "")}><span>{index < step ? <Check size={13} /> : index + 1}</span><small>{label}</small></div>
              {index < steps.length - 1 && <div className={"step-line " + (index < step ? "done" : "")} />}
            </React.Fragment>
          ))}
        </div>

        <div className="wizard-body">
          {step === 0 && <WizardIntroForm title={demand ? "Comece pelo essencial" : "Defina o trabalho"} text={demand ? "Explique a necessidade de forma objetiva." : "Explique o que precisa ser realizado."} fields={[
            ["titulo", demand ? "Título da demanda" : "Título da atividade", "Ex.: Melhorar recuperação de senha", "input"],
            ["descricao", demand ? "Descrição inicial" : "Descrição da atividade", "O que precisa acontecer?", "textarea"]
          ]} data={data} update={update} />}
          {step === 1 && <WizardPeople demand={demand} data={data} update={update} />}
          {step === 2 && <WizardContext demand={demand} data={data} update={update} />}
          {step === 3 && <WizardPlanning demand={demand} data={data} update={update} />}
          {step === 4 && <div className="review-box"><div className="review-icon"><CheckCircle2 size={24} /></div><h3>Revise antes de concluir</h3><p>O registro ficará disponível no fluxo e poderá ser assumido por um responsável.</p><div className="review-summary"><span>Tipo</span><strong>{demand ? "Demanda" : "Atividade"}</strong><span>Título</span><strong>{data.titulo || "Não informado"}</strong><span>Solicitante</span><strong>{demand ? people.solicitante.name : people.analista.name}</strong><span>Responsável</span><strong>{data.responsavel || "João Silva"}</strong><span>Prioridade</span><strong>{data.prioridade || "Normal"}</strong><span>Contexto</span><strong>{data.contexto || "Contexto inicial"}</strong></div></div>}
        </div>

        <div className="wizard-footer">
          <span className={"save-status " + (saved ? "visible" : "")}><CheckCircle2 size={14} /> Salvo</span>
          <span className="step-count">Etapa {step + 1} de {steps.length}</span>
          <div className="wizard-actions">
            <button className="secondary-action" onClick={step === 0 ? onClose : () => setStep((value) => value - 1)}>{step === 0 ? "Cancelar" : <><ChevronLeft size={15} /> Voltar</>}</button>
            {step < steps.length - 1 ? <button className="primary" onClick={next}>Salvar e continuar <ChevronRight size={15} /></button> : <button className="primary" onClick={finish}>Criar registro <Check size={15} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function WizardIntroForm({
  title, text, fields, data, update
}: {
  title: string; text: string; fields: string[][]; data: Record<string, string>; update: (key: string, value: string) => void;
}) {
  return <div className="wizard-form">
    <WizardIntro icon={<ClipboardList size={18} />} title={title} text={text} />
    {fields.map(([key, label, placeholder, kind]) => (
      <label key={key}>{label}{kind === "textarea"
        ? <textarea value={data[key] || ""} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} rows={5} />
        : <input value={data[key] || ""} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} />}
    </label>
    ))}
  </div>;
}

function WizardPeople({ demand, data, update }: { demand: boolean; data: Record<string, string>; update: (key: string, value: string) => void }) {
  return <div className="wizard-form">
    <WizardIntro icon={<Users size={18} />} title="Defina os envolvidos" text="Quem solicitou, quem receberá e quem participará ficam vinculados ao contexto." />
    <div className="form-grid">
      <label>{demand ? "Solicitante" : "Responsável pela atividade"}<select value={data.responsavel || (demand ? people.solicitante.name : people.dev.name)} onChange={(event) => update("responsavel", event.target.value)}>
        {[people.solicitante.name, people.analista.name, people.dev.name, people.suporte.name].map((name) => <option key={name}>{name}</option>)}
      </select></label>
      <label>Participante<input value={data.participante || ""} onChange={(event) => update("participante", event.target.value)} placeholder="Ex.: Rafael Mendes" /></label>
    </div>
    <label>Observação para os envolvidos<textarea value={data.observacaoPessoas || ""} onChange={(event) => update("observacaoPessoas", event.target.value)} rows={4} placeholder="Ex.: validar com o solicitante antes da entrega..." /></label>
  </div>;
}

function WizardContext({ demand, data, update }: { demand: boolean; data: Record<string, string>; update: (key: string, value: string) => void }) {
  return <div className="wizard-form">
    <WizardIntro icon={<Database size={18} />} title="Preserve o contexto" text="Estas informações acompanharão o registro nos próximos estágios." />
    <div className="form-grid">
      <label>{demand ? "Área solicitante" : "Demanda relacionada"}<input value={data.demanda || ""} onChange={(event) => update("demanda", event.target.value)} placeholder={demand ? "Ex.: Atendimento" : "Ex.: DEM-012"} /></label>
      <label>Origem<input value={data.origem || ""} onChange={(event) => update("origem", event.target.value)} placeholder="Ex.: Suporte" /></label>
    </div>
    <label>Contexto e informações adicionais<textarea value={data.contexto || ""} onChange={(event) => update("contexto", event.target.value)} rows={5} placeholder="Regras, exemplos, referências, impacto ou observações..." /></label>
  </div>;
}

function WizardPlanning({ demand, data, update }: { demand: boolean; data: Record<string, string>; update: (key: string, value: string) => void }) {
  return <div className="wizard-form">
    <WizardIntro icon={<CheckSquare size={18} />} title={demand ? "Objetivo e prioridade" : "Planeje a execução"} text="Deixe claro o resultado esperado e o que deve acontecer a seguir." />
    <label>{demand ? "Objetivo esperado" : "Resultado esperado"}<textarea value={data.objetivo || ""} onChange={(event) => update("objetivo", event.target.value)} rows={4} placeholder="Descreva o resultado esperado..." /></label>
    <div className="form-grid">
      <label>Prioridade<select value={data.prioridade || ""} onChange={(event) => update("prioridade", event.target.value)}><option value="">Selecionar</option><option>Alta</option><option>Média</option><option>Baixa</option></select></label>
      <label>Prazo<input type="date" value={data.prazo || ""} onChange={(event) => update("prazo", event.target.value)} /></label>
      <label>Solução relacionada<input value={data.solucao || ""} onChange={(event) => update("solucao", event.target.value)} placeholder="Portal de Atendimento" /></label>
      <label>Versão<input value={data.versao || ""} onChange={(event) => update("versao", event.target.value)} placeholder="v1.2.0" /></label>
    </div>
  </div>;
}

function WizardIntro({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="wizard-intro"><div className="wizard-intro-icon">{icon}</div><div><strong>{title}</strong><span>{text}</span></div></div>;
}

function Dashboard({ items, onChange, onCreate, onOpen }: {
  items: RecordItem[]; onChange: (view: View) => void; onCreate: (type: WizardType) => void; onOpen: (item: RecordItem) => void;
}) {
  const demands = items.filter((item) => item.type === "Demanda");
  const activities = items.filter((item) => item.type === "Atividade");
  const tickets = items.filter((item) => item.type === "Chamado");
  const requirements = items.filter((item) => item.type === "Requisito");
  const knowledge = items.filter((item) => item.type === "Conhecimento");
  const pendingValidation = items.filter((item) => item.status === "Em validação").length;
  const activeTickets = tickets.filter((item) => item.status !== "Concluído").length;
  const contextLinked = items.filter((item) => item.context.includes("Contexto") || item.context.includes("Vinculad")).length;
  const contextPercent = Math.round((contextLinked / Math.max(items.length, 1)) * 100);

  const attention = [
    ...tickets.filter((item) => item.status === "Em validação").map((item) => ({ item, label: "Validar sugestão do atendimento", tone: "orange" })),
    ...demands.filter((item) => item.status !== "Concluído").slice(0, 2).map((item) => ({ item, label: item.status === "Em desenvolvimento" ? "Acompanhar desenvolvimento" : "Definir responsável", tone: "blue" })),
    ...activities.filter((item) => item.status === "Em desenvolvimento").slice(0, 1).map((item) => ({ item, label: "Acompanhar atividade", tone: "green" }))
  ].slice(0, 4);

  return <main className="content nexus-dashboard">
    <section className="nx-welcome"><div><span className="eyebrow">VISÃO GERAL</span><h1>Olá, Tester.</h1><p>O NEXUS conecta quem solicita, quem desenvolve e quem atende.</p></div><div className="nx-welcome-actions"><button className="secondary-action" onClick={() => onCreate("atividade")}><Activity size={14} /> Nova atividade</button><button className="primary" onClick={() => onCreate("demanda")}><Plus size={14} /> Nova demanda</button></div></section>

    <section className="nx-stat-grid">
      <Stat title="Demandas em andamento" value={String(demands.filter((item) => item.status !== "Concluído").length)} trend="acompanhe o trabalho" icon={<ClipboardList size={17} />} tone="blue" />
      <Stat title="Atividades em desenvolvimento" value={String(activities.filter((item) => item.status === "Em desenvolvimento").length)} trend="trabalho ativo" icon={<Activity size={17} />} tone="green" />
      <Stat title="Chamados abertos" value={String(activeTickets)} trend="com contexto de suporte" icon={<Headset size={17} />} tone="orange" />
      <Stat title="Aguardando validação" value={String(pendingValidation)} trend="ação necessária" icon={<ShieldCheck size={17} />} tone="purple" />
    </section>

    <section className="nx-main-grid">
      <div className="nx-main-column">
        <article className="panel nx-panel nx-flow-panel">
          <div className="nx-panel-head"><div><span className="section-kicker">FLUXO DE CONTEXTO</span><h2>Da demanda ao conhecimento</h2></div><span className="nx-period">NEXUS</span></div>
          <div className="mvp-flow"><span className="done">Demanda</span><ArrowRight size={11} /><span className="done">Requisitos</span><ArrowRight size={11} /><span className="done">Versão</span><ArrowRight size={11} /><span className="current">Chamado</span><ArrowRight size={11} /><span>IA sugere</span><ArrowRight size={11} /><span>Humano valida</span><ArrowRight size={11} /><span>Conhecimento</span></div>
          <div className="mvp-flow-note"><Database size={15} /><div><strong>O contexto acompanha o trabalho.</strong><span>Quando um chamado chega, o NEXUS recupera relações com requisitos, versão e conhecimento antes da sugestão da IA.</span></div></div>
        </article>

        <article className="panel nx-panel">
          <div className="nx-panel-head"><div><span className="section-kicker">ATENDIMENTO</span><h2>Chamados que precisam de ação</h2></div><button className="panel-link" onClick={() => onChange("Chamados")}>Ver todos <ArrowRight size={12} /></button></div>
          <div className="mvp-ticket-list">
            {tickets.filter((item) => item.status !== "Concluído").slice(0, 4).map((item) => (
              <button className="mvp-ticket-row" key={item.id} onClick={() => onOpen(item)}>
                <span className="ticket-icon"><Headset size={14} /></span>
                <span><strong>{item.id} · {item.title}</strong><small>{item.context} · {item.assignee.name}</small></span>
                <StatusPill status={item.status} /><ArrowRight size={13} />
              </button>
            ))}
          </div>
        </article>
      </div>

      <aside className="nx-side-column">
        <article className="panel nx-panel nx-context-card">
          <div className="nx-context-head"><div><span className="section-kicker">CONTEXTO DA SOLUÇÃO</span><h2>Continuidade</h2></div><Database size={17} /></div>
          <div className="nx-context-body"><div className="nx-context-ring"><strong>{contextPercent}%</strong><span>relacionado</span></div><div className="nx-context-copy"><strong>{contextLinked} registros com contexto</strong><p>Demandas, requisitos, versões e suporte permanecem conectados.</p></div></div>
          <div className="nx-context-flow"><span>Desenvolvimento</span><ArrowRight size={12} /><span>Suporte</span><ArrowRight size={12} /><span>Conhecimento</span></div>
        </article>

        <article className="panel nx-panel nx-attention">
          <div className="nx-panel-head compact"><div><span className="section-kicker">ATENÇÃO</span><h2>O que precisa da sua atenção</h2></div></div>
          <div className="mvp-attention">
            {attention.length ? attention.map(({ item, label, tone }) => <button key={item.id} onClick={() => onOpen(item)}><span className={"nx-priority-icon " + tone}><CircleAlert size={13} /></span><span><strong>{label}</strong><small>{item.id} · {item.title}</small></span><ChevronRight size={14} /></button>) : <div className="mvp-no-comments">Nenhuma pendência no momento.</div>}
          </div>
        </article>
      </aside>
    </section>

    <section className="nx-bottom-grid">
      <article className="panel nx-panel">
        <div className="nx-panel-head compact"><div><span className="section-kicker">RASTREABILIDADE</span><h2>Exemplo de contexto completo</h2></div><Link2 size={16} /></div>
        <div className="mvp-trace"><div><strong>DEM-012</strong><span>Demanda</span></div><ArrowRight size={12} /><div><strong>REQ-014</strong><span>Requisito</span></div><ArrowRight size={12} /><div><strong>v1.2.0</strong><span>Versão</span></div><ArrowRight size={12} /><div><strong>CH-028</strong><span>Chamado</span></div><ArrowRight size={12} /><div><strong>KB-007</strong><span>Conhecimento</span></div></div>
      </article>
      <article className="panel nx-panel">
        <div className="nx-panel-head compact"><div><span className="section-kicker">BASE DE CONHECIMENTO</span><h2>Conhecimento reutilizável</h2></div><button className="panel-link" onClick={() => onChange("Conhecimento")}>Abrir base <ArrowRight size={12} /></button></div>
        <div className="mvp-knowledge-summary"><strong>{knowledge.reduce((total, item) => total + (item.reuseCount || 0), 0)}</strong><span>reutilizações registradas no conhecimento validado.</span></div>
      </article>
    </section>
  </main>;
}

function Stat({ title, value, trend, icon, tone }: { title: string; value: string; trend: string; icon: React.ReactNode; tone: string }) {
  return <article className="stat-card"><div className={"stat-icon " + tone}>{icon}</div><span>{title}</span><strong>{value}</strong><small>{trend}</small></article>;
}

function Module({
  view, items, onOpen, onCreate
}: {
  view: Exclude<View, "Dashboard">; items: RecordItem[]; onOpen: (item: RecordItem) => void; onCreate: (type: WizardType) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<"Todos" | Status>("Todos");
  const moduleType: Record<string, RecordItem["type"] | undefined> = {
    Demandas: "Demanda", Atividades: "Atividade", Requisitos: "Requisito", Chamados: "Chamado", Conhecimento: "Conhecimento", "Soluções e Versões": undefined
  };
  const list = moduleType[view] ? items.filter((item) => item.type === moduleType[view]) : items.filter((item) => item.type === "Solução" || item.type === "Versão");
  const filtered = list.filter((item) => (filter === "Todos" || item.status === filter) && (item.id + " " + item.title + " " + item.description + " " + item.assignee.name).toLowerCase().includes(query.toLowerCase()));
  const description: Record<string, string> = {
    Demandas: "Necessidades registradas por quem solicita, com responsáveis, participantes e contexto.",
    Atividades: "Trabalho executável relacionado a uma demanda, com responsável, prazo e comunicação.",
    Requisitos: "Especificações que transformam uma demanda em algo rastreável e validável.",
    "Soluções e Versões": "Onde o contexto técnico e funcional fica associado à solução entregue.",
    Chamados: "Atendimento com recuperação de contexto antes da sugestão da IA.",
    Conhecimento: "Soluções validadas que podem ser reutilizadas em novos atendimentos.",
    Indicadores: "Acompanhe o fluxo, os estados e a continuidade do contexto.",
    Configurações: "Preferências e parâmetros do ambiente NEXUS."
  };
  const canCreate = view === "Demandas" || view === "Atividades";

  return <main className="content nx-module-page">
    <div className="nx-breadcrumb"><button onClick={() => window.dispatchEvent(new CustomEvent("nexus:go-dashboard"))}>Início</button><ChevronRight size={11} /><span>{view}</span></div>
    <div className="page-heading nx-module-heading">
      <div><span className="eyebrow">{view.toUpperCase()}</span><h1>{view}</h1><p>{description[view]}</p></div>
      <div className="nx-page-actions">
        {canCreate && <button className="primary" onClick={() => onCreate(view === "Demandas" ? "demanda" : "atividade")}><Plus size={15} /> {view === "Demandas" ? "Nova demanda" : "Nova atividade"}</button>}
        {view === "Chamados" && <button className="secondary-action" onClick={() => { const ticket = items.find((item) => item.id === "CH-028"); if (ticket) onOpen(ticket); }}><Headset size={14} /> Atender chamado</button>}
      </div>
    </div>

    {view !== "Indicadores" && view !== "Configurações" && <div className="nx-module-summary">
      <div><strong>{list.length}</strong><span>registros</span></div>
      <div><strong>{list.filter((item) => item.status === "Em validação").length}</strong><span>em validação</span></div>
      <div><strong>{Math.round(list.filter((item) => item.context.length > 0).length / Math.max(list.length, 1) * 100)}%</strong><span>com contexto</span></div>
    </div>}

    {(view === "Indicadores" || view === "Configurações") ? <SpecialModule view={view} items={items} /> :
      <div className="module-panel nx-module-panel">
        <div className="module-toolbar nx-module-toolbar">
          <div className="module-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "Chamados" ? "Pesquisar chamado, erro ou solução..." : "Pesquisar no módulo..."} /></div>
          <div className="nx-toolbar-filters">
            {(["Todos", "Pendente", "Em análise", "Em desenvolvimento", "Em validação", "Concluído"] as const).map((option) => <button key={option} className={"nx-filter " + (filter === option ? "active" : "")} onClick={() => setFilter(option)}>{option}</button>)}
          </div>
        </div>
        <div className="nx-list-head"><span>Registro</span><span>Contexto</span><span>Status</span><span /></div>
        {filtered.map((item) => <button className="nx-module-row" key={item.id} onClick={() => onOpen(item)}>
          <span className="nx-record-main"><strong>{item.id} · {item.title}</strong><small>{item.description} · {item.assignee.name}</small></span>
          <span className="nx-record-context"><i />{item.context}</span>
          <StatusPill status={item.status} />
          <ArrowRight size={14} />
        </button>)}
        {!filtered.length && <div className="mvp-empty"><Search size={20} /><strong>Nenhum registro encontrado</strong><span>Tente outro termo ou filtro.</span></div>}
      </div>}
    {view !== "Indicadores" && view !== "Configurações" && <div className="nx-module-hint"><Database size={14} /><span><strong>O contexto acompanha o registro.</strong> Pessoas, requisitos, versões, chamados e conhecimentos permanecem relacionados ao longo do fluxo.</span></div>}
  </main>;
}

function SpecialModule({ view, items }: { view: "Indicadores" | "Configurações"; items: RecordItem[] }) {
  if (view === "Configurações") return <div className="special-module-grid">
    <section className="panel settings-card"><span className="section-kicker">AMBIENTE</span><h2>Configurações do NEXUS</h2><p>Preferências que complementam o fluxo sem alterar o papel da validação humana.</p><label>Nome exibido<input defaultValue="Tester" /></label><label>Notificações<select defaultValue="Atividades e validações"><option>Atividades e validações</option><option>Todas as movimentações</option><option>Somente urgentes</option></select></label></section>
    <section className="panel settings-card"><span className="section-kicker">REGRAS DO FLUXO</span><h2>Princípios do NEXUS</h2><div className="setting-rule"><CheckCircle2 size={15} /><span><strong>Validação humana</strong> Sugestões da IA nunca encerram um atendimento sozinhas.</span></div><div className="setting-rule"><CheckCircle2 size={15} /><span><strong>Rastreabilidade</strong> O suporte deve conseguir voltar ao requisito e à versão.</span></div><div className="setting-rule"><CheckCircle2 size={15} /><span><strong>Contexto compartilhado</strong> Envolvidos e comunicações acompanham o registro.</span></div></section>
  </div>;

  const tickets = items.filter((item) => item.type === "Chamado");
  const validated = items.filter((item) => item.aiValidated).length;
  return <div className="special-module-grid indicators-grid">
    <section className="panel indicator-big"><span>Chamados abertos</span><strong>{tickets.filter((item) => item.status !== "Concluído").length}</strong><small>atendimentos ainda em fluxo</small></section>
    <section className="panel indicator-big"><span>Validações pendentes</span><strong>{items.filter((item) => item.status === "Em validação").length}</strong><small>ações humanas necessárias</small></section>
    <section className="panel indicator-big"><span>Conhecimentos validados</span><strong>{items.filter((item) => item.type === "Conhecimento").length}</strong><small>itens disponíveis para reuso</small></section>
    <section className="panel indicator-big"><span>Sugestões validadas</span><strong>{validated}</strong><small>IA utilizada como apoio</small></section>
  </div>;
}

function App() {
  const [active, setActive] = React.useState<View>("Dashboard");
  const [items, setItems] = useRecords();
  const [wizard, setWizard] = React.useState<WizardType | null>(null);
  const [selected, setSelected] = React.useState<RecordItem | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const openSearch = () => setSearchOpen(true);
    const goDashboard = () => setActive("Dashboard");
    const openRelated = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      const found = items.find((item) => item.id === id);
      if (found) setSelected(found);
    };
    const openNotifications = () => setNotifications(true);
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setWizard(null);
        setSelected(null);
        setNotifications(false);
      }
    };
    window.addEventListener("nexus:search", openSearch);
    window.addEventListener("nexus:go-dashboard", goDashboard);
    window.addEventListener("nexus:open-related", openRelated);
    window.addEventListener("nexus:notifications", openNotifications);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("nexus:search", openSearch);
      window.removeEventListener("nexus:go-dashboard", goDashboard);
      window.removeEventListener("nexus:open-related", openRelated);
      window.removeEventListener("nexus:notifications", openNotifications);
      window.removeEventListener("keydown", keydown);
    };
  }, [items]);

  const updateRecord = (id: string, patch: Partial<RecordItem>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    setSelected((current) => current && current.id === id ? { ...current, ...patch } : current);
  };

  const addComment = (id: string, text: string, recipient?: string) => {
    const comment: Comment = { id: "c-" + Date.now(), author: "Tester", text, recipient, date: new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) };
    setItems((current) => current.map((item) => item.id === id ? { ...item, comments: [...item.comments, comment] } : item));
    setSelected((current) => current && current.id === id ? { ...current, comments: [...current.comments, comment] } : current);
  };

  const createRecord = (record: RecordItem) => {
    setItems((current) => [record, ...current]);
    setActive(record.type === "Demanda" ? "Demandas" : "Atividades");
  };

  const globalResults = items.filter((item) => (item.id + " " + item.title + " " + item.description + " " + item.solution).toLowerCase().includes(search.toLowerCase())).slice(0, 8);

  return <div className="app">
    <div className="main">
      <Navbar active={active} onChange={setActive} onCreate={setWizard} />
      {active === "Dashboard"
        ? <Dashboard items={items} onChange={setActive} onCreate={setWizard} onOpen={setSelected} />
        : <Module view={active} items={items} onOpen={setSelected} onCreate={setWizard} />}
    </div>

    {wizard && <Wizard type={wizard} onClose={() => setWizard(null)} onCreate={createRecord} />}
    {selected && <Detail item={selected} onClose={() => setSelected(null)} onUpdate={updateRecord} onAddComment={addComment} onOpen={setSelected} />}

    {searchOpen && <div className="search-overlay" onClick={() => setSearchOpen(false)}>
      <div className="search-dialog mvp-search" onClick={(event) => event.stopPropagation()}>
        <div className="search-dialog-head"><Search size={16} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar demandas, atividades, requisitos, chamados..." /><button onClick={() => setSearchOpen(false)}><X size={16} /></button></div>
        <div className="mvp-search-results">
          {search && globalResults.map((item) => <button key={item.id} onClick={() => { setSelected(item); setSearchOpen(false); }}><span><strong>{item.id} · {item.title}</strong><small>{item.type} · {item.solution}</small></span><ArrowRight size={13} /></button>)}
          {!search && <div className="search-empty"><Search size={22} /><strong>Pesquisa global</strong><span>Comece a digitar para encontrar qualquer registro do NEXUS.</span></div>}
          {search && !globalResults.length && <div className="search-empty"><Search size={22} /><strong>Nenhum resultado</strong><span>Tente o ID, título ou nome da solução.</span></div>}
        </div>
      </div>
    </div>}

    {notifications && <div className="search-overlay" onClick={() => setNotifications(false)}>
      <div className="notification-popover" onClick={(event) => event.stopPropagation()}>
        <div className="notification-head"><strong>Notificações</strong><button onClick={() => setNotifications(false)}><X size={15} /></button></div>
        <div className="notification-item"><CircleAlert size={15} /><div><strong>CH-028 aguarda sua validação</strong><span>A sugestão da IA foi preparada a partir do contexto recuperado.</span></div></div>
        <div className="notification-item"><MessageCircle size={15} /><div><strong>DEM-012 recebeu uma atualização</strong><span>João Silva registrou que a demanda está em desenvolvimento.</span></div></div>
        <div className="notification-item"><Activity size={15} /><div><strong>ATV-021 está em desenvolvimento</strong><span>O responsável pode registrar novas atualizações.</span></div></div>
      </div>
    </div>}
  </div>;
}

export default App;
