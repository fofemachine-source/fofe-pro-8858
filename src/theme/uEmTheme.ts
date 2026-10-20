/**
 * PADRÃO VISUAL U&M - Tema Oficial Único
 * Todas as telas, componentes, gráficos e relatórios consomem estas definições.
 */

export const UEM_THEME = {
  fontFamily: 'Montserrat, sans-serif',
  
  // Cores Principais
  cores: {
    verdePrincipal: '#19502F',
    verdeSecundario: '#466C53',
    verdeClaro: '#B2BFB4',
    cinzaEscuro: '#2C2D2D',
    cinzaTexto: '#575756',
    cinzaClaro: '#DADADA',
    fundoClaro: '#F5F4F4',
    branco: '#FFFFFF',
    amareloOuro: '#E2A937',
  },

  // Cores semânticas de Status Operacional
  status: {
    liberado: {
      cor: '#19502F',
      fundo: '#E8EFEA',
      texto: '#19502F',
      borda: '#B2BFB4',
      rotulo: 'Liberado'
    },
    emManutencao: {
      cor: '#1E88E5',
      fundo: '#E3F2FD',
      texto: '#1565C0',
      borda: '#90CAF9',
      rotulo: 'Em manutenção'
    },
    aguardando: {
      cor: '#E2A937',
      fundo: '#FFF8E1',
      texto: '#B5872C',
      borda: '#F1D394',
      rotulo: 'Aguardando'
    },
    pendencia: {
      cor: '#DC3545',
      fundo: '#FFEBEE',
      texto: '#C62828',
      borda: '#EF9A9A',
      rotulo: 'Pendência'
    },
    rascunho: {
      cor: '#FB8C00',
      fundo: '#FFF3E0',
      texto: '#E65100',
      borda: '#FFCC80',
      rotulo: 'Rascunho'
    }
  },

  // Cores fixas de Responsabilidade das Paradas (CÓDIGOS VALE x U&M)
  responsabilidade: {
    MANUTENCAO: {
      chave: 'MANUTENCAO',
      nome: 'Manutenção',
      cor: '#1E88E5', // azul
      fundo: '#E3F2FD',
      borda: '#90CAF9',
      texto: '#0D47A1'
    },
    PRODUCAO: {
      chave: 'PRODUCAO',
      nome: 'Produção',
      cor: '#FB8C00', // laranja
      fundo: '#FFF3E0',
      borda: '#FFB74D',
      texto: '#E65100'
    },
    VALE: {
      chave: 'VALE',
      nome: 'Vale',
      cor: '#8E24AA', // roxo
      fundo: '#F3E5F5',
      borda: '#CE93D8',
      texto: '#4A148C'
    },
    EXTERNO: {
      chave: 'EXTERNO',
      nome: 'Externo',
      cor: '#607D8B', // cinza-azulado
      fundo: '#ECEFF1',
      borda: '#B0BEC5',
      texto: '#263238'
    },
    ACIDENTE: {
      chave: 'ACIDENTE',
      nome: 'Acidente',
      cor: '#E53935', // vermelho
      fundo: '#FFEBEE',
      borda: '#EF9A9A',
      texto: '#B71C1C'
    },
    A_DEFINIR: {
      chave: 'A_DEFINIR',
      nome: 'A definir',
      cor: '#FBC02D', // amarelo
      fundo: '#FFFDE7',
      borda: '#FFF59D',
      texto: '#F57F17'
    }
  },

  // Paleta para gráficos e tabelas
  graficos: {
    positivo:  { base: '#19502F', claro: '#B2BFB4', escuro: '#0D2B19', sentimento: 'Excelente' },
    qualidade: { base: '#466C53', claro: '#82A68F', escuro: '#324D3B', sentimento: 'Bom' },
    alerta:    { base: '#E2A937', claro: '#F1D394', escuro: '#B5872C', sentimento: 'Atenção' },
    critico:   { base: '#FF7725', claro: '#FFB080', escuro: '#C44A00', sentimento: 'Alerta Alto' },
    negativo:  { base: '#DC3545', claro: '#F1959B', escuro: '#A71D2A', sentimento: 'Falha' },
    neutro:    { base: '#DADADA', claro: '#F5F5F5', escuro: '#A9A9A9', sentimento: 'Neutro' },
    // Cores sequenciais para comparações sem sentimento intrínseco
    sequenciais: ['#19502F', '#466C53', '#82A68F', '#B2BFB4', '#DADADA']
  },

  // Tipografia padrão das telas do sistema
  tipografia: {
    titulo: 'font-light text-[20px] uppercase tracking-wide text-[var(--um-verde-principal)]',
    secao: 'font-light text-[14px] uppercase tracking-wider text-[var(--um-cinza-texto)]',
    rotulo: 'font-medium text-[11px] uppercase tracking-wider text-[var(--um-cinza-texto)]',
    texto: 'font-normal text-[14px] text-[var(--um-cinza-texto)]',
    destaque: 'font-medium text-[14px] text-[var(--um-verde-principal)]',
    tabelaHeader: 'font-medium text-[11px] uppercase tracking-wider text-[var(--um-cinza-texto)] bg-[var(--um-fundo)]',
    tabelaCell: 'font-normal text-[12px] text-[var(--um-cinza-texto)]',
    botao: 'font-medium text-[12px] tracking-wide rounded-lg'
  },

  // Cantos arredondados padrão
  raios: {
    card: 'rounded-xl',
    badge: 'rounded-md',
    botao: 'rounded-lg',
    input: 'rounded-lg'
  }
} as const;

export type ResponsabilidadeKey = keyof typeof UEM_THEME.responsabilidade;

/**
 * Retorna as propriedades visuais de uma responsabilidade
 */
export function getResponsabilidadeStyle(resp: string | undefined | null) {
  const chave = (resp || 'A_DEFINIR').toUpperCase() as ResponsabilidadeKey;
  return UEM_THEME.responsabilidade[chave] || UEM_THEME.responsabilidade.A_DEFINIR;
}

/**
 * Retorna as propriedades visuais de um status de relatório
 */
export function getStatusStyle(status: string | undefined | null) {
  switch ((status || '').toUpperCase()) {
    case 'LIBERADO':
    case 'ENVIADO':
      return UEM_THEME.status.liberado;
    case 'EM MANUTENÇÃO':
    case 'EM_MANUTENCAO':
    case 'SINCRONIZANDO':
      return UEM_THEME.status.emManutencao;
    case 'AGUARDANDO':
    case 'PENDENTE_SINCRONIZACAO':
      return UEM_THEME.status.aguardando;
    case 'PENDÊNCIA':
    case 'PENDENCIA':
    case 'ERRO_SINCRONIZACAO':
      return UEM_THEME.status.pendencia;
    case 'RASCUNHO':
    default:
      return UEM_THEME.status.rascunho;
  }
}

export const CORES_RESPONSABILIDADE: Record<string, string> = {
  MANUTENCAO: '#1E88E5',
  PRODUCAO: '#FB8C00',
  VALE: '#8E24AA',
  EXTERNO: '#607D8B',
  ACIDENTE: '#E53935',
  A_DEFINIR: '#FBC02D'
};

export const NOMES_RESPONSABILIDADE: Record<string, string> = {
  MANUTENCAO: 'Manutenção',
  PRODUCAO: 'Produção',
  VALE: 'Vale',
  EXTERNO: 'Externo',
  ACIDENTE: 'Acidente',
  A_DEFINIR: 'A definir'
};

export function formatarMinutosEmHorasEMinutos(totalMinutos: number): string {
  const h = Math.floor(totalMinutos / 60);
  const m = Math.round(totalMinutos % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

