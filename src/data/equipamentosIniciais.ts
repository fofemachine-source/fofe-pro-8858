import { Equipamento } from '../types';
import { derivarFrenteDaTag, normalizarTag } from '../lib/uEmDataUtils';

export interface EquipamentoOficialSeed {
  tag: string;
  modelo: string;
  frente: 'EH' | 'CR' | 'PF' | 'INFRA';
  grupo: string;
  ativo: boolean;
}

export const EQUIPAMENTOS_OFICIAIS: EquipamentoOficialSeed[] = [
  { tag: "EH-4026", modelo: "Hitachi EX1200", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-4035", modelo: "Hitachi EX1200", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-4039", modelo: "Hitachi EX1200", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-4041", modelo: "Hitachi EX1200", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-4047", modelo: "Hitachi EX1200", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-4050", modelo: "Hitachi EX1200", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-5003", modelo: "Hitachi EX2500", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-5004", modelo: "Hitachi EX2500", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-5036", modelo: "Hitachi EX2500", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1096", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1097", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1098", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1100", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1101", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1102", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1103", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1104", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1105", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2016", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2017", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2502", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2508", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2509", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2510", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2511", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2512", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-2513", modelo: "Escavadeira (modelo a confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: true },
  { tag: "EH-1099", modelo: "Escavadeira (fora das duas frotas – confirmar)", frente: "EH", grupo: "Escavadeiras", ativo: false },
  { tag: "CR-2516", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2517", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2518", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2519", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2520", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2521", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2522", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2523", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2524", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2525", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2526", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2527", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2529", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2530", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2531", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2532", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2533", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2534", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2535", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2536", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2537", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2538", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2539", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2540", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2541", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-2549", modelo: "Komatsu HD785", frente: "CR", grupo: "Caminhões HD785", ativo: true },
  { tag: "CR-3058", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3059", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3066", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3085", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3099", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3101", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3102", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3103", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3104", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3105", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3106", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3111", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3112", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3114", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "CR-3116", modelo: "Komatsu 730E", frente: "CR", grupo: "Caminhões 730E", ativo: true },
  { tag: "PF-1031", modelo: "Perfuratriz", frente: "PF", grupo: "Perfuratrizes", ativo: true },
  { tag: "MN-3001", modelo: "Motoniveladora", frente: "INFRA", grupo: "Motoniveladoras", ativo: true }
];

// Mantém alias EQUIPAMENTOS_INICIAIS por compatibilidade
export const EQUIPAMENTOS_INICIAIS = EQUIPAMENTOS_OFICIAIS;

export const ORDEM_GRUPOS_EQUIPAMENTO = [
  'Escavadeiras',
  'Caminhões HD785',
  'Caminhões 730E',
  'Perfuratrizes',
  'Motoniveladoras'
];

// Mantém alias ORDEM_TIPOS_EQUIPAMENTO sem CB
export const ORDEM_TIPOS_EQUIPAMENTO = ORDEM_GRUPOS_EQUIPAMENTO;

export function derivarTipoEquipamento(tag: string, modelo?: string): string {
  const norm = normalizarTag(tag);
  const modUpper = (modelo || '').toUpperCase();
  if (norm.startsWith('EH-') || modUpper.includes('ESCAVADEIRA') || modUpper.includes('EX1200') || modUpper.includes('EX2500')) {
    return 'Escavadeiras';
  }
  if (norm.startsWith('CR-25') || modUpper.includes('HD785')) {
    return 'Caminhões HD785';
  }
  if (norm.startsWith('CR-3') || modUpper.includes('730E') || norm.startsWith('CR-')) {
    return 'Caminhões 730E';
  }
  if (norm.startsWith('PF-') || modUpper.includes('PERFURATRIZ')) {
    return 'Perfuratrizes';
  }
  if (norm.startsWith('MN-') || modUpper.includes('MOTONIVELADORA')) {
    return 'Motoniveladoras';
  }
  return 'Outros';
}

export function criarEquipamentoPadrao(
  tag: string,
  modelo: string,
  ativo = true,
  grupoExplicito?: string,
  frenteExplicita?: 'EH' | 'CR' | 'PF' | 'INFRA'
): Equipamento {
  const tagNorm = normalizarTag(tag);
  // CB não faz parte da frota: sempre inativo caso exista legado
  const isCB = tagNorm.startsWith('CB-') || tagNorm.startsWith('CB');
  const grupo = grupoExplicito || derivarTipoEquipamento(tagNorm, modelo);
  return {
    id: `eq-${tagNorm}`,
    tag: tagNorm,
    modelo: modelo.trim() || grupo,
    tipo: grupo,
    grupo,
    frente: frenteExplicita || derivarFrenteDaTag(tagNorm),
    ativo: isCB ? false : ativo,
    createdAt: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
}

export function getEquipamentosIniciaisCompletos(): Equipamento[] {
  return EQUIPAMENTOS_OFICIAIS.map((item) =>
    criarEquipamentoPadrao(item.tag, item.modelo, item.ativo, item.grupo, item.frente)
  );
}

/**
 * Faz UPSERT pela TAG com EQUIPAMENTOS_OFICIAIS.
 * Qualquer equipamento que NÃO esteja na lista oficial (incluindo todos os CB-xxxx) fica INATIVO (não apaga).
 */
export function aplicarUpsertFrotaOficial(existentes: Equipamento[]): {
  listaCompleta: Equipamento[];
  paraGravarNoBanco: Equipamento[];
} {
  const mapaOficial = new Map<string, EquipamentoOficialSeed>();
  EQUIPAMENTOS_OFICIAIS.forEach((item) => {
    mapaOficial.set(normalizarTag(item.tag), item);
  });

  const mapaResultado = new Map<string, Equipamento>();
  const paraGravarNoBanco: Equipamento[] = [];

  // 1. Processa existentes: se não estiver em EQUIPAMENTOS_OFICIAIS ou for CB, força ativo = false
  existentes.forEach((eq) => {
    if (!eq || !eq.tag) return;
    const tagNorm = normalizarTag(eq.tag);
    const seed = mapaOficial.get(tagNorm);
    if (!seed) {
      const inativado: Equipamento = {
        ...eq,
        id: eq.id || `eq-${tagNorm}`,
        tag: tagNorm,
        ativo: false
      };
      mapaResultado.set(tagNorm, inativado);
      if (eq.ativo !== false || eq.tag !== tagNorm) {
        paraGravarNoBanco.push(inativado);
      }
    } else {
      // Está na frota oficial: aplica UPSERT de modelo, frente, grupo e ativo oficial
      const atualizado: Equipamento = {
        ...eq,
        id: eq.id || `eq-${tagNorm}`,
        tag: tagNorm,
        modelo: seed.modelo,
        frente: seed.frente,
        grupo: seed.grupo,
        tipo: seed.grupo,
        ativo: seed.ativo
      };
      mapaResultado.set(tagNorm, atualizado);
      if (
        eq.tag !== tagNorm ||
        eq.modelo !== seed.modelo ||
        eq.frente !== seed.frente ||
        eq.grupo !== seed.grupo ||
        eq.tipo !== seed.grupo ||
        eq.ativo !== seed.ativo
      ) {
        paraGravarNoBanco.push(atualizado);
      }
    }
  });

  // 2. Insere quaisquer equipamentos de EQUIPAMENTOS_OFICIAIS que ainda não existiam
  EQUIPAMENTOS_OFICIAIS.forEach((seed) => {
    const tagNorm = normalizarTag(seed.tag);
    if (!mapaResultado.has(tagNorm)) {
      const novo = criarEquipamentoPadrao(tagNorm, seed.modelo, seed.ativo, seed.grupo, seed.frente);
      mapaResultado.set(tagNorm, novo);
      paraGravarNoBanco.push(novo);
    }
  });

  const listaCompleta = Array.from(mapaResultado.values());
  return { listaCompleta, paraGravarNoBanco };
}
