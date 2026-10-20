import * as XLSX from 'xlsx';
import { Tecnico, GrupoTecnico } from '../types';
import { classificarGrupoFuncao, formatarNomeSobrenome, removerAcentos } from './uEmDataUtils';

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
 */
export async function processarPlanilhaEfetivo(
  arquivo: File,
  tecnicosExistentes: Tecnico[]
): Promise<ResumoImportacao> {
  const buffer = await arquivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', raw: true });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('A planilha selecionada não possui abas ou está vazia.');
  }

  const primeiraAbaNome = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[primeiraAbaNome];
  const linhas = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

  if (!linhas || linhas.length === 0) {
    throw new Error('Nenhuma linha encontrada na primeira aba da planilha.');
  }

  // 1. Localiza a linha do cabeçalho que contém CHAPA, NOME, FUNÇÃO e DESCRIÇÃO SEÇÃO
  let headerIndex = -1;
  let colChapa = -1;
  let colNome = -1;
  let colFuncao = -1;
  let colSecao = -1;

  for (let i = 0; i < Math.min(linhas.length, 50); i++) {
    const row = linhas[i];
    if (!Array.isArray(row)) continue;

    let foundChapa = -1;
    let foundNome = -1;
    let foundFuncao = -1;
    let foundSecao = -1;

    for (let c = 0; c < row.length; c++) {
      const celula = removerAcentos(String(row[c] || ''));
      if (celula === 'CHAPA' || celula === 'MATRICULA' || celula.includes('CHAPA') || celula.includes('MATRICULA')) {
        foundChapa = c;
      } else if (celula === 'NOME' || celula.includes('NOME COMPLETO') || celula.includes('NOME')) {
        foundNome = c;
      } else if (celula.includes('FUNCAO') || celula.includes('CARGO')) {
        foundFuncao = c;
      } else if (celula.includes('SECAO') || celula.includes('DESCRICAO SECAO') || celula.includes('TURMA') || celula.includes('SETOR')) {
        foundSecao = c;
      }
    }

    // Se encontrou as colunas essenciais
    if (foundChapa !== -1 && foundNome !== -1 && foundFuncao !== -1) {
      headerIndex = i;
      colChapa = foundChapa;
      colNome = foundNome;
      colFuncao = foundFuncao;
      colSecao = foundSecao;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Cabeçalho não encontrado. A planilha deve conter as colunas: CHAPA | NOME | FUNÇÃO | DESCRIÇÃO SEÇÃO.');
  }

  const existentesPorMatricula = new Map<string, Tecnico>();
  tecnicosExistentes.forEach(t => {
    if (t.matricula) {
      existentesPorMatricula.set(t.matricula.trim(), t);
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
    'LAVADOR / PINTOR': 0,
    'OPERADOR/MOTORISTA': 0,
    'SUPERVISÃO': 0,
    'ADMINISTRATIVO': 0,
    'OUTROS': 0
  };

  const tecnicosImportados: Tecnico[] = [];
  let totalLido = 0;
  let novos = 0;
  let atualizados = 0;
  let ignorados = 0;
  const erros: string[] = [];

  // 2. Lê os dados a partir da linha seguinte ao cabeçalho
  for (let r = headerIndex + 1; r < linhas.length; r++) {
    const row = linhas[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Matrícula como texto preservando zeros à esquerda
    const rawChapa = row[colChapa];
    const matricula = (rawChapa !== undefined && rawChapa !== null) ? String(rawChapa).trim() : '';

    const rawNome = row[colNome];
    const nomeBruto = (rawNome !== undefined && rawNome !== null) ? String(rawNome).trim() : '';

    const rawFuncao = row[colFuncao];
    const funcaoOriginal = (rawFuncao !== undefined && rawFuncao !== null) ? String(rawFuncao).trim() : 'Mecânico';

    const rawSecao = colSecao !== -1 ? row[colSecao] : '';
    const secao = (rawSecao !== undefined && rawSecao !== null) ? String(rawSecao).trim() : '';

    // Linha vazia ou sem identificação básica
    if (!nomeBruto && !matricula) {
      ignorados++;
      continue;
    }

    if (!nomeBruto) {
      erros.push(`Linha ${r + 1}: Chapa ${matricula} sem nome preenchido.`);
      ignorados++;
      continue;
    }

    totalLido++;

    const nomeFormatado = formatarNomeSobrenome(nomeBruto);
    const grupo = classificarGrupoFuncao(funcaoOriginal);
    porGrupo[grupo] = (porGrupo[grupo] || 0) + 1;

    // UPSERT por matrícula (se existe, atualiza; se não existe, cria)
    const existente = matricula ? existentesPorMatricula.get(matricula) : undefined;

    if (existente) {
      atualizados++;
      tecnicosImportados.push({
        ...existente,
        nome: nomeFormatado,
        funcao: funcaoOriginal,
        grupo,
        matricula: matricula || existente.matricula || '',
        secao: secao || existente.secao || '',
        status: existente.status || 'ativo',
        atualizadoEm: new Date().toISOString()
      });
    } else {
      novos++;
      tecnicosImportados.push({
        id: `tec-${Date.now()}-${r}-${Math.floor(Math.random() * 1000)}`,
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
    tecnicosImportados,
    erros
  };
}
