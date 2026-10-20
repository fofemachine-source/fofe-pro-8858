import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, Trash2, Edit3, Printer, Download, Calendar, 
  Clock, User as UserIcon, AlertTriangle, CheckCircle2, Wrench, FileSpreadsheet, Eye, FileText
} from 'lucide-react';
import { Report } from '../types';
import { formatDate, formatDateTime, printReportAsPDF, downloadReportAsTXT } from './FileActions';
import { getGreetingForTime } from '../lib/greetings';

export function getResponsibleLabelAndName(report: Report) {
  if (report.tecnicoNome && report.tecnicoNome.trim() !== '') {
    return { 
      label: 'TÉCNICO RESPONSÁVEL', 
      name: report.tecnicoNome 
    };
  }
  if (report.eletricista && report.eletricista.trim() !== '') {
    return { label: 'TÉCNICO RESPONSÁVEL', name: report.eletricista };
  }
  if (report.mecanico && report.mecanico.trim() !== '') {
    return { label: 'TÉCNICO RESPONSÁVEL', name: report.mecanico };
  }
  if (report.monitor && report.monitor.trim() !== '') {
    return { label: 'TÉCNICO RESPONSÁVEL', name: report.monitor };
  }
  if (report.auxiliar && report.auxiliar.trim() !== '') {
    return { label: 'TÉCNICO RESPONSÁVEL', name: report.auxiliar };
  }
  if (report.motorista && report.motorista.trim() !== '') {
    return { label: 'TÉCNICO RESPONSÁVEL', name: report.motorista };
  }
  return { label: 'TÉCNICO RESPONSÁVEL', name: '—' };
}

interface ReportCardAccordionProps {
  key?: string | number;
  report: Report;
  onDelete: (id: string) => void;
  onContinue?: (report: Report) => void; // Optional: triggers for draft editing
  showActions?: boolean;
  canDelete?: boolean;
}

