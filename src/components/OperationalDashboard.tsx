// @ts-nocheck
import React, { useState, useEffect, Component, ReactNode, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { mapFirestoreDocToReport } from '../lib/syncEngine';
import { Report, Atendimento, Pendencia, Preventiva, User, Parada } from '../types';
import { getSegmentoAtual, calcularDuracaoTotalParadaMinutos, calcularHorasPorResponsavel } from '../lib/paradasEngine';
import { CORES_RESPONSABILIDADE, NOMES_RESPONSABILIDADE, formatarMinutosEmHorasEMinutos } from '../theme/uEmTheme';
import { formatarFalhaCard, listarPerfis, getCatalogo } from '../data/catalogoFalhas';
import { formatDateTime } from './FileActions';
import { 
  BarChart, RefreshCw, Layers, Shield, Wrench, Clock, Users,
  AlertTriangle, CheckCircle2, PlayCircle, Eye, EyeOff, LayoutGrid, Calendar, LogOut,
  Tv, Minimize2, ChevronRight, TrendingUp, AlertOctagon, HelpCircle, Check, X,
  Filter, Search, RotateCcw, ArrowRight
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

// ==========================================
// ERROR BOUNDARY IMPLEMENTATION
// ==========================================
export class DashboardErrorBoundary extends Component<
  any,
  any
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Dashboard error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[var(--um-branco)] text-[var(--um-cinza-texto)] p-8 sm:p-10 rounded-2xl border border-[var(--um-cinza-claro)] text-center flex flex-col items-center justify-center min-h-[350px] font-sans shadow-xs">
          <div className="w-12 h-12 mb-4 rounded-xl bg-[var(--um-alerta-claro)] flex items-center justify-center border border-[var(--um-alerta)]">
            <span className="text-2xl" role="img" aria-label="Aviso">⚠️</span>
          </div>
          <h2 className="text-[18px] font-light uppercase text-[var(--um-verde-principal)] tracking-wide">
            ERRO AO CARREGAR O DASHBOARD
          </h2>
          <p className="text-[12px] font-normal text-[var(--um-cinza-texto)] mt-2 mb-6 max-w-md">
            Ocorreu uma instabilidade pontual no cálculo dos indicadores operacionais. Seus relatórios continuam íntegros no banco de dados.
          </p>
          <button 
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] font-light uppercase text-[12px] tracking-wider py-2.5 px-6 rounded-xl transition cursor-pointer shadow-xs"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Safe string normalization helper
function safeString(val: any): string {
  if (val === undefined || val === null) {
    return 'NÃO INFORMADO';
  }
  const s = String(val).trim();
  return s === '' ? 'NÃO INFORMADO' : s;
}

// Safe dateFormat to avoid any undefined index access on split
function safeDateFormat(dateStr: any): string {
  if (typeof dateStr !== 'string' || !dateStr.includes('-')) {
    return 'NÃO INFORMADO';
  }
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const day = safeString(parts[2]);
      const month = safeString(parts[1]);
      if (day === 'NÃO INFORMADO' || month === 'NÃO INFORMADO') {
        return 'NÃO INFORMADO';
      }
      return `${day}/${month}`;
    }
  } catch (e) {
    console.warn('Erro ao formatar data de forma segura:', e);
  }
  return 'NÃO INFORMADO';
}

interface OperationalDashboardProps {
  reports: Report[];
  isOffline: boolean;
  preventivas?: Preventiva[];
  onAddPreventiva?: (p: Omit<Preventiva, 'id' | 'createdAt'>) => void;
  onDeletePreventiva?: (id: string) => void;
  currentUser?: User;
  onSaveReport?: (updatedReport: Report) => void;
  paradas?: Parada[];
  onSelectParadasTab?: () => void;
}

export function OperationalDashboard({ 
  reports: initialReports, 
  isOffline,
  preventivas = [],
  onAddPreventiva,
  onDeletePreventiva,
  currentUser,
  onSaveReport,
  paradas = [],
  onSelectParadasTab
}: OperationalDashboardProps) {
  return (
    <DashboardErrorBoundary>
      <OperationalDashboardContent 
        reports={initialReports} 
        isOffline={isOffline} 
        preventivas={preventivas}
        onAddPreventiva={onAddPreventiva}
        onDeletePreventiva={onDeletePreventiva}
        currentUser={currentUser}
        onSaveReport={onSaveReport}
        paradas={paradas}
        onSelectParadasTab={onSelectParadasTab}
      />
    </DashboardErrorBoundary>
  );
}

