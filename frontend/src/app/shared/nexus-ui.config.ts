import { RecordType } from '../models/nexus.models';

export const RECORD_UI: Record<RecordType, { icon: string; tone: 'blue'|'green'|'orange'|'purple' }> = {
  Demanda: { icon: 'demand', tone: 'blue' },
  Atividade: { icon: 'activity', tone: 'blue' },
  Requisito: { icon: 'requirement', tone: 'blue' },
  Solução: { icon: 'solution', tone: 'purple' },
  Versão: { icon: 'solution', tone: 'purple' },
  Chamado: { icon: 'ticket', tone: 'orange' },
  Conhecimento: { icon: 'knowledge', tone: 'green' },
};