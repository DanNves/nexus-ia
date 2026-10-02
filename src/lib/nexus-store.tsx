import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { seedRecords, team, people } from './nexus-data';
import type { NexusRecord, WizardDraft, WizardType, Status, Person } from './nexus-models';

type Store = {
 records: NexusRecord[]; selected: NexusRecord | null; setSelected: (record: NexusRecord | null) => void;
 wizard: WizardType | null; setWizard: (type: WizardType | null) => void; feedback: string;
 addRecord: (draft: WizardDraft, type: WizardType) => void; addComment: (id:string,text:string) => void;
 analyzeAi: (id:string) => void; validateAi: (id:string,accepted:boolean) => void;
 registerKnowledge: (id:string) => void; changeStatus: (id:string,status:Status) => void;
 aiContextFor: (id:string) => NexusRecord[]; find: (id:string) => NexusRecord | undefined;
};
const Context = createContext<Store | null>(null);
const storageKey = 'nexus-angular-records';
function initial(): NexusRecord[] { return seedRecords; }
export function NexusProvider({children}: {children:ReactNode}) {
 const [records,setRecords] = useState<NexusRecord[]>(initial);
 const [selectedId,setSelectedId] = useState<string | null>(null);
 const [wizard,setWizard] = useState<WizardType | null>(null);
 const [feedback,setFeedback] = useState('');
 const [ready,setReady] = useState(false);
 useEffect(() => { try { const raw=localStorage.getItem(storageKey); if(raw){const saved=JSON.parse(raw) as NexusRecord[]; const map=new Map(saved.map(r=>[r.id,r]));setRecords(seedRecords.map(seed=>({...seed,...map.get(seed.id)})).concat(saved.filter(r=>!seedRecords.some(s=>s.id===r.id))));} } catch {} setReady(true); },[]);
 useEffect(() => { if(ready) localStorage.setItem(storageKey,JSON.stringify(records)); },[records,ready]);
 const flash=(message:string)=>{setFeedback(message);window.setTimeout(()=>setFeedback(''),2700)};
 const update=(id:string,patch:Partial<NexusRecord>)=>setRecords(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));
 const find=(id:string)=>records.find(r=>r.id===id);
 const selected=selectedId?find(selectedId)??null:null;
 const setSelected=(r:NexusRecord|null)=>setSelectedId(r?.id??null);
 const aiContextFor=(id:string)=>{
  const ticket=find(id); if(!ticket || ticket.type!=='Chamado')return [];
  const visited=new Set<string>();const queue=[...ticket.relatedIds];const gathered:NexusRecord[]=[];
  while(queue.length){const next=queue.shift();if(!next||visited.has(next))continue;visited.add(next);const record=find(next);if(!record)continue;gathered.push(record);if(record.parentId)queue.push(record.parentId);queue.push(...record.relatedIds.filter(i=>i!==id));}
  for(const r of records){if(r.id!==id&&r.solution===ticket.solution&&r.version===ticket.version&&!visited.has(r.id)){visited.add(r.id);gathered.push(r);}}
  const order=['Demanda','Atividade','Requisito','Solução','Versão','Chamado','Conhecimento'];return gathered.sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type));
 };
 const addRecord=(draft:WizardDraft,type:WizardType)=>{
  const kind=type==='demanda'?'Demanda':'Atividade';const prefix=type==='demanda'?'DEM':'ATV';const max=records.filter(r=>r.type===kind).reduce((n,r)=>Math.max(n,Number(r.id.split('-')[1])||0),0);
  const person=(name:string,fallback:Person)=>team.find(p=>p.name===name)??fallback;
  const id=`${prefix}-${String(max+1).padStart(3,'0')}`;
  const record:NexusRecord={id,title:draft.title.trim(),description:draft.description.trim(),type:kind,status:'Pendente',context:draft.context.trim(),solution:draft.solution.trim()||'A definir',version:draft.version.trim()||'A definir',date:new Date().toLocaleDateString('pt-BR'),priority:draft.priority,requester:{...person(draft.requester,people.marina),kind:'Solicitante'},assignee:{...person(draft.assignee,people.carlos),kind:'Responsável'},participants:draft.participants.split(',').map(n=>team.find(p=>p.name===n.trim())).filter((p):p is Person=>Boolean(p)).map(p=>({...p,kind:'Participante'})),relatedIds:[],comments:[],objective:draft.objective.trim(),dueDate:draft.dueDate};
  setRecords(prev=>[record,...prev]);setWizard(null);setSelectedId(id);flash(`${id} criado e contexto preservado.`);
 };
 const addComment=(id:string,text:string)=>{if(!text.trim())return;const r=find(id);if(!r)return;update(id,{comments:[...r.comments,{id:crypto.randomUUID(),author:'Tester',text:text.trim(),date:new Date().toLocaleString('pt-BR')}]});flash('Atualização registrada no contexto.')};
 const analyzeAi=(id:string)=>{const ticket=find(id);if(!ticket||ticket.type!=='Chamado')return;const related=aiContextFor(id);const types=new Set(related.map(r=>r.type));update(id,{aiStatus:'pending',aiCategory:types.has('Requisito')?'Falha funcional / regra de negócio':'Incidente / diagnóstico',aiConfidence:types.has('Demanda')&&types.has('Requisito')&&types.has('Versão')?92:types.has('Requisito')?88:74,aiSummary:`A análise percorreu ${related.length} registro(s) do contexto do chamado, cobrindo ${[...types].join(', ')}.`,nextAction:'Validar sugestão do atendimento',nextActionHint:'A sugestão foi preparada a partir do chamado e do contexto recuperado. A decisão continua com o responsável.'});flash(`IA analisou ${id} usando o contexto recuperado.`)};
 const validateAi=(id:string,accepted:boolean)=>{const r=find(id);if(!r||r.type!=='Chamado'||!r.aiSummary)return;update(id,{aiStatus:accepted?'approved':'rejected',status:accepted?'Em validação':'Em análise',nextAction:accepted?'Registrar conhecimento validado':'Revisar sugestão da IA',nextActionHint:accepted?'Registre o conhecimento para fechar o ciclo.':'Registre a análise humana ou gere nova orientação.'});flash(accepted?'Sugestão aprovada. O próximo passo é registrar o conhecimento.':'Sugestão rejeitada. O chamado voltou para análise.')};
 const registerKnowledge=(id:string)=>{const ticket=find(id);if(!ticket||ticket.type!=='Chamado'||ticket.aiStatus!=='approved'){flash('A validação humana da IA é necessária antes de registrar conhecimento.');return;}const existing=records.find(r=>r.type==='Conhecimento'&&r.relatedIds.includes(id));if(existing){flash(`Conhecimento ${existing.id} já está relacionado a este chamado.`);setSelected(existing);return;}const max=records.filter(r=>r.type==='Conhecimento').reduce((n,r)=>Math.max(n,Number(r.id.split('-')[1])||0),0);const kbId=`KB-${String(max+1).padStart(3,'0')}`;const knowledge:NexusRecord={...ticket,id:kbId,title:`Procedimento validado · ${ticket.title}`,description:ticket.aiCause||`Procedimento validado a partir do atendimento ${ticket.id}.`,type:'Conhecimento',status:'Concluído',context:'Conhecimento validado',date:new Date().toLocaleDateString('pt-BR'),priority:'Normal',relatedIds:[id,...ticket.relatedIds],comments:[],procedure:ticket.aiProcedure??[],sourceTicketId:id,validatedBy:'Tester',validatedAt:new Date().toLocaleString('pt-BR'),revision:1,reuseCount:0,nextAction:'Reutilizar em chamados relacionados'};delete knowledge.aiStatus;setRecords(prev=>[...prev.map(r=>r.id===id?{...r,status:'Concluído' as Status,relatedIds:[...r.relatedIds,kbId]}:r),knowledge]);setSelectedId(kbId);flash(`${kbId} registrado. O contexto agora pode ser reutilizado.`)};
 const changeStatus=(id:string,status:Status)=>{const r=find(id);if(!r)return;if(r.type==='Chamado'&&status==='Concluído'&&r.aiStatus!=='approved'){flash('O chamado só pode ser concluído após validação humana.');return;}update(id,{status});flash(`${id} atualizado para “${status}”.`)};
 const value=useMemo(()=>({records,selected,setSelected,wizard,setWizard,feedback,addRecord,addComment,analyzeAi,validateAi,registerKnowledge,changeStatus,aiContextFor,find}),[records,selected,wizard,feedback]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useNexus(){const store=useContext(Context);if(!store)throw new Error('NexusProvider ausente');return store;}
