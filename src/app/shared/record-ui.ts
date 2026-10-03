import { RecordType } from '../models/nexus.models';

export type RecordTone = 'blue' | 'green' | 'orange' | 'purple';

export function recordIcon(type: RecordType): string {
  switch (type) {
    case 'Chamado': return 'ticket';
    case 'Conhecimento': return 'knowledge';
    case 'Requisito': return 'requirement';
    case 'Atividade': return 'activity';
    case 'Solução':
    case 'Versão': return 'solution';
    default: return 'demand';
  }
}

export function recordTone(type: RecordType): RecordTone {
  switch (type) {
    case 'Chamado': return 'orange';
    case 'Conhecimento': return 'green';
    case 'Solução':
    case 'Versão': return 'purple';
    default: return 'blue';
  }
}
