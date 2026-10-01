export type View = 'Dashboard' | 'Demandas' | 'Atividades' | 'Requisitos' | 'Soluções e Versões' | 'Chamados' | 'Conhecimento' | 'Indicadores' | 'Configurações';
export type RecordType = 'Demanda' | 'Atividade' | 'Requisito' | 'Solução' | 'Versão' | 'Chamado' | 'Conhecimento';
export type Status = 'Pendente' | 'Em análise' | 'Em desenvolvimento' | 'Em validação' | 'Concluído';
export type Priority = 'Alta' | 'Média' | 'Baixa' | 'Normal';
export type AiValidationStatus = 'pending' | 'approved' | 'rejected';
export type WizardType = 'demanda' | 'atividade';
export type PersonKind = 'Solicitante' | 'Responsável' | 'Participante';

export interface Person { name: string; role: string; kind: PersonKind; }
export interface Comment { id: string; author: string; text: string; date: string; recipient?: string; }
export interface NexusRecord {
  id: string;
  title: string;
  description: string;
  type: RecordType;
  status: Status;
  context: string;
  solution: string;
  version: string;
  date: string;
  priority: Priority;
  requester: Person;
  assignee: Person;
  participants: Person[];
  parentId?: string;
  relatedIds: string[];
  comments: Comment[];
  objective?: string;
  dueDate?: string;
  aiStatus?: AiValidationStatus;
  aiCause?: string;
  aiProcedure?: string[];
  aiEvidence?: string[];
  nextAction?: string;
  nextActionHint?: string;
  reuseCount?: number;
}
export interface WizardDraft {
  title: string;
  description: string;
  requester: string;
  assignee: string;
  participants: string;
  context: string;
  solution: string;
  version: string;
  priority: Priority;
  objective: string;
  dueDate: string;
}