import { doc, setDoc, Firestore } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { Report, Atendimento } from '../types';
import { addSyncLog } from './syncLogger';
import { db as fallbackDb, storage as fallbackStorage } from './firebase';

/**
 * Maps a Firestore document data back into our local strongly-typed Report structure
 * to ensure absolute runtime and visual compatibility across screens.
 */
export function mapFirestoreDocToReport(docData: any, docId: string): Report {
  return {
    id: docId,
    dateStart: docData.data || docData.dateStart || '',
    dateEnd: docData.dateEnd || docData.data || '',
    team: docData.turma || docData.team || '',
    shift: docData.shift || '18:00 às 06:00',
    frente: docData.frente || '',
    eletricista: docData.equipe?.eletricista || docData.eletricista || '',
    mecanico: docData.equipe?.mecanico || docData.mecanico || '',
    auxiliar: docData.equipe?.auxiliar || docData.auxiliar || '',
    motorista: docData.equipe?.motorista || docData.motorista || '',
    monitor: docData.equipe?.monitor || docData.monitor || '',
    atendimentos: (docData.equipamentos || docData.atendimentos || []).map((at: any) => ({
      ...at,
      photoUrls: at.photoUrls || (at.photoUrl ? [at.photoUrl] : [])
    })),
    pendencias: docData.pendencias || [],
    observacoesGerais: docData.observacoes || docData.observacoesGerais || '',
    status: (docData.status || 'ENVIADO') as any,
    mechanicUsername: docData.usuario || docData.mechanicUsername || 'controle',
    createdAt: docData.dataCriacao || docData.createdAt || new Date().toISOString()
  };
}

/**
 * Maps a local Report structure to the exact fields specified by the user
 * for storing nicely structured documents inside Firestore.
 */
export function mapReportToFirestoreDoc(report: Report, uploadedUrls: Record<string, string> = {}) {
  return {
    id: report.id,
    usuario: report.mechanicUsername,
    data: report.dateStart,
    turma: report.team,
    frente: report.frente,
    equipe: {
      eletricista: report.eletricista,
      mecanico: report.mecanico,
      auxiliar: report.auxiliar,
      motorista: report.motorista,
      monitor: report.monitor || ""
    },
    equipamentos: report.atendimentos.map((at) => ({
      ...at,
      photoUrl: uploadedUrls[at.id] || at.photoUrl || "",
      photoUrls: at.photoUrls || (uploadedUrls[at.id] ? [uploadedUrls[at.id]] : (at.photoUrl ? [at.photoUrl] : []))
    })),
    pendencias: report.pendencias,
    observacoes: report.observacoesGerais,
    status: 'ENVIADO', // Synced documents are marked as ENVIADO
    dataCriacao: report.createdAt,
    dataSincronizacao: new Date().toISOString(),
    // Keep other fields for direct client-side compatibility as fallback
    dateStart: report.dateStart,
    dateEnd: report.dateEnd,
    shift: report.shift,
    eletricista: report.eletricista,
    mecanico: report.mecanico,
    auxiliar: report.auxiliar,
    motorista: report.motorista,
    monitor: report.monitor || "",
    atendimentos: report.atendimentos.map((at) => ({
      ...at,
      photoUrl: uploadedUrls[at.id] || at.photoUrl || "",
      photoUrls: at.photoUrls || (uploadedUrls[at.id] ? [uploadedUrls[at.id]] : (at.photoUrl ? [at.photoUrl] : []))
    })),
    mechanicUsername: report.mechanicUsername,
    createdAt: report.createdAt
  };
}

/**
 * Core Offline-First Sync logic for a single report. Handles photo uploads 
 * to Firebase Storage, database saves to Firestore, and recovery from errors.
 */
