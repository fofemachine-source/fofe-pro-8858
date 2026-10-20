import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Camera, Save, Send, AlertTriangle, 
  CheckCircle2, FileText, Calendar, Info, Clock, User as UserIcon, BookOpen, FileSpreadsheet, X,
  ClipboardList, PlusCircle, Play, Pause, RotateCcw, Wrench, Search, Users, Check, AlertCircle, ArrowRight, History
} from 'lucide-react';
import { Report, Atendimento, Pendencia, User, Preventiva, Tecnico, Parada } from '../types';
import { ReportCardAccordion } from './ReportCardAccordion';
import { TechnicianScrollSelector } from './TechnicianScrollSelector';
import { 
  getSegmentoAtual, 
  calcularDuracaoTotalParadaMinutos, 
  formatarMinutosEmHorasEMinutos,
  formatarParadoHaXhYm,
  iniciarAtendimentoParada,
  adicionarMembroEquipeParada,
  pausarAtendimentoParada,
  retomarAtendimentoParada,
  finalizarAtendimentoParada,
  criarNovaParada,
  MOTIVOS_PAUSA_RAPIDA
} from '../lib/paradasEngine';
import { getResponsabilidadeStyle } from '../theme/uEmTheme';
import { derivarFrenteDaTag, normalizarTag, formatarHoraPtBr, removerAcentos } from '../lib/uEmDataUtils';
import { CODIGOS_VALE_FLAT, buscarCodigoVale } from '../data/codigosVale';

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

/**
 * Converte um horário HH:mm em ISO preservando a data de referência e o instante exato do toque quando aplicável.
 */
