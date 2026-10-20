import React, { useState, useMemo } from 'react';
import { Report } from '../types';
import { formatarFalhaCard } from '../data/catalogoFalhas';
import { Check, Clock, HelpCircle, BarChart3 } from 'lucide-react';

interface ResumoOperacionalControleProps {
  reports: Report[];
}

type PeriodoFiltro = 'turno_atual' | 'hoje' | 'turno_dia' | 'turno_noite' | '7d';

function safeStr(val: any): string {
  if (val === undefined || val === null) return '—';
  const s = String(val).trim();
  return s === '' ? '—' : s;
}

function parseFrente(frente: any, equipName: any): 'EH' | 'CR' | 'PF' | 'INFRA' {
  const f = String(frente || '').toUpperCase().trim();
  const eq = String(equipName || '').toUpperCase().trim();
  if (f.includes('EH') || eq.startsWith('EH')) return 'EH';
  if (f.includes('CR') || eq.startsWith('CR')) return 'CR';
  if (f.includes('PF') || eq.startsWith('PF')) return 'PF';
  return 'INFRA';
}

function formatShortDate(dateStr?: string): string {
  if (!dateStr || !dateStr.includes('-')) return '—';
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

function getPriorityBadge(desc: string) {
  const d = (desc || '').toUpperCase();
  if (d.includes('URGENTE') || d.includes('CRÍTIC') || d.includes('CRITIC') || d.includes('PARAD') || d.includes('VAZAMENTO')) {
    return {
      label: 'ALTA',
      cls: 'bg-[var(--um-negativo-claro)] text-[var(--um-negativo-escuro)] border border-[var(--um-negativo)]'
    };
  }
  if (d.includes('TROCA') || d.includes('REPARO') || d.includes('AJUSTE') || d.includes('FALHA')) {
    return {
      label: 'MÉDIA',
      cls: 'bg-[var(--um-alerta-claro)] text-[var(--um-alerta-escuro)] border border-[var(--um-alerta)]'
    };
  }
  return {
    label: 'NORMAL',
    cls: 'bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)]'
  };
}

export function ResumoOperacionalControle({ reports }: ResumoOperacionalControleProps) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('turno_atual');

  const { filteredReports, labelPeriodoAtivo } = useMemo(() => {
    const now = new Date();
    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const hojeStr = toYMD(now);
    const ontem = new Date(now);
    ontem.setDate(ontem.getDate() - 1);
    const ontemStr = toYMD(ontem);

    const seteDiasAtras = new Date(now);
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    const seteDiasStr = toYMD(seteDiasAtras);

    const horaAtual = now.getHours();
    const isTurnoDiaAgora = horaAtual >= 6 && horaAtual < 18;

    const validos = (reports || []).filter(
      (r) =>
        r &&
        (r.status === 'ENVIADO' ||
          r.status === 'PENDENTE_SINCRONIZACAO' ||
          r.status === 'SINCRONIZANDO')
    );

    const filtrados = validos.filter((r) => {
      const dStart = r.dateStart || (r.createdAt ? r.createdAt.slice(0, 10) : '');
      const shiftStr = (r.shift || '').toUpperCase();
      const isNoite = shiftStr.includes('18:00') || shiftStr.includes('NOITE') || shiftStr.includes('06:00');
      const isDia = !isNoite;

      if (periodo === 'hoje') {
        return dStart === hojeStr;
      }
      if (periodo === 'turno_dia') {
        return (dStart === hojeStr || dStart === ontemStr) && isDia;
      }
      if (periodo === 'turno_noite') {
        return (dStart === hojeStr || dStart === ontemStr) && isNoite;
      }
      if (periodo === 'turno_atual') {
        if (isTurnoDiaAgora) {
          return dStart === hojeStr && isDia;
        }
        return (dStart === hojeStr || dStart === ontemStr) && isNoite;
      }
      if (periodo === '7d') {
        return dStart >= seteDiasStr;
      }
      return true;
    });

    // Se o turno atual ainda não tiver relatórios enviados hoje, exibe os dos últimos 7 dias como fallback informativo se vazio?
    // Mantemos fiel ao filtro escolhido, mas se turno_atual estiver zerado e houver dados hoje, incluímos hoje.
    if (periodo === 'turno_atual' && filtrados.length === 0) {
      const hojeFallback = validos.filter((r) => {
        const dStart = r.dateStart || (r.createdAt ? r.createdAt.slice(0, 10) : '');
        return dStart === hojeStr || dStart >= seteDiasStr;
      });
      return {
        filteredReports: hojeFallback,
        labelPeriodoAtivo: isTurnoDiaAgora ? 'Turno atual (Dia 06h–18h)' : 'Turno atual (Noite 18h–06h)'
      };
    }

    const labels: Record<PeriodoFiltro, string> = {
      turno_atual: isTurnoDiaAgora ? 'Turno atual (Dia 06h–18h)' : 'Turno atual (Noite 18h–06h)',
      hoje: 'Hoje',
      turno_dia: 'Turno dia (06h–18h)',
      turno_noite: 'Turno noite (18h–06h)',
      '7d': 'Últimos 7 dias'
    };

    return { filteredReports: filtrados, labelPeriodoAtivo: labels[periodo] };
  }, [reports, periodo]);

  const {
    atendidosPorFrente,
    totalAtendidos,
    pendenciasPorFrente,
    totalPendencias,
    liberadosCount,
    emProgressoCount,
    donutTotal,
    ultimasManutencoes,
    pendenciasAbertas
  } = useMemo(() => {
    const atendFrente: Record<'EH' | 'CR' | 'PF' | 'INFRA', number> = {
      EH: 0,
      CR: 0,
      PF: 0,
      INFRA: 0
    };
    const pendFrente: Record<'EH' | 'CR' | 'PF' | 'INFRA', number> = {
      EH: 0,
      CR: 0,
      PF: 0,
      INFRA: 0
    };

    let liberados = 0;
    let emProgresso = 0;

    const manuts: Array<{
      id: string;
      equipamento: string;
      om: string;
      frente: 'EH' | 'CR' | 'PF' | 'INFRA';
      responsavel: string;
      horaInicio: string;
      horaFim: string;
      data: string;
      createdAt: string;
      falha?: any;
      liberado: boolean;
    }> = [];

    const pends: Array<{
      id: string;
      equipamento: string;
      descricao: string;
      frente: 'EH' | 'CR' | 'PF' | 'INFRA';
    }> = [];

    filteredReports.forEach((r) => {
      (r.atendimentos || []).forEach((at) => {
        if (!at.equipamento && !at.sintoma && !at.acaoExecutada) return;
        const f = parseFrente(r.frente, at.equipamento);
        atendFrente[f] += 1;
        const isLib = Boolean(at.horaFim && String(at.horaFim).trim() !== '');
        if (isLib) liberados += 1;
        else emProgresso += 1;

        manuts.push({
          id: at.id,
          equipamento: safeStr(at.equipamento),
          om: safeStr(at.om),
          frente: f,
          responsavel: safeStr(at.atuantes || r.tecnicoNome || r.mecanico || r.eletricista || r.mechanicUsername),
          horaInicio: safeStr(at.horaInicio),
          horaFim: safeStr(at.horaFim),
          data: r.dateStart || '',
          createdAt: r.createdAt || '',
          falha: at.falha,
          liberado: isLib
        });
      });

      (r.pendencias || []).forEach((p) => {
        if (!p.equipamento && !p.descricao) return;
        const f = parseFrente(r.frente, p.equipamento);
        pendFrente[f] += 1;
        pends.push({
          id: p.id,
          equipamento: safeStr(p.equipamento),
          descricao: safeStr(p.descricao),
          frente: f
        });
      });
    });

    manuts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const totAtend = Object.values(atendFrente).reduce((a, b) => a + b, 0);
    const totPend = Object.values(pendFrente).reduce((a, b) => a + b, 0);
    const dTotal = liberados + emProgresso + totPend;

    return {
      atendidosPorFrente: atendFrente,
      totalAtendidos: totAtend,
      pendenciasPorFrente: pendFrente,
      totalPendencias: totPend,
      liberadosCount: liberados,
      emProgressoCount: emProgresso,
      donutTotal: dTotal,
      ultimasManutencoes: manuts.slice(0, 15),
      pendenciasAbertas: pends.slice(0, 15)
    };
  }, [filteredReports]);

  return (
    <section className="space-y-4">
      {/* Cabeçalho do Resumo Operacional + Chips de Período */}
      <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] sm:text-[15px] font-black text-[var(--um-verde-principal)] uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--um-verde-principal)]" />
            RESUMO OPERACIONAL (SOMENTE LEITURA)
          </h2>
          <p className="text-[11px] text-[var(--um-cinza-texto)] mt-0.5">
            Exibindo indicadores de: <strong>{labelPeriodoAtivo}</strong>
          </p>
        </div>

        {/* Chips: Turno atual / Hoje / Turno dia / Turno noite / Últimos 7 dias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(
            [
              { id: 'turno_atual', label: 'Turno atual' },
              { id: 'hoje', label: 'Hoje' },
              { id: 'turno_dia', label: 'Turno dia' },
              { id: 'turno_noite', label: 'Turno noite' },
              { id: '7d', label: 'Últimos 7 dias' }
            ] as { id: PeriodoFiltro; label: string }[]
          ).map((chip) => {
            const active = periodo === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setPeriodo(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition cursor-pointer border ${
                  active
                    ? 'bg-[var(--um-verde-principal)] text-white border-[var(--um-verde-principal)] shadow-2xs'
                    : 'bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-secundario)]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 CARDS DE INDICADORES (1 col no celular, 2–3 no PC) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CARD 1: ATENDIDOS POR FRENTE */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] uppercase font-bold text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
                <span>Atendidos Por Frente</span>
              </h3>
              <span className="text-[11px] bg-[var(--um-fundo)] text-[var(--um-verde-principal)] font-bold px-2.5 py-0.5 rounded-lg border border-[var(--um-cinza-claro)]">
                Total: {totalAtendidos}
              </span>
            </div>

            <div className="space-y-3 my-2">
              {(['EH', 'CR', 'PF', 'INFRA'] as const).map((frente) => {
                const val = atendidosPorFrente[frente];
                const maxVal = Math.max(...Object.values(atendidosPorFrente), 1);
                const pct = totalAtendidos === 0 ? 0 : (val / maxVal) * 100;
                return (
                  <div key={frente} className="space-y-1">
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="font-bold text-[var(--um-cinza-escuro)]">{frente}</span>
                      <strong className="text-[var(--um-verde-principal)] font-bold">{val} atend.</strong>
                    </div>
                    <div className="relative h-2.5 bg-[var(--um-fundo)] rounded-full overflow-hidden border border-[var(--um-cinza-claro)]">
                      <div
                        className="absolute top-0 left-0 h-full bg-[var(--um-verde-principal)] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-[10px] text-[var(--um-cinza-texto)] uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-2.5 mt-3">
            Categorizado por TAG de máquina
          </div>
        </div>

        {/* CARD 2: PENDÊNCIAS POR FRENTE */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[13px] uppercase font-bold text-[var(--um-negativo-escuro)] tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[var(--um-negativo)] rounded-xs"></span>
                <span>Pendências Por Frente</span>
              </h3>
              <span className="text-[11px] bg-[var(--um-negativo-claro)] text-[var(--um-negativo-escuro)] font-bold px-2.5 py-0.5 rounded-lg border border-[var(--um-negativo)]">
                Abertas: {totalPendencias}
              </span>
            </div>

            {totalPendencias === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-[var(--um-positivo)] text-[12px] font-medium uppercase text-center p-4">
                <Check className="w-6 h-6 mb-1 text-[var(--um-positivo)]" />
                <span>Nenhuma pendência no período</span>
              </div>
            ) : (
              <div className="space-y-3 my-2">
                {(['EH', 'CR', 'PF', 'INFRA'] as const).map((frente) => {
                  const val = pendenciasPorFrente[frente];
                  const maxVal = Math.max(...Object.values(pendenciasPorFrente), 1);
                  const pct = (val / maxVal) * 100;
                  return (
                    <div key={frente} className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-bold text-[var(--um-cinza-escuro)]">{frente}</span>
                        <strong className="text-[var(--um-negativo-escuro)] font-bold">{val} pend.</strong>
                      </div>
                      <div className="relative h-2.5 bg-[var(--um-fundo)] rounded-full overflow-hidden border border-[var(--um-cinza-claro)]">
                        <div
                          className="absolute top-0 left-0 h-full bg-[var(--um-negativo)] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-[10px] text-[var(--um-cinza-texto)] uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-2.5 mt-3">
            Atenção operacional por setor
          </div>
        </div>

        {/* CARD 3: STATUS GERAL DOS EQUIPAMENTOS (DONUT) */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div>
            <h3 className="text-[13px] uppercase font-bold text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
              <span>Status Geral dos Equipamentos</span>
            </h3>

            {donutTotal === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-[var(--um-cinza-texto)] text-[12px] uppercase text-center p-4">
                <HelpCircle className="w-7 h-7 text-[var(--um-cinza-claro)] mb-1.5" />
                <span>Sem dados no período</span>
              </div>
            ) : (
              <div className="flex items-center gap-4 py-2">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--um-cinza-claro)" strokeWidth="3.5" />
                    {(() => {
                      const pCleared = (liberadosCount / donutTotal) * 100;
                      const pInProgress = (emProgressoCount / donutTotal) * 100;
                      const pPending = (totalPendencias / donutTotal) * 100;
                      let currentOffset = 0;

                      const dashGreen = `${pCleared} ${100 - pCleared}`;
                      const offsetGreen = 0;
                      currentOffset += pCleared;

                      const dashYellow = `${pInProgress} ${100 - pInProgress}`;
                      const offsetYellow = -currentOffset;
                      currentOffset += pInProgress;

                      const dashRed = `${pPending} ${100 - pPending}`;
                      const offsetRed = -currentOffset;

                      return (
                        <>
                          {pCleared > 0 && (
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="var(--um-positivo)"
                              strokeWidth="4.5"
                              strokeDasharray={dashGreen}
                              strokeDashoffset={offsetGreen}
                            />
                          )}
                          {pInProgress > 0 && (
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="var(--um-alerta)"
                              strokeWidth="4.5"
                              strokeDasharray={dashYellow}
                              strokeDashoffset={offsetYellow}
                            />
                          )}
                          {pPending > 0 && (
                            <circle
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="none"
                              stroke="var(--um-negativo)"
                              strokeWidth="4.5"
                              strokeDasharray={dashRed}
                              strokeDashoffset={offsetRed}
                            />
                          )}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[var(--um-cinza-escuro)]">{donutTotal}</span>
                    <span className="text-[9px] uppercase text-[var(--um-cinza-texto)] tracking-wider">Total</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-[12px]">
                  <div className="flex justify-between items-center text-[var(--um-cinza-texto)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--um-positivo)]"></span> Liberados:
                    </span>
                    <strong className="text-[var(--um-cinza-escuro)] font-bold">{liberadosCount}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[var(--um-cinza-texto)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--um-alerta)]"></span> Em Progresso:
                    </span>
                    <strong className="text-[var(--um-cinza-escuro)] font-bold">{emProgressoCount}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[var(--um-cinza-texto)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--um-negativo)]"></span> Pendências:
                    </span>
                    <strong className="text-[var(--um-negativo-escuro)] font-bold">{totalPendencias}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="text-[10px] text-[var(--um-cinza-texto)] uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-2.5 mt-3">
            Disponibilidade da frota
          </div>
        </div>
      </div>

      {/* TABELAS SOMENTE LEITURA: ÚLTIMAS MANUTENÇÕES + PENDÊNCIAS ABERTAS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* ÚLTIMAS MANUTENÇÕES DOS EQUIPAMENTOS */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs xl:col-span-7 flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--um-cinza-claro)] mb-3">
            <h3 className="text-[13px] sm:text-[14px] uppercase font-bold text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
              <span>Últimas Manutenções dos Equipamentos</span>
            </h3>
            <span className="text-[11px] text-[var(--um-cinza-texto)] uppercase">
              {ultimasManutencoes.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            {ultimasManutencoes.length === 0 ? (
              <div className="py-8 text-center text-[var(--um-cinza-texto)] uppercase text-[12px]">
                Nenhuma manutenção registrada neste período.
              </div>
            ) : (
              <table className="w-full text-left text-[12px] min-w-[520px]">
                <thead>
                  <tr className="border-b border-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] uppercase text-[11px] tracking-wider">
                    <th className="pb-2">Equipamento</th>
                    <th className="pb-2">OM</th>
                    <th className="pb-2">Frente</th>
                    <th className="pb-2">Responsável</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Data & Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--um-cinza-claro)]">
                  {ultimasManutencoes.map((at, idx) => (
                    <tr key={`${at.id}-${idx}`} className="hover:bg-[var(--um-fundo)]">
                      <td className="py-2.5 font-bold text-[var(--um-cinza-escuro)]">
                        <div>{at.equipamento}</div>
                        {at.falha && (
                          <div className="text-[10px] font-medium text-[#19502F] mt-0.5">
                            🔧 {formatarFalhaCard(at.falha)}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-[var(--um-cinza-texto)] font-mono">{at.om}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)]">
                          {at.frente}
                        </span>
                      </td>
                      <td className="py-2.5 text-[var(--um-cinza-texto)] truncate max-w-[130px]">{at.responsavel}</td>
                      <td className="py-2.5">
                        {at.liberado ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Liberado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            Em Progresso
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <div className="font-semibold text-[var(--um-cinza-escuro)]">{formatShortDate(at.data)}</div>
                        {at.horaInicio !== '—' && (
                          <div className="text-[11px] text-[var(--um-verde-principal)] flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {at.horaInicio}
                              {at.horaFim !== '—' ? ` - ${at.horaFim}` : ''}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* PENDÊNCIAS ABERTAS (SOMENTE LEITURA) */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center pb-3 border-b border-[var(--um-cinza-claro)] mb-3">
            <h3 className="text-[13px] sm:text-[14px] uppercase font-bold text-[var(--um-negativo-escuro)] tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[var(--um-negativo)] rounded-xs"></span>
              <span>Pendências Abertas</span>
            </h3>
            <span className="text-[11px] text-[var(--um-negativo-escuro)] bg-[var(--um-negativo-claro)] px-2.5 py-0.5 rounded-lg border border-[var(--um-negativo)] font-bold">
              TOTAL: {pendenciasAbertas.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            {pendenciasAbertas.length === 0 ? (
              <div className="py-8 text-center text-[var(--um-positivo)] uppercase text-[12px] bg-[var(--um-fundo)] rounded-xl border border-[var(--um-cinza-claro)]">
                ✅ Tudo limpo! Nenhuma pendência em aberto.
              </div>
            ) : (
              <table className="w-full text-left text-[12px] min-w-[340px]">
                <thead>
                  <tr className="border-b border-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] uppercase text-[11px] tracking-wider">
                    <th className="pb-2">Equipamento</th>
                    <th className="pb-2">Descrição</th>
                    <th className="pb-2">Frente</th>
                    <th className="pb-2 text-right">Prioridade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--um-cinza-claro)]">
                  {pendenciasAbertas.map((p, idx) => {
                    const prio = getPriorityBadge(p.descricao);
                    return (
                      <tr key={`${p.id}-${idx}`} className="hover:bg-[var(--um-fundo)]">
                        <td className="py-2.5 font-bold text-[var(--um-cinza-escuro)]">{p.equipamento}</td>
                        <td className="py-2.5 text-[var(--um-cinza-texto)] max-w-[160px] truncate" title={p.descricao}>
                          {p.descricao}
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)]">
                            {p.frente}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold ${prio.cls}`}>
                            {prio.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
