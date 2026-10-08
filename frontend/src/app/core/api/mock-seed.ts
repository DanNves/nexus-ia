// Dados de demonstração (fictícios). Datas relativas ao dia em que o seed é criado,
// para que calendário e fila sempre tenham conteúdo próximo de "hoje".
import {
  Atividade, Chamado, Conhecimento, Demanda, Evento, Notificacao, Pessoa, Solucao,
} from './models';
import { gerarPrototipo, gerarRanking } from './mock-ia';

export interface MockDb {
  versao: number;
  pessoas: Pessoa[];
  demandas: Demanda[];
  atividades: Atividade[];
  eventos: Evento[];
  solucoes: Solucao[];
  chamados: Chamado[];
  conhecimentos: Conhecimento[];
  notificacoes: Notificacao[];
  sequencias: Record<string, number>;
}

export const VERSAO_SEED = 3;

function dia(offset: number, hora = 9, minuto = 0): string {
  const d = new Date();
  d.setHours(hora, minuto, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

function minutosAtras(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString();
}

export function criarSeed(): MockDb {
  const pessoas: Pessoa[] = [
    { id: 'p1', nome: 'Marina Costa', cargo: 'Coordenadora administrativa', organizacao: 'Clínica Bem Viver', perfil: 'CLIENTE' },
    { id: 'p2', nome: 'Rafael Lima', cargo: 'Analista de requisitos', organizacao: 'Equipe NEXUS', perfil: 'EQUIPE' },
    { id: 'p3', nome: 'Júlia Santos', cargo: 'Desenvolvedora', organizacao: 'Equipe NEXUS', perfil: 'EQUIPE' },
    { id: 'p4', nome: 'Pedro Almeida', cargo: 'Analista de suporte', organizacao: 'Equipe NEXUS', perfil: 'EQUIPE' },
    { id: 'p5', nome: 'Carlos Mendes', cargo: 'Gerente de operações', organizacao: 'Transportes Rota Sul', perfil: 'CLIENTE' },
    { id: 'p6', nome: 'Ana Ribeiro', cargo: 'Gestora de projetos', organizacao: 'Equipe NEXUS', perfil: 'EQUIPE' },
  ];

  const respostasAgenda = [
    { perguntaId: 'usuarios', enunciado: 'Quem vai usar o sistema no dia a dia?', valores: ['externos', 'equipe'], rotulos: ['Clientes ou pacientes', 'Uma equipe interna'] },
    { perguntaId: 'onde', enunciado: 'Onde as pessoas vão usar?', valores: ['ambos'], rotulos: ['No computador e no celular'] },
    { perguntaId: 'internet', enunciado: 'Precisa funcionar sem internet?', valores: ['nao'], rotulos: ['Não, sempre haverá internet'] },
    { perguntaId: 'frequencia', enunciado: 'Com que frequência a tarefa acontece?', valores: ['continuo'], rotulos: ['O tempo todo, ao longo do dia'] },
    { perguntaId: 'integracao', enunciado: 'Precisa conversar com algum sistema que vocês já usam?', valores: ['sim'], rotulos: ['Sim, com um sistema que já usamos'] },
    { perguntaId: 'volume', enunciado: 'Quantas pessoas usariam ao mesmo tempo, mais ou menos?', valores: ['medio'], rotulos: ['Entre 10 e 100'] },
  ];

  const respostasEstoque = [
    { perguntaId: 'usuarios', enunciado: 'Quem vai usar o sistema no dia a dia?', valores: ['equipe'], rotulos: ['Uma equipe interna'] },
    { perguntaId: 'onde', enunciado: 'Onde as pessoas vão usar?', valores: ['computador'], rotulos: ['No computador do escritório'] },
    { perguntaId: 'internet', enunciado: 'Precisa funcionar sem internet?', valores: ['sempre'], rotulos: ['Sim, precisa funcionar sempre'] },
    { perguntaId: 'perifericos', enunciado: 'Vai usar algum equipamento ligado ao computador?', valores: ['leitor', 'impressora'], rotulos: ['Leitor de código de barras', 'Impressora de etiquetas'] },
    { perguntaId: 'frequencia', enunciado: 'Com que frequência a tarefa acontece?', valores: ['continuo'], rotulos: ['O tempo todo, ao longo do dia'] },
  ];

  const respostasRelatorio = [
    { perguntaId: 'usuarios', enunciado: 'Quem vai usar o sistema no dia a dia?', valores: ['ninguem'], rotulos: ['Ninguém, ele roda sozinho'] },
    { perguntaId: 'frequencia', enunciado: 'Com que frequência a tarefa acontece?', valores: ['diario'], rotulos: ['Uma vez por dia, em horário fixo'] },
    { perguntaId: 'integracao', enunciado: 'Precisa conversar com algum sistema que vocês já usam?', valores: ['sim'], rotulos: ['Sim, com um sistema que já usamos'] },
    { perguntaId: 'resultado', enunciado: 'O que deve acontecer no final?', valores: ['email'], rotulos: ['Enviar um relatório por e-mail'] },
  ];

  const rankAgenda = gerarRanking(respostasAgenda);
  const rankEstoque = gerarRanking(respostasEstoque);
  const rankRelatorio = gerarRanking(respostasRelatorio);

  const demandas: Demanda[] = [
    {
      id: 'd14', codigo: 'DEM-014', nome: 'Agendamento online de consultas',
      descricao: 'Pacientes precisam marcar e remarcar consultas sem ligar para a recepção. A recepção hoje usa uma planilha e perde horários.',
      estado: 'EM_DESENVOLVIMENTO', prioridade: 'ALTA', solicitanteId: 'p1', responsavelId: 'p2',
      criadaEm: dia(-34), atualizadaEm: dia(-2), solucaoId: 's3',
      fontes: [
        { id: 'f1', tipo: 'TEXTO', titulo: 'Descrição inicial', conteudo: 'Hoje os pacientes ligam para marcar. Em horário de pico a recepção não dá conta e os horários ficam vagos quando alguém desmarca.', criadaEm: dia(-34) },
        { id: 'f2', tipo: 'ATA', titulo: 'Ata da reunião com a recepção', conteudo: 'Participantes: Marina, Rafael. A recepção quer ver a agenda do dia em uma tela só. Pacientes devem receber lembrete um dia antes.', criadaEm: dia(-30) },
      ],
      respostas: respostasAgenda, entrevistaConcluida: true,
      cenario: { estado: 'APROVADO', recomendado: rankAgenda[0].tipo, ranking: rankAgenda, geradoEm: dia(-33) },
      prototipo: { estado: 'APROVADO', telas: gerarPrototipo('Agendamento online de consultas', 'WEB'), geradoEm: dia(-33) },
      solicitacao: {
        abertaEm: dia(-32),
        viabilidade: { possivel: true, justificativa: 'Escopo claro e integração com o sistema da clínica disponível por API.', decididoPor: 'Rafael Lima', decididoEm: dia(-31) },
        reuniao: { eventoId: 'e0', data: dia(-30, 14), pauta: 'Validar regras de remarcação e lembretes.' },
        planejamento: { metodologia: 'Scrum', inicio: dia(-25), previsao: dia(20) },
      },
      requisitos: [
        { id: 'r1', codigo: 'REQ-031', tipo: 'RF', titulo: 'Marcar consulta', descricao: 'O paciente escolhe especialidade, profissional, dia e horário disponível.', estado: 'APROVADO', decididoPor: 'Rafael Lima', decididoEm: dia(-29) },
        { id: 'r2', codigo: 'REQ-032', tipo: 'RF', titulo: 'Remarcar ou cancelar', descricao: 'O paciente remarca ou cancela até 24 horas antes, liberando o horário.', estado: 'APROVADO', decididoPor: 'Rafael Lima', decididoEm: dia(-29) },
        { id: 'r3', codigo: 'REQ-033', tipo: 'RF', titulo: 'Lembrete por mensagem', descricao: 'O sistema envia lembrete um dia antes da consulta.', estado: 'APROVADO', decididoPor: 'Rafael Lima', decididoEm: dia(-29) },
        { id: 'r4', codigo: 'REQ-034', tipo: 'RNF', titulo: 'Uso no celular', descricao: 'As telas do paciente funcionam bem em celulares.', estado: 'APROVADO', decididoPor: 'Rafael Lima', decididoEm: dia(-29) },
        { id: 'r5', codigo: 'REQ-035', tipo: 'REGRA', titulo: 'Limite de remarcações', descricao: 'Cada consulta pode ser remarcada no máximo duas vezes.', estado: 'APROVADO', decididoPor: 'Rafael Lima', decididoEm: dia(-28) },
      ],
      historico: [
        { data: dia(-34), autor: 'Marina Costa', texto: 'Criou a demanda.' },
        { data: dia(-33), autor: 'Marina Costa', texto: 'Concluiu a entrevista guiada.' },
        { data: dia(-32), autor: 'Marina Costa', texto: 'Abriu solicitação para a equipe.' },
        { data: dia(-31), autor: 'Rafael Lima', texto: 'Marcou a demanda como possível.' },
        { data: dia(-25), autor: 'Ana Ribeiro', texto: 'Definiu a metodologia Scrum e iniciou o desenvolvimento.' },
      ],
    },
    {
      id: 'd15', codigo: 'DEM-015', nome: 'Controle de estoque da farmácia',
      descricao: 'A farmácia interna não sabe quando os medicamentos vão acabar. A contagem é feita no papel uma vez por semana.',
      estado: 'SOLICITADO', prioridade: 'MEDIA', solicitanteId: 'p1',
      criadaEm: dia(-3), atualizadaEm: dia(-1),
      fontes: [{ id: 'f3', tipo: 'TEXTO', titulo: 'Descrição inicial', conteudo: 'Precisamos saber o que está acabando e dar baixa quando um medicamento sai. A internet da farmácia cai com frequência.', criadaEm: dia(-3) }],
      respostas: respostasEstoque, entrevistaConcluida: true,
      cenario: { estado: 'PROPOSTO', recomendado: rankEstoque[0].tipo, ranking: rankEstoque, geradoEm: dia(-2) },
      prototipo: { estado: 'PROPOSTO', telas: gerarPrototipo('Controle de estoque da farmácia', 'DESKTOP'), geradoEm: dia(-2) },
      solicitacao: { abertaEm: dia(-1) },
      requisitos: [],
      historico: [
        { data: dia(-3), autor: 'Marina Costa', texto: 'Criou a demanda.' },
        { data: dia(-2), autor: 'Marina Costa', texto: 'Concluiu a entrevista guiada.' },
        { data: dia(-1), autor: 'Marina Costa', texto: 'Abriu solicitação para a equipe.' },
      ],
    },
    {
      id: 'd16', codigo: 'DEM-016', nome: 'Relatório noturno de entregas',
      descricao: 'Todo dia de manhã alguém junta as entregas do dia anterior à mão. Queremos receber isso pronto por e-mail.',
      estado: 'REUNIAO_AGENDADA', prioridade: 'MEDIA', solicitanteId: 'p5', responsavelId: 'p2',
      criadaEm: dia(-9), atualizadaEm: dia(-4),
      fontes: [{ id: 'f4', tipo: 'TEXTO', titulo: 'Descrição inicial', conteudo: 'As entregas ficam no sistema da transportadora. Precisamos de um resumo diário com atrasos e entregas concluídas.', criadaEm: dia(-9) }],
      respostas: respostasRelatorio, entrevistaConcluida: true,
      cenario: { estado: 'PROPOSTO', recomendado: rankRelatorio[0].tipo, ranking: rankRelatorio, geradoEm: dia(-9) },
      prototipo: { estado: 'PROPOSTO', telas: gerarPrototipo('Relatório noturno de entregas', 'JOB'), geradoEm: dia(-9) },
      solicitacao: {
        abertaEm: dia(-8),
        viabilidade: { possivel: true, justificativa: 'O sistema da transportadora exporta os dados em CSV.', decididoPor: 'Rafael Lima', decididoEm: dia(-6) },
        reuniao: { eventoId: 'e2', data: dia(2, 10), pauta: 'Confirmar campos do relatório e horário de envio.' },
      },
      requisitos: [],
      historico: [
        { data: dia(-9), autor: 'Carlos Mendes', texto: 'Criou a demanda.' },
        { data: dia(-8), autor: 'Carlos Mendes', texto: 'Abriu solicitação para a equipe.' },
        { data: dia(-6), autor: 'Rafael Lima', texto: 'Marcou a demanda como possível.' },
        { data: dia(-4), autor: 'Rafael Lima', texto: 'Agendou reunião de validação das regras.' },
      ],
    },
    {
      id: 'd17', codigo: 'DEM-017', nome: 'Check-in de motoristas',
      descricao: 'Motoristas avisam por telefone quando chegam ao cliente. Queremos registrar a chegada com a localização.',
      estado: 'STAND_BY', prioridade: 'BAIXA', solicitanteId: 'p5',
      criadaEm: dia(-15), atualizadaEm: dia(-12),
      fontes: [{ id: 'f5', tipo: 'TEXTO', titulo: 'Descrição inicial', conteudo: 'O motorista toca um botão quando chega e o sistema guarda a hora e o local.', criadaEm: dia(-15) }],
      respostas: [], entrevistaConcluida: false, requisitos: [],
      historico: [
        { data: dia(-15), autor: 'Carlos Mendes', texto: 'Criou a demanda.' },
        { data: dia(-12), autor: 'Carlos Mendes', texto: 'Colocou a demanda em stand-by.' },
      ],
    },
    {
      id: 'd18', codigo: 'DEM-018', nome: 'Portal de resultados de exames',
      descricao: 'Pacientes pedem os resultados por telefone e a recepção envia por e-mail um a um.',
      estado: 'EM_LEVANTAMENTO', prioridade: 'MEDIA', solicitanteId: 'p1',
      criadaEm: dia(-1), atualizadaEm: dia(-1),
      fontes: [{ id: 'f6', tipo: 'TEXTO', titulo: 'Descrição inicial', conteudo: 'Queremos que o paciente veja e baixe o próprio resultado com segurança.', criadaEm: dia(-1) }],
      respostas: [respostasAgenda[0], respostasAgenda[1]], entrevistaConcluida: false, requisitos: [],
      historico: [{ data: dia(-1), autor: 'Marina Costa', texto: 'Criou a demanda e começou a entrevista.' }],
    },
    {
      id: 'd12', codigo: 'DEM-012', nome: 'Autenticação em dois fatores',
      descricao: 'Aumentar a segurança do login do Portal de Atendimento com um segundo fator.',
      estado: 'ENTREGUE', prioridade: 'ALTA', solicitanteId: 'p5', responsavelId: 'p3',
      criadaEm: dia(-120), atualizadaEm: dia(-40), solucaoId: 's1',
      fontes: [], respostas: [], entrevistaConcluida: true,
      requisitos: [
        { id: 'r9', codigo: 'REQ-014', tipo: 'RF', titulo: 'Recuperação de senha', descricao: 'O usuário recupera a senha por e-mail com código de verificação.', estado: 'APROVADO', decididoPor: 'Rafael Lima', decididoEm: dia(-110) },
      ],
      historico: [{ data: dia(-40), autor: 'Ana Ribeiro', texto: 'Publicou a versão 1.2.0.' }],
    },
  ];

  const atividades: Atividade[] = [
    { id: 'a1', codigo: 'ATV-041', titulo: 'Tela de escolha de horário', demandaId: 'd14', responsavelId: 'p3', estado: 'CONCLUIDA', prazo: dia(-6) },
    { id: 'a2', codigo: 'ATV-042', titulo: 'Integração com a agenda da clínica', demandaId: 'd14', responsavelId: 'p3', estado: 'EM_DESENVOLVIMENTO', prazo: dia(3) },
    { id: 'a3', codigo: 'ATV-043', titulo: 'Envio de lembretes', demandaId: 'd14', responsavelId: 'p3', estado: 'A_FAZER', prazo: dia(9) },
    { id: 'a4', codigo: 'ATV-044', titulo: 'Regra de limite de remarcações', demandaId: 'd14', responsavelId: 'p2', estado: 'EM_REVISAO', prazo: dia(1) },
    { id: 'a5', codigo: 'ATV-045', titulo: 'Testes com a recepção', demandaId: 'd14', responsavelId: 'p6', estado: 'A_FAZER', prazo: dia(14) },
    { id: 'a6', codigo: 'ATV-046', titulo: 'Levantar campos do CSV da transportadora', demandaId: 'd16', responsavelId: 'p2', estado: 'EM_DESENVOLVIMENTO', prazo: dia(2) },
    { id: 'a7', codigo: 'ATV-030', titulo: 'Código de verificação por e-mail', demandaId: 'd12', responsavelId: 'p3', estado: 'CONCLUIDA', prazo: dia(-50) },
  ];

  const eventos: Evento[] = [
    { id: 'e0', titulo: 'Validação de regras — agendamento', tipo: 'REUNIAO', inicio: dia(-30, 14), fim: dia(-30, 15), demandaId: 'd14', participantes: ['p1', 'p2'], local: 'Videochamada' },
    { id: 'e1', titulo: 'Revisão da sprint 3 — agendamento', tipo: 'ITERACAO', inicio: dia(0, 15), fim: dia(0, 16), demandaId: 'd14', participantes: ['p1', 'p2', 'p3', 'p6'], local: 'Videochamada' },
    { id: 'e2', titulo: 'Validação de regras — relatório de entregas', tipo: 'REUNIAO', inicio: dia(2, 10), fim: dia(2, 11), demandaId: 'd16', participantes: ['p5', 'p2'], local: 'Escritório Rota Sul', descricao: 'Confirmar campos do relatório e horário de envio.' },
    { id: 'e3', titulo: 'Prazo — integração com a agenda', tipo: 'PRAZO', inicio: dia(3, 18), demandaId: 'd14', participantes: ['p3'] },
    { id: 'e4', titulo: 'Análise da solicitação — estoque', tipo: 'REUNIAO', inicio: dia(5, 9, 30), fim: dia(5, 10, 30), demandaId: 'd15', participantes: ['p2', 'p6'], local: 'Sala 2', descricao: 'Equipe avalia viabilidade da demanda DEM-015.' },
    { id: 'e5', titulo: 'Início da sprint 4 — agendamento', tipo: 'ITERACAO', inicio: dia(7, 9), demandaId: 'd14', participantes: ['p2', 'p3', 'p6'] },
    { id: 'e6', titulo: 'Entrega prevista — Agenda Bem Viver v1.0', tipo: 'ENTREGA', inicio: dia(20, 12), demandaId: 'd14', participantes: ['p1', 'p6'] },
    { id: 'e7', titulo: 'Prazo — testes com a recepção', tipo: 'PRAZO', inicio: dia(14, 18), demandaId: 'd14', participantes: ['p6'] },
    { id: 'e8', titulo: 'Retrospectiva da sprint 2', tipo: 'ITERACAO', inicio: dia(-7, 16), demandaId: 'd14', participantes: ['p2', 'p3', 'p6'] },
  ];

  const solucoes: Solucao[] = [
    {
      id: 's1', codigo: 'SOL-01', nome: 'Portal de Atendimento', tipo: 'WEB', clienteId: 'p5', demandaOrigemId: 'd12',
      descricao: 'Portal onde os clientes da Rota Sul acompanham entregas e abrem solicitações.',
      versoes: [
        { id: 'v120', numero: '1.2.0', estado: 'PUBLICADA', publicadaEm: dia(-40), notas: ['Autenticação em dois fatores', 'Recuperação de senha por código'] },
        { id: 'v110', numero: '1.1.0', estado: 'PUBLICADA', publicadaEm: dia(-95), notas: ['Histórico de entregas', 'Exportação em PDF'] },
        { id: 'v100', numero: '1.0.0', estado: 'PUBLICADA', publicadaEm: dia(-180), notas: ['Primeira versão do portal'] },
      ],
    },
    {
      id: 's2', codigo: 'SOL-02', nome: 'Dashboard de Relatórios', tipo: 'WEB', clienteId: 'p5',
      descricao: 'Painel com indicadores de entregas, atrasos e custos por rota.',
      versoes: [
        { id: 'v210', numero: '2.1.0', estado: 'PUBLICADA', publicadaEm: dia(-20), notas: ['Filtro por período', 'Novo gráfico de atrasos'] },
        { id: 'v200', numero: '2.0.0', estado: 'PUBLICADA', publicadaEm: dia(-70), notas: ['Reescrita do painel'] },
      ],
    },
    {
      id: 's3', codigo: 'SOL-03', nome: 'Agenda Bem Viver', tipo: 'WEB', clienteId: 'p1', demandaOrigemId: 'd14',
      descricao: 'Agendamento online de consultas para os pacientes da Clínica Bem Viver.',
      versoes: [
        { id: 'v090', numero: '0.9.0', estado: 'EM_DESENVOLVIMENTO', notas: ['Marcar consulta', 'Remarcar e cancelar', 'Lembretes'] },
      ],
    },
  ];

  const kb7: Conhecimento = {
    id: 'k7', codigo: 'KB-007', titulo: 'Falha de autenticação após atualização para 1.2.0', chamadoOrigemId: 'c27', solucaoId: 's1',
    procedimento: ['Confirmar se o usuário tem o segundo fator ativo.', 'Verificar se o horário do celular está sincronizado.', 'Reenviar o código de verificação e pedir novo login.'],
    validadoPor: 'Pedro Almeida', validadoEm: dia(-25), usos: 4,
  };
  const kb6: Conhecimento = {
    id: 'k6', codigo: 'KB-006', titulo: 'Usuário sem permissão após troca de setor', chamadoOrigemId: 'c20', solucaoId: 's1',
    procedimento: ['Conferir o perfil do usuário no painel de administração.', 'Reatribuir o perfil do novo setor.', 'Pedir para o usuário sair e entrar novamente.'],
    validadoPor: 'Pedro Almeida', validadoEm: dia(-60), usos: 7,
  };

  const chamados: Chamado[] = [
    {
      id: 'c28', codigo: 'CH-028', titulo: 'Não consigo entrar no portal', descricao: 'Depois da atualização, o código de verificação não chega e o login falha.',
      solucaoId: 's1', versaoId: 'v120', solicitanteId: 'p5', responsavelId: 'p4', prioridade: 'ALTA', estado: 'EM_ATENDIMENTO',
      abertoEm: minutosAtras(95), atendimentoIniciadoEm: minutosAtras(20),
      sugestao: {
        estado: 'PROPOSTO', categoria: 'Autenticação', confianca: 0.82, semHistorico: false,
        causa: 'Provável dessincronização do horário do celular com o servidor, que invalida o código do segundo fator introduzido na versão 1.2.0.',
        procedimento: kb7.procedimento,
        fontes: [
          { tipo: 'Conhecimento', codigo: 'KB-007', titulo: kb7.titulo },
          { tipo: 'Versão', codigo: 'v1.2.0', titulo: 'Portal de Atendimento 1.2.0', link: '/solucoes/s1' },
          { tipo: 'Requisito', codigo: 'REQ-014', titulo: 'Recuperação de senha', link: '/demandas/d12' },
          { tipo: 'Demanda', codigo: 'DEM-012', titulo: 'Autenticação em dois fatores', link: '/demandas/d12' },
        ],
      },
      historico: [
        { data: minutosAtras(95), autor: 'Carlos Mendes', texto: 'Abriu o chamado.' },
        { data: minutosAtras(20), autor: 'Pedro Almeida', texto: 'Iniciou o atendimento.' },
      ],
    },
    {
      id: 'c29', codigo: 'CH-029', titulo: 'Relatório de atrasos não carrega', descricao: 'O gráfico de atrasos fica carregando quando escolho o mês inteiro.',
      solucaoId: 's2', versaoId: 'v210', solicitanteId: 'p5', prioridade: 'ALTA', estado: 'NA_FILA', abertoEm: minutosAtras(70),
      historico: [{ data: minutosAtras(70), autor: 'Carlos Mendes', texto: 'Abriu o chamado.' }],
    },
    {
      id: 'c30', codigo: 'CH-030', titulo: 'Recepcionista sem acesso à agenda', descricao: 'A nova recepcionista não vê a agenda do dia.',
      solucaoId: 's3', versaoId: 'v090', solicitanteId: 'p1', prioridade: 'MEDIA', estado: 'NA_FILA', abertoEm: minutosAtras(55),
      historico: [{ data: minutosAtras(55), autor: 'Marina Costa', texto: 'Abriu o chamado.' }],
    },
    {
      id: 'c31', codigo: 'CH-031', titulo: 'Exportação em PDF lenta', descricao: 'Exportar o histórico de entregas demora mais de um minuto.',
      solucaoId: 's1', versaoId: 'v120', solicitanteId: 'p5', prioridade: 'BAIXA', estado: 'NA_FILA', abertoEm: minutosAtras(40),
      historico: [{ data: minutosAtras(40), autor: 'Carlos Mendes', texto: 'Abriu o chamado.' }],
    },
    {
      id: 'c32', codigo: 'CH-032', titulo: 'Paciente não consegue remarcar', descricao: 'Ao tentar remarcar, aparece "horário indisponível" para todos os dias.',
      solucaoId: 's3', versaoId: 'v090', solicitanteId: 'p1', prioridade: 'MEDIA', estado: 'NA_FILA', abertoEm: minutosAtras(25),
      historico: [{ data: minutosAtras(25), autor: 'Marina Costa', texto: 'Abriu o chamado.' }],
    },
    {
      id: 'c27', codigo: 'CH-027', titulo: 'Código de verificação inválido', descricao: 'Usuários recebem "código inválido" logo após digitar.',
      solucaoId: 's1', versaoId: 'v120', solicitanteId: 'p5', responsavelId: 'p4', prioridade: 'ALTA', estado: 'RESOLVIDO',
      abertoEm: dia(-26, 10), atendimentoIniciadoEm: dia(-26, 11), resolvidoEm: dia(-25, 9), conhecimentoId: 'k7',
      historico: [
        { data: dia(-26, 10), autor: 'Carlos Mendes', texto: 'Abriu o chamado.' },
        { data: dia(-25, 9), autor: 'Pedro Almeida', texto: 'Aprovou a sugestão, resolveu e registrou o conhecimento KB-007.' },
      ],
    },
  ];

  const notificacoes: Notificacao[] = [
    { id: 'n1', texto: 'Reunião de validação do relatório de entregas em 2 dias', quando: minutosAtras(30), link: '/calendario', lida: false },
    { id: 'n2', texto: 'Nova solicitação: Controle de estoque da farmácia', quando: minutosAtras(60 * 20), link: '/demandas/d15', lida: false },
    { id: 'n3', texto: 'CH-028 está em atendimento com Pedro Almeida', quando: minutosAtras(20), link: '/fila/c28', lida: true },
  ];

  return {
    versao: VERSAO_SEED,
    pessoas, demandas, atividades, eventos, solucoes, chamados,
    conhecimentos: [kb7, kb6],
    notificacoes,
    sequencias: { DEM: 18, ATV: 46, CH: 32, KB: 7, REQ: 35, EV: 8 },
  };
}
