import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Truck,
  Plus,
  Search,
  Edit3,
  Power,
  Upload,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { Equipamento, Parada, Report } from '../types';
import { derivarFrenteDaTag, normalizarTag, removerAcentos } from '../lib/uEmDataUtils';
import {
  criarEquipamentoPadrao,
  derivarTipoEquipamento,
  ORDEM_TIPOS_EQUIPAMENTO
} from '../data/equipamentosIniciais';

interface EquipamentosAdminTabProps {
  equipamentos: Equipamento[];
  reports: Report[];
  paradas: Parada[];
  onSaveEquipamento: (eq: Equipamento) => void;
  onImportEquipamentos: (novosOuAtualizados: Equipamento[]) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function EquipamentosAdminTab({
  equipamentos,
  reports,
  paradas,
  onSaveEquipamento,
  onImportEquipamentos,
  showToast
}: EquipamentosAdminTabProps) {
  const [busca, setBusca] = useState('');
  const [filtroFrente, setFiltroFrente] = useState<string>('TODAS');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');

  // Modal de Adicionar / Editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoEq, setEditandoEq] = useState<Equipamento | null>(null);
  const [formTag, setFormTag] = useState('');
  const [formModelo, setFormModelo] = useState('');
  const [formTipo, setFormTipo] = useState('');
  const [formFrente, setFormFrente] = useState<'EH' | 'CR' | 'PF' | 'INFRA'>('INFRA');
  const [formAtivo, setFormAtivo] = useState(true);

  // Importação de planilha (TAG e MODELO)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImportacao, setPreviewImportacao] = useState<{
    arquivoNome: string;
    itens: Equipamento[];
    novos: number;
    atualizados: number;
  } | null>(null);

  const mapaExistentes = useMemo(() => {
    const m = new Map<string, Equipamento>();
    equipamentos.forEach(eq => m.set(normalizarTag(eq.tag), eq));
    return m;
  }, [equipamentos]);

  // Sugestões para cadastrar: TAGs que já apareceram em relatórios/paradas antigas e ainda não estão na lista
  const sugestoesParaCadastrar = useMemo(() => {
    const encontradas = new Map<string, { tag: string; ocorrencias: number; origem: string }>();

    const registrarTag = (rawTag: string | undefined, origem: string) => {
      if (!rawTag) return;
      const t = normalizarTag(rawTag);
      if (!t || t.length < 3 || !/^[A-Z]{2,4}-\d{2,5}$/.test(t)) return;
      if (mapaExistentes.has(t)) return;
      const atual = encontradas.get(t);
      if (atual) {
        atual.ocorrencias += 1;
      } else {
        encontradas.set(t, { tag: t, ocorrencias: 1, origem });
      }
    };

    paradas.forEach(p => registrarTag(p.tag, 'Parada'));
    reports.forEach(r => {
      (r.atendimentos || []).forEach(at => registrarTag(at.equipamento, 'Relatório'));
      (r.pendencias || []).forEach(pd => registrarTag(pd.equipamento, 'Pendência'));
    });

    return Array.from(encontradas.values()).sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  }, [paradas, reports, mapaExistentes]);

  const equipamentosFiltrados = useMemo(() => {
    const bNorm = removerAcentos(busca.trim());
    return equipamentos
      .filter(eq => {
        if (filtroFrente !== 'TODAS' && eq.frente !== filtroFrente) return false;
        if (filtroStatus === 'ATIVOS' && !eq.ativo) return false;
        if (filtroStatus === 'INATIVOS' && eq.ativo) return false;
        if (!bNorm) return true;
        const texto = removerAcentos(`${eq.tag} ${eq.modelo} ${eq.tipo} ${eq.frente}`);
        return texto.includes(bNorm);
      })
      .sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  }, [equipamentos, busca, filtroFrente, filtroStatus]);

