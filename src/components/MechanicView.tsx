import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Camera,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User as UserIcon,
  FileSpreadsheet,
  X,
  ClipboardList,
  Play,
  Pause,
  RotateCcw,
  Wrench,
  Search,
  Users,
  AlertCircle,
  ArrowRight,
  Lock,
  Unlock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Save
} from 'lucide-react';
import {
  Report,
  Atendimento,
  Pendencia,
  User,
  Preventiva,
  Tecnico,
  Parada,
  FalhaCatalogada
} from '../types';
import { ReportCardAccordion } from './ReportCardAccordion';
import { SeletorTecnico } from './SeletorTecnico';
import { SeletorCatalogo } from './SeletorCatalogo';
import { ResumoOperacionalControle } from './ResumoOperacionalControle';
import {
  formatarFalhaCard,
  perfilDaTag,
  precisaEscolherPerfilCR
} from '../data/catalogoFalhas';
import {
  getSegmentoAtual,
  calcularDuracaoTotalParadaMinutos,
  formatarParadoHaXhYm,
  iniciarAtendimentoParada,
  pausarAtendimentoParada,
  retomarAtendimentoParada,
  finalizarAtendimentoParada,
  criarNovaParada,
  MOTIVOS_PAUSA_RAPIDA
} from '../lib/paradasEngine';
import { getResponsabilidadeStyle } from '../theme/uEmTheme';
import {
  derivarFrenteDaTag,
  normalizarTag,
  formatarHoraPtBr,
  formatarDataPtBr,
  removerAcentos
} from '../lib/uEmDataUtils';
import { CODIGOS_VALE_FLAT } from '../data/codigosVale';

interface MechanicViewProps {
  user: User;
  reports: Report[];
  onSaveReport: (report: Report, silent?: boolean) => void;
  isOffline: boolean;
  onDeleteReport: (id: string) => void;
  preventivas: Preventiva[];
  onAddPreventiva: (p: Omit<Preventiva, 'id' | 'createdAt'>) => void;
  onDeletePreventiva: (id: string) => void;
  tecnicos?: Tecnico[];
  paradas?: Parada[];
  onSaveParada?: (p: Parada) => void;
}

const ULTIMA_TURMA_KEY = 'rft_ultima_turma';
const ULTIMO_TECNICO_KEY = 'rft_ultimo_tecnico';
const MEUS_ATENDIMENTOS_IDS_KEY = 'rft_meus_atendimentos_ids';

/**
 * Calcula o turno/horário automaticamente a partir da hora de início e da turma (Regra C2.a)
 * 06:00–18:00 = dia; 18:00–06:00 = noite; 07:00–17:00 se turma ADM.
 */
function calcularTurnoPelaHoraETurma(horaHhMm: string, turma: string): string {
  if (turma === 'ADM') {
    return '07:00 às 17:00 (ADM)';
  }
  if (horaHhMm && horaHhMm.includes(':')) {
    const [hh] = horaHhMm.split(':').map(Number);
    if (!isNaN(hh)) {
      if (hh >= 6 && hh < 18) {
        return '06:00 às 18:00';
      }
      return '18:00 às 06:00';
    }
  }
  const horaAtual = new Date().getHours();
  return horaAtual >= 6 && horaAtual < 18 ? '06:00 às 18:00' : '18:00 às 06:00';
}

/**
 * Converte um horário HH:mm em ISO preservando a data de referência e o instante exato do toque quando aplicável.
 */
