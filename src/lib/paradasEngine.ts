import { Parada, Segmento, AuditoriaParada, ResponsavelClasse } from '../types';
import { buscarCodigoVale, getFuncaoResponsavelSugerida } from '../data/codigosVale';
import { derivarFrenteDaTag, normalizarTag } from './uEmDataUtils';

/**
 * Cria uma nova parada aberta com o segmento inicial padrão (HMC 9130 AG ATENDIMENTO)
 */
export function criarNovaParada(params: {
  tag: string;
  frente?: string;
  inicioParada: string; // ISO
  numeroOS?: string | null;
  sintomaInicial?: string | null;
  previsaoLiberacao?: string | null;
  usuario: string;
  codigoInicial?: string; // padrão "HMC 9130"
  complementoInicial?: string;
}): Parada {
  const tagNormalizada = normalizarTag(params.tag);
  const frente = params.frente || derivarFrenteDaTag(tagNormalizada);
  const inicioIso = new Date(params.inicioParada).toISOString();
  const id = `parada-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const codDef = buscarCodigoVale(params.codigoInicial || 'HMC 9130');
  const codigo = codDef?.codigo || 'HMC 9130';
  const nome = codDef?.nome || 'AG ATENDIMENTO';
  const situacao = codDef?.sit || 'AG';
  const responsavel = codDef?.resp || 'MANUTENCAO';
  const responsavelFuncao = getFuncaoResponsavelSugerida(codigo, responsavel, codDef?.quem || '');

  const segmentoInicial: Segmento = {
    id: `seg-${Date.now()}-1`,
    codigo,
    nome,
    situacao,
    responsavel,
    responsavelFuncao,
    inicio: inicioIso,
    fim: null, // Segmento aberto/atual
    complemento: params.complementoInicial || null,
    origem: 'ADMIN',
    editadoPor: params.usuario,
    editadoEm: new Date().toISOString()
  };

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-1`,
    paradaId: id,
    dataHora: new Date().toISOString(),
    usuario: params.usuario,
    acao: 'CRIADA',
    detalhes: `Parada aberta para ${tagNormalizada} com início em ${inicioIso}. Segmento inicial: ${codigo} - ${nome}`
  };

  return {
    id,
    tag: tagNormalizada,
    frente,
    inicioParada: inicioIso,
    fimParada: null,
    numeroOS: params.numeroOS || null,
    sintomaInicial: params.sintomaInicial || null,
    previsaoLiberacao: params.previsaoLiberacao || null,
    situacao: 'ABERTA',
    segmentos: [segmentoInicial],
    relatorioIds: [],
    criadoPor: params.usuario,
    criadoEm: new Date().toISOString(),
    atualizadoPor: params.usuario,
    atualizadoEm: new Date().toISOString(),
    auditoria: [audit]
  };
}

/**
 * Aplica um novo status (código) na parada, fechando o segmento anterior e abrindo um novo
 */
