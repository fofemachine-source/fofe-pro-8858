import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Search, FileText, Calendar, 
  Clock, Shield, User as UserIcon, Layers, Wrench, AlertTriangle,
  Trash2, Plus, Check, Save, X, UserCheck, Users, Edit3, RotateCcw,
  FileSpreadsheet, Upload, AlertCircle, FolderTree, Download
} from 'lucide-react';
import { Report, Preventiva, User, Tecnico, Parada, GrupoTecnico } from '../types';
import { PRESET_PREVENTIVAS } from '../data/presetPreventivas';
import { ReportCardAccordion } from './ReportCardAccordion';
import { OperationalDashboard } from './OperationalDashboard';
import { ParadasView } from './ParadasView';
import { CatalogoAdminTab } from './CatalogoAdminTab';
import { processarPlanilhaEfetivo, ResumoImportacao } from '../lib/planilhaEfetivoParser';
import { removerAcentos, formatarNomeSobrenome, classificarGrupoFuncao } from '../lib/uEmDataUtils';

interface AdminViewProps {
  reports: Report[];
  onDeleteReport: (id: string) => void;
  onClearAll: () => void;
  isOffline?: boolean;
  preventivas: Preventiva[];
  onAddPreventiva: (p: Omit<Preventiva, 'id' | 'createdAt'>) => void;
  onAddPreventivasBulk?: (newPrevs: Omit<Preventiva, 'id' | 'createdAt'>[]) => void;
  onUpdatePreventiva?: (p: Preventiva) => void;
  onDeletePreventiva: (id: string) => void;
  onClearAllPreventivas?: () => void;
  currentUser: User;
  onSaveReport?: (updatedReport: Report) => void;
  tecnicos?: Tecnico[];
  onAddTecnico: (t: Omit<Tecnico, 'id' | 'createdAt'>) => void;
  onAddTecnicosBulk?: (tecs: Tecnico[]) => void;
  onUpdateTecnico?: (t: Tecnico) => void;
  onDeleteTecnico: (id: string) => void;
  onRestoreDefaultTecnicos?: () => void;
  onClearAllTecnicos?: () => void;
  onClearAllDatabase?: () => void;
  // Paradas Operacionais Vale x U&M
  paradas?: Parada[];
  onSaveParada?: (p: Parada) => void;
  onDeleteParada?: (id: string) => void;
}

