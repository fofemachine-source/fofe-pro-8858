import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Equipamento, FalhaCatalogada, Parada } from '../types';
import { CODIGOS_VALE_FLAT } from '../data/codigosVale';
import { getCatalogo, perfilDaTag, formatarFalhaCard } from '../data/catalogoFalhas';
import { derivarFrenteDaTag, normalizarTag, removerAcentos } from '../lib/uEmDataUtils';
import { getEquipamentosIniciaisCompletos, ORDEM_GRUPOS_EQUIPAMENTO } from '../data/equipamentosIniciais';

export interface DadosNovaParadaModal {
  tag: string;
  modelo: string;
  frente: string;
  inicioParadaIso: string;
  ordemServico: string | null;
  codigoInicial: string;
  previsaoLiberacao: string | null;
  falha: FalhaCatalogada | null;
  sintomaInicial: string | null;
  complementoTexto: string;
  iniciarAtendimentoAgora?: boolean;
}

interface ModalAbrirParadaProps {
  isOpen: boolean;
  onClose: () => void;
  equipamentos: Equipamento[];
  paradasAbertas: Parada[];
  onConfirm: (dados: DadosNovaParadaModal) => void;
  onAbrirParadaExistente?: (parada: Parada) => void;
  /** Quando aberto pelo técnico, permite marcar para já iniciar atendimento */
  modoTecnico?: boolean;
  defaultIniciarAtendimento?: boolean;
}

interface ItemCatalogoPlano {
  perfil: string;
  sistemaCodigo: string;
  sistemaNome: string;
  componenteCodigo: string;
  componenteNome: string;
  sintomaCodigo: string;
  sintomaNome: string;
  badge: string; // "AR · TC · 87"
  codigoCompleto: string; // "EH/AR/TC/87"
  caminho: string; // "Arrefecimento › Radiador › Vazamento"
  buscaNorm: string;
}