export function aplicarNovoStatus(
  parada: Parada,
  novoCodigo: string,
  inicioNovoIso: string = new Date().toISOString(),
  usuario: string,
  opcoes?: {
    responsavel?: ResponsavelClasse;
    responsavelFuncao?: string;
    complemento?: string | null;
  }
): Parada {
  const codDef = buscarCodigoVale(novoCodigo);
  const codigo = codDef?.codigo || novoCodigo;
  const nome = codDef?.nome || 'STATUS';
  const situacao = codDef?.sit || 'AG';
  const responsavel = opcoes?.responsavel || codDef?.resp || 'MANUTENCAO';
  const responsavelFuncao = opcoes?.responsavelFuncao || getFuncaoResponsavelSugerida(codigo, responsavel, codDef?.quem || '');

  const segmentos = [...parada.segmentos];
  const agoraIso = new Date(inicioNovoIso).toISOString();

  // Fechar segmento atual se houver
  const ultimoIdx = segmentos.length - 1;
  let valorAnterior = '';
  if (ultimoIdx >= 0) {
    const ultimo = { ...segmentos[ultimoIdx] };
    valorAnterior = `${ultimo.codigo} ${ultimo.nome}`;
    if (!ultimo.fim || new Date(ultimo.fim).getTime() > new Date(agoraIso).getTime()) {
      ultimo.fim = agoraIso;
      segmentos[ultimoIdx] = ultimo;
    }
  }

  // Novo segmento
  const novoSegmento: Segmento = {
    id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo,
    nome,
    situacao,
    responsavel,
    responsavelFuncao,
    inicio: agoraIso,
    fim: null,
    complemento: opcoes?.complemento || null,
    origem: 'ADMIN',
    editadoPor: usuario,
    editadoEm: new Date().toISOString()
  };

  segmentos.push(novoSegmento);

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: new Date().toISOString(),
    usuario,
    acao: 'STATUS_ALTERADO',
    detalhes: `Status alterado de "${valorAnterior}" para "${codigo} - ${nome}" (${responsavel})`,
    valorAnterior,
    valorNovo: `${codigo} - ${nome}`
  };

  return {
    ...parada,
    segmentos: recalcularELigarSegmentos(segmentos, parada.inicioParada, parada.fimParada),
    atualizadoPor: usuario,
    atualizadoEm: new Date().toISOString(),
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Insere um período no passado ajustando os vizinhos automaticamente
 * para não deixar buraco nem sobreposição.
 */
export function inserirSegmentoNoPassado(
  parada: Parada,
  segmento: {
    codigo: string;
    inicio: string; // ISO
    fim: string;    // ISO
    responsavel?: ResponsavelClasse;
    responsavelFuncao?: string;
    complemento?: string | null;
  },
  usuario: string
): Parada {
  const codDef = buscarCodigoVale(segmento.codigo);
  const codigo = codDef?.codigo || segmento.codigo;
  const nome = codDef?.nome || 'PERIODO';
  const situacao = codDef?.sit || 'AG';
  const responsavel = segmento.responsavel || codDef?.resp || 'MANUTENCAO';
  const responsavelFuncao = segmento.responsavelFuncao || getFuncaoResponsavelSugerida(codigo, responsavel, codDef?.quem || '');

  const inicioNovo = new Date(segmento.inicio).getTime();
  const fimNovo = new Date(segmento.fim).getTime();

  if (fimNovo <= inicioNovo) {
    throw new Error('A hora de fim deve ser posterior à hora de início.');
  }

  const novoSeg: Segmento = {
    id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo,
    nome,
    situacao,
    responsavel,
    responsavelFuncao,
    inicio: new Date(inicioNovo).toISOString(),
    fim: new Date(fimNovo).toISOString(),
    complemento: segmento.complemento || null,
    origem: 'ADMIN',
    editadoPor: usuario,
    editadoEm: new Date().toISOString()
  };

  // Reorganiza a linha do tempo cortando qualquer segmento existente que colida com o novo intervalo
  const novaLinha: Segmento[] = [];

  for (const seg of parada.segmentos) {
    const sIni = new Date(seg.inicio).getTime();
    const sFim = seg.fim ? new Date(seg.fim).getTime() : Infinity;

    // Se o segmento atual fica totalmente contido dentro do novo intervalo, ele é absorvido
    if (sIni >= inicioNovo && sFim <= fimNovo) {
      continue;
    }

    // Se o segmento começa antes e termina depois do novo intervalo, divide em duas partes
    if (sIni < inicioNovo && sFim > fimNovo) {
      novaLinha.push({
        ...seg,
        fim: new Date(inicioNovo).toISOString(),
        editadoPor: usuario,
        editadoEm: new Date().toISOString()
      });
      novaLinha.push({
        ...seg,
        id: `seg-${Date.now()}-${Math.random()}`,
        inicio: new Date(fimNovo).toISOString(),
        fim: sFim === Infinity ? null : new Date(sFim).toISOString(),
        editadoPor: usuario,
        editadoEm: new Date().toISOString()
      });
      continue;
    }

    // Se colide na cauda (termina depois de inicioNovo, mas começou antes)
    if (sIni < inicioNovo && sFim > inicioNovo && sFim <= fimNovo) {
      novaLinha.push({
        ...seg,
        fim: new Date(inicioNovo).toISOString(),
        editadoPor: usuario,
        editadoEm: new Date().toISOString()
      });
      continue;
    }

    // Se colide na cabeça (começa antes de fimNovo, mas termina depois)
    if (sIni >= inicioNovo && sIni < fimNovo && sFim > fimNovo) {
      novaLinha.push({
        ...seg,
        inicio: new Date(fimNovo).toISOString(),
        editadoPor: usuario,
        editadoEm: new Date().toISOString()
      });
      continue;
    }

    // Não colide
    novaLinha.push(seg);
  }

  novaLinha.push(novoSeg);

  // Ordena por início
  novaLinha.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: new Date().toISOString(),
    usuario,
    acao: 'PERIODO_INSERIDO',
    detalhes: `Período inserido no passado: ${codigo} - ${nome} (${novoSeg.inicio} até ${novoSeg.fim})`,
    valorNovo: `${codigo} [${novoSeg.inicio} - ${novoSeg.fim}]`
  };

  return {
    ...parada,
    segmentos: recalcularELigarSegmentos(novaLinha, parada.inicioParada, parada.fimParada),
    atualizadoPor: usuario,
    atualizadoEm: new Date().toISOString(),
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Garante que não haja buracos e nem sobreposições na linha do tempo.
 * O primeiro segmento começa em inicioParada, e cada segmento subsequente inicia exatamente onde o anterior terminou.
 */
export function recalcularELigarSegmentos(
  segmentos: Segmento[],
  inicioParadaIso: string,
  fimParadaIso?: string | null
): Segmento[] {
  if (!segmentos || segmentos.length === 0) {
    const codDef = buscarCodigoVale('HMC 9130');
    return [{
      id: `seg-padrao-${Date.now()}`,
      codigo: 'HMC 9130',
      nome: 'AG ATENDIMENTO',
      situacao: 'AG',
      responsavel: 'MANUTENCAO',
      responsavelFuncao: 'Supervisor de Manutenção do turno',
      inicio: inicioParadaIso,
      fim: fimParadaIso || null,
      complemento: null,
      origem: 'AUTOMATICO'
    }];
  }

  // Ordena por início
  const sorted = [...segmentos].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  const resultado: Segmento[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = { ...sorted[i] };
    const isFirst = i === 0;
    const isLast = i === sorted.length - 1;

    // Primeiro sempre começa no inicioParada
    if (isFirst) {
      current.inicio = inicioParadaIso;
    } else {
      // Começa exatamente onde o anterior terminou
      const anterior = resultado[i - 1];
      if (anterior.fim) {
        current.inicio = anterior.fim;
      }
    }

    if (isLast) {
      // Se a parada está encerrada, o último segmento termina no fimParada
      if (fimParadaIso) {
        current.fim = fimParadaIso;
      } else {
        current.fim = null; // em andamento
      }
    } else {
      // Segmentos intermediários precisam de fim válido
      if (!current.fim || new Date(current.fim).getTime() <= new Date(current.inicio).getTime()) {
        const next = sorted[i + 1];
        current.fim = next ? next.inicio : new Date().toISOString();
      }
    }

    resultado.push(current);
  }

  return resultado;
}

/**
 * Exclui um segmento e costura os vizinhos para não deixar buraco
 */
export function excluirSegmento(parada: Parada, segmentoId: string, usuario: string): Parada {
  if (parada.segmentos.length <= 1) {
    throw new Error('A parada precisa conter pelo menos um período no histórico.');
  }

  const idx = parada.segmentos.findIndex(s => s.id === segmentoId);
  if (idx === -1) return parada;

  const removido = parada.segmentos[idx];
  const novosSegmentos = parada.segmentos.filter(s => s.id !== segmentoId);

  // Se o removido era intermediário, o anterior assume até o início do seguinte
  if (idx > 0 && idx < parada.segmentos.length) {
    const anterior = { ...novosSegmentos[idx - 1] };
    anterior.fim = removido.fim;
    novosSegmentos[idx - 1] = anterior;
  }

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: new Date().toISOString(),
    usuario,
    acao: 'EXCLUSAO_SEGMENTO',
    detalhes: `Segmento ${removido.codigo} (${removido.nome}) excluído. Vizinhos ajustados.`,
    valorAnterior: `${removido.codigo} [${removido.inicio} - ${removido.fim || 'agora'}]`
  };

  return {
    ...parada,
    segmentos: recalcularELigarSegmentos(novosSegmentos, parada.inicioParada, parada.fimParada),
    atualizadoPor: usuario,
    atualizadoEm: new Date().toISOString(),
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Encerra uma parada quando o operador reassume
 */
export function encerrarParada(parada: Parada, fimParadaIso: string, usuario: string): Parada {
  const fimIso = new Date(fimParadaIso).toISOString();
  const segmentos = [...parada.segmentos];
  const ultimo = { ...segmentos[segmentos.length - 1] };
  ultimo.fim = fimIso;
  segmentos[segmentos.length - 1] = ultimo;

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: new Date().toISOString(),
    usuario,
    acao: 'ENCERRAMENTO',
    detalhes: `Parada encerrada às ${fimIso}. Equipamento em operação.`
  };

  return {
    ...parada,
    situacao: 'ENCERRADA',
    fimParada: fimIso,
    segmentos: recalcularELigarSegmentos(segmentos, parada.inicioParada, fimIso),
    atualizadoPor: usuario,
    atualizadoEm: new Date().toISOString(),
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Reabre uma parada que havia sido encerrada por engano
 */
export function reabrirParada(parada: Parada, usuario: string): Parada {
  const segmentos = [...parada.segmentos];
  const ultimo = { ...segmentos[segmentos.length - 1] };
  ultimo.fim = null; // Volta a ficar em aberto
  segmentos[segmentos.length - 1] = ultimo;

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: new Date().toISOString(),
    usuario,
    acao: 'REABERTURA',
    detalhes: `Parada reaberta pelo usuário ${usuario}.`
  };

  return {
    ...parada,
    situacao: 'ABERTA',
    fimParada: null,
    segmentos,
    atualizadoPor: usuario,
    atualizadoEm: new Date().toISOString(),
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Retorna os minutos acumulados por cada classe de responsável na parada
 */
export function calcularHorasPorResponsavel(parada: Parada, agoraMs: number = Date.now()): Record<ResponsavelClasse, number> {
  const totais: Record<ResponsavelClasse, number> = {
    MANUTENCAO: 0,
    PRODUCAO: 0,
    VALE: 0,
    EXTERNO: 0,
    ACIDENTE: 0,
    A_DEFINIR: 0
  };

  const paradaFimMs = parada.fimParada ? new Date(parada.fimParada).getTime() : agoraMs;

  for (const seg of parada.segmentos) {
    const sIni = new Date(seg.inicio).getTime();
    const sFim = seg.fim ? new Date(seg.fim).getTime() : paradaFimMs;
    const duracaoMs = Math.max(0, sFim - sIni);
    const duracaoMin = Math.round(duracaoMs / 60000);
    const resp = (seg.responsavel || 'A_DEFINIR') as ResponsavelClasse;
    totais[resp] = (totais[resp] || 0) + duracaoMin;
  }

  return totais;
}

/**
 * Retorna a duração total da parada em minutos
 */
export function calcularDuracaoTotalParadaMinutos(parada: Parada, agoraMs: number = Date.now()): number {
  const inicio = new Date(parada.inicioParada).getTime();
  const fim = parada.fimParada ? new Date(parada.fimParada).getTime() : agoraMs;
  if (isNaN(inicio) || isNaN(fim) || fim <= inicio) return 0;
  return Math.round((fim - inicio) / 60000);
}

/**
 * Retorna o segmento atual (em aberto ou último)
 */
export function getSegmentoAtual(parada: Parada): Segmento {
  return parada.segmentos[parada.segmentos.length - 1] || {
    id: 'seg-none',
    codigo: 'HMC 9130',
    nome: 'AG ATENDIMENTO',
    situacao: 'AG',
    responsavel: 'MANUTENCAO',
    responsavelFuncao: 'Supervisor de Manutenção do turno',
    inicio: parada.inicioParada,
    fim: null,
    origem: 'AUTOMATICO'
  };
}

/**
 * Processa a finalização de um relatório com atendimentos, vinculando a paradas existentes
 * ou criando novas paradas e inserindo os segmentos de execução de manutenção.
 */
export function processarAtendimentosParaParadas(
  paradasExistentes: Parada[],
  reportId: string,
  atendimentos: import('../types').Atendimento[],
  usuario: string,
  dataReferencia: string // Data do turno YYYY-MM-DD
): Parada[] {
  let listaAtualizada = [...paradasExistentes];

  for (const at of atendimentos) {
    if (!at.equipamento || !at.equipamento.trim()) continue;
    const tag = normalizarTag(at.equipamento);

    // Constrói horários ISO de início e fim do atendimento
    const hojeStr = dataReferencia || new Date().toISOString().slice(0, 10);
    
    // Início do atendimento
    let inicioAtendimentoIso: string;
    if (at.horaInicio && at.horaInicio.includes(':')) {
      inicioAtendimentoIso = new Date(`${hojeStr}T${at.horaInicio}:00`).toISOString();
    } else {
      inicioAtendimentoIso = new Date().toISOString();
    }

    // Fim do atendimento
    let fimAtendimentoIso: string;
    if (at.horaFim && at.horaFim.includes(':')) {
      fimAtendimentoIso = new Date(`${hojeStr}T${at.horaFim}:00`).toISOString();
      // Se hora fim for menor que hora início (ex: virou a noite), adiciona 1 dia
      if (new Date(fimAtendimentoIso).getTime() < new Date(inicioAtendimentoIso).getTime()) {
        const d = new Date(fimAtendimentoIso);
        d.setDate(d.getDate() + 1);
        fimAtendimentoIso = d.toISOString();
      }
    } else {
      fimAtendimentoIso = new Date().toISOString();
    }

    // Hora real da parada (se informada pelo mecânico)
    let inicioParadaIso: string;
    if (at.horaRealParada && at.horaRealParada.includes(':')) {
      const parsed = new Date(`${hojeStr}T${at.horaRealParada}:00`).toISOString();
      // Se for maior que início do atendimento, pode ter sido dia anterior
      if (new Date(parsed).getTime() > new Date(inicioAtendimentoIso).getTime()) {
        const d = new Date(parsed);
        d.setDate(d.getDate() - 1);
        inicioParadaIso = d.toISOString();
      } else {
        inicioParadaIso = parsed;
      }
    } else {
      inicioParadaIso = inicioAtendimentoIso;
    }

    // Código de execução conforme tipo de manutenção
    let codExec = 'HMC 9110'; // Corretiva por padrão
    if (at.tipoManutencao === 'PREVENTIVA') {
      codExec = 'HMP 9210';
    } else if (at.tipoManutencao === 'PROGRAMADA') {
      codExec = 'HPR 9310';
    }

    // Procura parada aberta para essa TAG
    const paradaAbertaIdx = listaAtualizada.findIndex(
      p => normalizarTag(p.tag) === tag && p.situacao === 'ABERTA'
    );

    if (paradaAbertaIdx >= 0) {
      // Parada existente aberta: vincula relatório e insere segmento de execução
      let parada = { ...listaAtualizada[paradaAbertaIdx] };
      const relatorios = Array.from(new Set([...(parada.relatorioIds || []), reportId]));
      parada.relatorioIds = relatorios;
      if (at.om && !parada.numeroOS) parada.numeroOS = at.om;
      if (at.sintoma && !parada.sintomaInicial) parada.sintomaInicial = at.sintoma;
      if (at.previsaoLiberacao) parada.previsaoLiberacao = at.previsaoLiberacao;

      // Se a hora real da parada for anterior ao início da parada atual, ajusta início
      if (new Date(inicioParadaIso).getTime() < new Date(parada.inicioParada).getTime()) {
        parada.inicioParada = inicioParadaIso;
      }

      // Insere segmento de execução de manutenção
      parada = inserirSegmentoNoPassado(
        parada,
        {
          codigo: codExec,
          inicio: inicioAtendimentoIso,
          fim: fimAtendimentoIso,
          responsavel: 'MANUTENCAO',
          responsavelFuncao: 'Mecânico / Eletricista Executante',
          complemento: at.acaoExecutada ? at.acaoExecutada.slice(0, 100) : null
        },
        usuario
      );

      // Se o mecânico liberou o equipamento para operação
      if (at.liberadoOperacao) {
        parada = aplicarNovoStatus(parada, 'HMC 9140', fimAtendimentoIso, usuario, {
          responsavel: 'PRODUCAO',
          responsavelFuncao: 'Operação / Despacho',
          complemento: 'Liberado pelo técnico após atendimento'
        });
      }

      listaAtualizada[paradaAbertaIdx] = parada;
    } else {
      // Cria nova parada com início na hora real ou início do atendimento
      let nova = criarNovaParada({
        tag,
        inicioParada: inicioParadaIso,
        numeroOS: at.om,
        sintomaInicial: at.sintoma,
        previsaoLiberacao: at.previsaoLiberacao,
        usuario,
        codigoInicial: 'HMC 9130',
        complementoInicial: 'Aguardando atendimento registrado no relatório'
      });

      nova.relatorioIds = [reportId];

      // Insere segmento de execução de manutenção
      nova = inserirSegmentoNoPassado(
        nova,
        {
          codigo: codExec,
          inicio: inicioAtendimentoIso,
          fim: fimAtendimentoIso,
          responsavel: 'MANUTENCAO',
          responsavelFuncao: 'Mecânico / Eletricista Executante',
          complemento: at.acaoExecutada ? at.acaoExecutada.slice(0, 100) : null
        },
        usuario
      );

      // Se liberado para operação
      if (at.liberadoOperacao) {
        nova = aplicarNovoStatus(nova, 'HMC 9140', fimAtendimentoIso, usuario, {
          responsavel: 'PRODUCAO',
          responsavelFuncao: 'Operação / Despacho',
          complemento: 'Liberado pelo técnico após atendimento'
        });
      }

      listaAtualizada.unshift(nova);
    }
  }

  return listaAtualizada;
}

export interface MotivoPausa {
  codigo: string;
  nome: string;
  rotulo: string;
  resp: ResponsavelClasse;
  quem: string;
}

export const MOTIVOS_PAUSA_RAPIDA: MotivoPausa[] = [
  { codigo: 'HMC 9118', nome: 'AG PECAS', rotulo: 'AG PEÇAS (HMC 9118)', resp: 'MANUTENCAO', quem: 'Dono de Almoxarifado / suprimentos (peças)' },
  { codigo: 'HMC 9120', nome: 'AG OPERACAO', rotulo: 'AG SEGREGAÇÃO / OPERADOR (HMC 9120)', resp: 'PRODUCAO', quem: 'Dono de Operador para deslocar/testar máquina' },
  { codigo: 'HMC 9115', nome: 'AG LIBERACAO DE ACESSO', rotulo: 'AG ACESSO (HMC 9115)', resp: 'PRODUCAO', quem: 'Dono de Acesso / vias' },
  { codigo: 'HMC 9135', nome: 'AG PTS', rotulo: 'AG PTS (HMC 9135)', resp: 'A_DEFINIR', quem: 'Dono de Emissão / liberação de PTS' },
  { codigo: 'HMC 9126', nome: 'AG MAU TEMPO', rotulo: 'AG MAU TEMPO (HMC 9126)', resp: 'EXTERNO', quem: 'Externo (Chuva / Raios / Neblina)' },
  { codigo: 'HMC 9121', nome: 'AG RECURSO/FERRAMENTAL', rotulo: 'AG RECURSO/FERRAMENTAL (HMC 9121)', resp: 'A_DEFINIR', quem: 'Dono de Munck, ponte rolante e ferramental especial' },
  { codigo: 'HMC 9110', nome: 'AG BORRACHARIA', rotulo: 'AG BORRACHARIA (HMC 9110)', resp: 'A_DEFINIR', quem: 'Dono de Borracharia' },
];

/**
 * Inicia o atendimento de uma parada aberta pelo técnico.
 * Fecha o segmento atual e abre o segmento EXEC MANUT (HMC 9000, MPS 7000 ou MPNS 8000).
 * Se outro técnico já iniciou, o novo entra como membro da equipe sem duplicar parada.
 */
export function iniciarAtendimentoParada(params: {
  parada: Parada;
  tecnicoNome: string;
  tecnicoMatricula?: string;
  tecnicoFuncao?: string;
  tecnicoGrupo?: string;
  membrosEquipe?: Array<{ id?: string; nome: string; matricula?: string; funcao?: string; papel?: string }>;
  tipoManutencao: 'CORRETIVA' | 'PREVENTIVA' | 'PROGRAMADA';
  horaToqueIso?: string;
  reportId?: string;
}): Parada {
  const agoraIso = params.horaToqueIso || new Date().toISOString();
  const parada = { ...params.parada };

  // Se outro técnico já está atendendo esta mesma parada, entra como membro da equipe sem duplicar
  if (parada.emAtendimentoPor) {
    const jaEsta = parada.emAtendimentoPor.tecnicoPrincipal.nome.toLowerCase() === params.tecnicoNome.toLowerCase()
      || (parada.emAtendimentoPor.membrosEquipe || []).some(m => m.nome.toLowerCase() === params.tecnicoNome.toLowerCase());

    if (!jaEsta) {
      return adicionarMembroEquipeParada({
        parada,
        nome: params.tecnicoNome,
        matricula: params.tecnicoMatricula,
        funcao: params.tecnicoFuncao,
        reportId: params.reportId
      });
    }
    return parada;
  }

  // Código de execução conforme tipo de manutenção
  let codigoExec = 'HMC 9000';
  if (params.tipoManutencao === 'PREVENTIVA') {
    codigoExec = 'MPS 7000';
  } else if (params.tipoManutencao === 'PROGRAMADA') {
    codigoExec = 'MPNS 8000';
  }

  const codDef = buscarCodigoVale(codigoExec);
  const nomeExec = codDef?.nome || 'EXEC MANUT';

  // Fechar segmento atual na hora do toque
  const segmentos = [...parada.segmentos];
  const ultimoIdx = segmentos.length - 1;
  let valorAnterior = '';
  if (ultimoIdx >= 0) {
    const ultimo = { ...segmentos[ultimoIdx] };
    valorAnterior = `${ultimo.codigo} ${ultimo.nome}`;
    if (!ultimo.fim || new Date(ultimo.fim).getTime() > new Date(agoraIso).getTime()) {
      ultimo.fim = agoraIso;
      segmentos[ultimoIdx] = ultimo;
    }
  }

  // Novo segmento EXEC MANUT
  const novoSegmento: Segmento = {
    id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo: codigoExec,
    nome: nomeExec,
    situacao: 'EXEC',
    responsavel: 'MANUTENCAO',
    responsavelFuncao: 'Técnico de Manutenção Executante',
    inicio: agoraIso,
    fim: null,
    complemento: `Início do atendimento (${params.tipoManutencao})`,
    origem: 'TECNICO',
    editadoPor: `${params.tecnicoNome}${params.tecnicoMatricula ? ` (${params.tecnicoMatricula})` : ''}`,
    editadoEm: agoraIso
  };
  segmentos.push(novoSegmento);

  // Auditoria
  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: agoraIso,
    usuario: params.tecnicoNome,
    matricula: params.tecnicoMatricula || undefined,
    acao: 'INICIAR_ATENDIMENTO',
    detalhes: `Atendimento iniciado por ${params.tecnicoNome}${params.tecnicoMatricula ? ` (${params.tecnicoMatricula})` : ''} - Tipo: ${params.tipoManutencao}. Segmento aberto: ${codigoExec} ${nomeExec}.`,
    valorAnterior,
    valorNovo: `${codigoExec} - ${nomeExec}`
  };

  const relatorioIds = params.reportId 
    ? Array.from(new Set([...(parada.relatorioIds || []), params.reportId]))
    : (parada.relatorioIds || []);

  return {
    ...parada,
    segmentos: recalcularELigarSegmentos(segmentos, parada.inicioParada, parada.fimParada),
    emAtendimentoPor: {
      tecnicoPrincipal: {
        nome: params.tecnicoNome,
        matricula: params.tecnicoMatricula,
        funcao: params.tecnicoFuncao,
        grupo: params.tecnicoGrupo
      },
      membrosEquipe: params.membrosEquipe || [],
      inicioAtendimento: agoraIso,
      tipoManutencao: params.tipoManutencao,
      codigoExec,
      reportId: params.reportId
    },
    relatorioIds,
    atualizadoPor: params.tecnicoNome,
    atualizadoEm: agoraIso,
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Adiciona um técnico adicional como membro da equipe de atendimento da parada sem duplicar.
 */
export function adicionarMembroEquipeParada(params: {
  parada: Parada;
  nome: string;
  matricula?: string;
  funcao?: string;
  papel?: string;
  reportId?: string;
}): Parada {
  const agoraIso = new Date().toISOString();
  const parada = { ...params.parada };
  if (!parada.emAtendimentoPor) return parada;

  const membros = [...(parada.emAtendimentoPor.membrosEquipe || [])];
  if (!membros.some(m => m.nome.toLowerCase() === params.nome.toLowerCase())) {
    membros.push({
      id: `int-${Date.now()}-${Math.random()}`,
      nome: params.nome,
      matricula: params.matricula,
      funcao: params.funcao || 'Mecânico Apoio',
      papel: params.papel || 'Mecânico Apoio'
    });
  }

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: agoraIso,
    usuario: params.nome,
    matricula: params.matricula || undefined,
    acao: 'INICIAR_ATENDIMENTO',
    detalhes: `Técnico ${params.nome}${params.matricula ? ` (${params.matricula})` : ''} entrou na equipe de atendimento da parada.`
  };

  const relatorioIds = params.reportId 
    ? Array.from(new Set([...(parada.relatorioIds || []), params.reportId]))
    : (parada.relatorioIds || []);

  return {
    ...parada,
    emAtendimentoPor: {
      ...parada.emAtendimentoPor,
      membrosEquipe: membros
    },
    relatorioIds,
    atualizadoPor: params.nome,
    atualizadoEm: agoraIso,
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Pausa o atendimento da parada por um motivo selecionado (AG PEÇAS, AG SEGREGAÇÃO, etc.).
 * Fecha o segmento EXEC e abre o segmento AG correspondente.
 */
export function pausarAtendimentoParada(params: {
  parada: Parada;
  codigoMotivo: string;
  complemento?: string | null;
  usuarioNome: string;
  usuarioMatricula?: string;
  horaToqueIso?: string;
}): Parada {
  const agoraIso = params.horaToqueIso || new Date().toISOString();
  const parada = { ...params.parada };
  const codDef = buscarCodigoVale(params.codigoMotivo);
  const codigo = codDef?.codigo || params.codigoMotivo;
  const nome = codDef?.nome || 'AG PAUSA';
  const situacao = codDef?.sit || 'AG';
  const responsavel = codDef?.resp || 'MANUTENCAO';
  const responsavelFuncao = getFuncaoResponsavelSugerida(codigo, responsavel, codDef?.quem || '');

  // Fechar segmento EXEC atual
  const segmentos = [...parada.segmentos];
  const ultimoIdx = segmentos.length - 1;
  let valorAnterior = '';
  if (ultimoIdx >= 0) {
    const ultimo = { ...segmentos[ultimoIdx] };
    valorAnterior = `${ultimo.codigo} ${ultimo.nome}`;
    if (!ultimo.fim || new Date(ultimo.fim).getTime() > new Date(agoraIso).getTime()) {
      ultimo.fim = agoraIso;
      segmentos[ultimoIdx] = ultimo;
    }
  }

  // Abrir segmento AG selecionado
  const novoSegmento: Segmento = {
    id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo,
    nome,
    situacao,
    responsavel,
    responsavelFuncao,
    inicio: agoraIso,
    fim: null,
    complemento: params.complemento || null,
    origem: 'TECNICO',
    editadoPor: `${params.usuarioNome}${params.usuarioMatricula ? ` (${params.usuarioMatricula})` : ''}`,
    editadoEm: agoraIso
  };
  segmentos.push(novoSegmento);

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: agoraIso,
    usuario: params.usuarioNome,
    matricula: params.usuarioMatricula || undefined,
    acao: 'PAUSAR',
    detalhes: `Atendimento pausado por ${params.usuarioNome}: ${codigo} - ${nome} (${responsavel}). ${params.complemento ? `Complemento: ${params.complemento}` : ''}`,
    valorAnterior,
    valorNovo: `${codigo} - ${nome}`
  };

  return {
    ...parada,
    segmentos: recalcularELigarSegmentos(segmentos, parada.inicioParada, parada.fimParada),
    emAtendimentoPor: parada.emAtendimentoPor ? {
      ...parada.emAtendimentoPor,
      pausadoEm: agoraIso,
      motivoPausa: `${codigo} - ${nome}`
    } : null,
    atualizadoPor: params.usuarioNome,
    atualizadoEm: agoraIso,
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Retoma o atendimento da parada que estava pausada.
 * Fecha o segmento AG atual e reabre o segmento EXEC MANUT.
 */
export function retomarAtendimentoParada(params: {
  parada: Parada;
  usuarioNome: string;
  usuarioMatricula?: string;
  horaToqueIso?: string;
}): Parada {
  const agoraIso = params.horaToqueIso || new Date().toISOString();
  const parada = { ...params.parada };
  const codigoExec = parada.emAtendimentoPor?.codigoExec || 'HMC 9000';
  const codDef = buscarCodigoVale(codigoExec);
  const nomeExec = codDef?.nome || 'EXEC MANUT';

  // Fechar segmento AG atual
  const segmentos = [...parada.segmentos];
  const ultimoIdx = segmentos.length - 1;
  let valorAnterior = '';
  if (ultimoIdx >= 0) {
    const ultimo = { ...segmentos[ultimoIdx] };
    valorAnterior = `${ultimo.codigo} ${ultimo.nome}`;
    if (!ultimo.fim || new Date(ultimo.fim).getTime() > new Date(agoraIso).getTime()) {
      ultimo.fim = agoraIso;
      segmentos[ultimoIdx] = ultimo;
    }
  }

  // Re-abrir segmento EXEC MANUT
  const novoSegmento: Segmento = {
    id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo: codigoExec,
    nome: nomeExec,
    situacao: 'EXEC',
    responsavel: 'MANUTENCAO',
    responsavelFuncao: 'Técnico de Manutenção Executante',
    inicio: agoraIso,
    fim: null,
    complemento: 'Retomada de atendimento',
    origem: 'TECNICO',
    editadoPor: `${params.usuarioNome}${params.usuarioMatricula ? ` (${params.usuarioMatricula})` : ''}`,
    editadoEm: agoraIso
  };
  segmentos.push(novoSegmento);

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: agoraIso,
    usuario: params.usuarioNome,
    matricula: params.usuarioMatricula || undefined,
    acao: 'RETOMAR',
    detalhes: `Atendimento retomado por ${params.usuarioNome}. Segmento reaberto: ${codigoExec} ${nomeExec}.`,
    valorAnterior,
    valorNovo: `${codigoExec} - ${nomeExec}`
  };

  return {
    ...parada,
    segmentos: recalcularELigarSegmentos(segmentos, parada.inicioParada, parada.fimParada),
    emAtendimentoPor: parada.emAtendimentoPor ? {
      ...parada.emAtendimentoPor,
      pausadoEm: null,
      motivoPausa: null
    } : null,
    atualizadoPor: params.usuarioNome,
    atualizadoEm: agoraIso,
    auditoria: [...(parada.auditoria || []), audit]
  };
}

/**
 * Finaliza o atendimento da parada.
 * Fecha o segmento EXEC atual.
 * Se liberado: abre HOI 5936 LIBERADO PELA MANUT (responsável PRODUCAO).
 * Se não liberado: abre o código AG escolhido (ex: HMC 9118 AG PECAS).
 * A parada continua ABERTA até o Admin encerrar quando o operador assumir.
 */
export function finalizarAtendimentoParada(params: {
  parada: Parada;
  horaFimIso: string;
  liberadoOperacao: boolean;
  codigoContinuacaoSeNaoLiberado?: string;
  complemento?: string | null;
  usuarioNome: string;
  usuarioMatricula?: string;
  reportId?: string;
}): Parada {
  const fimIso = params.horaFimIso || new Date().toISOString();
  const parada = { ...params.parada };

  // Fechar segmento atual na hora fim
  const segmentos = [...parada.segmentos];
  const ultimoIdx = segmentos.length - 1;
  let valorAnterior = '';
  if (ultimoIdx >= 0) {
    const ultimo = { ...segmentos[ultimoIdx] };
    valorAnterior = `${ultimo.codigo} ${ultimo.nome}`;
    if (!ultimo.fim || new Date(ultimo.fim).getTime() > new Date(fimIso).getTime()) {
      ultimo.fim = fimIso;
      segmentos[ultimoIdx] = ultimo;
    }
  }

  // Novo status resultante
  let codigoResultante = 'HOI 5936';
  if (!params.liberadoOperacao) {
    codigoResultante = params.codigoContinuacaoSeNaoLiberado || 'HMC 9118';
  }

  const codDef = buscarCodigoVale(codigoResultante);
  const codigo = codDef?.codigo || codigoResultante;
  const nome = codDef?.nome || (params.liberadoOperacao ? 'LIBERADO PELA MANUT' : 'AG PECAS');
  const situacao = codDef?.sit || 'AG';
  const responsavel = codDef?.resp || (params.liberadoOperacao ? 'PRODUCAO' : 'MANUTENCAO');
  const responsavelFuncao = getFuncaoResponsavelSugerida(codigo, responsavel, codDef?.quem || '');

  const novoSegmento: Segmento = {
    id: `seg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    codigo,
    nome,
    situacao,
    responsavel,
    responsavelFuncao,
    inicio: fimIso,
    fim: null,
    complemento: params.complemento || (params.liberadoOperacao ? 'Manutenção finalizada pelo técnico. Aguardando operador assumir.' : 'Manutenção finalizada mas equipamento segue parado para o próximo turno.'),
    origem: 'TECNICO',
    editadoPor: `${params.usuarioNome}${params.usuarioMatricula ? ` (${params.usuarioMatricula})` : ''}`,
    editadoEm: fimIso
  };
  segmentos.push(novoSegmento);

  const audit: AuditoriaParada = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    paradaId: parada.id,
    dataHora: fimIso,
    usuario: params.usuarioNome,
    matricula: params.usuarioMatricula || undefined,
    acao: 'FINALIZAR',
    detalhes: `Atendimento finalizado por ${params.usuarioNome}. Status resultante: ${codigo} - ${nome} (${responsavel}). Parada permanece ABERTA aguardando encerramento operacional.`,
    valorAnterior,
    valorNovo: `${codigo} - ${nome}`
  };

  const relatorioIds = params.reportId 
    ? Array.from(new Set([...(parada.relatorioIds || []), params.reportId]))
    : (parada.relatorioIds || []);

  return {
    ...parada,
    segmentos: recalcularELigarSegmentos(segmentos, parada.inicioParada, parada.fimParada),
    emAtendimentoPor: null, // Atendimento concluído
    relatorioIds,
    atualizadoPor: params.usuarioNome,
    atualizadoEm: fimIso,
    auditoria: [...(parada.auditoria || []), audit]
  };
}


