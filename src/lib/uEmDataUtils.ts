import { GrupoTecnico } from '../types';

/**
 * Remove acentos, espaços extras e normaliza string para comparação em maiúsculas
 */
export function removerAcentos(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Converte CHAPA/matrícula para texto e completa com zeros à esquerda até 6 dígitos (ex.: 25918 -> "025918")
 */
export function normalizarMatricula(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null) return '';
  const limpo = String(valor).trim();
  if (!limpo) return '';
  if (/^\d+$/.test(limpo)) {
    return limpo.padStart(6, '0');
  }
  return limpo;
}

/**
 * Formata nome para "Nome Sobrenome" (Capitalized), preservando preposições comuns
 */
export function formatarNomeSobrenome(nome: string): string {
  if (!nome) return '';
  const preposicoes = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  const partes = nome.trim().toLowerCase().split(/\s+/);
  return partes
    .map((p, idx) => {
      if (idx > 0 && preposicoes.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ');
}

/**
 * Normaliza o cargo original para o Grupo de Função U&M oficial (Regra 1.2)
 */
export function classificarGrupoFuncao(cargoOriginal: string): GrupoTecnico {
  const norm = removerAcentos(cargoOriginal);

  // SUPERVISÃO
  if (
    norm.includes('SUPERVISOR') ||
    norm.includes('CONTROLADOR DE MANUTENCAO') ||
    norm.includes('GERENTE') ||
    norm.includes('ENGENHEIRO')
  ) {
    return 'SUPERVISÃO';
  }

  // ADMINISTRATIVO
  if (
    norm.includes('ASSISTENTE ADMINISTRATIVO') ||
    norm.includes('ASSISTENTE TECNICO') ||
    norm.includes('ADMINISTRATIV')
  ) {
    return 'ADMINISTRATIVO';
  }

  // ELETRICISTA
  if (norm.includes('ELETRICISTA')) {
    return 'ELETRICISTA';
  }

  // LUBRIFICADOR
  if (norm.includes('LUBRIFICA') || norm.includes('LUBRIFICADOR')) {
    return 'LUBRIFICADOR';
  }

  // BORRACHEIRO
  if (norm.includes('BORRACHEIRO') || norm.includes('BORRACHARIA')) {
    return 'BORRACHEIRO';
  }

  // SOLDADOR
  if (norm.includes('SOLDADOR') || norm.includes('CALDEIRARIA')) {
    return 'SOLDADOR';
  }

  // INSPETOR
  if (norm.includes('INSPETOR')) {
    return 'INSPETOR';
  }

  // LAVADOR / PINTOR
  if (norm.includes('LAVADOR') || norm.includes('PINTOR')) {
    return 'LAVADOR / PINTOR';
  }

  // OPERADOR/MOTORISTA
  if (
    norm.includes('MOTORISTA') ||
    norm.includes('GUINDAUTO') ||
    norm.includes('EMPILHADEIRA') ||
    norm.includes('OPERADOR')
  ) {
    return 'OPERADOR/MOTORISTA';
  }

  // AUXILIAR
  if (
    norm.includes('AUXILIAR DE MANUTENCAO') ||
    norm.includes('APRENDIZ') ||
    norm.includes('AJUDANTE') ||
    norm === 'AUXILIAR'
  ) {
    return 'AUXILIAR';
  }

  // MECÂNICO
  if (norm.includes('MECANICO')) {
    return 'MECÂNICO';
  }

  return 'OUTROS';
}

/**
 * Grupos que atuam diretamente em campo (podem ser técnicos de atendimento no perfil Controle)
 * Supervisão e Administrativo são excluídos (Regra 1.5).
 */
export const GRUPOS_CAMPO: GrupoTecnico[] = [
  'MECÂNICO',
  'ELETRICISTA',
  'LUBRIFICADOR',
  'BORRACHEIRO',
  'SOLDADOR',
  'INSPETOR',
  'AUXILIAR',
  'LAVADOR / PINTOR',
  'OPERADOR/MOTORISTA'
];

export function isTecnicoDeCampo(grupo?: string): boolean {
  if (!grupo) return true;
  return GRUPOS_CAMPO.includes(grupo as GrupoTecnico);
}

/**
 * Normaliza e formata TAG de equipamento no padrão PREFIXO-NÚMERO (Regra 2.3)
 * Ex: "cr3114" -> "CR-3114", "CR 3114" -> "CR-3114", "eh4050" -> "EH-4050"
 */
export function normalizarTag(tag: string): string {
  if (!tag) return '';
  const upper = tag.toUpperCase().trim();
  const compact = upper.replace(/[\s\-_]+/g, '');

  // Se tiver letras seguidas de números, formata automaticamente como PREFIXO-NUMERO
  const match = compact.match(/^([A-Z]{1,5})(\d+[A-Z0-9]*)$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  return upper.replace(/[\s_]+/g, '-');
}

/**
 * Valida formato da TAG: ^[A-Z]{2,3}-\d{3,5}$
 */
export function isTagValida(tag: string): boolean {
  if (!tag) return false;
  return /^[A-Z]{2,4}-\d{2,6}$/.test(normalizarTag(tag));
}

/**
 * Deriva a Frente operacional a partir do prefixo da TAG (Regra 2.3)
 * EH -> EH, CR -> CR, PF -> PF, demais -> INFRA
 */
export function derivarFrenteDaTag(tag: string): 'EH' | 'CR' | 'PF' | 'INFRA' {
  const norm = normalizarTag(tag);
  if (norm.startsWith('EH-') || norm.startsWith('EH')) return 'EH';
  if (norm.startsWith('CR-') || norm.startsWith('CR')) return 'CR';
  if (norm.startsWith('PF-') || norm.startsWith('PF')) return 'PF';
  return 'INFRA';
}

/**
 * Formata duração em minutos para o formato XhXX (ex: 3h00, 1h15, 0h45)
 */
export function formatarDuracaoHorasMinutos(minutosTotais: number): string {
  if (isNaN(minutosTotais) || minutosTotais < 0) return '0h00';
  const horas = Math.floor(minutosTotais / 60);
  const mins = Math.floor(minutosTotais % 60);
  return `${horas}h${mins.toString().padStart(2, '0')}`;
}

/**
 * Calcula duração entre duas datas ISO em minutos
 */
export function calcularDuracaoMinutos(inicioIso: string, fimIso?: string | null): number {
  if (!inicioIso) return 0;
  const start = new Date(inicioIso).getTime();
  const end = fimIso ? new Date(fimIso).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.max(0, Math.round((end - start) / (1000 * 60)));
}

/**
 * Formata data ISO para DD/MM/AAAA HH:mm no fuso de São Paulo
 */
export function formatarDataHoraPtBr(dataIso: string | undefined | null): string {
  if (!dataIso) return '—';
  try {
    const d = new Date(dataIso);
    if (isNaN(d.getTime())) return dataIso;
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dataIso;
  }
}

/**
 * Formata apenas data DD/MM/AAAA
 */
export function formatarDataPtBr(dataIso: string | undefined | null): string {
  if (!dataIso) return '—';
  try {
    const d = new Date(dataIso);
    if (isNaN(d.getTime())) return dataIso;
    return d.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dataIso;
  }
}

/**
 * Formata apenas hora HH:mm
 */
export function formatarHoraPtBr(dataIso: string | undefined | null): string {
  if (!dataIso) return '—';
  try {
    const d = new Date(dataIso);
    if (isNaN(d.getTime())) return dataIso;
    return d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dataIso;
  }
}
