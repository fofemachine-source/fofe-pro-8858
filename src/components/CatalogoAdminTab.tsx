import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Search, Upload, Download, Check, X, RotateCcw, ChevronDown, ChevronRight,
  Layers, FolderTree, AlertTriangle, CheckCircle2, FileSpreadsheet
} from 'lucide-react';
import {
  listarPerfis,
  getCatalogo,
  buscarNoCatalogo,
  DESCRICAO_PERFIS,
  lerPlanilhaCatalogoXlsx,
  ResultadoImportacaoCatalogo,
  carregarCatalogoCustomizadoLocal,
  definirCatalogoCustomizado,
  CatalogoCustomizadoSalvo
} from '../data/catalogoFalhas';
import { User } from '../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CatalogoAdminTabProps {
  currentUser: User;
  isOffline?: boolean;
  onCatalogoUpdated?: () => void;
}

export const CatalogoAdminTab: React.FC<CatalogoAdminTabProps> = ({
  currentUser,
  isOffline = false,
  onCatalogoUpdated
}) => {
  const [versaoTick, setVersaoTick] = useState(0);
  const perfis = useMemo(() => listarPerfis(), [versaoTick]);
  const [perfilAtivo, setPerfilAtivo] = useState<string>(() => listarPerfis()[0] || 'EH');
  const [busca, setBusca] = useState('');
  const [sistemasAbertos, setSistemasAbertos] = useState<Record<string, boolean>>({});
  const [previewImport, setPreviewImport] = useState<{
    resultado: ResultadoImportacaoCatalogo;
    nomeArquivo: string;
  } | null>(null);
  const [erroImport, setErroImport] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const infoCustom = useMemo(() => carregarCatalogoCustomizadoLocal(), [versaoTick]);

  const sistemasPerfil = useMemo(() => {
    return getCatalogo(perfilAtivo);
  }, [perfilAtivo, versaoTick]);

  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return [];
    return buscarNoCatalogo(perfilAtivo, busca);
  }, [perfilAtivo, busca, versaoTick]);

  const statsPerfil = useMemo(() => {
    let totalComps = 0;
    let totalSints = 0;
    sistemasPerfil.forEach((s) => {
      totalComps += s.componentes.length;
      s.componentes.forEach((c) => {
        totalSints += c.sintomas.length;
      });
    });
    return {
      sistemas: sistemasPerfil.length,
      componentes: totalComps,
      sintomas: totalSints
    };
  }, [sistemasPerfil]);

  const toggleSistema = (codSis: string) => {
    setSistemasAbertos((prev) => ({
      ...prev,
      [codSis]: !prev[codSis]
    }));
  };

  const expandirTodos = () => {
    const todos: Record<string, boolean> = {};
    sistemasPerfil.forEach((s) => {
      todos[s.codigo] = true;
    });
    setSistemasAbertos(todos);
  };

  const recolherTodos = () => {
    setSistemasAbertos({});
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroImport(null);
    setMensagemSucesso(null);

    try {
      const buffer = await file.arrayBuffer();
      const resultado = lerPlanilhaCatalogoXlsx(buffer);
      if (resultado.perfisLidos.length === 0) {
        setErroImport(
          'Nenhum perfil válido encontrado na planilha. Certifique-se de que a planilha possui as colunas PERFIL_CATALOGO, COD_SISTEMA, SISTEMA, COD_COMPONENTE, COMPONENTE, COD_SINTOMA, SINTOMA ou abas nomeadas por perfil (CRMEC, CREL, EH, PF, etc.).'
        );
      } else {
        setPreviewImport({
          resultado,
          nomeArquivo: file.name
        });
      }
    } catch (err: any) {
      console.error('Erro ao ler planilha de catálogo:', err);
      setErroImport(`Erro ao processar arquivo Excel: ${err?.message || 'Formato inválido'}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmarImportacao = async () => {
    if (!previewImport) return;
    setSalvando(true);
    setErroImport(null);

    const payload: CatalogoCustomizadoSalvo = {
      catalogo: previewImport.resultado.catalogo,
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: currentUser.name || currentUser.username || 'Admin',
      nomeArquivo: previewImport.nomeArquivo
    };

    try {
      definirCatalogoCustomizado(payload);
      if (!isOffline) {
        await setDoc(doc(db, 'configuracoes', 'catalogo_falhas'), {
          catalogoJson: JSON.stringify(payload.catalogo),
          atualizadoEm: payload.atualizadoEm,
          atualizadoPor: payload.atualizadoPor,
          nomeArquivo: payload.nomeArquivo || ''
        });
      }
      setVersaoTick((t) => t + 1);
      setPreviewImport(null);
      setMensagemSucesso(
        `Catálogo atualizado com sucesso (${previewImport.resultado.perfisLidos.length} perfil(is) processado(s))!`
      );
      if (onCatalogoUpdated) onCatalogoUpdated();
    } catch (err: any) {
      console.error('Erro ao salvar catálogo no Firestore:', err);
      setMensagemSucesso(
        'Catálogo salvo localmente neste dispositivo (sincronização com servidor pendente).'
      );
      setVersaoTick((t) => t + 1);
      setPreviewImport(null);
    } finally {
      setSalvando(false);
    }
  };

  const handleRestaurarCatalogoPadrao = async () => {
    if (!window.confirm('Deseja restaurar o catálogo padrão original de fábrica?')) return;
    definirCatalogoCustomizado(null);
    if (!isOffline) {
      try {
        await deleteDoc(doc(db, 'configuracoes', 'catalogo_falhas'));
      } catch (e) {
        console.warn('Aviso ao remover doc de catálogo customizado:', e);
      }
    }
    setVersaoTick((t) => t + 1);
    setMensagemSucesso('Catálogo padrão original restaurado com sucesso.');
    if (onCatalogoUpdated) onCatalogoUpdated();
  };

  const handleExportarPlanilhaCatalogo = () => {
    const linhas: Record<string, string>[] = [];
    listarPerfis().forEach((perfil) => {
      const sistemas = getCatalogo(perfil);
      sistemas.forEach((sis) => {
        sis.componentes.forEach((comp) => {
          comp.sintomas.forEach((sint) => {
            linhas.push({
              PERFIL_CATALOGO: perfil,
              COD_SISTEMA: sis.codigo,
              SISTEMA: sis.nome,
              COD_COMPONENTE: comp.codigo,
              COMPONENTE: comp.nome,
              COD_SINTOMA: sint.codigo,
              SINTOMA: sint.nome,
              CODIGO_COMPLETO: `${perfil}/${sis.codigo}/${comp.codigo}/${sint.codigo}`
            });
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CATALOGO_FALHAS');
    XLSX.writeFile(wb, `catalogo_falhas_um_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* CABEÇALHO E AÇÕES DE IMPORTAÇÃO */}
      <div className="bg-white rounded-2xl border border-[#DFDFDF] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DFDFDF]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#19502F] text-white text-[11px] font-medium uppercase tracking-wider">
                RAIZ · PERFIS DE CATÁLOGO
              </span>
              {infoCustom ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-medium uppercase">
                  Catálogo Customizado Ativo ({new Date(infoCustom.atualizadoEm).toLocaleDateString('pt-BR')} por {infoCustom.atualizadoPor})
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-[#E8F5E9] text-[#19502F] border border-[#19502F]/20 text-[11px] font-medium uppercase">
                  Catálogo Padrão Oficial Ativo
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-light uppercase tracking-wide text-[#19502F] mt-2">
              CATÁLOGO DE FALHAS POR PERFIL DE EQUIPAMENTO
            </h2>
            <p className="text-xs text-[#575756] mt-0.5">
              Visualize a árvore completa (Sistema › Componente › Sintoma) por perfil ou importe uma planilha atualizada (.xlsx).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#19502F] hover:bg-[#3A7E52] text-white text-xs font-medium uppercase tracking-wider transition cursor-pointer shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>IMPORTAR PLANILHA DE CATÁLOGO (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handleExportarPlanilhaCatalogo}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#F4F5F4] hover:bg-[#DFDFDF] text-[#1D1D1B] border border-[#DFDFDF] text-xs font-medium uppercase tracking-wider transition cursor-pointer"
              title="Baixar planilha .xlsx com todos os perfis, sistemas, componentes e sintomas"
            >
              <Download className="w-4 h-4 text-[#19502F]" />
              <span>Exportar (.xlsx)</span>
            </button>

            {infoCustom && (
              <button
                type="button"
                onClick={handleRestaurarCatalogoPadrao}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-medium uppercase tracking-wider transition cursor-pointer"
                title="Voltar para o catálogo estático padrão"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Padrão</span>
              </button>
            )}
          </div>
        </div>

        {erroImport && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{erroImport}</div>
            <button type="button" onClick={() => setErroImport(null)} className="text-rose-600 hover:text-rose-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {mensagemSucesso && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
            <button type="button" onClick={() => setMensagemSucesso(null)} className="text-emerald-700 hover:text-emerald-950">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MODAL / CARD DE PRÉVIA DA IMPORTAÇÃO */}
        {previewImport && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-400 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-800" />
                <div>
                  <h3 className="text-sm font-medium uppercase text-amber-950">
                    Prévia da Importação: {previewImport.nomeArquivo}
                  </h3>
                  <p className="text-xs text-amber-800">
                    Perfis identificados na planilha:{' '}
                    <strong>{previewImport.resultado.perfisLidos.join(', ')}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => setPreviewImport(null)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-xs font-medium uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={handleConfirmarImportacao}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#19502F] hover:bg-[#3A7E52] text-white text-xs font-medium uppercase cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{salvando ? 'Salvando...' : 'Confirmar e Salvar Catálogo'}</span>
                </button>
              </div>
            </div>

            {previewImport.resultado.diffs.length === 0 ? (
              <div className="text-xs text-amber-900 py-2">
                Nenhuma diferença estrutural (novos códigos ou remoções) em relação ao catálogo ativo; os nomes de sistemas, componentes e sintomas serão atualizados conforme a planilha.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-medium">
                    +{previewImport.resultado.diffs.filter(d => d.acao === 'NOVO').length} itens novos
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-medium">
                    -{previewImport.resultado.diffs.filter(d => d.acao === 'REMOVIDO').length} itens removidos
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto bg-white rounded-xl border border-amber-200 divide-y divide-gray-100 text-xs">
                  {previewImport.resultado.diffs.slice(0, 120).map((d, i) => (
                    <div key={`${d.chave}-${i}`} className="px-3 py-2 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-medium text-[#19502F] mr-2">[{d.perfil}]</span>
                        <span className="text-[#1D1D1B]">{d.descricao}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                          d.acao === 'NOVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {d.acao} ({d.tipo})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SELETOR DE PERFIL DE CATÁLOGO */}
        <div className="mt-4 pt-3">
          <span className="block text-[11px] uppercase tracking-wider text-[#575756] mb-2">
            Selecione o Perfil de Catálogo ({perfis.length} perfis disponíveis):
          </span>
          <div className="flex flex-wrap gap-2">
            {perfis.map((p) => {
              const ativo = p === perfilAtivo;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPerfilAtivo(p);
                    setSistemasAbertos({});
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium uppercase tracking-wider transition cursor-pointer border ${
                    ativo
                      ? 'bg-[#19502F] text-white border-[#19502F] shadow-xs'
                      : 'bg-[#F4F5F4] text-[#1D1D1B] border-[#DFDFDF] hover:bg-[#DFDFDF]/60'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ÁRVORE DO PERFIL SELECIONADO E BUSCA */}
      <div className="bg-white rounded-2xl border border-[#DFDFDF] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#DFDFDF]">
          <div>
            <h3 className="text-base font-medium uppercase text-[#19502F] flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              <span>{DESCRICAO_PERFIS[perfilAtivo] || `Perfil ${perfilAtivo}`}</span>
            </h3>
            <p className="text-xs text-[#575756] mt-0.5">
              {statsPerfil.sistemas} Sistemas · {statsPerfil.componentes} Componentes · {statsPerfil.sintomas} Sintomas cadastrados neste perfil
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] sm:min-w-[300px]">
              <Search className="w-4 h-4 text-[#575756] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={`Buscar em ${perfilAtivo} (ex.: vazamento, 87, bomba)...`}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F4F5F4] border border-[#DFDFDF] focus:bg-white focus:border-[#19502F] text-xs text-[#1D1D1B] focus:outline-none"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#575756] hover:text-[#1D1D1B]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {!busca.trim() && (
              <>
                <button
                  type="button"
                  onClick={expandirTodos}
                  className="px-3 py-2 rounded-xl bg-[#F4F5F4] hover:bg-[#DFDFDF] text-[#1D1D1B] border border-[#DFDFDF] text-[11px] font-medium uppercase cursor-pointer"
                >
                  Expandir Tudo
                </button>
                <button
                  type="button"
                  onClick={recolherTodos}
                  className="px-3 py-2 rounded-xl bg-[#F4F5F4] hover:bg-[#DFDFDF] text-[#1D1D1B] border border-[#DFDFDF] text-[11px] font-medium uppercase cursor-pointer"
                >
                  Recolher Tudo
                </button>
              </>
            )}
          </div>
        </div>

        {/* RESULTADOS DE BUSCA OU ÁRVORE COMPLETA */}
        {busca.trim() ? (
          <div className="mt-4">
            <div className="text-xs text-[#575756] mb-3">
              Encontrados <strong>{resultadosBusca.length}</strong> caminhos para &ldquo;{busca}&rdquo; no perfil{' '}
              <strong>{perfilAtivo}</strong>:
            </div>
            {resultadosBusca.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#575756] uppercase bg-[#F4F5F4] rounded-xl">
                Nenhum item encontrado neste perfil.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {resultadosBusca.map((item, idx) => {
                  const codigoCompleto = `${perfilAtivo}/${item.sistema.codigo}/${item.componente.codigo}/${item.sintoma.codigo}`;
                  return (
                    <div
                      key={`${codigoCompleto}-${idx}`}
                      className="p-3 rounded-xl bg-[#F4F5F4] border border-[#DFDFDF] flex items-center justify-between gap-2"
                    >
                      <div className="text-xs text-[#1D1D1B]">
                        <span className="font-medium text-[#19502F]">
                          {item.sistema.codigo} – {item.sistema.nome}
                        </span>
                        <span className="mx-1.5 text-[#575756]">›</span>
                        <span className="font-medium">
                          {item.componente.codigo} – {item.componente.nome}
                        </span>
                        <span className="mx-1.5 text-[#575756]">›</span>
                        <span className="text-[#19502F] font-medium">
                          {item.sintoma.codigo} – {item.sintoma.nome}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#DFDFDF] font-mono text-[11px] text-[#575756] shrink-0">
                        {codigoCompleto}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {sistemasPerfil.map((sis) => {
              const aberto = Boolean(sistemasAbertos[sis.codigo]);
              const qtdSintomasSis = sis.componentes.reduce((acc, c) => acc + c.sintomas.length, 0);
              return (
                <div
                  key={sis.codigo}
                  className="rounded-xl border border-[#DFDFDF] overflow-hidden bg-[#F4F5F4]/50"
                >
                  <button
                    type="button"
                    onClick={() => toggleSistema(sis.codigo)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-[#F4F5F4] transition cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      {aberto ? (
                        <ChevronDown className="w-4 h-4 text-[#19502F]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#575756]" />
                      )}
                      <span className="px-2 py-0.5 rounded bg-[#19502F] text-white font-mono text-xs font-medium">
                        {sis.codigo}
                      </span>
                      <span className="text-sm font-medium text-[#1D1D1B]">{sis.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#575756]">
                      <span>{sis.componentes.length} comp.</span>
                      <span>·</span>
                      <span>{qtdSintomasSis} sint.</span>
                    </div>
                  </button>

                  {aberto && (
                    <div className="p-4 pt-2 border-t border-[#DFDFDF] grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sis.componentes.map((comp) => (
                        <div
                          key={comp.codigo}
                          className="bg-white rounded-xl border border-[#DFDFDF] p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-[#F4F5F4] pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-[#E8F5E9] text-[#19502F] font-mono text-[11px] font-medium">
                                {comp.codigo}
                              </span>
                              <span className="text-xs font-medium text-[#1D1D1B]">{comp.nome}</span>
                            </div>
                            <span className="text-[10px] text-[#575756] uppercase">
                              {comp.sintomas.length} sintoma(s)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {comp.sintomas.map((sint) => (
                              <span
                                key={`${comp.codigo}-${sint.codigo}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F4F5F4] border border-[#DFDFDF] text-[11px] text-[#1D1D1B]"
                                title={`${perfilAtivo}/${sis.codigo}/${comp.codigo}/${sint.codigo}`}
                              >
                                <strong className="font-mono text-[#19502F]">{sint.codigo}</strong>
                                <span>–</span>
                                <span>{sint.nome}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
