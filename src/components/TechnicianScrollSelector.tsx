import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, ChevronDown, Check, Search, X, Edit3, Sparkles } from 'lucide-react';
import { Tecnico } from '../types';
import {
  classificarGrupoFuncao,
  formatarNomeSobrenome,
  isTecnicoDeCampo,
  normalizarMatricula,
  removerAcentos
} from '../lib/uEmDataUtils';

export interface TechnicianScrollSelectorProps {
  tecnicos: Tecnico[];
  selectedNome: string;
  selectedFuncao?: string;
  selectedMatricula?: string;
  selectedGrupo?: string;
  onChange: (nome: string, funcao: string, matricula?: string, grupo?: string) => void;
  isAdmin?: boolean;
  label?: string;
  placeholder?: string;
}

const CHIPS_FILTRO = [
  'TODOS',
  'MECÂNICO',
  'ELETRICISTA',
  'LUBRIFICADOR',
  'BORRACHEIRO',
  'SOLDADOR',
  'INSPETOR',
  'AUXILIAR',
  'LAVADOR / PINTOR',
  'OPERADOR/MOTORISTA'
];

const CACHE_TECNICOS_KEY = 'rft_tecnicos_cache';
const ULTIMO_TECNICO_KEY = 'rft_ultimo_tecnico';