  const abrirNovo = (tagSugerida = '') => {
    const tagFmt = tagSugerida ? normalizarTag(tagSugerida) : '';
    setEditandoEq(null);
    setFormTag(tagFmt);
    setFormModelo('');
    setFormTipo(tagFmt ? derivarTipoEquipamento(tagFmt) : 'Escavadeiras');
    setFormFrente(tagFmt ? derivarFrenteDaTag(tagFmt) : 'EH');
    setFormAtivo(true);
    setModalAberto(true);
  };

  const abrirEdicao = (eq: Equipamento) => {
    setEditandoEq(eq);
    setFormTag(eq.tag);
    setFormModelo(eq.modelo);
    setFormTipo(eq.tipo || derivarTipoEquipamento(eq.tag));
    setFormFrente(eq.frente || derivarFrenteDaTag(eq.tag));
    setFormAtivo(eq.ativo !== false);
    setModalAberto(true);
  };

  const handleSalvarForm = (e: React.FormEvent) => {
    e.preventDefault();
    const tagNorm = normalizarTag(formTag);
    if (!tagNorm) return;

    const eqSalvo: Equipamento = {
      id: editandoEq?.id || `eq-${tagNorm.toLowerCase()}`,
      tag: tagNorm,
      modelo: formModelo.trim() || 'Modelo padrão',
      tipo: formTipo.trim() || derivarTipoEquipamento(tagNorm),
      frente: formFrente || derivarFrenteDaTag(tagNorm),
      ativo: formAtivo,
      atualizadoEm: new Date().toISOString()
    };

    onSaveEquipamento(eqSalvo);
    setModalAberto(false);
    showToast?.(`Equipamento ${tagNorm} salvo com sucesso!`, 'success');
  };

  const handleToggleAtivo = (eq: Equipamento) => {
    const atualizado: Equipamento = {
      ...eq,
      ativo: !eq.ativo,
      atualizadoEm: new Date().toISOString()
    };
    onSaveEquipamento(atualizado);
    showToast?.(
      `Equipamento ${eq.tag} ${atualizado.ativo ? 'ativado' : 'desativado'}.`,
      'info'
    );
  };