function OperationalDashboardContent({ 
  reports: initialReports, 
  isOffline,
  preventivas = [],
  onAddPreventiva,
  onDeletePreventiva,
  currentUser,
  onSaveReport,
  paradas = [],
  onSelectParadasTab
}: OperationalDashboardProps) {
  // Real-time local firestore sync
  const [reports, setReports] = useState<Report[]>(initialReports || []);

  useEffect(() => {
    if (initialReports) {
      setReports(initialReports);
    }
  }, [initialReports]);
  const [loading, setLoading] = useState(true);
  const [isTvMode, setIsTvMode] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'today' | 'all'>('all');
  const [countdown, setCountdown] = useState(30);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString('pt-BR'));

  // Live timer for stopped equipment elapsed duration
  const [liveNow, setLiveNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Operational Date & Time Filters for Equipments & Maintenance
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterStartTime, setFilterStartTime] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterEndTime, setFilterEndTime] = useState<string>('');
  const [filterEquipTag, setFilterEquipTag] = useState<string>('');
  const [filterSistema, setFilterSistema] = useState<string>('');
  const [filterSintoma, setFilterSintoma] = useState<string>('');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');

  const opcoesSistemas = useMemo(() => {
    const mapa = new Map<string, string>();
    listarPerfis().forEach((perfil) => {
      getCatalogo(perfil).forEach((s) => {
        if (!mapa.has(s.codigo)) {
          mapa.set(s.codigo, `${s.codigo} – ${s.nome}`);
        }
      });
    });
    return Array.from(mapa.entries())
      .map(([codigo, label]) => ({ codigo, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const opcoesSintomas = useMemo(() => {
    const nomesSet = new Set<string>();
    listarPerfis().forEach((perfil) => {
      getCatalogo(perfil).forEach((s) => {
        s.componentes.forEach((c) => {
          c.sintomas.forEach((sin) => {
            if (sin.nome) nomesSet.add(sin.nome);
          });
        });
      });
    });
    return Array.from(nomesSet).sort((a, b) => a.localeCompare(b));
  }, []);

  const correspondeFiltroCatalogo = (falha: any, sintomaTextoFallback?: string) => {
    if (filterSistema) {
      if (!falha?.sistema?.codigo) return false;
      if (falha.sistema.codigo !== filterSistema && falha.sistema.nome !== filterSistema) {
        return false;
      }
    }
    if (filterSintoma) {
      const fSin = filterSintoma.toLowerCase();
      const matchCat =
        falha?.sintoma?.nome?.toLowerCase() === fSin ||
        falha?.sintoma?.codigo?.toLowerCase() === fSin;
      const matchLegacy = !falha && sintomaTextoFallback && sintomaTextoFallback.toLowerCase().includes(fSin);
      if (!matchCat && !matchLegacy) return false;
    }
    return true;
  };

  const paradasAbertas = useMemo(() => {
    return (paradas || []).filter(p => {
      if (p.situacao !== 'ABERTA') return false;
      if (filterEquipTag.trim()) {
        const q = filterEquipTag.trim().toLowerCase();
        const matchTag = (p.tag || '').toLowerCase().includes(q);
        const matchFrente = (p.frente || '').toLowerCase().includes(q);
        if (!matchTag && !matchFrente) return false;
      }
      if (!correspondeFiltroCatalogo(p.falha, p.motivoInicial)) return false;
      return true;
    });
  }, [paradas, filterEquipTag, filterSistema, filterSintoma]);

  const totaisResp = useMemo(() => {
    const agg: Record<string, number> = {
      MANUTENCAO: 0,
      PRODUCAO: 0,
      VALE: 0,
      EXTERNO: 0,
      ACIDENTE: 0,
      A_DEFINIR: 0
    };
    (paradas || []).forEach(p => {
      const resp = calcularHorasPorResponsavel(p, liveNow);
      Object.entries(resp).forEach(([k, v]) => {
        if (agg[k] !== undefined) agg[k] += v;
      });
    });
    return agg;
  }, [paradas, liveNow]);

  const totalMinutosGeral = useMemo(() => {
    return Object.values(totaisResp).reduce((a, b) => a + b, 0);
  }, [totaisResp]);

  const applyPreset = (preset: string) => {
    setActiveDatePreset(preset);
    const now = new Date();
    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
      setFilterStartTime('');
      setFilterEndTime('');
      setFilterEquipTag('');
      setFilterSistema('');
      setFilterSintoma('');
      setTimeFilter('all');
    } else if (preset === 'today') {
      const todayStr = toYMD(now);
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
      setFilterStartTime('');
      setFilterEndTime('');
      setTimeFilter('all');
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toYMD(yest);
      setFilterStartDate(yestStr);
      setFilterEndDate(yestStr);
      setFilterStartTime('');
      setFilterEndTime('');
      setTimeFilter('all');
    } else if (preset === '24h') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      setFilterStartDate(toYMD(yest));
      setFilterEndDate(toYMD(now));
      setFilterStartTime(now.toTimeString().substring(0, 5));
      setFilterEndTime('');
      setTimeFilter('all');
    } else if (preset === '7days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 7);
      setFilterStartDate(toYMD(past));
      setFilterEndDate(toYMD(now));
      setFilterStartTime('');
      setFilterEndTime('');
      setTimeFilter('all');
    } else if (preset === 'turnodia') {
      setFilterStartTime('06:00');
      setFilterEndTime('18:00');
    } else if (preset === 'turnonoite') {
      setFilterStartTime('18:00');
      setFilterEndTime('06:00');
    }
  };

  const handleClearFilters = () => {
    applyPreset('all');
  };

  const isFilterActive = Boolean(
    filterStartDate || filterEndDate || filterStartTime || filterEndTime || filterEquipTag || filterSistema || filterSintoma
  );

  // Inline editing states for previsaoLiberacao
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemType, setEditingItemType] = useState<'atendimento' | 'pendencia' | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const [editingAtendimentoId, setEditingAtendimentoId] = useState<string | null>(null);
  const [editingAtendimentoTime, setEditingAtendimentoTime] = useState<string>('');

  const handleResolvePendenciaInDashboard = async (parentReportId: string, pendencyId: string) => {
    if (!parentReportId) {
      console.warn('ID do relatório parente ausente para resolução de pendência.');
      return;
    }

    const targetReport = reports.find(r => r.id === parentReportId);
    if (!targetReport) {
      console.warn(`Relatório ${parentReportId} não encontrado no estado local.`);
      return;
    }

    const updatedReport = {
      ...targetReport,
      pendencias: (targetReport.pendencias || []).filter(p => p.id !== pendencyId)
    };

    if (onSaveReport) {
      onSaveReport(updatedReport);
    } else {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'relatorios', parentReportId), updatedReport);
      } catch (err) {
        console.error('Erro ao resolver pendência:', err);
      }
    }
  };

  const handleResolveAllPendenciasForEquipment = async (equipName: string) => {
    // Find all pendencias for this equipment across all active reports
    const matchingPendencias = allPendencias.filter(p => p.equipamento === equipName);
    if (matchingPendencias.length === 0) {
      console.warn(`Nenhuma pendência encontrada para o equipamento ${equipName}.`);
      return;
    }

    // Group matching pendency IDs by parentReportId to execute a single atomic change per report
    const groups: { [reportId: string]: string[] } = {};
    for (const p of matchingPendencias) {
      if (!groups[p.parentReportId]) groups[p.parentReportId] = [];
      groups[p.parentReportId].push(p.id);
    }

    // Accumulate and update progressively to ensure state integrity
    let currentReportsSnapshot = [...reports];

    for (const reportId of Object.keys(groups)) {
      const targetReport = currentReportsSnapshot.find(r => r.id === reportId);
      if (!targetReport) continue;

      const pIdsToResolve = groups[reportId];
      const updatedReport = {
        ...targetReport,
        pendencias: (targetReport.pendencias || []).filter(p => !pIdsToResolve.includes(p.id))
      };

      currentReportsSnapshot = currentReportsSnapshot.map(r => r.id === reportId ? updatedReport : r);

      if (onSaveReport) {
        onSaveReport(updatedReport);
      } else {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'relatorios', reportId), updatedReport);
        } catch (err) {
          console.error('Erro ao resolver pendência:', err);
        }
      }
    }
  };

  const handleLiberarAtendimentoInDashboard = async (parentReportId: string, atendimentoId: string, horaFimValue?: string) => {
    if (!parentReportId) {
      console.warn('ID do relatório parente ausente para liberação de atendimento.');
      return;
    }

    const targetReport = reports.find(r => r.id === parentReportId);
    if (!targetReport) {
      console.warn(`Relatório ${parentReportId} não encontrado no estado local.`);
      return;
    }

    // Default to current HH:MM local time in Brazilian format
    const defaultTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const finalTime = horaFimValue !== undefined ? horaFimValue : defaultTime;

    const updatedReport = {
      ...targetReport,
      atendimentos: (targetReport.atendimentos || []).map(at => {
        if (at.id === atendimentoId) {
          return { ...at, horaFim: finalTime };
        }
        return at;
      })
    };

    // Cast because of simple object update
    const finalUpdated = updatedReport as any;

    if (onSaveReport) {
      onSaveReport(finalUpdated);
    } else {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'relatorios', parentReportId), finalUpdated);
      } catch (err) {
        console.error('Erro ao liberar atendimento:', err);
      }
    }
  };

  const handleUpdatePrevisaoLiberacao = async (
    parentReportId: string, 
    itemId: string, 
    itemType: 'atendimento' | 'pendencia', 
    newDateTime: string
  ) => {
    if (!parentReportId) {
      console.warn('ID do relatório parente ausente para atualização de liberação.');
      return;
    }

    const targetReport = reports.find(r => r.id === parentReportId);
    if (!targetReport) {
      console.warn(`Relatório ${parentReportId} não encontrado no estado local.`);
      return;
    }

    const updatedReport = { ...targetReport };
    if (itemType === 'atendimento') {
      updatedReport.atendimentos = (updatedReport.atendimentos || []).map(at => {
        if (at.id === itemId) {
          return { ...at, previsaoLiberacao: newDateTime };
        }
        return at;
      });
    } else {
      updatedReport.pendencias = (updatedReport.pendencias || []).map(pend => {
        if (pend.id === itemId) {
          return { ...pend, previsaoLiberacao: newDateTime };
        }
        return pend;
      });
    }

    if (onSaveReport) {
      onSaveReport(updatedReport);
    } else {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'relatorios', parentReportId), updatedReport);
      } catch (err) {
        console.error('Erro ao atualizar liberação diretamente no Firestore:', err);
      }
    }
  };

  // Direct firestore listener matching the 30-sec constraint & live updates
  useEffect(() => {
    setLoading(true);
    let unsubscribe: (() => void) | undefined;
    try {
      const q = query(collection(db, 'relatorios'));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const serverReports: Report[] = [];
        snapshot.forEach((doc) => {
          try {
            serverReports.push(mapFirestoreDocToReport(doc.data(), doc.id));
          } catch (e) {
            console.error('Erro ao processar relatório da dashboard:', e);
          }
        });
        // Sort newest first
        serverReports.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        setReports(serverReports);
        setLoading(false);
        setLastRefreshedAt(new Date().toLocaleTimeString('pt-BR'));
      }, (error) => {
        console.warn('Erro ao carregar dados do Firestore para dashboard, revertendo para locais:', error);
        setLoading(false);
      });
    } catch (err) {
      console.error('Erro ao inicializar listener Firestore:', err);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 30 seconds autoupdate countdown timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reset countdown & update timestamp for user visual feedback
          setLastRefreshedAt(new Date().toLocaleTimeString('pt-BR'));
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filter reports based on the chosen range
  const getFilteredReports = () => {
    if (!Array.isArray(reports)) return [];
    
    let submitted = reports.filter(r => r && (r.status === 'ENVIADO' || r.status === 'PENDENTE_SINCRONIZACAO' || r.status === 'SINCRONIZANDO'));

    // Custom date range filter
    if (filterStartDate) {
      submitted = submitted.filter(r => {
        const dStart = (r && r.dateStart) || '';
        const dEnd = (r && r.dateEnd) || dStart;
        return dEnd >= filterStartDate || dStart >= filterStartDate;
      });
    }

    if (filterEndDate) {
      submitted = submitted.filter(r => {
        const dStart = (r && r.dateStart) || '';
        return dStart <= filterEndDate;
      });
    }

    if (timeFilter === 'today' && !filterStartDate && !filterEndDate) {
      let todayStrLocal = '';
      let todayStrUTC = '';
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        todayStrLocal = `${year}-${month}-${day}`;

        const isoString = now.toISOString();
        todayStrUTC = typeof isoString === 'string' && isoString.includes('T') ? isoString.split('T')[0] : '';
      } catch (err) {
        console.warn('Erro ao obter data atual formatada:', err);
      }
      
      if (todayStrLocal || todayStrUTC) {
        submitted = submitted.filter(r => {
          const rDate = r ? safeString(r.dateStart) : 'NÃO INFORMADO';
          return (todayStrLocal && (rDate.includes(todayStrLocal) || rDate === todayStrLocal)) ||
                 (todayStrUTC && (rDate.includes(todayStrUTC) || rDate === todayStrUTC));
        });
      }
    }

    return submitted;
  };

  const activeReports = getFilteredReports();

  // Logging values to satisfy debugging requirements
  useEffect(() => {
    console.log('Dashboard carregado');
    console.log('Relatórios capturados:', activeReports);
    if (activeReports && activeReports.length > 0) {
      activeReports.forEach((r, index) => {
        console.log(`[Relatório ${index + 1}] ID:`, safeString(r.id));
        console.log(`[Relatório ${index + 1}] Frente:`, safeString(r.frente));
        console.log(`[Relatório ${index + 1}] Turma (turma):`, safeString(r.team));
        console.log(`[Relatório ${index + 1}] Data (data):`, safeString(r.dateStart));
        console.log(`[Relatório ${index + 1}] Equipamento Count:`, r.atendimentos ? r.atendimentos.length : 0);
        console.log(`[Relatório ${index + 1}] Usuário/Mecânico:`, safeString(r.mechanicUsername));
      });
    }
  }, [activeReports]);

  // Helper parser mapping parent front and equipment prefixes representing minings frentes
  const parseFrente = (frente: any, equipName: any): 'EH' | 'CR' | 'PF' | 'INFRA' => {
    const fStr = typeof frente === 'string' ? frente : String(frente || '');
    const eqStr = typeof equipName === 'string' ? equipName : String(equipName || '');
    const f = fStr.toUpperCase().trim();
    const eq = eqStr.toUpperCase().trim();
    if (f.includes('EH') || eq.startsWith('EH') || eq.includes('ESCAVADEIRA') || eq.includes('EH')) return 'EH';
    if (f.includes('CR') || eq.startsWith('CR') || eq.includes('CARREGADEIRA') || eq.includes('CR')) return 'CR';
    if (f.includes('PF') || eq.startsWith('PF') || eq.includes('PERFURATRIZ') || eq.includes('PF')) return 'PF';
    return 'INFRA'; // default to infrastructure/support
  };

  // Metric 1: Total Reports (Filtered)
  const repCount = activeReports.length;

  // Metric 2: Equipments serviced (Sum of atendimentos)
  const allAtendimentos = activeReports.flatMap(r => {
    const atendimentosList = Array.isArray(r.atendimentos) ? r.atendimentos : [];
    return atendimentosList.map(at => {
      const equip = at ? safeString(at.equipamento) : 'NÃO INFORMADO';
      const omVal = at ? safeString(at.om) : 'NÃO INFORMADO';
      const horimetroVal = at ? safeString(at.horimetro) : 'NÃO INFORMADO';
      const sintomaVal = at ? safeString(at.sintoma) : 'NÃO INFORMADO';
      const causaVal = at ? safeString(at.causa) : 'NÃO INFORMADO';
      const acaoVal = at ? safeString(at.acaoExecutada) : 'NÃO INFORMADO';
      const atuantesVal = at ? safeString(at.atuantes) : 'NÃO INFORMADO';
      const horaInicVal = at ? safeString(at.horaInicio) : 'NÃO INFORMADO';
      const horaFimVal = at ? safeString(at.horaFim) : 'NÃO INFORMADO';

      return {
        ...at,
        equipamento: equip,
        om: omVal,
        horimetro: horimetroVal,
        sintoma: sintomaVal,
        causa: causaVal,
        acaoExecutada: acaoVal,
        atuantes: atuantesVal,
        horaInicio: horaInicVal,
        horaFim: horaFimVal,
        reportFrente: r ? safeString(r.frente) : 'NÃO INFORMADO',
        reportTeam: r ? safeString(r.team) : 'NÃO INFORMADO',
        reportDate: r ? safeString(r.dateStart) : 'NÃO INFORMADO',
        reportMecanico: r ? safeString(r.mecanico || r.eletricista || r.monitor) : 'NÃO INFORMADO',
        parentReportId: r ? r.id : ''
      };
    });
  });

  // Filtered atendimentos by Tag de Equipamento e Horário
  const filteredAtendimentos = allAtendimentos.filter(at => {
    // 1. Tag de Equipamento ou OM ou Frente
    if (filterEquipTag.trim()) {
      const q = filterEquipTag.trim().toLowerCase();
      const matchEquip = (at.equipamento || '').toLowerCase().includes(q);
      const matchOm = (at.om || '').toLowerCase().includes(q);
      const matchSintoma = (at.sintoma || '').toLowerCase().includes(q);
      const matchFrente = (at.reportFrente || '').toLowerCase().includes(q);
      const matchMecanico = (at.reportMecanico || '').toLowerCase().includes(q);
      if (!matchEquip && !matchOm && !matchSintoma && !matchFrente && !matchMecanico) {
        return false;
      }
    }

    // 2. Horário Inicial
    if (filterStartTime.trim()) {
      const start = filterStartTime.trim();
      if (at.horaInicio && at.horaInicio !== 'NÃO INFORMADO') {
        if (at.horaFim && at.horaFim !== 'NÃO INFORMADO') {
          if (at.horaFim < start && at.horaInicio < start) return false;
        } else {
          if (at.horaInicio < start) return false;
        }
      }
    }

    // 3. Horário Final
    if (filterEndTime.trim()) {
      const end = filterEndTime.trim();
      if (at.horaInicio && at.horaInicio !== 'NÃO INFORMADO') {
        if (at.horaInicio > end) return false;
      }
    }

    // 4. Filtro de Catálogo (SISTEMA e SINTOMA)
    if (!correspondeFiltroCatalogo(at.falha, at.sintoma)) {
      return false;
    }

    return true;
  });

  // Paradas filtradas pelo período, tag, sistema e sintoma para "Top 10 sistemas com mais paradas" e "Top 10 sintomas"
  const { top10Sistemas, top10Sintomas } = useMemo(() => {
    const mapSistemas = new Map<string, { label: string; qtd: number; minutos: number }>();
    const mapSintomas = new Map<string, { label: string; qtd: number; minutos: number }>();

    const paradasIdProcessadas = new Set<string>();

    (paradas || []).forEach((p) => {
      if (!p.falha) return;
      const dInicio = (p.inicioParada || '').substring(0, 10);
      const hInicio = p.inicioParada
        ? new Date(p.inicioParada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '';

      if (filterStartDate && dInicio && dInicio < filterStartDate) return;
      if (filterEndDate && dInicio && dInicio > filterEndDate) return;
      if (filterStartTime.trim() && hInicio && hInicio < filterStartTime.trim()) return;
      if (filterEndTime.trim() && hInicio && hInicio > filterEndTime.trim()) return;
      if (filterEquipTag.trim()) {
        const q = filterEquipTag.trim().toLowerCase();
        if (!(p.tag || '').toLowerCase().includes(q) && !(p.frente || '').toLowerCase().includes(q)) {
          return;
        }
      }
      if (!correspondeFiltroCatalogo(p.falha, p.motivoInicial)) return;

      paradasIdProcessadas.add(p.id);
      const mins = Math.max(0, calcularDuracaoTotalParadaMinutos(p, liveNow));

      if (p.falha.sistema?.codigo) {
        const sisKey = p.falha.sistema.codigo;
        const sisLabel = `${p.falha.sistema.codigo} – ${p.falha.sistema.nome}`;
        const curSis = mapSistemas.get(sisKey) || { label: sisLabel, qtd: 0, minutos: 0 };
        curSis.qtd += 1;
        curSis.minutos += mins;
        mapSistemas.set(sisKey, curSis);
      }

      if (p.falha.sintoma?.nome) {
        const sinKey = p.falha.sintoma.nome.toUpperCase();
        const sinLabel = `${p.falha.sintoma.nome} (${p.falha.sintoma.codigo})`;
        const curSin = mapSintomas.get(sinKey) || { label: sinLabel, qtd: 0, minutos: 0 };
        curSin.qtd += 1;
        curSin.minutos += mins;
        mapSintomas.set(sinKey, curSin);
      }
    });

    // Inclui atendimentos com falha catalogada que não estão vinculados a parada já contabilizada
    filteredAtendimentos.forEach((at: any) => {
      if (!at.falha) return;
      if (at.paradaId && paradasIdProcessadas.has(at.paradaId)) return;

      let mins = 0;
      if (at.horaInicio && at.horaInicio !== 'NÃO INFORMADO' && at.horaFim && at.horaFim !== 'NÃO INFORMADO') {
        const [h1, m1] = String(at.horaInicio).split(':').map(Number);
        const [h2, m2] = String(at.horaFim).split(':').map(Number);
        if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
          let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (diff < 0) diff += 24 * 60;
          mins = Math.max(0, diff);
        }
      }

      if (at.falha.sistema?.codigo) {
        const sisKey = at.falha.sistema.codigo;
        const sisLabel = `${at.falha.sistema.codigo} – ${at.falha.sistema.nome}`;
        const curSis = mapSistemas.get(sisKey) || { label: sisLabel, qtd: 0, minutos: 0 };
        curSis.qtd += 1;
        curSis.minutos += mins;
        mapSistemas.set(sisKey, curSis);
      }

      if (at.falha.sintoma?.nome) {
        const sinKey = at.falha.sintoma.nome.toUpperCase();
        const sinLabel = `${at.falha.sintoma.nome} (${at.falha.sintoma.codigo})`;
        const curSin = mapSintomas.get(sinKey) || { label: sinLabel, qtd: 0, minutos: 0 };
        curSin.qtd += 1;
        curSin.minutos += mins;
        mapSintomas.set(sinKey, curSin);
      }
    });

    const sortFn = (a: { qtd: number; minutos: number }, b: { qtd: number; minutos: number }) =>
      b.qtd !== a.qtd ? b.qtd - a.qtd : b.minutos - a.minutos;

    return {
      top10Sistemas: Array.from(mapSistemas.values()).sort(sortFn).slice(0, 10),
      top10Sintomas: Array.from(mapSintomas.values()).sort(sortFn).slice(0, 10)
    };
  }, [paradas, filteredAtendimentos, filterStartDate, filterEndDate, filterStartTime, filterEndTime, filterEquipTag, filterSistema, filterSintoma, liveNow]);

  const equipCount = filteredAtendimentos.length;

  // Metric 3: Pendencies
  const allPendencias = activeReports.flatMap(r => {
    const pendenciasList = Array.isArray(r.pendencias) ? r.pendencias : [];
    return pendenciasList.map(p => {
      const equip = p ? safeString(p.equipamento) : 'NÃO INFORMADO';
      const descr = p ? safeString(p.descricao) : 'NÃO INFORMADO';

      return {
        ...p,
        equipamento: equip,
        descricao: descr,
        reportFrente: r ? safeString(r.frente) : 'NÃO INFORMADO',
        reportDate: r ? safeString(r.dateStart) : 'NÃO INFORMADO',
        parentReportId: r ? r.id : ''
      };
    });
  });

  const filteredPendencias = allPendencias.filter(p => {
    if (filterEquipTag.trim()) {
      const q = filterEquipTag.trim().toLowerCase();
      const matchEquip = (p.equipamento || '').toLowerCase().includes(q);
      const matchDesc = (p.descricao || '').toLowerCase().includes(q);
      if (!matchEquip && !matchDesc) return false;
    }
    return true;
  });

  const pendenciesCount = filteredPendencias.length;

  // Metric 4: Active teams
  const uniqueTeamsOnShift = Array.from(new Set(activeReports.map(r => r ? safeString(r.team) : 'NÃO INFORMADO'))).length;

  // Graphic 1: Equipments serviced per front (EH, CR, PF, INFRA)
  const equipsPerFront = { EH: 0, CR: 0, PF: 0, INFRA: 0 };
  filteredAtendimentos.forEach(at => {
    const f = parseFrente(at.reportFrente, at.equipamento);
    if (equipsPerFront[f] !== undefined) {
      equipsPerFront[f]++;
    }
  });

  // Graphic 2: Pendencies per front (EH, CR, PF, INFRA)
  const pendenciasPerFront = { EH: 0, CR: 0, PF: 0, INFRA: 0 };
  filteredPendencias.forEach(p => {
    const f = parseFrente(p.reportFrente, p.equipamento);
    if (pendenciasPerFront[f] !== undefined) {
      pendenciasPerFront[f]++;
    }
  });

  // Graphic 3: General Status (Liberados, Pendencias, Em andamento) - Donut Source
  let inProgressCount = 0;
  let clearedCount = 0;

  filteredAtendimentos.forEach(at => {
    const hFim = at.horaFim;
    if (hFim === 'NÃO INFORMADO' || hFim === '' || !hFim) {
      inProgressCount++;
    } else {
      const hasPending = filteredPendencias.some(p => p.equipamento === at.equipamento);
      if (hasPending) {
        // counted under pendencies
      } else {
        clearedCount++;
      }
    }
  });

  const donutTotal = clearedCount + pendenciesCount + inProgressCount;

  // Table 1: Latest Maintenance activities
  const sortedMaintenance = [...filteredAtendimentos];

  // Table 2: Active Outstanding Pendencies (with inferred priorities)
  const getPriority = (descr: string) => {
    const dStr = typeof descr === 'string' ? descr : String(descr || '');
    const d = dStr.toLowerCase();
    if (d.includes('parado') || d.includes('quebro') || d.includes('crític') || d.includes('vazamento') || d.includes('grave') || d.includes('motor') || d.includes('fogo') || d.includes('hidraulic')) {
      return { label: 'Alta', colorClass: 'bg-[var(--um-negativo-claro)] text-[var(--um-negativo-escuro)] border border-[var(--um-negativo)]' };
    }
    if (d.includes('alarme') || d.includes('atenção') || d.includes('trinc') || d.includes('sensor') || d.includes('pneu') || d.includes('freio') || d.includes('elétrica')) {
      return { label: 'Média', colorClass: 'bg-[var(--um-alerta-claro)] text-[var(--um-alerta-escuro)] border border-[var(--um-alerta)]' };
    }
    return { label: 'Baixa', colorClass: 'bg-[var(--um-qualidade-claro)] text-[var(--um-qualidade-escuro)] border border-[var(--um-qualidade)]' };
  };

  const getStatusBadge = (at: any) => {
    const equip = at ? safeString(at.equipamento) : 'NÃO INFORMADO';
    const hasPendency = allPendencias.some(p => p.equipamento === equip);
    
    let badge = null;
    let actions = null;

    if (hasPendency) {
      badge = <span className="px-2.5 py-1 rounded-lg text-[12px] uppercase font-normal bg-[var(--um-negativo-claro)] text-[var(--um-negativo-escuro)] border border-[var(--um-negativo)]">Pendência</span>;
      if (currentUser?.role === 'admin') {
        actions = (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => {
                handleResolveAllPendenciasForEquipment(equip);
              }}
              className="px-2.5 py-1 bg-[var(--um-negativo)] hover:bg-[var(--um-verde-principal)] text-[var(--um-branco)] rounded-lg text-[12px] font-light uppercase transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              title="Clique para resolver todas as pendências ativas desta máquina"
            >
              <Check className="w-3 h-3" /> Liberar (Resolv.)
            </button>
          </div>
        );
      }
    } else {
      const hFim = at ? safeString(at.horaFim) : 'NÃO INFORMADO';
      if (hFim === 'NÃO INFORMADO' || hFim === '' || !hFim) {
        badge = <span className="px-2.5 py-1 rounded-lg text-[12px] uppercase font-normal bg-[var(--um-alerta-claro)] text-[var(--um-alerta-escuro)] border border-[var(--um-alerta)]">Em Andamento</span>;
        
        if (currentUser?.role === 'admin') {
          if (editingAtendimentoId === at.id) {
            actions = (
              <div className="flex items-center gap-1.5 mt-1 font-sans">
                <input 
                  type="time" 
                  value={editingAtendimentoTime} 
                  onChange={(e) => setEditingAtendimentoTime(e.target.value)}
                  className="bg-[var(--um-branco)] border border-[var(--um-verde-principal)] rounded-lg px-2 py-1 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] w-20"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleLiberarAtendimentoInDashboard(at.parentReportId, at.id, editingAtendimentoTime);
                    setEditingAtendimentoId(null);
                  }}
                  className="p-1.5 bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] rounded-lg cursor-pointer flex items-center justify-center"
                  title="Salvar"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAtendimentoId(null)}
                  className="p-1.5 bg-[var(--um-cinza-claro)] hover:bg-[var(--um-cinza-texto)] text-[var(--um-cinza-escuro)] rounded-lg cursor-pointer flex items-center justify-center"
                  title="Cancelar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          } else {
            actions = (
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleLiberarAtendimentoInDashboard(at.parentReportId, at.id);
                  }}
                  className="px-2.5 py-1 bg-[var(--um-verde-principal)] text-[var(--um-branco)] hover:bg-[var(--um-verde-secundario)] rounded-lg text-[12px] font-light uppercase transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Liberar preenchendo com hora atual"
                >
                  ⚡ Liberar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAtendimentoId(at.id);
                    setEditingAtendimentoTime('');
                  }}
                  className="p-1 text-[var(--um-cinza-texto)] hover:text-[var(--um-verde-principal)] transition cursor-pointer"
                  title="Digitar hora de encerramento manualmente"
                >
                  <Clock className="w-4 h-4" />
                </button>
              </div>
            );
          }
        }
      } else {
        badge = <span className="px-2.5 py-1 rounded-lg text-[12px] uppercase font-normal bg-[var(--um-positivo-claro)] text-[var(--um-positivo-escuro)] border border-[var(--um-positivo)]">Liberado</span>;
        
        if (currentUser?.role === 'admin') {
          actions = (
            <div className="flex items-center gap-1 mt-1 text-[12px] text-[var(--um-cinza-texto)] font-normal uppercase">
              <span>Fim: {hFim}</span>
              <button
                type="button"
                onClick={() => {
                  handleLiberarAtendimentoInDashboard(at.parentReportId, at.id, '');
                }}
                className="ml-1 text-[12px] text-[var(--um-alerta-escuro)] hover:underline cursor-pointer font-medium"
                title="Voltar status para em andamento (Limpar Hora Fim)"
              >
                (Reabrir)
              </button>
            </div>
          );
        } else {
          actions = (
            <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal uppercase mt-0.5">
              Fim: {hFim}
            </div>
          );
        }
      }
    }

    return (
      <div className="flex flex-col items-start gap-1">
        {badge}
        {actions}
      </div>
    );
  };

  return (
    <div 
      id="operational-dashboard-root" 
      className={`select-none font-sans transition-all duration-200 ${
        isTvMode 
          ? 'fixed inset-0 z-50 bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] overflow-y-auto w-screen h-screen p-6 md:p-8 flex flex-col' 
          : 'bg-[var(--um-fundo)] text-[var(--um-cinza-texto)]'
      }`}
    >
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-[var(--um-cinza-claro)] mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[var(--um-verde-principal)] text-[var(--um-branco)] text-[12px] font-light uppercase tracking-wider">
              U&M MINERAÇÃO
            </span>
            {isTvMode && (
              <span className="flex items-center gap-1.5 text-[12px] font-normal text-[var(--um-negativo-escuro)] bg-[var(--um-negativo-claro)] px-2.5 py-1 rounded-lg border border-[var(--um-negativo)] uppercase">
                <span className="w-2 h-2 rounded-full bg-[var(--um-negativo)]"></span> MODO TV ATIVO
              </span>
            )}
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-light uppercase tracking-wide text-[var(--um-verde-principal)] mt-2">
            DASHBOARD OPERACIONAL
          </h1>
          <p className="text-[12px] text-[var(--um-cinza-texto)] font-normal mt-0.5">
            Monitoramento em tempo real da manutenção e pendências das frentes de lavra.
          </p>
        </div>

        {/* CONTROLS ZONE & LOGO U&M NO CANTO SUPERIOR DIREITO */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full md:w-auto justify-end">
          {!isTvMode && (
            <>
              {/* Real time indicators */}
              <div className="bg-[var(--um-branco)] px-3.5 py-2 rounded-xl border border-[var(--um-cinza-claro)] flex items-center gap-2 text-[12px] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[var(--um-positivo)] animate-pulse"></span>
                <span className="text-[var(--um-cinza-texto)] font-normal">
                  Sinc: <strong className="text-[var(--um-cinza-escuro)] font-medium">{lastRefreshedAt}</strong>
                </span>
                <span className="text-[var(--um-cinza-claro)]">|</span>
                <span className="text-[var(--um-cinza-texto)] font-normal">
                  Atualiza em: <strong className="text-[var(--um-verde-principal)] font-medium">{countdown}s</strong>
                </span>
              </div>
            </>
          )}

          {/* TV MODE TOGGLE BUTTON */}
          <button
            type="button"
            onClick={() => setIsTvMode(!isTvMode)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[12px] rounded-xl font-light uppercase tracking-wider transition cursor-pointer shadow-xs ${
              isTvMode 
                ? 'bg-[var(--um-negativo)] text-[var(--um-branco)] hover:bg-[var(--um-negativo-escuro)]' 
                : 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] hover:bg-[var(--um-verde-secundario)]'
            }`}
          >
            {isTvMode ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Sair do Modo TV</span>
              </>
            ) : (
              <>
                <Tv className="w-4 h-4" />
                <span>Modo TV</span>
              </>
            )}
          </button>

          {/* LOGOTIPO OFICIAL U&M NO CANTO SUPERIOR DIREITO DA TELA */}
          <div className="pl-2 hidden sm:block">
            <BrandLogo className="h-10 sm:h-12" />
          </div>
        </div>
      </div>

      {isTvMode && (
        <div className="bg-[var(--um-branco)] px-4 py-2.5 rounded-xl border border-[var(--um-cinza-claro)] mb-6 flex justify-between items-center text-[12px] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--um-negativo)] animate-pulse"></span>
            <span className="text-[var(--um-cinza-texto)] font-light uppercase">TV Monitor de Transmissão Contínua</span>
          </div>
          <div className="flex items-center gap-4 text-[var(--um-cinza-texto)] font-normal text-[12px]">
            <span>ÚLTIMA ATUALIZAÇÃO FIRESTORE: <strong className="text-[var(--um-cinza-escuro)] font-medium">{lastRefreshedAt}</strong></span>
            <span>PRÓXIMO RESET: <strong className="text-[var(--um-verde-principal)] font-medium">{countdown}s</strong></span>
          </div>
        </div>
      )}

      {/* BARRA DE FILTRO POR DATA E HORA DE EQUIPAMENTOS */}
      {!isTvMode && (
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl p-5 mb-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--um-cinza-claro)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-[var(--um-verde-principal)]">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-[14px] sm:text-[16px] font-light uppercase tracking-wider text-[var(--um-verde-principal)] flex items-center gap-2">
                  <span>FILTRAR EQUIPAMENTOS POR DATA & HORA</span>
                  {isFilterActive && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal uppercase bg-[var(--um-positivo-claro)] text-[var(--um-positivo-escuro)] border border-[var(--um-positivo)]">
                      Filtro Ativo
                    </span>
                  )}
                </h2>
                <p className="text-[12px] text-[var(--um-cinza-texto)] font-normal">
                  Selecione o intervalo de data, horário ou tag para filtrar manutenções, disponibilidade e pendências.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--um-fundo)] hover:bg-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] text-[12px] font-normal transition cursor-pointer border border-[var(--um-cinza-claro)]"
                  title="Limpar todos os filtros e mostrar geral"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
              <span className="px-3 py-1.5 rounded-xl bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-[12px] font-medium text-[var(--um-verde-principal)]">
                {filteredAtendimentos.length} Equipamento(s)
              </span>
            </div>
          </div>

          {/* ATALHOS RÁPIDOS (PRESETS) */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar text-[12px] font-light uppercase">
            {[
              { id: 'all', label: 'Todos (Geral)' },
              { id: 'today', label: 'Hoje' },
              { id: 'yesterday', label: 'Ontem' },
              { id: '24h', label: 'Últimas 24h' },
              { id: '7days', label: 'Últimos 7 dias' },
              { id: 'turnodia', label: 'Turno Dia (06h - 18h)' },
              { id: 'turnonoite', label: 'Turno Noite (18h - 06h)' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap text-[12px] font-light uppercase tracking-wider ${
                  activeDatePreset === preset.id
                    ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] shadow-xs'
                    : 'bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] hover:bg-[var(--um-cinza-claro)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* CAMPOS DE DATA, HORA E EQUIPAMENTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            {/* Data Inicial */}
            <div>
              <label className="block text-[12px] font-light uppercase text-[var(--um-cinza-texto)] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--um-verde-principal)]" />
                <span>Data Inicial (De)</span>
              </label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] focus:border-[var(--um-verde-principal)] rounded-xl px-3 py-2 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] transition"
              />
            </div>

            {/* Hora Inicial */}
            <div>
              <label className="block text-[12px] font-light uppercase text-[var(--um-cinza-texto)] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--um-verde-principal)]" />
                <span>Hora Início (De)</span>
              </label>
              <input
                type="time"
                value={filterStartTime}
                onChange={(e) => {
                  setFilterStartTime(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] focus:border-[var(--um-verde-principal)] rounded-xl px-3 py-2 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] transition"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="block text-[12px] font-light uppercase text-[var(--um-cinza-texto)] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--um-verde-principal)]" />
                <span>Data Final (Até)</span>
              </label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] focus:border-[var(--um-verde-principal)] rounded-xl px-3 py-2 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] transition"
              />
            </div>

            {/* Hora Final */}
            <div>
              <label className="block text-[12px] font-light uppercase text-[var(--um-cinza-texto)] mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--um-verde-principal)]" />
                <span>Hora Fim (Até)</span>
              </label>
              <input
                type="time"
                value={filterEndTime}
                onChange={(e) => {
                  setFilterEndTime(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] focus:border-[var(--um-verde-principal)] rounded-xl px-3 py-2 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] transition"
              />
            </div>

            {/* Tag de Equipamento */}
            <div>
              <label className="block text-[12px] font-light uppercase text-[var(--um-cinza-texto)] mb-1 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-[var(--um-verde-principal)]" />
                <span>Tag / Equipamento</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: EH-5003, CR..."
                  value={filterEquipTag}
                  onChange={(e) => {
                    setFilterEquipTag(e.target.value);
                    setActiveDatePreset('custom');
                  }}
                  className="w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] focus:border-[var(--um-verde-principal)] rounded-xl pl-3 pr-8 py-2 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] transition uppercase"
                />
                {filterEquipTag && (
                  <button
                    type="button"
                    onClick={() => setFilterEquipTag('')}
                    className="absolute right-2.5 top-2.5 text-[var(--um-cinza-texto)] hover:text-[var(--um-cinza-escuro)]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* FILTROS DE CATÁLOGO DE FALHAS: SISTEMA E SINTOMA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-[var(--um-cinza-claro)]">
            <div>
              <label className="block text-[12px] font-light uppercase text-[var(--um-cinza-texto)] mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[var(--um-verde-principal)]" />
                <span>Filtrar por SISTEMA</span>
              </label>
              <select
                value={filterSistema}
                onChange={(e) => {
                  setFilterSistema(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] focus:border-[var(--um-verde-principal)] rounded-xl px-3 py-2 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] transition cursor-pointer"
              >
                <option value="">Todos os Sistemas (ex.: Hidráulico, Elétrico, Motor Diesel)</option>
                {opcoesSistemas.map((sis) => (
                  <option key={sis.codigo} value={sis.codigo}>
                    {sis.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-light uppercase text-[var(--um-cinza-texto)] mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[var(--um-verde-principal)]" />
                <span>Filtrar por SINTOMA</span>
              </label>
              <select
                value={filterSintoma}
                onChange={(e) => {
                  setFilterSintoma(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="w-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] focus:border-[var(--um-verde-principal)] rounded-xl px-3 py-2 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)] transition cursor-pointer"
              >
                <option value="">Todos os Sintomas (ex.: Vazamento, SOS Crítico, Quebra)</option>
                {opcoesSintomas.map((sin) => (
                  <option key={sin} value={sin}>
                    {sin}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* BLOCO: EQUIPAMENTOS PARADOS AGORA (Melhoria 3.5) */}
      <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] p-5 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--um-cinza-claro)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-[var(--um-verde-principal)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[14px] sm:text-[16px] font-light uppercase tracking-wider text-[var(--um-verde-principal)] flex items-center gap-2">
                <span>EQUIPAMENTOS PARADOS AGORA</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-normal uppercase ${
                  paradasAbertas.length > 0 
                    ? 'bg-[var(--um-alerta-claro)] text-[var(--um-alerta-escuro)] border border-[var(--um-alerta)]' 
                    : 'bg-[var(--um-positivo-claro)] text-[var(--um-positivo-escuro)] border border-[var(--um-positivo)]'
                }`}>
                  {paradasAbertas.length} PARADOS
                </span>
              </h2>
              <p className="text-[12px] text-[var(--um-cinza-texto)] font-normal">
                Tempo real de inatividade da frota com código Vale x U&M e cronômetro contínuo.
              </p>
            </div>
          </div>

          {onSelectParadasTab && (
            <button
              type="button"
              onClick={onSelectParadasTab}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--um-verde-principal)] text-[var(--um-branco)] hover:bg-[var(--um-verde-secundario)] rounded-xl text-[12px] font-light uppercase tracking-wider transition cursor-pointer shadow-xs"
            >
              <span>Gerenciar Paradas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* LISTA DE EQUIPAMENTOS PARADOS OU MENSAGEM NENHUM PARADO */}
        {paradasAbertas.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--um-positivo-claro)] border border-[var(--um-positivo)] text-[var(--um-positivo-escuro)] flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-[14px] font-light uppercase text-[var(--um-verde-principal)] tracking-wider">
              NENHUM EQUIPAMENTO PARADO NO MOMENTO
            </h3>
            <p className="text-[12px] text-[var(--um-cinza-texto)] font-normal mt-0.5">
              Toda a frota monitorada está disponível e em plena operação nas frentes de lavra.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4">
            {paradasAbertas.map((parada) => {
              const segAtual = getSegmentoAtual(parada);
              const duracaoMin = calcularDuracaoTotalParadaMinutos(parada, liveNow);
              const tempoDecorrido = formatarMinutosEmHorasEMinutos(duracaoMin);
              const corResp = CORES_RESPONSABILIDADE[segAtual.responsavel] || '#575756';

              return (
                <div 
                  key={parada.id}
                  className="bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-2xl p-4 flex flex-col justify-between hover:border-[var(--um-verde-principal)] transition shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-light uppercase tracking-wider text-[var(--um-verde-principal)] font-mono">
                          {parada.tag}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-medium uppercase rounded-lg bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] text-[var(--um-cinza-escuro)]">
                          {parada.frente || 'FRENTE'}
                        </span>
                      </div>
                      <span 
                        className="px-2 py-0.5 text-[10px] font-medium uppercase rounded-lg text-white"
                        style={{ backgroundColor: corResp }}
                      >
                        {NOMES_RESPONSABILIDADE[segAtual.responsavel] || segAtual.responsavel}
                      </span>
                    </div>

                    <div className="text-xs text-[var(--um-cinza-escuro)] font-medium mb-1">
                      {segAtual.codigo} - {segAtual.nome}
                    </div>

                    {parada.falha && (
                      <div className="text-[11px] font-medium text-[#19502F] bg-[#E8F5E9] border border-[#19502F]/25 px-2 py-1 rounded-lg mb-1.5">
                        🔧 {formatarFalhaCard(parada.falha)}
                      </div>
                    )}

                    <div className="text-[11px] text-[var(--um-cinza-texto)] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--um-cinza-texto)]" />
                      <span>Início: {new Date(parada.inicioParada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[var(--um-cinza-claro)]">|</span>
                      <span>Parado há: <strong className="text-[var(--um-alerta-escuro)] font-medium">{tempoDecorrido}</strong></span>
                    </div>

                    {parada.emAtendimentoPor && (
                      <div className="mt-1.5 text-[11px] text-[var(--um-status-emmanut-texto,#1565C0)] bg-[var(--um-status-emmanut-fundo,#E3F2FD)] px-2 py-0.5 rounded-md font-medium border border-[var(--um-status-emmanut-borda,#90CAF9)] truncate">
                        Em atendimento por <strong>{parada.emAtendimentoPor.tecnicoPrincipal.nome}</strong> desde {new Date(parada.emAtendimentoPor.inicioAtendimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-[var(--um-cinza-claro)] flex items-center justify-between">
                    <span className="text-[10px] text-[var(--um-cinza-texto)] font-normal uppercase">
                      {segAtual.responsavelFuncao || 'Aguardando ação'}
                    </span>
                    {onSelectParadasTab && (
                      <button
                        type="button"
                        onClick={onSelectParadasTab}
                        className="text-[11px] font-medium text-[var(--um-verde-principal)] hover:text-[var(--um-verde-secundario)] uppercase tracking-wider cursor-pointer"
                      >
                        Trocar Status →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* RESUMO DE HORAS POR CLASSE DE RESPONSABILIDADE */}
        {totalMinutosGeral > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--um-cinza-claro)]">
            <span className="block text-[11px] font-light uppercase tracking-wider text-[var(--um-cinza-escuro)] mb-2">
              Horas Acumuladas por Responsabilidade ({formatarMinutosEmHorasEMinutos(totalMinutosGeral)} total):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {(Object.keys(totaisResp) as Array<keyof typeof totaisResp>).map((resp) => {
                const mins = totaisResp[resp] || 0;
                const perc = totalMinutosGeral > 0 ? Math.round((mins / totalMinutosGeral) * 100) : 0;
                const cor = CORES_RESPONSABILIDADE[resp] || '#575756';
                return (
                  <div key={resp} className="p-2.5 rounded-xl bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-center">
                    <div className="text-[10px] font-medium uppercase truncate text-[var(--um-cinza-texto)]" title={NOMES_RESPONSABILIDADE[resp]}>
                      {NOMES_RESPONSABILIDADE[resp]}
                    </div>
                    <div className="text-sm font-light text-[var(--um-cinza-escuro)] mt-0.5" style={{ color: mins > 0 ? cor : undefined }}>
                      {formatarMinutosEmHorasEMinutos(mins)}
                    </div>
                    <div className="text-[9px] text-[var(--um-cinza-texto)]">
                      {perc}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* UPPER METRICS GRID (4 CARTÕES NO PADRÃO U&M) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Metric 1 - Reports */}
        <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] p-5 relative overflow-hidden shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] text-[var(--um-cinza-texto)] font-light uppercase tracking-wider block">
              Relatórios Recebidos
            </span>
            <div className="p-2 bg-[var(--um-fundo)] rounded-xl text-[var(--um-verde-principal)]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-light text-[var(--um-verde-principal)] tracking-tight">
            {repCount}
          </h2>
          <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal mt-1 lowercase">
            manutenções recebidas
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--um-verde-principal)]"></div>
        </div>

        {/* Metric 2 - Serviced Equipments */}
        <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] p-5 relative overflow-hidden shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] text-[var(--um-cinza-texto)] font-light uppercase tracking-wider block">
              Equipamentos Atendidos
            </span>
            <div className="p-2 bg-[var(--um-fundo)] rounded-xl text-[var(--um-verde-secundario)]">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-light text-[var(--um-verde-secundario)] tracking-tight">
            {equipCount}
          </h2>
          <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal mt-1 lowercase">
            manutenções registradas
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--um-verde-secundario)]"></div>
        </div>

        {/* Metric 3 - Pendencies */}
        <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] p-5 relative overflow-hidden shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] text-[var(--um-cinza-texto)] font-light uppercase tracking-wider block">
              Pendências Abertas
            </span>
            <div className="p-2 bg-[var(--um-negativo-claro)] rounded-xl text-[var(--um-negativo)]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h2 className={`text-3xl font-light tracking-tight ${pendenciesCount > 0 ? 'text-[var(--um-negativo)]' : 'text-[var(--um-cinza-escuro)]'}`}>
            {pendenciesCount}
          </h2>
          <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal mt-1 lowercase">
            pendências restantes
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--um-negativo)]"></div>
        </div>

        {/* Metric 4 - Active Teams */}
        <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] p-5 relative overflow-hidden shadow-xs">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[12px] text-[var(--um-cinza-texto)] font-light uppercase tracking-wider block">
              Equipes Ativas
            </span>
            <div className="p-2 bg-[var(--um-fundo)] rounded-xl text-[var(--um-verde-claro)]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-3xl font-light text-[var(--um-verde-principal)] tracking-tight">
            {uniqueTeamsOnShift}
          </h2>
          <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal mt-1 lowercase">
            equipes atuantes unificadas
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--um-verde-claro)]"></div>
        </div>
      </div>

      {/* GRAPHICS GRID ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* GRAPHIC 1: EQUIPAMENTOS ATENDIDOS POR FRENTE */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[14px] uppercase font-light text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
                <span>Atendidos Por Frente</span>
              </h3>
              <span className="text-[12px] bg-[var(--um-fundo)] text-[var(--um-verde-principal)] font-medium px-2.5 py-0.5 rounded-lg border border-[var(--um-cinza-claro)]">
                Total: {equipCount}
              </span>
            </div>
            
            {equipCount === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[var(--um-cinza-texto)] text-[12px] font-normal uppercase text-center p-4">
                <span>Sem atendimentos registrados no período</span>
              </div>
            ) : (
              <div className="space-y-4 my-2">
                {([
                  { key: 'EH', label: 'EH - Escavadeiras', color: 'bg-[var(--um-positivo)]' },
                  { key: 'CR', label: 'CR - Carregadeiras', color: 'bg-[var(--um-qualidade)]' },
                  { key: 'PF', label: 'PF - Perfuratrizes', color: 'bg-[var(--um-qualidade-claro)]' },
                  { key: 'INFRA', label: 'INFRA - Apoio / Infra', color: 'bg-[var(--um-positivo-claro)]' },
                ] as const).map((item) => {
                  const val = equipsPerFront[item.key] || 0;
                  const maxVal = Math.max(...Object.values(equipsPerFront), 1);
                  const percent = (val / maxVal) * 100;
                  
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-medium text-[var(--um-cinza-escuro)]">{item.label}</span>
                        <strong className="text-[var(--um-verde-principal)] font-medium">{val} equip.</strong>
                      </div>
                      <div className="relative h-2.5 bg-[var(--um-fundo)] rounded-full overflow-hidden border border-[var(--um-cinza-claro)]">
                        <div 
                          className={`absolute top-0 left-0 h-full ${item.color} rounded-full transition-all duration-700`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-3 mt-4">
            Categorizado por tag de máquina
          </div>
        </div>

        {/* GRAPHIC 2: PENDÊNCIAS POR FRENTE */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[14px] uppercase font-light text-[var(--um-negativo-escuro)] tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[var(--um-negativo)] rounded-xs"></span>
                <span>Pendências Por Frente</span>
              </h3>
              <span className="text-[12px] bg-[var(--um-negativo-claro)] text-[var(--um-negativo-escuro)] font-medium px-2.5 py-0.5 rounded-lg border border-[var(--um-negativo)]">
                Abertas: {pendenciesCount}
              </span>
            </div>
            
            {pendenciesCount === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[var(--um-positivo)] text-[12px] font-normal uppercase text-center p-4">
                <Check className="w-6 h-6 mb-1 text-[var(--um-positivo)]" />
                <span>Nenhuma pendência pendente no período</span>
              </div>
            ) : (
              <div className="space-y-4 my-2">
                {(Object.keys(pendenciasPerFront) as Array<keyof typeof pendenciasPerFront>).map((key) => {
                  const val = pendenciasPerFront[key];
                  const maxVal = Math.max(...Object.values(pendenciasPerFront), 1);
                  const percent = (val / maxVal) * 100;
                  
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="font-medium text-[var(--um-cinza-escuro)]">{key}</span>
                        <strong className="text-[var(--um-negativo-escuro)] font-medium">{val} pend.</strong>
                      </div>
                      <div className="relative h-2.5 bg-[var(--um-fundo)] rounded-full overflow-hidden border border-[var(--um-cinza-claro)]">
                        <div 
                          className="absolute top-0 left-0 h-full bg-[var(--um-negativo)] rounded-full transition-all duration-700"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-3 mt-4">
            Atenção operacional por setor
          </div>
        </div>

        {/* GRAPHIC 3: STATUS GERAL (DONUT REPRESENTATION) */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] uppercase font-light text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
              <span>Status Geral dos Equipamentos</span>
            </h3>
            
            {donutTotal === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-[var(--um-cinza-texto)] text-[12px] font-normal uppercase text-center p-4">
                <HelpCircle className="w-8 h-8 text-[var(--um-cinza-claro)] mb-2" />
                <span>Sem dados disponíveis</span>
                <span className="text-[12px] lowercase font-normal text-[var(--um-cinza-texto)]">no intervalo selecionado</span>
              </div>
            ) : (
              <div className="flex items-center gap-4 py-2">
                {/* Visual SVG Donut Ring */}
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--um-cinza-claro)" strokeWidth="3" />
                    
                    {(() => {
                      const pCleared = (clearedCount / donutTotal) * 100;
                      const pInProgress = (inProgressCount / donutTotal) * 100;
                      const pPending = (pendenciesCount / donutTotal) * 100;

                      let currentOffset = 0;
                      
                      // Cleared (Green U&M Positivo: #19502F)
                      const strokeDashArrayGreen = `${pCleared} ${100 - pCleared}`;
                      const strokeDashOffsetGreen = 0;
                      currentOffset += pCleared;

                      // In Progress (Yellow U&M Alerta: #E2A937)
                      const strokeDashArrayYellow = `${pInProgress} ${100 - pInProgress}`;
                      const strokeDashOffsetYellow = -currentOffset;
                      currentOffset += pInProgress;

                      // Pending (Red U&M Negativo: #DC3545)
                      const strokeDashArrayRed = `${pPending} ${100 - pPending}`;
                      const strokeDashOffsetRed = -currentOffset;

                      return (
                        <>
                          {pCleared > 0 && (
                            <circle 
                              cx="18" cy="18" r="15.915" fill="none" 
                              stroke="var(--um-positivo)" strokeWidth="4.5" 
                              strokeDasharray={strokeDashArrayGreen} 
                              strokeDashoffset={strokeDashOffsetGreen} 
                              className="transition-all duration-700"
                            />
                          )}
                          {pInProgress > 0 && (
                            <circle 
                              cx="18" cy="18" r="15.915" fill="none" 
                              stroke="var(--um-alerta)" strokeWidth="4.5" 
                              strokeDasharray={strokeDashArrayYellow} 
                              strokeDashoffset={strokeDashOffsetYellow} 
                              className="transition-all duration-700"
                            />
                          )}
                          {pPending > 0 && (
                            <circle 
                              cx="18" cy="18" r="15.915" fill="none" 
                              stroke="var(--um-negativo)" strokeWidth="4.5" 
                              strokeDasharray={strokeDashArrayRed} 
                              strokeDashoffset={strokeDashOffsetRed} 
                              className="transition-all duration-700"
                            />
                          )}
                        </>
                      );
                    })()}
                  </svg>
                  
                  {/* Center stats */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-light text-[var(--um-cinza-escuro)]">{donutTotal}</span>
                    <span className="text-[10px] uppercase text-[var(--um-cinza-texto)] font-normal tracking-wider">Total</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="flex-1 space-y-2 text-[12px]">
                  <div className="flex justify-between items-center text-[var(--um-cinza-texto)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--um-positivo)]"></span> Liberados:
                    </span>
                    <strong className="text-[var(--um-cinza-escuro)] font-medium">{clearedCount}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[var(--um-cinza-texto)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--um-alerta)]"></span> Em Progresso:
                    </span>
                    <strong className="text-[var(--um-cinza-escuro)] font-medium">{inProgressCount}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[var(--um-cinza-texto)]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--um-negativo)]"></span> Pendências:
                    </span>
                    <strong className="text-[var(--um-negativo-escuro)] font-medium">{pendenciesCount}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-[12px] text-[var(--um-cinza-texto)] font-normal uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-3 mt-4">
            Disponibilidade da frota
          </div>
        </div>
      </div>

      {/* BLOCO NOVO: TOP 10 SISTEMAS COM MAIS PARADAS E TOP 10 SINTOMAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* TOP 10 SISTEMAS COM MAIS PARADAS */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-[var(--um-cinza-claro)] mb-4">
              <h3 className="text-[14px] uppercase font-light text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
                <span>Top 10 sistemas com mais paradas</span>
              </h3>
              <span className="text-[11px] bg-[var(--um-fundo)] text-[var(--um-verde-principal)] font-medium px-2.5 py-0.5 rounded-lg border border-[var(--um-cinza-claro)]">
                Período Filtrado
              </span>
            </div>

            {top10Sistemas.length === 0 ? (
              <div className="py-8 text-center text-[var(--um-cinza-texto)] text-[12px] font-normal uppercase">
                Nenhuma falha catalogada por sistema no período selecionado.
              </div>
            ) : (
              <div className="space-y-3">
                {top10Sistemas.map((item, idx) => {
                  const maxQtd = Math.max(...top10Sistemas.map(x => x.qtd), 1);
                  const pct = (item.qtd / maxQtd) * 100;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-medium text-[var(--um-cinza-escuro)] truncate">
                          <span className="text-[var(--um-cinza-texto)] font-mono mr-1.5">#{idx + 1}</span>
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-[11px] font-medium text-[var(--um-verde-principal)]">
                            {item.qtd} {item.qtd === 1 ? 'parada' : 'paradas'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--um-alerta-claro)] border border-[var(--um-alerta)] text-[11px] font-medium text-[var(--um-alerta-escuro)]">
                            {formatarMinutosEmHorasEMinutos(item.minutos)}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-[var(--um-fundo)] rounded-full overflow-hidden border border-[var(--um-cinza-claro)]">
                        <div
                          className="absolute top-0 left-0 h-full bg-[var(--um-verde-principal)] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-[11px] text-[var(--um-cinza-texto)] font-normal uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-3 mt-4">
            Quantidade de paradas e horas paradas por sistema
          </div>
        </div>

        {/* TOP 10 SINTOMAS */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-[var(--um-cinza-claro)] mb-4">
              <h3 className="text-[14px] uppercase font-light text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-[var(--um-alerta)] rounded-xs"></span>
                <span>Top 10 sintomas</span>
              </h3>
              <span className="text-[11px] bg-[var(--um-fundo)] text-[var(--um-verde-principal)] font-medium px-2.5 py-0.5 rounded-lg border border-[var(--um-cinza-claro)]">
                Período Filtrado
              </span>
            </div>

            {top10Sintomas.length === 0 ? (
              <div className="py-8 text-center text-[var(--um-cinza-texto)] text-[12px] font-normal uppercase">
                Nenhum sintoma catalogado no período selecionado.
              </div>
            ) : (
              <div className="space-y-3">
                {top10Sintomas.map((item, idx) => {
                  const maxQtd = Math.max(...top10Sintomas.map(x => x.qtd), 1);
                  const pct = (item.qtd / maxQtd) * 100;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-medium text-[var(--um-cinza-escuro)] truncate">
                          <span className="text-[var(--um-cinza-texto)] font-mono mr-1.5">#{idx + 1}</span>
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] text-[11px] font-medium text-[var(--um-verde-principal)]">
                            {item.qtd} {item.qtd === 1 ? 'parada' : 'paradas'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--um-alerta-claro)] border border-[var(--um-alerta)] text-[11px] font-medium text-[var(--um-alerta-escuro)]">
                            {formatarMinutosEmHorasEMinutos(item.minutos)}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-[var(--um-fundo)] rounded-full overflow-hidden border border-[var(--um-cinza-claro)]">
                        <div
                          className="absolute top-0 left-0 h-full bg-[var(--um-alerta)] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-[11px] text-[var(--um-cinza-texto)] font-normal uppercase tracking-wider text-right border-t border-[var(--um-cinza-claro)] pt-3 mt-4">
            Quantidade de paradas e horas paradas por sintoma
          </div>
        </div>
      </div>

      {/* RECENT MAINTENANCE STREAM AND OPEN OUTSTANDINGS TABLE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* TABLE 1: ÚLTIMAS MANUTENÇÕES */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs xl:col-span-7 flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-[var(--um-cinza-claro)] mb-4">
            <h3 className="text-[14px] sm:text-[16px] uppercase font-light text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
              <span>Últimas Manutenções dos Equipamentos</span>
            </h3>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[12px] text-[var(--um-cinza-texto)] font-normal uppercase">
                Listando {sortedMaintenance.length} {isFilterActive ? 'registros filtrados por data/hora' : 'registros'}
              </span>
              <span className="sm:hidden text-[10px] bg-[var(--um-fundo)] text-[var(--um-verde-principal)] px-2 py-0.5 rounded-md font-normal uppercase">
                Arraste ↔
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {sortedMaintenance.length === 0 ? (
              <div className="py-12 text-center text-[var(--um-cinza-texto)] font-normal uppercase text-[12px]">
                Nenhuma manutenção encontrada no período e filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left text-[12px] min-w-[550px]">
                <thead>
                  <tr className="border-b border-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] uppercase text-[12px] font-light tracking-wider">
                    <th className="pb-2.5">Equipamento</th>
                    <th className="pb-2.5">OM</th>
                    <th className="pb-2.5">Frente</th>
                    <th className="pb-2.5">Responsável</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Data & Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--um-cinza-claro)]">
                  {sortedMaintenance.map((at, idx) => {
                    const frenteParsed = parseFrente(at.reportFrente, at.equipamento);
                    const isEditingAt = editingItemId === at.id && editingItemType === 'atendimento';
                    return (
                      <tr key={`${at.id || 'at'}-${idx}`} className="hover:bg-[var(--um-fundo)] transition-colors">
                        <td className="py-3 font-medium text-[var(--um-cinza-escuro)]">
                          <div className="text-[13px]">{safeString(at.equipamento)}</div>
                          {at.falha && (
                            <div className="text-[11px] font-medium text-[#19502F] mt-0.5">
                              🔧 {formatarFalhaCard(at.falha)}
                            </div>
                          )}
                          {isEditingAt ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <input 
                                type="datetime-local" 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-[var(--um-branco)] border border-[var(--um-verde-principal)] rounded-lg px-2 py-1 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdatePrevisaoLiberacao(at.parentReportId, at.id, 'atendimento', editValue);
                                  setEditingItemId(null);
                                  setEditingItemType(null);
                                }}
                                className="p-1.5 bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] rounded-lg cursor-pointer flex items-center justify-center"
                                title="Salvar"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(null);
                                  setEditingItemType(null);
                                }}
                                className="p-1.5 bg-[var(--um-cinza-claro)] hover:bg-[var(--um-cinza-texto)] text-[var(--um-cinza-escuro)] rounded-lg cursor-pointer flex items-center justify-center"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : at.previsaoLiberacao ? (
                            <div className="flex items-center gap-1.5 mt-0.5 group/lib">
                              <span className="text-[12px] text-[var(--um-alerta-escuro)] font-medium" title="Previsão de Liberação">
                                ⏰ LIBERAÇÃO: {formatDateTime(at.previsaoLiberacao)}
                              </span>
                              {currentUser?.role === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemId(at.id);
                                    setEditingItemType('atendimento');
                                    setEditValue(at.previsaoLiberacao || '');
                                  }}
                                  className="opacity-0 group-hover/lib:opacity-100 cursor-pointer text-[var(--um-cinza-texto)] hover:text-[var(--um-verde-principal)] transition py-0.5"
                                  title="Editar Liberação"
                                >
                                  <Clock className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            currentUser?.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(at.id);
                                  setEditingItemType('atendimento');
                                  setEditValue('');
                                }}
                                className="text-[12px] text-[var(--um-cinza-texto)] hover:text-[var(--um-verde-principal)] uppercase tracking-wider block mt-0.5 hover:underline cursor-pointer font-light"
                              >
                                + Add Liberação
                              </button>
                            )
                          )}
                        </td>
                        <td className="py-3 text-[var(--um-cinza-texto)] font-normal">{safeString(at.om)}</td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-lg text-[12px] font-medium uppercase tracking-wider bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)]">
                            {frenteParsed || 'NÃO INFORMADO'}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--um-cinza-texto)] font-normal truncate max-w-[120px]">{safeString(at.reportMecanico)}</td>
                        <td className="py-3">{getStatusBadge(at)}</td>
                        <td className="py-3 text-right text-[12px] whitespace-nowrap">
                          <div className="font-medium text-[var(--um-cinza-escuro)]">
                            {at.reportDate ? safeDateFormat(at.reportDate) : 'NÃO INFORMADO'}
                          </div>
                          {(at.horaInicio && at.horaInicio !== 'NÃO INFORMADO') && (
                            <div className="text-[12px] text-[var(--um-verde-principal)] font-medium flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{at.horaInicio}{at.horaFim && at.horaFim !== 'NÃO INFORMADO' ? ` - ${at.horaFim}` : ''}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* TABLE 2: PENDÊNCIAS EM ABERTO */}
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs xl:col-span-5 flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-[var(--um-cinza-claro)] mb-4">
            <h3 className="text-[14px] sm:text-[16px] uppercase font-light text-[var(--um-negativo-escuro)] tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[var(--um-negativo)] rounded-xs"></span>
              <span>Pendências Abertas</span>
            </h3>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[12px] text-[var(--um-negativo-escuro)] bg-[var(--um-negativo-claro)] px-2.5 py-0.5 rounded-lg border border-[var(--um-negativo)] font-medium">
                TOTAL: {filteredPendencias.length}
              </span>
              <span className="sm:hidden text-[10px] bg-[var(--um-negativo-claro)] text-[var(--um-negativo-escuro)] px-2 py-0.5 rounded-md font-normal uppercase">
                Arraste ↔
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {allPendencias.length === 0 ? (
              <div className="py-12 text-center text-[var(--um-positivo)] font-normal uppercase text-[12px] bg-[var(--um-fundo)] rounded-xl border border-[var(--um-cinza-claro)]">
                ✅ Tudo limpo! Nenhuma pendência em aberto.
              </div>
            ) : (
              <table className="w-full text-left text-[12px] min-w-[380px]">
                <thead>
                  <tr className="border-b border-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] uppercase text-[12px] font-light tracking-wider">
                    <th className="pb-2.5">Equipamento</th>
                    <th className="pb-2.5">Descrição</th>
                    <th className="pb-2.5">Frente</th>
                    <th className="pb-2.5 text-right">Prioridade</th>
                    {currentUser?.role === 'admin' && <th className="pb-2.5 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--um-cinza-claro)]">
                  {allPendencias.map((p, idx) => {
                    const prio = getPriority(p.descricao);
                    const frenteParsed = parseFrente(p.reportFrente, p.equipamento);
                    const isEditingPend = editingItemId === p.id && editingItemType === 'pendencia';
                    return (
                      <tr key={`${p.id || 'p'}-${idx}`} className="hover:bg-[var(--um-fundo)] transition-colors">
                        <td className="py-3 font-medium text-[var(--um-cinza-escuro)]">
                          <div className="text-[13px]">{safeString(p.equipamento)}</div>
                          {isEditingPend ? (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <input 
                                type="datetime-local" 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-[var(--um-branco)] border border-[var(--um-verde-principal)] rounded-lg px-2 py-1 text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:ring-1 focus:ring-[var(--um-verde-principal)]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdatePrevisaoLiberacao(p.parentReportId, p.id, 'pendencia', editValue);
                                  setEditingItemId(null);
                                  setEditingItemType(null);
                                }}
                                className="p-1.5 bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] rounded-lg cursor-pointer flex items-center justify-center"
                                title="Salvar"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(null);
                                  setEditingItemType(null);
                                }}
                                className="p-1.5 bg-[var(--um-cinza-claro)] hover:bg-[var(--um-cinza-texto)] text-[var(--um-cinza-escuro)] rounded-lg cursor-pointer flex items-center justify-center"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : p.previsaoLiberacao ? (
                            <div className="flex items-center gap-1.5 mt-0.5 group/lib">
                              <span className="text-[12px] text-[var(--um-alerta-escuro)] font-medium" title="Previsão de Liberação">
                                ⏰ LIBERAÇÃO: {formatDateTime(p.previsaoLiberacao)}
                              </span>
                              {currentUser?.role === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItemId(p.id);
                                    setEditingItemType('pendencia');
                                    setEditValue(p.previsaoLiberacao || '');
                                  }}
                                  className="opacity-0 group-hover/lib:opacity-100 cursor-pointer text-[var(--um-cinza-texto)] hover:text-[var(--um-verde-principal)] transition py-0.5"
                                  title="Editar Liberação"
                                >
                                  <Clock className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            currentUser?.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(p.id);
                                  setEditingItemType('pendencia');
                                  setEditValue('');
                                }}
                                className="text-[12px] text-[var(--um-cinza-texto)] hover:text-[var(--um-verde-principal)] uppercase tracking-wider block mt-0.5 hover:underline cursor-pointer font-light"
                              >
                                + Add Liberação
                              </button>
                            )
                          )}
                        </td>
                        <td className="py-3 text-[var(--um-cinza-texto)] font-normal max-w-[150px] truncate" title={safeString(p.descricao)}>
                          {safeString(p.descricao)}
                        </td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-lg text-[12px] font-medium uppercase tracking-wider bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)]">
                            {frenteParsed || 'NÃO INFORMADO'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[12px] uppercase font-medium ${prio.colorClass}`}>
                            {prio.label}
                          </span>
                        </td>
                        {currentUser?.role === 'admin' && (
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                handleResolvePendenciaInDashboard(p.parentReportId, p.id);
                              }}
                              className="px-2.5 py-1 bg-[var(--um-positivo)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] rounded-lg text-[12px] font-light uppercase transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                              title="Resolver pendência desta máquina"
                            >
                              <Check className="w-3 h-3" /> Resolver
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      {/* SECTION: HORIZONTE DE PARADA DOS EQUIPAMENTOS (PREVENTIVAS) */}
      <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs mt-6 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-[var(--um-cinza-claro)] mb-4 gap-3">
          <div>
            <h3 className="text-[14px] sm:text-[16px] uppercase font-light text-[var(--um-verde-principal)] tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-[var(--um-verde-principal)] rounded-xs"></span>
              <span>Horizonte de Parada dos Equipamentos (Preventivas)</span>
            </h3>
            <p className="text-[12px] text-[var(--um-cinza-texto)] font-normal mt-0.5">
              Acompanhamento das datas programadas para paradas preventivas de equipamentos
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--um-verde-principal)] bg-[var(--um-fundo)] px-3 py-1 rounded-xl border border-[var(--um-cinza-claro)] font-medium">
              TOTAL DE PREVENTIVAS: {preventivas.length}
            </span>
          </div>
        </div>

        {preventivas.length === 0 ? (
          <div className="py-12 text-center text-[var(--um-cinza-texto)] font-normal uppercase text-[12px]">
            Nenhuma parada preventiva programada no sistema.
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              const normais = preventivas.filter(p => !p.statusPreventiva || p.statusPreventiva === 'EM ANDAMENTO' || p.statusPreventiva === 'CONFIRMADO');
              const monitorar = preventivas.filter(p => p.statusPreventiva === 'MONITORAR');

              const renderDashboardRows = (items: typeof preventivas) => {
                return items.map((p) => {
                  let statusBgClass = '';
                  if (p.statusPreventiva === 'CONFIRMADO') {
                    statusBgClass = 'bg-[var(--um-alerta-claro)] text-[var(--um-alerta-escuro)] border border-[var(--um-alerta)]';
                  } else if (p.statusPreventiva === 'MONITORAR') {
                    statusBgClass = 'bg-[var(--um-qualidade-claro)] text-[var(--um-qualidade-escuro)] border border-[var(--um-qualidade)]';
                  } else {
                    // EM ANDAMENTO
                    statusBgClass = 'bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)]';
                  }

                  return (
                    <tr key={p.id} className="hover:bg-[var(--um-fundo)] transition divide-x divide-[var(--um-cinza-claro)] border-b border-[var(--um-cinza-claro)]">
                      
                      {/* Data Inicio */}
                      <td className="px-3 py-2.5 text-center text-[var(--um-cinza-escuro)] font-medium text-[12px]">
                        {p.dataInicio || p.dataParada || '-'}
                      </td>

                      {/* Tag Equip. */}
                      <td className="px-3 py-2.5 text-center text-[var(--um-cinza-escuro)] font-medium text-[12px] uppercase">
                        {p.equipamento || '-'}
                      </td>

                      {/* Hora Preventiva */}
                      <td className="px-3 py-2.5 text-center text-[var(--um-cinza-texto)] font-normal text-[12px]">
                        {p.horaPreventiva || '-'}
                      </td>

                      {/* Horas PMPP / Faltantes */}
                      <td className="px-3 py-2.5 text-center text-[var(--um-alerta-escuro)] font-medium text-[12px]">
                        {p.horasPmppConfirmada || '-'}
                      </td>

                      {/* Limite Horímetro */}
                      <td className="px-3 py-2.5 text-center text-[var(--um-negativo-escuro)] font-medium text-[12px]">
                        {p.limiteHorimetro || '-'}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-medium tracking-wider ${statusBgClass}`}>
                          {p.statusPreventiva || 'EM ANDAMENTO'}
                        </span>
                      </td>

                      {/* Ações Administrador */}
                      {currentUser?.role === 'admin' && (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              onDeletePreventiva(p.id);
                            }}
                            className="bg-[var(--um-negativo-claro)] hover:bg-[var(--um-negativo)] text-[var(--um-negativo-escuro)] hover:text-[var(--um-branco)] p-1 rounded-lg border border-[var(--um-negativo)] transition cursor-pointer"
                            title="Remover programação"
                          >
                            <Minimize2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}

                    </tr>
                  );
                });
              };

              return (
                <>
                  {/* TABELA 1: PROGRAMAÇÃO GERAL */}
                  <div className="bg-[var(--um-branco)] rounded-xl border border-[var(--um-cinza-claro)] overflow-hidden shadow-xs">
                    <div className="bg-[var(--um-verde-principal)] text-[var(--um-branco)] px-4 py-2.5 font-light text-[12px] uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--um-branco)] animate-pulse"></span>
                        PROGRAMAÇÃO DE PREVENTIVA UMCA
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="sm:hidden text-[10px] bg-[var(--um-verde-secundario)] text-[var(--um-branco)] px-2 py-0.5 rounded uppercase">
                          Arraste ↔
                        </span>
                        <span className="text-[12px] bg-[var(--um-verde-secundario)] px-2.5 py-0.5 rounded font-normal text-[var(--um-branco)]">
                          ATIVAS: {normais.length}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] text-[12px] font-light tracking-wider uppercase border-b border-[var(--um-cinza-claro)] divide-x divide-[var(--um-cinza-claro)]">
                            <th className="px-3 py-2.5 text-center min-w-[110px]">DATA INÍCIO</th>
                            <th className="px-3 py-2.5 text-center min-w-[100px]">TAG. EQUIP.</th>
                            <th className="px-3 py-2.5 text-center min-w-[110px]">HORA PREVENTIVA</th>
                            <th className="px-3 py-2.5 text-center min-w-[130px]">HORAS PMPP CONFIRMADA</th>
                            <th className="px-3 py-2.5 text-center min-w-[120px]">LIMITE DE HORÍMETRO</th>
                            <th className="px-3 py-2.5 text-center min-w-[130px]">STATUS</th>
                            {currentUser?.role === 'admin' && <th className="px-3 py-2.5 text-center w-[60px]">AÇÃO</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--um-cinza-claro)] text-[12px]">
                          {normais.length === 0 ? (
                            <tr>
                              <td colSpan={currentUser?.role === 'admin' ? 7 : 6} className="px-4 py-6 text-center text-[var(--um-cinza-texto)] font-normal uppercase text-[12px] tracking-wider select-none">
                                NENHUMA PREVENTIVA ATIVA PROGRAMADA NO MOMENTO.
                              </td>
                            </tr>
                          ) : (
                            renderDashboardRows(normais)
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TABELA 2: MONITORAMENTO */}
                  <div className="bg-[var(--um-branco)] rounded-xl border border-[var(--um-cinza-claro)] overflow-hidden shadow-xs mt-4">
                    <div className="bg-[var(--um-verde-secundario)] text-[var(--um-branco)] px-4 py-2.5 font-light text-[12px] uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--um-qualidade-claro)] animate-pulse"></span>
                        EQUIPAMENTOS EM MONITORAMENTO
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="sm:hidden text-[10px] bg-[var(--um-verde-principal)] text-[var(--um-branco)] px-2 py-0.5 rounded uppercase">
                          Arraste ↔
                        </span>
                        <span className="text-[12px] bg-[var(--um-verde-principal)] px-2.5 py-0.5 rounded font-normal text-[var(--um-branco)]">
                          MONITORANDO: {monitorar.length}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] text-[12px] font-light tracking-wider uppercase border-b border-[var(--um-cinza-claro)] divide-x divide-[var(--um-cinza-claro)]">
                            <th className="px-3 py-2.5 text-center min-w-[110px]">DATA INÍCIO</th>
                            <th className="px-3 py-2.5 text-center min-w-[100px]">TAG. EQUIP.</th>
                            <th className="px-3 py-2.5 text-center min-w-[110px]">HORA PREVENTIVA</th>
                            <th className="px-3 py-2.5 text-center min-w-[130px]">HORAS FALTANTES</th>
                            <th className="px-3 py-2.5 text-center min-w-[120px]">LIMITE DE HORÍMETRO</th>
                            <th className="px-3 py-2.5 text-center min-w-[130px]">STATUS</th>
                            {currentUser?.role === 'admin' && <th className="px-3 py-2.5 text-center w-[60px]">AÇÃO</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--um-cinza-claro)] text-[12px]">
                          {monitorar.length === 0 ? (
                            <tr>
                              <td colSpan={currentUser?.role === 'admin' ? 7 : 6} className="px-4 py-6 text-center text-[var(--um-cinza-texto)] font-normal uppercase text-[12px] tracking-wider select-none">
                                NENHUM EQUIPAMENTO EM MONITORAMENTO NO MOMENTO.
                              </td>
                            </tr>
                          ) : (
                            renderDashboardRows(monitorar)
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ESCAPE BUTTON ONLY VISIBLE IN TV MODE FLOATING COMFORTABLY AT THE CORNER */}
      {isTvMode && (
        <button
          onClick={() => setIsTvMode(false)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[var(--um-negativo)] hover:bg-[var(--um-negativo-escuro)] text-[var(--um-branco)] uppercase text-[12px] font-light tracking-wider py-3 px-5 rounded-full shadow-lg transition cursor-pointer"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Sair da TV</span>
        </button>
      )}
    </div>
  );
}