export function TechnicianScrollSelector({
  tecnicos,
  selectedNome,
  selectedFuncao = 'Mecânico',
  selectedMatricula = '',
  selectedGrupo = '',
  onChange,
  isAdmin = false,
  label = 'TÉCNICO RESPONSÁVEL'
}: TechnicianScrollSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<string>('TODOS');
  const [ultimoTecnicoSalvo, setUltimoTecnicoSalvo] = useState<{
    nome: string;
    funcao: string;
    matricula: string;
    grupo: string;
  } | null>(null);

  // Modo digitar manual apenas permitido para Admin
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customFuncao] = useState('Mecânico');
  const [customMatricula, setCustomMatricula] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza cache local de técnicos para uso offline e carrega último técnico usado
  const listaComCache = useMemo(() => {
    if (tecnicos && tecnicos.length > 0) {
      try {
        localStorage.setItem(CACHE_TECNICOS_KEY, JSON.stringify(tecnicos));
        localStorage.setItem('tecnicos', JSON.stringify(tecnicos));
      } catch {
        // Ignora erro de quota
      }
      return tecnicos;
    }
    try {
      const cached = localStorage.getItem(CACHE_TECNICOS_KEY) || localStorage.getItem('tecnicos');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as Tecnico[];
      }
    } catch {
      // Ignora erro de parse
    }
    return [];
  }, [tecnicos]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ULTIMO_TECNICO_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.nome) {
          setUltimoTecnicoSalvo(parsed);
        }
      }
    } catch {
      // Ignora erro
    }
  }, [isOpen]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Normaliza e filtra técnicos elegíveis:
  // Mostrar os técnicos ATIVOS dos grupos de campo (nunca mostrar Supervisão ou Administrativo no seletor de atendimento)
  const tecnicosElegiveis = useMemo(() => {
    return listaComCache
      .map((tec) => {
        const grupoCalculado = tec.grupo || classificarGrupoFuncao(tec.funcao || 'Mecânico');
        return {
          ...tec,
          nome: formatarNomeSobrenome(tec.nome || ''),
          matricula: normalizarMatricula(tec.matricula),
          grupo: grupoCalculado
        };
      })
      .filter((tec) => {
        if (!tec.nome) return false;
        if (tec.status === 'inativo') return false;
        if (!isAdmin) {
          if (!isTecnicoDeCampo(tec.grupo)) return false;
        } else {
          // Mesmo para Admin no seletor de equipe operacional, exclui Supervisão e Administrativo
          if (tec.grupo === 'SUPERVISÃO' || tec.grupo === 'ADMINISTRATIVO') return false;
        }
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [listaComCache, isAdmin]);

  // Contagem por grupo para exibir nos chips
  const contagemPorChip = useMemo(() => {
    const counts: Record<string, number> = { TODOS: tecnicosElegiveis.length };
    CHIPS_FILTRO.forEach((chip) => {
      if (chip !== 'TODOS') counts[chip] = 0;
    });
    tecnicosElegiveis.forEach((tec) => {
      const g = (tec.grupo || 'MECÂNICO').toUpperCase();
      if (counts[g] !== undefined) {
        counts[g] += 1;
      }
    });
    return counts;
  }, [tecnicosElegiveis]);

  const filteredTecnicos = useMemo(() => {
    const sNorm = removerAcentos(search);
    return tecnicosElegiveis.filter((tec) => {
      const nomeNorm = removerAcentos(tec.nome);
      const matNorm = (tec.matricula || '').trim();
      const cargoNorm = removerAcentos(tec.funcao || '');
      const grupoNorm = removerAcentos(tec.grupo || '');

      const matchesSearch =
        !sNorm ||
        nomeNorm.includes(sNorm) ||
        matNorm.includes(sNorm) ||
        cargoNorm.includes(sNorm) ||
        grupoNorm.includes(sNorm);

      if (!matchesSearch) return false;

      if (activeChip === 'TODOS') return true;
      return (tec.grupo || '').toUpperCase() === activeChip.toUpperCase();
    });
  }, [tecnicosElegiveis, search, activeChip]);

  // Verifica se o último técnico salvo no aparelho está disponível na lista de elegíveis
  const sugestaoUltimoTecnico = useMemo(() => {
    if (!ultimoTecnicoSalvo?.nome) return null;
    const encontrado = tecnicosElegiveis.find(
      (t) =>
        (ultimoTecnicoSalvo.matricula && t.matricula === normalizarMatricula(ultimoTecnicoSalvo.matricula)) ||
        removerAcentos(t.nome) === removerAcentos(ultimoTecnicoSalvo.nome)
    );
    return encontrado || null;
  }, [ultimoTecnicoSalvo, tecnicosElegiveis]);

  const handleSelect = (tec: Tecnico) => {
    const nomeFmt = formatarNomeSobrenome(tec.nome);
    const matFmt = normalizarMatricula(tec.matricula);
    const grupoFmt = tec.grupo || classificarGrupoFuncao(tec.funcao || 'Mecânico');
    const funcaoFmt = tec.funcao || 'Mecânico';

    try {
      localStorage.setItem(
        ULTIMO_TECNICO_KEY,
        JSON.stringify({
          nome: nomeFmt,
          funcao: funcaoFmt,
          matricula: matFmt,
          grupo: grupoFmt
        })
      );
      setUltimoTecnicoSalvo({
        nome: nomeFmt,
        funcao: funcaoFmt,
        matricula: matFmt,
        grupo: grupoFmt
      });
    } catch {
      // Ignora erro
    }

    onChange(nomeFmt, funcaoFmt, matFmt, grupoFmt);
    setIsOpen(false);
    setIsCustomMode(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', 'Mecânico', '', '');
    setCustomName('');
    setIsCustomMode(false);
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customName.trim()) {
      onChange(
        formatarNomeSobrenome(customName.trim()),
        customFuncao,
        normalizarMatricula(customMatricula.trim()),
        'OUTROS'
      );
      setIsCustomMode(false);
      setIsOpen(false);
    }
  };

  const getGrupoBadge = (grupo?: string) => {
    const g = (grupo || 'MECÂNICO').toUpperCase();
    if (g.includes('MECÂNICO') || g.includes('MECANICO')) {
      return { bg: 'bg-[#19502F]/10 text-[#19502F] border-[#19502F]/20' };
    }
    if (g.includes('ELETRICISTA')) {
      return { bg: 'bg-[#E2A937]/15 text-[#B5872C] border-[#E2A937]/30' };
    }
    if (g.includes('LUBRIFICADOR')) {
      return { bg: 'bg-[#466C53]/15 text-[#466C53] border-[#466C53]/30' };
    }
    if (g.includes('BORRACHEIRO')) {
      return { bg: 'bg-[#FF7725]/15 text-[#C44A00] border-[#FF7725]/30' };
    }
    if (g.includes('SOLDADOR')) {
      return { bg: 'bg-[#1E88E5]/15 text-[#1565C0] border-[#1E88E5]/30' };
    }
    if (g.includes('INSPETOR')) {
      return { bg: 'bg-[#8E24AA]/15 text-[#6A1B9A] border-[#8E24AA]/30' };
    }
    return { bg: 'bg-[#575756]/10 text-[#575756] border-[#575756]/20' };
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Se modo manual estiver ativo (somente Admin) */}
      {isCustomMode && isAdmin ? (
        <div className="p-3.5 bg-[var(--um-fundo)] border border-[var(--um-verde-principal)] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--um-verde-principal)] uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" /> Digitar Nome Manualmente (Admin)
            </span>
            <button
              type="button"
              onClick={() => setIsCustomMode(false)}
              className="text-[11px] text-[var(--um-cinza-texto)] hover:text-[var(--um-verde-principal)] font-medium underline cursor-pointer"
            >
              Voltar para Lista
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nome completo..."
                className="w-full px-3 py-2 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-lg text-[13px] text-[var(--um-cinza-texto)] focus:outline-none focus:border-[var(--um-verde-principal)]"
                autoFocus
              />
            </div>
            <div>
              <input
                type="text"
                value={customMatricula}
                onChange={(e) => setCustomMatricula(e.target.value)}
                placeholder="Matrícula..."
                className="w-full px-3 py-2 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-lg text-[13px] text-[var(--um-cinza-texto)] focus:outline-none focus:border-[var(--um-verde-principal)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleApplyCustom}
              className="px-3 py-1.5 bg-[var(--um-verde-principal)] text-[var(--um-branco)] text-[12px] font-medium rounded-lg cursor-pointer hover:bg-[var(--um-verde-secundario)]"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : (
        /* Seletor Principal (Itens grandes para toque com luva) */
        <div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full px-3.5 py-3 bg-[var(--um-branco)] border rounded-xl flex items-center justify-between transition-all cursor-pointer text-left shadow-xs min-h-[52px] ${
              isOpen
                ? 'border-[var(--um-verde-principal)] ring-2 ring-[var(--um-verde-principal)]/20'
                : selectedNome
                ? 'border-[var(--um-verde-secundario)]'
                : 'border-[var(--um-cinza-claro)] hover:border-[var(--um-cinza-texto)]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  selectedNome
                    ? 'bg-[var(--um-verde-principal)] text-white'
                    : 'bg-[var(--um-fundo)] text-[var(--um-cinza-texto)]'
                }`}
              >
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                {selectedNome ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[14px] text-[var(--um-cinza-escuro)]">
                      {formatarNomeSobrenome(selectedNome)}
                    </span>
                    {selectedMatricula && (
                      <span className="text-[11px] font-mono text-[var(--um-cinza-texto)] bg-[var(--um-fundo)] px-2 py-0.5 rounded border border-[var(--um-cinza-claro)]">
                        Mat. {normalizarMatricula(selectedMatricula)}
                      </span>
                    )}
                    {(selectedGrupo || selectedFuncao) && (
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          getGrupoBadge(selectedGrupo || classificarGrupoFuncao(selectedFuncao)).bg
                        }`}
                      >
                        {selectedGrupo || classificarGrupoFuncao(selectedFuncao)}
                        {selectedFuncao ? ` · ${formatarNomeSobrenome(selectedFuncao)}` : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[13px] text-[var(--um-cinza-texto)] font-light">
                    Selecione o {label.toLowerCase()}...
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {selectedNome && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 text-[var(--um-cinza-texto)] hover:text-[var(--um-negativo)] rounded transition-colors"
                  title="Limpar seleção"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-[var(--um-cinza-texto)] transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
        </div>
      )}

      {/* DROPDOWN FLUTUANTE */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* SUGESTÃO DO ÚLTIMO TÉCNICO USADO NESTE APARELHO */}
          {sugestaoUltimoTecnico && sugestaoUltimoTecnico.nome !== selectedNome && !search && (
            <div className="px-3 py-2 bg-emerald-50/90 border-b border-emerald-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-[11px] text-emerald-800 truncate">
                  Último usado neste aparelho:{' '}
                  <strong className="font-bold">{sugestaoUltimoTecnico.nome}</strong>
                  {sugestaoUltimoTecnico.matricula ? ` (Mat. ${sugestaoUltimoTecnico.matricula})` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelect(sugestaoUltimoTecnico)}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shrink-0 cursor-pointer"
              >
                Usar este
              </button>
            </div>
          )}

          {/* BARRA DE PESQUISA */}
          <div className="p-3 bg-[var(--um-fundo)] border-b border-[var(--um-cinza-claro)] space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--um-cinza-texto)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou matrícula (ex.: 025918)..."
                className="w-full pl-9 pr-8 py-2.5 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-xl text-[13px] text-[var(--um-cinza-escuro)] placeholder-[var(--um-cinza-texto)]/70 focus:outline-none focus:border-[var(--um-verde-principal)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--um-cinza-texto)] hover:text-[var(--um-cinza-escuro)]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* CHIPS DE FILTRO POR GRUPO COM QUANTIDADE */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {CHIPS_FILTRO.map((chip) => {
                const count = contagemPorChip[chip] ?? 0;
                if (chip !== 'TODOS' && count === 0) return null;
                const isActive = activeChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setActiveChip(chip)}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap cursor-pointer transition-colors border flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] border-[var(--um-verde-principal)]'
                        : 'bg-[var(--um-branco)] text-[var(--um-cinza-texto)] border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-secundario)]'
                    }`}
                  >
                    <span>{chip}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTA DE TÉCNICOS (Itens grandes para toque com luva) */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[var(--um-cinza-claro)]/50">
            {tecnicosElegiveis.length === 0 ? (
              <div className="p-6 text-center text-[var(--um-cinza-texto)] space-y-2">
                <p className="text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Nenhum técnico cadastrado. Peça ao Admin para importar a planilha de efetivo na aba TÉCNICOS.
                </p>
              </div>
            ) : filteredTecnicos.length === 0 ? (
              <div className="p-6 text-center text-[var(--um-cinza-texto)] space-y-1">
                <p className="text-[13px] font-medium">Nenhum técnico encontrado para esse filtro.</p>
                <p className="text-[11px]">Tente limpar a busca ou selecionar o grupo TODOS.</p>
              </div>
            ) : (
              filteredTecnicos.map((tec) => {
                const isSelected = tec.nome === selectedNome;
                const grupoExibicao = tec.grupo || classificarGrupoFuncao(tec.funcao);
                const funcaoFormatada = formatarNomeSobrenome(tec.funcao || 'Mecânico');
                const badgeStyle = getGrupoBadge(grupoExibicao);
                return (
                  <button
                    key={tec.id || tec.matricula || tec.nome}
                    type="button"
                    onClick={() => handleSelect(tec)}
                    className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer min-h-[56px] ${
                      isSelected
                        ? 'bg-[var(--um-verde-principal)]/10 text-[var(--um-verde-principal)]'
                        : 'hover:bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)]'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[14px] text-[var(--um-cinza-escuro)]">
                          {tec.nome}
                        </span>
                        {tec.matricula && (
                          <span className="text-[11px] font-mono font-semibold text-[var(--um-cinza-texto)] bg-[var(--um-fundo)] px-2 py-0.5 rounded border border-[var(--um-cinza-claro)]">
                            Mat. {tec.matricula}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeStyle.bg}`}>
                          {grupoExibicao} · {funcaoFormatada}
                        </span>
                        {tec.secao && (
                          <span className="text-[11px] text-[var(--um-cinza-texto)] truncate">
                            {tec.secao}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-5 h-5 text-[var(--um-verde-principal)] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* RODAPÉ DO DROPDOWN */}
          <div className="p-2.5 bg-[var(--um-fundo)] border-t border-[var(--um-cinza-claro)] flex items-center justify-between text-[11px] text-[var(--um-cinza-texto)]">
            <span>
              Mostrando <strong className="font-medium">{filteredTecnicos.length}</strong> de{' '}
              {tecnicosElegiveis.length} técnicos ativos de campo
            </span>

            {/* Botão de digitação manual apenas para Admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setIsOpen(false);
                }}
                className="text-[var(--um-verde-principal)] hover:underline font-medium cursor-pointer"
              >
                Digitar outro nome
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const SeletorTecnico = TechnicianScrollSelector;