export async function syncSingleReport(
  db: Firestore,
  storage: FirebaseStorage,
  report: Report, 
  onStatusChange: (id: string, status: Report['status']) => void
): Promise<Report> {
  console.log('--- syncSingleReport Entry ---');
  console.log('db parameter:', db);
  console.log('db type:', typeof db);
  console.log('storage parameter:', storage);
  console.log('storage type:', typeof storage);
  console.log('report to sync:', report?.id);

  const activeDb = (db && typeof db === 'object') ? db : fallbackDb;
  const activeStorage = (storage && typeof storage === 'object') ? storage : fallbackStorage;

  console.log('Resolved activeDb:', activeDb);
  console.log('Resolved activeStorage:', activeStorage);

  if (!activeDb) {
    console.error('syncSingleReport: activeDb is still undefined or null! Synchronization will fail.');
  }

  // Let the system and UI know we are actively syncing this record
  onStatusChange(report.id, 'SINCRONIZANDO');
  addSyncLog(`Iniciando sincronização de Relatório ${report.id} (${report.team})...`, 'info');

  try {
    const updatedAtendimentos: Atendimento[] = [];

    // 1. Upload any base64 photos to Firebase Storage
    let imgCounter = 1;
    for (const at of report.atendimentos) {
      // Clean and establish initial photo list for backward compatibility
      const originalUrls = at.photoUrls && at.photoUrls.length > 0
        ? at.photoUrls
        : (at.photoUrl ? [at.photoUrl] : []);

      const uploadedList: string[] = [];
      for (let idx = 0; idx < originalUrls.length; idx++) {
        const pUrl = originalUrls[idx];
        if (pUrl && pUrl.startsWith('data:')) {
          try {
            // Unique file path for each photo
            const storagePath = `relatorios/${report.id}/${at.id}_${idx}.jpg`;
            const fileRef = ref(activeStorage, storagePath);

            // Upload the data URL string
            await uploadString(fileRef, pUrl, 'data_url');

            // Retrieve downloadable HTTP URL from storage bucket
            const downloadUrl = await getDownloadURL(fileRef);
            uploadedList.push(downloadUrl);
            
            addSyncLog(`Foto IMG-00${imgCounter++} (${at.equipamento}) enviada com sucesso ao Storage`, 'success');
          } catch (storageErr) {
            console.error(`Falha no upload da foto ${idx} do atendimento ${at.id} para o Storage:`, storageErr);
            addSyncLog(`Falha ao subir foto do equipamento ${at.equipamento}`, 'error');
            // Retain original base64 as fallback so data is not lost entirely
            uploadedList.push(pUrl);
          }
        } else if (pUrl && pUrl.startsWith('http')) {
          uploadedList.push(pUrl);
        }
      }

      updatedAtendimentos.push({
        ...at,
        photoUrl: uploadedList[0] || "",
        photoUrls: uploadedList
      });
    }

    // Prepare report with completely resolved Cloud Storage URLs
    const fullyUploadedReport: Report = {
      ...report,
      atendimentos: updatedAtendimentos
    };

    // 2. Prepare the mapped document for Firestore
    const firestorePayload = mapReportToFirestoreDoc(fullyUploadedReport);

    // 3. Write document to Firestore 'relatorios' collection
    const docRef = doc(activeDb, 'relatorios', report.id);
    await setDoc(docRef, firestorePayload);

    // 4. Return the fully synced report object
    const syncedReport: Report = {
      ...fullyUploadedReport,
      status: 'ENVIADO'
    };

    onStatusChange(report.id, 'ENVIADO');
    
    // Save last sync time
    localStorage.setItem('rft_last_sync_timestamp', new Date().toLocaleTimeString('pt-BR'));
    
    addSyncLog(`Relatório ${report.id} sincronizado com sucesso no Firestore`, 'success');
    addSyncLog(`Painel Admin atualizado em tempo real via Firestore`, 'success');

    return syncedReport;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Erro de sincronização de rede para o relatório ${report.id}:`, err);
    addSyncLog(`Erro de sinc do relatório ${report.id}: ${errMsg}`, 'error');
    onStatusChange(report.id, 'ERRO_SINCRONIZACAO');
    throw err;
  }
}
