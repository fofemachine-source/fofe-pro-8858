import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Camera, Save, Send, AlertTriangle, 
  CheckCircle2, FileText, Calendar, Info, Clock, User as UserIcon, BookOpen, FileSpreadsheet, X,
  ClipboardList, PlusCircle, Play, Pause, RotateCcw, Wrench, Search, Users, Check, AlertCircle, ArrowRight
} from 'lucide-react';
import { Report, Atendimento, Pendencia, User, Preventiva, Tecnico, Parada } from '../types';
import { ReportCardAccordion } from './ReportCardAccordion';
import { getGreetingForTime } from '../lib/greetings';
import { TechnicianScrollSelector } from './TechnicianScrollSelector';
import { 
  getSegmentoAtual, 
  calcularDuracaoTotalParadaMinutos, 
  formatarMinutosEmHorasEMinutos,
  iniciarAtendimentoParada,
  adicionarMembroEquipeParada,
  pausarAtendimentoParada,
  retomarAtendimentoParada,
  finalizarAtendimentoParada,
  criarNovaParada,
  MOTIVOS_PAUSA_RAPIDA
} from '../lib/paradasEngine';
import { getResponsabilidadeStyle, CORES_RESPONSABILIDADE, NOMES_RESPONSABILIDADE } from '../theme/uEmTheme';
import { derivarFrenteDaTag, normalizarTag } from '../lib/uEmDataUtils';
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
  // Current active report being edited. If null, we are in the list view or about to create one.
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
    
    // Convert YYYY-MM-DD to DD/MM (extracting exact date and month)
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
  const [team, setTeam] = useState('A'); // A, B, C, 1/3, 2/3
  const [shift, setShift] = useState('18:00 às 06:00'); // 18:00 às 06:00, 06:00 às 18:00
  const [frente, setFrente] = useState('EH'); // EH, CR, PF, INFRA

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
  const presetEquipments = ['EH-5004', 'CR-3116', 'PF-1031', 'EH-5003'];

  // Track form initialization to gate debounced auto-saving
  const [isFormReady, setIsFormReady] = useState(false);

  // Refs and states to prevent duplicate sends/saves and handle success overlays
  const skipAutoSaveRef = React.useRef(false);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Paradas de Equipamentos - Ciclo de Vida do Atendimento Técnico (Controle)
  const [liveNow, setLiveNow] = useState(() => Date.now());
  const [filtroFrenteParada, setFiltroFrenteParada] = useState<'TODAS' | 'EH' | 'CR' | 'PF' | 'INFRA'>('TODAS');
  const [filtroTagParada, setFiltroTagParada] = useState('');
  const [activeParadaId, setActiveParadaId] = useState<string | null>(null);
  const [highlightParadaId, setHighlightParadaId] = useState<string | null>(null);

  // Modal: Iniciar Atendimento
  const [iniciandoParada, setIniciandoParada] = useState<Parada | null>(null);
  const [iniciandoTipoManutencao, setIniciandoTipoManutencao] = useState<'CORRETIVA' | 'PREVENTIVA' | 'PROGRAMADA'>('CORRETIVA');

  // Modal: Abrir Nova Parada
  const [showNovaParadaModal, setShowNovaParadaModal] = useState(false);
  const [novaParadaTag, setNovaParadaTag] = useState('');
  const [novaParadaFrente, setNovaParadaFrente] = useState('EH');
  const [novaParadaHoraReal, setNovaParadaHoraReal] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [novaParadaCodigo, setNovaParadaCodigo] = useState('HMC 9130');
  const [novaParadaOS, setNovaParadaOS] = useState('');
  const [novaParadaSintoma, setNovaParadaSintoma] = useState('');
  const [novaParadaAvisoDuplicada, setNovaParadaAvisoDuplicada] = useState<Parada | null>(null);

  // Modal: Pausar Atendimento
  const [showPausarModal, setShowPausarModal] = useState(false);
  const [pausaCodigo, setPausaCodigo] = useState('HMC 9118');
  const [pausaComplemento, setPausaComplemento] = useState('');
  const [pausaBuscaOutro, setPausaBuscaOutro] = useState('');

  // Modal: Finalizar Atendimento
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [finalizarHoraFim, setFinalizarHoraFim] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [finalizarLiberado, setFinalizarLiberado] = useState(true);
  const [finalizarCodigoContinuacao, setFinalizarCodigoContinuacao] = useState('HMC 9118');
  const [finalizarComplemento, setFinalizarComplemento] = useState('');

  // Atualiza relógio da tela a cada 30 segundos conforme especificação
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFormReady(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Initialize form with a fresh new report structure - completely empty and clean!
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
        funcao: e.funcao,
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

  // Start with a clean empty form on mount/login, without preloading mock draft data
  useEffect(() => {
    handleResetForm();
  }, [user.username]);

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

  // Compress, resize, and convert uploaded image to a lightweight base64 for reliable space-conscious storage
  const handleImageUpload = (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Convert FileList to array
    const filesArray = Array.from(files);

    // Process each file
    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1000; // Perfect balance of crisp inspection detail and featherlight footprint
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

          // Draw and compress the image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Optimize to 75% quality JPEG.
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

  // Helper to submit or save as draft
  const handleSave = (status: 'RASCUNHO' | 'ENVIADO') => {
    if (isSaving) return;
    setIsSaving(true);

    // Suppress any background auto-saves
    skipAutoSaveRef.current = true;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const sanitizedAtendimentos = atendimentos.map((at) => ({
      ...at,
      tipoManutencao: at.tipoManutencao || 'CORRETIVA',
      atuantes: at.atuantes || tecnicoNome.trim() || ''
    }));

    const auxNome = extraIntegrantes.filter(m => m.papel === 'Auxiliar').map(m => m.nome).join(', ') || auxiliar;
    const motNome = extraIntegrantes.filter(m => m.papel === 'Motorista').map(m => m.nome).join(', ') || motorista;

    const reportData: Report = {
      id: activeReportId || `rep-${Date.now()}`,
      dateStart,
      dateEnd,
      team,
      shift,
      frente,
      tecnicoNome: tecnicoNome.trim(),
      tecnicoFuncao,
      tecnicoMatricula,
      tecnicoGrupo,
      eletricista: tecnicoFuncao === 'Eletricista' ? tecnicoNome.trim() : (eletricista || ''),
      mecanico: tecnicoFuncao === 'Mecânico' ? tecnicoNome.trim() : (mecanico || ''),
      auxiliar: auxNome,
      motorista: motNome,
      monitor: tecnicoFuncao === 'Monitor' ? tecnicoNome.trim() : monitor,
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

    onSaveReport(reportData, false); // Manually triggered save notifies with standard toasts

    if (status === 'ENVIADO') {
      // Show elegant visual success overlay, reset form, and focus history or top
      setShowSubmitModal(true);
      handleResetForm();
    } else {
      setActiveReportId(reportData.id);
    }

    // Scroll to the top as requested
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Release locking mechanism after a short safety cooldown
    setTimeout(() => {
      setIsSaving(false);
      skipAutoSaveRef.current = false;
    }, 1500);
  };

  // Continuous Transparent Auto-save layout engine
  const stateString = JSON.stringify({
    activeReportId,
    dateStart,
    dateEnd,
    team,
    shift,
    frente,
    eletricista,
    mecanico,
    auxiliar,
    motorista,
    monitor,
    atendimentos,
    pendencias,
    observacoesGerais,
  });

  useEffect(() => {
    // Automatic background draft-saving is completely disabled.
    // Drafts are now exclusively saved when the user manually clicks "Salvar em Rascunho".
  }, []);

  // Filter My reports (made by this operator username)
  const myReports = reports.filter(r => r.mechanicUsername === user.username);

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 select-none">
      
      {/* Header - Compact and aesthetic */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-lg font-black text-emerald-950 uppercase tracking-tight">
            RELATÓRIO DE MANUTENÇÃO
          </h2>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-0.5">
            U&M MINERAÇÃO
          </p>
        </div>
      </div>

      {activeTab === 'history' ? (
        // HISTORY VIEW LIST (Simple and clean)
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

              {/* Opção para adicionar outros membros da equipe (exclusivamente da base cadastrada) */}
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
                {/* Datas Início e Fim */}
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
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden">
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
              {atendimentos.map((at, idx) => (
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

                  <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest border-b border-gray-150 pb-2 mb-2 pr-10">
                    Equipamento #{idx + 1}
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Equipamento */}
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Equipamento (TAG) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: EH-5004"
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

                      {/* HORA REAL DA PARADA (logo abaixo da TAG como solicitado na regra 2.3) */}
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
                          Se parou antes da sua chegada
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
                        placeholder="Ex: 18:00"
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
                        placeholder="Ex: 21:20"
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
                          Equipamento Liberado para Operação
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Ao enviar o relatório, o status da Parada será atualizado para Liberado Operação.
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
                        {/* Option 1: Live Mobile Camera capture */}
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

                        {/* Option 2: Choose from mobile files/gallery */}
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

                      {/* Flex wrapper for current photos in the list */}
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
              ))}

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
                  {/* Remove action */}
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

                  {/* Previsão de Liberação / Disponibilidade */}
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
              Seu relatório de manutenção foi finalizado e transmitido com sucesso para a tela de monitoramento do supervisor!
            </p>
            
            <button
              type="button"
              onClick={() => {
                setShowSubmitModal(false);
                setActiveTab('history'); // Automatically navigate to the history list
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
          {/* Row 1: Action Buttons (Only when in form view) */}
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
                onClick={() => handleSave('ENVIADO')}
                className="flex-1 bg-emerald-900 text-white hover:bg-emerald-950 rounded-xl text-[10px] font-black tracking-normal uppercase flex items-center justify-center gap-1 cursor-pointer transition duration-150 active:scale-105 shadow-sm shadow-emerald-900/10 disabled:opacity-50"
              >
                <Send className="w-3 h-3 text-emerald-100" />
                <span>{isSaving ? 'ENVIANDO...' : 'FINALIZAR E ENVIAR'}</span>
              </button>
            </div>
          )}

          {/* Row 2: Capsule pill switcher with PM trigger on the left */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Left element: PM trigger */}
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

            {/* Centered Capsule */}
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

            {/* Right balance container */}
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
            {/* Header */}
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
              {/* Form to build a new one */}
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

              {/* List of current Scheduled Preventas */}
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

            {/* Footer information */}
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

// Minimal XIcon
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor" 
      strokeWidth={3} 
      className={props.className} 
      {...props}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