  const handleArquivoPlanilha = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let linhas: any[][] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const txt = await file.text();
        linhas = txt
          .replace(/^\uFEFF/, '')
          .split(/\r?\n/)
          .filter(l => l.trim().length > 0)
          .map(l => {
            const sep = l.includes(';') ? ';' : ',';
            return l.split(sep).map(c => c.replace(/^"|"$/g, '').trim());
          });
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        linhas = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
      }

      if (!linhas.length) {
        showToast?.('A planilha selecionada está vazia.', 'error');
        return;
      }

      // Localiza cabeçalho com TAG e MODELO (ou considera linha 0 se já forem dados)
      let headerIdx = -1;
      let colTag = 0;
      let colModelo = 1;

      for (let i = 0; i < Math.min(linhas.length, 20); i++) {
        const row = linhas[i];
        if (!Array.isArray(row)) continue;
        let fTag = -1;
        let fModelo = -1;
        row.forEach((cell, cIdx) => {
          const norm = removerAcentos(String(cell || ''));
          if (norm === 'TAG' || norm === 'PREFIXO' || norm === 'EQUIPAMENTO') fTag = cIdx;
          if (norm === 'MODELO' || norm === 'DESCRICAO' || norm === 'FROTA') fModelo = cIdx;
        });
        if (fTag !== -1 && fModelo !== -1) {
          headerIdx = i;
          colTag = fTag;
          colModelo = fModelo;
          break;
        }
      }

      const mapImport = new Map<string, Equipamento>();
      let novos = 0;
      let atualizados = 0;

      for (let r = headerIdx + 1; r < linhas.length; r++) {
        const row = linhas[r];
        if (!Array.isArray(row)) continue;
        const rawTag = String(row[colTag] || '').trim();
        const rawModelo = String(row[colModelo] || '').trim();
        if (!rawTag) continue;
        const tagFmt = normalizarTag(rawTag);
        if (!tagFmt || tagFmt === 'TAG') continue;

        const jaExiste = mapaExistentes.get(tagFmt);
        const eqObj = criarEquipamentoPadrao(tagFmt, rawModelo || jaExiste?.modelo || 'Modelo padrão');
        if (jaExiste && !mapImport.has(tagFmt)) atualizados++;
        else if (!jaExiste && !mapImport.has(tagFmt)) novos++;
        mapImport.set(tagFmt, {
          ...jaExiste,
          ...eqObj,
          id: jaExiste?.id || eqObj.id,
          ativo: true
        });
      }

      const lista = Array.from(mapImport.values());
      if (lista.length === 0) {
        showToast?.('Nenhum equipamento válido encontrado. Verifique as colunas TAG e MODELO.', 'error');
        return;
      }

      setPreviewImportacao({
        arquivoNome: file.name,
        itens: lista,
        novos,
        atualizados
      });
    } catch (err: any) {
      showToast?.(err?.message || 'Erro ao ler planilha de equipamentos.', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmarImportacao = () => {
    if (!previewImportacao) return;
    onImportEquipamentos(previewImportacao.itens);
    showToast?.(`${previewImportacao.itens.length} equipamentos importados com sucesso!`, 'success');
    setPreviewImportacao(null);
  };

  const totalAtivos = equipamentos.filter(e => e.ativo !== false).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Aba */}
      <div className="bg-[var(--um-branco)] p-5 rounded-2xl border border-[var(--um-cinza-claro)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--um-verde-principal)] text-white">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--um-cinza-escuro)] uppercase tracking-wide">
              Cadastro de Equipamentos ({totalAtivos} ativos de {equipamentos.length})
            </h2>
            <p className="text-xs text-[var(--um-cinza-texto)]">
              Base sincronizada de TAGs, modelos, tipos e frentes operacionais para abertura de paradas e relatórios.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleArquivoPlanilha}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-[var(--um-fundo)] hover:bg-[var(--um-cinza-claro)]/60 text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-[var(--um-verde-principal)]" />
            Importar Planilha (TAG / MODELO)
          </button>

          <button
            type="button"
            onClick={() => abrirNovo()}
            className="px-4 py-2.5 bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Equipamento
          </button>
        </div>
      </div>

      {/* Pré-visualização de Importação */}
      {previewImportacao && (
        <div className="bg-emerald-50 border-2 border-emerald-600 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-emerald-950 uppercase">
                Pré-visualização da Importação: {previewImportacao.arquivoNome}
              </h3>
              <p className="text-xs text-emerald-800">
                Total lido: <strong>{previewImportacao.itens.length}</strong> equipamentos (
                <strong>{previewImportacao.novos}</strong> novos,{' '}
                <strong>{previewImportacao.atualizados}</strong> atualizados)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewImportacao(null)}
                className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarImportacao}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sugestões para cadastrar (TAGs encontradas em relatórios/paradas antigas) */}
      {sugestoesParaCadastrar.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Sugestões para cadastrar ({sugestoesParaCadastrar.length} TAGs encontradas em relatórios/paradas antigas)
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {sugestoesParaCadastrar.map(sug => (
              <div
                key={sug.tag}
                className="inline-flex items-center gap-2 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs shadow-2xs"
              >
                <span className="font-bold text-slate-800">{sug.tag}</span>
                <span className="text-[10px] text-slate-500">({sug.origem})</span>
                <button
                  type="button"
                  onClick={() => abrirNovo(sug.tag)}
                  className="px-2 py-0.5 bg-[var(--um-verde-principal)] text-white text-[10px] font-bold uppercase rounded-md hover:opacity-90 cursor-pointer"
                >
                  + Cadastrar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-[var(--um-branco)] p-4 rounded-2xl border border-[var(--um-cinza-claro)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--um-cinza-texto)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por TAG, modelo ou tipo (ex.: EH-4050, Hitachi, Caminhões)..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-xl text-sm text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['TODAS', 'EH', 'CR', 'PF', 'INFRA'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltroFrente(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer border transition-colors ${
                filtroFrente === f
                  ? 'bg-[var(--um-verde-principal)] text-white border-[var(--um-verde-principal)]'
                  : 'bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] border-[var(--um-cinza-claro)]'
              }`}
            >
              {f === 'TODAS' ? 'Todas Frentes' : f}
            </button>
          ))}

          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-[var(--um-cinza-escuro)]"
          >
            <option value="TODOS">Todos Status</option>
            <option value="ATIVOS">Somente Ativos</option>
            <option value="INATIVOS">Somente Inativos</option>
          </select>
        </div>
      </div>

      {/* Tabela de Equipamentos */}
      <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--um-fundo)] border-b border-[var(--um-cinza-claro)] text-[11px] font-bold uppercase text-[var(--um-cinza-texto)]">
                <th className="py-3 px-4">TAG</th>
                <th className="py-3 px-4">Modelo</th>
                <th className="py-3 px-4">Tipo / Grupo</th>
                <th className="py-3 px-4">Frente</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--um-cinza-claro)]/60 text-sm">
              {equipamentosFiltrados.map(eq => (
                <tr
                  key={eq.id || eq.tag}
                  className={`hover:bg-[var(--um-fundo)]/50 transition-colors ${
                    !eq.ativo ? 'opacity-55' : ''
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-[var(--um-cinza-escuro)]">{eq.tag}</td>
                  <td className="py-3 px-4 text-[var(--um-cinza-texto)]">{eq.modelo}</td>
                  <td className="py-3 px-4 text-xs font-medium text-[var(--um-cinza-texto)]">{eq.tipo}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--um-verde-principal)]/10 text-[var(--um-verde-principal)]">
                      {eq.frente}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        eq.ativo !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {eq.ativo !== false ? 'ATIVO' : 'INATIVO'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-1.5">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(eq)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--um-fundo)] hover:bg-[var(--um-cinza-claro)] text-xs font-semibold text-[var(--um-cinza-escuro)] cursor-pointer"
                      title="Editar equipamento"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAtivo(eq)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        eq.ativo !== false
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                      }`}
                      title={eq.ativo !== false ? 'Desativar equipamento' : 'Ativar equipamento'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {eq.ativo !== false ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {equipamentosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-[var(--um-cinza-texto)]">
                    Nenhum equipamento encontrado para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Adicionar / Editar Equipamento */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#004d2c]">
                {editandoEq ? `Editar Equipamento ${editandoEq.tag}` : '+ Novo Equipamento'}
              </h3>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarForm} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  TAG do Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={formTag}
                  onChange={e => {
                    const v = e.target.value.toUpperCase();
                    setFormTag(v);
                    const norm = normalizarTag(v);
                    setFormTipo(derivarTipoEquipamento(norm));
                    setFormFrente(derivarFrenteDaTag(norm));
                  }}
                  onBlur={() => setFormTag(normalizarTag(formTag))}
                  placeholder="Ex: EH-4050"
                  className="w-full h-11 px-3.5 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:border-[#004d2c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  value={formModelo}
                  onChange={e => setFormModelo(e.target.value)}
                  placeholder="Ex: Hitachi EX1200"
                  className="w-full h-11 px-3.5 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-[#004d2c] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Tipo / Grupo
                  </label>
                  <select
                    value={formTipo}
                    onChange={e => setFormTipo(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    {ORDEM_TIPOS_EQUIPAMENTO.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                    Frente Operacional
                  </label>
                  <select
                    value={formFrente}
                    onChange={e => setFormFrente(e.target.value as any)}
                    className="w-full h-11 px-3 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                  >
                    <option value="EH">EH</option>
                    <option value="CR">CR</option>
                    <option value="PF">PF</option>
                    <option value="INFRA">INFRA</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formAtivo}
                  onChange={e => setFormAtivo(e.target.checked)}
                  className="w-4 h-4 accent-[#004d2c]"
                />
                Equipamento Ativo (visível na lista de abertura de parada)
              </label>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#004d2c] hover:opacity-95 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Salvar Equipamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
