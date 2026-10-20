import * as XLSX from 'xlsx';
import { Tecnico, GrupoTecnico } from '../types';
import {
  classificarGrupoFuncao,
  formatarNomeSobrenome,
  normalizarGrupoTecnico,
  normalizarMatricula,
  removerAcentos
} from './uEmDataUtils';

export interface ResumoImportacao {
  totalLido: number;
  novos: number;
  atualizados: number;
  ignorados: number;
  porGrupo: Record<GrupoTecnico, number>;
  tecnicosImportados: Tecnico[];
  erros: string[];
}

/**
 * Lê e analisa a planilha de efetivo (.xlsx / .csv)
 * Aceita dois formatos:
 * - Formato A (planilha já tratada): CSV com separador ; e colunas MATRICULA;NOME;FUNCAO;GRUPO;SECAO na linha 1
 * - Formato B (planilha original EFETIVO_MANUTENÇÃO.xlsx): cabeçalho na primeira linha que contém
 *   AO MESMO TEMPO "CHAPA" (ou "MATRICULA"), "NOME" e "FUNÇÃO" (sem acento e sem diferenciar maiúsculas).
 * - CHAPA/MATRICULA: convertida para texto com zeros à esquerda até 6 dígitos (ex.: 25918 -> "025918").
 * - Ignorar linhas sem matrícula ou sem nome. UPSERT pela matrícula. Todos importados ficam ATIVOS.
 */
