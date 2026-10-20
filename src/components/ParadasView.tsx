import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, AlertTriangle, Plus, Search, Filter, Download, ArrowRight,
  ChevronRight, Calendar, User, Wrench, Shield, CheckCircle2, History,
  Edit2, Trash2, Split, Eye, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { Parada, Segmento, ResponsavelClasse, User as UserType, Report, FalhaCatalogada, Equipamento } from '../types';
import { CODIGOS_VALE_FLAT, buscarCodigoVale, getFuncaoResponsavelSugerida } from '../data/codigosVale';
import { formatarFalhaCard, formatarFalhaDetalhe } from '../data/catalogoFalhas';
import { ModalAbrirParada } from './ModalAbrirParada';
import { UEM_THEME, getResponsabilidadeStyle } from '../theme/uEmTheme';
import { 
  criarNovaParada, 
  aplicarNovoStatus, 
  inserirSegmentoNoPassado, 
  excluirSegmento, 
  encerrarParada, 
  reabrirParada, 
  calcularHorasPorResponsavel, 
  calcularDuracaoTotalParadaMinutos,
  getSegmentoAtual,
  formatarMinutosEmHorasEMinutos
} from '../lib/paradasEngine';
import { 
  formatarDuracaoHorasMinutos, 
  formatarDataHoraPtBr, 
  formatarHoraPtBr, 
  normalizarTag, 
  derivarFrenteDaTag, 
  removerAcentos 
} from '../lib/uEmDataUtils';
import * as XLSX from 'xlsx';

interface ParadasViewProps {
  paradas: Parada[];
  onSaveParada: (parada: Parada) => void;
  onDeleteParada: (id: string) => void;
  currentUser: UserType;
  reports?: Report[];
  isTvMode?: boolean;
  equipamentos?: Equipamento[];
}

