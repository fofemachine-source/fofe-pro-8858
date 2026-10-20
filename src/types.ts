import { FalhaCatalogada } from './data/catalogoFalhas';

export type { FalhaCatalogada };

export type ReportStatus = 'RASCUNHO' | 'PENDENTE_SINCRONIZACAO' | 'SINCRONIZANDO' | 'ENVIADO' | 'ERRO_SINCRONIZACAO';

export interface Atendimento {
  id: string;
  equipamento: string; // e.g., EH-5004, CR-3116, PF-1031
  om: string;
  horimetro: string;
  sintoma: string;
  falha?: FalhaCatalogada | null;
  causa: string;
  acaoExecutada: string;
  horaInicio: string;
  horaFim: string;
  atuantes: string; // e.g., Angelo, Antonio Junior
  photoUrl?: string;
  photoUrls?: string[]; // Multiple photos
  previsaoLiberacao?: string; // Previsão de Liberação
  // Novos campos para Paradas & Tempo Vale
  horaRealParada?: string; // Hora real em que o equipamento parou
  tipoManutencao?: 'CORRETIVA' | 'PREVENTIVA' | 'PROGRAMADA';
  liberadoOperacao?: boolean; // Marcou como liberado pela manutenção
}

export interface Pendencia {
  id: string;
  equipamento: string; // e.g., EH-5003
  descricao: string; // Detail description
  previsaoLiberacao?: string; // Previsão de Liberação
}

export interface TecnicoEquipeRef {
  matricula: string;
  nome: string;
  grupo?: string;
  funcao?: string;
  papel?: string;
}

export interface Report {
  id: string;
  dateStart: string; // Data Inicial
  dateEnd: string; // Data Final
  team: string; // A, B, C, D, ADM, 1/3, 2/3
  shift: string; // 18:00 às 06:00, 06:00 às 18:00, 07:00 às 17:00 (ADM)
  frente: string; // EH, CR, PF, INFRA

  // Equipe
  eletricista: string;
  mecanico: string;
  auxiliar: string;
  motorista: string;
  monitor?: string;
  tecnicoNome?: string;
  tecnicoFuncao?: string;
  tecnicoMatricula?: string;
  tecnicoGrupo?: string;
  equipeDetalhada?: TecnicoEquipeRef[];

  // Realized interventions and pending items
  atendimentos: Atendimento[];
  pendencias: Pendencia[];

  // Observação Geral
  observacoesGerais: string;

  // Controls
  status: ReportStatus;
  mechanicUsername: string; // e.g., 'controle'
  createdAt: string;
}

export interface User {
  username: string;
  name: string;
  role: 'admin' | 'mechanic';
}

export interface Preventiva {
  id: string;
  equipamento: string; // e.g. CR 3112
  dataParada: string;   // e.g. 11/06 (target date formatted)
  createdAt: string;
  usuario: string;     // user who created it (username)
  // New scheduling fields from reference spreadsheet
  dataInicio?: string;
  horaPreventiva?: string;
  horasPmppConfirmada?: string;
  limiteHorimetro?: string;
  statusPreventiva?: string; // 'EM ANDAMENTO' | 'CONFIRMADO' | 'MONITORAR'
}

export type GrupoTecnico = 
  | 'MECÂNICO'
  | 'ELETRICISTA'
  | 'LUBRIFICADOR'
  | 'BORRACHEIRO'
  | 'SOLDADOR'
  | 'INSPETOR'
  | 'AUXILIAR'
  | 'LAVADOR / PINTOR'
  | 'OPERADOR/MOTORISTA'
  | 'SUPERVISÃO'
  | 'ADMINISTRATIVO'
  | 'OUTROS';

export interface Tecnico {
  id: string;
  nome: string;
  funcao: string; // Cargo original
  grupo?: GrupoTecnico; // Grupo normalizado
  matricula?: string; // Chapa (string)
  secao?: string; // Seção / Turma
  status: 'ativo' | 'inativo';
  createdAt?: string;
  atualizadoEm?: string;
}

// ----------------------------------------------------
// MODELO DE PARADAS OPERACIONAIS (CÓDIGOS VALE x U&M)
// ----------------------------------------------------

export type ResponsavelClasse = 
  | 'MANUTENCAO' 
  | 'PRODUCAO' 
  | 'VALE' 
  | 'EXTERNO' 
  | 'ACIDENTE' 
  | 'A_DEFINIR';

export interface AuditoriaParada {
  id: string;
  paradaId: string;
  dataHora: string; // ISO
  usuario: string;
  matricula?: string;
  acao: string; // ex: 'CRIADA', 'INICIAR_ATENDIMENTO', 'PAUSAR', 'RETOMAR', 'FINALIZAR', 'STATUS_ALTERADO', 'PERIODO_EDITADO', 'PERIODO_INSERIDO', 'EXCLUSAO', 'ENCERRADA', 'REABERTA'
  detalhes: string;
  valorAnterior?: string;
  valorNovo?: string;
}

export interface AtendimentoTecnicoInfo {
  tecnicoPrincipal: {
    nome: string;
    matricula?: string;
    funcao?: string;
    grupo?: string;
  };
  membrosEquipe?: Array<{
    id?: string;
    nome: string;
    matricula?: string;
    funcao?: string;
    papel?: string;
  }>;
  inicioAtendimento: string; // ISO
  tipoManutencao: 'CORRETIVA' | 'PREVENTIVA' | 'PROGRAMADA';
  codigoExec: string; // ex: "HMC 9000", "MPS 7000", "MPNS 8000"
  reportId?: string;
  pausadoEm?: string | null; // ISO se estiver pausado
  motivoPausa?: string | null;
}

export interface Segmento {
  id: string;
  codigo: string;              // ex.: "HMC 9120"
  nome: string;                // ex.: "AG OPERACAO"
  situacao: 'EXEC' | 'AG';
  responsavel: ResponsavelClasse;
  responsavelFuncao: string;   // ex.: "Supervisor de Produção do turno"
  inicio: string;              // ISO
  fim: string | null;          // ISO (fim = null somente no segmento atual)
  complemento?: string | null; // ex.: TAG da prancha, nº da PTS, quem da Vale interditou
  origem: 'ADMIN' | 'TECNICO' | 'AUTOMATICO';
  editadoPor?: string;
  editadoEm?: string;
}

export interface Parada {
  id: string;
  tag: string;
  frente: string;
  inicioParada: string;            // hora REAL em que o equipamento parou (ISO)
  fimParada: string | null;        // preenchido quando o equipamento volta a operar (ISO)
  numeroOS?: string | null;
  sintomaInicial?: string | null;
  falha?: FalhaCatalogada | null;
  previsaoLiberacao?: string | null;
  situacao: 'ABERTA' | 'ENCERRADA';
  segmentos: Segmento[];           // linha do tempo, em ordem, sem buracos e sem sobreposição
  relatorioIds: string[];          // relatórios de técnico ligados a esta parada
  emAtendimentoPor?: AtendimentoTecnicoInfo | null;
  criadoPor: string;
  criadoEm: string;
  atualizadoPor: string;
  atualizadoEm: string;
  auditoria?: AuditoriaParada[];
}