export function ReportCardAccordion({ report, onDelete, onContinue, showActions = true, canDelete = false }: ReportCardAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isDraft = report.status === 'RASCUNHO';
  const isPendingSync = report.status === 'PENDENTE_SINCRONIZACAO';
  const isSyncing = report.status === 'SINCRONIZANDO';
  const isErrorSync = report.status === 'ERRO_SINCRONIZACAO';
  const isSent = report.status === 'ENVIADO';

  let borderBgClass = 'border-gray-200 hover:border-emerald-500 hover:shadow-xs';
  if (isExpanded) {
    borderBgClass = 'border-emerald-700 shadow-md ring-1 ring-emerald-750/10';
  } else if (isPendingSync) {
    borderBgClass = 'border-blue-200 hover:border-blue-450 bg-blue-50/5';
  } else if (isSyncing) {
    borderBgClass = 'border-purple-200 hover:border-purple-400 bg-purple-50/5 animate-pulse';
  } else if (isErrorSync) {
    borderBgClass = 'border-red-200 hover:border-red-400 bg-red-50/5';
  } else if (isDraft) {
    borderBgClass = 'border-amber-200 hover:border-amber-400 bg-amber-50/5';
  } else if (isSent) {
    borderBgClass = 'border-emerald-250 hover:border-emerald-500 bg-emerald-50/5';
  }

  let badgeClass = 'bg-emerald-50 border-emerald-150 text-emerald-800';
  let badgeLabel = 'Sincronizado';

  if (isDraft) {
    badgeClass = 'bg-amber-50 border-amber-250 text-amber-700';
    badgeLabel = 'Rascunho';
  } else if (isPendingSync) {
    badgeClass = 'bg-blue-50 border-blue-250 text-blue-700 font-extrabold';
    badgeLabel = 'Pendente Sincronização';
  } else if (isSyncing) {
    badgeClass = 'bg-purple-50 border-purple-250 text-purple-750 font-black animate-pulse';
    badgeLabel = 'Sincronizando...';
  } else if (isErrorSync) {
    badgeClass = 'bg-red-50 border-red-250 text-red-750 font-extrabold pb-0.5';
    badgeLabel = 'Erro de Sincronização';
  } else if (isSent) {
    badgeClass = 'bg-emerald-50 border-emerald-150 text-emerald-800';
    badgeLabel = 'Sincronizado';
  }

  // Toggle expansion
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${borderBgClass}`}
    >
      {/* CARD FECHADO / HEADER AREA */}
      <div 
        onClick={toggleExpanded}
        className="p-4 sm:p-5 cursor-pointer select-none flex justify-between items-center gap-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: Status Indicator, Date */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-lg border tracking-wider flex items-center gap-1 ${badgeClass}`}>
              {isSyncing && <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />}
              <span>{badgeLabel}</span>
            </span>
            <span className="text-[11px] text-gray-400 font-bold tracking-wide font-mono">
              {formatDate(report.dateStart)} a {formatDate(report.dateEnd)}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">
              ({report.shift})
            </span>
          </div>

          {/* Details layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-xs">
            <div>
              <span className="text-gray-450 font-bold uppercase text-[9px] block">
                {getResponsibleLabelAndName(report).label}
              </span>
              <span className="font-extrabold text-gray-800 text-[13px]">
                {getResponsibleLabelAndName(report).name}
              </span>
            </div>
            <div>
              <span className="text-gray-450 font-bold uppercase text-[9px] block">Turma / Frente</span>
              <span className="font-black text-emerald-955 uppercase">
                Turma {report.team} — {report.frente}
              </span>
            </div>
            <div className="flex gap-4">
              <div>
                <span className="text-gray-450 font-bold uppercase text-[9px] block">Equipamentos</span>
                <span className="font-bold text-gray-700">{report.atendimentos.length} atend.</span>
              </div>
              <div>
                <span className="text-gray-450 font-bold uppercase text-[9px] block">Pendências</span>
                <span className={`font-bold ${report.pendencias.length > 0 ? 'text-amber-700 font-extrabold' : 'text-gray-450'}`}>
                  {report.pendencias.length} pend.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right operations: Continue, Delete, Expand Arrow */}
        <div 
          className="flex items-center gap-2 sm:gap-3 shrink-0"
          onClick={(e) => e.stopPropagation()} // Prevent double triggers
        >
          {/* Stats boxes matching referenced layout */}
          <div className="hidden xs:flex items-center gap-1.5 pr-1 text-center">
            <div className="bg-gray-50 border border-gray-150 px-2.5 py-1.5 rounded-xl">
              <span className="block text-[9px] text-gray-450 font-black uppercase leading-none">PENDÊNCIAS</span>
              <span className="block text-xs font-black text-gray-800 leading-none mt-0.5">{report.pendencias.length}</span>
            </div>
            
            <div className="bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-xl">
              <span className="block text-[9px] text-rose-500 font-black uppercase leading-none">EQUIPAMENTOS</span>
              <span className="block text-xs font-black text-rose-600 leading-none mt-0.5">{report.atendimentos.length}</span>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-1.5">
              {/* CONTINUAR option (only if rascunho/pendente/erro and onContinue handler is available) */}
              {(isDraft || isPendingSync || isErrorSync) && onContinue && (
                <>
                  <span className="hidden xs:inline text-gray-200">|</span>
                  <button
                    onClick={() => onContinue(report)}
                    className="h-10 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/20 active:scale-95 text-center shrink-0"
                    title="Continuar preenchendo rascunho"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CONTINUAR</span>
                  </button>
                </>
              )}

              {/* EXCLUIR option */}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 bg-rose-50 hover:bg-rose-100/80 text-rose-600 hover:text-rose-700 rounded-xl transition cursor-pointer"
                  title="Excluir relatório permanentemente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Seta de Expandir */}
          <button
            onClick={toggleExpanded}
            className={`p-2 bg-gray-100 hover:bg-gray-200 text-gray-650 hover:text-gray-850 rounded-xl transition cursor-pointer shrink-0`}
            aria-label={isExpanded ? 'Recolher Card' : 'Expandir Card'}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-emerald-800 border-none" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-500 border-none" />
            )}
          </button>
        </div>
      </div>

      {/* CARD EXPANDIDO / DETAILS CONTAINER */}
      {isExpanded && (
        <div className="border-t border-gray-150 bg-gray-55/70 p-4 sm:p-6 animate-slide-down select-text">
          
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Quick Actions inside expanded view like PDF and TXT download (Very clean, kept simple) */}
            <div className="flex justify-end gap-2 border-b border-gray-200 pb-3">
              <button
                onClick={() => printReportAsPDF(report)}
                className="px-3 py-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-gray-700 font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Imprimir ou salvar PDF oficial"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-900" />
                <span>Imprimir PDF</span>
              </button>
              
              <button
                onClick={() => downloadReportAsTXT(report)}
                className="px-3 py-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-gray-700 font-bold text-[11px] uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Baixar em formato Bloco de Notas (TXT)"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Exportar TXT</span>
              </button>
            </div>

            {/* DOCUMENT FORMAT FOR RECONSTRUCTION */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 font-mono text-xs text-gray-800 leading-relaxed whitespace-pre-wrap shadow-xs">
              <h4 className="text-center font-black text-sm text-gray-900 tracking-wider mb-6 border-b-2 border-dashed border-gray-300 pb-2">
                RELATÓRIO DE MANUTENÇÃO
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 font-mono">
                <div>Turma: <span className="font-bold text-gray-950">{report.team}</span></div>
                <div>Horário: <span className="font-bold text-gray-950">{report.shift}</span></div>
                <div>Data: <span className="font-bold text-gray-950">{formatDate(report.dateStart)} a {formatDate(report.dateEnd)}</span></div>
                <div>Frente: <span className="font-bold text-emerald-900 font-mono">FRENTE {report.frente}</span></div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-150">
                <span className="font-bold text-gray-500 uppercase tracking-widest text-[9px] block mb-2">Equipe Técnica Mobilizada</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {report.monitor && (
                    <div>Monitor: <strong className="text-emerald-900 font-sans">{report.monitor}</strong></div>
                  )}
                  <div>Eletricista: <strong className="text-gray-900 font-sans">{report.eletricista || '—'}</strong></div>
                  <div>Mecânico: <strong className="text-gray-900 font-sans">{report.mecanico || '—'}</strong></div>
                  <div>Auxiliar: <strong className="text-gray-900 font-sans">{report.auxiliar || '—'}</strong></div>
                  <div>Motorista: <strong className="text-gray-900 font-sans">{report.motorista || '—'}</strong></div>
                </div>
              </div>

              <div className="my-6 border-t border-gray-300"></div>

              {/* ATENDIMENTOS / EQUIPAMENTOS */}
              <div className="font-black text-emerald-900 border-b border-gray-300 pb-1 mb-4 uppercase tracking-wider text-[11px]">
                EQUIPAMENTOS ATENDIDOS ({report.atendimentos.length})
              </div>

              {report.atendimentos && report.atendimentos.length > 0 ? (
                report.atendimentos.map((at, idx) => (
                  <div key={at.id} className="mb-6 space-y-3 border-b border-dashed border-gray-150 pb-5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center text-sm font-black text-gray-950 border-b border-gray-150 pb-1 font-mono uppercase">
                      <span>{idx + 1}. {at.equipamento || 'SEM IDENTIFICAÇÃO'}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div><strong>OM:</strong> {at.om || '—'}</div>
                      <div><strong>Horímetro:</strong> {at.horimetro || '—'}</div>
                    </div>
                    
                    <div className="space-y-2 mt-2">
                      <div>
                        <div className="font-bold text-gray-400 uppercase text-[9px]">Sintoma:</div>
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-800 font-sans mt-0.5 whitespace-normal">
                          {at.sintoma || 'Não informado'}
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-gray-400 uppercase text-[9px]">Causa:</div>
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-800 font-sans mt-0.5 whitespace-normal">
                          {at.causa || 'Não informado'}
                        </div>
                      </div>

                      <div>
                        <div className="font-bold text-gray-400 uppercase text-[9px]">Ação:</div>
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-800 font-sans mt-0.5 whitespace-normal">
                          {at.acaoExecutada || 'Não informado'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 font-mono">
                      <div>Início: <strong className="text-gray-950">{at.horaInicio || '—'}</strong></div>
                      <div>Fim: <strong className="text-gray-950">{at.horaFim || '—'}</strong></div>
                    </div>

                    <div className="text-xs pt-1">
                      Atuantes: <strong className="text-gray-950 font-sans">{at.atuantes || '—'}</strong>
                    </div>

                    {at.previsaoLiberacao && (
                      <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-[11px] font-mono font-bold text-amber-900 flex items-center gap-1.5 mt-2">
                        <span>⏰ PREVISÃO DE LIBERAÇÃO:</span>
                        <span className="text-gray-950 font-sans text-[11px] font-bold">{formatDateTime(at.previsaoLiberacao)}</span>
                      </div>
                    )}

                    {((at.photoUrls && at.photoUrls.length > 0) ? at.photoUrls : (at.photoUrl ? [at.photoUrl] : [])).length > 0 && (
                      <div className="pt-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wide">Fotos Evidências (clique para ampliar):</p>
                        
                        <div className="flex flex-wrap gap-2.5">
                          {((at.photoUrls && at.photoUrls.length > 0) ? at.photoUrls : (at.photoUrl ? [at.photoUrl] : [])).map((picUrl, picIdx) => {
                            if (!picUrl) return null;
                            if (picUrl === 'LTM_CACHED_IN_INDEXEDDB_OR_API') {
                              return (
                                <div key={picIdx} className="inline-flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-gray-550 font-medium">
                                  <Eye className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                                  <span>Foto salva localmente no dispositivo.</span>
                                </div>
                              );
                            }
                            return (
                              <div 
                                key={picIdx}
                                onClick={() => setZoomedImage(picUrl || null)}
                                className="relative inline-block cursor-zoom-in border border-gray-250 rounded-2xl overflow-hidden hover:opacity-90 transition active:scale-[0.98] shadow-xs"
                              >
                                <img 
                                  src={picUrl} 
                                  alt={`Visualização da evidência de manutenção ${picIdx + 1}`} 
                                  className="h-28 w-28 sm:h-32 sm:w-32 object-cover object-center"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-center text-white text-[8px] font-bold uppercase tracking-wider">
                                  Foto {picIdx + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400 italic font-mono">
                  Nenhum atendimento cadastrado neste turno.
                </div>
              )}

              {/* PENDÊNCIAS */}
              <div className="font-black text-amber-800 border-b-2 border-dashed border-gray-300 pb-1 mt-6 mb-3 uppercase tracking-wider text-[11px]">
                PENDÊNCIAS EXECUTIVAS
              </div>
              
              {report.pendencias && report.pendencias.length > 0 ? (
                report.pendencias.map((p, pIdx) => (
                  <div key={p.id} className="mb-4 space-y-1.5 border-b border-gray-150 pb-3 last:border-0 last:pb-0 font-mono">
                    <div className="font-extrabold text-amber-955 uppercase">{pIdx + 1}. {p.equipamento || 'SEM IDENTIFICAÇÃO'}</div>
                    <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200 text-amber-950 font-sans whitespace-normal leading-relaxed">
                      {p.descricao}
                    </div>
                    {p.previsaoLiberacao && (
                      <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-[11px] font-mono font-bold text-amber-900 flex items-center gap-1.5 mt-1.5">
                        <span>⏰ PREVISÃO DE LIBERAÇÃO:</span>
                        <span className="text-gray-950 font-sans text-[11px] font-bold">{formatDateTime(p.previsaoLiberacao)}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-gray-450 italic text-center py-2 font-mono">
                  Nenhuma pendência cadastrada.
                </div>
              )}

              {/* OBSERVAÇÕES GERAIS */}
              {report.observacoesGerais && (
                <>
                  <div className="font-black text-indigo-900 border-b border-gray-300 pb-1 mt-6 mb-2 uppercase tracking-wider text-[11px]">
                    OBSERVAÇÕES GERAIS DO PLANTÃO
                  </div>
                  <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-xl text-slate-805 font-sans whitespace-normal max-w-full">
                    {report.observacoesGerais}
                  </div>
                </>
              )}


            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX SIMPLE ZOOM MODAL OVERLAY */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-4 md:p-6 cursor-zoom-out select-none animate-in fade-in duration-200"
        >
          <button 
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all active:scale-90"
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

      {/* Modal de confirmação de exclusão do relatório */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-250 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-gray-900 uppercase">Excluir Relatório</h4>
              <p className="text-xs text-gray-500 mt-1">
                Deseja realmente apagar este relatório ({report.team} — {report.frente})? Esta ação é definitiva e removerá os dados em todos os aparelhos.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete(report.id);
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-black uppercase rounded-xl transition cursor-pointer shadow-md shadow-rose-600/30"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
