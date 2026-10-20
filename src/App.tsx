import React, { useState, useEffect, useRef } from 'react';
import { User, Report, ReportStatus, Preventiva, Tecnico, Parada } from './types';
import { PRESET_USERS, INITIAL_REPORTS, PRESET_TECNICOS, SAMPLE_TECNICOS_UM } from './data/mockData';
import { PRESET_PREVENTIVAS } from './data/presetPreventivas';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { MechanicView } from './components/MechanicView';
import { AdminView } from './components/AdminView';
import { ToastContainer } from './components/NotificationCenter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Shield, Wrench } from 'lucide-react';
import { 
  dbGetReports, 
  dbSaveReport, 
  dbDeleteReport, 
  dbSaveReportsBulk, 
  dbSaveSession, 
  dbGetSession, 
  dbSaveUsers,
  dbClearReports,
  dbGetParadas,
  dbSaveParada,
  dbDeleteParada,
  dbSaveParadasBulk,
  dbClearParadas
} from './lib/db';
import { collection, query, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, storage } from './lib/firebase';
import { mapFirestoreDocToReport, syncSingleReport } from './lib/syncEngine';
import { processarAtendimentosParaParadas } from './lib/paradasEngine';
import { definirCatalogoCustomizado } from './data/catalogoFalhas';
import { classificarGrupoFuncao, formatarNomeSobrenome, normalizarMatricula } from './lib/uEmDataUtils';
import {
  getDeletedReportIds,
  addDeletedReportId,
  clearDeletedReportIds,
  getDeletedTecnicoIds,
  addDeletedTecnicoId,
  clearDeletedTecnicoIds,
  getDeletedPreventivaIds,
  addDeletedPreventivaId,
  clearDeletedPreventivaIds,
  getDeletedParadaIds,
  addDeletedParadaId,
  clearDeletedParadaIds,
  isSampleMockTecnico
} from './lib/tombstones';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

function safeSaveLocalReports(reports: Report[]) {
  try {
    localStorage.setItem('rft_reports', JSON.stringify(reports));
  } catch (err) {
    console.warn('Falha ao salvar no localStorage (provável limite de cota excedido por causa de fotos):', err);
    try {
      // Strip base64 photoUrl and photoUrls from localStorage to keep it under 5MB limit
      const lightweightReports = reports.map(r => ({
        ...r,
        atendimentos: r.atendimentos.map(at => ({
          ...at,
          photoUrl: at.photoUrl ? 'LTM_CACHED_IN_INDEXEDDB_OR_API' : undefined,
          photoUrls: at.photoUrls ? at.photoUrls.map(() => 'LTM_CACHED_IN_INDEXEDDB_OR_API') : undefined
        }))
      }));
      localStorage.setItem('rft_reports', JSON.stringify(lightweightReports));
    } catch (innerErr) {
      console.error('Falha crítica ao salvar rascunho em localStorage:', innerErr);
    }
  }
}

// Compare reports using safe, fast metadata checks to prevent continuous re-renders
function isSameReports(a: Report[], b: Report[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const rA = a[i];
    const rB = b[i];
    if (rA.id !== rB.id) return false;
    if (rA.status !== rB.status) return false;
    if (rA.team !== rB.team) return false;
    if (rA.frente !== rB.frente) return false;
    if (rA.createdAt !== rB.createdAt) return false;
    if (rA.observacoesGerais !== rB.observacoesGerais) return false;
    if (rA.atendimentos.length !== rB.atendimentos.length) return false;
    if (rA.pendencias.length !== rB.pendencias.length) return false;
    
    for (let j = 0; j < rA.atendimentos.length; j++) {
      const atA = rA.atendimentos[j];
      const atB = rB.atendimentos[j];
      if (atA.id !== atB.id) return false;
      if (atA.equipamento !== atB.equipamento) return false;
      if (atA.falha?.codigoCompleto !== atB.falha?.codigoCompleto) return false;
      if (atA.photoUrl !== atB.photoUrl) return false;
      if (JSON.stringify(atA.photoUrls) !== JSON.stringify(atB.photoUrls)) return false;
    }
  }
  return true;
}

