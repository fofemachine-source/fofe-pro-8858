import { Equipamento } from '../types';
import { derivarFrenteDaTag, normalizarTag } from '../lib/uEmDataUtils';

export const EQUIPAMENTOS_INICIAIS = [
  { tag: "EH-4026", modelo: "Hitachi EX1200" },
  { tag: "EH-4035", modelo: "Hitachi EX1200" },
  { tag: "EH-4039", modelo: "Hitachi EX1200" },
  { tag: "EH-4041", modelo: "Hitachi EX1200" },
  { tag: "EH-4047", modelo: "Hitachi EX1200" },
  { tag: "EH-4050", modelo: "Hitachi EX1200" },
  { tag: "EH-5003", modelo: "Hitachi EX2500" },
  { tag: "EH-5004", modelo: "Hitachi EX2500" },
  { tag: "EH-5036", modelo: "Hitachi EX2500" },
  { tag: "EH-1876", modelo: "Escavadeira" },
  { tag: "EH-2014", modelo: "Escavadeira" },
  { tag: "EH-2015", modelo: "Escavadeira" },
  { tag: "EH-2018", modelo: "Escavadeira" },
  { tag: "CR-2516", modelo: "Komatsu HD785" },
  { tag: "CR-2517", modelo: "Komatsu HD785" },
  { tag: "CR-2518", modelo: "Komatsu HD785" },
  { tag: "CR-2519", modelo: "Komatsu HD785" },
  { tag: "CR-2520", modelo: "Komatsu HD785" },
  { tag: "CR-2521", modelo: "Komatsu HD785" },
  { tag: "CR-2522", modelo: "Komatsu HD785" },
  { tag: "CR-2523", modelo: "Komatsu HD785" },
  { tag: "CR-2524", modelo: "Komatsu HD785" },
  { tag: "CR-2525", modelo: "Komatsu HD785" },
  { tag: "CR-2526", modelo: "Komatsu HD785" },
  { tag: "CR-2527", modelo: "Komatsu HD785" },
  { tag: "CR-2529", modelo: "Komatsu HD785" },
  { tag: "CR-2530", modelo: "Komatsu HD785" },
  { tag: "CR-2531", modelo: "Komatsu HD785" },
  { tag: "CR-2532", modelo: "Komatsu HD785" },
  { tag: "CR-2533", modelo: "Komatsu HD785" },
  { tag: "CR-2534", modelo: "Komatsu HD785" },
  { tag: "CR-2535", modelo: "Komatsu HD785" },
  { tag: "CR-2536", modelo: "Komatsu HD785" },
  { tag: "CR-2537", modelo: "Komatsu HD785" },
  { tag: "CR-2538", modelo: "Komatsu HD785" },
  { tag: "CR-3031", modelo: "Komatsu 730E" },
  { tag: "CR-3033", modelo: "Komatsu 730E" },
  { tag: "CR-3035", modelo: "Komatsu 730E" },
  { tag: "CR-3037", modelo: "Komatsu 730E" },
  { tag: "CR-3058", modelo: "Komatsu 730E" },
  { tag: "CR-3059", modelo: "Komatsu 730E" },
  { tag: "CR-3066", modelo: "Komatsu 730E" },
  { tag: "CR-3085", modelo: "Komatsu 730E" },
  { tag: "CR-3099", modelo: "Komatsu 730E" },
  { tag: "CR-3101", modelo: "Komatsu 730E" },
  { tag: "CR-3102", modelo: "Komatsu 730E" },
  { tag: "CR-3103", modelo: "Komatsu 730E" },
  { tag: "CR-3104", modelo: "Komatsu 730E" },
  { tag: "CR-3105", modelo: "Komatsu 730E" },
  { tag: "CR-3106", modelo: "Komatsu 730E" },
  { tag: "CR-3111", modelo: "Komatsu 730E" },
  { tag: "CR-3112", modelo: "Komatsu 730E" },
  { tag: "CR-3114", modelo: "Komatsu 730E" },
  { tag: "CR-3116", modelo: "Komatsu 730E" },
  { tag: "CR-3184", modelo: "Komatsu 730E" },
  { tag: "CR-3185", modelo: "Komatsu 730E" },
  { tag: "CR-3186", modelo: "Komatsu 730E" },
  { tag: "CR-3523", modelo: "Komatsu 730E" },
  { tag: "CR-3524", modelo: "Komatsu 730E" },
  { tag: "CB-3001", modelo: "Caminhão basculante" },
  { tag: "CB-3096", modelo: "Caminhão basculante" },
  { tag: "CB-3097", modelo: "Caminhão basculante" },
  { tag: "CB-3098", modelo: "Caminhão basculante" },
  { tag: "CB-3100", modelo: "Caminhão basculante" },
  { tag: "CB-3104", modelo: "Caminhão basculante" },
  { tag: "CB-3108", modelo: "Caminhão basculante" },
  { tag: "PF-1031", modelo: "Perfuratriz" },
  { tag: "MN-3001", modelo: "Motoniveladora" }
];

export const ORDEM_TIPOS_EQUIPAMENTO = [
  'Escavadeiras',
  'Caminhões',
  'Caminhões basculantes',
  'Perfuratrizes',
  'Motoniveladoras',
  'Outros'
];

export function derivarTipoEquipamento(tag: string, modelo?: string): string {
  const norm = normalizarTag(tag);
  const modUpper = (modelo || '').toUpperCase();
  if (norm.startsWith('EH-') || modUpper.includes('ESCAVADEIRA') || modUpper.includes('EX1200') || modUpper.includes('EX2500')) {
    return 'Escavadeiras';
  }
  if (norm.startsWith('CR-') || modUpper.includes('HD785') || modUpper.includes('730E')) {
    return 'Caminhões';
  }
  if (norm.startsWith('CB-') || modUpper.includes('BASCULANTE')) {
    return 'Caminhões basculantes';
  }
  if (norm.startsWith('PF-') || modUpper.includes('PERFURATRIZ')) {
    return 'Perfuratrizes';
  }
  if (norm.startsWith('MN-') || modUpper.includes('MOTONIVELADORA')) {
    return 'Motoniveladoras';
  }
  return 'Outros';
}

export function criarEquipamentoPadrao(tag: string, modelo: string, ativo = true): Equipamento {
  const tagNorm = normalizarTag(tag);
  return {
    id: `eq-${tagNorm}`,
    tag: tagNorm,
    modelo: modelo.trim() || derivarTipoEquipamento(tagNorm),
    tipo: derivarTipoEquipamento(tagNorm, modelo),
    frente: derivarFrenteDaTag(tagNorm),
    ativo,
    createdAt: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
}

export function getEquipamentosIniciaisCompletos(): Equipamento[] {
  return EQUIPAMENTOS_INICIAIS.map((item) => criarEquipamentoPadrao(item.tag, item.modelo, true));
}