function resolverHorarioIso(horaHhMm: string, horaToqueIso: string, referenciaMinimaIso?: string): string {
  const toqueDate = new Date(horaToqueIso);
  const toqueHhMm = toqueDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (!horaHhMm || !horaHhMm.includes(':')) {
    return horaToqueIso;
  }

  // Se o técnico manteve o horário padrão do toque, usa o timestamp do toque
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

  // Caso o técnico tenha informado um horário específico (ex: 11:10, 11:40, 12:10, 12:40)
  const baseDate = referenciaMinimaIso ? new Date(referenciaMinimaIso) : toqueDate;
  const [hh, mm] = horaHhMm.split(':').map(Number);
  const candidate = new Date(baseDate);
  candidate.setHours(hh, mm, 0, 0);

  if (referenciaMinimaIso) {
    const minMs = new Date(referenciaMinimaIso).getTime();
    // Se ficou antes do início de referência por virada de turno (meia-noite), avança 1 dia
    if (candidate.getTime() < minMs && (minMs - candidate.getTime()) > 6 * 3600 * 1000) {
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  return candidate.toISOString();
}

export function MechanicView({ 
  user, 
  reports, 
  onSaveReport, 
  isOffline, 
  onDeleteReport,
  preventivas,
  onAddPreventiva,
  onDeletePreventiva,
  tecnicos = [],
  paradas = [],
  onSaveParada
}: MechanicViewProps) {
  // Current active report being edited
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  
  // Tab control: 'form' to write/edit, 'history' to view previous reports
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Lightbox view for added photos in form
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Preventivas schedule modal controls
  const [showPreventivasModal, setShowPreventivasModal] = useState(false);
  const [newEquip, setNewEquip] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleRegisterPreventiva = () => {
    if (!newEquip.trim() || !newDate) return;
    
    const dateParts = newDate.split('-');
    let formattedDate = newDate;
    if (dateParts.length === 3) {
      formattedDate = `${dateParts[2]}/${dateParts[1]}`;
    }

    onAddPreventiva({
      equipamento: newEquip.trim().toUpperCase(),
      dataParada: formattedDate,
      usuario: user.username
    });

    setNewEquip('');
    setNewDate('');
  };

  // Form State
  const [dateStart, setDateStart] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [team, setTeam] = useState('A');
  const [shift, setShift] = useState('18:00 às 06:00');
  const [frente, setFrente] = useState('EH');

  // Equipe
  const [tecnicoNome, setTecnicoNome] = useState('');
  const [tecnicoFuncao, setTecnicoFuncao] = useState('Mecânico');
  const [tecnicoMatricula, setTecnicoMatricula] = useState('');
  const [tecnicoGrupo, setTecnicoGrupo] = useState('');
  const [showExtraEquipe, setShowExtraEquipe] = useState(false);
  const [extraIntegrantes, setExtraIntegrantes] = useState<Array<{
    id: string;
    nome: string;
    funcao: string;
    matricula: string;
    papel: string;
  }>>([]);
  const [eletricista, setEletricista] = useState('');
  const [mecanico, setMecanico] = useState('');
  const [auxiliar, setAuxiliar] = useState('');
  const [motorista, setMotorista] = useState('');
  const [monitor, setMonitor] = useState('');

  // Atendimentos List
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  
  // Pendências List
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);

  // Observações Gerais
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Quick suggestions for equipment on taps:
  const presetEquipments = ['EH-4050', 'EH-5004', 'CR-3116', 'PF-1031', 'EH-5003'];

  // Refs and states to prevent duplicate sends/saves and handle success overlays
  const skipAutoSaveRef = React.useRef(false);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // ---------------------------------------------------------------------------
  // PARADAS AGUARDANDO ATENDIMENTO & CICLO DE VIDA DO ATENDIMENTO (CONTROLE)
  // ---------------------------------------------------------------------------
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const [filtroFrenteParada, setFiltroFrenteParada] = useState<'TODAS' | 'EH' | 'CR' | 'PF' | 'INFRA'>('TODAS');
  const [filtroTagParada, setFiltroTagParada] = useState('');
  const [activeParadaId, setActiveParadaId] = useState<string | null>(null);
  const [highlightParadaId, setHighlightParadaId] = useState<string | null>(null);

  // Modal 1: Iniciar Atendimento
  const [iniciandoParada, setIniciandoParada] = useState<Parada | null>(null);
  const [iniciandoHoraToqueIso, setIniciandoHoraToqueIso] = useState<string>('');
  const [iniciandoHoraHhMm, setIniciandoHoraHhMm] = useState<string>('');
  const [iniciandoTipoManutencao, setIniciandoTipoManutencao] = useState<'CORRETIVA' | 'PREVENTIVA' | 'PROGRAMADA'>('CORRETIVA');
  const [iniciandoErroTecnico, setIniciandoErroTecnico] = useState<string>('');

  // Modal 2: Abrir Nova Parada (pelo técnico)
  const [showNovaParadaModal, setShowNovaParadaModal] = useState(false);
  const [novaParadaTag, setNovaParadaTag] = useState('');
  const [novaParadaFrente, setNovaParadaFrente] = useState('EH');
  const [novaParadaHoraReal, setNovaParadaHoraReal] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [novaParadaCodigo, setNovaParadaCodigo] = useState('HMC 9130');
  const [novaParadaOS, setNovaParadaOS] = useState('');
  const [novaParadaSintoma, setNovaParadaSintoma] = useState('');

  // Modal 3: Pausar Atendimento
  const [pausandoParada, setPausandoParada] = useState<Parada | null>(null);
  const [pausaHoraToqueIso, setPausaHoraToqueIso] = useState<string>('');
  const [pausaHoraHhMm, setPausaHoraHhMm] = useState<string>('');
  const [pausaModoOutro, setPausaModoOutro] = useState(false);
  const [pausaCodigo, setPausaCodigo] = useState('HMC 9118');
  const [pausaComplemento, setPausaComplemento] = useState('');
  const [pausaBuscaOutro, setPausaBuscaOutro] = useState('');

  // Modal 4: Retomar Atendimento
  const [retomandoParada, setRetomandoParada] = useState<Parada | null>(null);
  const [retomarHoraToqueIso, setRetomarHoraToqueIso] = useState<string>('');
  const [retomarHoraHhMm, setRetomarHoraHhMm] = useState<string>('');

  // Modal 5: Finalizar Atendimento
  const [finalizandoParada, setFinalizandoParada] = useState<Parada | null>(null);
  const [finalizarHoraToqueIso, setFinalizarHoraToqueIso] = useState<string>('');
  const [finalizarHoraFim, setFinalizarHoraFim] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [finalizarLiberado, setFinalizarLiberado] = useState(true);
  const [finalizarCodigoContinuacao, setFinalizarCodigoContinuacao] = useState('HMC 9118');
  const [finalizarBuscaOutroAg, setFinalizarBuscaOutroAg] = useState('');
  const [finalizarComplemento, setFinalizarComplemento] = useState('');
  const [finalizarSintoma, setFinalizarSintoma] = useState('');
  const [finalizarCausa, setFinalizarCausa] = useState('');
  const [finalizarAcao, setFinalizarAcao] = useState('');
  const [finalizarErro, setFinalizarErro] = useState('');

  // Atualiza "Parado há Xh Ym" a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Lista de Paradas ABERTAS ordenadas pelo maior tempo parado
  const paradasAbertasOrdenadas = useMemo(() => {
    return paradas
      .filter(p => p.situacao === 'ABERTA')
      .sort((a, b) => {
        const dA = calcularDuracaoTotalParadaMinutos(a, liveNow);
        const dB = calcularDuracaoTotalParadaMinutos(b, liveNow);
        return dB - dA;
      });
  }, [paradas, liveNow]);

  // Filtro por frente (EH, CR, PF, INFRA) e busca por TAG
  const paradasAbertasFiltradas = useMemo(() => {
    return paradasAbertasOrdenadas.filter(p => {
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

  // Parada ativa vinculada ao atendimento atual do técnico
  const activeParada = useMemo(() => {
    if (activeParadaId) {
      const found = paradas.find(p => p.id === activeParadaId && p.situacao === 'ABERTA');
      if (found) return found;
    }
    if (tecnicoNome.trim()) {
      const byTec = paradas.find(
        p =>
          p.situacao === 'ABERTA' &&
          p.emAtendimentoPor &&
          (p.emAtendimentoPor.tecnicoPrincipal.nome.toLowerCase() === tecnicoNome.trim().toLowerCase() ||
            (p.emAtendimentoPor.membrosEquipe || []).some(m => m.nome.toLowerCase() === tecnicoNome.trim().toLowerCase()))
      );
      if (byTec) return byTec;
    }
    return null;
  }, [paradas, activeParadaId, tecnicoNome]);

  // Verifica duplicidade ao digitar TAG no modal "ABRIR NOVA PARADA"
  const paradaDuplicadaExistente = useMemo(() => {
    if (!novaParadaTag.trim()) return null;
    const norm = normalizarTag(novaParadaTag);
    return paradas.find(p => p.situacao === 'ABERTA' && normalizarTag(p.tag) === norm) || null;
  }, [novaParadaTag, paradas]);

  // Initialize form with a fresh new report structure
  const handleResetForm = () => {
    setActiveReportId(`rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
    setDateStart(new Date().toISOString().slice(0, 10));
    setDateEnd(new Date().toISOString().slice(0, 10));
    setTeam('A');
    setShift('18:00 às 06:00');
    setFrente('EH');
    setTecnicoNome('');
    setTecnicoFuncao('Mecânico');
    setTecnicoMatricula('');
    setTecnicoGrupo('');
    setShowExtraEquipe(false);
    setExtraIntegrantes([]);
    setEletricista('');
    setMecanico('');
    setAuxiliar('');
    setMotorista('');
    setMonitor('');
    setAtendimentos([]);
    setPendencias([]);
    setObservacoesGerais('');
    setActiveParadaId(null);
    setActiveTab('form');
  };

  // Load an existing report from history into the form for editing
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
      setExtraIntegrantes(report.equipeDetalhada.map((e, idx) => ({
        id: `int-${idx}-${Date.now()}`,
        nome: e.nome,
        funcao: e.funcao || 'Auxiliar',
        matricula: e.matricula || '',
        papel: e.papel || 'Auxiliar'
      })));
      setShowExtraEquipe(true);
    } else if (report.auxiliar || report.motorista) {
      const ints = [];
      if (report.auxiliar) {
        ints.push({ id: `int-1`, nome: report.auxiliar, funcao: 'Auxiliar', matricula: '', papel: 'Auxiliar' });
      }
      if (report.motorista) {
        ints.push({ id: `int-2`, nome: report.motorista, funcao: 'Motorista', matricula: '', papel: 'Motorista' });
      }
      setExtraIntegrantes(ints);
      setShowExtraEquipe(true);
    } else {
      setExtraIntegrantes([]);
      setShowExtraEquipe(false);
    }

    setEletricista(report.eletricista || '');
    setMecanico(report.mecanico || '');
    setAuxiliar(report.auxiliar || '');
    setMotorista(report.motorista || '');
    setMonitor(report.monitor || '');
    setAtendimentos(report.atendimentos || []);
    setPendencias(report.pendencias || []);
    setObservacoesGerais(report.observacoesGerais || '');
    setActiveTab('form');
  };

  useEffect(() => {
    handleResetForm();
  }, [user.username]);

  // ---------------------------------------------------------------------------
  // AÇÕES DO CICLO DE VIDA DA PARADA (INICIAR, PAUSAR, RETOMAR, FINALIZAR, NOVA)
  // ---------------------------------------------------------------------------

  // Abrir modal para Iniciar Atendimento da Parada
  const handleAbrirModalIniciar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    setIniciandoParada(parada);
    setIniciandoHoraToqueIso(agoraIso);
    setIniciandoHoraHhMm(agoraHhMm);
    setIniciandoTipoManutencao(parada.emAtendimentoPor?.tipoManutencao || 'CORRETIVA');
    setIniciandoErroTecnico('');
  };

  // Confirmar Início do Atendimento
  const handleConfirmarIniciarAtendimento = () => {
    if (!iniciandoParada) return;
    if (!tecnicoNome.trim()) {
      setIniciandoErroTecnico('Selecione o técnico responsável na lista antes de iniciar o atendimento.');
      return;
    }

    const repId = activeReportId || `rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    if (!activeReportId) setActiveReportId(repId);

    const segAtual = getSegmentoAtual(iniciandoParada);
    const horaToqueEfetivaIso = resolverHorarioIso(iniciandoHoraHhMm, iniciandoHoraToqueIso, segAtual.inicio);
    const horaInicioHhMm = new Date(horaToqueEfetivaIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const horaRealParadaHhMm = new Date(iniciandoParada.inicioParada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const membrosValidos = extraIntegrantes
      .filter(m => m.nome.trim() !== '')
      .map(m => ({
        id: m.id,
        nome: m.nome.trim(),
        matricula: m.matricula,
        funcao: m.funcao,
        papel: m.papel
      }));

    // Atualiza a Parada (se outro técnico já iniciou, iniciarAtendimentoParada adiciona este técnico na equipe da mesma parada sem duplicar)
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

    setActiveParadaId(paradaAtualizada.id);
    setFrente(paradaAtualizada.frente || derivarFrenteDaTag(paradaAtualizada.tag));

    // Monta string de atuantes (técnico principal + membros da equipe da parada)
    const todosAtuantes = [
      paradaAtualizada.emAtendimentoPor?.tecnicoPrincipal.nome || tecnicoNome.trim(),
      ...(paradaAtualizada.emAtendimentoPor?.membrosEquipe || []).map(m => m.nome)
    ].filter(Boolean);
    const atuantesStr = Array.from(new Set(todosAtuantes)).join(', ');

    // Preenche/atualiza automaticamente o card de Equipamento Atendido no formulário do relatório
    setAtendimentos((prev) => {
      const idxExistente = prev.findIndex(a => normalizarTag(a.equipamento) === normalizarTag(paradaAtualizada.tag));
      if (idxExistente >= 0) {
        return prev.map((a, i) =>
          i === idxExistente
            ? {
                ...a,
                equipamento: paradaAtualizada.tag,
                om: a.om || paradaAtualizada.numeroOS || '',
                sintoma: a.sintoma || paradaAtualizada.sintomaInicial || '',
                horaRealParada: horaRealParadaHhMm,
                horaInicio: a.horaInicio || horaInicioHhMm,
                tipoManutencao: iniciandoTipoManutencao,
                atuantes: atuantesStr
              }
            : a
        );
      }

      const novoAt: Atendimento = {
        id: `at-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        equipamento: paradaAtualizada.tag,
        om: paradaAtualizada.numeroOS || '',
        horimetro: '',
        sintoma: paradaAtualizada.sintomaInicial || '',
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
      return [novoAt, ...prev];
    });

    setIniciandoParada(null);

    // Rola suavemente para o formulário preenchido
    setTimeout(() => {
      const el = document.getElementById('secao-equipamentos-atendidos');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  // Abrir modal para Pausar Atendimento
  const handleAbrirModalPausar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    setPausandoParada(parada);
    setPausaHoraToqueIso(agoraIso);
    setPausaHoraHhMm(agoraHhMm);
    setPausaModoOutro(false);
    setPausaCodigo('HMC 9118');
    setPausaComplemento('');
    setPausaBuscaOutro('');
  };

  // Confirmar Pausa do Atendimento
  const handleConfirmarPausa = () => {
    if (!pausandoParada) return;
    const nomeTec = tecnicoNome.trim() || pausandoParada.emAtendimentoPor?.tecnicoPrincipal.nome || user.name || user.username;
    const matTec = tecnicoMatricula || pausandoParada.emAtendimentoPor?.tecnicoPrincipal.matricula || undefined;

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

  // Abrir modal para Retomar Atendimento
  const handleAbrirModalRetomar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    setRetomandoParada(parada);
    setRetomarHoraToqueIso(agoraIso);
    setRetomarHoraHhMm(agoraHhMm);
  };

  // Confirmar Retomada do Atendimento
  const handleConfirmarRetomar = () => {
    if (!retomandoParada) return;
    const nomeTec = tecnicoNome.trim() || retomandoParada.emAtendimentoPor?.tecnicoPrincipal.nome || user.name || user.username;
    const matTec = tecnicoMatricula || retomandoParada.emAtendimentoPor?.tecnicoPrincipal.matricula || undefined;

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

  // Abrir modal para Finalizar Atendimento
  const handleAbrirModalFinalizar = (parada: Parada) => {
    const agoraIso = new Date().toISOString();
    const agoraHhMm = new Date(agoraIso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const atExistente = atendimentos.find(a => normalizarTag(a.equipamento) === normalizarTag(parada.tag));

    setFinalizandoParada(parada);
    setFinalizarHoraToqueIso(agoraIso);
    setFinalizarHoraFim(atExistente?.horaFim || agoraHhMm);
    setFinalizarLiberado(true);
    setFinalizarCodigoContinuacao('HMC 9118');
    setFinalizarBuscaOutroAg('');
    setFinalizarComplemento('');
    setFinalizarSintoma(atExistente?.sintoma || parada.sintomaInicial || '');
    setFinalizarCausa(atExistente?.causa || '');
    setFinalizarAcao(atExistente?.acaoExecutada || '');
    setFinalizarErro('');
  };

  // Confirmar Finalização do Atendimento e Enviar Relatório
  const handleConfirmarFinalizarAtendimento = () => {
    if (!finalizandoParada) return;

    if (!finalizarSintoma.trim() || !finalizarCausa.trim() || !finalizarAcao.trim()) {
      setFinalizarErro('Preencha Sintoma, Causa e Ação Executada para finalizar o atendimento e enviar o relatório.');
      return;
    }

    const nomeTec = tecnicoNome.trim() || finalizandoParada.emAtendimentoPor?.tecnicoPrincipal.nome || user.name || user.username;
    const matTec = tecnicoMatricula || finalizandoParada.emAtendimentoPor?.tecnicoPrincipal.matricula || undefined;
    const repId = activeReportId || `rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const segAtual = getSegmentoAtual(finalizandoParada);
    const horaFimEfetivaIso = resolverHorarioIso(finalizarHoraFim, finalizarHoraToqueIso, segAtual.inicio);

    // 1. Atualiza a Parada (fecha EXEC na hora fim e abre HOI 5936 LIBERADO PELA MANUT ou o código AG escolhido)
    const paradaFinalizada = finalizarAtendimentoParada({
      parada: finalizandoParada,
      horaFimIso: horaFimEfetivaIso,
      liberadoOperacao: finalizarLiberado,
      codigoContinuacaoSeNaoLiberado: finalizarLiberado ? undefined : finalizarCodigoContinuacao,
      complemento: finalizarComplemento.trim() || null,
      usuarioNome: nomeTec,
      usuarioMatricula: matTec,
      reportId: repId
    });

    if (onSaveParada) {
      onSaveParada(paradaFinalizada);
    }

    // 2. Atualiza a lista de atendimentos do relatório e envia o relatório normalmente
    const horaInicioDefault = finalizandoParada.emAtendimentoPor?.inicioAtendimento
      ? new Date(finalizandoParada.emAtendimentoPor.inicioAtendimento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
      : finalizarHoraFim;
    const horaRealDefault = new Date(finalizandoParada.inicioParada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

    const temAtendimentoDaTag = atendimentos.some(a => normalizarTag(a.equipamento) === normalizarTag(finalizandoParada.tag));
    const novosAtendimentos: Atendimento[] = temAtendimentoDaTag
      ? atendimentos.map(a =>
          normalizarTag(a.equipamento) === normalizarTag(finalizandoParada.tag)
            ? {
                ...a,
                sintoma: finalizarSintoma.trim(),
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
            horimetro: '',
            sintoma: finalizarSintoma.trim(),
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
    setActiveParadaId(null);

    // Envia o relatório imediatamente com os atendimentos atualizados
    handleSaveWithCustomAtendimentos('ENVIADO', novosAtendimentos, repId, nomeTec);
  };

  // Criar Nova Parada pelo Técnico (com trava anti-duplicidade)
  const handleConfirmarNovaParadaTecnico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaParadaTag.trim()) return;

    const normTag = normalizarTag(novaParadaTag);
    const existente = paradas.find(p => p.situacao === 'ABERTA' && normalizarTag(p.tag) === normTag);

    if (existente) {
      // Se já tiver Parada ABERTA, leva para o card dela sem duplicar
      setShowNovaParadaModal(false);
      setFiltroFrenteParada('TODAS');
      setFiltroTagParada('');
      setHighlightParadaId(existente.id);
      setTimeout(() => {
        const cardEl = document.getElementById(`card-parada-${existente.id}`);
        if (cardEl) cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
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
    setHighlightParadaId(nova.id);
    setTimeout(() => setHighlightParadaId(null), 4000);
  };

  // Add a new empty Atendimento Card
  const handleAddAtendimento = () => {
    const newAt: Atendimento = {
      id: `at-${Date.now()}-${Math.random()}`,
      equipamento: '',
      om: '',
      horimetro: '',
      sintoma: '',
      causa: '',
      acaoExecutada: '',
      horaInicio: '',
      horaFim: '',
      tipoManutencao: 'CORRETIVA',
      horaRealParada: '',
      liberadoOperacao: false,
      atuantes: tecnicoNome || ''
    };
    setAtendimentos([...atendimentos, newAt]);
  };

  // Remove Atendimento Card
  const handleRemoveAtendimento = (id: string) => {
    setAtendimentos(atendimentos.filter(a => a.id !== id));
  };

  // Update specific Atendimento field
  const handleUpdateAtendimento = (id: string, field: keyof Atendimento, value: any) => {
    setAtendimentos(atendimentos.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Compress, resize, and convert uploaded image to a lightweight base64 for reliable storage
  const handleImageUpload = (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    filesArray.forEach((file) => {
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
                  const updatedList = [...(a.photoUrls || (a.photoUrl ? [a.photoUrl] : [])), base64Result];
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
            photoUrl: updatedList[0] || "",
            photoUrls: updatedList
          };
        }
        return a;
      })
    );
  };

  // Add empty Pendência Card
  const handleAddPendencia = () => {
    const newPend: Pendencia = {
      id: `pend-${Date.now()}-${Math.random()}`,
      equipamento: '',
      descricao: ''
    };
    setPendencias([...pendencias, newPend]);
  };

  // Remove Pendência Card
  const handleRemovePendencia = (id: string) => {
    setPendencias(pendencias.filter(p => p.id !== id));
  };

  // Update specific Pendência field
  const handleUpdatePendencia = (id: string, field: keyof Pendencia, value: any) => {
    setPendencias(pendencias.map(p => p.id === id ? { ...p, [field]: value } : p));
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

    const tecNomeFinal = (forcedTecnicoNome || tecnicoNome).trim();

    const sanitizedAtendimentos = listaAtendimentos.map((at) => ({
      ...at,
      tipoManutencao: at.tipoManutencao || 'CORRETIVA',
      atuantes: at.atuantes || tecNomeFinal || ''
    }));

    const auxNome = extraIntegrantes.filter(m => m.papel === 'Auxiliar').map(m => m.nome).join(', ') || auxiliar;
    const motNome = extraIntegrantes.filter(m => m.papel === 'Motorista').map(m => m.nome).join(', ') || motorista;

    const reportData: Report = {
      id: forcedReportId || activeReportId || `rep-${Date.now()}`,
      dateStart,
      dateEnd,
      team,
      shift,
      frente,
      tecnicoNome: tecNomeFinal,
      tecnicoFuncao,
      tecnicoMatricula,
      tecnicoGrupo,
      eletricista: tecnicoFuncao === 'Eletricista' ? tecNomeFinal : (eletricista || ''),
      mecanico: tecnicoFuncao === 'Mecânico' ? tecNomeFinal : (mecanico || ''),
      auxiliar: auxNome,
      motorista: motNome,
      monitor: tecnicoFuncao === 'Monitor' ? tecNomeFinal : monitor,
      equipeDetalhada: extraIntegrantes.map(m => ({
        nome: m.nome,
        matricula: m.matricula,
        funcao: m.funcao,
        papel: m.papel
      })),
      atendimentos: sanitizedAtendimentos,
      pendencias,
      observacoesGerais,
      status,
      mechanicUsername: user.username,
      createdAt: new Date().toISOString()
    };

    onSaveReport(reportData, false);

    if (status === 'ENVIADO') {
      setShowSubmitModal(true);
      handleResetForm();
    } else {
      setActiveReportId(reportData.id);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      setIsSaving(false);
      skipAutoSaveRef.current = false;
    }, 1500);
  };

  // Helper to submit or save as draft
  const handleSave = (status: 'RASCUNHO' | 'ENVIADO') => {
    handleSaveWithCustomAtendimentos(status, atendimentos);
  };

  // Filter My reports (made by this operator username)
  const myReports = reports.filter(r => r.mechanicUsername === user.username);

  // Atendimento atual no formulário correspondente à parada sendo finalizada (para upload de fotos no modal)
  const atendimentoDaParadaFinalizando = useMemo(() => {
    if (!finalizandoParada) return null;
    return atendimentos.find(a => normalizarTag(a.equipamento) === normalizarTag(finalizandoParada.tag)) || null;
  }, [finalizandoParada, atendimentos]);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 select-none">
      
      {/* Header - Compact and aesthetic */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-lg font-black text-emerald-950 uppercase tracking-tight">
            RELATÓRIO DE MANUTENÇÃO
          </h2>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-0.5">
            U&M MINERAÇÃO • PERFIL CONTROLE / TÉCNICO
          </p>
        </div>
        {isOffline && (
          <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase tracking-wider">
            Modo Offline Ativo (Horários Preservados)
          </span>
        )}
      </div>

      {activeTab === 'history' ? (
        // HISTORY VIEW LIST
        <div className="space-y-4 pb-48">
          <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider mb-2">
            Meus Relatórios de Manutenção U&M
          </h3>
          
          {myReports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-150 p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-semibold uppercase">Nenhum relatório encontrado</p>
              <button
                onClick={() => setActiveTab('form')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" /> COMEÇAR NOVO
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
      ) : (
        // FORM VIEWER & WRITER
        <div className="space-y-6 pb-48">

          {/* =====================================================================
              0 - SEÇÃO: PARADAS AGUARDANDO ATENDIMENTO (ANTES DO FORMULÁRIO)
              ===================================================================== */}
          <div className="bg-white rounded-2xl border-2 border-[#19502F]/25 shadow-sm overflow-hidden">
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
                  Assuma uma parada já aberta pelo Admin ou abra uma nova parada caso o equipamento não esteja na lista.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNovaParadaHoraReal(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
                  setShowNovaParadaModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>ABRIR NOVA PARADA</span>
              </button>
            </div>

            {/* BARRA DE FILTROS: FRENTE (EH, CR, PF, INFRA) E BUSCA POR TAG */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filtro por Frente */}
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

              {/* Busca por TAG */}
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* LISTA DE CARDS DAS PARADAS ABERTAS */}
            <div className="p-4">
              {paradasAbertasFiltradas.length === 0 ? (
                <div className="text-center py-8 bg-gray-50/60 rounded-2xl border border-dashed border-gray-250 p-6">
                  <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-extrabold text-gray-700 uppercase">
                    Nenhuma parada aberta encontrada para este filtro
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Se o equipamento parou em campo e ainda não consta na lista, clique em "ABRIR NOVA PARADA".
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
                    const isActiveCard = activeParada?.id === parada.id;

                    // Verifica se o técnico selecionado já faz parte da equipe desta parada
                    const tecAtualNome = tecnicoNome.trim().toLowerCase();
                    const tecJaNaParada =
                      emAtendimento &&
                      tecAtualNome !== '' &&
                      (parada.emAtendimentoPor?.tecnicoPrincipal.nome.toLowerCase() === tecAtualNome ||
                        (parada.emAtendimentoPor?.membrosEquipe || []).some(m => m.nome.toLowerCase() === tecAtualNome));

                    return (
                      <div
                        id={`card-parada-${parada.id}`}
                        key={parada.id}
                        className={`rounded-2xl border-2 p-4 transition-all flex flex-col justify-between bg-white shadow-xs ${
                          isHighlighted
                            ? 'border-amber-500 ring-4 ring-amber-400/30 animate-pulse'
                            : isActiveCard || tecJaNaParada
                            ? 'border-blue-600 bg-blue-50/10'
                            : 'border-gray-200 hover:border-[#19502F]'
                        }`}
                      >
                        <div>
                          {/* Topo do Card: TAG, Frente e Tempo Parado */}
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
                                <strong className="text-gray-900 font-mono">{formatarHoraPtBr(parada.inicioParada)}</strong>
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-black text-xs font-mono">
                                <Clock className="w-3.5 h-3.5" />
                                Parado há {formatarParadoHaXhYm(durTotalMin)}
                              </span>
                            </div>
                          </div>

                          {/* Status Atual (Código e Nome) */}
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

                            {parada.sintomaInicial && (
                              <p className="text-[11px] mt-1.5 font-medium opacity-90" style={{ color: respStyle.texto }}>
                                Sintoma: <strong>{parada.sintomaInicial}</strong>
                              </p>
                            )}

                            {/* Indicação de quem está em atendimento */}
                            {emAtendimento && parada.emAtendimentoPor && (
                              <div className="mt-2 pt-2 border-t border-black/10 text-[11px] font-bold flex flex-col gap-0.5" style={{ color: respStyle.texto }}>
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                                    Em atendimento por <strong>{parada.emAtendimentoPor.tecnicoPrincipal.nome}</strong> desde{' '}
                                    {formatarHoraPtBr(parada.emAtendimentoPor.inicioAtendimento)}
                                  </span>
                                  {estaPausado && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase">
                                      PAUSADO
                                    </span>
                                  )}
                                </div>
                                {parada.emAtendimentoPor.membrosEquipe && parada.emAtendimentoPor.membrosEquipe.length > 0 && (
                                  <span className="text-[10px] opacity-85">
                                    Equipe: {parada.emAtendimentoPor.membrosEquipe.map(m => m.nome).join(', ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Resumo somente-leitura dos períodos anteriores (Regra 6: técnico não edita/apaga períodos anteriores) */}
                          <div className="mb-3 bg-gray-50 rounded-xl p-2.5 border border-gray-150">
                            <span className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                              Histórico da Parada (Somente Leitura • {parada.segmentos.length} período(s))
                            </span>
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {parada.segmentos.map((s, sIdx) => {
                                const iniStr = formatarHoraPtBr(s.inicio);
                                const fimStr = s.fim ? formatarHoraPtBr(s.fim) : 'agora';
                                const durSeg = Math.max(
                                  0,
                                  Math.round(((s.fim ? new Date(s.fim).getTime() : liveNow) - new Date(s.inicio).getTime()) / 60000)
                                );
                                return (
                                  <div key={s.id || sIdx} className="text-[10px] font-mono text-gray-600 flex items-center justify-between">
                                    <span className="truncate">
                                      <strong>{iniStr}–{fimStr}</strong> {s.codigo} {s.nome}
                                    </span>
                                    <span className="text-gray-400 shrink-0 ml-2">({durSeg} min)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* BOTÕES DE AÇÃO DO CARD */}
                        <div className="pt-2 border-t border-gray-150 flex flex-col gap-2">
                          {!emAtendimento ? (
                            <button
                              type="button"
                              onClick={() => handleAbrirModalIniciar(parada)}
                              className="w-full py-3 px-4 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-current" />
                              <span>INICIAR ATENDIMENTO</span>
                            </button>
                          ) : (
                            <div className="space-y-2">
                              {/* Controles de PAUSAR / RETOMAR e FINALIZAR para a parada em atendimento */}
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
                                  className="py-2.5 px-3 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>FINALIZAR</span>
                                </button>
                              </div>

                              {/* Se um segundo técnico quiser assumir/entrar na mesma parada, entra como membro da equipe sem duplicar */}
                              {!tecJaNaParada && (
                                <button
                                  type="button"
                                  onClick={() => handleAbrirModalIniciar(parada)}
                                  className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 border border-gray-300 transition cursor-pointer"
                                >
                                  <Users className="w-3.5 h-3.5 text-[#19502F]" />
                                  <span>Iniciar / Entrar como 2º Técnico na Equipe</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 1 - DADOS DO TURNO E IDENTIFICAÇÃO DO TÉCNICO (UNIFICADO) */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
            <div className="bg-emerald-900 px-5 py-4 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                1 - CABEÇALHO DO TURNO E IDENTIFICAÇÃO DO TÉCNICO
              </h3>
              {tecnicoNome && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-emerald-800 text-emerald-100 border border-emerald-700">
                  {tecnicoFuncao}: {tecnicoNome}
                </span>
              )}
            </div>
            
            <div className="p-5 space-y-5">
              {/* Seleção do Técnico Responsável (Aba de Rolagem) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-800" />
                    Técnico Responsável *
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold lowercase">aba de rolagem</span>
                </label>
                
                <TechnicianScrollSelector
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

              {/* Opção para adicionar outros membros da equipe */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowExtraEquipe(!showExtraEquipe)}
                  className="text-[11px] font-bold text-gray-500 hover:text-emerald-800 flex items-center gap-1 transition cursor-pointer"
                >
                  <span>{showExtraEquipe ? '▼ Ocultar membros adicionais da equipe' : '▶ Adicionar outros membros da equipe (opcional)'}</span>
                </button>

                {showExtraEquipe && (
                  <div className="mt-2.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                        Integrantes Adicionais ({extraIntegrantes.length})
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
                              papel: 'Auxiliar'
                            }
                          ]);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold bg-[#19502F] text-white rounded-lg hover:bg-[#143f25] transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Integrante
                      </button>
                    </div>

                    {extraIntegrantes.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-1">
                        Nenhum integrante adicional adicionado. Clique no botão acima para adicionar da base de técnicos cadastrados.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {extraIntegrantes.map((membro, mIdx) => (
                          <div key={membro.id} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                Integrante #{mIdx + 1}
                              </span>
                              <div className="flex items-center gap-2">
                                <select
                                  value={membro.papel}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setExtraIntegrantes(extraIntegrantes.map(m => m.id === membro.id ? { ...m, papel: val } : m));
                                  }}
                                  className="text-xs font-bold border border-gray-250 rounded-lg px-2 py-1 bg-gray-50 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#19502F]"
                                >
                                  <option value="Auxiliar">Papel: Auxiliar</option>
                                  <option value="Mecânico Apoio">Papel: Mecânico Apoio</option>
                                  <option value="Eletricista Apoio">Papel: Eletricista Apoio</option>
                                  <option value="Soldador">Papel: Soldador</option>
                                  <option value="Motorista">Papel: Motorista</option>
                                  <option value="Outro">Papel: Outro</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setExtraIntegrantes(extraIntegrantes.filter(m => m.id !== membro.id))}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                  title="Remover integrante"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <TechnicianScrollSelector
                              tecnicos={tecnicos}
                              selectedNome={membro.nome}
                              selectedFuncao={membro.funcao}
                              selectedMatricula={membro.matricula}
                              isAdmin={user.role === 'admin'}
                              label="SELECIONAR INTEGRANTE DA BASE"
                              placeholder="Pesquisar integrante cadastrado..."
                              onChange={(nome, funcao, matricula) => {
                                setExtraIntegrantes(extraIntegrantes.map(m => m.id === membro.id ? {
                                  ...m,
                                  nome,
                                  funcao,
                                  matricula: matricula || ''
                                } : m));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Linha Divisória */}
              <div className="border-t border-gray-150 pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={dateStart}
                      onChange={(e) => setDateStart(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-250 rounded-xl bg-gray-55 focus:bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={dateEnd}
                      onChange={(e) => setDateEnd(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-250 rounded-xl bg-gray-55 focus:bg-white text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Turma options */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Turma
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {['A', 'B', 'C', 'D', 'ADM', '1/3', '2/3'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTeam(opt)}
                        className={`py-3 text-xs font-extrabold rounded-xl text-center border transition-all cursor-pointer ${
                          team === opt
                            ? 'bg-emerald-900 border-transparent text-white shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horário Shift options */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Horário
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {['18:00 às 06:00', '06:00 às 18:00', '07:00 às 17:00 (ADM)'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setShift(opt)}
                        className={`py-3.5 px-2 text-xs font-extrabold rounded-xl text-center border transition-all cursor-pointer ${
                          shift === opt
                            ? 'bg-emerald-900 border-transparent text-white shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frente options */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                    Frente
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['EH', 'CR', 'PF', 'INFRA'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFrente(opt)}
                        className={`py-3.5 text-xs font-extrabold rounded-xl text-center border transition-all cursor-pointer ${
                          frente === opt
                            ? 'bg-emerald-900 border-transparent text-white shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 2 - EQUIPAMENTOS ATENDIDOS */}
          <div id="secao-equipamentos-atendidos" className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
            <div className="bg-emerald-900 px-5 py-4 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" />
                2 - EQUIPAMENTOS ATENDIDOS
              </h3>
              
              <span className="bg-emerald-950 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                Qtd: {atendimentos.length}
              </span>
            </div>

            <div className="p-5 space-y-6">
              {atendimentos.map((at, idx) => {
                // Verifica se este atendimento está ligado a uma Parada ABERTA em andamento
                const paradaVinculada = paradas.find(
                  p => p.situacao === 'ABERTA' && normalizarTag(p.tag) === normalizarTag(at.equipamento)
                );
                const paradaEmExec = paradaVinculada && !!paradaVinculada.emAtendimentoPor;
                const paradaPausada = paradaVinculada && !!paradaVinculada.emAtendimentoPor?.pausadoEm;

                return (
                  <div key={at.id} className="border border-gray-200 bg-gray-50/40 rounded-2xl p-4 relative space-y-4">
                    {/* Remove action */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAtendimento(at.id)}
                      className="absolute top-4 right-4 bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl transition cursor-pointer"
                      title="Remover este equipamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-between border-b border-gray-150 pb-2 mb-2 pr-12 flex-wrap gap-2">
                      <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest">
                        Equipamento #{idx + 1} {at.equipamento ? `• ${normalizarTag(at.equipamento)}` : ''}
                      </h4>
                      {paradaVinculada && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                          Ligado à Parada #{paradaVinculada.tag} ({getSegmentoAtual(paradaVinculada).codigo})
                        </span>
                      )}
                    </div>

                    {/* Barra rápida de PAUSAR / RETOMAR / FINALIZAR dentro do próprio formulário quando vinculado */}
                    {paradaVinculada && paradaEmExec && (
                      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="text-xs text-blue-950">
                          <span className="font-black uppercase block">
                            Controle de Tempo da Parada ({paradaVinculada.tag})
                          </span>
                          <span className="text-[11px] text-blue-800">
                            Status atual: <strong>{getSegmentoAtual(paradaVinculada).codigo} – {getSegmentoAtual(paradaVinculada).nome}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!paradaPausada ? (
                            <button
                              type="button"
                              onClick={() => handleAbrirModalPausar(paradaVinculada)}
                              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Pause className="w-3.5 h-3.5 fill-current" /> PAUSAR
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAbrirModalRetomar(paradaVinculada)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> RETOMAR
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleAbrirModalFinalizar(paradaVinculada)}
                            className="px-3 py-2 bg-[#19502F] hover:bg-emerald-950 text-white font-black text-xs uppercase rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> FINALIZAR
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Equipamento */}
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Equipamento (TAG) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: EH-4050"
                          value={at.equipamento}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'equipamento', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all font-mono"
                        />
                        
                        {/* Suggest preset buttons */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {presetEquipments.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleUpdateAtendimento(at.id, 'equipamento', tag)}
                              className="bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 transition cursor-pointer"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>

                        {/* HORA REAL DA PARADA */}
                        <div className="mt-2.5 pt-2 border-t border-gray-200">
                          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Hora Real da Parada
                          </label>
                          <input
                            type="time"
                            value={at.horaRealParada || ''}
                            onChange={(e) => handleUpdateAtendimento(at.id, 'horaRealParada', e.target.value)}
                            placeholder="--:--"
                            className="block w-full px-2.5 py-1.5 border border-gray-250 bg-white rounded-lg text-gray-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#19502F] font-mono"
                          />
                          <span className="text-[9px] text-gray-500 block mt-0.5 leading-tight">
                            Preenchido da Parada ou se parou antes
                          </span>
                        </div>
                      </div>

                      {/* OM e Tipo de Manutenção */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Número OM *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 4796854"
                          value={at.om}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'om', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all"
                        />

                        {/* Tipo de Manutenção: 3 Botões de Opção Rápida */}
                        <div className="mt-2.5 pt-2 border-t border-gray-200">
                          <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                            Tipo de Manutenção
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            {(['CORRETIVA', 'PREVENTIVA', 'PROGRAMADA'] as const).map((tipo) => {
                              const isSelected = (at.tipoManutencao || 'CORRETIVA') === tipo;
                              return (
                                <button
                                  key={tipo}
                                  type="button"
                                  onClick={() => handleUpdateAtendimento(at.id, 'tipoManutencao', tipo)}
                                  className={`py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider text-center transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#19502F] text-white shadow-xs'
                                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  {tipo === 'PROGRAMADA' ? 'PROG.' : tipo}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Horímetro */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Horímetro *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 82341.5"
                          value={at.horimetro}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'horimetro', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Sintoma */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Sintoma *
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ex: Vazamento hidráulico ou quebra de correia..."
                          value={at.sintoma}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'sintoma', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all"
                        />
                      </div>

                      {/* Causa */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Causa *
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ex: Mangueira da bomba P2 danificada ou fadiga..."
                          value={at.causa}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'causa', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all"
                        />
                      </div>

                      {/* Ação Executada */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Ação Executada *
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Fale detalhadamente sobre a manutenção realizada..."
                          value={at.acaoExecutada}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'acaoExecutada', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Hora Início */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Hora Início
                        </label>
                        <input
                          type="time"
                          placeholder="Ex: 11:10"
                          value={at.horaInicio}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'horaInicio', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all font-mono"
                        />
                      </div>

                      {/* Hora Fim */}
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Hora Fim
                        </label>
                        <input
                          type="time"
                          placeholder="Ex: 12:40"
                          value={at.horaFim}
                          onChange={(e) => handleUpdateAtendimento(at.id, 'horaFim', e.target.value)}
                          className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#19502F] transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Previsão de Liberação / Disponibilidade */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <span>⏰ Previsão de Liberação (Opcional - Mostrará no Painel)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={at.previsaoLiberacao || ''}
                        onChange={(e) => handleUpdateAtendimento(at.id, 'previsaoLiberacao', e.target.value)}
                        className="block w-full px-3 py-2.5 border border-amber-200 bg-amber-50/15 rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all font-mono"
                      />
                    </div>

                    {/* Botão de Liberação para Operação */}
                    <div className="p-3 bg-white border border-gray-250 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className={`w-5 h-5 ${at.liberadoOperacao ? 'text-[#19502F]' : 'text-gray-300'}`} />
                        <div>
                          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                            Equipamento Liberado para Operação (HOI 5936)
                          </span>
                          <span className="text-[10px] text-gray-500">
                            Ao finalizar, abre HOI 5936 LIBERADO PELA MANUT (Produção).
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateAtendimento(at.id, 'liberadoOperacao', !at.liberadoOperacao)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                          at.liberadoOperacao
                            ? 'bg-[#19502F] text-white shadow-xs'
                            : 'bg-gray-100 border border-gray-300 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {at.liberadoOperacao ? '✓ LIBERADO' : 'EM ANDAMENTO'}
                      </button>
                    </div>

                    {/* Camera / Photo Attachment */}
                    <div className="pt-2 border-t border-gray-200">
                      <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Evidências Fotográficas (Múltiplas Fotos Permitidas):
                      </span>
                      
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <label className="inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-emerald-50 border-2 border-dashed border-emerald-800 text-emerald-900 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-100 transition cursor-pointer shadow-xs">
                            <span>📸 TIRAR FOTO (CÂMERA)</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={(e) => {
                                handleImageUpload(at.id, e.target.files);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>

                          <label className="inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-gray-50 border-2 border-dashed border-gray-300 text-gray-700 rounded-xl font-extrabold text-xs uppercase tracking-wider hover:bg-gray-100 transition cursor-pointer shadow-xs">
                            <span>🖼️ CARREGAR DA GALERIA</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                handleImageUpload(at.id, e.target.files);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-2.5 mt-1">
                          {((at.photoUrls && at.photoUrls.length > 0) ? at.photoUrls : (at.photoUrl ? [at.photoUrl] : [])).map((pic, picIdx) => (
                            <div key={picIdx} className="flex flex-col items-center gap-1.5 p-1.5 bg-gray-50 border border-gray-200 rounded-2xl relative group">
                              <div 
                                onClick={() => setZoomedImage(pic || null)}
                                className="relative border border-gray-150 rounded-xl overflow-hidden shadow-xs bg-white cursor-zoom-in max-w-[124px] aspect-square flex items-center justify-center"
                              >
                                <img 
                                  src={pic} 
                                  alt={`Evidência fotográfica ${picIdx + 1}`} 
                                  className="h-24 w-24 object-cover group-hover:scale-105 transition duration-200"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(at.id, picIdx)}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-800 uppercase tracking-wider block text-center w-full py-0.5 cursor-pointer hover:bg-rose-50 rounded-lg transition"
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddAtendimento}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border-2 border-dashed border-emerald-800/45 text-emerald-900 font-extrabold text-xs tracking-widest uppercase rounded-2xl hover:bg-emerald-50 active:bg-emerald-100/60 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                ➕ ADICIONAR EQUIPAMENTO
              </button>
            </div>
          </div>

          {/* 3 - PENDÊNCIAS */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
            <div className="bg-emerald-900 px-5 py-4 text-white flex justify-between items-center">
              <h3 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-300" />
                3 - PENDÊNCIAS E ANOMALIAS
              </h3>
              
              <span className="bg-emerald-950 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                Qtd: {pendencias.length}
              </span>
            </div>

            <div className="p-5 space-y-6">
              {pendencias.map((pend, idx) => (
                <div key={pend.id} className="border border-gray-200 bg-amber-50/10 rounded-2xl p-4 relative space-y-4">
                  <button
                    type="button"
                    onClick={() => handleRemovePendencia(pend.id)}
                    className="absolute top-4 right-4 bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl transition cursor-pointer"
                    title="Remover esta pendência"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-widest border-b border-gray-150 pb-2 mb-2 pr-10">
                    Pendência #{idx + 1}
                  </h4>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Equipamento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: EH-5003"
                      value={pend.equipamento}
                      onChange={(e) => handleUpdatePendencia(pend.id, 'equipamento', e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                      Descrição da Pendência *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Baixando a lança, foi invertido as válvulas porém não performou."
                      value={pend.descricao}
                      onChange={(e) => handleUpdatePendencia(pend.id, 'descricao', e.target.value)}
                      className="block w-full px-3 py-2.5 border border-gray-250 bg-white rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <span>⏰ Previsão de Liberação (Opcional - Mostrará no Painel de Controle)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={pend.previsaoLiberacao || ''}
                      onChange={(e) => handleUpdatePendencia(pend.id, 'previsaoLiberacao', e.target.value)}
                      className="block w-full px-3 py-2.5 border border-amber-200 bg-amber-50/15 rounded-xl text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-600 transition-all font-mono"
                    />
                  </div>

                </div>
              ))}

              <button
                type="button"
                onClick={handleAddPendencia}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border-2 border-dashed border-amber-600/45 text-amber-800 font-extrabold text-xs tracking-widest uppercase rounded-2xl hover:bg-amber-50/50 active:bg-amber-100/30 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                ➕ ADICIONAR PENDÊNCIA
              </button>
            </div>
          </div>

          {/* 4 - OBSERVAÇÕES */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
            <div className="bg-emerald-900 px-5 py-4 text-white">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                4 - OBSERVAÇÕES FINAIS
              </h3>
            </div>
            
            <div className="p-5">
              <textarea
                rows={4}
                placeholder="Insira detalhes adicionais ou considerações gerais que julgar necessárias..."
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-250 bg-gray-50 focus:bg-white rounded-xl text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800 transition-all"
              />
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          MODAL 1: INICIAR ATENDIMENTO DA PARADA (ITEM 2)
          ========================================================================= */}
      {iniciandoParada && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#19502F] p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 fill-current" />
                  Iniciar Atendimento • {iniciandoParada.tag} ({iniciandoParada.frente})
                </h3>
                <p className="text-[11px] text-emerald-100 mt-0.5">
                  Parada aberta às {formatarHoraPtBr(iniciandoParada.inicioParada)} por {iniciandoParada.criadoPor}
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

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {iniciandoParada.emAtendimentoPor && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
                  <strong>Nota:</strong> Esta parada já está em atendimento por{' '}
                  <strong>{iniciandoParada.emAtendimentoPor.tecnicoPrincipal.nome}</strong> desde{' '}
                  {formatarHoraPtBr(iniciandoParada.emAtendimentoPor.inicioAtendimento)}. Ao confirmar, você entrará automaticamente como{' '}
                  <strong>membro da equipe da mesma parada</strong>, sem duplicar!
                </div>
              )}

              {iniciandoErroTecnico && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{iniciandoErroTecnico}</span>
                </div>
              )}

              {/* Seleção Obrigatória do Técnico Responsável */}
              <div>
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1.5">
                  Técnico Responsável (Obrigatório) *
                </label>
                <TechnicianScrollSelector
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

              {/* Membros adicionais da equipe (opcional) */}
              <div className="border-t border-gray-150 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                    Outros Membros da Equipe (Opcional)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExtraEquipe(true);
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
                      <div key={membro.id} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Membro da Equipe</span>
                          <button
                            type="button"
                            onClick={() => setExtraIntegrantes(extraIntegrantes.filter(m => m.id !== membro.id))}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                        <TechnicianScrollSelector
                          tecnicos={tecnicos}
                          selectedNome={membro.nome}
                          selectedFuncao={membro.funcao}
                          selectedMatricula={membro.matricula}
                          isAdmin={user.role === 'admin'}
                          label="SELECIONAR MEMBRO"
                          onChange={(nome, funcao, matricula) => {
                            setExtraIntegrantes(
                              extraIntegrantes.map(m =>
                                m.id === membro.id ? { ...m, nome, funcao, matricula: matricula || '' } : m
                              )
                            );
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tipo de Manutenção -> Define HMC 9000 / MPS 7000 / MPNS 8000 */}
              <div className="border-t border-gray-150 pt-3">
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1.5">
                  Tipo de Manutenção (Código de Execução)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { tipo: 'CORRETIVA' as const, cod: 'HMC 9000', desc: 'EXEC MANUT' },
                    { tipo: 'PREVENTIVA' as const, cod: 'MPS 7000', desc: 'EXEC MANUT' },
                    { tipo: 'PROGRAMADA' as const, cod: 'MPNS 8000', desc: 'EXEC MANUT' }
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
                      <span className="block text-[10px] font-mono opacity-85 mt-0.5">{item.cod}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Hora do Toque / Início do Atendimento */}
              <div className="border-t border-gray-150 pt-3 flex items-center justify-between gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Hora de Início do Atendimento
                  </label>
                  <span className="text-[10px] text-gray-500">
                    Fecha o período anterior e abre EXEC MANUT neste horário
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
                  <span>Confirmar e Abrir Formulário</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: PAUSAR ATENDIMENTO (ITEM 3)
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

                  {/* Botão OUTRO (busca na base de códigos Vale) */}
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
                    <span className="text-[10px] font-mono font-bold text-[#19502F]">{pausaCodigo}</span>
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
                    {CODIGOS_VALE_FLAT.filter(c => {
                      if (!pausaBuscaOutro.trim()) return c.sit === 'AG';
                      const q = removerAcentos(pausaBuscaOutro);
                      return removerAcentos(c.rotuloCompleto).includes(q) || removerAcentos(c.quem).includes(q);
                    }).map(c => (
                      <button
                        key={c.codigo}
                        type="button"
                        onClick={() => setPausaCodigo(c.codigo)}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-emerald-50 cursor-pointer ${
                          pausaCodigo === c.codigo ? 'bg-emerald-100 font-bold text-emerald-950' : 'text-gray-700'
                        }`}
                      >
                        <span><strong>{c.codigo}</strong> – {c.nome}</span>
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
          MODAL 3: RETOMAR ATENDIMENTO (ITEM 3)
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
                  Fecha o período AG atual e reabre {retomandoParada.emAtendimentoPor?.codigoExec || 'HMC 9000'} EXEC MANUT
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
          MODAL 4: FINALIZAR ATENDIMENTO (ITEM 4)
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
                  A Parada continuará ABERTA para o Admin encerrar quando o operador assumir
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

              {/* Hora Fim (padrão: agora) */}
              <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <div>
                  <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                    Hora Fim do Atendimento *
                  </label>
                  <span className="text-[10px] text-gray-500">
                    Fecha o segmento EXEC atual neste horário
                  </span>
                </div>
                <input
                  type="time"
                  value={finalizarHoraFim}
                  onChange={(e) => setFinalizarHoraFim(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-sm font-black font-mono text-gray-900 focus:ring-2 focus:ring-[#19502F]"
                  required
                />
              </div>

              {/* Sintoma, Causa e Ação Executada */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                    Sintoma *
                  </label>
                  <textarea
                    rows={2}
                    value={finalizarSintoma}
                    onChange={(e) => {
                      setFinalizarSintoma(e.target.value);
                      setFinalizarErro('');
                    }}
                    placeholder="Descreva o sintoma da falha..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#19502F]"
                  />
                </div>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#19502F]"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#19502F]"
                  />
                </div>
              </div>

              {/* Evidências Fotográficas (ligadas ao atendimento do equipamento) */}
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

              {/* Condição de Saída: Liberado (HOI 5936) vs Não Liberado - Continua Parado */}
              <div className="pt-2 border-t border-gray-200 space-y-3">
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider">
                  Situação do Equipamento ao Finalizar
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
                      ✓ Liberado p/ Manut (HOI 5936)
                    </span>
                    <span className="text-[10px] block mt-0.5 opacity-80">
                      Abre HOI 5936 LIBERADO PELA MANUT (Resp: PRODUÇÃO)
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
                      ⚠️ Não liberado – continua parado
                    </span>
                    <span className="text-[10px] block mt-0.5 opacity-80">
                      Escolher código AG (continua aberta p/ próximo turno)
                    </span>
                  </button>
                </div>

                {!finalizarLiberado && (
                  <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2.5">
                    <label className="block text-[11px] font-extrabold text-amber-950 uppercase">
                      Código AG de Continuidade da Parada *
                    </label>
                    <select
                      value={finalizarCodigoContinuacao}
                      onChange={(e) => setFinalizarCodigoContinuacao(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-gray-900"
                    >
                      {MOTIVOS_PAUSA_RAPIDA.map(m => (
                        <option key={m.codigo} value={m.codigo}>
                          {m.rotulo} ({m.resp})
                        </option>
                      ))}
                      {CODIGOS_VALE_FLAT.filter(c => c.sit === 'AG' && !MOTIVOS_PAUSA_RAPIDA.some(m => m.codigo === c.codigo)).map(c => (
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
          MODAL 5: ABRIR NOVA PARADA PELO TÉCNICO (ITEM 5)
          ========================================================================= */}
      {showNovaParadaModal && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-[#19502F] p-5 text-white flex items-center justify-between">
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

            <form onSubmit={handleConfirmarNovaParadaTecnico} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-1">
                  TAG do Equipamento *
                </label>
                <input
                  type="text"
                  value={novaParadaTag}
                  onChange={(e) => {
                    setNovaParadaTag(e.target.value);
                    setNovaParadaFrente(derivarFrenteDaTag(e.target.value));
                  }}
                  placeholder="Ex: EH-4050, CR-3116, PF-1031"
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

              {/* Aviso se a TAG já tiver Parada ABERTA (Regra 5) */}
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
                      setFiltroFrenteParada('TODAS');
                      setFiltroTagParada('');
                      setHighlightParadaId(paradaDuplicadaExistente.id);
                      setTimeout(() => {
                        const el = document.getElementById(`card-parada-${paradaDuplicadaExistente.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 150);
                      setTimeout(() => setHighlightParadaId(null), 5000);
                    }}
                    className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Ir para o Card desta Parada</span>
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
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase mb-1">
                  Sintoma Inicial / Observação (Opcional)
                </label>
                <input
                  type="text"
                  value={novaParadaSintoma}
                  onChange={(e) => setNovaParadaSintoma(e.target.value)}
                  placeholder="Ex: Falha hidráulica, alarme no painel..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNovaParadaModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!!paradaDuplicadaExistente}
                  className="px-5 py-2.5 bg-[#19502F] hover:bg-emerald-950 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  Criar Parada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR ADDED PHOTOS */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-4 md:p-6 cursor-zoom-out select-none animate-in fade-in duration-200"
        >
          <button 
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white/85 hover:text-white bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all active:scale-90"
            aria-label="Fechar zoom"
          >
            ✕
          </button>

          <div className="relative max-w-[95vw] max-h-[85vh] w-full flex flex-col justify-center items-center gap-4">
            <img 
              src={zoomedImage} 
              alt="Evidência fotográfica ampliada" 
              className="max-w-full max-h-[78vh] md:max-h-[82vh] object-contain rounded-xl md:rounded-2xl shadow-2xl border border-white/5 animate-in zoom-in-95 duration-200"
              referrerPolicy="no-referrer"
            />
            <div className="text-white/90 text-[10px] font-black uppercase tracking-widest bg-emerald-950/80 backdrop-blur-md border border-emerald-500/20 px-5 py-2.5 rounded-full shadow-lg text-center">
              Clique em qualquer lugar para fechar o Zoom ✕
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS SUBMISSION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-250">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 animate-bounce" />
            </div>
            
            <h3 className="text-lg font-black text-emerald-950 uppercase tracking-tight mb-2">
              Relatório Enviado!
            </h3>
            
            <p className="text-xs text-gray-600 font-semibold leading-relaxed mb-6">
              Seu relatório de manutenção foi finalizado e vinculado à Parada do equipamento no painel do supervisor!
            </p>
            
            <button
              type="button"
              onClick={() => {
                setShowSubmitModal(false);
                setActiveTab('history');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-3.5 bg-emerald-900 border border-transparent text-white font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-950 transition active:scale-95 cursor-pointer shadow-md"
            >
              OK, Entendido!
            </button>
          </div>
        </div>
      )}

      {/* GLOBAL FOOTER ACTION & NAVIGATION BAR */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-150 py-1.5 pb-3 z-40 px-3 shadow-xl select-none">
        <div className="max-w-4xl mx-auto flex flex-col gap-1.5">
          {activeTab === 'form' && (
            <div className="flex gap-2.5 h-11 mb-0.5">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSave('RASCUNHO')}
                className="flex-1 bg-white border border-emerald-800 text-emerald-900 hover:bg-emerald-50 rounded-xl text-[10px] font-black tracking-normal uppercase flex items-center justify-center gap-1 cursor-pointer transition duration-150 active:scale-95 shadow-3xs disabled:opacity-50"
              >
                <ClipboardList className="w-3 h-3 text-emerald-900" />
                <span>{isSaving ? 'SALVANDO...' : 'SALVAR EM RASCUNHO'}</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (activeParada) {
                    handleAbrirModalFinalizar(activeParada);
                  } else {
                    handleSave('ENVIADO');
                  }
                }}
                className="flex-1 bg-emerald-900 text-white hover:bg-emerald-950 rounded-xl text-[10px] font-black tracking-normal uppercase flex items-center justify-center gap-1 cursor-pointer transition duration-150 active:scale-105 shadow-sm shadow-emerald-900/10 disabled:opacity-50"
              >
                <Send className="w-3 h-3 text-emerald-100" />
                <span>{isSaving ? 'ENVIANDO...' : 'FINALIZAR E ENVIAR'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex-1 flex justify-start">
              <button
                type="button"
                onClick={() => setShowPreventivasModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-[9px] sm:text-[10px] tracking-wider uppercase rounded-xl transition duration-150 shadow-xs cursor-pointer select-none"
                title="Cadastrar futuras paradas para preventiva"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-105" />
                <span className="hidden xs:inline">🗓️ PREVENTIVAS</span>
                <span className="xs:hidden">🗓️ PREV</span>
              </button>
            </div>

            <div className="inline-flex bg-gray-100 border border-gray-250 p-0.5 rounded-full shadow-md items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer select-none ${
                  activeTab === 'history'
                    ? 'bg-emerald-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ClipboardList className="w-3 h-3" />
                <span>LISTA</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setActiveTab('form');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }}
                className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition duration-150 cursor-pointer select-none ${
                  activeTab === 'form'
                    ? 'bg-emerald-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <PlusCircle className="w-3 h-3" />
                <span>INSPECIONAR</span>
              </button>
            </div>

            <div className="flex-1 hidden md:flex justify-end text-[9px] text-gray-400 font-mono font-bold uppercase tracking-wider">
              Usuário: <strong className="text-gray-700 ml-1">{user.username}</strong>
            </div>
            <div className="flex-1 md:hidden"></div>
          </div>
        </div>
      </div>

      {/* HORIZONTE DE PARADA DOS EQUIPAMENTOS MODAL */}
      {showPreventivasModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden loader-entry">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-5 text-white relative">
              <button
                type="button"
                onClick={() => setShowPreventivasModal(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/35 p-1.5 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm uppercase font-black tracking-widest flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>Horizonte de Parada dos Equipamentos</span>
              </h3>
              <p className="text-[11px] text-amber-105 mt-1 uppercase font-semibold tracking-wider">
                Paradas preventivas programadas para acompanhamento em tempo real
              </p>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-200/55 space-y-4">
                <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <span>➕ NOVO AGENDAMENTO DE PREVENTIVA</span>
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-amber-900 uppercase tracking-wider mb-1">
                      Equipamento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CR-3112"
                      value={newEquip}
                      onChange={(e) => setNewEquip(e.target.value)}
                      className="block w-full px-3 py-2 bg-white border border-amber-200/95 rounded-xl text-gray-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-550 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-amber-900 uppercase tracking-wider mb-1">
                      Data da Parada *
                    </label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="block w-full px-3 py-2 bg-white border border-amber-200/95 rounded-xl text-gray-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-550 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRegisterPreventiva}
                  disabled={!newEquip.trim() || !newDate}
                  className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Parada Futura</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-[11px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-100 pb-2">
                  <span>🗓️ PARADAS PROGRAMADAS NO FIRESTORE</span>
                  <span className="bg-gray-100 text-gray-750 border border-gray-200 text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                    {preventivas.length}
                  </span>
                </h4>

                {preventivas.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 font-medium italic text-xs uppercase font-mono">
                    Nenhuma parada preventiva futura cadastrada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {preventivas.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-150 rounded-2xl font-mono hover:bg-gray-100/50 transition">
                        <div className="flex items-center gap-2">
                          <span className="w-2 rounded-full bg-amber-500"></span>
                          <span className="font-extrabold text-[#111]">{p.equipamento}</span>
                          <span className="text-gray-400 font-semibold">•</span>
                          <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px]">
                            {p.dataParada}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="hidden sm:inline text-[9px] text-gray-400 font-semibold uppercase">
                            Criado por: {p.usuario || 'controle'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeletePreventiva(p.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 p-2 rounded-xl transition cursor-pointer"
                            title="Remover programação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-100 text-center">
              <button
                type="button"
                onClick={() => setShowPreventivasModal(false)}
                className="w-full sm:w-auto px-6 py-2 bg-gray-200 hover:bg-gray-250 text-gray-700 font-bold text-xs uppercase rounded-xl transition cursor-pointer"
              >
                Fechar Painel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