function getHoraAtualDatetimeLocal(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function getNomePerfilAmigavel(perfil: string | null): string | null {
  if (!perfil) return null;
  switch (perfil) {
    case 'EH':
      return 'Escavadeiras';
    case 'CRMEC':
      return 'CRMEC';
    case 'CREL':
      return 'CREL';
    case 'PF':
      return 'Perfuratrizes';
    case 'MN':
      return 'Motoniveladoras';
    default:
      return perfil;
  }
}

export function ModalAbrirParada({
  isOpen,
  onClose,
  equipamentos,
  paradasAbertas,
  onConfirm,
  onAbrirParadaExistente,
  modoTecnico = false,
  defaultIniciarAtendimento = false
}: ModalAbrirParadaProps) {
  const [tagInput, setTagInput] = useState('');
  const [equipamentoEscolhido, setEquipamentoEscolhido] = useState<Equipamento | null>(null);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagHighlightIdx, setTagHighlightIdx] = useState<number>(-1);
  const [erroTag, setErroTag] = useState<string | null>(null);

  const [sintomaInput, setSintomaInput] = useState('');
  const [itemCatalogoEscolhido, setItemCatalogoEscolhido] = useState<ItemCatalogoPlano | null>(null);
  const [sintomaDropdownOpen, setSintomaDropdownOpen] = useState(false);

  const [horaRealParada, setHoraRealParada] = useState<string>(() => getHoraAtualDatetimeLocal());
  const [ordemServico, setOrderServico] = useState('');
  const [statusInicial, setStatusInicial] = useState('HMC 9130');
  const [previsaoLiberacao, setPrevisaoLiberacao] = useState('');
  const [iniciarAgora, setIniciarAgora] = useState(defaultIniciarAtendimento);

  const tagContainerRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const sintomaContainerRef = useRef<HTMLDivElement>(null);
  const sintomaInputRef = useRef<HTMLInputElement>(null);

  // Reinicia estados ao abrir
  useEffect(() => {
    if (isOpen) {
      setTagInput('');
      setEquipamentoEscolhido(null);
      setTagDropdownOpen(false);
      setTagHighlightIdx(-1);
      setErroTag(null);
      setSintomaInput('');
      setItemCatalogoEscolhido(null);
      setSintomaDropdownOpen(false);
      setHoraRealParada(getHoraAtualDatetimeLocal());
      setOrderServico('');
      setStatusInicial('HMC 9130');
      setPrevisaoLiberacao('');
      setIniciarAgora(defaultIniciarAtendimento);
    }
  }, [isOpen, defaultIniciarAtendimento]);

  // Fechar com tecla Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tagDropdownOpen) {
          setTagDropdownOpen(false);
          return;
        }
        if (sintomaDropdownOpen) {
          setSintomaDropdownOpen(false);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, tagDropdownOpen, sintomaDropdownOpen, onClose]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (tagContainerRef.current && !tagContainerRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
      if (sintomaContainerRef.current && !sintomaContainerRef.current.contains(e.target as Node)) {
        setSintomaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Lista de equipamentos ativos (somente ativos e nunca CB)
  const equipamentosAtivos = useMemo(() => {
    const base = equipamentos && equipamentos.length > 0 ? equipamentos : getEquipamentosIniciaisCompletos();
    return base
      .filter(eq => eq.ativo !== false && !normalizarTag(eq.tag).startsWith('CB'))
      .slice()
      .sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR'));
  }, [equipamentos]);

  // Texto limpo para filtro da TAG pelo começo
  const tagFiltroLimpo = useMemo(() => {
    // Se o usuário já escolheu exatamente a TAG e não editou o texto, quando clica na setinha mostra todos
    if (equipamentoEscolhido && tagInput.trim().toUpperCase() === equipamentoEscolhido.tag.toUpperCase()) {
      return '';
    }
    return tagInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }, [tagInput, equipamentoEscolhido]);

  const equipamentosFiltrados = useMemo(() => {
    if (!tagFiltroLimpo) return equipamentosAtivos;
    return equipamentosAtivos.filter(eq => {
      const eqLimpo = eq.tag.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const eqComHifen = eq.tag.toUpperCase();
      return (
        eqLimpo.startsWith(tagFiltroLimpo) ||
        eqComHifen.startsWith(tagInput.trim().toUpperCase())
      );
    });
  }, [equipamentosAtivos, tagFiltroLimpo, tagInput]);

  // Agrupamento por grupo quando sem filtro (ou mesmo com filtro)
  const gruposEquipamentos = useMemo(() => {
    const mapa = new Map<string, Equipamento[]>();
    ORDEM_GRUPOS_EQUIPAMENTO.forEach(grupo => mapa.set(grupo, []));

    equipamentosFiltrados.forEach(eq => {
      const grupo = eq.grupo || eq.tipo || 'Outros';
      if (!mapa.has(grupo)) mapa.set(grupo, []);
      mapa.get(grupo)!.push(eq);
    });

    return Array.from(mapa.entries())
      .filter(([, lista]) => lista.length > 0)
      .map(([tipo, lista]) => ({ tipo, lista }));
  }, [equipamentosFiltrados]);

  // Lista linear para navegação por teclado ↑ ↓
  const listaLinearEquipamentos = useMemo(() => {
    return gruposEquipamentos.flatMap(g => g.lista);
  }, [gruposEquipamentos]);

  // Parada aberta existente para a TAG selecionada/digitada
  const paradaAbertaMesmaTag = useMemo(() => {
    const tagAlvo = equipamentoEscolhido?.tag || normalizarTag(tagInput);
    if (!tagAlvo) return null;
    return paradasAbertas.find(
      p => p.situacao === 'ABERTA' && normalizarTag(p.tag) === normalizarTag(tagAlvo)
    ) || null;
  }, [equipamentoEscolhido, tagInput, paradasAbertas]);

  // Perfil do catálogo da TAG escolhida
  const perfilAtual = useMemo(() => {
    if (!equipamentoEscolhido) return null;
    return perfilDaTag(equipamentoEscolhido.tag);
  }, [equipamentoEscolhido]);

  const sistemasCatalogo = useMemo(() => {
    if (!perfilAtual) return [];
    return getCatalogo(perfilAtual);
  }, [perfilAtual]);

  // Contagem de sistemas e códigos para a linha de ajuda da TAG
  const resumoCatalogoTag = useMemo(() => {
    if (!equipamentoEscolhido) return null;
    const frente = equipamentoEscolhido.frente || derivarFrenteDaTag(equipamentoEscolhido.tag);
    const nomePerfil = getNomePerfilAmigavel(perfilAtual);
    if (!perfilAtual || sistemasCatalogo.length === 0) {
      return {
        modelo: equipamentoEscolhido.modelo,
        frente,
        temCatalogo: false,
        nomePerfil: null,
        numSistemas: 0,
        numCodigos: 0
      };
    }
    let numCodigos = 0;
    sistemasCatalogo.forEach(s => {
      s.componentes.forEach(c => {
        numCodigos += c.sintomas.length;
      });
    });
    return {
      modelo: equipamentoEscolhido.modelo,
      frente,
      temCatalogo: true,
      nomePerfil,
      numSistemas: sistemasCatalogo.length,
      numCodigos
    };
  }, [equipamentoEscolhido, perfilAtual, sistemasCatalogo]);

  // Lista plana de todos os códigos do catálogo para a TAG escolhida
  const todosItensCatalogo = useMemo<ItemCatalogoPlano[]>(() => {
    if (!perfilAtual || sistemasCatalogo.length === 0) return [];
    const itens: ItemCatalogoPlano[] = [];
    for (const sis of sistemasCatalogo) {
      for (const comp of sis.componentes) {
        for (const sin of comp.sintomas) {
          const badge = `${sis.codigo} · ${comp.codigo} · ${sin.codigo}`;
          const codigoCompleto = `${perfilAtual}/${sis.codigo}/${comp.codigo}/${sin.codigo}`;
          const caminho = `${sis.nome} › ${comp.nome} › ${sin.nome}`;
          const buscaNorm = removerAcentos(
            `${sis.codigo} ${sis.nome} ${comp.codigo} ${comp.nome} ${sin.codigo} ${sin.nome} ${badge} ${codigoCompleto}`
          );
          itens.push({
            perfil: perfilAtual,
            sistemaCodigo: sis.codigo,
            sistemaNome: sis.nome,
            componenteCodigo: comp.codigo,
            componenteNome: comp.nome,
            sintomaCodigo: sin.codigo,
            sintomaNome: sin.nome,
            badge,
            codigoCompleto,
            caminho,
            buscaNorm
          });
        }
      }
    }
    return itens;
  }, [perfilAtual, sistemasCatalogo]);

  // Filtro de sintomas quando nenhum item ainda foi escolhido (ou enquanto pesquisa no catálogo)
  const termoFiltroSintoma = useMemo(() => {
    if (itemCatalogoEscolhido) return '';
    return removerAcentos(sintomaInput.trim());
  }, [sintomaInput, itemCatalogoEscolhido]);

  const itensCatalogoFiltrados = useMemo(() => {
    if (!termoFiltroSintoma) return todosItensCatalogo;
    const palavras = termoFiltroSintoma.split(/\s+/).filter(Boolean);
    return todosItensCatalogo.filter(item =>
      palavras.every(p => item.buscaNorm.includes(p))
    );
  }, [todosItensCatalogo, termoFiltroSintoma]);

  const sistemasFiltradosAgrupados = useMemo(() => {
    const mapa = new Map<string, { cabecalho: string; itens: ItemCatalogoPlano[] }>();
    itensCatalogoFiltrados.forEach(item => {
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
  }, [itensCatalogoFiltrados]);

  // Selecionar equipamento da lista
  const handleSelectEquipamento = (eq: Equipamento) => {
    const mudouTag = !equipamentoEscolhido || equipamentoEscolhido.tag !== eq.tag;
    setEquipamentoEscolhido(eq);
    setTagInput(eq.tag);
    setTagDropdownOpen(false);
    setTagHighlightIdx(-1);
    setErroTag(null);
    if (mudouTag) {
      setItemCatalogoEscolhido(null);
      setSintomaInput('');
      setSintomaDropdownOpen(false);
    }
  };

  // Ao sair do campo TAG: formatar maiúsculas e hífen automático ("eh4050" -> "EH-4050")
  const handleTagBlur = () => {
    if (!tagInput.trim()) return;
    const formatada = normalizarTag(tagInput);
    setTagInput(formatada);
    const matchExato = equipamentosAtivos.find(eq => eq.tag.toUpperCase() === formatada.toUpperCase());
    if (matchExato) {
      if (!equipamentoEscolhido || equipamentoEscolhido.tag !== matchExato.tag) {
        setEquipamentoEscolhido(matchExato);
        setItemCatalogoEscolhido(null);
        setSintomaInput('');
      }
      setErroTag(null);
    }
  };

  // Teclado no campo TAG
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!tagDropdownOpen) {
        setTagDropdownOpen(true);
        setTagHighlightIdx(0);
      } else {
        setTagHighlightIdx(prev =>
          listaLinearEquipamentos.length === 0 ? -1 : (prev + 1) % listaLinearEquipamentos.length
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!tagDropdownOpen) {
        setTagDropdownOpen(true);
        setTagHighlightIdx(Math.max(0, listaLinearEquipamentos.length - 1));
      } else {
        setTagHighlightIdx(prev =>
          listaLinearEquipamentos.length === 0
            ? -1
            : (prev - 1 + listaLinearEquipamentos.length) % listaLinearEquipamentos.length
        );
      }
    } else if (e.key === 'Enter') {
      if (tagDropdownOpen && tagHighlightIdx >= 0 && tagHighlightIdx < listaLinearEquipamentos.length) {
        e.preventDefault();
        handleSelectEquipamento(listaLinearEquipamentos[tagHighlightIdx]);
      } else if (tagDropdownOpen && listaLinearEquipamentos.length === 1) {
        e.preventDefault();
        handleSelectEquipamento(listaLinearEquipamentos[0]);
      }
    } else if (e.key === 'Escape') {
      if (tagDropdownOpen) {
        e.stopPropagation();
        setTagDropdownOpen(false);
      }
    }
  };

  // Destaca em verde (#004d2c) a parte digitada no começo da TAG
  const renderTagDestacada = (tag: string) => {
    if (!tagFiltroLimpo) {
      return <span className="font-bold text-[#1f2426]">{tag}</span>;
    }
    // Descobre quantos caracteres da TAG (incluindo hífen) correspondem aos caracteres alfanuméricos digitados
    let charsAlfanumConsumidos = 0;
    let indiceCorte = 0;
    for (let i = 0; i < tag.length; i++) {
      const ch = tag[i];
      if (/[A-Za-z0-9]/.test(ch)) {
        charsAlfanumConsumidos++;
      }
      indiceCorte = i + 1;
      if (charsAlfanumConsumidos >= tagFiltroLimpo.length) break;
    }
    const parteVerde = tag.slice(0, indiceCorte);
    const resto = tag.slice(indiceCorte);
    return (
      <span className="font-bold text-[#1f2426]">
        <span className="text-[#004d2c] underline decoration-[#004d2c]/40">{parteVerde}</span>
        {resto}
      </span>
    );
  };

  const handleSelectItemCatalogo = (item: ItemCatalogoPlano) => {
    setItemCatalogoEscolhido(item);
    setSintomaInput(''); // Campo fica livre para digitar o COMPLEMENTO em texto
    setSintomaDropdownOpen(false);
    setTimeout(() => sintomaInputRef.current?.focus(), 30);
  };

  const handleRemoverItemCatalogo = () => {
    setItemCatalogoEscolhido(null);
    setTimeout(() => sintomaInputRef.current?.focus(), 30);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verifica se a TAG corresponde a um equipamento ativo da lista
    const tagFormatada = normalizarTag(tagInput);
    const eqValido =
      equipamentoEscolhido && equipamentoEscolhido.tag.toUpperCase() === tagFormatada.toUpperCase()
        ? equipamentoEscolhido
        : equipamentosAtivos.find(eq => eq.tag.toUpperCase() === tagFormatada.toUpperCase()) || null;

    if (!eqValido) {
      setErroTag('Escolha um equipamento da lista.');
      return;
    }

    // Se já existir Parada ABERTA para a mesma TAG, avisa e abre o card dela sem duplicar
    const abertaExistente = paradasAbertas.find(
      p => p.situacao === 'ABERTA' && normalizarTag(p.tag) === normalizarTag(eqValido.tag)
    );
    if (abertaExistente) {
      if (onAbrirParadaExistente) {
        onAbrirParadaExistente(abertaExistente);
      }
      return;
    }

    const frenteCalculada = eqValido.frente || derivarFrenteDaTag(eqValido.tag);
    const inicioIso = horaRealParada
      ? new Date(horaRealParada).toISOString()
      : new Date().toISOString();

    const complementoLimpo = sintomaInput.trim();
    let falhaFinal: FalhaCatalogada | null = null;
    let sintomaInicialFinal: string | null = null;

    if (itemCatalogoEscolhido) {
      falhaFinal = {
        perfil: itemCatalogoEscolhido.perfil,
        sistema: {
          codigo: itemCatalogoEscolhido.sistemaCodigo,
          nome: itemCatalogoEscolhido.sistemaNome
        },
        componente: {
          codigo: itemCatalogoEscolhido.componenteCodigo,
          nome: itemCatalogoEscolhido.componenteNome
        },
        sintoma: {
          codigo: itemCatalogoEscolhido.sintomaCodigo,
          nome: itemCatalogoEscolhido.sintomaNome
        },
        complemento: complementoLimpo,
        codigoCompleto: itemCatalogoEscolhido.codigoCompleto
      };
      sintomaInicialFinal = formatarFalhaCard(falhaFinal, complementoLimpo);
    } else if (complementoLimpo) {
      sintomaInicialFinal = complementoLimpo;
    }

    onConfirm({
      tag: eqValido.tag,
      modelo: eqValido.modelo,
      frente: frenteCalculada,
      inicioParadaIso: inicioIso,
      ordemServico: ordemServico.trim() || null,
      codigoInicial: statusInicial || 'HMC 9130',
      previsaoLiberacao: previsaoLiberacao || null,
      falha: falhaFinal,
      sintomaInicial: sintomaInicialFinal,
      complementoTexto: complementoLimpo,
      iniciarAtendimentoAgora: modoTecnico ? iniciarAgora : false
    });
  };

  if (!isOpen) return null;

  const temCatalogoParaTag = Boolean(equipamentoEscolhido && perfilAtual && todosItensCatalogo.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-[1px]"
      style={{ colorScheme: 'light' }}
    >
      {/* Modal centralizado, max-w 720px, sempre em tema CLARO */}
      <div
        className="w-full max-w-[720px] bg-white text-[#1f2426] rounded-2xl shadow-2xl border border-[#e3e7e4] overflow-visible animate-in fade-in zoom-in-95 duration-150"
        style={{ backgroundColor: '#ffffff', color: '#1f2426' }}
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-[#e3e7e4] flex items-center justify-between">
          <h2
            className="text-[16px] sm:text-[17px] font-light uppercase tracking-wide"
            style={{ color: '#004d2c' }}
          >
            + ABRIR PARADA DE EQUIPAMENTO
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#3a4245] hover:bg-[#f2f3f2] transition-colors cursor-pointer text-[22px] leading-none"
          >
            ×
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Grade de 2 colunas (1 coluna abaixo de 560px) */}
          <div className="grid grid-cols-1 min-[560px]:grid-cols-2 gap-x-4 gap-y-4">
            {/* LINHA 1, COLUNA 1: TAG DO EQUIPAMENTO * */}
            <div ref={tagContainerRef} className="relative">
              <label
                className="block uppercase font-semibold mb-1.5 tracking-wider"
                style={{ fontSize: '11px', color: '#3a4245' }}
              >
                TAG DO EQUIPAMENTO *
              </label>

              <div className="relative">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onFocus={() => setTagDropdownOpen(true)}
                  onBlur={handleTagBlur}
                  onKeyDown={handleTagKeyDown}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setTagInput(val);
                    setErroTag(null);
                    setTagDropdownOpen(true);
                    setTagHighlightIdx(0);

                    const match = equipamentosAtivos.find(
                      eq => eq.tag.toUpperCase() === normalizarTag(val).toUpperCase()
                    );
                    if (match) {
                      if (!equipamentoEscolhido || equipamentoEscolhido.tag !== match.tag) {
                        setEquipamentoEscolhido(match);
                        setItemCatalogoEscolhido(null);
                        setSintomaInput('');
                      }
                    } else if (equipamentoEscolhido) {
                      setEquipamentoEscolhido(null);
                      setItemCatalogoEscolhido(null);
                      setSintomaInput('');
                    }
                  }}
                  placeholder="Ex: EH-4050, CR-3119..."
                  className="w-full h-[44px] pl-3.5 pr-10 text-[14px] font-semibold text-[#1f2426] placeholder-[#8a9490] bg-[#f2f3f2] border border-[#d9dedb] rounded-[8px] focus:bg-white focus:border-[#004d2c] focus:outline-none focus:ring-2 focus:ring-[#004d2c]/15 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setTagDropdownOpen(prev => !prev);
                    tagInputRef.current?.focus();
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#3a4245] hover:text-[#004d2c] rounded-md cursor-pointer"
                  title="Ver equipamentos cadastrados"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-150 ${
                      tagDropdownOpen ? 'rotate-180 text-[#004d2c]' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Erro de validação da TAG */}
              {erroTag && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">
                  {erroTag}
                </p>
              )}

              {/* Texto de ajuda abaixo da TAG após escolher equipamento */}
              {resumoCatalogoTag && !erroTag && (
                <p className="mt-1 text-[11px] text-[#5c666a] leading-snug">
                  <span className="font-semibold text-[#004d2c]">{resumoCatalogoTag.modelo}</span>
                  {' · frente '}
                  <span className="font-semibold text-[#004d2c]">{resumoCatalogoTag.frente}</span>
                  {resumoCatalogoTag.temCatalogo ? (
                    <>
                      {' · catálogo '}
                      <span className="font-semibold text-[#004d2c]">{resumoCatalogoTag.nomePerfil}</span>
                      {` · ${resumoCatalogoTag.numSistemas} sistemas, ${resumoCatalogoTag.numCodigos} códigos`}
                    </>
                  ) : (
                    <span> · sem catálogo de falhas</span>
                  )}
                </p>
              )}

              {/* Dropdown de equipamentos */}
              {tagDropdownOpen && (
                <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-[#d9dedb] rounded-[10px] shadow-xl max-h-[320px] overflow-y-auto">
                  {gruposEquipamentos.length === 0 ? (
                    <div className="p-3.5 text-[12px] text-[#5c666a] text-center">
                      Nenhum equipamento cadastrado para &ldquo;{tagInput}&rdquo;.
                    </div>
                  ) : (
                    gruposEquipamentos.map(({ tipo, lista }) => (
                      <div key={tipo}>
                        <div className="sticky top-0 z-10 px-3 py-1.5 bg-[#f2f3f2] border-y border-[#e3e7e4] flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#3a4245]">
                            {tipo} ({lista.length})
                          </span>
                          <span className="text-[10px] font-bold text-[#004d2c] bg-white px-1.5 py-0.2 rounded border border-[#d9dedb]">
                            {lista.length}
                          </span>
                        </div>
                        <div className="divide-y divide-[#f2f3f2]">
                          {lista.map((eq) => {
                            const linearIdx = listaLinearEquipamentos.findIndex(item => item.tag === eq.tag);
                            const isHighlighted = linearIdx === tagHighlightIdx;
                            const isSelected = equipamentoEscolhido?.tag === eq.tag;
                            return (
                              <button
                                key={eq.tag}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectEquipamento(eq);
                                }}
                                onMouseEnter={() => setTagHighlightIdx(linearIdx)}
                                className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left text-[13px] transition-colors cursor-pointer ${
                                  isHighlighted || isSelected
                                    ? 'bg-[#e8f3ee]'
                                    : 'hover:bg-[#f7f8f7]'
                                }`}
                              >
                                <span className="text-[13px] tracking-tight">
                                  {renderTagDestacada(eq.tag)}
                                </span>
                                <span className="text-[12px] text-[#6c7579] truncate ml-3">
                                  {eq.modelo}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* LINHA 1, COLUNA 2: SINTOMA INICIAL / COMPLEMENTO */}
            <div ref={sintomaContainerRef} className="relative">
              <label
                className="block uppercase font-semibold mb-1.5 tracking-wider"
                style={{ fontSize: '11px', color: '#3a4245' }}
              >
                SINTOMA INICIAL / COMPLEMENTO
              </label>

              <div className="relative">
                <input
                  ref={sintomaInputRef}
                  type="text"
                  value={sintomaInput}
                  onFocus={() => {
                    if (temCatalogoParaTag && !itemCatalogoEscolhido) {
                      setSintomaDropdownOpen(true);
                    }
                  }}
                  onChange={(e) => {
                    setSintomaInput(e.target.value);
                    if (temCatalogoParaTag && !itemCatalogoEscolhido) {
                      setSintomaDropdownOpen(true);
                    }
                  }}
                  placeholder={
                    itemCatalogoEscolhido
                      ? 'Complemento (opcional)'
                      : !equipamentoEscolhido
                      ? 'Ex: Vazamento hidráulico, Falha elétrica...'
                      : temCatalogoParaTag
                      ? 'Buscar código ou sintoma...'
                      : 'Descreva o sintoma em texto livre...'
                  }
                  className="w-full h-[44px] pl-3.5 pr-10 text-[13px] text-[#1f2426] placeholder-[#8a9490] bg-[#f2f3f2] border border-[#d9dedb] rounded-[8px] focus:bg-white focus:border-[#004d2c] focus:outline-none focus:ring-2 focus:ring-[#004d2c]/15 transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={!temCatalogoParaTag}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!temCatalogoParaTag) return;
                    setSintomaDropdownOpen(prev => !prev);
                    sintomaInputRef.current?.focus();
                  }}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md ${
                    temCatalogoParaTag
                      ? 'text-[#3a4245] hover:text-[#004d2c] cursor-pointer'
                      : 'text-[#b5bcbd] cursor-not-allowed'
                  }`}
                  title={temCatalogoParaTag ? 'Ver códigos do catálogo de falhas' : 'Escolha uma TAG com catálogo'}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-150 ${
                      sintomaDropdownOpen ? 'rotate-180 text-[#004d2c]' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Etiqueta verde-clara quando um item do catálogo foi escolhido */}
              {itemCatalogoEscolhido ? (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#e8f3ee] border border-[#b7dccb] text-[11px] text-[#004d2c] max-w-full">
                  <span className="font-mono font-bold bg-[#004d2c] text-white px-1.5 py-0.5 rounded text-[10px] shrink-0">
                    {itemCatalogoEscolhido.sintomaCodigo}
                  </span>
                  <span className="font-medium truncate">
                    <strong className="font-bold">{itemCatalogoEscolhido.sintomaNome}</strong>
                    {` · ${itemCatalogoEscolhido.sistemaCodigo} ${itemCatalogoEscolhido.sistemaNome} › ${itemCatalogoEscolhido.componenteCodigo} ${itemCatalogoEscolhido.componenteNome}`}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoverItemCatalogo}
                    className="ml-1 text-[#004d2c] hover:text-red-600 font-bold text-[14px] leading-none cursor-pointer shrink-0"
                    title="Remover código do catálogo"
                  >
                    ×
                  </button>
                </div>
              ) : (
                /* Texto de ajuda abaixo do campo SINTOMA */
                <p className="mt-1 text-[11px] text-[#5c666a] leading-snug">
                  {!equipamentoEscolhido
                    ? 'Escolha a TAG primeiro para ver os códigos.'
                    : temCatalogoParaTag
                    ? 'Toque na setinha para ver os códigos ou digite para filtrar.'
                    : 'Sem catálogo: descreva em texto livre.'}
                </p>
              )}

              {/* Dropdown mais largo (até 460px, alinhado à direita no desktop, max-h 340px) */}
              {sintomaDropdownOpen && temCatalogoParaTag && (
                <div className="absolute right-0 z-50 mt-1 w-full min-[560px]:w-[460px] max-w-[92vw] bg-white border border-[#d9dedb] rounded-[10px] shadow-2xl max-h-[340px] overflow-y-auto">
                  {sistemasFiltradosAgrupados.length === 0 ? (
                    <div className="p-3.5 text-[12px] text-[#5c666a]">
                      Nada no catálogo para &lsquo;<strong className="text-[#1f2426]">{sintomaInput}</strong>&rsquo;. Pode continuar escrevendo em texto livre.
                    </div>
                  ) : (
                    sistemasFiltradosAgrupados.map((grupo) => (
                      <div key={grupo.cabecalho}>
                        <div className="sticky top-0 z-10 px-3 py-1.5 bg-[#f2f3f2] border-y border-[#e3e7e4] text-[10px] font-bold uppercase tracking-wider text-[#5c666a]">
                          {grupo.cabecalho}
                        </div>
                        <div className="divide-y divide-[#f2f3f2]">
                          {grupo.itens.map((item) => (
                            <button
                              key={item.codigoCompleto}
                              type="button"
                              onMouseDown={(e) => {
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

            {/* LINHA 2, COLUNA 1: HORA REAL DA PARADA * */}
            <div>
              <label
                className="block uppercase font-semibold mb-1.5 tracking-wider"
                style={{ fontSize: '11px', color: '#3a4245' }}
              >
                HORA REAL DA PARADA *
              </label>
              <input
                type="datetime-local"
                required
                value={horaRealParada}
                onChange={(e) => setHoraRealParada(e.target.value)}
                className="w-full h-[44px] px-3.5 text-[13px] text-[#1f2426] bg-[#f2f3f2] border border-[#d9dedb] rounded-[8px] focus:bg-white focus:border-[#004d2c] focus:outline-none focus:ring-2 focus:ring-[#004d2c]/15 transition-all"
              />
            </div>

            {/* LINHA 2, COLUNA 2: Nº DA ORDEM DE SERVIÇO (OPCIONAL) */}
            <div>
              <label
                className="block uppercase font-semibold mb-1.5 tracking-wider"
                style={{ fontSize: '11px', color: '#3a4245' }}
              >
                Nº DA ORDEM DE SERVIÇO (OPCIONAL)
              </label>
              <input
                type="text"
                value={ordemServico}
                onChange={(e) => setOrderServico(e.target.value)}
                placeholder="Ex: 4796854"
                className="w-full h-[44px] px-3.5 text-[13px] text-[#1f2426] placeholder-[#8a9490] bg-[#f2f3f2] border border-[#d9dedb] rounded-[8px] focus:bg-white focus:border-[#004d2c] focus:outline-none focus:ring-2 focus:ring-[#004d2c]/15 transition-all"
              />
            </div>

            {/* LINHA 3, COLUNA 1: STATUS INICIAL (CÓDIGO VALE) */}
            <div>
              <label
                className="block uppercase font-semibold mb-1.5 tracking-wider"
                style={{ fontSize: '11px', color: '#3a4245' }}
              >
                STATUS INICIAL (CÓDIGO VALE)
              </label>
              <select
                value={statusInicial}
                onChange={(e) => setStatusInicial(e.target.value)}
                className="w-full h-[44px] px-3 text-[13px] font-medium text-[#1f2426] bg-[#f2f3f2] border border-[#d9dedb] rounded-[8px] focus:bg-white focus:border-[#004d2c] focus:outline-none focus:ring-2 focus:ring-[#004d2c]/15 transition-all"
              >
                {CODIGOS_VALE_FLAT.map((c) => (
                  <option key={c.codigo} value={c.codigo}>
                    {c.codigo} – {c.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* LINHA 3, COLUNA 2: PREVISÃO DE LIBERAÇÃO */}
            <div>
              <label
                className="block uppercase font-semibold mb-1.5 tracking-wider"
                style={{ fontSize: '11px', color: '#3a4245' }}
              >
                PREVISÃO DE LIBERAÇÃO
              </label>
              <input
                type="datetime-local"
                value={previsaoLiberacao}
                onChange={(e) => setPrevisaoLiberacao(e.target.value)}
                className="w-full h-[44px] px-3.5 text-[13px] text-[#1f2426] bg-[#f2f3f2] border border-[#d9dedb] rounded-[8px] focus:bg-white focus:border-[#004d2c] focus:outline-none focus:ring-2 focus:ring-[#004d2c]/15 transition-all"
              />
            </div>
          </div>

          {/* Alerta se já existir Parada ABERTA para a mesma TAG */}
          {paradaAbertaMesmaTag && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-amber-900">
                    Já existe parada aberta para esta TAG ({paradaAbertaMesmaTag.tag})
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Aberta por {paradaAbertaMesmaTag.criadoPor || 'Admin'} às{' '}
                    {new Date(paradaAbertaMesmaTag.inicioParada).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    . Não será criada parada duplicada.
                  </p>
                </div>
              </div>
              {onAbrirParadaExistente && (
                <button
                  type="button"
                  onClick={() => onAbrirParadaExistente(paradaAbertaMesmaTag)}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  Abrir parada existente <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Opção extra para técnico iniciar atendimento imediatamente ao abrir */}
          {modoTecnico && !paradaAbertaMesmaTag && (
            <label className="flex items-center gap-2.5 pt-1 text-[12px] text-[#3a4245] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={iniciarAgora}
                onChange={(e) => setIniciarAgora(e.target.checked)}
                className="w-4 h-4 accent-[#004d2c] rounded cursor-pointer"
              />
              <span>Já iniciar meu atendimento imediatamente após abrir esta parada</span>
            </label>
          )}

          {/* Rodapé com linha divisória e botões Cancelar e Confirmar abertura */}
          <div className="pt-4 border-t border-[#e3e7e4] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 h-[42px] bg-[#eef0ef] hover:bg-[#e1e5e3] text-[#3a4245] text-[13px] font-semibold rounded-[8px] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ backgroundColor: '#004d2c', color: '#ffffff' }}
              className="px-5 h-[42px] hover:opacity-95 text-white text-[13px] font-semibold rounded-[8px] transition-opacity cursor-pointer shadow-sm"
            >
              {paradaAbertaMesmaTag ? 'Ver parada aberta' : 'Confirmar abertura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