function resolverHorarioIso(
  horaHhMm: string,
  horaToqueIso: string,
  referenciaMinimaIso?: string
): string {
  const toqueDate = new Date(horaToqueIso);
  const toqueHhMm = toqueDate.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  if (!horaHhMm || !horaHhMm.includes(':')) {
    return horaToqueIso;
  }

  if (horaHhMm === toqueHhMm) {
    if (referenciaMinimaIso) {
      const minMs = new Date(referenciaMinimaIso).getTime();
      if (toqueDate.getTime() >= minMs) {
        return horaToqueIso;
      }
    } else {
      return horaToqueIso;
    }
  }

  const baseDate = referenciaMinimaIso ? new Date(referenciaMinimaIso) : toqueDate;
  const [hh, mm] = horaHhMm.split(':').map(Number);
  const candidate = new Date(baseDate);
  candidate.setHours(hh, mm, 0, 0);

  if (referenciaMinimaIso) {
    const minMs = new Date(referenciaMinimaIso).getTime();
    if (candidate.getTime() < minMs && minMs - candidate.getTime() > 6 * 3600 * 1000) {
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  return candidate.toISOString();
}

function getMeusAtendimentosIds(): string[] {
  try {
    const raw = localStorage.getItem(MEUS_ATENDIMENTOS_IDS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function addMeuAtendimentoId(id: string) {
  try {
    const atual = new Set(getMeusAtendimentosIds());
    atual.add(id);
    localStorage.setItem(MEUS_ATENDIMENTOS_IDS_KEY, JSON.stringify(Array.from(atual)));
  } catch {}
}

function removeMeuAtendimentoId(id: string) {
  try {
    const atual = new Set(getMeusAtendimentosIds());
    atual.delete(id);
    localStorage.setItem(MEUS_ATENDIMENTOS_IDS_KEY, JSON.stringify(Array.from(atual)));
  } catch {}
}

export function MechanicView({
  user,
  reports,
  onSaveReport,
  isOffline,
  onDeleteReport,
  tecnicos = [],
  paradas = [],
  onSaveParada
}: MechanicViewProps) {
  // Navegação principal do Controle:
  // 'painel' (Tela Inicial B1 + B2 + B3), 'meus_relatorios' (B4), 'atendimento' (Tela C2)
  const [activeTab, setActiveTab] = useState<'painel' | 'meus_relatorios' | 'atendimento'>('painel');

  // ID do relatório rascunho atual e da parada sendo atendida na tela C2
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeParadaId, setActiveParadaId] = useState<string | null>(null);

  // Lightbox de fotos
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Dados do Atendimento / Cabeçalho (C1 & C2)
  const [dateStart, setDateStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [team, setTeam] = useState(() => {
    try {
      return localStorage.getItem(ULTIMA_TURMA_KEY) || 'A';
    } catch {
      return 'A';
    }
  });
  const [shift, setShift] = useState(() => calcularTurnoPelaHoraETurma('', 'A'));
  const [frente, setFrente] = useState('EH');

  // Técnico Responsável e Equipe
  const [tecnicoNome, setTecnicoNome] = useState('');
  const [tecnicoFuncao, setTecnicoFuncao] = useState('Mecânico');
  const [tecnicoMatricula, setTecnicoMatricula] = useState('');
  const [tecnicoGrupo, setTecnicoGrupo] = useState('');
  const [extraIntegrantes, setExtraIntegrantes] = useState<
    Array<{
      id: string;
      nome: string;
      funcao: string;
      matricula: string;
      papel: string;
    }>
  >([]);

  // Carrega último técnico usado no aparelho como sugestão inicial
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ULTIMO_TECNICO_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.nome) {
          setTecnicoNome(parsed.nome);
          setTecnicoFuncao(parsed.funcao || 'Mecânico');
          setTecnicoMatricula(parsed.matricula || '');
          setTecnicoGrupo(parsed.grupo || '');
        }
      }
    } catch {}
  }, []);

  // Lista de Atendimentos, Pendências e Observações do relatório ativo
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [mostrarObservacoes, setMostrarObservacoes] = useState(false);

  // Controles de destravamento individual na tela "ATENDIMENTO • <TAG>" (C2.a e C2.b)
  const [destravarCabecalho, setDestravarCabecalho] = useState<{
    om?: boolean;
    equipe?: boolean;
    tipoManut?: boolean;
    horaInicio?: boolean;
    dataTurma?: boolean;
    sintomaCatalogo?: boolean;
  }>({});

  const presetEquipments = ['EH-4050', 'EH-5004', 'CR-3116', 'PF-1031', 'EH-5003'];

  // Refs para auto-save de rascunho a cada alteração (Regra C2.e)
  const skipAutoSaveRef = useRef(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [ultimoAutoSaveHhMm, setUltimoAutoSaveHhMm] = useState<string>('');

  // Relógio de atualização a cada 30s
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const [filtroFrenteParada, setFiltroFrenteParada] = useState<'TODAS' | 'EH' | 'CR' | 'PF' | 'INFRA'>('TODAS');
  const [filtroTagParada, setFiltroTagParada] = useState('');
  const [highlightParadaId, setHighlightParadaId] = useState<string | null>(null);
  const [meusIdsLocais, setMeusIdsLocais] = useState<string[]>(() => getMeusAtendimentosIds());

  // Modal C1: INICIAR ATENDIMENTO • <TAG>
  const [iniciandoParada, setIniciandoParada] = useState<Parada | null>(null);
  const [iniciandoHoraToqueIso, setIniciandoHoraToqueIso] = useState<string>('');
  const [iniciandoHoraHhMm, setIniciandoHoraHhMm] = useState<string>('');
  const [iniciandoTipoManutencao, setIniciandoTipoManutencao] = useState<'CORRETIVA' | 'PREVENTIVA' | 'PROGRAMADA'>('CORRETIVA');
  const [iniciandoErroTecnico, setIniciandoErroTecnico] = useState<string>('');

  // Modal C3: ABRIR NOVA PARADA (pelo técnico)
  const [showNovaParadaModal, setShowNovaParadaModal] = useState(false);
  const [novaParadaTag, setNovaParadaTag] = useState('');
  const [novaParadaFrente, setNovaParadaFrente] = useState('EH');
  const [novaParadaHoraReal, setNovaParadaHoraReal] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [novaParadaCodigo, setNovaParadaCodigo] = useState('HMC 9130');
  const [novaParadaOS, setNovaParadaOS] = useState('');
  const [novaParadaSintoma, setNovaParadaSintoma] = useState('');
  const [novaParadaFalha, setNovaParadaFalha] = useState<FalhaCatalogada | null>(null);

  // Modal PAUSAR ATENDIMENTO
  const [pausandoParada, setPausandoParada] = useState<Parada | null>(null);
  const [pausaHoraToqueIso, setPausaHoraToqueIso] = useState<string>('');
  const [pausaHoraHhMm, setPausaHoraHhMm] = useState<string>('');
  const [pausaModoOutro, setPausaModoOutro] = useState(false);
  const [pausaCodigo, setPausaCodigo] = useState('HMC 9118');
  const [pausaComplemento, setPausaComplemento] = useState('');
  const [pausaBuscaOutro, setPausaBuscaOutro] = useState('');

  // Modal RETOMAR ATENDIMENTO
  const [retomandoParada, setRetomandoParada] = useState<Parada | null>(null);
  const [retomarHoraToqueIso, setRetomarHoraToqueIso] = useState<string>('');
  const [retomarHoraHhMm, setRetomarHoraHhMm] = useState<string>('');

  // Modal FINALIZAR ATENDIMENTO (C2.d)
  const [finalizandoParada, setFinalizandoParada] = useState<Parada | null>(null);
  const [finalizarHoraToqueIso, setFinalizarHoraToqueIso] = useState<string>('');
  const [finalizarHoraFim, setFinalizarHoraFim] = useState(() =>
    new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [finalizarLiberado, setFinalizarLiberado] = useState(true);
  const [finalizarCodigoContinuacao, setFinalizarCodigoContinuacao] = useState('HMC 9118');
  const [finalizarComplemento, setFinalizarComplemento] = useState('');
  const [finalizarHorimetro, setFinalizarHorimetro] = useState('');
  const [finalizarSintoma, setFinalizarSintoma] = useState('');
  const [finalizarFalha, setFinalizarFalha] = useState<FalhaCatalogada | null>(null);
  const [finalizarCausa, setFinalizarCausa] = useState('');
  const [finalizarAcao, setFinalizarAcao] = useState('');
  const [finalizarErro, setFinalizarErro] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Lista de Paradas ABERTAS ordenadas pelo maior tempo parado
  const paradasAbertasOrdenadas = useMemo(() => {
    return paradas
      .filter((p) => p.situacao === 'ABERTA')
      .sort((a, b) => {
        const dA = calcularDuracaoTotalParadaMinutos(a, liveNow);
        const dB = calcularDuracaoTotalParadaMinutos(b, liveNow);
        return dB - dA;
      });
  }, [paradas, liveNow]);

  // Filtro por frente e busca por TAG (B1)
  const paradasAbertasFiltradas = useMemo(() => {
    return paradasAbertasOrdenadas.filter((p) => {
      if (filtroFrenteParada !== 'TODAS' && p.frente !== filtroFrenteParada) return false;
      if (filtroTagParada.trim()) {
        const q = removerAcentos(filtroTagParada);
        const matchTag = removerAcentos(p.tag).includes(q);
        const seg = getSegmentoAtual(p);
        const matchStatus = removerAcentos(`${seg.codigo} ${seg.nome}`).includes(q);
        if (!matchTag && !matchStatus) return false;
      }
      return true;
    });
  }, [paradasAbertasOrdenadas, filtroFrenteParada, filtroTagParada]);

  // B2. "MEUS ATENDIMENTOS EM ANDAMENTO": paradas que este aparelho/técnico iniciou e ainda não finalizou
  const meusAtendimentosEmAndamento = useMemo(() => {
    const tecNorm = removerAcentos(tecnicoNome);
    const rascunhosDoUsuario = reports.filter(
      (r) => r.mechanicUsername === user.username && r.status === 'RASCUNHO'
    );

    return paradasAbertasOrdenadas.filter((p) => {
      if (!p.emAtendimentoPor) return false;
      if (meusIdsLocais.includes(p.id)) return true;
      if (activeParadaId === p.id) return true;

      if (tecNorm) {
        const princNorm = removerAcentos(p.emAtendimentoPor.tecnicoPrincipal.nome || '');
        const naEquipe = (p.emAtendimentoPor.membrosEquipe || []).some(
          (m) => removerAcentos(m.nome) === tecNorm
        );
        if (princNorm === tecNorm || naEquipe) return true;
      }

      const temRascunho = rascunhosDoUsuario.some(
        (r) =>
          (p.relatorioIds || []).includes(r.id) ||
          (r.atendimentos || []).some((a) => normalizarTag(a.equipamento) === normalizarTag(p.tag))
      );
      return temRascunho;
    });
  }, [paradasAbertasOrdenadas, meusIdsLocais, activeParadaId, tecnicoNome, reports, user.username]);

  // Parada ativa na tela "ATENDIMENTO • <TAG>" (C2)
  const activeParada = useMemo(() => {
    if (activeParadaId) {
      const found = paradas.find((p) => p.id === activeParadaId);
      if (found) return found;
    }
    return null;
  }, [paradas, activeParadaId]);

  // Atendimento atual correspondente à parada ativa (ou primeiro atendimento do rascunho)
  const atendimentoAtual = useMemo(() => {
    if (activeParada) {
      const match = atendimentos.find(
        (a) => normalizarTag(a.equipamento) === normalizarTag(activeParada.tag)
      );
      if (match) return match;
    }
    return atendimentos[0] || null;
  }, [atendimentos, activeParada]);

  // Verifica duplicidade ao digitar TAG no modal "ABRIR NOVA PARADA"
  const paradaDuplicadaExistente = useMemo(() => {
    if (!novaParadaTag.trim()) return null;
    const norm = normalizarTag(novaParadaTag);
    return paradas.find((p) => p.situacao === 'ABERTA' && normalizarTag(p.tag) === norm) || null;
  }, [novaParadaTag, paradas]);

  // Constrói o objeto Report atual para salvar rascunho ou enviar
  const buildReportObject = (
    status: 'RASCUNHO' | 'ENVIADO',
    customAtendimentos?: Atendimento[],
    forcedId?: string,
    forcedTecnicoNome?: string
  ): Report => {
    const tecNomeFinal = (forcedTecnicoNome ?? tecnicoNome).trim();
    const listaAt = (customAtendimentos ?? atendimentos).map((at) => ({
      ...at,
      tipoManutencao: at.tipoManutencao || 'CORRETIVA',
      atuantes: at.atuantes || tecNomeFinal || ''
    }));

    const auxNome = extraIntegrantes
      .filter((m) => m.papel === 'Auxiliar')
      .map((m) => m.nome)
      .join(', ');
    const motNome = extraIntegrantes
      .filter((m) => m.papel === 'Motorista')
      .map((m) => m.nome)
      .join(', ');

    return {
      id: forcedId || activeReportId || `rep-${Date.now()}`,
      dateStart,
      dateEnd,
      team,
      shift,
      frente,
      tecnicoNome: tecNomeFinal,
      tecnicoFuncao,
      tecnicoMatricula,
      tecnicoGrupo,
      eletricista: tecnicoFuncao.toLowerCase().includes('eletricista') ? tecNomeFinal : '',
      mecanico: tecnicoFuncao.toLowerCase().includes('mecanico') || tecnicoFuncao.toLowerCase().includes('mecânico') ? tecNomeFinal : '',
      auxiliar: auxNome,
      motorista: motNome,
      monitor: '',
      equipeDetalhada: extraIntegrantes
        .filter((m) => m.nome.trim() !== '')
        .map((m) => ({
          nome: m.nome,
          matricula: m.matricula,
          funcao: m.funcao,
          papel: m.papel
        })),
      atendimentos: listaAt,
      pendencias,
      observacoesGerais,
      status,
      mechanicUsername: user.username,
      createdAt: new Date().toISOString()
    };
  };

  // Auto-save silencioso de rascunho a cada alteração enquanto estiver na tela de atendimento (Regra C2.e)
  useEffect(() => {
    if (activeTab !== 'atendimento' || !activeReportId || skipAutoSaveRef.current) return;
    if (atendimentos.length === 0) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const draft = buildReportObject('RASCUNHO');
      onSaveReport(draft, true);
      setUltimoAutoSaveHhMm(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    activeTab,
    activeReportId,
    dateStart,
    dateEnd,
    team,
    shift,
    frente,
    tecnicoNome,
    tecnicoFuncao,
    tecnicoMatricula,
    tecnicoGrupo,
    extraIntegrantes,
    atendimentos,
    pendencias,
    observacoesGerais
  ]);

  // Limpa estados para um novo atendimento
  const handleResetForm = () => {
    setActiveReportId(null);
    setActiveParadaId(null);
    setAtendimentos([]);
    setPendencias([]);
    setObservacoesGerais('');
    setMostrarObservacoes(false);
    setDestravarCabecalho({});
  };

  // Abre a tela "ATENDIMENTO • <TAG>" para continuar um atendimento já em andamento (B2 -> C2)
  const handleContinuarAtendimentoParada = (parada: Parada) => {
    // Procura se já existe um rascunho salvo para esta parada
    const rascunhoExistente = reports.find(
      (r) =>
        r.status === 'RASCUNHO' &&
        ((parada.relatorioIds || []).includes(r.id) ||
          (r.atendimentos || []).some((a) => normalizarTag(a.equipamento) === normalizarTag(parada.tag)))
    );

    const horaRealHhMm = new Date(parada.inicioParada).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const horaInicioHhMm = parada.emAtendimentoPor?.inicioAtendimento
      ? new Date(parada.emAtendimentoPor.inicioAtendimento).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const dataInicioIso = parada.emAtendimentoPor?.inicioAtendimento
      ? new Date(parada.emAtendimentoPor.inicioAtendimento).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    if (rascunhoExistente) {
      setActiveReportId(rascunhoExistente.id);
      setDateStart(rascunhoExistente.dateStart || dataInicioIso);
      setDateEnd(rascunhoExistente.dateEnd || dataInicioIso);
      setTeam(rascunhoExistente.team || team);
      setShift(
        rascunhoExistente.shift || calcularTurnoPelaHoraETurma(horaInicioHhMm, rascunhoExistente.team || team)
      );
      setFrente(parada.frente || rascunhoExistente.frente || derivarFrenteDaTag(parada.tag));
      if (rascunhoExistente.tecnicoNome) {
        setTecnicoNome(rascunhoExistente.tecnicoNome);
        setTecnicoFuncao(rascunhoExistente.tecnicoFuncao || 'Mecânico');
        setTecnicoMatricula(rascunhoExistente.tecnicoMatricula || '');
        setTecnicoGrupo(rascunhoExistente.tecnicoGrupo || '');
      } else if (parada.emAtendimentoPor?.tecnicoPrincipal) {
        setTecnicoNome(parada.emAtendimentoPor.tecnicoPrincipal.nome);
        setTecnicoFuncao(parada.emAtendimentoPor.tecnicoPrincipal.funcao || 'Mecânico');
        setTecnicoMatricula(parada.emAtendimentoPor.tecnicoPrincipal.matricula || '');
        setTecnicoGrupo(parada.emAtendimentoPor.tecnicoPrincipal.grupo || '');
      }
      setAtendimentos(rascunhoExistente.atendimentos || []);
      setPendencias(rascunhoExistente.pendencias || []);
      setObservacoesGerais(rascunhoExistente.observacoesGerais || '');
      setMostrarObservacoes(Boolean(rascunhoExistente.observacoesGerais));
    } else {
      const novoRepId = `rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const tecPrinc = parada.emAtendimentoPor?.tecnicoPrincipal;
      const nomeTec = tecPrinc?.nome || tecnicoNome || user.name || user.username;
      const membros = parada.emAtendimentoPor?.membrosEquipe || [];
      const todosAtuantes = [nomeTec, ...membros.map((m) => m.nome)].filter(Boolean).join(', ');
      const sintomaParada = formatarFalhaCard(parada.falha, parada.sintomaInicial);

      setActiveReportId(novoRepId);
      setDateStart(dataInicioIso);
      setDateEnd(dataInicioIso);
      setShift(calcularTurnoPelaHoraETurma(horaInicioHhMm, team));
      setFrente(parada.frente || derivarFrenteDaTag(parada.tag));
      if (tecPrinc) {
        setTecnicoNome(tecPrinc.nome);
        setTecnicoFuncao(tecPrinc.funcao || 'Mecânico');
        setTecnicoMatricula(tecPrinc.matricula || '');
        setTecnicoGrupo(tecPrinc.grupo || '');
      }
      setExtraIntegrantes(
        membros.map((m, idx) => ({
          id: m.id || `int-${idx}`,
          nome: m.nome,
          funcao: m.funcao || 'Auxiliar',
          matricula: m.matricula || '',
          papel: m.papel || 'Mecânico Apoio'
        }))
      );
      setAtendimentos([
        {
          id: `at-${Date.now()}`,
          equipamento: parada.tag,
          om: parada.numeroOS || '',
          horimetro: '',
          sintoma: sintomaParada || '',
          falha: parada.falha || null,
          causa: '',
          acaoExecutada: '',
          horaRealParada: horaRealHhMm,
          horaInicio: horaInicioHhMm,
          horaFim: '',
          tipoManutencao: parada.emAtendimentoPor?.tipoManutencao || 'CORRETIVA',
          liberadoOperacao: false,
          previsaoLiberacao: parada.previsaoLiberacao || '',
          atuantes: todosAtuantes
        }
      ]);
      setPendencias([]);
      setObservacoesGerais('');
      setMostrarObservacoes(false);
    }

    setDestravarCabecalho({});
    setActiveParadaId(parada.id);
    setActiveTab('atendimento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Carrega um relatório a partir da aba "MEUS RELATÓRIOS"
  const handleLoadReport = (report: Report) => {
    setActiveReportId(report.id);
    setDateStart(report.dateStart);
    setDateEnd(report.dateEnd);
    setTeam(report.team);
    setShift(report.shift);
    setFrente(report.frente);
    setTecnicoNome(report.tecnicoNome || report.mecanico || report.eletricista || report.monitor || '');
    setTecnicoFuncao(report.tecnicoFuncao || 'Mecânico');
    setTecnicoMatricula(report.tecnicoMatricula || '');
    setTecnicoGrupo(report.tecnicoGrupo || '');

    if (report.equipeDetalhada && report.equipeDetalhada.length > 0) {
      setExtraIntegrantes(
        report.equipeDetalhada.map((e, idx) => ({
          id: `int-${idx}-${Date.now()}`,
          nome: e.nome,
          funcao: e.funcao || 'Auxiliar',
          matricula: e.matricula || '',
          papel: e.papel || 'Auxiliar'
        }))
      );
    } else {
      setExtraIntegrantes([]);
    }

    setAtendimentos(report.atendimentos || []);
    setPendencias(report.pendencias || []);
    setObservacoesGerais(report.observacoesGerais || '');
    setMostrarObservacoes(Boolean(report.observacoesGerais));

    const firstTag = report.atendimentos?.[0]?.equipamento;
    const paradaVinc = firstTag
      ? paradas.find((p) => normalizarTag(p.tag) === normalizarTag(firstTag))
      : undefined;

    setActiveParadaId(paradaVinc?.id || null);
    setDestravarCabecalho({});
    setActiveTab('atendimento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------------------------------------------------------------------------
  // C1. MODAL "INICIAR ATENDIMENTO • <TAG>"
  // ---------------------------------------------------------------------------
  const handleAbrirModalIniciar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    try {
      const ultimaTurma = localStorage.getItem(ULTIMA_TURMA_KEY);
      if (ultimaTurma) setTeam(ultimaTurma);
    } catch {}

    setIniciandoParada(parada);
    setIniciandoHoraToqueIso(agoraIso);
    setIniciandoHoraHhMm(agoraHhMm);
    setIniciandoTipoManutencao(parada.emAtendimentoPor?.tipoManutencao || 'CORRETIVA');
    setIniciandoErroTecnico('');
  };

  const handleConfirmarIniciarAtendimento = () => {
    if (!iniciandoParada) return;
    if (!tecnicoNome.trim()) {
      setIniciandoErroTecnico('Selecione o técnico responsável na lista antes de iniciar o atendimento.');
      return;
    }

    // Salva a última turma usada neste aparelho (Regra C1)
    try {
      localStorage.setItem(ULTIMA_TURMA_KEY, team);
    } catch {}

    const repId = `rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const segAtual = getSegmentoAtual(iniciandoParada);
    const horaToqueEfetivaIso = resolverHorarioIso(iniciandoHoraHhMm, iniciandoHoraToqueIso, segAtual.inicio);
    const horaInicioHhMm = new Date(horaToqueEfetivaIso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const dataInicioYmd = new Date(horaToqueEfetivaIso).toISOString().slice(0, 10);
    const turnoCalculado = calcularTurnoPelaHoraETurma(horaInicioHhMm, team);
    const horaRealParadaHhMm = new Date(iniciandoParada.inicioParada).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const membrosValidos = extraIntegrantes
      .filter((m) => m.nome.trim() !== '')
      .map((m) => ({
        id: m.id,
        nome: m.nome.trim(),
        matricula: m.matricula,
        funcao: m.funcao,
        papel: m.papel
      }));

    // Fecha o segmento atual e abre EXEC MANUT no horário informado
    const paradaAtualizada = iniciarAtendimentoParada({
      parada: iniciandoParada,
      tecnicoNome: tecnicoNome.trim(),
      tecnicoMatricula: tecnicoMatricula || undefined,
      tecnicoFuncao: tecnicoFuncao || 'Mecânico',
      tecnicoGrupo: tecnicoGrupo || undefined,
      membrosEquipe: membrosValidos,
      tipoManutencao: iniciandoTipoManutencao,
      horaToqueIso: horaToqueEfetivaIso,
      reportId: repId
    });

    if (onSaveParada) {
      onSaveParada(paradaAtualizada);
    }

    addMeuAtendimentoId(paradaAtualizada.id);
    setMeusIdsLocais(getMeusAtendimentosIds());

    const todosAtuantes = [
      paradaAtualizada.emAtendimentoPor?.tecnicoPrincipal.nome || tecnicoNome.trim(),
      ...(paradaAtualizada.emAtendimentoPor?.membrosEquipe || []).map((m) => m.nome)
    ].filter(Boolean);
    const atuantesStr = Array.from(new Set(todosAtuantes)).join(', ');

    const sintomaParada = formatarFalhaCard(paradaAtualizada.falha, paradaAtualizada.sintomaInicial);
    const novoAt: Atendimento = {
      id: `at-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      equipamento: paradaAtualizada.tag,
      om: paradaAtualizada.numeroOS || '',
      horimetro: '',
      sintoma: sintomaParada || '',
      falha: paradaAtualizada.falha || null,
      causa: '',
      acaoExecutada: '',
      horaRealParada: horaRealParadaHhMm,
      horaInicio: horaInicioHhMm,
      horaFim: '',
      tipoManutencao: iniciandoTipoManutencao,
      liberadoOperacao: false,
      previsaoLiberacao: paradaAtualizada.previsaoLiberacao || '',
      atuantes: atuantesStr
    };

    const fParada = paradaAtualizada.frente || derivarFrenteDaTag(paradaAtualizada.tag);

    setActiveReportId(repId);
    setActiveParadaId(paradaAtualizada.id);
    setDateStart(dataInicioYmd);
    setDateEnd(dataInicioYmd);
    setShift(turnoCalculado);
    setFrente(fParada);
    setAtendimentos([novoAt]);
    setPendencias([]);
    setObservacoesGerais('');
    setMostrarObservacoes(false);
    setDestravarCabecalho({});
    setIniciandoParada(null);

    // Salva rascunho automático imediatamente e abre a tela "ATENDIMENTO • <TAG>" (Regra C1)
    const rascunhoInicial: Report = {
      id: repId,
      dateStart: dataInicioYmd,
      dateEnd: dataInicioYmd,
      team,
      shift: turnoCalculado,
      frente: fParada,
      tecnicoNome: tecnicoNome.trim(),
      tecnicoFuncao,
      tecnicoMatricula,
      tecnicoGrupo,
      eletricista: tecnicoFuncao.toLowerCase().includes('eletricista') ? tecnicoNome.trim() : '',
      mecanico: tecnicoFuncao.toLowerCase().includes('mecanico') || tecnicoFuncao.toLowerCase().includes('mecânico') ? tecnicoNome.trim() : '',
      auxiliar: '',
      motorista: '',
      monitor: '',
      equipeDetalhada: membrosValidos.map((m) => ({
        nome: m.nome,
        matricula: m.matricula,
        funcao: m.funcao,
        papel: m.papel
      })),
      atendimentos: [novoAt],
      pendencias: [],
      observacoesGerais: '',
      status: 'RASCUNHO',
      mechanicUsername: user.username,
      createdAt: new Date().toISOString()
    };

    onSaveReport(rascunhoInicial, true);
    setActiveTab('atendimento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------------------------------------------------------------------------
  // PAUSAR / RETOMAR / FINALIZAR
  // ---------------------------------------------------------------------------
  const handleAbrirModalPausar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    setPausandoParada(parada);
    setPausaHoraToqueIso(agoraIso);
    setPausaHoraHhMm(agoraHhMm);
    setPausaModoOutro(false);
    setPausaCodigo('HMC 9118');
    setPausaComplemento('');
    setPausaBuscaOutro('');
  };

  const handleConfirmarPausa = () => {
    if (!pausandoParada) return;
    const nomeTec =
      tecnicoNome.trim() ||
      pausandoParada.emAtendimentoPor?.tecnicoPrincipal.nome ||
      user.name ||
      user.username;
    const matTec =
      tecnicoMatricula || pausandoParada.emAtendimentoPor?.tecnicoPrincipal.matricula || undefined;

    const segAtual = getSegmentoAtual(pausandoParada);
    const horaPausaIso = resolverHorarioIso(pausaHoraHhMm, pausaHoraToqueIso, segAtual.inicio);

    const atualizada = pausarAtendimentoParada({
      parada: pausandoParada,
      codigoMotivo: pausaCodigo,
      complemento: pausaComplemento.trim() || null,
      usuarioNome: nomeTec,
      usuarioMatricula: matTec,
      horaToqueIso: horaPausaIso
    });

    if (onSaveParada) {
      onSaveParada(atualizada);
    }
    setPausandoParada(null);
  };

  const handleAbrirModalRetomar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    setRetomandoParada(parada);
    setRetomarHoraToqueIso(agoraIso);
    setRetomarHoraHhMm(agoraHhMm);
  };

  const handleConfirmarRetomar = () => {
    if (!retomandoParada) return;
    const nomeTec =
      tecnicoNome.trim() ||
      retomandoParada.emAtendimentoPor?.tecnicoPrincipal.nome ||
      user.name ||
      user.username;
    const matTec =
      tecnicoMatricula || retomandoParada.emAtendimentoPor?.tecnicoPrincipal.matricula || undefined;

    const segAtual = getSegmentoAtual(retomandoParada);
    const horaRetomadaIso = resolverHorarioIso(retomarHoraHhMm, retomarHoraToqueIso, segAtual.inicio);

    const atualizada = retomarAtendimentoParada({
      parada: retomandoParada,
      usuarioNome: nomeTec,
      usuarioMatricula: matTec,
      horaToqueIso: horaRetomadaIso
    });

    if (onSaveParada) {
      onSaveParada(atualizada);
    }
    setRetomandoParada(null);
  };

  const handleAbrirModalFinalizar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const atExistente = atendimentos.find(
      (a) => normalizarTag(a.equipamento) === normalizarTag(parada.tag)
    );
    const falhaInicial = atExistente?.falha || parada.falha || null;

    setFinalizandoParada(parada);
    setFinalizarHoraToqueIso(agoraIso);
    setFinalizarHoraFim(atExistente?.horaFim || agoraHhMm);
    setFinalizarLiberado(true);
    setFinalizarCodigoContinuacao('HMC 9118');
    setFinalizarComplemento('');
    setFinalizarHorimetro(atExistente?.horimetro || '');
    setFinalizarFalha(falhaInicial);
    setFinalizarSintoma(
      atExistente?.sintoma || formatarFalhaCard(falhaInicial, parada.sintomaInicial) || ''
    );
    setFinalizarCausa(atExistente?.causa || '');
    setFinalizarAcao(atExistente?.acaoExecutada || '');
    setFinalizarErro('');
  };

  const handleConfirmarFinalizarAtendimento = () => {
    if (!finalizandoParada) return;

    if (!finalizarHorimetro.trim()) {
      setFinalizarErro('Preencha o Horímetro do equipamento (obrigatório).');
      return;
    }

    const temCatalogoParada = Boolean(
      perfilDaTag(finalizandoParada.tag) || precisaEscolherPerfilCR(finalizandoParada.tag)
    );
    if (temCatalogoParada && !finalizarFalha) {
      setFinalizarErro('Selecione Sistema › Componente › Sintoma no Catálogo de Falhas antes de finalizar.');
      return;
    }

    const sintomaEfetivo = finalizarFalha
      ? formatarFalhaCard(finalizarFalha, finalizarSintoma)
      : finalizarSintoma.trim();

    if (!sintomaEfetivo || !finalizarCausa.trim() || !finalizarAcao.trim()) {
      setFinalizarErro('Preencha Sintoma, Causa e Ação Executada para finalizar o atendimento e enviar o relatório.');
      return;
    }

    const nomeTec =
      tecnicoNome.trim() ||
      finalizandoParada.emAtendimentoPor?.tecnicoPrincipal.nome ||
      user.name ||
      user.username;
    const matTec =
      tecnicoMatricula || finalizandoParada.emAtendimentoPor?.tecnicoPrincipal.matricula || undefined;
    const repId = activeReportId || `rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const segAtual = getSegmentoAtual(finalizandoParada);
    const horaFimEfetivaIso = resolverHorarioIso(
      finalizarHoraFim,
      finalizarHoraToqueIso,
      segAtual.inicio
    );

    const paradaFinalizada = finalizarAtendimentoParada({
      parada: finalizandoParada,
      horaFimIso: horaFimEfetivaIso,
      liberadoOperacao: finalizarLiberado,
      codigoContinuacaoSeNaoLiberado: finalizarLiberado ? undefined : finalizarCodigoContinuacao,
      complemento: finalizarComplemento.trim() || null,
      falha: finalizarFalha,
      sintoma: sintomaEfetivo,
      usuarioNome: nomeTec,
      usuarioMatricula: matTec,
      reportId: repId
    });

    if (onSaveParada) {
      onSaveParada(paradaFinalizada);
    }

    removeMeuAtendimentoId(finalizandoParada.id);
    setMeusIdsLocais(getMeusAtendimentosIds());

    const horaInicioDefault = finalizandoParada.emAtendimentoPor?.inicioAtendimento
      ? new Date(finalizandoParada.emAtendimentoPor.inicioAtendimento).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      : finalizarHoraFim;
    const horaRealDefault = new Date(finalizandoParada.inicioParada).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const temAtendimentoDaTag = atendimentos.some(
      (a) => normalizarTag(a.equipamento) === normalizarTag(finalizandoParada.tag)
    );
    const novosAtendimentos: Atendimento[] = temAtendimentoDaTag
      ? atendimentos.map((a) =>
          normalizarTag(a.equipamento) === normalizarTag(finalizandoParada.tag)
            ? {
                ...a,
                om: a.om || finalizandoParada.numeroOS || '',
                horimetro: finalizarHorimetro.trim(),
                sintoma: sintomaEfetivo,
                falha: finalizarFalha,
                causa: finalizarCausa.trim(),
                acaoExecutada: finalizarAcao.trim(),
                horaFim: finalizarHoraFim,
                liberadoOperacao: finalizarLiberado,
                atuantes: a.atuantes || nomeTec
              }
            : a
        )
      : [
          {
            id: `at-${Date.now()}`,
            equipamento: finalizandoParada.tag,
            om: finalizandoParada.numeroOS || '',
            horimetro: finalizarHorimetro.trim(),
            sintoma: sintomaEfetivo,
            falha: finalizarFalha,
            causa: finalizarCausa.trim(),
            acaoExecutada: finalizarAcao.trim(),
            horaRealParada: horaRealDefault,
            horaInicio: horaInicioDefault,
            horaFim: finalizarHoraFim,
            tipoManutencao: finalizandoParada.emAtendimentoPor?.tipoManutencao || 'CORRETIVA',
            liberadoOperacao: finalizarLiberado,
            atuantes: nomeTec
          },
          ...atendimentos
        ];

    setAtendimentos(novosAtendimentos);
    setFinalizandoParada(null);

    // Envia o relatório ligado à parada e volta ao painel mostrando "Relatório enviado" (Regra C2.d)
    handleSaveWithCustomAtendimentos('ENVIADO', novosAtendimentos, repId, nomeTec);
  };

  // C3. "ABRIR NOVA PARADA" pelo técnico (com opção de "Iniciar atendimento agora")
  const criarParadaPeloTecnico = (iniciarAgora: boolean) => {
    if (!novaParadaTag.trim()) return;

    const normTag = normalizarTag(novaParadaTag);
    const existente = paradas.find(
      (p) => p.situacao === 'ABERTA' && normalizarTag(p.tag) === normTag
    );

    if (existente) {
      setShowNovaParadaModal(false);
      setFiltroFrenteParada('TODAS');
      setFiltroTagParada('');
      setHighlightParadaId(existente.id);
      if (iniciarAgora) {
        handleAbrirModalIniciar(existente);
      } else {
        setTimeout(() => {
          const cardEl = document.getElementById(`card-parada-${existente.id}`);
          if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      setTimeout(() => setHighlightParadaId(null), 5000);
      return;
    }

    const agoraIso = new Date().toISOString();
    const inicioParadaIso = resolverHorarioIso(novaParadaHoraReal, agoraIso);
    const usuarioCriador = tecnicoNome.trim() || user.name || user.username;

    const nova = criarNovaParada({
      tag: normTag,
      frente: derivarFrenteDaTag(normTag),
      inicioParada: inicioParadaIso,
      numeroOS: novaParadaOS.trim() || null,
      sintomaInicial: novaParadaSintoma.trim() || null,
      falha: novaParadaFalha,
      usuario: usuarioCriador,
      matricula: tecnicoMatricula || undefined,
      origem: 'TECNICO',
      codigoInicial: novaParadaCodigo || 'HMC 9130',
      complementoInicial: novaParadaSintoma.trim() || 'Aberta pelo técnico em campo',
      horaToqueIso: agoraIso
    });

    if (onSaveParada) {
      onSaveParada(nova);
    }

    setShowNovaParadaModal(false);
    setNovaParadaTag('');
    setNovaParadaOS('');
    setNovaParadaSintoma('');
    setNovaParadaFalha(null);
    setHighlightParadaId(nova.id);
    setTimeout(() => setHighlightParadaId(null), 4000);

    if (iniciarAgora) {
      handleAbrirModalIniciar(nova);
    }
  };

  // Atualiza um campo do Atendimento atual
  const handleUpdateAtendimento = (id: string, field: keyof Atendimento, value: any) => {
    setAtendimentos((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  // Upload de fotos com compressão para uso online/offline
  const handleImageUpload = (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          const onDone = (base64Result: string) => {
            setAtendimentos((currentList) =>
              currentList.map((a) => {
                if (a.id === id) {
                  const updatedList = [
                    ...(a.photoUrls || (a.photoUrl ? [a.photoUrl] : [])),
                    base64Result
                  ];
                  return {
                    ...a,
                    photoUrl: updatedList[0],
                    photoUrls: updatedList
                  };
                }
                return a;
              })
            );
          };

          if (!ctx) {
            onDone(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          onDone(compressedBase64);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (atendimentoId: string, photoIndex: number) => {
    setAtendimentos((currentList) =>
      currentList.map((a) => {
        if (a.id === atendimentoId) {
          const currentUrls = a.photoUrls || (a.photoUrl ? [a.photoUrl] : []);
          const updatedList = currentUrls.filter((_, idx) => idx !== photoIndex);
          return {
            ...a,
            photoUrl: updatedList[0] || '',
            photoUrls: updatedList
          };
        }
        return a;
      })
    );
  };

  // Pendências opcionais na tela de atendimento
  const handleAddPendencia = () => {
    const defaultTag = activeParada?.tag || atendimentoAtual?.equipamento || '';
    const newPend: Pendencia = {
      id: `pend-${Date.now()}-${Math.random()}`,
      equipamento: defaultTag,
      descricao: ''
    };
    setPendencias([...pendencias, newPend]);
  };

  const handleRemovePendencia = (id: string) => {
    setPendencias(pendencias.filter((p) => p.id !== id));
  };

  const handleUpdatePendencia = (id: string, field: keyof Pendencia, value: any) => {
    setPendencias(pendencias.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSaveWithCustomAtendimentos = (
    status: 'RASCUNHO' | 'ENVIADO',
    listaAtendimentos: Atendimento[],
    forcedReportId?: string,
    forcedTecnicoNome?: string
  ) => {
    if (isSaving) return;
    setIsSaving(true);

    skipAutoSaveRef.current = true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const reportData = buildReportObject(
      status,
      listaAtendimentos,
      forcedReportId,
      forcedTecnicoNome
    );

    onSaveReport(reportData, false);

    if (status === 'ENVIADO') {
      setShowSubmitModal(true);
      handleResetForm();
      setActiveTab('painel');
    } else {
      setActiveReportId(reportData.id);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      setIsSaving(false);
      skipAutoSaveRef.current = false;
    }, 1000);
  };

  const handleSalvarRascunhoManual = () => {
    handleSaveWithCustomAtendimentos('RASCUNHO', atendimentos);
  };

  // Relatórios deste perfil/usuário (enviados e rascunhos)
  const myReports = useMemo(() => {
    return reports.filter((r) => r.mechanicUsername === user.username);
  }, [reports, user.username]);

  const atendimentoDaParadaFinalizando = useMemo(() => {
    if (!finalizandoParada) return atendimentoAtual;
    return (
      atendimentos.find(
        (a) => normalizarTag(a.equipamento) === normalizarTag(finalizandoParada.tag)
      ) || atendimentoAtual
    );
  }, [finalizandoParada, atendimentos, atendimentoAtual]);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-5 select-none">
      {/* Cabeçalho Compacto */}
      <div className="flex justify-between items-center mb-5 border-b border-gray-200 pb-3.5">
        <div>
          <h2 className="text-lg font-black text-emerald-950 uppercase tracking-tight">
            PAINEL DE MANUTENÇÃO • CONTROLE
          </h2>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-0.5">
            U&M MINERAÇÃO • PERFIL TÉCNICO / CONTROLE DE CAMPO
          </p>
        </div>
        {isOffline && (
          <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider">
            Modo Offline Ativo (Horários Preservados)
          </span>
        )}
      </div>

      {/* =========================================================================
          ABA 1: MEUS RELATÓRIOS (B4)
          ========================================================================= */}
      {activeTab === 'meus_relatorios' && (
        <div className="space-y-4 pb-36">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider">
                Meus Relatórios Enviados e Rascunhos
              </h3>
              <p className="text-xs text-gray-500">
                Toque em um rascunho para retomar o preenchimento ou consulte os relatórios já enviados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('painel')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#19502F] text-white text-xs font-bold uppercase rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
            </button>
          </div>

          {myReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-semibold uppercase">
                Nenhum relatório ou rascunho encontrado neste aparelho
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('painel')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#19502F] text-white text-xs font-bold uppercase rounded-xl cursor-pointer"
              >
                Ir para Paradas Aguardando Atendimento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {myReports.map((rep) => (
                <ReportCardAccordion
                  key={rep.id}
                  report={rep}
                  onContinue={handleLoadReport}
                  onDelete={onDeleteReport}
                  showActions={true}
                  canDelete={user.role === 'admin'}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ABA 2: TELA INICIAL "PAINEL" (PARTE B: B1 + B2 + B3)
          ========================================================================= */}
      {activeTab === 'painel' && (
        <div className="space-y-6 pb-36">
          {/* ---------------------------------------------------------------------
              B1. PARADAS AGUARDANDO ATENDIMENTO
              --------------------------------------------------------------------- */}
          <section className="bg-white rounded-2xl border-2 border-[#19502F]/25 shadow-sm overflow-hidden">
            <div className="bg-[#19502F] px-5 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    PARADAS AGUARDANDO ATENDIMENTO
                  </h3>
                  <span className="bg-emerald-950 text-emerald-100 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-700">
                    {paradasAbertasOrdenadas.length} aberta(s)
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/90 mt-0.5">
                  Toque em "INICIAR ATENDIMENTO" em um card abaixo ou abra uma nova parada se o equipamento não estiver na lista.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNovaParadaHoraReal(
                    new Date().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })
                  );
                  setShowNovaParadaModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>ABRIR NOVA PARADA</span>
              </button>
            </div>

            {/* Filtros por Frente e Busca por TAG */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['TODAS', 'EH', 'CR', 'PF', 'INFRA'] as const).map((fr) => (
                  <button
                    key={fr}
                    type="button"
                    onClick={() => setFiltroFrenteParada(fr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer border ${
                      filtroFrenteParada === fr
                        ? 'bg-[#19502F] text-white border-[#19502F] shadow-2xs'
                        : 'bg-white text-gray-700 border-gray-250 hover:bg-gray-100'
                    }`}
                  >
                    {fr === 'TODAS' ? 'Todas Frentes' : fr}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={filtroTagParada}
                  onChange={(e) => setFiltroTagParada(e.target.value)}
                  placeholder="Buscar por TAG (ex: EH-4050)..."
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-250 rounded-xl text-xs font-bold text-gray-900 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-[#19502F]"
                />
                {filtroTagParada && (
                  <button
                    type="button"
                    onClick={() => setFiltroTagParada('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Cards das Paradas Abertas */}
            <div className="p-4">
              {paradasAbertasFiltradas.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/60 rounded-2xl border border-dashed border-gray-250 p-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-extrabold text-gray-700 uppercase">
                    Nenhuma parada aberta encontrada para este filtro
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Se o equipamento parou em campo e ainda não consta na lista, toque em "ABRIR NOVA PARADA".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paradasAbertasFiltradas.map((parada) => {
                    const segAtual = getSegmentoAtual(parada);
                    const respStyle = getResponsabilidadeStyle(segAtual.responsavel);
                    const durTotalMin = calcularDuracaoTotalParadaMinutos(parada, liveNow);
                    const emAtendimento = !!parada.emAtendimentoPor;
                    const estaPausado = !!parada.emAtendimentoPor?.pausadoEm;
                    const isHighlighted = highlightParadaId === parada.id;
                    const isMeuAtendimento = meusAtendimentosEmAndamento.some(
                      (m) => m.id === parada.id
                    );

                    return (
                      <div
                        id={`card-parada-${parada.id}`}
                        key={parada.id}
                        className={`rounded-2xl border-2 p-4 transition-all flex flex-col justify-between bg-white shadow-xs ${
                          isHighlighted
                            ? 'border-amber-500 ring-4 ring-amber-400/30 animate-pulse'
                            : isMeuAtendimento
                            ? 'border-blue-600 bg-blue-50/10'
                            : 'border-gray-200 hover:border-[#19502F]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-150">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xl font-black text-emerald-950 font-mono tracking-tight">
                                  {parada.tag}
                                </span>
                                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  {parada.frente}
                                </span>
                                {parada.numeroOS && (
                                  <span className="text-[10px] font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                    OM: {parada.numeroOS}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 font-semibold mt-1">
                                Aberta por <strong className="text-gray-800">{parada.criadoPor || 'Admin'}</strong> • Parou às{' '}
                                <strong className="text-gray-900 font-mono">
                                  {formatarHoraPtBr(parada.inicioParada)}
                                </strong>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-black text-xs font-mono">
                                <Clock className="w-3.5 h-3.5" />
                                Parado há {formatarParadoHaXhYm(durTotalMin)}
                              </span>
                            </div>
                          </div>

                          {/* Status atual */}
                          <div
                            className="my-3 p-3 rounded-xl border"
                            style={{ backgroundColor: respStyle.fundo, borderColor: respStyle.borda }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: respStyle.cor }}
                                />
                                <span
                                  className="text-xs font-black uppercase tracking-wide truncate"
                                  style={{ color: respStyle.texto }}
                                >
                                  {segAtual.codigo} – {segAtual.nome}
                                </span>
                              </div>
                              <span
                                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0"
                                style={{ borderColor: respStyle.borda, color: respStyle.texto }}
                              >
                                {respStyle.nome}
                              </span>
                            </div>

                            {formatarFalhaCard(parada.falha, parada.sintomaInicial) && (
                              <p
                                className="text-[11px] mt-1.5 font-medium opacity-90 flex items-center gap-1.5 flex-wrap"
                                style={{ color: respStyle.texto }}
                              >
                                {parada.falha?.codigoCompleto && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/10 font-black">
                                    {parada.falha.codigoCompleto}
                                  </span>
                                )}
                                <span>
                                  Sintoma:{' '}
                                  <strong>{formatarFalhaCard(parada.falha, parada.sintomaInicial)}</strong>
                                </span>
                              </p>
                            )}

                            {emAtendimento && parada.emAtendimentoPor && (
                              <div
                                className="mt-2 pt-2 border-t border-black/10 text-[11px] font-bold flex flex-col gap-0.5"
                                style={{ color: respStyle.texto }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                                    Em atendimento por{' '}
                                    <strong>{parada.emAtendimentoPor.tecnicoPrincipal.nome}</strong> desde{' '}
                                    {formatarHoraPtBr(parada.emAtendimentoPor.inicioAtendimento)}
                                  </span>
                                  {estaPausado && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase">
                                      PAUSADO
                                    </span>
                                  )}
                                </div>
                                {parada.emAtendimentoPor.membrosEquipe &&
                                  parada.emAtendimentoPor.membrosEquipe.length > 0 && (
                                    <span className="text-[10px] opacity-85">
                                      Equipe:{' '}
                                      {parada.emAtendimentoPor.membrosEquipe.map((m) => m.nome).join(', ')}
                                    </span>
                                  )}
                              </div>
                            )}
                          </div>

                          {/* Histórico resumido somente leitura */}
                          <div className="mb-3 bg-gray-50 rounded-xl p-2.5 border border-gray-150">
                            <span className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                              Histórico da Parada (Somente Leitura • {parada.segmentos.length} período(s))
                            </span>
                            <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                              {parada.segmentos.map((s, sIdx) => {
                                const iniStr = formatarHoraPtBr(s.inicio);
                                const fimStr = s.fim ? formatarHoraPtBr(s.fim) : 'agora';
                                const durSeg = Math.max(
                                  0,
                                  Math.round(
                                    ((s.fim ? new Date(s.fim).getTime() : liveNow) -
                                      new Date(s.inicio).getTime()) /
                                      60000
                                  )
                                );
                                return (
                                  <div
                                    key={s.id || sIdx}
                                    className="text-[10px] font-mono text-gray-600 flex items-center justify-between"
                                  >
                                    <span className="truncate">
                                      <strong>
                                        {iniStr}–{fimStr}
                                      </strong>{' '}
                                      {s.codigo} {s.nome}
                                    </span>
                                    <span className="text-gray-400 shrink-0 ml-2">({durSeg} min)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Botões do card */}
                        <div className="pt-2 border-t border-gray-150 flex flex-col gap-2">
                          {!emAtendimento ? (
                            <button
                              type="button"
                              onClick={() => handleAbrirModalIniciar(parada)}
                              className="w-full py-3.5 px-4 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              <span>INICIAR ATENDIMENTO</span>
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => handleContinuarAtendimentoParada(parada)}
                                className="w-full py-3 px-4 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                              >
                                <ClipboardList className="w-4 h-4" />
                                <span>CONTINUAR RELATÓRIO</span>
                              </button>
                              <div className="grid grid-cols-2 gap-2">
                                {!estaPausado ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirModalPausar(parada)}
                                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                                  >
                                    <Pause className="w-4 h-4 fill-current" />
                                    <span>PAUSAR</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAbrirModalRetomar(parada)}
                                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    <span>RETOMAR</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalFinalizar(parada)}
                                  className="py-2.5 px-3 bg-emerald-800 hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>FINALIZAR</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAbrirModalIniciar(parada)}
                                className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 border border-gray-300 transition cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5 text-[#19502F]" />
                                <span>Entrar como 2º Técnico na Equipe</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ---------------------------------------------------------------------
              B2. MEUS ATENDIMENTOS EM ANDAMENTO (só aparece se houver algum)
              --------------------------------------------------------------------- */}
          {meusAtendimentosEmAndamento.length > 0 && (
            <section className="bg-white rounded-2xl border-2 border-blue-600/35 shadow-sm overflow-hidden">
              <div className="bg-blue-900 px-5 py-3.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-200" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    MEUS ATENDIMENTOS EM ANDAMENTO
                  </h3>
                  <span className="bg-blue-950 text-blue-100 text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-700">
                    {meusAtendimentosEmAndamento.length}
                  </span>
                </div>
                <span className="text-[11px] text-blue-100 hidden sm:inline">
                  Rascunho salvo automaticamente neste aparelho
                </span>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {meusAtendimentosEmAndamento.map((parada) => {
                  const segAtual = getSegmentoAtual(parada);
                  const estaPausado = !!parada.emAtendimentoPor?.pausadoEm;
                  const inicioAtendIso =
                    parada.emAtendimentoPor?.inicioAtendimento || parada.inicioParada;
                  const minEmAtend = Math.max(
                    0,
                    Math.round((liveNow - new Date(inicioAtendIso).getTime()) / 60000)
                  );
                  const tecnicosList = [
                    parada.emAtendimentoPor?.tecnicoPrincipal.nome,
                    ...(parada.emAtendimentoPor?.membrosEquipe || []).map((m) => m.nome)
                  ]
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <div
                      key={parada.id}
                      className="rounded-2xl border-2 border-blue-200 bg-blue-50/20 p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-black text-emerald-950 font-mono">
                                {parada.tag}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-100 text-emerald-900">
                                {parada.frente}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-gray-700 mt-1">
                              Status atual:{' '}
                              <span className="text-blue-900 font-black">
                                {segAtual.codigo} – {segAtual.nome}
                              </span>
                            </p>
                          </div>

                          <span className="px-2.5 py-1 rounded-xl bg-blue-100 text-blue-900 border border-blue-300 text-xs font-black font-mono shrink-0">
                            em atendimento há {formatarParadoHaXhYm(minEmAtend)}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 mt-2">
                          Técnico(s): <strong className="text-gray-900">{tecnicosList}</strong>
                        </p>
                      </div>

                      <div className="pt-2 border-t border-blue-200/60 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleContinuarAtendimentoParada(parada)}
                          className="w-full py-3 px-4 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <ClipboardList className="w-4 h-4" />
                          <span>CONTINUAR RELATÓRIO</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          {!estaPausado ? (
                            <button
                              type="button"
                              onClick={() => handleAbrirModalPausar(parada)}
                              className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Pause className="w-4 h-4 fill-current" />
                              <span>PAUSAR</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAbrirModalRetomar(parada)}
                              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>RETOMAR</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleAbrirModalFinalizar(parada)}
                            className="py-2.5 px-3 bg-emerald-800 hover:bg-emerald-950 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>FINALIZAR</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------------
              B3. RESUMO OPERACIONAL (SOMENTE LEITURA)
              --------------------------------------------------------------------- */}
          <ResumoOperacionalControle reports={reports} />
        </div>
      )}

      {/* =========================================================================
          ABA 3: TELA "ATENDIMENTO • <TAG>" (PARTE C2)
          ========================================================================= */}
      {activeTab === 'atendimento' && atendimentoAtual && (
        <div className="space-y-5 pb-40">
          {/* Topo da tela de Atendimento */}
          <div className="bg-[#19502F] text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('painel')}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer"
                title="Voltar ao Painel (o rascunho continua salvo)"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                  <span>ATENDIMENTO • {activeParada?.tag || atendimentoAtual.equipamento}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-200 border border-emerald-700">
                    {frente}
                  </span>
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Preencha apenas os dados que faltam • Rascunho automático ativo
                  {ultimoAutoSaveHhMm ? ` (salvo às ${ultimoAutoSaveHhMm})` : ''}
                </p>
              </div>
            </div>

            {activeParada && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-xl bg-white/15 text-white text-xs font-mono font-bold">
                  {getSegmentoAtual(activeParada).codigo} – {getSegmentoAtual(activeParada).nome}
                </span>
              </div>
            )}
          </div>

          {/* C2.a) CABEÇALHO JÁ PREENCHIDO E TRAVADO (ÍCONE DE CADEADO) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#19502F]" />
                Dados da Parada e do Turno (Preenchidos Automaticamente)
              </span>
              <span className="text-[11px] text-gray-500">
                Use "corrigir" se precisar ajustar algum item
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* TAG, Frente e Perfil do Catálogo */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3" /> TAG / Frente / Catálogo
                  </span>
                  <p className="font-mono font-black text-sm text-gray-900 mt-0.5">
                    {activeParada?.tag || atendimentoAtual.equipamento} • {frente}
                  </p>
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    Perfil Catálogo: {perfilDaTag(activeParada?.tag || atendimentoAtual.equipamento) || 'Geral'}
                  </span>
                </div>
              </div>

              {/* Hora real da parada, Tempo parado e Status atual */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Hora da Parada & Tempo Parado
                </span>
                <p className="font-mono font-bold text-gray-900 mt-0.5">
                  Parou às{' '}
                  {activeParada
                    ? formatarHoraPtBr(activeParada.inicioParada)
                    : atendimentoAtual.horaRealParada || '—'}{' '}
                  {activeParada && (
                    <span className="text-rose-700">
                      ({formatarParadoHaXhYm(calcularDuracaoTotalParadaMinutos(activeParada, liveNow))})
                    </span>
                  )}
                </p>
                {activeParada && (
                  <span className="text-[11px] text-gray-600 block mt-0.5">
                    Status: <strong>{getSegmentoAtual(activeParada).codigo}</strong>
                  </span>
                )}
              </div>

              {/* Nº OM/OS no cabeçalho travado (se a parada já tiver OM/OS) */}
              {activeParada?.numeroOS && !destravarCabecalho.om && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Nº OM / OS
                    </span>
                    <p className="font-mono font-black text-sm text-gray-900 mt-0.5">
                      {atendimentoAtual.om || activeParada.numeroOS}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDestravarCabecalho((p) => ({ ...p, om: true }))}
                    className="text-[11px] text-[#19502F] hover:underline font-bold cursor-pointer"
                  >
                    corrigir
                  </button>
                </div>
              )}

              {/* Técnico Responsável e Equipe */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Técnico Responsável e Equipe
                  </span>
                  <p className="font-bold text-gray-900 mt-0.5 truncate">
                    {tecnicoNome || 'Não informado'}
                    {tecnicoMatricula ? ` (Mat. ${tecnicoMatricula})` : ''}
                  </p>
                  {extraIntegrantes.filter((m) => m.nome).length > 0 && (
                    <span className="text-[11px] text-gray-600 block truncate">
                      Equipe: {extraIntegrantes.filter((m) => m.nome).map((m) => m.nome).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDestravarCabecalho((p) => ({ ...p, equipe: !p.equipe }))}
                  className="text-[11px] text-[#19502F] hover:underline font-bold shrink-0 cursor-pointer"
                >
                  {destravarCabecalho.equipe ? 'travar' : 'corrigir'}
                </button>
              </div>

              {/* Tipo de Manutenção e Hora de Início */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Tipo Manut. & Início Atendimento
                  </span>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {atendimentoAtual.tipoManutencao || 'CORRETIVA'} • Início:{' '}
                    <span className="font-mono">{atendimentoAtual.horaInicio || '—'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDestravarCabecalho((p) => ({
                      ...p,
                      tipoManut: !p.tipoManut,
                      horaInicio: !p.horaInicio
                    }))
                  }
                  className="text-[11px] text-[#19502F] hover:underline font-bold shrink-0 cursor-pointer"
                >
                  {destravarCabecalho.tipoManut ? 'travar' : 'corrigir'}
                </button>
              </div>

              {/* Data, Turma e Horário/Turno calculado */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Data • Turma • Turno
                  </span>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {formatarDataPtBr(dateStart)} • Turma {team}
                  </p>
                  <span className="text-[11px] text-gray-600">{shift}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDestravarCabecalho((p) => ({ ...p, dataTurma: !p.dataTurma }))}
                  className="text-[11px] text-[#19502F] hover:underline font-bold shrink-0 cursor-pointer"
                >
                  {destravarCabecalho.dataTurma ? 'travar' : 'corrigir'}
                </button>
              </div>
            </div>

            {/* Painéis de correção pontual (só aparecem se o técnico clicar em "corrigir") */}
            {(destravarCabecalho.equipe ||
              destravarCabecalho.tipoManut ||
              destravarCabecalho.dataTurma) && (
              <div className="p-4 bg-emerald-50/40 border-t border-gray-200 space-y-4">
                {destravarCabecalho.equipe && (
                  <div className="space-y-3">
                    <label className="block text-xs font-extrabold text-gray-800 uppercase">
                      Corrigir Técnico Responsável / Equipe
                    </label>
                    <SeletorTecnico
                      tecnicos={tecnicos}
                      selectedNome={tecnicoNome}
                      selectedFuncao={tecnicoFuncao}
                      selectedMatricula={tecnicoMatricula}
                      selectedGrupo={tecnicoGrupo}
                      isAdmin={user.role === 'admin'}
                      label="TÉCNICO RESPONSÁVEL"
                      onChange={(nome, funcao, matricula, grupo) => {
                        setTecnicoNome(nome);
                        setTecnicoFuncao(funcao);
                        setTecnicoMatricula(matricula || '');
                        setTecnicoGrupo(grupo || '');
                      }}
                    />
                  </div>
                )}

                {destravarCabecalho.tipoManut && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-800 uppercase mb-1">
                        Tipo de Manutenção
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['CORRETIVA', 'PREVENTIVA', 'PROGRAMADA'] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              handleUpdateAtendimento(atendimentoAtual.id, 'tipoManutencao', t)
                            }
                            className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                              (atendimentoAtual.tipoManutencao || 'CORRETIVA') === t
                                ? 'bg-[#19502F] text-white border-[#19502F]'
                                : 'bg-white text-gray-700 border-gray-300'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-800 uppercase mb-1">
                        Hora de Início do Atendimento
                      </label>
                      <input
                        type="time"
                        value={atendimentoAtual.horaInicio}
                        onChange={(e) => {
                          const h = e.target.value;
                          handleUpdateAtendimento(atendimentoAtual.id, 'horaInicio', h);
                          setShift(calcularTurnoPelaHoraETurma(h, team));
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-mono font-bold"
                      />
                    </div>
                  </div>
                )}

                {destravarCabecalho.dataTurma && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-800 uppercase mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => {
                          setDateStart(e.target.value);
                          setDateEnd(e.target.value);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-800 uppercase mb-1">
                        Turma
                      </label>
                      <select
                        value={team}
                        onChange={(e) => {
                          const novaT = e.target.value;
                          setTeam(novaT);
                          setShift(calcularTurnoPelaHoraETurma(atendimentoAtual.horaInicio, novaT));
                          try {
                            localStorage.setItem(ULTIMA_TURMA_KEY, novaT);
                          } catch {}
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                      >
                        {['A', 'B', 'C', 'D', 'ADM', '1/3', '2/3'].map((opt) => (
                          <option key={opt} value={opt}>
                            Turma {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-gray-800 uppercase mb-1">
                        Horário / Turno
                      </label>
                      <select
                        value={shift}
                        onChange={(e) => setShift(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold"
                      >
                        {['06:00 às 18:00', '18:00 às 06:00', '07:00 às 17:00 (ADM)'].map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* C2.b) CAMPOS PARA PREENCHER (MOSTRAR APENAS O QUE AINDA FALTA NA PARADA) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-5">
            <h4 className="text-xs font-black text-[#19502F] uppercase tracking-wider border-b border-gray-150 pb-2.5">
              Dados Técnicos do Atendimento (Preencha o que falta)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nº OM/OS – só aparece aqui se a parada ainda não tiver OM/OS (ou se destravou para corrigir) */}
              {(!activeParada?.numeroOS || destravarCabecalho.om) && (
                <div>
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1">
                    Nº OM / OS
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 4796854"
                    value={atendimentoAtual.om}
                    onChange={(e) =>
                      handleUpdateAtendimento(atendimentoAtual.id, 'om', e.target.value)
                    }
                    className="w-full px-3.5 py-3 border border-gray-300 bg-white rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#19502F]"
                  />
                </div>
              )}

              {/* Horímetro (Obrigatório) */}
              <div className={!activeParada?.numeroOS || destravarCabecalho.om ? '' : 'sm:col-span-2'}>
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1">
                  Horímetro do Equipamento (Obrigatório) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 82341.5"
                  value={atendimentoAtual.horimetro}
                  onChange={(e) =>
                    handleUpdateAtendimento(atendimentoAtual.id, 'horimetro', e.target.value)
                  }
                  className="w-full px-3.5 py-3 border border-gray-300 bg-white rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#19502F]"
                />
              </div>
            </div>

            {/* Sintoma pelo Catálogo da TAG (<SeletorCatalogo />) */}
            <div>
              {activeParada?.falha && !destravarCabecalho.sintomaCatalogo ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sintoma Catalogado na Parada
                    </span>
                    <p className="text-sm font-black text-emerald-950 mt-0.5">
                      {formatarFalhaCard(
                        atendimentoAtual.falha || activeParada.falha,
                        atendimentoAtual.sintoma || activeParada.sintomaInicial
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDestravarCabecalho((p) => ({ ...p, sintomaCatalogo: true }))
                    }
                    className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-bold uppercase hover:bg-emerald-100 cursor-pointer shrink-0"
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                <SeletorCatalogo
                  tag={activeParada?.tag || atendimentoAtual.equipamento}
                  value={atendimentoAtual.falha || activeParada?.falha || null}
                  complemento={
                    atendimentoAtual.falha
                      ? atendimentoAtual.falha.complemento || ''
                      : atendimentoAtual.sintoma || activeParada?.sintomaInicial || ''
                  }
                  obrigatorio={true}
                  isAdmin={user.role === 'admin'}
                  labelTitulo="SINTOMA PELO CATÁLOGO DA TAG *"
                  onChange={(falha, resumo, comp) => {
                    setAtendimentos((prev) =>
                      prev.map((item) =>
                        item.id === atendimentoAtual.id
                          ? {
                              ...item,
                              falha,
                              sintoma: resumo || comp
                            }
                          : item
                      )
                    );
                  }}
                />
              )}
            </div>

            {/* Causa (obrigatória ao finalizar) */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1">
                Causa (Obrigatória ao finalizar) *
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Mangueira da bomba P2 rompida por desgaste..."
                value={atendimentoAtual.causa}
                onChange={(e) =>
                  handleUpdateAtendimento(atendimentoAtual.id, 'causa', e.target.value)
                }
                className="w-full px-3.5 py-2.5 border border-gray-300 bg-white rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#19502F]"
              />
            </div>

            {/* Ação Executada (obrigatória ao finalizar) */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1">
                Ação Executada (Obrigatória ao finalizar) *
              </label>
              <textarea
                rows={3}
                placeholder="Descreva o serviço realizado pela equipe..."
                value={atendimentoAtual.acaoExecutada}
                onChange={(e) =>
                  handleUpdateAtendimento(atendimentoAtual.id, 'acaoExecutada', e.target.value)
                }
                className="w-full px-3.5 py-2.5 border border-gray-300 bg-white rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#19502F]"
              />
            </div>

            {/* Fotos (Câmera e Galeria) */}
            <div className="pt-2 border-t border-gray-150">
              <span className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                Fotos do Atendimento (Câmera ou Galeria)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-50 border-2 border-dashed border-emerald-800 text-emerald-900 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-100 transition cursor-pointer">
                  <span>📸 TIRAR FOTO (CÂMERA)</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      handleImageUpload(atendimentoAtual.id, e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>

                <label className="inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-50 border-2 border-dashed border-gray-300 text-gray-700 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-gray-100 transition cursor-pointer">
                  <span>🖼️ CARREGAR DA GALERIA</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      handleImageUpload(atendimentoAtual.id, e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2.5 mt-3">
                {(atendimentoAtual.photoUrls && atendimentoAtual.photoUrls.length > 0
                  ? atendimentoAtual.photoUrls
                  : atendimentoAtual.photoUrl
                  ? [atendimentoAtual.photoUrl]
                  : []
                ).map((pic, picIdx) => (
                  <div
                    key={picIdx}
                    className="flex flex-col items-center gap-1 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl"
                  >
                    <img
                      src={pic}
                      alt={`Foto ${picIdx + 1}`}
                      onClick={() => setZoomedImage(pic || null)}
                      className="h-20 w-20 object-cover rounded-xl cursor-zoom-in"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(atendimentoAtual.id, picIdx)}
                      className="text-[10px] font-bold text-rose-600 hover:underline uppercase cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Previsão de Liberação (Opcional) */}
            <div className="pt-2 border-t border-gray-150">
              <label className="block text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-1">
                ⏰ Previsão de Liberação (Opcional)
              </label>
              <input
                type="datetime-local"
                value={atendimentoAtual.previsaoLiberacao || ''}
                onChange={(e) =>
                  handleUpdateAtendimento(
                    atendimentoAtual.id,
                    'previsaoLiberacao',
                    e.target.value
                  )
                }
                className="w-full px-3.5 py-2.5 border border-amber-200 bg-amber-50/20 rounded-xl text-sm font-mono font-semibold"
              />
            </div>

            {/* Pendências / Anomalias (Opcional, botão "+ adicionar pendência") */}
            <div className="pt-2 border-t border-gray-150 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                  Pendências / Anomalias ({pendencias.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddPendencia}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-extrabold uppercase hover:bg-amber-100 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + adicionar pendência
                </button>
              </div>

              {pendencias.map((pend, idx) => (
                <div
                  key={pend.id}
                  className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/15 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-amber-900 uppercase">
                      Pendência #{idx + 1} • {pend.equipamento || activeParada?.tag}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendencia(pend.id)}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Descreva a pendência ou anomalia..."
                    value={pend.descricao}
                    onChange={(e) => handleUpdatePendencia(pend.id, 'descricao', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>
              ))}
            </div>

            {/* Observações (opcional, recolhido por padrão) */}
            <div className="pt-2 border-t border-gray-150">
              <button
                type="button"
                onClick={() => setMostrarObservacoes(!mostrarObservacoes)}
                className="flex items-center justify-between w-full text-left text-xs font-extrabold text-gray-600 hover:text-gray-900 uppercase tracking-wider py-1 cursor-pointer"
              >
                <span>Observações Gerais (Opcional)</span>
                {mostrarObservacoes ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {mostrarObservacoes && (
                <textarea
                  rows={3}
                  placeholder="Observações adicionais do atendimento..."
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2.5 border border-gray-300 bg-gray-50 focus:bg-white rounded-xl text-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          C1. MODAL "INICIAR ATENDIMENTO • <TAG>"
          ========================================================================= */}
      {iniciandoParada && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#19502F] p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  INICIAR ATENDIMENTO • {iniciandoParada.tag}
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Frente {iniciandoParada.frente} • Parada aberta às{' '}
                  {formatarHoraPtBr(iniciandoParada.inicioParada)} por {iniciandoParada.criadoPor}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIniciandoParada(null)}
                className="text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {iniciandoParada.emAtendimentoPor && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <strong>Nota:</strong> Esta parada já está em atendimento por{' '}
                  <strong>{iniciandoParada.emAtendimentoPor.tecnicoPrincipal.nome}</strong> desde{' '}
                  {formatarHoraPtBr(iniciandoParada.emAtendimentoPor.inicioAtendimento)}. Ao confirmar, você entrará como{' '}
                  <strong>membro da equipe da mesma parada</strong>, sem duplicar!
                </div>
              )}

              {iniciandoErroTecnico && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{iniciandoErroTecnico}</span>
                </div>
              )}

              {/* Técnico Responsável (Obrigatório) usando <SeletorTecnico /> */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1.5">
                  Técnico Responsável (Obrigatório) *
                </label>
                <SeletorTecnico
                  tecnicos={tecnicos}
                  selectedNome={tecnicoNome}
                  selectedFuncao={tecnicoFuncao}
                  selectedMatricula={tecnicoMatricula}
                  selectedGrupo={tecnicoGrupo}
                  isAdmin={user.role === 'admin'}
                  label="TÉCNICO RESPONSÁVEL"
                  onChange={(nome, funcao, matricula, grupo) => {
                    setTecnicoNome(nome);
                    setTecnicoFuncao(funcao);
                    setTecnicoMatricula(matricula || '');
                    setTecnicoGrupo(grupo || '');
                    setIniciandoErroTecnico('');
                  }}
                />
              </div>

              {/* Outros membros da equipe usando <SeletorTecnico /> */}
              <div className="border-t border-gray-150 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                    Outros Membros da Equipe (Opcional)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setExtraIntegrantes([
                        ...extraIntegrantes,
                        {
                          id: `int-${Date.now()}-${Math.random()}`,
                          nome: '',
                          funcao: 'Auxiliar',
                          matricula: '',
                          papel: 'Mecânico Apoio'
                        }
                      ]);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase bg-emerald-50 text-[#19502F] border border-emerald-200 rounded-lg hover:bg-emerald-100 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Adicionar Membro
                  </button>
                </div>

                {extraIntegrantes.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {extraIntegrantes.map((membro) => (
                      <div
                        key={membro.id}
                        className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">
                            Membro da Equipe
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setExtraIntegrantes(
                                extraIntegrantes.filter((m) => m.id !== membro.id)
                              )
                            }
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                        <SeletorTecnico
                          tecnicos={tecnicos}
                          selectedNome={membro.nome}
                          selectedFuncao={membro.funcao}
                          selectedMatricula={membro.matricula}
                          isAdmin={user.role === 'admin'}
                          label="SELECIONAR MEMBRO"
                          onChange={(nome, funcao, matricula) => {
                            setExtraIntegrantes(
                              extraIntegrantes.map((m) =>
                                m.id === membro.id
                                  ? { ...m, nome, funcao, matricula: matricula || '' }
                                  : m
                              )
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tipo de Manutenção: CORRETIVA (HMC 9000) / PREVENTIVA (MPS 7000) / PROGRAMADA (MPNS 8000) */}
              <div className="border-t border-gray-150 pt-3">
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1.5">
                  Tipo de Manutenção
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { tipo: 'CORRETIVA' as const, cod: 'HMC 9000' },
                    { tipo: 'PREVENTIVA' as const, cod: 'MPS 7000' },
                    { tipo: 'PROGRAMADA' as const, cod: 'MPNS 8000' }
                  ].map((item) => (
                    <button
                      key={item.tipo}
                      type="button"
                      onClick={() => setIniciandoTipoManutencao(item.tipo)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        iniciandoTipoManutencao === item.tipo
                          ? 'bg-[#19502F] text-white border-[#19502F] shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <span className="block text-[11px] font-black uppercase">{item.tipo}</span>
                      <span className="block text-[10px] font-mono opacity-85 mt-0.5">
                        {item.cod}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* TURMA (A, B, C, D, ADM, 1/3, 2/3) – pré-seleciona a última usada neste aparelho */}
              <div className="border-t border-gray-150 pt-3">
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1.5">
                  Turma
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {['A', 'B', 'C', 'D', 'ADM', '1/3', '2/3'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTeam(opt);
                        try {
                          localStorage.setItem(ULTIMA_TURMA_KEY, opt);
                        } catch {}
                      }}
                      className={`py-2.5 text-xs font-extrabold rounded-xl border transition cursor-pointer ${
                        team === opt
                          ? 'bg-[#19502F] text-white border-[#19502F] shadow-2xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hora de início do atendimento (padrão: agora) */}
              <div className="border-t border-gray-150 pt-3 flex items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Hora de Início do Atendimento
                  </label>
                  <span className="text-[10px] text-gray-500">
                    Fecha o segmento atual e abre EXEC MANUT neste horário
                  </span>
                </div>
                <input
                  type="time"
                  value={iniciandoHoraHhMm}
                  onChange={(e) => setIniciandoHoraHhMm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm font-black font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19502F]"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIniciandoParada(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarIniciarAtendimento}
                  className="px-5 py-2.5 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Confirmar e Iniciar Atendimento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL PAUSAR ATENDIMENTO
          ========================================================================= */}
      {pausandoParada && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-amber-500 p-5 text-emerald-950 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Pause className="w-4 h-4 fill-current" />
                  Pausar Atendimento • {pausandoParada.tag}
                </h3>
                <p className="text-[11px] font-bold text-emerald-950/80 mt-0.5">
                  Fecha o segmento EXEC atual e abre o motivo de espera (AG)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPausandoParada(null)}
                className="text-emerald-950/80 hover:text-emerald-950 bg-black/10 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-2">
                  Selecione o Motivo da Pausa *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {MOTIVOS_PAUSA_RAPIDA.map((m) => {
                    const selected = !pausaModoOutro && pausaCodigo === m.codigo;
                    return (
                      <button
                        key={m.codigo}
                        type="button"
                        onClick={() => {
                          setPausaModoOutro(false);
                          setPausaCodigo(m.codigo);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                          selected
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 text-gray-900'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-black uppercase block">{m.rotulo}</span>
                          <span className="text-[10px] text-gray-500">{m.quem}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">
                          {m.resp}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setPausaModoOutro(true)}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      pausaModoOutro
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/30 text-gray-900'
                        : 'bg-gray-50 border-gray-250 hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <span className="text-xs font-black uppercase flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" /> OUTRO (Buscar na Base de Códigos Vale)
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#19502F]">
                      {pausaCodigo}
                    </span>
                  </button>
                </div>
              </div>

              {pausaModoOutro && (
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-250 space-y-2">
                  <input
                    type="text"
                    value={pausaBuscaOutro}
                    onChange={(e) => setPausaBuscaOutro(e.target.value)}
                    placeholder="Pesquisar código ou descrição Vale..."
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold"
                    autoFocus
                  />
                  <div className="max-h-40 overflow-y-auto divide-y divide-gray-150 bg-white rounded-xl border border-gray-200">
                    {CODIGOS_VALE_FLAT.filter((c) => {
                      if (!pausaBuscaOutro.trim()) return c.sit === 'AG';
                      const q = removerAcentos(pausaBuscaOutro);
                      return (
                        removerAcentos(c.rotuloCompleto).includes(q) ||
                        removerAcentos(c.quem).includes(q)
                      );
                    }).map((c) => (
                      <button
                        key={c.codigo}
                        type="button"
                        onClick={() => setPausaCodigo(c.codigo)}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-emerald-50 cursor-pointer ${
                          pausaCodigo === c.codigo
                            ? 'bg-emerald-100 font-bold text-emerald-950'
                            : 'text-gray-700'
                        }`}
                      >
                        <span>
                          <strong>{c.codigo}</strong> – {c.nome}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">{c.resp}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-150">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Complemento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={pausaComplemento}
                    onChange={(e) => setPausaComplemento(e.target.value)}
                    placeholder="Ex: Nº da requisição, peça, nº da PTS..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Hora da Pausa
                  </label>
                  <input
                    type="time"
                    value={pausaHoraHhMm}
                    onChange={(e) => setPausaHoraHhMm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-black font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPausandoParada(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarPausa}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  Confirmar Pausa ({pausaCodigo})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL RETOMAR ATENDIMENTO
          ========================================================================= */}
      {retomandoParada && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-blue-600 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Retomar Atendimento • {retomandoParada.tag}
                </h3>
                <p className="text-[11px] text-blue-100 mt-0.5">
                  Fecha o período AG atual e reabre{' '}
                  {retomandoParada.emAtendimentoPor?.codigoExec || 'HMC 9000'} EXEC MANUT
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRetomandoParada(null)}
                className="text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-800 uppercase">
                    Hora da Retomada
                  </label>
                  <span className="text-[10px] text-gray-500">Padrão: hora do toque</span>
                </div>
                <input
                  type="time"
                  value={retomarHoraHhMm}
                  onChange={(e) => setRetomarHoraHhMm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-xl text-sm font-black font-mono"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRetomandoParada(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRetomar}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  Confirmar Retomada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          C2.d) MODAL FINALIZAR ATENDIMENTO
          ========================================================================= */}
      {finalizandoParada && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#19502F] p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Finalizar Atendimento • {finalizandoParada.tag}
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Confirme o horário de término e a condição do equipamento
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFinalizandoParada(null)}
                className="text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {finalizarErro && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{finalizarErro}</span>
                </div>
              )}

              {/* Hora Fim e Horímetro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-extrabold text-gray-800 uppercase">
                      Hora Fim *
                    </label>
                    <span className="text-[10px] text-gray-500">Padrão: agora</span>
                  </div>
                  <input
                    type="time"
                    value={finalizarHoraFim}
                    onChange={(e) => setFinalizarHoraFim(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black font-mono text-gray-900"
                    required
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                  <label className="block text-[11px] font-extrabold text-gray-800 uppercase mb-1">
                    Horímetro *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 82341.5"
                    value={finalizarHorimetro}
                    onChange={(e) => {
                      setFinalizarHorimetro(e.target.value);
                      setFinalizarErro('');
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-sm font-bold font-mono"
                  />
                </div>
              </div>

              {/* Sintoma, Causa e Ação Executada */}
              <div className="space-y-3">
                <SeletorCatalogo
                  tag={finalizandoParada.tag}
                  value={finalizarFalha}
                  complemento={
                    finalizarFalha ? finalizarFalha.complemento || '' : finalizarSintoma
                  }
                  obrigatorio={true}
                  isAdmin={user.role === 'admin'}
                  labelTitulo="SINTOMA (CATÁLOGO DE FALHAS) *"
                  onChange={(falha, resumo, comp) => {
                    setFinalizarFalha(falha);
                    setFinalizarSintoma(resumo || comp);
                    setFinalizarErro('');
                  }}
                />

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Causa *
                  </label>
                  <textarea
                    rows={2}
                    value={finalizarCausa}
                    onChange={(e) => {
                      setFinalizarCausa(e.target.value);
                      setFinalizarErro('');
                    }}
                    placeholder="Descreva a causa identificada..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Ação Executada *
                  </label>
                  <textarea
                    rows={3}
                    value={finalizarAcao}
                    onChange={(e) => {
                      setFinalizarAcao(e.target.value);
                      setFinalizarErro('');
                    }}
                    placeholder="Descreva o serviço executado..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Fotos */}
              {atendimentoDaParadaFinalizando && (
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <span className="block text-[10px] font-extrabold text-gray-600 uppercase tracking-wider">
                    Fotos do Atendimento ({(atendimentoDaParadaFinalizando.photoUrls || []).length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-700 text-emerald-900 rounded-xl text-[11px] font-extrabold uppercase cursor-pointer">
                      <Camera className="w-3.5 h-3.5" /> Adicionar Foto
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          handleImageUpload(atendimentoDaParadaFinalizando.id, e.target.files);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    {(atendimentoDaParadaFinalizando.photoUrls || []).map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt="Foto"
                        className="w-12 h-12 rounded-lg object-cover border border-gray-300"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Opção: Equipamento LIBERADO vs Continua parado */}
              <div className="pt-2 border-t border-gray-200 space-y-3">
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                  Condição do Equipamento ao Finalizar
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFinalizarLiberado(true)}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      finalizarLiberado
                        ? 'bg-emerald-50 border-[#19502F] text-emerald-950'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-black uppercase block">
                      ✓ Equipamento LIBERADO
                    </span>
                    <span className="text-[10px] block mt-0.5 opacity-80">
                      Cria HOI 5936 LIBERADO PELA MANUT (Produção)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFinalizarLiberado(false)}
                    className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                      !finalizarLiberado
                        ? 'bg-amber-50 border-amber-500 text-amber-950'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xs font-black uppercase block">
                      ⚠️ Continua parado
                    </span>
                    <span className="text-[10px] block mt-0.5 opacity-80">
                      Escolher código AG (continua aberta p/ próximo turno)
                    </span>
                  </button>
                </div>

                {!finalizarLiberado && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                    <label className="block text-[11px] font-extrabold text-amber-950 uppercase">
                      Código AG de Continuidade da Parada *
                    </label>
                    <select
                      value={finalizarCodigoContinuacao}
                      onChange={(e) => setFinalizarCodigoContinuacao(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-900"
                    >
                      {MOTIVOS_PAUSA_RAPIDA.map((m) => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.rotulo} ({m.resp})
                        </option>
                      ))}
                      {CODIGOS_VALE_FLAT.filter(
                        (c) =>
                          c.sit === 'AG' &&
                          !MOTIVOS_PAUSA_RAPIDA.some((m) => m.codigo === c.codigo)
                      ).map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.rotuloCompleto} ({c.resp})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Complemento Final (Opcional)
                  </label>
                  <input
                    type="text"
                    value={finalizarComplemento}
                    onChange={(e) => setFinalizarComplemento(e.target.value)}
                    placeholder="Observação de entrega ou pendência para próximo turno..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setFinalizandoParada(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarFinalizarAtendimento}
                  className="px-5 py-2.5 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Finalizar e Enviar Relatório</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          C3. MODAL "ABRIR NOVA PARADA" PELO TÉCNICO
          ========================================================================= */}
      {showNovaParadaModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-gray-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="bg-[#19502F] p-5 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Abrir Nova Parada de Equipamento
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Para equipamentos que pararam e ainda não estão na lista
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNovaParadaModal(false)}
                className="text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1">
                  TAG do Equipamento *
                </label>
                <input
                  type="text"
                  value={novaParadaTag}
                  onChange={(e) => {
                    const norm = normalizarTag(e.target.value);
                    setNovaParadaTag(norm);
                    setNovaParadaFrente(derivarFrenteDaTag(norm));
                  }}
                  placeholder="Ex: EH-4050, CR-3114, CR-2520"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-black uppercase font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#19502F]"
                  required
                  autoFocus
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {presetEquipments.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setNovaParadaTag(t);
                        setNovaParadaFrente(derivarFrenteDaTag(t));
                      }}
                      className="px-2 py-0.5 text-[10px] font-mono font-bold bg-gray-100 hover:bg-emerald-50 text-gray-700 rounded-md border border-gray-200 cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {paradaDuplicadaExistente && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2">
                  <div className="flex items-start gap-2 text-amber-950">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase">
                        Já existe parada aberta para esta TAG ({paradaDuplicadaExistente.tag})
                      </p>
                      <p className="text-[11px] text-amber-900 mt-0.5">
                        Aberta às {formatarHoraPtBr(paradaDuplicadaExistente.inicioParada)} • Status:{' '}
                        <strong>{getSegmentoAtual(paradaDuplicadaExistente).codigo}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNovaParadaModal(false);
                      handleAbrirModalIniciar(paradaDuplicadaExistente);
                    }}
                    className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Iniciar Atendimento desta Parada Agora</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Hora Real da Parada *
                  </label>
                  <input
                    type="time"
                    value={novaParadaHoraReal}
                    onChange={(e) => setNovaParadaHoraReal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-black font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Frente
                  </label>
                  <input
                    type="text"
                    value={novaParadaFrente}
                    readOnly
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-250 rounded-xl text-sm font-bold text-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                  Status Inicial (Padrão: HMC 9130 AG ATENDIMENTO)
                </label>
                <select
                  value={novaParadaCodigo}
                  onChange={(e) => setNovaParadaCodigo(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
                >
                  <option value="HMC 9130">HMC 9130 – AG ATENDIMENTO (Padrão)</option>
                  <option value="MPS 7130">MPS 7130 – AG ATENDIMENTO PREVENTIVA</option>
                  <option value="HMC 9118">HMC 9118 – AG PEÇAS</option>
                  <option value="HMC 9120">HMC 9120 – AG OPERAÇÃO / SEGREGAÇÃO</option>
                  <option value="HMC 9115">HMC 9115 – AG LIBERAÇÃO DE ACESSO</option>
                  <option value="HMC 9135">HMC 9135 – AG PTS</option>
                </select>
              </div>

              <div>
                <SeletorCatalogo
                  tag={novaParadaTag}
                  value={novaParadaFalha}
                  complemento={novaParadaSintoma}
                  obrigatorio={false}
                  isAdmin={user.role === 'admin'}
                  labelTitulo="SINTOMA PELO CATÁLOGO DA TAG (OPCIONAL NA ABERTURA)"
                  onChange={(falha, resumo, comp) => {
                    setNovaParadaFalha(falha);
                    setNovaParadaSintoma(resumo || comp);
                  }}
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNovaParadaModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!novaParadaTag.trim() || !!paradaDuplicadaExistente}
                  onClick={() => criarParadaPeloTecnico(false)}
                  className="px-4 py-2.5 bg-white border border-[#19502F] text-[#19502F] hover:bg-emerald-50 disabled:opacity-40 font-black text-xs uppercase rounded-xl cursor-pointer"
                >
                  Apenas Criar Parada
                </button>
                <button
                  type="button"
                  disabled={!novaParadaTag.trim() || !!paradaDuplicadaExistente}
                  onClick={() => criarParadaPeloTecnico(true)}
                  className="px-5 py-2.5 bg-[#19502F] hover:bg-emerald-950 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar atendimento agora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX DE FOTOS */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={zoomedImage}
            alt="Evidência ampliada"
            className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <span className="mt-3 text-white/90 text-xs font-bold uppercase">
            Toque em qualquer lugar para fechar ✕
          </span>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO "RELATÓRIO ENVIADO" */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-100">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-emerald-950 uppercase tracking-tight mb-2">
              Relatório enviado
            </h3>
            <p className="text-xs text-gray-600 font-semibold leading-relaxed mb-6">
              O relatório foi gravado como ENVIADO e vinculado à Parada do equipamento.
            </p>
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="w-full py-3.5 bg-[#19502F] text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-950 transition cursor-pointer shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          RODAPÉ FIXO:
          - Na tela "ATENDIMENTO • <TAG>" (C2.c): "PAUSAR" (ou "RETOMAR"), "SALVAR RASCUNHO" e "FINALIZAR"
          - Na tela inicial / Meus Relatórios (B4): apenas as abas "PAINEL" e "MEUS RELATÓRIOS"
          ========================================================================= */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 py-2.5 px-3 z-40 shadow-xl select-none">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'atendimento' ? (
            <div className="grid grid-cols-3 gap-2.5">
              {activeParada ? (
                !activeParada.emAtendimentoPor?.pausadoEm ? (
                  <button
                    type="button"
                    onClick={() => handleAbrirModalPausar(activeParada)}
                    className="py-3 px-3 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    <span>PAUSAR</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAbrirModalRetomar(activeParada)}
                    className="py-3 px-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>RETOMAR</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('painel')}
                  className="py-3 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>PAINEL</span>
                </button>
              )}

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSalvarRascunhoManual}
                className="py-3 px-3 bg-white border-2 border-[#19502F] text-[#19502F] hover:bg-emerald-50 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>SALVAR RASCUNHO</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (activeParada) {
                    handleAbrirModalFinalizar(activeParada);
                  } else if (atendimentoAtual) {
                    if (
                      !atendimentoAtual.horimetro.trim() ||
                      !atendimentoAtual.causa.trim() ||
                      !atendimentoAtual.acaoExecutada.trim()
                    ) {
                      alert('Preencha Horímetro, Sintoma, Causa e Ação Executada para finalizar.');
                      return;
                    }
                    handleSaveWithCustomAtendimentos('ENVIADO', atendimentos);
                  }
                }}
                className="py-3 px-3 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>FINALIZAR</span>
              </button>
            </div>
          ) : (
            /* B4. Rodapé fixo no Controle: apenas as abas "PAINEL" e "MEUS RELATÓRIOS" */
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('painel');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'painel'
                    ? 'bg-[#19502F] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>PAINEL</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('meus_relatorios');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className={`py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'meus_relatorios'
                    ? 'bg-[#19502F] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ClipboardList className="w-4 h-4" />
                <span>MEUS RELATÓRIOS ({myReports.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
