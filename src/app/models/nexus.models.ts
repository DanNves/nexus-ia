export type View = 'Dashboard' | 'IA' | 'Demandas' | 'Atividades' | 'Requisitos' | 'Soluções e Versões' | 'Chamados' | 'Conhecimento' | 'Indicadores' | 'Configurações';
export type RecordType = 'Demanda' | 'Atividade' | 'Requisito' | 'Solução' | 'Versão' | 'Chamado' | 'Conhecimento';
export type Status = 'Pendente' | 'Em análise' | 'Em desenvolvimento' | 'Em validação' | 'Concluído';
export type Priority = 'Alta' | 'Média' | 'Baixa' | 'Normal';
export type AiValidationStatus = 'pending' | 'approved' | 'rejected';
export interface Solution { id: string; name: string; description: string; }
export interface SolutionVersion { id: string; solutionId: string; version: string; title: string; status: Status; publishedAt: string; }
export type WizardType = 'demanda' | 'atividade' | 'chamado';
export type PersonKind = 'Solicitante' | 'Responsável' | 'Participante';

export interface SolutionEntity { id: string; name: string; description: string; }
export interface VersionEntity { id: string; solutionId: string; version: string; label: string; status: 'Publicado' | 'Em desenvolvimento'; }

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
  solutionId?: string;
  version: string;
  versionId?: string;
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
  aiFindings?: string[];
  aiExistingKnowledgeId?: string;
  aiExistingTicketId?: string;
  aiResolution?: string;
  aiValidatedBy?: string;
  aiValidatedAt?: string;
  aiValidationNote?: string;
  aiHumanNote?: string;
  aiWasEdited?: boolean;
  aiCategory?: string;
  aiSummary?: string;
  aiConfidence?: number;
  nextAction?: string;
  nextActionHint?: string;
  reuseCount?: number;
  businessRules?: string[];
  acceptanceCriteria?: string[];
  procedure?: string[];
  sourceTicketId?: string;
  validatedBy?: string;
  validatedAt?: string;
  revision?: number;
  isDemoSeed?: boolean;
}
export interface WizardDraft {
  title: string;
  description: string;
  requester: string;
  assignee: string;
  participants: string;
  requirementId: string;
  solutionId: string;
  versionId: string;
  context: string;
  solution: string;
  version: string;
  solutionId: string;
  versionId: string;
  requirementId: string;
  priority: Priority;
  objective: string;
  dueDate: string;
}