export async function processarPlanilhaEfetivo(
  arquivo: File,
  tecnicosExistentes: Tecnico[]
): Promise<ResumoImportacao> {
  let linhas: any[][] = [];

  const isCsv = arquivo.name.toLowerCase().endsWith('.csv') || arquivo.type.includes('csv');
  if (isCsv) {
    const texto = await arquivo.text();
    const linhasTexto = texto
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .filter(l => l.trim().length > 0);
    linhas = linhasTexto.map(linha => {
      const sep = linha.includes(';') ? ';' : ',';
      return linha.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
    });
  } else {
    const buffer = await arquivo.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', raw: true });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('A planilha selecionada não possui abas ou está vazia.');
    }

    const primeiraAbaNome = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[primeiraAbaNome];
    const rawLinhas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    // Caso um CSV com ponto e vírgula tenha sido aberto via XLSX como coluna única
    linhas = rawLinhas.map(row => {
      if (Array.isArray(row) && row.length === 1 && typeof row[0] === 'string' && row[0].includes(';')) {
        return row[0].split(';').map((c: string) => c.replace(/^"|"$/g, '').trim());
      }
      return row;
    });
  }

  if (!linhas || linhas.length === 0) {
    throw new Error('Nenhuma linha encontrada na planilha.');
  }

  // 1. Localiza a primeira linha que contém AO MESMO TEMPO ("CHAPA" ou "MATRICULA"), "NOME" e "FUNÇÃO"
  let headerIndex = -1;
  let colChapa = -1;
  let colNome = -1;
  let colFuncao = -1;
  let colGrupo = -1;
  let colSecao = -1;

  for (let i = 0; i < Math.min(linhas.length, 50); i++) {
    const row = linhas[i];
    if (!Array.isArray(row)) continue;

    let foundChapa = -1;
    let foundNome = -1;
    let foundFuncao = -1;
    let foundGrupo = -1;
    let foundSecao = -1;

    for (let c = 0; c < row.length; c++) {
      const celula = removerAcentos(String(row[c] || ''));
      if (!celula) continue;

      if (celula === 'CHAPA' || celula === 'MATRICULA' || celula.startsWith('CHAPA') || celula.startsWith('MATRICULA')) {
        if (foundChapa === -1) foundChapa = c;
      } else if (celula === 'NOME' || celula === 'NOME COMPLETO' || celula.startsWith('NOME')) {
        if (foundNome === -1) foundNome = c;
      } else if (celula === 'FUNCAO' || celula.includes('FUNCAO') || celula === 'CARGO') {
        if (foundFuncao === -1) foundFuncao = c;
      } else if (celula === 'GRUPO' || celula === 'CATEGORIA') {
        if (foundGrupo === -1) foundGrupo = c;
      } else if (celula.includes('DESCRICAO SECAO') || celula.includes('SECAO') || celula === 'TURMA' || celula === 'SETOR') {
        if (foundSecao === -1) foundSecao = c;
      }
    }

    // Só aceita a linha se tiver AO MESMO TEMPO (CHAPA ou MATRICULA), NOME e FUNÇÃO
    if (foundChapa !== -1 && foundNome !== -1 && foundFuncao !== -1) {
      headerIndex = i;
      colChapa = foundChapa;
      colNome = foundNome;
      colFuncao = foundFuncao;
      colGrupo = foundGrupo;
      colSecao = foundSecao;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Cabeçalho não encontrado. A planilha deve conter simultaneamente as colunas: CHAPA (ou MATRICULA), NOME e FUNÇÃO.');
  }

  const existentesPorMatricula = new Map<string, Tecnico>();
  tecnicosExistentes.forEach(t => {
    const matNorm = normalizarMatricula(t.matricula);
    if (matNorm) {
      existentesPorMatricula.set(matNorm, t);
    }
  });

  const porGrupo: Record<GrupoTecnico, number> = {
    'MECÂNICO': 0,
    'ELETRICISTA': 0,
    'LUBRIFICADOR': 0,
    'BORRACHEIRO': 0,
    'SOLDADOR': 0,
    'INSPETOR': 0,
    'AUXILIAR': 0,
    'LAVADOR/PINTOR': 0,
    'LAVADOR / PINTOR': 0,
    'OPERADOR/MOTORISTA': 0,
    'SUPERVISÃO': 0,
    'ADMINISTRATIVO': 0,
    'OUTROS': 0
  };

  const tecnicosMapPorMatricula = new Map<string, Tecnico>();
  let totalLido = 0;
  let novos = 0;
  let atualizados = 0;
  let ignorados = 0;
  const erros: string[] = [];

  // 2. Lê os dados a partir da linha seguinte ao cabeçalho
  for (let r = headerIndex + 1; r < linhas.length; r++) {
    const row = linhas[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const rawChapa = row[colChapa];
    const matricula = normalizarMatricula(rawChapa);

    const rawNome = row[colNome];
    const nomeBruto = (rawNome !== undefined && rawNome !== null) ? String(rawNome).trim() : '';

    const rawFuncao = row[colFuncao];
    const funcaoOriginal = (rawFuncao !== undefined && rawFuncao !== null && String(rawFuncao).trim() !== '')
      ? String(rawFuncao).trim()
      : 'Mecânico';

    const rawGrupo = colGrupo !== -1 ? row[colGrupo] : '';
    const grupoTexto = (rawGrupo !== undefined && rawGrupo !== null) ? String(rawGrupo).trim() : '';

    const rawSecao = colSecao !== -1 ? row[colSecao] : '';
    const secao = (rawSecao !== undefined && rawSecao !== null) ? String(rawSecao).trim() : '';

    if (!nomeBruto && !matricula) {
      continue;
    }

    if (!matricula || !nomeBruto) {
      ignorados++;
      if (!matricula && nomeBruto) {
        erros.push(`Linha ${r + 1}: Nome "${nomeBruto}" sem CHAPA/MATRICULA preenchida.`);
      } else if (matricula && !nomeBruto) {
        erros.push(`Linha ${r + 1}: CHAPA ${matricula} sem NOME preenchido.`);
      }
      continue;
    }

    const nomeFormatado = formatarNomeSobrenome(nomeBruto);
    const grupo: GrupoTecnico = grupoTexto
      ? normalizarGrupoTecnico(grupoTexto, funcaoOriginal)
      : classificarGrupoFuncao(funcaoOriginal);

    // Se a matrícula já apareceu antes na própria planilha, atualiza o registro sem duplicar contagem
    if (tecnicosMapPorMatricula.has(matricula)) {
      const anterior = tecnicosMapPorMatricula.get(matricula)!;
      const grupoAnterior = normalizarGrupoTecnico(anterior.grupo || '', anterior.funcao);
      porGrupo[grupoAnterior] = Math.max(0, (porGrupo[grupoAnterior] || 1) - 1);
      porGrupo[grupo] = (porGrupo[grupo] || 0) + 1;

      tecnicosMapPorMatricula.set(matricula, {
        ...anterior,
        nome: nomeFormatado,
        funcao: funcaoOriginal,
        grupo,
        matricula,
        secao: secao || anterior.secao || '',
        status: 'ativo',
        atualizadoEm: new Date().toISOString()
      });
      continue;
    }

    totalLido++;
    porGrupo[grupo] = (porGrupo[grupo] || 0) + 1;

    const existente = existentesPorMatricula.get(matricula);

    if (existente) {
      atualizados++;
      tecnicosMapPorMatricula.set(matricula, {
        ...existente,
        nome: nomeFormatado,
        funcao: funcaoOriginal,
        grupo,
        matricula,
        secao: secao || existente.secao || '',
        status: 'ativo',
        atualizadoEm: new Date().toISOString()
      });
    } else {
      novos++;
      tecnicosMapPorMatricula.set(matricula, {
        id: `tec-${matricula}`,
        nome: nomeFormatado,
        funcao: funcaoOriginal,
        grupo,
        matricula,
        secao,
        status: 'ativo',
        createdAt: new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      });
    }
  }

  return {
    totalLido,
    novos,
    atualizados,
    ignorados,
    porGrupo,
    tecnicosImportados: Array.from(tecnicosMapPorMatricula.values()),
    erros
  };
}
