import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, CheckCircle2, AlertTriangle, X, Layers, Cpu, Activity, RefreshCw, Sparkles, ChevronRight
} from 'lucide-react';
import {
  FalhaCatalogada,
  getCatalogo,
  listarPerfis,
  buscarNoCatalogo,
  perfilDaTag,
  precisaEscolherPerfilCR,
  normalizarESepararTag,
  DESCRICAO_PERFIS,
  construirFalhaCatalogada,
  formatarFalhaCard
} from '../data/catalogoFalhas';

export interface SeletorCatalogoProps {
  tag: string;
  value?: FalhaCatalogada | null;
  complemento?: string;
  onChange: (falha: FalhaCatalogada | null, textoResumo: string, complemento: string) => void;
  obrigatorio?: boolean;
  isAdmin?: boolean;
  labelTitulo?: string;
  placeholderComplemento?: string;
}

export const SeletorCatalogo: React.FC<SeletorCatalogoProps> = ({
  tag,
  value,
  complemento: complementoProp = '',
  onChange,
  obrigatorio = false,
  isAdmin = false,
  labelTitulo = 'CATÁLOGO DE FALHAS (SISTEMA › COMPONENTE › SINTOMA)',
  placeholderComplemento = 'Detalhe adicional / complemento em texto livre (ex.: mangueira do cilindro direito, código de erro no painel...)'
}) => {
  const { tagNormalizada, prefixo } = useMemo(() => normalizarESepararTag(tag), [tag]);
  const perfilAuto = useMemo(() => perfilDaTag(tagNormalizada), [tagNormalizada]);
  const crPrecisaEscolha = useMemo(() => precisaEscolherPerfilCR(tagNormalizada), [tagNormalizada]);

  const [escolhaCR, setEscolhaCR] = useState<'CRMEC' | 'CREL' | null>(null);
  const [perfilManualAdmin, setPerfilManualAdmin] = useState<string | null>(null);
  const [mostrarTrocaPerfilAdmin, setMostrarTrocaPerfilAdmin] = useState(false);

  const [codSistema, setCodSistema] = useState<string>(value?.sistema?.codigo || '');
  const [codComponente, setCodComponente] = useState<string>(value?.componente?.codigo || '');
  const [codSintoma, setCodSintoma] = useState<string>(value?.sintoma?.codigo || '');
  const [complemento, setComplemento] = useState<string>(value?.complemento ?? complementoProp ?? '');

  const [buscaRapida, setBuscaRapida] = useState<string>('');
  const [avisoTrocaPerfil, setAvisoTrocaPerfil] = useState<string | null>(null);

  const prevPerfilRef = useRef<string | null>(null);
  const prevPrefixoRef = useRef<string>(prefixo);

  // Sincroniza caso o value externo mude (ex.: abrir modal já preenchido pela Parada)
  useEffect(() => {
    if (value) {
      setCodSistema(value.sistema?.codigo || '');
      setCodComponente(value.componente?.codigo || '');
      setCodSintoma(value.sintoma?.codigo || '');
      if (value.complemento !== undefined) {
        setComplemento(value.complemento);
      }
      if (crPrecisaEscolha && (value.perfil === 'CRMEC' || value.perfil === 'CREL')) {
        setEscolhaCR(value.perfil);
      }
    }
  }, [value?.codigoCompleto]);

  useEffect(() => {
    if (!value && complementoProp !== undefined && complementoProp !== complemento) {
      setComplemento(complementoProp);
    }
  }, [complementoProp]);

  // Se mudar o prefixo da TAG, reseta override manual de CR se não for mais CR
  useEffect(() => {
    if (prevPrefixoRef.current !== prefixo) {
      if (prefixo !== 'CR') {
        setEscolhaCR(null);
      }
      setPerfilManualAdmin(null);
      prevPrefixoRef.current = prefixo;
    }
  }, [prefixo]);

  // Perfil efetivo ativo
  const perfilAtivo: string | null = useMemo(() => {
    if (perfilManualAdmin) return perfilManualAdmin;
    if (perfilAuto) return perfilAuto;
    if (crPrecisaEscolha && escolhaCR) return escolhaCR;
    if (value?.perfil && !tagNormalizada) return value.perfil;
    return null;
  }, [perfilManualAdmin, perfilAuto, crPrecisaEscolha, escolhaCR, value?.perfil, tagNormalizada]);

  // Detecta troca de TAG que altera o perfil de catálogo -> limpa seleção e avisa
  useEffect(() => {
    const anterior = prevPerfilRef.current;
    if (anterior !== null && anterior !== perfilAtivo) {
      const tinhaSelecao = Boolean(codSistema || codComponente || codSintoma);
      if (tinhaSelecao) {
        setCodSistema('');
        setCodComponente('');
        setCodSintoma('');
        setBuscaRapida('');
        setAvisoTrocaPerfil(
          `Perfil da TAG alterado (${anterior} → ${perfilAtivo || 'Sem catálogo'}). A seleção anterior do catálogo foi limpa.`
        );
        onChange(null, complemento.trim(), complemento);
      }
    }
    prevPerfilRef.current = perfilAtivo;
  }, [perfilAtivo]);

  const sistemasDisponiveis = useMemo(() => {
    if (!perfilAtivo) return [];
    return getCatalogo(perfilAtivo);
  }, [perfilAtivo]);

  const sistemaSelecionado = useMemo(
    () => sistemasDisponiveis.find(s => s.codigo === codSistema) || null,
    [sistemasDisponiveis, codSistema]
  );

  const componentesDisponiveis = useMemo(
    () => sistemaSelecionado?.componentes || [],
    [sistemaSelecionado]
  );

  const componenteSelecionado = useMemo(
    () => componentesDisponiveis.find(c => c.codigo === codComponente) || null,
    [componentesDisponiveis, codComponente]
  );

  const sintomasDisponiveis = useMemo(
    () => componenteSelecionado?.sintomas || [],
    [componenteSelecionado]
  );

  const sintomaSelecionado = useMemo(
    () => sintomasDisponiveis.find(s => s.codigo === codSintoma) || null,
    [sintomasDisponiveis, codSintoma]
  );

  const resultadosBuscaRapida = useMemo(() => {
    if (!perfilAtivo || !buscaRapida.trim()) return [];
    return buscarNoCatalogo(perfilAtivo, buscaRapida).slice(0, 25);
  }, [perfilAtivo, buscaRapida]);

  const emitirAlteracao = (
    novoSisCod: string,
    novoCompCod: string,
    novoSintCod: string,
    novoComplemento: string,
    perfilRef: string | null = perfilAtivo
  ) => {
    if (!perfilRef) {
      onChange(null, novoComplemento.trim(), novoComplemento);
      return;
    }
    const cat = getCatalogo(perfilRef);
    const sis = cat.find(s => s.codigo === novoSisCod);
    const comp = sis?.componentes.find(c => c.codigo === novoCompCod);
    const sint = comp?.sintomas.find(st => st.codigo === novoSintCod);

    if (sis && comp && sint) {
      const falhaObj = construirFalhaCatalogada({
        perfil: perfilRef,
        sistema: { codigo: sis.codigo, nome: sis.nome },
        componente: { codigo: comp.codigo, nome: comp.nome },
        sintoma: { codigo: sint.codigo, nome: sint.nome },
        complemento: novoComplemento
      });
      onChange(falhaObj, formatarFalhaCard(falhaObj, novoComplemento), novoComplemento);
    } else {
      onChange(null, novoComplemento.trim(), novoComplemento);
    }
  };

  const handleSelecionarSistema = (novoCodSis: string) => {
    setAvisoTrocaPerfil(null);
    setCodSistema(novoCodSis);
    const sisObj = sistemasDisponiveis.find(s => s.codigo === novoCodSis);
    if (sisObj && sisObj.componentes.length === 1) {
      // Regra 3: Se o sistema tiver um único componente (ex.: SPI, MD), selecionar automaticamente
      const compUnico = sisObj.componentes[0];
      setCodComponente(compUnico.codigo);
      if (compUnico.sintomas.length === 1) {
        const sintUnico = compUnico.sintomas[0];
        setCodSintoma(sintUnico.codigo);
        emitirAlteracao(novoCodSis, compUnico.codigo, sintUnico.codigo, complemento);
      } else {
        setCodSintoma('');
        emitirAlteracao(novoCodSis, compUnico.codigo, '', complemento);
      }
    } else {
      setCodComponente('');
      setCodSintoma('');
      emitirAlteracao(novoCodSis, '', '', complemento);
    }
  };

  const handleSelecionarComponente = (novoCodComp: string) => {
    setAvisoTrocaPerfil(null);
    setCodComponente(novoCodComp);
    const compObj = componentesDisponiveis.find(c => c.codigo === novoCodComp);
    if (compObj && compObj.sintomas.length === 1) {
      const sintUnico = compObj.sintomas[0];
      setCodSintoma(sintUnico.codigo);
      emitirAlteracao(codSistema, novoCodComp, sintUnico.codigo, complemento);
    } else {
      setCodSintoma('');
      emitirAlteracao(codSistema, novoCodComp, '', complemento);
    }
  };

  const handleSelecionarSintoma = (novoCodSint: string) => {
    setAvisoTrocaPerfil(null);
    setCodSintoma(novoCodSint);
    emitirAlteracao(codSistema, codComponente, novoCodSint, complemento);
  };

  const handleSelecionarResultadoBusca = (item: {
    sistema: { codigo: string; nome: string };
    componente: { codigo: string; nome: string };
    sintoma: { codigo: string; nome: string };
  }) => {
    setAvisoTrocaPerfil(null);
    setCodSistema(item.sistema.codigo);
    setCodComponente(item.componente.codigo);
    setCodSintoma(item.sintoma.codigo);
    setBuscaRapida('');
    emitirAlteracao(item.sistema.codigo, item.componente.codigo, item.sintoma.codigo, complemento);
  };

  const handleComplementoChange = (novoTexto: string) => {
    setComplemento(novoTexto);
    emitirAlteracao(codSistema, codComponente, codSintoma, novoTexto);
  };

  const limparSelecaoCatalogo = () => {
    setCodSistema('');
    setCodComponente('');
    setCodSintoma('');
    emitirAlteracao('', '', '', complemento);
  };

  const todosPerfis = useMemo(() => listarPerfis(), []);

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3.5">
      {/* Cabeçalho + Selo do Perfil Identificado */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
            {labelTitulo}
            {obrigatorio && perfilAtivo ? <span className="text-red-400 ml-1">*</span> : null}
          </span>
        </div>

        {/* Selo do Perfil ao lado da TAG */}
        <div className="flex flex-wrap items-center gap-2">
          {perfilAtivo ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-black">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Catálogo: {perfilAtivo}
              {DESCRICAO_PERFIS[perfilAtivo] && DESCRICAO_PERFIS[perfilAtivo] !== perfilAtivo ? (
                <span className="text-amber-200/80 font-bold">· {DESCRICAO_PERFIS[perfilAtivo]}</span>
              ) : null}
            </span>
          ) : tagNormalizada ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold">
              {crPrecisaEscolha ? 'Caminhão CR: escolha Mecânico ou Elétrico' : 'Sem catálogo para este equipamento'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold">
              Informe a TAG para filtrar o catálogo
            </span>
          )}

          {/* Admin pode trocar o perfil manualmente se a regra errar */}
          {(isAdmin || perfilManualAdmin) && (
            <button
              type="button"
              onClick={() => setMostrarTrocaPerfilAdmin(prev => !prev)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 flex items-center gap-1 transition-all cursor-pointer"
              title="Trocar perfil de catálogo manualmente"
            >
              <RefreshCw className="h-3 w-3" />
              Trocar perfil
            </button>
          )}
        </div>
      </div>

      {/* Seletor manual de perfil pelo Admin */}
      {mostrarTrocaPerfilAdmin && (
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-300 uppercase">
              Selecionar Perfil de Catálogo Manualmente:
            </span>
            {perfilManualAdmin && (
              <button
                type="button"
                onClick={() => {
                  setPerfilManualAdmin(null);
                  setMostrarTrocaPerfilAdmin(false);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
              >
                Voltar ao automático ({perfilAuto || 'Auto'})
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {todosPerfis.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPerfilManualAdmin(p);
                  setMostrarTrocaPerfilAdmin(false);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                  perfilAtivo === p
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aviso quando troca TAG e limpa seleção */}
      {avisoTrocaPerfil && (
        <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-amber-200 font-bold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{avisoTrocaPerfil}</span>
          </div>
          <button
            type="button"
            onClick={() => setAvisoTrocaPerfil(null)}
            className="text-amber-300 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Caso CR-9999 (não se encaixa em 25 nem 30/31/35): perguntar com dois botões grandes */}
      {crPrecisaEscolha && !perfilManualAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
          <div className="text-xs font-black text-amber-300 uppercase flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            Frota CR fora do padrão automático (25xx / 30xx / 31xx / 35xx). Qual é o tipo deste caminhão?
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEscolhaCR('CRMEC')}
              className={`min-h-[52px] px-4 py-3 rounded-xl font-black text-sm border transition-all cursor-pointer flex flex-col items-center justify-center ${
                escolhaCR === 'CRMEC'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <span>CR MECÂNICO</span>
              <span className="text-[11px] font-bold opacity-80">Komatsu HD785 (CRMEC)</span>
            </button>
            <button
              type="button"
              onClick={() => setEscolhaCR('CREL')}
              className={`min-h-[52px] px-4 py-3 rounded-xl font-black text-sm border transition-all cursor-pointer flex flex-col items-center justify-center ${
                escolhaCR === 'CREL'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <span>CR ELÉTRICO</span>
              <span className="text-[11px] font-bold opacity-80">Komatsu 730E (CREL)</span>
            </button>
          </div>
        </div>
      )}

      {/* Quando não há catálogo para o prefixo informado */}
      {tagNormalizada && !perfilAtivo && !crPrecisaEscolha && (
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-300 font-bold">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>Sem catálogo para este tipo de equipamento ({tagNormalizada}). Utilize o campo de descrição livre abaixo.</span>
        </div>
      )}

      {/* Seletores em cascata quando há perfil ativo */}
      {perfilAtivo && (
        <div className="space-y-3.5">
          {/* Busca Rápida acima dos seletores */}
          <div className="relative">
            <label className="block text-[11px] font-black text-slate-400 uppercase mb-1">
              Busca rápida no catálogo {perfilAtivo} (ex.: "vazamento", "radiador", "87")
            </label>
            <div className="relative flex items-center">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={buscaRapida}
                onChange={e => setBuscaRapida(e.target.value)}
                placeholder={`Pesquisar sistema, componente ou sintoma em ${perfilAtivo}...`}
                className="w-full min-h-[50px] pl-11 pr-10 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none"
              />
              {buscaRapida && (
                <button
                  type="button"
                  onClick={() => setBuscaRapida('')}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Lista de resultados da busca rápida */}
            {buscaRapida.trim() !== '' && (
              <div className="mt-2 bg-slate-900 border border-amber-500/40 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-800 shadow-2xl z-20">
                {resultadosBuscaRapida.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-bold">
                    Nenhuma combinação encontrada para "{buscaRapida}" no perfil {perfilAtivo}.
                  </div>
                ) : (
                  resultadosBuscaRapida.map((item, idx) => (
                    <button
                      key={`${item.sistema.codigo}-${item.componente.codigo}-${item.sintoma.codigo}-${idx}`}
                      type="button"
                      onClick={() => handleSelecionarResultadoBusca(item)}
                      className="w-full text-left px-4 py-3.5 hover:bg-amber-500/15 active:bg-amber-500/25 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="text-xs sm:text-sm font-bold text-slate-200 flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-black">
                          {item.sistema.codigo} – {item.sistema.nome}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-black">
                          {item.componente.codigo} – {item.componente.nome}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black">
                          {item.sintoma.codigo} – {item.sintoma.nome}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-amber-400 shrink-0 uppercase">
                        Selecionar
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 3 Seletores Grandes (Fácil de tocar com luva) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. SISTEMA */}
            <div>
              <label className="block text-[11px] font-black text-amber-400 uppercase mb-1 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                1. SISTEMA ({sistemasDisponiveis.length})
              </label>
              <select
                value={codSistema}
                onChange={e => handleSelecionarSistema(e.target.value)}
                className="w-full min-h-[52px] px-3.5 py-3 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl text-sm font-black text-white outline-none cursor-pointer"
              >
                <option value="">Selecione o Sistema...</option>
                {sistemasDisponiveis.map(sis => (
                  <option key={sis.codigo} value={sis.codigo}>
                    {sis.codigo} – {sis.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. COMPONENTE */}
            <div>
              <label className="block text-[11px] font-black text-sky-400 uppercase mb-1 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" />
                2. COMPONENTE {codSistema ? `(${componentesDisponiveis.length})` : ''}
              </label>
              <select
                value={codComponente}
                onChange={e => handleSelecionarComponente(e.target.value)}
                disabled={!codSistema}
                className="w-full min-h-[52px] px-3.5 py-3 bg-slate-900 border border-slate-700 focus:border-sky-500 disabled:opacity-50 rounded-xl text-sm font-black text-white outline-none cursor-pointer"
              >
                <option value="">
                  {!codSistema ? 'Escolha o Sistema primeiro...' : 'Selecione o Componente...'}
                </option>
                {componentesDisponiveis.map(comp => (
                  <option key={comp.codigo} value={comp.codigo}>
                    {comp.codigo} – {comp.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. SINTOMA */}
            <div>
              <label className="block text-[11px] font-black text-emerald-400 uppercase mb-1 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                3. SINTOMA {codComponente ? `(${sintomasDisponiveis.length})` : ''}
              </label>
              <select
                value={codSintoma}
                onChange={e => handleSelecionarSintoma(e.target.value)}
                disabled={!codComponente}
                className="w-full min-h-[52px] px-3.5 py-3 bg-slate-900 border border-slate-700 focus:border-emerald-500 disabled:opacity-50 rounded-xl text-sm font-black text-white outline-none cursor-pointer"
              >
                <option value="">
                  {!codComponente ? 'Escolha o Componente primeiro...' : 'Selecione o Sintoma...'}
                </option>
                {sintomasDisponiveis.map(sint => (
                  <option key={sint.codigo} value={sint.codigo}>
                    {sint.codigo} – {sint.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resumo da Falha Catalogada Selecionada */}
          {sistemaSelecionado && componenteSelecionado && sintomaSelecionado && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-black text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 font-mono text-xs">
                  {`${perfilAtivo}/${sistemaSelecionado.codigo}/${componenteSelecionado.codigo}/${sintomaSelecionado.codigo}`}
                </span>
                <span>
                  {sistemaSelecionado.codigo} › {componenteSelecionado.nome} › {sintomaSelecionado.nome}
                </span>
              </div>
              <button
                type="button"
                onClick={limparSelecaoCatalogo}
                className="text-xs font-bold text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Campo "Complemento / descrição" em texto livre */}
      <div>
        <label className="block text-[11px] font-black text-slate-400 uppercase mb-1">
          Complemento / Descrição em texto livre {perfilAtivo ? '(Opcional)' : ''}
        </label>
        <input
          type="text"
          value={complemento}
          onChange={e => handleComplementoChange(e.target.value)}
          placeholder={placeholderComplemento}
          className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none"
        />
      </div>
    </div>
  );
};