export function ParadasView({
  paradas,
  onSaveParada,
  onDeleteParada,
  currentUser,
  reports = [],
  isTvMode = false,
  equipamentos = []
}: ParadasViewProps) {
  // Relógio com atualização a cada 30 segundos (Regra 3.2)
  const [agoraMs, setAgoraMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setAgoraMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Modais
  const [modalNovaParada, setModalNovaParada] = useState(false);
  const [modalQuickStatus, setModalQuickStatus] = useState<{ parada: Parada; codigoPreSelecionado: string } | null>(null);
  const [modalBuscaVale, setModalBuscaVale] = useState<{ parada?: Parada; onSelect?: (cod: string) => void } | null>(null);
  const [paradaSelecionada, setParadaSelecionada] = useState<Parada | null>(null);
  const [modalInserirPassado, setModalInserirPassado] = useState<Parada | null>(null);
  const [showAuditoriaModal, setShowAuditoriaModal] = useState<Parada | null>(null);

  // Filtros de visualização da aba
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroFrente, setFiltroFrente] = useState<string>('TODAS');
  const [filtroSituacao, setFiltroSituacao] = useState<'TODAS' | 'ABERTA' | 'ENCERRADA'>('ABERTA');
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>('TODOS');

  // Ordena paradas: abertas com maior tempo parado primeiro
  const paradasOrdenadas = useMemo(() => {
    return [...paradas].sort((a, b) => {
      if (a.situacao === 'ABERTA' && b.situacao !== 'ABERTA') return -1;
      if (b.situacao === 'ABERTA' && a.situacao !== 'ABERTA') return 1;
      const durA = calcularDuracaoTotalParadaMinutos(a, agoraMs);
      const durB = calcularDuracaoTotalParadaMinutos(b, agoraMs);
      return durB - durA;
    });
  }, [paradas, agoraMs]);

  // Filtragem
  const paradasFiltradas = useMemo(() => {
    return paradasOrdenadas.filter((p) => {
      if (filtroSituacao !== 'TODAS' && p.situacao !== filtroSituacao) return false;
      if (filtroFrente !== 'TODAS' && p.frente !== filtroFrente) return false;
      
      const segAtual = getSegmentoAtual(p);
      if (filtroResponsavel !== 'TODOS' && segAtual.responsavel !== filtroResponsavel) return false;

      if (filtroTexto.trim()) {
        const txt = removerAcentos(filtroTexto);
        const matchTag = removerAcentos(p.tag).includes(txt);
        const matchCod = removerAcentos(segAtual.codigo).includes(txt);
        const matchNome = removerAcentos(segAtual.nome).includes(txt);
        const matchOS = p.numeroOS ? removerAcentos(p.numeroOS).includes(txt) : false;
        if (!matchTag && !matchCod && !matchNome && !matchOS) return false;
      }
      return true;
    });
  }, [paradasOrdenadas, filtroSituacao, filtroFrente, filtroResponsavel, filtroTexto, agoraMs]);

  // Totais por responsável das paradas abertas
  const resumoHorasAbertas = useMemo(() => {
    const totais: Record<ResponsavelClasse, number> = {
      MANUTENCAO: 0,
      PRODUCAO: 0,
      VALE: 0,
      EXTERNO: 0,
      ACIDENTE: 0,
      A_DEFINIR: 0
    };
    let minutosGerais = 0;

    paradas.filter(p => p.situacao === 'ABERTA').forEach(p => {
      const respTotais = calcularHorasPorResponsavel(p, agoraMs);
      (Object.keys(respTotais) as ResponsavelClasse[]).forEach(k => {
        totais[k] += respTotais[k];
        minutosGerais += respTotais[k];
      });
    });

    return { totais, minutosGerais };
  }, [paradas, agoraMs]);

  // Exportar Excel/CSV com uma linha por segmento (Regra 3.4 g)
  const handleExportarRelatorio = () => {
    const dadosLinhas: any[] = [];

    paradas.forEach((p) => {
      const durTotalMin = calcularDuracaoTotalParadaMinutos(p, agoraMs);
      p.segmentos.forEach((seg, sIdx) => {
        const sIniMs = new Date(seg.inicio).getTime();
        const sFimMs = seg.fim ? new Date(seg.fim).getTime() : agoraMs;
        const durSegMin = Math.max(0, Math.round((sFimMs - sIniMs) / 60000));

        dadosLinhas.push({
          'ID Parada': p.id,
          'TAG Equipamento': p.tag,
          'Frente Operacional': p.frente,
          'Situação Parada': p.situacao,
          'Início da Parada': formatarDataHoraPtBr(p.inicioParada),
          'Fim da Parada': p.fimParada ? formatarDataHoraPtBr(p.fimParada) : 'EM ANDAMENTO',
          'Tempo Total Parado (h)': formatarDuracaoHorasMinutos(durTotalMin),
          'Ordem de serviço': p.ordemServico || p.numeroOS || '—',
          'Perfil': p.falha?.perfil || '',
          'Sistema': p.falha ? `${p.falha.sistema.codigo} - ${p.falha.sistema.nome}` : '',
          'Componente': p.falha ? `${p.falha.componente.codigo} - ${p.falha.componente.nome}` : '',
          'Sintoma': p.falha ? `${p.falha.sintoma.codigo} - ${p.falha.sintoma.nome}` : (p.sintomaInicial || ''),
          'Código Completo': p.falha?.codigoCompleto || '',
          'Seq': sIdx + 1,
          'Código Vale': seg.codigo,
          'Descrição Status': seg.nome,
          'Tipo (EXEC/AG)': seg.situacao,
          'Classe Responsável': seg.responsavel,
          'Função Responsável': seg.responsavelFuncao,
          'Início Segmento': formatarDataHoraPtBr(seg.inicio),
          'Fim Segmento': seg.fim ? formatarDataHoraPtBr(seg.fim) : 'ATUAL',
          'Duração Segmento': formatarDuracaoHorasMinutos(durSegMin),
          'Complemento': seg.complemento || '',
          'Origem': seg.origem,
          'Editado Por': seg.editadoPor || ''
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(dadosLinhas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Paradas e Segmentos Vale');
    XLSX.writeFile(workbook, `UEM_Controle_Paradas_Vale_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Botões rápidos definidos na Regra 3.4 b
  const ATALHOS_RAPIDOS = [
    { label: 'AG. TÉCNICO', codigo: 'HMC 9130' },
    { label: 'EM MANUTENÇÃO', codigo: 'HMC 9000' },
    { label: 'AG. OPERAÇÃO', codigo: 'HMC 9120' },
    { label: 'AG. PEÇAS', codigo: 'HMC 9118' },
    { label: 'AG. ACESSO', codigo: 'HMC 9115' },
    { label: 'AG. PTS', codigo: 'HMC 9135' },
    { label: 'AG. MAU TEMPO', codigo: 'HMC 9126' },
    { label: 'LIBERADO P/ PROD', codigo: 'HOI 5936' },
  ];

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO BLOCO DE PARADAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--um-negativo)] animate-ping" />
            <h2 className="text-[18px] font-light uppercase tracking-wide text-[var(--um-verde-principal)]">
              Controle de Parada Real & Tempo por Responsável (Códigos Vale)
            </h2>
          </div>
          <p className="text-[12px] text-[var(--um-cinza-texto)] mt-1">
            Monitoramento de equipamentos parados de fato, tempo por situação e prestação de contas de horas com a Vale.
          </p>
        </div>

        {!isTvMode && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setModalNovaParada(true)}
              className="px-4 py-2.5 bg-[var(--um-verde-principal)] text-[var(--um-branco)] text-[12px] font-medium uppercase tracking-wider rounded-xl cursor-pointer hover:bg-[var(--um-verde-secundario)] flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> + Abrir Parada
            </button>
            <button
              onClick={() => setModalBuscaVale({})}
              className="px-3.5 py-2.5 bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)] text-[12px] font-medium rounded-xl cursor-pointer hover:border-[var(--um-verde-principal)] flex items-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4 text-[var(--um-cinza-texto)]" /> Códigos Vale
            </button>
            <button
              onClick={handleExportarRelatorio}
              className="px-3.5 py-2.5 bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)] text-[12px] font-medium rounded-xl cursor-pointer hover:border-[var(--um-verde-principal)] flex items-center gap-2 transition-colors"
              title="Exportar planilha Excel de todas as paradas e segmentos"
            >
              <Download className="w-4 h-4 text-[var(--um-cinza-texto)]" /> Exportar Planilha
            </button>
          </div>
        )}
      </div>

      {/* CARDS DE RESUMO POR RESPONSÁVEL (REGRA 3.4 a & f) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(UEM_THEME.responsabilidade) as ResponsavelClasse[]).map((rKey) => {
          const cfg = UEM_THEME.responsabilidade[rKey];
          const min = resumoHorasAbertas.totais[rKey] || 0;
          const pct = resumoHorasAbertas.minutosGerais > 0 
            ? Math.round((min / resumoHorasAbertas.minutosGerais) * 100) 
            : 0;

          return (
            <div 
              key={rKey} 
              className="bg-[var(--um-branco)] border rounded-xl p-3.5 shadow-xs transition-all"
              style={{ borderColor: cfg.borda }}
            >
              <div className="flex items-center justify-between">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: cfg.cor }} 
                />
                <span className="text-[10px] font-mono font-medium text-[var(--um-cinza-texto)]">
                  {pct}%
                </span>
              </div>
              <div className="mt-2">
                <p className="text-[11px] uppercase tracking-wider font-medium text-[var(--um-cinza-texto)] truncate">
                  {cfg.nome}
                </p>
                <p className="text-[20px] font-light text-[var(--um-cinza-escuro)] mt-0.5" style={{ color: cfg.cor }}>
                  {formatarDuracaoHorasMinutos(min)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FILTROS DA LISTA */}
      {!isTvMode && (
        <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--um-cinza-texto)] ml-2" />
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Buscar por TAG, código, OS ou status..."
              className="w-full px-2 py-1.5 bg-transparent text-[13px] text-[var(--um-cinza-escuro)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Situação */}
            <div className="flex items-center border border-[var(--um-cinza-claro)] rounded-lg p-0.5 bg-[var(--um-fundo)]">
              {(['ABERTA', 'ENCERRADA', 'TODAS'] as const).map((sit) => (
                <button
                  key={sit}
                  onClick={() => setFiltroSituacao(sit)}
                  className={`px-3 py-1 text-[11px] font-medium uppercase tracking-wider rounded-md cursor-pointer transition-colors ${
                    filtroSituacao === sit
                      ? 'bg-[var(--um-verde-principal)] text-[var(--um-branco)]'
                      : 'text-[var(--um-cinza-texto)] hover:text-[var(--um-cinza-escuro)]'
                  }`}
                >
                  {sit === 'ABERTA' ? 'Paradas Agora' : sit === 'ENCERRADA' ? 'Encerradas' : 'Todas'}
                </button>
              ))}
            </div>

            {/* Filtro Frente */}
            <select
              value={filtroFrente}
              onChange={(e) => setFiltroFrente(e.target.value)}
              className="px-3 py-1.5 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[11px] font-medium uppercase text-[var(--um-cinza-escuro)] cursor-pointer"
            >
              <option value="TODAS">Frente: Todas</option>
              <option value="EH">EH (Escavadeiras)</option>
              <option value="CR">CR (Caminhões)</option>
              <option value="PF">PF (Perfuratrizes)</option>
              <option value="INFRA">INFRA (Infraestrutura)</option>
            </select>

            {/* Filtro Responsável */}
            <select
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              className="px-3 py-1.5 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[11px] font-medium uppercase text-[var(--um-cinza-escuro)] cursor-pointer"
            >
              <option value="TODOS">Resp: Todos</option>
              <option value="MANUTENCAO">Manutenção</option>
              <option value="PRODUCAO">Produção</option>
              <option value="VALE">Vale</option>
              <option value="EXTERNO">Externo</option>
              <option value="ACIDENTE">Acidente</option>
              <option value="A_DEFINIR">A Definir</option>
            </select>
          </div>
        </div>
      )}

      {/* GRID DE CARDS: EQUIPAMENTOS PARADOS AGORA (REGRA 3.4 a) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {paradasFiltradas.length === 0 ? (
          <div className="col-span-full bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] p-12 rounded-2xl text-center">
            <CheckCircle2 className="w-10 h-10 text-[var(--um-verde-principal)] mx-auto mb-3" />
            <h3 className="text-[16px] font-light uppercase text-[var(--um-verde-principal)]">
              Nenhum equipamento parado no filtro atual
            </h3>
            <p className="text-[12px] text-[var(--um-cinza-texto)] mt-1">
              Todos os equipamentos cadastrados estão operando normalmente ou não atendem aos filtros.
            </p>
          </div>
        ) : (
          paradasFiltradas.map((parada) => {
            const segAtual = getSegmentoAtual(parada);
            const respStyle = getResponsabilidadeStyle(segAtual.responsavel);
            const durTotalMin = calcularDuracaoTotalParadaMinutos(parada, agoraMs);
            const segIniMs = new Date(segAtual.inicio).getTime();
            const durSegAtualMin = Math.max(0, Math.round((agoraMs - segIniMs) / 60000));
            const respTotais = calcularHorasPorResponsavel(parada, agoraMs);

            // Relatórios de técnicos ligados
            const reportsLigados = reports.filter(r => (parada.relatorioIds || []).includes(r.id) || r.atendimentos.some(at => normalizarTag(at.equipamento) === parada.tag));

            return (
              <div
                key={parada.id}
                className={`bg-[var(--um-branco)] border rounded-2xl p-5 shadow-xs transition-all relative flex flex-col justify-between ${
                  parada.situacao === 'ENCERRADA'
                    ? 'border-[var(--um-cinza-claro)] opacity-85'
                    : 'border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-principal)]'
                }`}
              >
                <div>
                  {/* CABEÇALHO DO CARD: TAG + FRENTE + TEMPO TOTAL */}
                  <div className="flex items-start justify-between pb-3 border-b border-[var(--um-cinza-claro)]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-light text-[22px] tracking-wide text-[var(--um-verde-principal)]">
                          {parada.tag}
                        </span>
                        <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] border border-[var(--um-cinza-claro)]">
                          {parada.frente}
                        </span>
                        {parada.situacao === 'ENCERRADA' && (
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-[var(--um-verde-principal)] text-[var(--um-branco)]">
                            ENCERRADA
                          </span>
                        )}
                      </div>
                      {(parada.ordemServico || parada.numeroOS) && (
                        <p className="text-[11px] font-mono text-[var(--um-cinza-texto)] mt-0.5">
                          Ordem de serviço: {parada.ordemServico || parada.numeroOS}
                        </p>
                      )}
                      {formatarFalhaCard(parada.falha, parada.sintomaInicial) && (
                        <p className="text-[12px] font-bold text-[var(--um-cinza-escuro)] mt-1 flex items-center gap-1.5 flex-wrap">
                          {parada.falha?.codigoCompleto && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--um-verde-principal)]/10 text-[var(--um-verde-principal)] border border-[var(--um-verde-principal)]/20">
                              {parada.falha.codigoCompleto}
                            </span>
                          )}
                          <span>{formatarFalhaCard(parada.falha, parada.sintomaInicial)}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--um-cinza-texto)]">
                        {parada.situacao === 'ENCERRADA' ? 'Tempo total' : 'Parado há'}
                      </p>
                      <p className="text-[22px] font-light text-[var(--um-negativo)] leading-tight">
                        {formatarDuracaoHorasMinutos(durTotalMin)}
                      </p>
                    </div>
                  </div>

                  {/* STATUS ATUAL COM COR DO RESPONSÁVEL */}
                  <div className="my-3.5 p-3 rounded-xl border" style={{ backgroundColor: respStyle.fundo, borderColor: respStyle.borda }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: respStyle.cor }} />
                        <span className="text-[13px] font-medium tracking-wide truncate" style={{ color: respStyle.texto }}>
                          {segAtual.codigo} {segAtual.nome} há {formatarMinutosEmHorasEMinutos(durSegAtualMin)}
                          {parada.emAtendimentoPor ? ` · Em atendimento por ${parada.emAtendimentoPor.tecnicoPrincipal.nome}` : ''}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-medium shrink-0" style={{ color: respStyle.texto }}>
                        há {formatarMinutosEmHorasEMinutos(durSegAtualMin)}
                      </span>
                    </div>

                    {/* Indicador de técnico em atendimento conforme Critério de Aceite */}
                    {parada.emAtendimentoPor && (
                      <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-medium" style={{ color: respStyle.texto }}>
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Em atendimento por <strong>{parada.emAtendimentoPor.tecnicoPrincipal.nome}</strong> desde {formatarHoraPtBr(parada.emAtendimentoPor.inicioAtendimento)}
                          </span>
                        </span>
                        {parada.emAtendimentoPor.membrosEquipe && parada.emAtendimentoPor.membrosEquipe.length > 0 && (
                          <span className="text-[10px] opacity-80">(+{parada.emAtendimentoPor.membrosEquipe.length} na equipe)</span>
                        )}
                      </div>
                    )}

                    <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: respStyle.texto }}>
                      <span className="font-medium uppercase tracking-wider">
                        Resp: {respStyle.nome}
                      </span>
                      <span className="truncate ml-2 text-right opacity-90">
                        {segAtual.responsavelFuncao}
                      </span>
                    </div>

                    {segAtual.complemento && (
                      <p className="text-[10px] mt-1 pt-1 border-t border-black/5 italic" style={{ color: respStyle.texto }}>
                        Obs: {segAtual.complemento}
                      </p>
                    )}
                  </div>

                  {/* BARRA HORIZONTAL DA LINHA DO TEMPO (REGRA 3.4 a) */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] text-[var(--um-cinza-texto)] mb-1">
                      <span>Linha do tempo da parada</span>
                      <span>{parada.segmentos.length} período(s)</span>
                    </div>
                    <div className="h-3 w-full bg-[var(--um-cinza-claro)] rounded-full flex overflow-hidden cursor-pointer" title="Clique no card para abrir histórico completo">
                      {parada.segmentos.map((seg, sIdx) => {
                        const sIni = new Date(seg.inicio).getTime();
                        const sFim = seg.fim ? new Date(seg.fim).getTime() : agoraMs;
                        const sMin = Math.max(1, Math.round((sFim - sIni) / 60000));
                        const pct = durTotalMin > 0 ? (sMin / durTotalMin) * 100 : 100;
                        const segRespStyle = getResponsabilidadeStyle(seg.responsavel);

                        return (
                          <div
                            key={seg.id || sIdx}
                            style={{ width: `${Math.max(2, pct)}%`, backgroundColor: segRespStyle.cor }}
                            className="h-full border-r border-white/30 last:border-r-0 hover:opacity-80 transition-opacity"
                            title={`${seg.codigo} ${seg.nome} (${segRespStyle.nome}): ${formatarDuracaoHorasMinutos(sMin)}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* MINI-RESUMO POR RESPONSÁVEL (REGRA 3.4 a) */}
                  <div className="bg-[var(--um-fundo)] p-2 rounded-lg text-[10px] text-[var(--um-cinza-texto)] flex items-center justify-between flex-wrap gap-1 mb-3">
                    <span>Manut: <strong className="text-[var(--um-cinza-escuro)]">{formatarDuracaoHorasMinutos(respTotais.MANUTENCAO)}</strong></span>
                    <span>·</span>
                    <span>Prod: <strong className="text-[var(--um-cinza-escuro)]">{formatarDuracaoHorasMinutos(respTotais.PRODUCAO)}</strong></span>
                    <span>·</span>
                    <span>Vale: <strong className="text-[var(--um-cinza-escuro)]">{formatarDuracaoHorasMinutos(respTotais.VALE)}</strong></span>
                    <span>·</span>
                    <span>Ext: <strong className="text-[var(--um-cinza-escuro)]">{formatarDuracaoHorasMinutos(respTotais.EXTERNO)}</strong></span>
                    {respTotais.A_DEFINIR > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--um-alerta-escuro)] font-medium">A Def: {formatarDuracaoHorasMinutos(respTotais.A_DEFINIR)}</span>
                      </>
                    )}
                  </div>

                  {/* TÉCNICOS LIGADOS E PREVISÃO DE LIBERAÇÃO */}
                  <div className="text-[11px] text-[var(--um-cinza-texto)] space-y-1 mb-4">
                    {parada.previsaoLiberacao && (
                      <div className="flex items-center gap-1.5 text-[var(--um-verde-principal)] font-medium">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Previsão de liberação: {parada.previsaoLiberacao}</span>
                      </div>
                    )}
                    {reportsLigados.length > 0 && (
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 shrink-0 text-[var(--um-cinza-texto)]" />
                        <span className="truncate">
                          Técnico(s): {reportsLigados.map(r => r.tecnicoNome || r.mecanico || r.eletricista).filter(Boolean).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTÕES RÁPIDOS DE ATUALIZAÇÃO (SÓ ADMIN, REGRA 3.4 b) */}
                {!isTvMode && (
                  <div className="pt-3 border-t border-[var(--um-cinza-claro)] space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--um-cinza-texto)]">
                      Ações rápidas de apontamento
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {ATALHOS_RAPIDOS.map((btn) => (
                        <button
                          key={btn.codigo}
                          onClick={() => setModalQuickStatus({ parada, codigoPreSelecionado: btn.codigo })}
                          className={`px-2 py-1.5 text-[10px] font-medium rounded-lg border text-center transition-colors cursor-pointer truncate ${
                            segAtual.codigo === btn.codigo
                              ? 'bg-[var(--um-verde-principal)] text-white border-[var(--um-verde-principal)] font-bold'
                              : 'bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-secundario)]'
                          }`}
                          title={`Aplicar ${btn.codigo}`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 gap-2">
                      <button
                        onClick={() => setModalBuscaVale({ parada })}
                        className="text-[11px] font-medium text-[var(--um-verde-principal)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3 h-3" /> Outro código Vale...
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setParadaSelecionada(parada)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-principal)] rounded-lg text-[var(--um-cinza-escuro)] cursor-pointer flex items-center gap-1"
                        >
                          <History className="w-3 h-3" /> Histórico
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ABRIR NOVA PARADA (NOVO MODAL APROVADO) */}
      <ModalAbrirParada
        isOpen={modalNovaParada}
        onClose={() => setModalNovaParada(false)}
        equipamentos={equipamentos}
        paradasAbertas={paradas.filter(p => p.situacao === 'ABERTA')}
        onAbrirParadaExistente={(paradaExistente) => {
          setModalNovaParada(false);
          setParadaSelecionada(paradaExistente);
        }}
        onConfirm={(dados) => {
          const nova = criarNovaParada({
            tag: dados.tag,
            modelo: dados.modelo,
            frente: dados.frente,
            inicioParada: dados.inicioParadaIso,
            numeroOS: dados.ordemServico,
            ordemServico: dados.ordemServico,
            sintomaInicial: dados.sintomaInicial,
            falha: dados.falha,
            previsaoLiberacao: dados.previsaoLiberacao,
            usuario: currentUser.name || currentUser.username,
            origem: 'ADMIN',
            codigoInicial: dados.codigoInicial,
            complementoInicial: dados.complementoTexto || undefined
          });
          onSaveParada(nova);
          setModalNovaParada(false);
        }}
      />

      {/* MODAL 2: APLICAR NOVO STATUS / ATALHO RÁPIDO (REGRA 3.4 b) */}
      {modalQuickStatus && (
        <ModalAplicarStatus
          parada={modalQuickStatus.parada}
          codigoInicial={modalQuickStatus.codigoPreSelecionado}
          currentUser={currentUser}
          onClose={() => setModalQuickStatus(null)}
          onSalvar={(atualizada) => {
            onSaveParada(atualizada);
            setModalQuickStatus(null);
          }}
        />
      )}

      {/* MODAL 3: BUSCA DE CÓDIGOS VALE (REGRA 3.4 c) */}
      {modalBuscaVale && (
        <ModalBuscaCodigosVale
          onClose={() => setModalBuscaVale(null)}
          onSelecionarCodigo={(codigo) => {
            if (modalBuscaVale.parada) {
              setModalQuickStatus({
                parada: modalBuscaVale.parada,
                codigoPreSelecionado: codigo
              });
            } else if (modalBuscaVale.onSelect) {
              modalBuscaVale.onSelect(codigo);
            }
            setModalBuscaVale(null);
          }}
        />
      )}

      {/* MODAL 4: DETALHE DA PARADA & EDIÇÃO HISTÓRICA COMPLETA (REGRA 3.4 d) */}
      {paradaSelecionada && (
        <ModalDetalheParada
          parada={paradaSelecionada}
          currentUser={currentUser}
          onClose={() => setParadaSelecionada(null)}
          onSalvar={(atualizada) => {
            onSaveParada(atualizada);
            setParadaSelecionada(atualizada);
          }}
          onDelete={(id) => {
            onDeleteParada(id);
            setParadaSelecionada(null);
          }}
          onInserirNoPassado={(p) => {
            setModalInserirPassado(p);
          }}
          onVerAuditoria={(p) => {
            setShowAuditoriaModal(p);
          }}
        />
      )}

      {/* MODAL 5: INSERIR PERÍODO NO PASSADO COM AUTO-AJUSTE DE VIZINHOS (REGRA 3.4 d) */}
      {modalInserirPassado && (
        <ModalInserirPeriodoPassado
          parada={modalInserirPassado}
          currentUser={currentUser}
          onClose={() => setModalInserirPassado(null)}
          onSalvar={(atualizada) => {
            onSaveParada(atualizada);
            setModalInserirPassado(null);
            setParadaSelecionada(atualizada);
          }}
        />
      )}

      {/* MODAL 6: LOG DE AUDITORIA (REGRA 3.1 & 3.4 d) */}
      {showAuditoriaModal && (
        <ModalLogAuditoria
          parada={showAuditoriaModal}
          onClose={() => setShowAuditoriaModal(null)}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// SUB-MODAIS DE GESTÃO DE PARADAS
// ----------------------------------------------------

function ModalAplicarStatus({
  parada,
  codigoInicial,
  currentUser,
  onClose,
  onSalvar
}: {
  parada: Parada;
  codigoInicial: string;
  currentUser: UserType;
  onClose: () => void;
  onSalvar: (p: Parada) => void;
}) {
  const codDef = buscarCodigoVale(codigoInicial);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [horaInicio, setHoraInicio] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [responsavel, setResponsavel] = useState<ResponsavelClasse>(codDef?.resp || 'MANUTENCAO');
  const [funcaoResp, setFuncaoResp] = useState(getFuncaoResponsavelSugerida(codigo, codDef?.resp || 'MANUTENCAO', codDef?.quem || ''));
  const [complemento, setComplemento] = useState('');

  const handleCodigoChange = (newCod: string) => {
    setCodigo(newCod);
    const def = buscarCodigoVale(newCod);
    if (def) {
      setResponsavel(def.resp);
      setFuncaoResp(getFuncaoResponsavelSugerida(newCod, def.resp, def.quem));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const atualizada = aplicarNovoStatus(
      parada,
      codigo,
      new Date(horaInicio).toISOString(),
      currentUser.name || currentUser.username,
      {
        responsavel,
        responsavelFuncao: funcaoResp,
        complemento: complemento.trim() || null
      }
    );
    onSalvar(atualizada);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--um-cinza-claro)]">
          <div>
            <h3 className="text-[16px] font-light uppercase text-[var(--um-verde-principal)]">
              Aplicar Novo Status: {parada.tag}
            </h3>
            <p className="text-[11px] text-[var(--um-cinza-texto)] mt-0.5">
              O status anterior será fechado e o novo se iniciará no horário indicado.
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--um-cinza-texto)] hover:text-black">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-[12px]">
          <div>
            <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
              Código Vale x U&M
            </label>
            <select
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[13px] font-medium text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
            >
              {CODIGOS_VALE_FLAT.map(c => (
                <option key={c.codigo} value={c.codigo}>
                  {c.rotuloCompleto} ({c.resp})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
                Início deste Status *
              </label>
              <input
                type="datetime-local"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
                Classe de Responsabilidade
              </label>
              <select
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value as ResponsavelClasse)}
                className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] font-medium text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
              >
                <option value="MANUTENCAO">Manutenção (Azul)</option>
                <option value="PRODUCAO">Produção (Laranja)</option>
                <option value="VALE">Vale (Roxo)</option>
                <option value="EXTERNO">Externo (Cinza-azulado)</option>
                <option value="ACIDENTE">Acidente (Vermelho)</option>
                <option value="A_DEFINIR">A Definir (Amarelo)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
              Quem responde pela hora / Função
            </label>
            <input
              type="text"
              value={funcaoResp}
              onChange={(e) => setFuncaoResp(e.target.value)}
              placeholder="Ex: Supervisor de Produção do turno"
              className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
              Complemento / Detalhes (TAG da prancha, nº da PTS, motivo)
            </label>
            <input
              type="text"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Ex: Prancha PR-102, aguardando descer do plato 4"
              className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--um-cinza-claro)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] rounded-xl cursor-pointer hover:bg-[var(--um-cinza-claro)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[var(--um-verde-principal)] text-[var(--um-branco)] font-medium rounded-xl cursor-pointer hover:bg-[var(--um-verde-secundario)] shadow-xs"
            >
              Aplicar Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalBuscaCodigosVale({
  onClose,
  onSelecionarCodigo
}: {
  onClose: () => void;
  onSelecionarCodigo: (codigo: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
  const [filtroSit, setFiltroSit] = useState<string>('TODAS');
  const [filtroResp, setFiltroResp] = useState<string>('TODOS');

  const filtrados = useMemo(() => {
    return CODIGOS_VALE_FLAT.filter((c) => {
      if (filtroTipo !== 'TODOS' && !c.prefixo.includes(filtroTipo)) return false;
      if (filtroSit !== 'TODAS' && c.sit !== filtroSit) return false;
      if (filtroResp !== 'TODOS' && c.resp !== filtroResp) return false;

      if (busca.trim()) {
        const b = removerAcentos(busca);
        const matchCod = removerAcentos(c.codigo).includes(b);
        const matchNome = removerAcentos(c.nome).includes(b);
        const matchEx = removerAcentos(c.ex).includes(b);
        const matchQuem = removerAcentos(c.quem).includes(b);
        if (!matchCod && !matchNome && !matchEx && !matchQuem) return false;
      }
      return true;
    });
  }, [busca, filtroTipo, filtroSit, filtroResp]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--um-cinza-claro)] shrink-0">
          <div>
            <h3 className="text-[18px] font-light uppercase text-[var(--um-verde-principal)] flex items-center gap-2">
              <Search className="w-5 h-5" /> Catálogo de Códigos Vale x U&M
            </h3>
            <p className="text-[11px] text-[var(--um-cinza-texto)] mt-0.5">
              Árvore oficial com responsabilidades, possibilidade de expurgo à Vale e exemplos práticos.
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--um-cinza-texto)] hover:text-black">✕</button>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="p-3 my-3 bg-[var(--um-fundo)] rounded-xl border border-[var(--um-cinza-claro)] flex flex-wrap items-center gap-2.5 shrink-0 text-[11px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[var(--um-cinza-texto)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por código, nome, exemplo ou quem responde..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
              autoFocus
            />
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-2.5 py-1.5 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-lg font-medium text-[var(--um-cinza-escuro)]"
          >
            <option value="TODOS">Tipo: Todos</option>
            <option value="MPS">MPS (Preventiva)</option>
            <option value="MPNS">MPNS (Programada)</option>
            <option value="HMC">HMC (Corretiva)</option>
            <option value="HAC">HAC (Acidente)</option>
            <option value="HOI">HOI / HAO (Operação)</option>
          </select>

          <select
            value={filtroSit}
            onChange={(e) => setFiltroSit(e.target.value)}
            className="px-2.5 py-1.5 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-lg font-medium text-[var(--um-cinza-escuro)]"
          >
            <option value="TODAS">Situação: Todas</option>
            <option value="EXEC">EXEC (Executando)</option>
            <option value="AG">AG (Aguardando)</option>
          </select>

          <select
            value={filtroResp}
            onChange={(e) => setFiltroResp(e.target.value)}
            className="px-2.5 py-1.5 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-lg font-medium text-[var(--um-cinza-escuro)]"
          >
            <option value="TODOS">Responsável: Todos</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="PRODUCAO">Produção</option>
            <option value="VALE">Vale</option>
            <option value="EXTERNO">Externo</option>
            <option value="ACIDENTE">Acidente</option>
            <option value="A_DEFINIR">A Definir</option>
          </select>
        </div>

        {/* TABELA DE CÓDIGOS */}
        <div className="flex-1 overflow-y-auto border border-[var(--um-cinza-claro)] rounded-xl">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 bg-[var(--um-fundo)] border-b border-[var(--um-cinza-claro)] text-[10px] uppercase tracking-wider text-[var(--um-cinza-texto)]">
              <tr>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Nome / Descrição</th>
                <th className="py-2.5 px-3">Sit.</th>
                <th className="py-2.5 px-3">Resp. Sugerido</th>
                <th className="py-2.5 px-3">Quem Responde</th>
                <th className="py-2.5 px-3">Expurgo Vale</th>
                <th className="py-2.5 px-3">Exemplo de Aplicação</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--um-cinza-claro)]/60 text-[12px]">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--um-cinza-texto)]">
                    Nenhum código corresponde aos filtros informados.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => {
                  const rStyle = getResponsabilidadeStyle(item.resp);
                  return (
                    <tr key={item.codigo} className="hover:bg-[var(--um-fundo)] transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--um-verde-principal)] whitespace-nowrap">
                        {item.codigo}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[var(--um-cinza-escuro)]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{item.nome}</span>
                          {item.aValidar && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--um-alerta-claro)] text-[var(--um-alerta-escuro)]">
                              A VALIDAR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          item.sit === 'EXEC' ? 'bg-[#19502F]/10 text-[#19502F]' : 'bg-[#E2A937]/15 text-[#B5872C]'
                        }`}>
                          {item.sit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span 
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                          style={{ backgroundColor: rStyle.fundo, borderColor: rStyle.borda, color: rStyle.texto }}
                        >
                          {rStyle.nome}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[var(--um-cinza-texto)]">
                        {item.quem}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[11px]">
                        <span className={item.expurgo === 'SIM' ? 'text-[var(--um-verde-principal)]' : 'text-[var(--um-cinza-texto)]'}>
                          {item.expurgo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[var(--um-cinza-texto)] max-w-xs truncate" title={item.ex}>
                        {item.ex}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelecionarCodigo(item.codigo)}
                          className="px-2.5 py-1 bg-[var(--um-verde-principal)] text-white text-[11px] font-medium rounded-lg hover:bg-[var(--um-verde-secundario)] cursor-pointer"
                        >
                          Selecionar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-[var(--um-cinza-claro)] flex justify-between items-center text-[11px] text-[var(--um-cinza-texto)] shrink-0">
          <span>Mostrando {filtrados.length} de {CODIGOS_VALE_FLAT.length} códigos cadastrados</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] rounded-lg cursor-pointer hover:bg-[var(--um-cinza-claro)]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalDetalheParada({
  parada,
  currentUser,
  onClose,
  onSalvar,
  onDelete,
  onInserirNoPassado,
  onVerAuditoria
}: {
  parada: Parada;
  currentUser: UserType;
  onClose: () => void;
  onSalvar: (p: Parada) => void;
  onDelete: (id: string) => void;
  onInserirNoPassado: (p: Parada) => void;
  onVerAuditoria: (p: Parada) => void;
}) {
  const durTotal = calcularDuracaoTotalParadaMinutos(parada);
  const respTotais = calcularHorasPorResponsavel(parada);

  const handleEncerrar = () => {
    const agoraIso = new Date().toISOString();
    const encerrada = encerrarParada(parada, agoraIso, currentUser.name || currentUser.username);
    onSalvar(encerrada);
  };

  const handleReabrir = () => {
    const reaberta = reabrirParada(parada, currentUser.name || currentUser.username);
    onSalvar(reaberta);
  };

  const handleExcluirSegmento = (segId: string) => {
    try {
      const atualizada = excluirSegmento(parada, segId, currentUser.name || currentUser.username);
      onSalvar(atualizada);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir segmento.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--um-cinza-claro)] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[18px] font-light uppercase text-[var(--um-verde-principal)]">
                Detalhamento da Parada: {parada.tag} ({parada.frente})
              </h3>
              <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                parada.situacao === 'ABERTA' ? 'bg-[var(--um-negativo)] text-white' : 'bg-[var(--um-verde-principal)] text-white'
              }`}>
                {parada.situacao}
              </span>
            </div>
            <p className="text-[11px] text-[var(--um-cinza-texto)] mt-0.5">
              Início real: {formatarDataHoraPtBr(parada.inicioParada)} · Duração total: {formatarDuracaoHorasMinutos(durTotal)}
            </p>
            {(parada.falha || parada.sintomaInicial) && (
              <p className="text-[12px] font-bold text-[var(--um-verde-principal)] mt-1">
                Falha / Sintoma: {formatarFalhaDetalhe(parada.falha, parada.sintomaInicial)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-[var(--um-cinza-texto)] hover:text-black">✕</button>
        </div>

        {/* BARRA DE AÇÕES DO HISTÓRICO */}
        <div className="py-3 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onInserirNoPassado(parada)}
              className="px-3 py-1.5 bg-[var(--um-verde-principal)] text-white text-[11px] font-medium rounded-lg cursor-pointer hover:bg-[var(--um-verde-secundario)] flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Inserir Período no Passado
            </button>
            <button
              onClick={() => onVerAuditoria(parada)}
              className="px-3 py-1.5 bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)] text-[11px] font-medium rounded-lg cursor-pointer hover:border-[var(--um-verde-principal)] flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[var(--um-cinza-texto)]" /> Log de Auditoria ({parada.auditoria?.length || 0})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {parada.situacao === 'ABERTA' ? (
              <button
                onClick={handleEncerrar}
                className="px-3 py-1.5 bg-[var(--um-verde-principal)] text-white text-[11px] font-medium rounded-lg cursor-pointer hover:bg-[var(--um-verde-secundario)] flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Encerrar Parada (Voltou a Operar)
              </button>
            ) : (
              <button
                onClick={handleReabrir}
                className="px-3 py-1.5 bg-[var(--um-fundo)] text-[var(--um-cinza-escuro)] border border-[var(--um-cinza-claro)] text-[11px] font-medium rounded-lg cursor-pointer hover:border-[var(--um-verde-principal)] flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--um-cinza-texto)]" /> Reabrir Parada
              </button>
            )}

            <button
              onClick={() => {
                if (confirm(`Tem certeza que deseja excluir toda a parada do ${parada.tag}?`)) {
                  onDelete(parada.id);
                }
              }}
              className="p-1.5 text-[var(--um-negativo)] hover:bg-[var(--um-negativo)]/10 rounded-lg cursor-pointer"
              title="Excluir Parada"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RESUMO RÁPIDO DOS PERÍODOS (Ex: 10:33–11:10 AG ATENDIMENTO (Manutenção, 37 min)) */}
        <div className="mb-3 p-3 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-xl shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--um-cinza-texto)] mb-1.5">
            Linha do Tempo Contínua (Sem Buracos)
          </p>
          <div className="flex flex-wrap gap-2">
            {parada.segmentos.map((seg, idx) => {
              const rStyle = getResponsabilidadeStyle(seg.responsavel);
              const sIniMs = new Date(seg.inicio).getTime();
              const sFimMs = seg.fim ? new Date(seg.fim).getTime() : Date.now();
              const durMin = Math.max(0, Math.round((sFimMs - sIniMs) / 60000));
              const iniHhMm = formatarHoraPtBr(seg.inicio);
              const fimHhMm = seg.fim ? formatarHoraPtBr(seg.fim) : 'agora';
              return (
                <span
                  key={seg.id || idx}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-lg border"
                  style={{ backgroundColor: rStyle.fundo, borderColor: rStyle.borda, color: rStyle.texto }}
                >
                  <strong>{iniHhMm}–{fimHhMm}</strong> {seg.nome} ({rStyle.nome}, {durMin} min)
                </span>
              );
            })}
          </div>
        </div>

        {/* TABELA DO HISTÓRICO DE SEGMENTOS (REGRA 3.4 d) */}
        <div className="flex-1 overflow-y-auto border border-[var(--um-cinza-claro)] rounded-xl">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead className="sticky top-0 bg-[var(--um-fundo)] border-b border-[var(--um-cinza-claro)] text-[10px] uppercase tracking-wider text-[var(--um-cinza-texto)]">
              <tr>
                <th className="py-2.5 px-3">Seq</th>
                <th className="py-2.5 px-3">Código</th>
                <th className="py-2.5 px-3">Nome do Status</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3">Função</th>
                <th className="py-2.5 px-3">Início</th>
                <th className="py-2.5 px-3">Fim</th>
                <th className="py-2.5 px-3">Duração</th>
                <th className="py-2.5 px-3">Complemento</th>
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--um-cinza-claro)]/60 text-[12px]">
              {parada.segmentos.map((seg, idx) => {
                const rStyle = getResponsabilidadeStyle(seg.responsavel);
                const sIniMs = new Date(seg.inicio).getTime();
                const sFimMs = seg.fim ? new Date(seg.fim).getTime() : Date.now();
                const durMin = Math.max(0, Math.round((sFimMs - sIniMs) / 60000));

                return (
                  <tr key={seg.id || idx} className="hover:bg-[var(--um-fundo)] transition-colors">
                    <td className="py-2.5 px-3 text-[var(--um-cinza-texto)] font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--um-verde-principal)] whitespace-nowrap">
                      {seg.codigo}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[var(--um-cinza-escuro)]">{seg.nome}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span 
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                        style={{ backgroundColor: rStyle.fundo, borderColor: rStyle.borda, color: rStyle.texto }}
                      >
                        {rStyle.nome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--um-cinza-texto)] max-w-xs truncate">
                      {seg.responsavelFuncao}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--um-cinza-escuro)] whitespace-nowrap">
                      {formatarDataHoraPtBr(seg.inicio)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--um-cinza-escuro)] whitespace-nowrap">
                      {seg.fim ? formatarDataHoraPtBr(seg.fim) : <strong className="text-[var(--um-verde-principal)]">EM ANDAMENTO</strong>}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[11px] text-[var(--um-cinza-escuro)] whitespace-nowrap">
                      {durMin} min ({formatarDuracaoHorasMinutos(durMin)})
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--um-cinza-texto)] italic max-w-xs truncate">
                      {seg.complemento || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] uppercase font-mono text-[var(--um-cinza-texto)]">
                      {seg.origem}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {parada.segmentos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleExcluirSegmento(seg.id)}
                          className="p-1 text-[var(--um-negativo)] hover:bg-[var(--um-negativo)]/10 rounded cursor-pointer"
                          title="Excluir período (vizinhos se ajustam)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-[var(--um-cinza-claro)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[var(--um-verde-principal)] text-white text-[12px] font-medium rounded-xl cursor-pointer hover:bg-[var(--um-verde-secundario)]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalInserirPeriodoPassado({
  parada,
  currentUser,
  onClose,
  onSalvar
}: {
  parada: Parada;
  currentUser: UserType;
  onClose: () => void;
  onSalvar: (p: Parada) => void;
}) {
  const [codigo, setCodigo] = useState('HMC 9118');
  const [inicio, setInicio] = useState(() => {
    const d = new Date(parada.inicioParada);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [fim, setFim] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [responsavel, setResponsavel] = useState<ResponsavelClasse>('MANUTENCAO');
  const [funcao, setFuncao] = useState('Supervisor de Manutenção do turno');
  const [complemento, setComplemento] = useState('Buscando peça');

  const handleCodigoChange = (newCod: string) => {
    setCodigo(newCod);
    const def = buscarCodigoVale(newCod);
    if (def) {
      setResponsavel(def.resp);
      setFuncao(getFuncaoResponsavelSugerida(newCod, def.resp, def.quem));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const atualizada = inserirSegmentoNoPassado(
        parada,
        {
          codigo,
          inicio: new Date(inicio).toISOString(),
          fim: new Date(fim).toISOString(),
          responsavel,
          responsavelFuncao: funcao,
          complemento: complemento.trim() || null
        },
        currentUser.name || currentUser.username
      );
      onSalvar(atualizada);
    } catch (err: any) {
      alert(err.message || 'Erro ao inserir período.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--um-cinza-claro)]">
          <div>
            <h3 className="text-[16px] font-light uppercase text-[var(--um-verde-principal)]">
              Inserir Período no Passado: {parada.tag}
            </h3>
            <p className="text-[11px] text-[var(--um-cinza-texto)] mt-0.5">
              Os segmentos vizinhos serão ajustados automaticamente para não deixar buraco nem sobreposição.
            </p>
          </div>
          <button onClick={onClose} className="text-[var(--um-cinza-texto)] hover:text-black">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-[12px]">
          <div>
            <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
              Código Vale
            </label>
            <select
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[13px] font-medium text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
            >
              {CODIGOS_VALE_FLAT.map(c => (
                <option key={c.codigo} value={c.codigo}>
                  {c.rotuloCompleto} ({c.resp})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
                Início do Período *
              </label>
              <input
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
                Fim do Período *
              </label>
              <input
                type="datetime-local"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
                Classe Responsável
              </label>
              <select
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value as ResponsavelClasse)}
                className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] font-medium text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
              >
                <option value="MANUTENCAO">Manutenção</option>
                <option value="PRODUCAO">Produção</option>
                <option value="VALE">Vale</option>
                <option value="EXTERNO">Externo</option>
                <option value="ACIDENTE">Acidente</option>
                <option value="A_DEFINIR">A Definir</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
                Função do Responsável
              </label>
              <input
                type="text"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase text-[var(--um-cinza-texto)] mb-1">
              Complemento / Motivo
            </label>
            <input
              type="text"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Ex: buscando peça no almoxarifado central"
              className="w-full px-3 py-2 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-lg text-[12px] text-[var(--um-cinza-escuro)] focus:outline-none focus:border-[var(--um-verde-principal)]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--um-cinza-claro)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--um-fundo)] text-[var(--um-cinza-texto)] rounded-xl cursor-pointer hover:bg-[var(--um-cinza-claro)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[var(--um-verde-principal)] text-[var(--um-branco)] font-medium rounded-xl cursor-pointer hover:bg-[var(--um-verde-secundario)] shadow-xs"
            >
              Inserir e Ajustar Vizinhos
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalLogAuditoria({
  parada,
  onClose
}: {
  parada: Parada;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--um-cinza-claro)] shrink-0">
          <h3 className="text-[16px] font-light uppercase text-[var(--um-verde-principal)] flex items-center gap-2">
            <History className="w-5 h-5" /> Log de Auditoria: {parada.tag}
          </h3>
          <button onClick={onClose} className="text-[var(--um-cinza-texto)] hover:text-black">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--um-cinza-claro)]/60 my-3">
          {(!parada.auditoria || parada.auditoria.length === 0) ? (
            <p className="py-8 text-center text-[var(--um-cinza-texto)] text-[12px]">
              Nenhum evento registrado no log.
            </p>
          ) : (
            parada.auditoria.map((item, idx) => (
              <div key={item.id || idx} className="py-3 space-y-1 text-[12px]">
                <div className="flex items-center justify-between text-[11px] text-[var(--um-cinza-texto)]">
                  <span className="font-mono text-[var(--um-verde-principal)] font-bold">{item.acao}</span>
                  <span>
                    {formatarDataHoraPtBr(item.dataHora)} por{' '}
                    <strong className="text-[var(--um-cinza-escuro)]">
                      {item.usuario}{item.matricula ? ` (Mat: ${item.matricula})` : ''}
                    </strong>
                  </span>
                </div>
                <p className="text-[var(--um-cinza-escuro)]">{item.detalhes}</p>
                {item.valorAnterior && (
                  <p className="text-[10px] text-[var(--um-cinza-texto)] font-mono">
                    Anterior: {item.valorAnterior} → Novo: {item.valorNovo}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-[var(--um-cinza-claro)] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--um-verde-principal)] text-white text-[12px] font-medium rounded-xl cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