export function AdminView({ 
  reports, 
  onDeleteReport, 
  onClearAll, 
  isOffline = false,
  preventivas,
  onAddPreventiva,
  onAddPreventivasBulk,
  onUpdatePreventiva,
  onDeletePreventiva,
  onClearAllPreventivas,
  currentUser,
  onSaveReport,
  tecnicos = [],
  onAddTecnico,
  onAddTecnicosBulk,
  onUpdateTecnico,
  onDeleteTecnico,
  onRestoreDefaultTecnicos,
  onClearAllTecnicos,
  onClearAllDatabase,
  paradas = [],
  onSaveParada,
  onDeleteParada
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'paradas' | 'preventivas' | 'tecnicos' | 'relatorios' | 'catalogo'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmPreventiva, setDeleteConfirmPreventiva] = useState<Preventiva | null>(null);
  const [showConfirmClearPreventivas, setShowConfirmClearPreventivas] = useState(false);
  const [showConfirmClearReports, setShowConfirmClearReports] = useState(false);
  const [showConfirmClearAllDatabase, setShowConfirmClearAllDatabase] = useState(false);
  const [confirmZerarPalavra, setConfirmZerarPalavra] = useState('');

  // Planilha de Efetivo (Melhoria 1.1)
  const [importPreview, setImportPreview] = useState<ResumoImportacao | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PREV modal and inline editing states
  const [isOpenPrevModal, setIsOpenPrevModal] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<'view' | 'register'>('view');

  // Form states for registering a preventive
  const [equipamento, setEquipamento] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataParada, setDataParada] = useState(''); // dataParada e.g. "11/06" (target date)
  const [horaPreventiva, setHoraPreventiva] = useState('250');
  const [horasPmpp, setHorasPmpp] = useState('');
  const [limiteHorimetro, setLimiteHorimetro] = useState('');
  const [statusPreventiva, setStatusPreventiva] = useState('EM ANDAMENTO');

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipamento.trim()) return;

    let formattedParada = dataParada;
    if (!formattedParada && dataInicio) {
      const parts = dataInicio.split('-');
      if (parts.length === 3) {
        formattedParada = `${parts[2]}/${parts[1]}`;
      } else {
        formattedParada = dataInicio;
      }
    }

    onAddPreventiva({
      equipamento: equipamento.trim().toUpperCase(),
      dataParada: formattedParada || new Date().toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric'}),
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      horaPreventiva,
      horasPmppConfirmada: horasPmpp,
      limiteHorimetro,
      statusPreventiva: statusPreventiva || 'EM ANDAMENTO',
      usuario: currentUser.username
    });

    // Reset Form
    setEquipamento('');
    setDataInicio('');
    setDataParada('');
    setHoraPreventiva('250');
    setHorasPmpp('');
    setLimiteHorimetro('');
    setStatusPreventiva('EM ANDAMENTO');

    // Switch to sheet view
    setModalActiveTab('view');
  };

  const handleUpdateRow = (item: Preventiva, field: keyof Preventiva, value: any) => {
    if (onUpdatePreventiva) {
      onUpdatePreventiva({
        ...item,
        [field]: value
      });
    }
  };

  // Technicians management state
  const [searchTecnico, setSearchTecnico] = useState('');
  const [filterFuncao, setFilterFuncao] = useState('TODOS');
  const [isTecnicoModalOpen, setIsTecnicoModalOpen] = useState(false);
  const [editingTecnico, setEditingTecnico] = useState<Tecnico | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formFuncao, setFormFuncao] = useState('Mecânico');
  const [formMatricula, setFormMatricula] = useState('');
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [deleteConfirmTecnicoId, setDeleteConfirmTecnicoId] = useState<string | null>(null);
  const [showConfirmClearTecnicos, setShowConfirmClearTecnicos] = useState(false);

  const handleOpenAddTecnico = () => {
    setEditingTecnico(null);
    setFormNome('');
    setFormFuncao('Mecânico');
    setFormMatricula('');
    setFormStatus('ativo');
    setIsTecnicoModalOpen(true);
  };

  const handleOpenEditTecnico = (tec: Tecnico) => {
    setEditingTecnico(tec);
    setFormNome(tec.nome);
    setFormFuncao(tec.funcao || 'Mecânico');
    setFormMatricula(tec.matricula || '');
    setFormStatus(tec.status || 'ativo');
    setIsTecnicoModalOpen(true);
  };

  const handleSaveTecnicoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) return;

    if (editingTecnico) {
      if (onUpdateTecnico) {
        onUpdateTecnico({
          ...editingTecnico,
          nome: formNome.trim(),
          funcao: formFuncao,
          matricula: formMatricula.trim(),
          status: formStatus
        });
      }
    } else {
      onAddTecnico({
        nome: formNome.trim(),
        funcao: formFuncao,
        matricula: formMatricula.trim(),
        status: formStatus
      });
    }

    setIsTecnicoModalOpen(false);
  };

  const handleToggleTecnicoStatus = (tec: Tecnico) => {
    if (onUpdateTecnico) {
      onUpdateTecnico({
        ...tec,
        status: tec.status === 'ativo' ? 'inativo' : 'ativo'
      });
    }
  };

  // Only display submitted/sent (ENVIADO) reports to the Supervisor/Admin
  const submittedReports = reports.filter(r => r && (r.status === 'ENVIADO' || r.status === 'PENDENTE_SINCRONIZACAO' || r.status === 'SINCRONIZANDO'));

  // Search filter
  const filteredReports = submittedReports.filter((rep) => {
    const q = searchQuery.toLowerCase();
    return (
      rep.team.toLowerCase().includes(q) ||
      rep.frente.toLowerCase().includes(q) ||
      rep.mecanico.toLowerCase().includes(q) ||
      (rep.monitor && rep.monitor.toLowerCase().includes(q)) ||
      rep.eletricista.toLowerCase().includes(q) ||
      rep.auxiliar.toLowerCase().includes(q) ||
      rep.motorista.toLowerCase().includes(q) ||
      rep.dateStart.includes(q) ||
      rep.dateEnd.includes(q) ||
      rep.shift.includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 select-none font-sans">
      
      {/* TAB BAR SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex bg-[var(--um-fundo)] p-1.5 rounded-2xl w-full sm:max-w-3xl border border-[var(--um-cinza-claro)] gap-1 shadow-xs overflow-x-auto">
          <button
            id="btn-tab-dashboard"
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-[11px] uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] shadow-xs' 
                : 'text-[var(--um-cinza-texto)] hover:bg-[var(--um-branco)] hover:text-[var(--um-cinza-escuro)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>📊 DASHBOARD</span>
          </button>

          <button
            id="btn-tab-paradas"
            onClick={() => setActiveTab('paradas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-[11px] uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
              activeTab === 'paradas' 
                ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] shadow-xs' 
                : 'text-[var(--um-cinza-texto)] hover:bg-[var(--um-branco)] hover:text-[var(--um-cinza-escuro)]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>⏱️ PARADAS ({paradas.filter(p => p.situacao === 'ABERTA').length})</span>
          </button>

          {currentUser?.role === 'admin' && (
            <>
              <button
                id="btn-tab-preventivas"
                onClick={() => setActiveTab('preventivas')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-[11px] uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'preventivas' 
                    ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] shadow-xs' 
                    : 'text-[var(--um-cinza-texto)] hover:bg-[var(--um-branco)] hover:text-[var(--um-cinza-escuro)]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>🗓️ PREVENTIVAS</span>
              </button>

              <button
                id="btn-tab-tecnicos"
                onClick={() => setActiveTab('tecnicos')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-[11px] uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'tecnicos' 
                    ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] shadow-xs' 
                    : 'text-[var(--um-cinza-texto)] hover:bg-[var(--um-branco)] hover:text-[var(--um-cinza-escuro)]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>👷 TÉCNICOS ({tecnicos.length})</span>
              </button>

              <button
                id="btn-tab-catalogo"
                onClick={() => setActiveTab('catalogo')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-[11px] uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'catalogo' 
                    ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] shadow-xs' 
                    : 'text-[var(--um-cinza-texto)] hover:bg-[var(--um-branco)] hover:text-[var(--um-cinza-escuro)]'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5 shrink-0" />
                <span>🗂️ CATÁLOGO</span>
              </button>
            </>
          )}

          <button
            id="btn-tab-relatorios"
            onClick={() => setActiveTab('relatorios')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-[11px] uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
              activeTab === 'relatorios' 
                ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)] shadow-xs' 
                : 'text-[var(--um-cinza-texto)] hover:bg-[var(--um-branco)] hover:text-[var(--um-cinza-escuro)]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>📋 RELATÓRIOS</span>
          </button>
        </div>

        {currentUser?.role === 'admin' && onClearAllDatabase && (
          <button
            type="button"
            onClick={() => {
              setConfirmZerarPalavra('');
              setShowConfirmClearAllDatabase(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 rounded-xl text-[11px] font-medium uppercase tracking-wider transition cursor-pointer shadow-xs shrink-0"
            title="Excluir todos os relatórios, preventivas e técnicos para começar do zero"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Zerar Banco Geral</span>
          </button>
        )}
      </div>

      {activeTab === 'dashboard' && (
        /* RENDER DASHBOARD OPERACIONAL */
        <OperationalDashboard 
          reports={reports} 
          isOffline={isOffline} 
          preventivas={preventivas}
          onAddPreventiva={onAddPreventiva}
          onDeletePreventiva={onDeletePreventiva}
          currentUser={currentUser}
          onSaveReport={onSaveReport}
          paradas={paradas}
          onSelectParadasTab={() => setActiveTab('paradas')}
        />
      )}

      {activeTab === 'paradas' && (
        /* RENDER ABA PARADAS VALE x U&M */
        <ParadasView
          paradas={paradas}
          onSaveParada={onSaveParada || (() => {})}
          onDeleteParada={onDeleteParada || (() => {})}
          currentUser={currentUser}
          reports={reports}
        />
      )}

      {activeTab === 'catalogo' && (
        <CatalogoAdminTab
          currentUser={currentUser}
          isOffline={isOffline}
        />
      )}

      {activeTab === 'relatorios' && (
        /* RENDER ORIGINAL REPORTE PANEL AS IS */
        <>
          {/* Title Header with info stats */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-emerald-950 uppercase tracking-tight">
                RELATÓRIO DE MANUTENÇÃO
              </h2>
              <p className="text-xs text-gray-550 font-bold uppercase tracking-widest text-emerald-800">
                U&M MINERAÇÃO
              </p>
            </div>

            {/* Small stats badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {filteredReports.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const linhas: Record<string, any>[] = [];
                    filteredReports.forEach((rep) => {
                      (rep.atendimentos || []).forEach((at) => {
                        linhas.push({
                          'Data Início': rep.dateStart || '',
                          'Data Fim': rep.dateEnd || '',
                          'Turno': rep.shift || '',
                          'Turma': rep.team || '',
                          'Frente': rep.frente || '',
                          'Mecânico / Equipe': rep.mecanico || '',
                          'TAG Equipamento': at.equipamento || '',
                          'OM': at.om || '',
                          'Horímetro': at.horimetro || '',
                          'Hora Início': at.horaInicio || '',
                          'Hora Fim': at.horaFim || '',
                          'perfil': at.falha?.perfil || '',
                          'sistema': at.falha ? `${at.falha.sistema.codigo} - ${at.falha.sistema.nome}` : '',
                          'componente': at.falha ? `${at.falha.componente.codigo} - ${at.falha.componente.nome}` : '',
                          'sintoma': at.falha ? `${at.falha.sintoma.codigo} - ${at.falha.sintoma.nome}` : (at.sintoma || ''),
                          'código completo': at.falha?.codigoCompleto || '',
                          'Complemento': at.falha?.complemento || '',
                          'Causa': at.causa || '',
                          'Ação Executada': at.acaoExecutada || '',
                          'Atuantes': at.atuantes || ''
                        });
                      });
                    });
                    const ws = XLSX.utils.json_to_sheet(linhas);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Relatorios_Manutencao');
                    XLSX.writeFile(wb, `relatorios_manutencao_um_${new Date().toISOString().slice(0, 10)}.xlsx`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  title="Exportar relatórios para Excel (.xlsx) com colunas de Catálogo de Falhas"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Excel (.xlsx)</span>
                </button>
              )}
              {reports.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmClearReports(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition cursor-pointer border border-rose-200"
                  title="Excluir todos os relatórios do banco de dados"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Zerar Relatórios</span>
                </button>
              )}
              <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>Relatórios Recebidos: {submittedReports.length}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Business Inspired Chat/Maintenance Report list with fast lookup */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden mb-6">
            
            {/* Search header area */}
            <div className="p-4 bg-gray-50 border-b border-gray-150 flex flex-col md:flex-row gap-3 justify-between items-center">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Buscar por Turma, Frente, Operador ou Data..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-250 rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-800 transition"
                />
              </div>
              <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                Exibindo {filteredReports.length} relatórios
              </div>
            </div>

            {/* RESTRUCTURED REPORT LISTING AS ACCORDION CARDS */}
            <div className="p-4 sm:p-6 bg-slate-50/50 border-t border-gray-150">
              {filteredReports.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-wide">
                  Nenhum relatório correspondente aos filtros foi encontrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredReports.map((rep) => (
                    <ReportCardAccordion
                      key={rep.id}
                      report={rep}
                      onDelete={onDeleteReport}
                      showActions={true}
                      canDelete={true}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {activeTab === 'preventivas' && (
        <>
          {/* Title Header with info stats */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 select-none">
            <div>
              <h2 className="text-2xl font-black text-emerald-950 uppercase tracking-tight flex items-center gap-1.5 animate-fade-in">
                <span>🗓️</span> PROGRAMAÇÃO DE PREVENTIVAS
              </h2>
              <p className="text-xs text-gray-550 font-bold uppercase tracking-widest text-emerald-800">
                U&M MINERAÇÃO — Planejador UMCA
              </p>
            </div>
            {/* Quick stats badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {preventivas.length > 0 && onClearAllPreventivas && (
                <button
                  type="button"
                  onClick={() => setShowConfirmClearPreventivas(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition cursor-pointer border border-rose-200"
                  title="Excluir todas as preventivas do banco de dados"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Zerar Preventivas</span>
                </button>
              )}
              {onAddPreventivasBulk && (
                <button
                  type="button"
                  onClick={() => {
                    onAddPreventivasBulk(PRESET_PREVENTIVAS);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black rounded-xl border border-amber-600 shadow-sm transition-all flex items-center gap-1 cursor-pointer uppercase tracking-wider text-[10px]"
                  title="Carregar a programação da segunda foto"
                >
                  <span>⚡</span> Carregar Lista Modelo (Foto 2)
                </button>
              )}
              <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl flex items-center gap-1.5 font-bold text-gray-755 shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Total de Preventivas: {preventivas.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mb-6">
            
            {/* Sub-Tabs Selector inside the tab layout for Cadastrar vs View */}
            <div className="bg-gray-100 px-6 py-2.5 border-b border-gray-205 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModalActiveTab('view')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                modalActiveTab === 'view'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-750 hover:bg-gray-200 hover:text-gray-950 border border-gray-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🟢 PREVENTIVAS</span>
            </button>
            <button
              type="button"
              onClick={() => setModalActiveTab('register')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                modalActiveTab === 'register'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-gray-755 hover:bg-gray-200 hover:text-gray-950 border border-gray-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>➕ Cadastrar Nova Preventiva</span>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="p-4 sm:p-6 bg-gray-50/30 flex-1">
            {modalActiveTab === 'register' ? (
              /* Tab 1: Cadastrar */
              <form id="form-prev-register" onSubmit={handleRegisterSubmit} className="space-y-4 max-w-2xl mx-auto bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs">
                <h4 className="text-emerald-900 font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📝</span> NOVO AGENDAMENTO DE PREVENTIVA
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-[10px] text-gray-450 font-bold uppercase tracking-wider mb-1">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      required
                      value={dataInicio}
                      onChange={(e) => {
                        setDataInicio(e.target.value);
                        const p = e.target.value.split('-');
                        if (p.length === 3) {
                          setDataParada(`${p[2]}/${p[1]}`);
                        }
                      }}
                      className="w-full bg-gray-50/60 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:bg-white focus:outline-emerald-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-450 font-bold uppercase tracking-wider mb-1">
                      Tag do Equipamento
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: EH-5003"
                      value={equipamento}
                      onChange={(e) => setEquipamento(e.target.value)}
                      className="w-full bg-gray-50/60 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold uppercase focus:bg-white focus:outline-emerald-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-450 font-bold uppercase tracking-wider mb-1">
                      Hora Preventiva
                    </label>
                    <select
                      value={horaPreventiva}
                      onChange={(e) => setHoraPreventiva(e.target.value)}
                      className="w-full bg-gray-50/60 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:bg-white focus:outline-emerald-800 cursor-pointer transition"
                    >
                      <option value="250">250 h</option>
                      <option value="500">500 h</option>
                      <option value="1000">1000 h</option>
                      <option value="3000">3000 h</option>
                      <option value="12000">12000 h</option>
                      <option value="A">A</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-450 font-bold uppercase tracking-wider mb-1">
                      Horas Faltantes (Opcional)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 18"
                      value={horasPmpp}
                      onChange={(e) => setHorasPmpp(e.target.value)}
                      className="w-full bg-gray-50/60 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:bg-white focus:outline-emerald-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-450 font-bold uppercase tracking-wider mb-1">
                      Limite de Horímetro (Opcional)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 8644"
                      value={limiteHorimetro}
                      onChange={(e) => setLimiteHorimetro(e.target.value)}
                      className="w-full bg-gray-50/60 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:bg-white focus:outline-emerald-800 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-450 font-bold uppercase tracking-wider mb-1">
                      Status da Preventiva
                    </label>
                    <select
                      value={statusPreventiva}
                      onChange={(e) => setStatusPreventiva(e.target.value)}
                      className="w-full bg-gray-50/60 border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-bold focus:bg-white focus:outline-emerald-800 cursor-pointer transition"
                    >
                      <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                      <option value="CONFIRMADO">CONFIRMADO</option>
                      <option value="MONITORAR">MONITORAR</option>
                    </select>
                  </div>

                </div>

                <div className="pt-4 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('view')}
                    className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Cadastrar Preventiva</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Tab 2: Visualizar e Editar (PLANILHA) */
              <div className="space-y-4">
                
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-emerald-900 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <span>📊</span> PROGRAMAÇÃO GERAL DE PREVENTIVAS
                    </h4>
                    <p className="text-[10px] text-gray-505 font-bold uppercase tracking-wide">
                      Todos os campos são totalmente editáveis em tempo real direto na tabela abaixo.
                    </p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-950 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-emerald-250">
                    Cadastradas: {preventivas.length}
                  </span>
                </div>


                  <div className="space-y-6 animate-fade-in">
                    {(() => {
                      const normais = preventivas.filter(p => !p.statusPreventiva || p.statusPreventiva === 'EM ANDAMENTO' || p.statusPreventiva === 'CONFIRMADO');
                      const monitorar = preventivas.filter(p => p.statusPreventiva === 'MONITORAR');

                      const renderTableRows = (items: typeof preventivas) => {
                        return items.map((p) => {
                          let statusBgClass = '';
                          let statusTextClass = '';
                          if (p.statusPreventiva === 'CONFIRMADO') {
                            statusBgClass = 'bg-red-650';
                            statusTextClass = 'text-white font-black';
                          } else if (p.statusPreventiva === 'MONITORAR') {
                            statusBgClass = 'bg-emerald-110';
                            statusTextClass = 'text-emerald-950 font-black';
                          } else {
                            statusBgClass = 'bg-gray-150';
                            statusTextClass = 'text-gray-900 font-extrabold';
                          }

                          return (
                            <tr key={p.id} className="hover:bg-gray-50/60 transition divide-x divide-gray-100">
                              
                              {/* Data Inicio Column */}
                              <td className="px-1.5 py-1">
                                <input
                                  type="text"
                                  placeholder="Ex: 22/06/2026"
                                  value={p.dataInicio || p.dataParada || ''}
                                  onChange={(e) => handleUpdateRow(p, 'dataInicio', e.target.value)}
                                  className="w-full text-center bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-emerald-850 rounded-lg py-1 px-1 text-xs font-bold text-gray-800 transition"
                                />
                              </td>

                              {/* Tag Equipamento Column */}
                              <td className="px-1.5 py-1">
                                <input
                                  type="text"
                                  placeholder="Ex: EH-5003"
                                  value={p.equipamento || ''}
                                  onChange={(e) => handleUpdateRow(p, 'equipamento', e.target.value.toUpperCase())}
                                  className="w-full text-center bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-emerald-850 rounded-lg py-1 px-1 text-xs font-black text-gray-950 transition uppercase font-mono"
                                />
                              </td>

                              {/* Hora Preventiva Column */}
                              <td className="px-1.5 py-1">
                                <input
                                  type="text"
                                  placeholder="Ex: 3000"
                                  value={p.horaPreventiva || ''}
                                  onChange={(e) => handleUpdateRow(p, 'horaPreventiva', e.target.value)}
                                  className="w-full text-center bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-emerald-850 rounded-lg py-1 px-1 text-xs font-bold text-gray-800 transition"
                                />
                              </td>

                              {/* Horas Faltantes Column */}
                              <td className="px-1.5 py-1">
                                <input
                                  type="text"
                                  placeholder="18"
                                  value={p.horasPmppConfirmada || ''}
                                  onChange={(e) => handleUpdateRow(p, 'horasPmppConfirmada', e.target.value)}
                                  className="w-full text-center bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-emerald-850 rounded-lg py-1 px-1 text-xs font-black text-gray-700 transition"
                                />
                              </td>

                              {/* Limite Horimetro Column */}
                              <td className="px-1.5 py-1">
                                <input
                                  type="text"
                                  placeholder="8644"
                                  value={p.limiteHorimetro || ''}
                                  onChange={(e) => handleUpdateRow(p, 'limiteHorimetro', e.target.value)}
                                  className="w-full text-center bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-emerald-850 rounded-lg py-1 px-1 text-xs font-black text-red-650 transition"
                                />
                              </td>

                              {/* Status Select Column */}
                              <td className="px-2 py-1 text-center">
                                <select
                                  value={p.statusPreventiva || 'EM ANDAMENTO'}
                                  onChange={(e) => handleUpdateRow(p, 'statusPreventiva', e.target.value)}
                                  className={`w-full max-w-[130px] text-center mx-auto block py-1 px-2 rounded-xl cursor-pointer text-[10px] uppercase transition shadow-xs focus:ring-1 focus:ring-emerald-800 outline-none ${statusBgClass} ${statusTextClass}`}
                                >
                                  <option value="EM ANDAMENTO" className="bg-white text-gray-900 font-extrabold">EM ANDAMENTO</option>
                                  <option value="CONFIRMADO" className="bg-white text-red-700 font-extrabold">CONFIRMADO</option>
                                  <option value="MONITORAR" className="bg-white text-emerald-900 font-extrabold">MONITORAR</option>
                                </select>
                              </td>

                              {/* Excluir Column */}
                              <td className="px-2 py-1 text-center font-bold">
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmPreventiva(p)}
                                  className="p-1 bg-red-50 hover:bg-red-100 text-red-650 transition rounded-lg hover:text-red-800 inline-flex items-center justify-center cursor-pointer"
                                  title="Remover Preventiva"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              </td>

                            </tr>
                          );
                        });
                      };

                      return (
                        <>
                          {/* TABELA 1: PROGRAMAÇÃO DE PREVENTIVA UMCA (AZUL) */}
                          <div className="bg-white rounded-2xl border-2 border-blue-500/30 overflow-hidden shadow-xs">
                            <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white px-5 py-3.5 font-black text-xs uppercase tracking-wider flex items-center justify-between border-b border-blue-950 select-none">
                              <span className="flex items-center gap-2">
                                <span className="text-sm">⚡</span> PROGRAMAÇÃO DE PREVENTIVA UMCA
                              </span>
                              <span className="text-[10px] bg-blue-950 px-2.5 py-0.5 rounded border border-blue-600/30 font-mono font-black">
                                PROGRAMADAS: {normais.length}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse font-sans">
                                <thead>
                                  <tr className="bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] text-[11px] font-medium tracking-wider uppercase border-b border-[var(--um-cinza-claro)] divide-x divide-[var(--um-cinza-claro)]">
                                    <th className="px-3 py-3 text-center min-w-[130px]">DATA INÍCIO</th>
                                    <th className="px-3 py-3 text-center min-w-[120px]">TAG</th>
                                    <th className="px-3 py-3 text-center min-w-[125px]">HORA PREVENTIVA</th>
                                    <th className="px-3 py-3 text-center min-w-[145px]">HORAS FALTANTES</th>
                                    <th className="px-3 py-3 text-center min-w-[135px]">LIMITE DE HORÍMETRO</th>
                                    <th className="px-3 py-3 text-center min-w-[145px]">STATUS</th>
                                    <th className="px-3 py-3 text-center w-[60px]">AÇÃO</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-xs font-semibold">
                                  {normais.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-wider select-none">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                          <span>Nenhuma preventiva ativa programada no momento.</span>
                                          {onAddPreventivasBulk && (
                                            <button
                                              type="button"
                                              onClick={() => onAddPreventivasBulk(PRESET_PREVENTIVAS)}
                                              className="mt-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm border border-blue-500"
                                            >
                                              ⚡ Carregar Lista Modelo (Foto 2)
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    renderTableRows(normais)
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* TABELA 2: MONITORAR / OUTRAS PARADAS (VERDE) */}
                          <div className="bg-white rounded-2xl border-2 border-emerald-500/30 overflow-hidden shadow-xs mt-4">
                            <div className="bg-gradient-to-r from-emerald-800 to-teal-700 text-white px-5 py-3.5 font-black text-xs uppercase tracking-wider flex items-center justify-between border-b border-emerald-950 select-none">
                              <span className="flex items-center gap-2">
                                <span className="text-sm">👁️</span> EQUIPAMENTOS EM MONITORAMENTO
                              </span>
                              <span className="text-[10px] bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-600/30 font-mono font-black">
                                MONITORANDO: {monitorar.length}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse font-sans">
                                <thead>
                                  <tr className="bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] text-[11px] font-medium tracking-wider uppercase border-b border-[var(--um-cinza-claro)] divide-x divide-[var(--um-cinza-claro)]">
                                    <th className="px-3 py-3 text-center min-w-[130px]">DATA INÍCIO</th>
                                    <th className="px-3 py-3 text-center min-w-[120px]">TAG</th>
                                    <th className="px-3 py-3 text-center min-w-[125px]">HORA PREVENTIVA</th>
                                    <th className="px-3 py-3 text-center min-w-[145px]">HORAS FALTANTES</th>
                                    <th className="px-3 py-3 text-center min-w-[135px]">LIMITE DE HORÍMETRO</th>
                                    <th className="px-3 py-3 text-center min-w-[145px]">STATUS</th>
                                    <th className="px-3 py-3 text-center w-[60px]">AÇÃO</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-xs font-semibold">
                                  {monitorar.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="px-4 py-12 text-center text-emerald-800/60 font-bold uppercase text-[10px] tracking-wider select-none">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                          <span>Nenhum equipamento em monitoramento no momento.</span>
                                          {onAddPreventivasBulk && (
                                            <button
                                              type="button"
                                              onClick={() => onAddPreventivasBulk(PRESET_PREVENTIVAS)}
                                              className="mt-2 px-3.5 py-2 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm border border-emerald-500"
                                            >
                                              👁️ Carregar Lista de Monitoramento (Foto 2)
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ) : (
                                    renderTableRows(monitorar)
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-2xl flex items-start gap-2 text-amber-900 text-[10px] font-bold uppercase select-none">
                  <span>💡</span>
                  <span>Todas as alterações feitas diretamente nos campos da planilha acima são salvas em tempo real no banco de dados sincronizado automaticamente.</span>
                </div>

              </div>
            )}
          </div>

          {/* Footer inline info */}
          <div className="bg-gray-100 border-t border-gray-250 px-6 py-4 flex items-center justify-between text-xs">
            <span className="text-[10px] text-gray-505 font-bold uppercase tracking-wider">
              U&M MINERAÇÃO — Planejador UMCA
            </span>
            <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider">
              Sincronizado {isOffline ? 'Offline' : 'Online'} 🟢
            </span>
          </div>

        </div>
      </>
      )}

      {/* 4. GESTÃO E CADASTRO DE TÉCNICOS */}
      {activeTab === 'tecnicos' && (
        <div className="space-y-6 pb-20">
          
          {/* Header Card */}
          <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] shadow-xs overflow-hidden">
            <div className="bg-[var(--um-verde-principal)] px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-light text-[18px] uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[var(--um-verde-claro)]" />
                  CADASTRO E GESTÃO DE TÉCNICOS
                </h3>
                <p className="text-[12px] text-[var(--um-verde-claro)] mt-1 max-w-xl">
                  Importe planilhas de efetivo (.xlsx / .csv) ou cadastre técnicos manualmente. Apenas técnicos de campo ativos ficam disponíveis no formulário de turno.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {/* Botão de Importação de Planilha (Melhoria 1.1) */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsProcessingImport(true);
                    setImportError(null);
                    try {
                      const resumo = await processarPlanilhaEfetivo(file, tecnicos);
                      setImportPreview(resumo);
                    } catch (err: any) {
                      setImportError(err.message || 'Erro ao processar a planilha de efetivo.');
                    } finally {
                      setIsProcessingImport(false);
                      e.target.value = '';
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[var(--um-branco)] text-[var(--um-verde-principal)] hover:bg-[var(--um-fundo)] rounded-xl text-[11px] font-medium uppercase tracking-wider transition cursor-pointer shadow-xs border border-[var(--um-cinza-claro)]"
                  title="Importar planilha de efetivo (.xlsx ou .csv) contendo CHAPA, NOME, FUNÇÃO, SEÇÃO"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[var(--um-verde-principal)]" />
                  <span>{isProcessingImport ? 'Lendo planilha...' : 'Importar Planilha de Efetivo (.xlsx / .csv)'}</span>
                </button>

                {onClearAllTecnicos && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmZerarPalavra('');
                      setShowConfirmClearTecnicos(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-[11px] font-medium uppercase tracking-wider transition cursor-pointer shadow-xs"
                    title="Excluir todos os técnicos para começar do zero"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Zerar Banco de Cadastro</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={handleOpenAddTecnico}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--um-verde-secundario)] hover:bg-[#324D3B] text-white rounded-xl text-[11px] font-medium uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Técnico</span>
                </button>
              </div>
            </div>

            {importError && (
              <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-[12px] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {importError}
                </span>
                <button onClick={() => setImportError(null)} className="font-bold">✕</button>
              </div>
            )}

            {/* Quick Metrics Bar pelos Grupos U&M (Regra 1.4) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 divide-y sm:divide-y-0 sm:divide-x divide-[var(--um-cinza-claro)] border-b border-[var(--um-cinza-claro)] bg-[var(--um-fundo)]">
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--um-cinza-texto)] block">Total</span>
                <span className="text-xl font-light text-[var(--um-cinza-escuro)] mt-0.5 block">{tecnicos.length}</span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--um-verde-principal)] block">Mecânicos</span>
                <span className="text-xl font-light text-[var(--um-verde-principal)] mt-0.5 block">
                  {tecnicos.filter(t => (t.grupo || classificarGrupoFuncao(t.funcao)) === 'MECÂNICO').length}
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#B5872C] block">Eletricistas</span>
                <span className="text-xl font-light text-[#B5872C] mt-0.5 block">
                  {tecnicos.filter(t => (t.grupo || classificarGrupoFuncao(t.funcao)) === 'ELETRICISTA').length}
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#466C53] block">Lubrificadores</span>
                <span className="text-xl font-light text-[#466C53] mt-0.5 block">
                  {tecnicos.filter(t => (t.grupo || classificarGrupoFuncao(t.funcao)) === 'LUBRIFICADOR').length}
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#C44A00] block">Borracheiros</span>
                <span className="text-xl font-light text-[#C44A00] mt-0.5 block">
                  {tecnicos.filter(t => (t.grupo || classificarGrupoFuncao(t.funcao)) === 'BORRACHEIRO').length}
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#1565C0] block">Soldadores</span>
                <span className="text-xl font-light text-[#1565C0] mt-0.5 block">
                  {tecnicos.filter(t => (t.grupo || classificarGrupoFuncao(t.funcao)) === 'SOLDADOR').length}
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#6A1B9A] block">Inspetores</span>
                <span className="text-xl font-light text-[#6A1B9A] mt-0.5 block">
                  {tecnicos.filter(t => (t.grupo || classificarGrupoFuncao(t.funcao)) === 'INSPETOR').length}
                </span>
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--um-cinza-texto)] block">Outros</span>
                <span className="text-xl font-light text-[var(--um-cinza-escuro)] mt-0.5 block">
                  {tecnicos.filter(t => {
                    const g = t.grupo || classificarGrupoFuncao(t.funcao);
                    return !['MECÂNICO', 'ELETRICISTA', 'LUBRIFICADOR', 'BORRACHEIRO', 'SOLDADOR', 'INSPETOR'].includes(g);
                  }).length}
                </span>
              </div>
            </div>

            {/* Search and Function Filter Chips (Regra 1.4) */}
            <div className="p-4 border-b border-[var(--um-cinza-claro)] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[var(--um-branco)]">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[var(--um-cinza-texto)] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchTecnico}
                  onChange={(e) => setSearchTecnico(e.target.value)}
                  placeholder="Pesquisar por nome ou matrícula (sem acentos)..."
                  className="w-full pl-10 pr-9 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-xl text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
                />
                {searchTecnico && (
                  <button
                    type="button"
                    onClick={() => setSearchTecnico('')}
                    className="absolute right-3 top-2.5 text-[var(--um-cinza-texto)] hover:text-black"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Function Filter Chips por Grupos U&M (Regra 1.4) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-medium uppercase">
                {[
                  'TODOS',
                  'MECÂNICO',
                  'ELETRICISTA',
                  'LUBRIFICADOR',
                  'BORRACHEIRO',
                  'SOLDADOR',
                  'INSPETOR',
                  'AUXILIAR',
                  'OUTROS'
                ].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFilterFuncao(role)}
                    className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap border ${
                      filterFuncao === role
                        ? 'bg-[var(--um-verde-principal)] text-white border-[var(--um-verde-principal)] shadow-xs'
                        : 'bg-[var(--um-branco)] border-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] hover:border-[var(--um-verde-secundario)]'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            {/* Technicians Grid (Regra 1.3 - Nome Sobrenome, busca sem acento) */}
            <div className="p-4 sm:p-6 bg-[var(--um-fundo)]/50">
              {(() => {
                const sNorm = removerAcentos(searchTecnico);
                const filtered = tecnicos.filter((t) => {
                  const nomeNorm = removerAcentos(t.nome);
                  const matNorm = t.matricula ? t.matricula.trim() : '';
                  const funcaoNorm = removerAcentos(t.funcao || '');
                  const grupoNorm = removerAcentos(t.grupo || classificarGrupoFuncao(t.funcao));

                  const matchesSearch = !sNorm ||
                    nomeNorm.includes(sNorm) ||
                    matNorm.includes(sNorm) ||
                    funcaoNorm.includes(sNorm) ||
                    grupoNorm.includes(sNorm);

                  if (!matchesSearch) return false;
                  if (filterFuncao === 'TODOS') return true;

                  const g = t.grupo || classificarGrupoFuncao(t.funcao);
                  if (filterFuncao === 'OUTROS') {
                    return !['MECÂNICO', 'ELETRICISTA', 'LUBRIFICADOR', 'BORRACHEIRO', 'SOLDADOR', 'INSPETOR', 'AUXILIAR'].includes(g);
                  }
                  return g.toUpperCase() === filterFuncao.toUpperCase();
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-[var(--um-branco)] rounded-2xl border border-[var(--um-cinza-claro)] p-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-[var(--um-fundo)] text-[var(--um-verde-principal)] flex items-center justify-center mx-auto border border-[var(--um-cinza-claro)] shadow-xs">
                        <UserCheck className="w-7 h-7" />
                      </div>
                      <h4 className="text-[16px] font-light text-[var(--um-cinza-escuro)] uppercase">
                        {searchTecnico ? 'Nenhum resultado encontrado' : 'Banco de Cadastro Zerado e Limpo'}
                      </h4>
                      <p className="text-[12px] text-[var(--um-cinza-texto)] max-w-md mx-auto">
                        {searchTecnico
                          ? `Nenhum técnico para "${searchTecnico}". Tente outro termo ou limpe o filtro.`
                          : 'Clique em "Importar Planilha de Efetivo" para carregar a equipe completa com matrícula e cargos oficiais da U&M.'}
                      </p>
                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--um-verde-principal)] text-white text-[12px] font-medium uppercase tracking-wider rounded-xl transition cursor-pointer shadow-xs hover:bg-[var(--um-verde-secundario)]"
                        >
                          <FileSpreadsheet className="w-4 h-4" /> Importar Planilha de Efetivo
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((tec) => {
                      const grupo = tec.grupo || classificarGrupoFuncao(tec.funcao);
                      const isActive = tec.status !== 'inativo';
                      const nomeFormatado = formatarNomeSobrenome(tec.nome);

                      return (
                        <div
                          key={tec.id}
                          className={`bg-[var(--um-branco)] rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                            isActive
                              ? 'border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-principal)]'
                              : 'border-[var(--um-cinza-claro)] opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-medium text-[13px] shrink-0 bg-[var(--um-verde-principal)] text-white">
                                  {nomeFormatado.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-[14px] font-medium text-[var(--um-cinza-escuro)] truncate">
                                    {nomeFormatado}
                                  </h4>
                                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                    <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-[var(--um-fundo)] text-[var(--um-verde-principal)] border border-[var(--um-cinza-claro)]">
                                      {grupo}
                                    </span>
                                    {tec.funcao && tec.funcao !== grupo && (
                                      <span className="text-[10px] text-[var(--um-cinza-texto)] truncate max-w-[140px]" title={tec.funcao}>
                                        ({tec.funcao})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Toggle Ativo/Inativo */}
                              <button
                                type="button"
                                onClick={() => handleToggleTecnicoStatus(tec)}
                                className={`text-[10px] font-medium uppercase px-2 py-1 rounded-lg border transition cursor-pointer shrink-0 ${
                                  isActive
                                    ? 'bg-emerald-50 text-[var(--um-verde-principal)] border-emerald-250 hover:bg-emerald-100'
                                    : 'bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] border-[var(--um-cinza-claro)] hover:bg-gray-200'
                                }`}
                                title="Alternar status ativo/inativo"
                              >
                                {isActive ? '🟢 Ativo' : '⚪ Inativo'}
                              </button>
                            </div>

                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-[var(--um-cinza-texto)] pl-1">
                              {tec.matricula ? (
                                <span className="font-mono">
                                  Matrícula: <strong className="text-[var(--um-cinza-escuro)]">{tec.matricula}</strong>
                                </span>
                              ) : (
                                <span className="italic">Sem matrícula</span>
                              )}
                              {tec.secao && (
                                <span className="truncate max-w-[150px] text-[10px]" title={tec.secao}>
                                  {tec.secao}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-[var(--um-cinza-claro)] flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTecnico(tec)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--um-cinza-texto)] hover:text-[var(--um-verde-principal)] hover:bg-[var(--um-fundo)] rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTecnicoId(tec.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[var(--um-negativo)] hover:bg-[var(--um-negativo)]/10 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="bg-[var(--um-fundo)] border-t border-[var(--um-cinza-claro)] px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--um-cinza-texto)] gap-2">
              <span className="font-medium uppercase tracking-wider text-[10px]">
                Cadastro de Efetivo & Técnicos — U&M Mineração
              </span>
              <span className="text-[10px] text-[var(--um-verde-principal)] font-medium uppercase">
                LGPD: Matrículas e nomes sincronizados no banco do app
              </span>
            </div>

          </div>

        </div>
      )}

      {/* MODAL: CADASTRAR OU EDITAR TÉCNICO */}
      {isTecnicoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-lg w-full overflow-hidden">
            
            <div className="bg-blue-950 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" />
                {editingTecnico ? 'Editar Dados do Técnico' : 'Cadastrar Novo Técnico'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTecnicoModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTecnicoSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nome Completo do Técnico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Roberto Santos"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full px-3.5 py-3 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-800 transition"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Cargo / Função *
                  </label>
                  <select
                    value={formFuncao}
                    onChange={(e) => setFormFuncao(e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-800 uppercase"
                  >
                    <option value="Mecânico">Mecânico</option>
                    <option value="Eletricista">Eletricista</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Auxiliar">Auxiliar</option>
                    <option value="Motorista">Motorista</option>
                    <option value="Líder">Líder</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Matrícula / ID (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 48921"
                    value={formMatricula}
                    onChange={(e) => setFormMatricula(e.target.value)}
                    className="w-full px-3.5 py-3 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-800 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="radio"
                      name="status"
                      value="ativo"
                      checked={formStatus === 'ativo'}
                      onChange={() => setFormStatus('ativo')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Ativo (disponível no relatório)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="radio"
                      name="status"
                      value="inativo"
                      checked={formStatus === 'inativo'}
                      onChange={() => setFormStatus('inativo')}
                      className="text-gray-600 focus:ring-gray-500"
                    />
                    <span>Inativo (oculto)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTecnicoModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formNome.trim()}
                  className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-md"
                >
                  {editingTecnico ? 'Salvar Alterações' : 'Cadastrar Técnico'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE ZERAR TODOS OS TÉCNICOS */}
      {showConfirmClearTecnicos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 uppercase">Zerar Banco de Técnicos</h4>
              <p className="text-xs text-gray-500 mt-1">
                Deseja excluir todos os {tecnicos.length} técnicos cadastrados para começar do zero? Esta ação é definitiva.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearTecnicos(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllTecnicos) onClearAllTecnicos();
                  setShowConfirmClearTecnicos(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer shadow-sm"
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmTecnicoId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 uppercase">Confirmar Exclusão</h4>
              <p className="text-xs text-gray-500 mt-1">
                Deseja realmente excluir este técnico? Ele deixará de aparecer na lista de seleção dos relatórios.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTecnicoId(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTecnico(deleteConfirmTecnicoId);
                  setDeleteConfirmTecnicoId(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE PREVENTIVA */}
      {deleteConfirmPreventiva && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 uppercase">Excluir Preventiva</h4>
              <p className="text-xs text-gray-500 mt-1">
                Deseja remover a parada programada do equipamento <strong className="text-gray-900 font-mono">{deleteConfirmPreventiva.equipamento}</strong>?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPreventiva(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePreventiva(deleteConfirmPreventiva.id);
                  setDeleteConfirmPreventiva(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE ZERAR PREVENTIVAS */}
      {showConfirmClearPreventivas && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 uppercase">Zerar Preventivas</h4>
              <p className="text-xs text-gray-500 mt-1">
                Deseja excluir todas as {preventivas.length} programações de preventiva para começar o planejamento do zero?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearPreventivas(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllPreventivas) onClearAllPreventivas();
                  setShowConfirmClearPreventivas(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer shadow-sm"
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE ZERAR RELATÓRIOS */}
      {showConfirmClearReports && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 uppercase">Zerar Relatórios</h4>
              <p className="text-xs text-gray-500 mt-1">
                Deseja excluir todos os {reports.length} relatórios de turno do banco de dados? Esta ação limpará todo o histórico para começar do zero.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearReports(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAll) onClearAll();
                  setShowConfirmClearReports(false);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer shadow-sm"
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE ZERAR BANCO GERAL */}
      {showConfirmClearAllDatabase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 uppercase">Zerar Banco Geral</h4>
              <p className="text-xs text-gray-500 mt-1">
                Deseja limpar todos os dados do sistema (Relatórios, Preventivas e Técnicos) para iniciar os cadastros do zero absoluto?
              </p>
              <div className="mt-3 text-left">
                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Digite <span className="text-rose-600 font-black">ZERAR TUDO</span> para confirmar:
                </label>
                <input
                  type="text"
                  value={confirmZerarPalavra}
                  onChange={(e) => setConfirmZerarPalavra(e.target.value.toUpperCase())}
                  placeholder="ZERAR TUDO"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-center text-xs font-mono font-black tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmZerarPalavra('');
                  setShowConfirmClearAllDatabase(false);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmZerarPalavra.trim() !== 'ZERAR TUDO'}
                onClick={() => {
                  if (confirmZerarPalavra.trim() === 'ZERAR TUDO') {
                    if (onClearAllDatabase) onClearAllDatabase();
                    setConfirmZerarPalavra('');
                    setShowConfirmClearAllDatabase(false);
                  }
                }}
                className={`px-4 py-2 text-xs font-black uppercase rounded-xl transition shadow-sm ${
                  confirmZerarPalavra.trim() === 'ZERAR TUDO'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

