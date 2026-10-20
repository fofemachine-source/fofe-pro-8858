import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronDown, AlertTriangle, X, Layers, RefreshCw, Sparkles
} from 'lucide-react';
import {
  FalhaCatalogada,
  getCatalogo,
  listarPerfis,
  perfilDaTag,
  precisaEscolherPerfilCR,
  normalizarESepararTag,
  DESCRICAO_PERFIS,
  construirFalhaCatalogada,
  formatarFalhaCard
} from '../data/catalogoFalhas';
import { removerAcentos } from '../lib/uEmDataUtils';

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

interface ItemCatalogoPlano {
  perfil: string;
  sistemaCodigo: string;
  sistemaNome: string;
  componenteCodigo: string;
  componenteNome: string;
  sintomaCodigo: string;
  sintomaNome: string;
  codigoCompleto: string;
  buscaNorm: string;
}

export const SeletorCatalogo: React.FC<SeletorCatalogoProps> = ({
  tag,
  value,
  complemento: complementoProp = '',
  onChange,
  obrigatorio = false,
  isAdmin = false,
  labelTitulo = 'SINTOMA (CATÁLOGO DE FALHAS)',
  placeholderComplemento = 'Complemento (opcional)'
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

  const [buscaInput, setBuscaInput] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avisoTrocaPerfil, setAvisoTrocaPerfil] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

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
        setBuscaInput('');
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

  // Lista plana preservando exatamente a ordem da planilha
  const todosItensCatalogo = useMemo<ItemCatalogoPlano[]>(() => {
    if (!perfilAtivo || sistemasDisponiveis.length === 0) return [];
    const itens: ItemCatalogoPlano[] = [];
    for (const sis of sistemasDisponiveis) {
      for (const comp of sis.componentes) {
        for (const sin of comp.sintomas) {
          const codigoCompleto = `${perfilAtivo}/${sis.codigo}/${comp.codigo}/${sin.codigo}`;
          const buscaNorm = removerAcentos(
            `${sis.codigo} ${sis.nome} ${comp.codigo} ${comp.nome} ${sin.codigo} ${sin.nome} ${codigoCompleto}`
          );
          itens.push({
            perfil: perfilAtivo,
            sistemaCodigo: sis.codigo,
            sistemaNome: sis.nome,
            componenteCodigo: comp.codigo,
            componenteNome: comp.nome,
            sintomaCodigo: sin.codigo,
            sintomaNome: sin.nome,
            codigoCompleto,
            buscaNorm
          });
        }
      }
    }
    return itens;
  }, [perfilAtivo, sistemasDisponiveis]);

  const itemEscolhido = useMemo<ItemCatalogoPlano | null>(() => {
    if (!codSistema || !codComponente || !codSintoma) return null;
    return (
      todosItensCatalogo.find(
        item =>
          item.sistemaCodigo === codSistema &&
          item.componenteCodigo === codComponente &&
          item.sintomaCodigo === codSintoma
      ) || null
    );
  }, [todosItensCatalogo, codSistema, codComponente, codSintoma]);

  // Filtro da busca aceitando código ou nome do sistema, componente ou sintoma
  const termoFiltro = useMemo(() => {
    if (itemEscolhido) return '';
    return removerAcentos(buscaInput.trim());
  }, [buscaInput, itemEscolhido]);

  const itensFiltrados = useMemo(() => {
    if (!termoFiltro) return todosItensCatalogo;
    const palavras = termoFiltro.split(/\s+/).filter(Boolean);
    return todosItensCatalogo.filter(item =>
      palavras.every(p => item.buscaNorm.includes(p))
    );
  }, [todosItensCatalogo, termoFiltro]);

  const sistemasAgrupados = useMemo(() => {
    const mapa = new Map<string, { cabecalho: string; itens: ItemCatalogoPlano[] }>();
    itensFiltrados.forEach(item => {
      const key = item.sistemaCodigo;
      if (!mapa.has(key)) {
        mapa.set(key, {
          cabecalho: `${item.sistemaCodigo} – ${item.sistemaNome}`,
          itens: []
        });
      }
      mapa.get(key)!.itens.push(item);
    });
    return Array.from(mapa.values());
  }, [itensFiltrados]);

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

  const handleSelectItemCatalogo = (item: ItemCatalogoPlano) => {
    setAvisoTrocaPerfil(null);
    setCodSistema(item.sistemaCodigo);
    setCodComponente(item.componenteCodigo);
    setCodSintoma(item.sintomaCodigo);
    setBuscaInput('');
    setDropdownOpen(false);
    emitirAlteracao(item.sistemaCodigo, item.componenteCodigo, item.sintomaCodigo, complemento);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const limparSelecaoCatalogo = () => {
    setCodSistema('');
    setCodComponente('');
    setCodSintoma('');
    setBuscaInput('');
    emitirAlteracao('', '', '', complemento);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleInputChange = (val: string) => {
    if (itemEscolhido) {
      setComplemento(val);
      emitirAlteracao(codSistema, codComponente, codSintoma, val);
    } else if (perfilAtivo && todosItensCatalogo.length > 0) {
      setBuscaInput(val);
      setDropdownOpen(true);
    } else {
      setComplemento(val);
      emitirAlteracao('', '', '', val);
    }
  };

  const todosPerfis = useMemo(() => listarPerfis(), []);
  const temCatalogoAtivo = Boolean(perfilAtivo && todosItensCatalogo.length > 0);

  return (
    <div ref={containerRef} className="relative space-y-2">
      {/* Cabeçalho + Selo do Perfil Identificado */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          className="block uppercase font-semibold tracking-wider flex items-center gap-1.5"
          style={{ fontSize: '11px', color: '#3a4245' }}
        >
          <Layers className="h-3.5 w-3.5 text-[#004d2c] shrink-0" />
          <span>
            {labelTitulo}
            {obrigatorio && perfilAtivo ? <span className="text-red-600 ml-1">*</span> : null}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {perfilAtivo ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#e8f3ee] border border-[#b7dccb] text-[#004d2c] text-[10px] font-bold">
              <Sparkles className="h-3 w-3 text-[#004d2c]" />
              Catálogo: {perfilAtivo}
              {DESCRICAO_PERFIS[perfilAtivo] && DESCRICAO_PERFIS[perfilAtivo] !== perfilAtivo ? (
                <span className="font-normal">· {DESCRICAO_PERFIS[perfilAtivo]}</span>
              ) : null}
            </span>
          ) : tagNormalizada ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 border border-gray-300 text-gray-700 text-[10px] font-semibold">
              {crPrecisaEscolha ? 'Caminhão CR: escolha Mecânico ou Elétrico' : 'Sem catálogo para este equipamento'}
            </span>
          ) : null}

          {(isAdmin || perfilManualAdmin) && (
            <button
              type="button"
              onClick={() => setMostrarTrocaPerfilAdmin(prev => !prev)}
              className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 border border-gray-300 text-[10px] font-semibold text-gray-700 flex items-center gap-1 transition-all cursor-pointer"
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
        <div className="bg-[#f7f8f7] border border-[#d9dedb] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#004d2c] uppercase">
              Selecionar Perfil de Catálogo Manualmente:
            </span>
            {perfilManualAdmin && (
              <button
                type="button"
                onClick={() => {
                  setPerfilManualAdmin(null);
                  setMostrarTrocaPerfilAdmin(false);
                }}
                className="text-[11px] font-semibold text-[#5c666a] hover:text-[#1f2426] underline cursor-pointer"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  perfilAtivo === p
                    ? 'bg-[#004d2c] text-white border-[#004d2c]'
                    : 'bg-white text-[#1f2426] border-[#d9dedb] hover:border-[#004d2c]'
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
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs text-amber-900 font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{avisoTrocaPerfil}</span>
          </div>
          <button
            type="button"
            onClick={() => setAvisoTrocaPerfil(null)}
            className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Caso CR fora do padrão automático */}
      {crPrecisaEscolha && !perfilManualAdmin && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2">
          <div className="text-xs font-bold text-amber-900 uppercase flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            Frota CR fora do padrão automático (25xx / 30xx / 31xx / 35xx). Qual é o tipo deste caminhão?
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setEscolhaCR('CRMEC')}
              className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer flex flex-col items-center justify-center ${
                escolhaCR === 'CRMEC'
                  ? 'bg-[#004d2c] text-white border-[#004d2c]'
                  : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
              }`}
            >
              <span>CR MECÂNICO (HD785)</span>
            </button>
            <button
              type="button"
              onClick={() => setEscolhaCR('CREL')}
              className={`min-h-[44px] px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer flex flex-col items-center justify-center ${
                escolhaCR === 'CREL'
                  ? 'bg-[#004d2c] text-white border-[#004d2c]'
                  : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
              }`}
            >
              <span>CR ELÉTRICO (730E)</span>
            </button>
          </div>
        </div>
      )}

      {/* Campo de busca / complemento com setinha */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={itemEscolhido ? complemento : temCatalogoAtivo ? buscaInput : complemento}
          onFocus={() => {
            if (temCatalogoAtivo && !itemEscolhido) {
              setDropdownOpen(true);
            }
          }}
          onChange={e => handleInputChange(e.target.value)}
          placeholder={
            itemEscolhido
              ? placeholderComplemento
              : !tagNormalizada
              ? 'Informe a TAG primeiro...'
              : temCatalogoAtivo
              ? 'Ex: Vazamento, 87, TC, radiador...'
              : 'Descreva o sintoma em texto livre...'
          }
          className="w-full h-[44px] pl-3.5 pr-10 text-[13px] text-[#1f2426] placeholder-[#8a9490] bg-[#f2f3f2] border border-[#d9dedb] rounded-[8px] focus:bg-white focus:border-[#004d2c] focus:outline-none focus:ring-2 focus:ring-[#004d2c]/15 transition-all"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={!temCatalogoAtivo}
          onMouseDown={e => {
            e.preventDefault();
            if (!temCatalogoAtivo) return;
            setDropdownOpen(prev => !prev);
            inputRef.current?.focus();
          }}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md ${
            temCatalogoAtivo
              ? 'text-[#3a4245] hover:text-[#004d2c] cursor-pointer'
              : 'text-[#b5bcbd] cursor-not-allowed'
          }`}
          title={temCatalogoAtivo ? 'Ver lista de sintomas do catálogo' : 'Escolha uma TAG com catálogo'}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-150 ${
              dropdownOpen ? 'rotate-180 text-[#004d2c]' : ''
            }`}
          />
        </button>
      </div>

      {/* Etiqueta abaixo do campo após escolher: "87 Vazamento · AR Arrefecimento › TC Radiador" */}
      {itemEscolhido ? (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e8f3ee] border border-[#b7dccb] text-[11px] text-[#004d2c] max-w-full">
          <span className="font-mono font-bold bg-[#004d2c] text-white px-1.5 py-0.5 rounded text-[10px] shrink-0">
            {itemEscolhido.sintomaCodigo}
          </span>
          <span className="font-medium truncate">
            <strong className="font-bold">{itemEscolhido.sintomaNome}</strong>
            {` · ${itemEscolhido.sistemaCodigo} ${itemEscolhido.sistemaNome} › ${itemEscolhido.componenteCodigo} ${itemEscolhido.componenteNome}`}
          </span>
          <button
            type="button"
            onClick={limparSelecaoCatalogo}
            className="ml-1 text-[#004d2c] hover:text-red-600 font-bold text-[14px] leading-none cursor-pointer shrink-0"
            title="Remover código do catálogo"
          >
            ×
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-[#5c666a] leading-snug">
          {!tagNormalizada
            ? 'Escolha a TAG primeiro para ver os códigos.'
            : temCatalogoAtivo
            ? 'Toque na setinha para ver os códigos ou digite para filtrar.'
            : 'Sem catálogo: descreva em texto livre.'}
        </p>
      )}

      {/* Lista de sintomas idêntica às colunas "CÓDIGO | SINTOMAS" da planilha */}
      {dropdownOpen && temCatalogoAtivo && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-[#d9dedb] rounded-[10px] shadow-2xl max-h-[340px] overflow-y-auto">
          {sistemasAgrupados.length === 0 ? (
            <div className="p-3.5 text-[12px] text-[#5c666a]">
              Nada no catálogo para &lsquo;<strong className="text-[#1f2426]">{buscaInput}</strong>&rsquo;.
            </div>
          ) : (
            sistemasAgrupados.map(grupo => (
              <div key={grupo.cabecalho}>
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-[#f2f3f2] border-y border-[#e3e7e4] text-[10px] font-bold uppercase tracking-wider text-[#5c666a]">
                  {grupo.cabecalho}
                </div>
                <div className="divide-y divide-[#f2f3f2]">
                  {grupo.itens.map(item => (
                    <button
                      key={item.codigoCompleto}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        handleSelectItemCatalogo(item);
                      }}
                      className="w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#e8f3ee]/70 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="min-w-[38px] px-2 py-0.5 rounded-[5px] bg-[#e6f2ec] text-[#004d2c] font-mono font-bold text-[11px] text-right shrink-0">
                          {item.sintomaCodigo}
                        </span>
                        <span className="font-bold text-[13px] text-[#1f2426] truncate">
                          {item.sintomaNome}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#6c7579] shrink-0 text-right">
                        {item.componenteCodigo} – {item.componenteNome}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