// Safely merges reports from remote Firestore with local reports, preserving unsynced pending states and drafts
function mergeServerAndLocalReports(local: Report[], server: Report[]): Report[] {
  const deletedSet = getDeletedReportIds();
  const mergedMap = new Map<string, Report>();

  // Add server reports first - this is the ground truth from database
  server.forEach((sr) => {
    if (sr && sr.id && !deletedSet.has(sr.id)) {
      mergedMap.set(sr.id, sr);
    }
  });

  // Only keep local reports if they are unsynced drafts or pending sync that haven't reached server yet
  local.forEach((r) => {
    if (!r || !r.id || deletedSet.has(r.id)) return;
    if (
      r.status === 'PENDENTE_SINCRONIZACAO' || 
      r.status === 'SINCRONIZANDO' || 
      r.status === 'ERRO_SINCRONIZACAO' || 
      r.status === 'RASCUNHO'
    ) {
      if (!mergedMap.has(r.id)) {
        mergedMap.set(r.id, r);
      }
    }
  });

  const merged = Array.from(mergedMap.values());
  merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return merged;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'admin' | 'mechanic' | null>(null);

  useEffect(() => {
    if (currentUser) {
      setViewMode(currentUser.role);
    } else {
      setViewMode(null);
    }
  }, [currentUser]);

  const handleToggleViewMode = () => {
    setViewMode((prev) => (prev === 'admin' ? 'mechanic' : 'admin'));
  };

  const [reports, setReports] = useState<Report[]>(() => {
    const saved = localStorage.getItem('rft_reports');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Report[];
        return parsed.filter(r => r.id !== 'rep-1' && r.id !== 'rep-2' && r.id !== 'rep-3');
      } catch (e) {
        return INITIAL_REPORTS;
      }
    }
    return INITIAL_REPORTS;
  });

  const [preventivas, setPreventivas] = useState<Preventiva[]>([]);
  const [paradas, setParadas] = useState<Parada[]>(() => {
    const saved = localStorage.getItem('rft_paradas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(() => {
    const saved = localStorage.getItem('rft_tecnicos');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(t => !isSampleMockTecnico(t));
          if (clean.length !== parsed.length) {
            try { localStorage.setItem('rft_tecnicos', JSON.stringify(clean)); } catch (e) {}
          }
          return clean;
        }
      } catch (e) {}
    }
    return [];
  });

  const [browserOnline, setBrowserOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  
  // Real active connection indicator
  const isOffline = simulatedOffline || !browserOnline;

  const [syncState, setSyncState] = useState<'online' | 'offline' | 'syncing' | 'synced'>(() => {
    return (typeof navigator !== 'undefined' && navigator.onLine) ? 'synced' : 'offline';
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const isSyncInProgressRef = useRef<boolean>(false);

  // 1. Initial State Hydration on boot
  useEffect(() => {
    async function loadDataAndSync() {
      try {
        // Cache offline presets
        await dbSaveUsers(PRESET_USERS);

        // Session restore on boot is disabled as requested. Old caches are cleared to prevent auto-login.
        localStorage.removeItem('rft_current_user');
        await dbSaveSession(null);

        // Ensure any cached mock technicians are purged from localStorage
        try {
          const cachedTecs = localStorage.getItem('rft_tecnicos');
          if (cachedTecs) {
            const parsed = JSON.parse(cachedTecs);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter(t => !isSampleMockTecnico(t));
              localStorage.setItem('rft_tecnicos', JSON.stringify(cleaned));
              setTecnicos(cleaned);
            }
          }
        } catch (e) {}

        // Hydrate from IndexedDB first for instant rendering
        try {
          const loadedReports = await dbGetReports();
          if (loadedReports && loadedReports.length > 0) {
            const filtered = loadedReports.filter(r => r.id !== 'rep-1' && r.id !== 'rep-2' && r.id !== 'rep-3');
            setReports(filtered);
          }
        } catch (dbErr) {
          console.warn('Erro ao ler do IndexedDB na inicialização:', dbErr);
        }

        try {
          const loadedParadas = await dbGetParadas();
          if (loadedParadas && loadedParadas.length > 0) {
            setParadas(loadedParadas);
          }
        } catch (pErr) {
          console.warn('Erro ao ler paradas do IndexedDB:', pErr);
        }
      } catch (err) {
        console.error('Falha carregamento inicial:', err);
      }
    }
    loadDataAndSync();
  }, []);

  // 2. Real-time Firestore sync listener (When Online)
  useEffect(() => {
    if (isOffline) return;

    const q = query(collection(db, 'relatorios'));
    
    // Subscribe to Firestore changes
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const deletedSet = getDeletedReportIds();
      const serverReports: Report[] = [];
      snapshot.forEach((doc) => {
        try {
          if (!deletedSet.has(doc.id)) {
            serverReports.push(mapFirestoreDocToReport(doc.data(), doc.id));
          }
        } catch (e) {
          console.error('Mapeamento falhou para relatoriodoc:', e);
        }
      });

      setReports((prev) => {
        const merged = mergeServerAndLocalReports(prev, serverReports);
        if (isSameReports(prev, merged)) {
          return prev;
        }
        
        // Save merged data back to local IndexedDB to enable full offline lookup
        dbSaveReportsBulk(merged).catch((e) => console.error('Erro ao salvar bulk no IDB:', e));
        setTimeout(() => safeSaveLocalReports(merged), 0);
        return merged;
      });
    }, (error) => {
      console.warn('Erro na escuta Firestore real-time. provável sem rede:', error);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOffline]);

  // 2.2 Listen to preventivas collection
  useEffect(() => {
    if (isOffline) return;

    const pq = query(collection(db, 'preventivas'));
    
    const unsubscribe = onSnapshot(pq, (snapshot) => {
      const deletedPrevs = getDeletedPreventivaIds();
      const serverPrevs: Preventiva[] = [];
      snapshot.forEach((doc) => {
        try {
          if (!deletedPrevs.has(doc.id)) {
            const data = doc.data();
            serverPrevs.push({
              id: doc.id,
              equipamento: data.equipamento || '',
              dataParada: data.dataParada || '',
              createdAt: data.createdAt || new Date().toISOString(),
              usuario: data.usuario || '',
              dataInicio: data.dataInicio || '',
              horaPreventiva: data.horaPreventiva || '',
              horasPmppConfirmada: data.horasPmppConfirmada || '',
              limiteHorimetro: data.limiteHorimetro || '',
              statusPreventiva: data.statusPreventiva || 'EM ANDAMENTO'
            });
          }
        } catch (e) {
          console.error('Mapeamento falhou para preventiva:', e);
        }
      });
      // Sort so that the ones with date format (DD/MM) get ordered accordingly,
      // or we can sort by createdAt descending:
      serverPrevs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPreventivas(serverPrevs);
    }, (error) => {
      console.warn('Erro ao escutar preventivas Firestore:', error);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOffline]);

  // 2.25 Listen to configuracoes/catalogo_falhas for dynamic catalog updates from Admin
  useEffect(() => {
    if (isOffline) return;

    const docRef = doc(db, 'configuracoes', 'catalogo_falhas');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        return;
      }
      try {
        const data = snap.data();
        if (data && data.catalogoJson) {
          const parsedCatalogo = JSON.parse(data.catalogoJson);
          if (parsedCatalogo && typeof parsedCatalogo === 'object') {
            definirCatalogoCustomizado({
              catalogo: parsedCatalogo,
              atualizadoEm: data.atualizadoEm || new Date().toISOString(),
              atualizadoPor: data.atualizadoPor || 'Admin',
              nomeArquivo: data.nomeArquivo || ''
            });
          }
        }
      } catch (e) {
        console.warn('Falha ao aplicar catálogo customizado do Firestore:', e);
      }
    }, (err) => {
      console.warn('Aviso ao escutar configuracoes/catalogo_falhas:', err);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOffline]);

  // 2.3 Listen to paradas collection (Vale x U&M) & sync offline Parada actions
  useEffect(() => {
    if (isOffline) return;

    // Sincroniza ações de paradas guardadas offline mantendo os horários originais do toque
    async function syncPendingOfflineParadas() {
      try {
        const rawPending = localStorage.getItem('rft_pending_paradas_sync');
        if (!rawPending) return;
        const pendingIds: string[] = JSON.parse(rawPending);
        if (!Array.isArray(pendingIds) || pendingIds.length === 0) return;

        const savedLocal = localStorage.getItem('rft_paradas');
        const localList: Parada[] = savedLocal ? JSON.parse(savedLocal) : paradas;
        const remainingIds: string[] = [];

        for (const pid of pendingIds) {
          const paradaLocal = localList.find(p => p.id === pid);
          if (paradaLocal) {
            try {
              await setDoc(doc(db, 'paradas', paradaLocal.id), paradaLocal);
            } catch (err) {
              console.warn('Falha ao sincronizar parada offline, tentará novamente:', err);
              remainingIds.push(pid);
            }
          }
        }

        localStorage.setItem('rft_pending_paradas_sync', JSON.stringify(remainingIds));
      } catch (e) {
        console.warn('Erro ao processar fila de paradas offline:', e);
      }
    }

    syncPendingOfflineParadas();

    const pq = query(collection(db, 'paradas'));
    
    const unsubscribe = onSnapshot(pq, (snapshot) => {
      const deletedParadas = getDeletedParadaIds();
      let pendingSet = new Set<string>();
      try {
        const rawPending = localStorage.getItem('rft_pending_paradas_sync');
        if (rawPending) {
          pendingSet = new Set(JSON.parse(rawPending));
        }
      } catch (e) {}

      const serverParadas: Parada[] = [];
      snapshot.forEach((docSnap) => {
        try {
          if (!deletedParadas.has(docSnap.id)) {
            serverParadas.push(docSnap.data() as Parada);
          }
        } catch (e) {
          console.error('Mapeamento falhou para parada:', e);
        }
      });

      setParadas((prevLocal) => {
        const mergedMap = new Map<string, Parada>();
        serverParadas.forEach(sp => mergedMap.set(sp.id, sp));

        // Preserva paradas que tiveram ações offline pendentes ou mais recentes
        prevLocal.forEach(lp => {
          if (deletedParadas.has(lp.id)) return;
          const sp = mergedMap.get(lp.id);
          if (!sp) {
            if (pendingSet.has(lp.id)) {
              mergedMap.set(lp.id, lp);
            }
          } else if (pendingSet.has(lp.id)) {
            const localTime = new Date(lp.atualizadoEm || 0).getTime();
            const serverTime = new Date(sp.atualizadoEm || 0).getTime();
            if (localTime >= serverTime) {
              mergedMap.set(lp.id, lp);
            }
          }
        });

        const finalParadas = Array.from(mergedMap.values());
        if (finalParadas.length > 0 || serverParadas.length === 0) {
          dbSaveParadasBulk(finalParadas).catch(() => {});
          try { localStorage.setItem('rft_paradas', JSON.stringify(finalParadas)); } catch (e) {}
          return finalParadas;
        }
        return prevLocal;
      });
    }, (error) => {
      console.warn('Erro ao escutar paradas Firestore:', error);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOffline]);

  const handleSaveParada = async (parada: Parada) => {
    setParadas((prev) => {
      const idx = prev.findIndex(p => p.id === parada.id);
      const updated = idx >= 0
        ? prev.map(p => p.id === parada.id ? parada : p)
        : [parada, ...prev];
      try { localStorage.setItem('rft_paradas', JSON.stringify(updated)); } catch (e) {}
      dbSaveParada(parada).catch(() => {});
      return updated;
    });

    const markParadaPendingOffline = (id: string) => {
      try {
        const raw = localStorage.getItem('rft_pending_paradas_sync');
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(id)) {
          list.push(id);
          localStorage.setItem('rft_pending_paradas_sync', JSON.stringify(list));
        }
      } catch (e) {}
    };

    if (!isOffline) {
      try {
        await setDoc(doc(db, 'paradas', parada.id), parada);
      } catch (err) {
        console.error('Erro ao salvar parada no Firestore, guardando para sync offline:', err);
        markParadaPendingOffline(parada.id);
      }
    } else {
      markParadaPendingOffline(parada.id);
    }
    addToast(
      isOffline ? 'Parada Salva Offline' : 'Parada Atualizada',
      isOffline
        ? `Ação no equipamento ${parada.tag} gravada com o horário do toque para sincronizar quando voltar a rede.`
        : `Status do equipamento ${parada.tag} salvo com sucesso!`,
      isOffline ? 'warning' : 'success'
    );
  };

  const handleDeleteParada = async (id: string) => {
    addDeletedParadaId(id);
    setParadas((prev) => {
      const updated = prev.filter(p => p.id !== id);
      try { localStorage.setItem('rft_paradas', JSON.stringify(updated)); } catch (e) {}
      dbDeleteParada(id).catch(() => {});
      return updated;
    });

    if (!isOffline) {
      try {
        await deleteDoc(doc(db, 'paradas', id));
      } catch (err) {
        console.error('Erro ao excluir parada no Firestore:', err);
      }
    }
    addToast('Parada Excluída', 'Registro de parada operacional excluído com sucesso.', 'info');
  };

  const handleClearAllParadas = async () => {
    paradas.forEach(p => addDeletedParadaId(p.id));
    setParadas([]);
    try { localStorage.setItem('rft_paradas', JSON.stringify([])); } catch (e) {}
    await dbClearParadas();
    if (!isOffline) {
      try {
        const { getDocs, writeBatch } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'paradas'));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => {
            addDeletedParadaId(d.id);
            batch.delete(doc(db, 'paradas', d.id));
          });
          await batch.commit();
        }
      } catch (err) {
        console.error('Erro ao limpar paradas no Firestore:', err);
      }
    }
  };

  const handleAddPreventiva = async (newPrev: Omit<Preventiva, 'id' | 'createdAt'>) => {
    const id = `prev-${Date.now()}-${Math.random()}`;
    const pObj: Preventiva = {
      id,
      ...newPrev,
      createdAt: new Date().toISOString()
    };
    
    // Optimistic state update:
    setPreventivas((prev) => [pObj, ...prev]);

    // Firestore update:
    if (!isOffline) {
      try {
        await setDoc(doc(db, 'preventivas', id), pObj);
        addToast('Sucesso', `Programação de parada do ${newPrev.equipamento} registrada!`, 'success');
      } catch (err) {
        console.error('Erro ao salvar preventiva no Firestore:', err);
        addToast('Erro', 'Não foi possível salvar a programação no servidor.', 'error');
      }
    } else {
      // Save offline
      const savedOffline = localStorage.getItem('rft_preventivas_offline') || '[]';
      try {
        const list = JSON.parse(savedOffline);
        list.push(pObj);
        localStorage.setItem('rft_preventivas_offline', JSON.stringify(list));
        addToast('Salvo Offline', `Parada do ${newPrev.equipamento} salva localmente (offline)!`, 'info');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleUpdatePreventiva = async (updatedPrev: Preventiva) => {
    // Optimistic state update:
    setPreventivas((prev) => prev.map((p) => (p.id === updatedPrev.id ? updatedPrev : p)));

    if (!isOffline) {
      try {
        await setDoc(doc(db, 'preventivas', updatedPrev.id), updatedPrev);
        addToast('Sucesso', `Parada do ${updatedPrev.equipamento} atualizada!`, 'success');
      } catch (err) {
        console.error('Erro ao atualizar preventiva no Firestore:', err);
        addToast('Erro', 'Não foi possível salvar alteração no servidor.', 'error');
      }
    } else {
      addToast('Salvo Offline', 'Parada atualizada localmente offline.', 'info');
    }
  };

  const handleDeletePreventiva = async (id: string) => {
    addDeletedPreventivaId(id);
    const original = [...preventivas];
    setPreventivas((prev) => prev.filter(p => p.id !== id));

    // Also clean from offline cache
    try {
      const savedOffline = localStorage.getItem('rft_preventivas_offline');
      if (savedOffline) {
        const list = JSON.parse(savedOffline);
        const filtered = list.filter((p: any) => p.id !== id);
        localStorage.setItem('rft_preventivas_offline', JSON.stringify(filtered));
      }
    } catch (e) {}

    if (!isOffline) {
      try {
        await deleteDoc(doc(db, 'preventivas', id));
        addToast('Removido', 'Programação de parada removida com sucesso.', 'success');
      } catch (err) {
        setPreventivas(original);
        console.error('Erro ao deletar preventiva no Firestore:', err);
        addToast('Erro', 'Não foi possível deletar a programação.', 'error');
      }
    } else {
      addToast('Removido Localmente', 'Programação de parada removida offline.', 'info');
    }
  };

  const handleClearAllPreventivas = async () => {
    try {
      preventivas.forEach(p => addDeletedPreventivaId(p.id));
      setPreventivas([]);
      try {
        localStorage.removeItem('rft_preventivas_offline');
      } catch (e) {}

      if (!isOffline) {
        try {
          const { getDocs, writeBatch } = await import('firebase/firestore');
          const snap = await getDocs(collection(db, 'preventivas'));
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.forEach((d) => {
              addDeletedPreventivaId(d.id);
              batch.delete(doc(db, 'preventivas', d.id));
            });
            await batch.commit();
          }
        } catch (err) {
          console.error('Erro ao limpar preventivas no Firestore:', err);
        }
      }
      addToast('Banco de Preventivas Zerado', 'Todas as programações foram removidas com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao zerar preventivas:', err);
    }
  };

  const handleAddPreventivasBulk = async (newPrevs: Omit<Preventiva, 'id' | 'createdAt'>[]) => {
    const pObjs: Preventiva[] = newPrevs.map((newPrev, idx) => ({
      id: `prev-${Date.now()}-${idx}-${Math.random()}`,
      ...newPrev,
      createdAt: new Date().toISOString()
    }));

    setPreventivas((prev) => [...pObjs, ...prev]);

    if (!isOffline) {
      try {
        const { writeBatch, doc } = await import('firebase/firestore');
        const batch = writeBatch(db);
        pObjs.forEach((p) => {
          batch.set(doc(db, 'preventivas', p.id), p);
        });
        await batch.commit();
        addToast('Sucesso', `${pObjs.length} programações carregadas com sucesso!`, 'success');
      } catch (err) {
        console.error('Erro ao salvar preventivas em lote:', err);
        addToast('Erro', 'Não foi possível sincronizar o lote com o servidor.', 'error');
      }
    } else {
      const savedOffline = localStorage.getItem('rft_preventivas_offline') || '[]';
      try {
        const list = JSON.parse(savedOffline);
        list.push(...pObjs);
        localStorage.setItem('rft_preventivas_offline', JSON.stringify(list));
        addToast('Salvo Offline', `${pObjs.length} itens salvos localmente offline.`, 'info');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 2.3 Listen to tecnicos collection (shared single source of truth for Admin and Controle)
  const saveTecnicosLocalCache = (lista: Tecnico[]) => {
    try {
      const json = JSON.stringify(lista);
      localStorage.setItem('rft_tecnicos', json);
      localStorage.setItem('rft_tecnicos_cache', json);
      localStorage.setItem('tecnicos', json);
    } catch (e) {}
  };

  useEffect(() => {
    // Also fetch from /api/tecnicos on boot / online to ensure cross-device sync even if Firestore is empty or restricted
    if (!isOffline) {
      fetch('/api/tecnicos')
        .then((res) => (res.ok ? res.json() : []))
        .then((apiList) => {
          if (Array.isArray(apiList) && apiList.length > 0) {
            const deletedTecs = getDeletedTecnicoIds();
            const normalizedApi: Tecnico[] = apiList
              .filter((t: any) => t && t.nome && !deletedTecs.has(t.id) && !isSampleMockTecnico(t))
              .map((t: any) => {
                const funcao = t.funcao || 'Mecânico';
                const matricula = normalizarMatricula(t.matricula);
                return {
                  id: t.id || `tec-${matricula || Date.now()}`,
                  nome: formatarNomeSobrenome(t.nome),
                  funcao,
                  grupo: t.grupo || classificarGrupoFuncao(funcao),
                  matricula,
                  secao: t.secao || '',
                  status: t.status || 'ativo',
                  createdAt: t.createdAt || '',
                  atualizadoEm: t.atualizadoEm || ''
                };
              });
            if (normalizedApi.length > 0) {
              setTecnicos((prev) => {
                if (prev.length >= normalizedApi.length) return prev;
                const sorted = [...normalizedApi].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                saveTecnicosLocalCache(sorted);
                return sorted;
              });
            }
          }
        })
        .catch(() => {});
    }

    if (isOffline) return;

    const tq = query(collection(db, 'tecnicos'));
    const unsubscribe = onSnapshot(tq, (snapshot) => {
      if (snapshot.empty) {
        return;
      }

      const deletedTecs = getDeletedTecnicoIds();
      const porMatriculaOuId = new Map<string, Tecnico>();
      snapshot.forEach((docSnap) => {
        try {
          if (!deletedTecs.has(docSnap.id)) {
            const data = docSnap.data();
            const funcao = data.funcao || 'Mecânico';
            const matricula = normalizarMatricula(data.matricula);
            const candidate: Tecnico = {
              id: docSnap.id,
              nome: formatarNomeSobrenome(data.nome || ''),
              funcao,
              grupo: data.grupo || classificarGrupoFuncao(funcao),
              matricula,
              secao: data.secao || '',
              status: data.status || 'ativo',
              createdAt: data.createdAt || '',
              atualizadoEm: data.atualizadoEm || ''
            };
            if (!isSampleMockTecnico(candidate) && candidate.nome) {
              const key = matricula || candidate.id;
              porMatriculaOuId.set(key, candidate);
            } else if (isSampleMockTecnico(candidate)) {
              deleteDoc(doc(db, 'tecnicos', docSnap.id)).catch(() => {});
            }
          }
        } catch (e) {
          console.error('Mapeamento falhou para tecnico:', e);
        }
      });

      const serverTecs = Array.from(porMatriculaOuId.values()).sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      );
      setTecnicos(serverTecs);
      saveTecnicosLocalCache(serverTecs);
    }, (error) => {
      console.warn('Erro ao escutar tecnicos Firestore:', error);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOffline]);

  const handleAddTecnico = async (newTec: Omit<Tecnico, 'id' | 'createdAt'>) => {
    const matriculaNorm = normalizarMatricula(newTec.matricula);
    const id = matriculaNorm ? `tec-${matriculaNorm}` : `tec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const funcao = newTec.funcao || 'Mecânico';
    const tecObj: Tecnico = {
      id,
      ...newTec,
      nome: formatarNomeSobrenome(newTec.nome),
      funcao,
      grupo: newTec.grupo || classificarGrupoFuncao(funcao),
      matricula: matriculaNorm,
      status: newTec.status || 'ativo',
      createdAt: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    setTecnicos((prev) => {
      const filtered = prev.filter(
        (t) => t.id !== tecObj.id && (!matriculaNorm || normalizarMatricula(t.matricula) !== matriculaNorm)
      );
      const updated = [...filtered, tecObj].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      saveTecnicosLocalCache(updated);
      return updated;
    });

    if (!isOffline) {
      try {
        await setDoc(doc(db, 'tecnicos', id), tecObj);
      } catch (err) {
        console.error('Erro ao salvar tecnico no Firestore:', err);
      }
      fetch('/api/tecnicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tecObj)
      }).catch(() => {});
    }

    addToast('Técnico Cadastrado', `${tecObj.nome} (${tecObj.funcao}) cadastrado com sucesso!`, 'success');
  };

  const handleAddTecnicosBulk = async (novosTecnicos: Tecnico[]) => {
    if (!novosTecnicos || novosTecnicos.length === 0) return;

    // Remove qualquer tombstone das matrículas/IDs que estão sendo importados
    clearDeletedTecnicoIds();

    const normalizados: Tecnico[] = novosTecnicos.map((t, idx) => {
      const matricula = normalizarMatricula(t.matricula);
      const funcao = t.funcao || 'Mecânico';
      const id = matricula ? `tec-${matricula}` : t.id || `tec-${Date.now()}-${idx}`;
      return {
        ...t,
        id,
        nome: formatarNomeSobrenome(t.nome),
        funcao,
        grupo: t.grupo || classificarGrupoFuncao(funcao),
        matricula,
        secao: t.secao || '',
        status: 'ativo',
        createdAt: t.createdAt || new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
      };
    });

    let listaFinal: Tecnico[] = [];
    setTecnicos((prev) => {
      const mapa = new Map<string, Tecnico>();
      prev.forEach((t) => {
        const key = normalizarMatricula(t.matricula) || t.id;
        mapa.set(key, t);
      });
      normalizados.forEach((t) => {
        const key = normalizarMatricula(t.matricula) || t.id;
        const existente = mapa.get(key);
        mapa.set(key, existente ? { ...existente, ...t, id: existente.id, status: 'ativo' } : t);
      });
      listaFinal = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      saveTecnicosLocalCache(listaFinal);
      return listaFinal;
    });

    if (!isOffline) {
      try {
        const { writeBatch } = await import('firebase/firestore');
        const paraGravar = listaFinal.length > 0 ? listaFinal : normalizados;
        const TAMANHO_LOTE = 400;
        for (let i = 0; i < paraGravar.length; i += TAMANHO_LOTE) {
          const fatia = paraGravar.slice(i, i + TAMANHO_LOTE);
          const batch = writeBatch(db);
          fatia.forEach((tec) => {
            batch.set(doc(db, 'tecnicos', tec.id), tec);
          });
          await batch.commit();
        }
      } catch (err) {
        console.error('Erro ao gravar lote de técnicos no Firestore:', err);
      }

      fetch('/api/tecnicos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listaFinal.length > 0 ? listaFinal : normalizados)
      }).catch(() => {});
    }

    addToast(
      'Importação Concluída',
      `${normalizados.length} técnicos importados`,
      'success'
    );
  };

  const handleUpdateTecnico = async (updatedTec: Tecnico) => {
    setTecnicos((prev) => {
      const updated = prev.map((t) => t.id === updatedTec.id ? updatedTec : t).sort((a, b) => a.nome.localeCompare(b.nome));
      try { localStorage.setItem('rft_tecnicos', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    if (!isOffline) {
      try {
        await setDoc(doc(db, 'tecnicos', updatedTec.id), updatedTec);
      } catch (err) {
        console.error('Erro ao atualizar tecnico no Firestore:', err);
      }
      fetch('/api/tecnicos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTec)
      }).catch(() => {});
    }

    addToast('Técnico Atualizado', `Dados de ${updatedTec.nome} foram atualizados.`, 'info');
  };

  const handleDeleteTecnico = async (id: string) => {
    addDeletedTecnicoId(id);
    const tecToDelete = tecnicos.find((t) => t.id === id);
    setTecnicos((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try { localStorage.setItem('rft_tecnicos', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    if (!isOffline) {
      try {
        await deleteDoc(doc(db, 'tecnicos', id));
      } catch (err) {
        console.error('Erro ao excluir tecnico no Firestore:', err);
      }
      fetch(`/api/tecnicos/${id}`, { method: 'DELETE' }).catch(() => {});
    }

    addToast('Técnico Removido', `${tecToDelete?.nome || 'Técnico'} foi excluído da lista.`, 'info');
  };

  const handleClearAllTecnicos = async () => {
    tecnicos.forEach(t => addDeletedTecnicoId(t.id));
    setTecnicos([]);
    try { localStorage.setItem('rft_tecnicos', JSON.stringify([])); } catch (e) {}

    if (!isOffline) {
      try {
        const { getDocs, writeBatch } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'tecnicos'));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((d) => {
            addDeletedTecnicoId(d.id);
            batch.delete(doc(db, 'tecnicos', d.id));
          });
          await batch.commit();
        }
      } catch (err) {
        console.error('Erro ao limpar tecnicos no Firestore:', err);
      }
      fetch('/api/tecnicos/clear', { method: 'POST' }).catch(() => {});
    }

    addToast('Banco de Cadastro Zerado', 'O banco de técnicos foi completamente zerado. Pronto para novos cadastros!', 'success');
  };

  const handleRestoreDefaultTecnicos = async () => {
    // Disabled to preserve clean database state for user registrations
  };

  // 3. Monitor browser tab status & hardware connectivity changes
  useEffect(() => {
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 4. Compact UI Connection status pills
  useEffect(() => {
    if (isOffline) {
      setSyncState('offline');
    } else {
      setSyncState('syncing');
      const timer = setTimeout(() => {
        setSyncState('synced');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  // Helper callback passed to the syncEngine to update status live
  const updateReportStatus = (id: string, newStatus: ReportStatus) => {
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, status: newStatus };
          // Save updated status to IndexedDB immediately
          dbSaveReport(updated).catch(e => console.error('Erro ao atualizar status no Indexeddb:', e));
          return updated;
        }
        return r;
      });
      setTimeout(() => safeSaveLocalReports(next), 0);
      return next;
    });
  };

  // 5. BACKGROUND WORKER: Automatically uploads PENDENTE_SINCRONIZACAO or ERRO_SINCRONIZACAO when online
  useEffect(() => {
    if (isOffline) return;

    const pendingList = reports.filter(
      (r) => r.status === 'PENDENTE_SINCRONIZACAO' || r.status === 'ERRO_SINCRONIZACAO'
    );
    if (pendingList.length === 0 || isSyncInProgressRef.current) return;

    async function syncQueuedReports() {
      if (isSyncInProgressRef.current) return;
      isSyncInProgressRef.current = true;

      for (const report of pendingList) {
        try {
          // Sync with Firestore collection & Storage images
          const synced = await syncSingleReport(db, storage, report, (id, status) => {
            updateReportStatus(id, status);
          });

          // Secondary mirror back-up to legacy Express file system
          fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(synced)
          }).catch(err => {
            console.warn('Falha do backup JSON Express secundário:', err);
          });

          addToast(
            'Sincronizado!',
            `Relatório U&M (${report.team} — ${report.frente}) sincronizado com o Firebase com sucesso!`,
            'success'
          );
        } catch (err) {
          console.error(`Falha ao sincronizar em background o relatório ${report.id}:`, err);
          // SyncEngine automatically sets status to ERRO_SINCRONIZACAO which remains local
        }
      }

      isSyncInProgressRef.current = false;
    }

    syncQueuedReports();
  }, [isOffline, reports]);

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('rft_current_user', JSON.stringify(user));
    dbSaveSession(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('rft_current_user');
    dbSaveSession(null);
  };

  const handleSaveReport = (updatedReport: Report, silent: boolean = false) => {
    let finalReport = { ...updatedReport };

    // Standard Offline-First Rule: If finalized as ENVIADO but offline, save with status PENDENTE_SINCRONIZACAO.
    // If online, save it with status PENDENTE_SINCRONIZACAO first, which instantly triggers the background sync worker!
    if (finalReport.status === 'ENVIADO') {
      finalReport.status = 'PENDENTE_SINCRONIZACAO';
    }

    setReports((prev) => {
      const exists = prev.some((r) => r.id === finalReport.id);
      const nextReports = exists
        ? prev.map((r) => (r.id === finalReport.id ? finalReport : r))
        : [finalReport, ...prev];
      
      setTimeout(() => safeSaveLocalReports(nextReports), 0);
      return nextReports;
    });

    // Automatically link or create Paradas and insert EXEC MANUT segments on finalized reports
    if (finalReport.atendimentos && finalReport.atendimentos.length > 0) {
      setParadas((prevParadas) => {
        const updatedParadas = processarAtendimentosParaParadas(
          prevParadas,
          finalReport.id,
          finalReport.atendimentos,
          currentUser?.username || 'sistema',
          finalReport.dateStart
        );
        dbSaveParadasBulk(updatedParadas).catch(() => {});
        try { localStorage.setItem('rft_paradas', JSON.stringify(updatedParadas)); } catch (e) {}

        if (!isOffline) {
          updatedParadas.forEach((p) => {
            setDoc(doc(db, 'paradas', p.id), p).catch((err) => {
              console.error('Erro ao sincronizar parada vinculada com o Firestore:', err);
            });
          });
        }
        return updatedParadas;
      });
    }

    // Instantly persist completely to the device's IndexedDB
    dbSaveReport(finalReport).catch((err) => {
      console.error('Falha de escrita do Relatório em IndexedDB:', err);
    });

    if (silent) return; // Background auto-saves do not produce spammy popup alerts

    if (finalReport.status === 'PENDENTE_SINCRONIZACAO') {
      if (isOffline) {
        addToast(
          'Salvo Localmente (Offline)',
          'O relatório foi gravado offline no aparelho. Será sincronizado assim que houver rede.',
          'warning'
        );
      } else {
        addToast(
          'Gravando e Enviando',
          'Sincronizando dados e evidências fotográficas com o Firebase...',
          'info'
        );
      }
    } else {
      addToast('Sucesso', 'Rascunho do Relatório U&M salvo localmente com sucesso.', 'success');
    }
  };

  const handleDeleteReport = (id: string) => {
    addDeletedReportId(id);
    setReports((prev) => {
      const nextReports = prev.filter((r) => r.id !== id);
      setTimeout(() => safeSaveLocalReports(nextReports), 0);
      return nextReports;
    });

    // Delete locally
    dbDeleteReport(id).catch((err) => {
      console.error('Erro ao excluir do IndexedDB:', err);
    });

    // If online, also delete from Firebase Firestore
    if (!isOffline) {
      const docRef = doc(db, 'relatorios', id);
      deleteDoc(docRef).catch((err) => {
        console.error('Erro ao excluir documento do Firestore:', err);
      });
      
      // Mirror delete to Express
      fetch(`/api/reports/${id}`, {
        method: 'DELETE'
      }).catch(err => {
        console.warn('Erro ao excluir no servidor Express:', err);
      });
    }

    addToast('Relatório Excluído', 'O relatório foi removido com sucesso.', 'success');
  };

  const handleClearAllReports = async () => {
    try {
      reports.forEach(r => addDeletedReportId(r.id));
      setReports([]);
      safeSaveLocalReports([]);
      await dbClearReports();

      if (!isOffline) {
        try {
          const { getDocs, writeBatch } = await import('firebase/firestore');
          const snap = await getDocs(collection(db, 'relatorios'));
          if (!snap.empty) {
            const batch = writeBatch(db);
            snap.forEach((d) => {
              addDeletedReportId(d.id);
              batch.delete(doc(db, 'relatorios', d.id));
            });
            await batch.commit();
          }
        } catch (err) {
          console.error('Erro ao limpar relatorios no Firestore:', err);
        }

        fetch('/api/reports/clear', { method: 'POST' }).catch(() => {});
      }
      addToast('Banco de Relatórios Zerado', 'Todos os relatórios foram excluídos com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao zerar os relatórios:', err);
      addToast('Erro ao Zerar', 'Não foi possível redefinir todos os dados.', 'error');
    }
  };

  const handleClearAllDatabase = async () => {
    try {
      await handleClearAllReports();
      await handleClearAllPreventivas();
      await handleClearAllTecnicos();
      await handleClearAllParadas();
      addToast(
        'Banco Totalmente Zerado',
        'Todos os dados de relatórios, preventivas, técnicos e paradas foram zerados. Pronto para começar a cadastrar do zero!',
        'success'
      );
    } catch (err) {
      console.error('Erro ao zerar banco completo:', err);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--um-fundo)] flex flex-col font-sans text-[var(--um-cinza-texto)] antialiased">
        {currentUser ? (
          <>
            <Navbar
              user={currentUser}
              onLogout={handleLogout}
              syncState={syncState}
              currentViewMode={viewMode || currentUser.role}
              onToggleViewMode={currentUser.role === 'admin' ? handleToggleViewMode : undefined}
            />
            
            <main className="flex-1 pb-32">
              {(viewMode || currentUser.role) === 'admin' ? (
                <AdminView
                  reports={reports}
                  onDeleteReport={handleDeleteReport}
                  onClearAll={handleClearAllReports}
                  isOffline={isOffline}
                  preventivas={preventivas}
                  onAddPreventiva={handleAddPreventiva}
                  onAddPreventivasBulk={handleAddPreventivasBulk}
                  onUpdatePreventiva={handleUpdatePreventiva}
                  onDeletePreventiva={handleDeletePreventiva}
                  onClearAllPreventivas={handleClearAllPreventivas}
                  currentUser={currentUser}
                  onSaveReport={handleSaveReport}
                  tecnicos={tecnicos}
                  onAddTecnico={handleAddTecnico}
                  onAddTecnicosBulk={handleAddTecnicosBulk}
                  onUpdateTecnico={handleUpdateTecnico}
                  onDeleteTecnico={handleDeleteTecnico}
                  onRestoreDefaultTecnicos={handleRestoreDefaultTecnicos}
                  onClearAllTecnicos={handleClearAllTecnicos}
                  onClearAllDatabase={handleClearAllDatabase}
                  paradas={paradas}
                  onSaveParada={handleSaveParada}
                  onDeleteParada={handleDeleteParada}
                />
              ) : (
                <MechanicView
                  user={currentUser}
                  reports={reports}
                  onSaveReport={handleSaveReport}
                  isOffline={isOffline}
                  onDeleteReport={handleDeleteReport}
                  preventivas={preventivas}
                  onAddPreventiva={handleAddPreventiva}
                  onDeletePreventiva={handleDeletePreventiva}
                  tecnicos={tecnicos}
                  paradas={paradas}
                  onSaveParada={handleSaveParada}
                />
              )}
            </main>
          </>
        ) : (
          <Login onLogin={handleLogin} />
        )}

        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    </ErrorBoundary>
  );
}
