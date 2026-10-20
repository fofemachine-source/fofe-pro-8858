import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, ChevronDown, Check, Search, X, Edit3, Sparkles, Upload } from 'lucide-react';
import { Tecnico } from '../types';
import {
  classificarGrupoFuncao,
  formatarNomeSobrenome,
  isTecnicoDeCampo,
  normalizarGrupoTecnico,
  normalizarMatricula,
  removerAcentos
} from '../lib/uEmDataUtils';
import { getTecnicosIniciaisPadrao } from '../data/tecnicosIniciais';

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
  /** Se verdadeiro (ex.: sistema EL/AL ou perfil CREL), exibe a seção ELETRICISTA primeiro */
  priorizarEletricista?: boolean;
  onImportarClick?: () => void;
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
  'LAVADOR/PINTOR',
  'OPERADOR/MOTORISTA'
];

const ORDEM_GRUPOS_PADRAO = [
  'MECÂNICO',
  'ELETRICISTA',
  'LUBRIFICADOR',
  'BORRACHEIRO',
  'SOLDADOR',
  'INSPETOR',
  'AUXILIAR',
  'LAVADOR/PINTOR',
  'OPERADOR/MOTORISTA'
];

const ORDEM_GRUPOS_ELETRICA = [
  'ELETRICISTA',
  'MECÂNICO',
  'LUBRIFICADOR',
  'BORRACHEIRO',
  'SOLDADOR',
  'INSPETOR',
  'AUXILIAR',
  'LAVADOR/PINTOR',
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
  label = 'TÉCNICO RESPONSÁVEL',
  priorizarEletricista = false,
  onImportarClick
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

  // Sincroniza cache local de técnicos para uso offline e garante base padrão caso ainda não sincronizada
  const listaComCache = useMemo(() => {
    if (tecnicos && tecnicos.length > 5) {
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
        if (Array.isArray(parsed) && parsed.length > 5) return parsed as Tecnico[];
      }
    } catch {
      // Ignora erro de parse
    }
    const padrao = getTecnicosIniciaisPadrao();
    if (tecnicos && tecnicos.length > 0) {
      const porMat = new Map<string, Tecnico>();
      padrao.forEach(t => porMat.set(normalizarMatricula(t.matricula) || t.id, t));
      tecnicos.forEach(t => porMat.set(normalizarMatricula(t.matricula) || t.id, t));
      return Array.from(porMat.values());
    }
    return padrao;
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
  // Mostrar apenas os técnicos ATIVOS dos 9 grupos operacionais de campo (nunca mostrar Supervisão ou Administrativo no seletor de atendimento)
  const tecnicosElegiveis = useMemo(() => {
    return listaComCache
      .map((tec) => {
        const grupoNorm = normalizarGrupoTecnico(tec.grupo || '', tec.funcao || 'Mecânico');
        return {
          ...tec,
          nome: formatarNomeSobrenome(tec.nome || ''),
          funcao: formatarNomeSobrenome(tec.funcao || 'Mecânico'),
          matricula: normalizarMatricula(tec.matricula),
          grupo: grupoNorm
        };
      })
      .filter((tec) => {
        if (!tec.nome) return false;
        if (tec.status === 'inativo') return false;
        if (!isTecnicoDeCampo(tec.grupo)) return false;
        return true;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [listaComCache]);

  // Contagem por grupo para exibir nos chips e seções
  const contagemPorChip = useMemo(() => {
    const counts: Record<string, number> = { TODOS: tecnicosElegiveis.length };
    CHIPS_FILTRO.forEach((chip) => {
      if (chip !== 'TODOS') counts[chip] = 0;
    });
    tecnicosElegiveis.forEach((tec) => {
      const g = normalizarGrupoTecnico(tec.grupo || '', tec.funcao || 'Mecânico');
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
      const gNorm = normalizarGrupoTecnico(tec.grupo || '', tec.funcao || 'Mecânico');
      return gNorm === activeChip;
    });
  }, [tecnicosElegiveis, search, activeChip]);

  // Agrupamento em seções quando TODOS está selecionado
  const secoesPorGrupo = useMemo(() => {
    const ordem = priorizarEletricista ? ORDEM_GRUPOS_ELETRICA : ORDEM_GRUPOS_PADRAO;
    const mapa = new Map<string, Tecnico[]>();
    ordem.forEach(g => mapa.set(g, []));

    filteredTecnicos.forEach(tec => {
      const g = normalizarGrupoTecnico(tec.grupo || '', tec.funcao || 'Mecânico');
      if (!mapa.has(g)) mapa.set(g, []);
      mapa.get(g)!.push(tec);
    });

    return Array.from(mapa.entries())
      .filter(([, lista]) => lista.length > 0)
      .map(([grupo, lista]) => ({
        grupo,
        lista: lista.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      }));
  }, [filteredTecnicos, priorizarEletricista]);

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
    const grupoFmt = normalizarGrupoTecnico(tec.grupo || '', tec.funcao || 'Mecânico');
    const funcaoFmt = formatarNomeSobrenome(tec.funcao || 'Mecânico');

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

  const renderLinhaTecnico = (tec: Tecnico) => {
    const isSelected = tec.nome === selectedNome;
    const funcaoOriginal = formatarNomeSobrenome(tec.funcao || 'Mecânico');
    return (
      <button
        key={tec.id || tec.matricula || tec.nome}
        type="button"
        onClick={() => handleSelect(tec)}
        className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors cursor-pointer min-h-[52px] ${
          isSelected
            ? 'bg-[var(--um-verde-principal)]/10 text-[var(--um-verde-principal)]'
            : 'hover:bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)]'
        }`}
      >
        <div className="min-w-0 pr-3 flex items-center gap-2 flex-wrap">
          <span className="font-bold text-[14px] text-[var(--um-cinza-escuro)]">
            {tec.nome}
          </span>
          {tec.matricula && (
            <span className="text-[11px] font-mono font-semibold text-[var(--um-cinza-texto)] bg-[var(--um-fundo)] px-2 py-0.5 rounded border border-[var(--um-cinza-claro)]">
              Mat. {tec.matricula}
            </span>
          )}
          <span className="text-[12px] text-[var(--um-cinza-texto)]">
            {funcaoOriginal}
          </span>
        </div>

        {isSelected && (
          <Check className="w-4 h-4 text-[var(--um-verde-principal)] shrink-0" />
        )}
      </button>
    );
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
                    {selectedFuncao && (
                      <span className="text-[12px] text-[var(--um-cinza-texto)]">
                        {formatarNomeSobrenome(selectedFuncao)}
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

            {/* CHIPS DE FILTRO POR GRUPO COM QUANTIDADE (quebram em 2 linhas, sem barra horizontal) */}
            <div className="flex flex-wrap items-center gap-1.5">
              {CHIPS_FILTRO.map((chip) => {
                const count = contagemPorChip[chip] ?? 0;
                if (chip !== 'TODOS' && count === 0) return null;
                const isActive = activeChip === chip;
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setActiveChip(chip)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full cursor-pointer transition-colors border flex items-center gap-1 ${
                      isActive
                        ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] border-[var(--um-verde-principal)]'
                        : 'bg-[var(--um-branco)] text-[var(--um-cinza-texto)] border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-secundario)]'
                    }`}
                  >
                    <span>{chip}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full ${
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

          {/* LISTA DE TÉCNICOS */}
          <div className="max-h-80 overflow-y-auto">
            {tecnicosElegiveis.length === 0 ? (
              <div className="p-6 text-center text-[var(--um-cinza-texto)] space-y-3">
                <p className="text-[13px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Nenhum técnico cadastrado. Peça ao Admin para importar a lista na aba TÉCNICOS.
                </p>
                {isAdmin && onImportarClick && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onImportarClick();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--um-verde-principal)] text-white text-[12px] font-bold uppercase rounded-xl cursor-pointer hover:bg-[var(--um-verde-secundario)]"
                  >
                    <Upload className="w-3.5 h-3.5" /> Importar
                  </button>
                )}
              </div>
            ) : filteredTecnicos.length === 0 ? (
              <div className="p-6 text-center text-[var(--um-cinza-texto)] space-y-1">
                <p className="text-[13px] font-medium">Nenhum técnico encontrado para esse filtro.</p>
                <p className="text-[11px]">Tente limpar a busca ou selecionar o grupo TODOS.</p>
              </div>
            ) : activeChip === 'TODOS' ? (
              <div className="divide-y divide-[var(--um-cinza-claro)]/50">
                {secoesPorGrupo.map(({ grupo, lista }) => (
                  <div key={grupo}>
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#f2f3f2] border-y border-[var(--um-cinza-claro)]/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#004d2c]">
                        {grupo} ({lista.length})
                      </span>
                    </div>
                    <div className="divide-y divide-[var(--um-cinza-claro)]/40">
                      {lista.map(tec => renderLinhaTecnico(tec))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--um-cinza-claro)]/50">
                {filteredTecnicos.map(tec => renderLinhaTecnico(tec))}
              </div>
            )}
          </div>

          {/* RODAPÉ DO DROPDOWN */}
          <div className="p-2.5 bg-[var(--um-fundo)] border-t border-[var(--um-cinza-claro)] flex items-center justify-between text-[11px] text-[var(--um-cinza-texto)]">
            <span>
              Mostrando <strong className="font-medium">{filteredTecnicos.length}</strong> de{' '}
              {tecnicosElegiveis.length} técnicos de campo
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
