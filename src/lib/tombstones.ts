// Persistent tombstones to ensure deleted items never get resurrected by Firestore onSnapshot, background sync, or IndexedDB caching

const KEY_DELETED_REPORTS = 'rft_deleted_report_ids';
const KEY_DELETED_TECNICOS = 'rft_deleted_tecnico_ids';
const KEY_DELETED_PREVENTIVAS = 'rft_deleted_preventiva_ids';

export const SAMPLE_MOCK_TECNICO_IDS = [
  'tec-1', 'tec-2', 'tec-3', 'tec-4', 'tec-5', 'tec-6', 
  'tec-7', 'tec-8', 'tec-9', 'tec-10', 'tec-11', 'tec-12'
];

export const SAMPLE_MOCK_NAMES = new Set([
  'anderson lima', 'angelo santos', 'antonio junior', 'carlos alberto',
  'ezequias ramos', 'josé eduardo', 'jose eduardo', 'lucas ferreira',
  'marcos souza', 'paulo henrique', 'rafael oliveira', 'roberto mendes',
  'valdeir santos'
]);

export function isSampleMockTecnico(tec: { id?: string; nome?: string; matricula?: string }): boolean {
  if (!tec) return false;
  if (tec.matricula && /^\d{4,6}$/.test(String(tec.matricula).trim())) return false;
  if (tec.id && SAMPLE_MOCK_TECNICO_IDS.includes(tec.id)) return true;
  if (tec.nome && SAMPLE_MOCK_NAMES.has(tec.nome.trim().toLowerCase())) return true;
  return false;
}

function getStoredSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

function saveStoredSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function getDeletedReportIds(): Set<string> {
  return getStoredSet(KEY_DELETED_REPORTS);
}

export function addDeletedReportId(id: string) {
  const set = getStoredSet(KEY_DELETED_REPORTS);
  set.add(id);
  saveStoredSet(KEY_DELETED_REPORTS, set);
}

export function clearDeletedReportIds() {
  try { localStorage.removeItem(KEY_DELETED_REPORTS); } catch (e) {}
}

export function getDeletedTecnicoIds(): Set<string> {
  const set = getStoredSet(KEY_DELETED_TECNICOS);
  SAMPLE_MOCK_TECNICO_IDS.forEach(id => set.add(id));
  return set;
}

export function addDeletedTecnicoId(id: string) {
  const set = getStoredSet(KEY_DELETED_TECNICOS);
  set.add(id);
  saveStoredSet(KEY_DELETED_TECNICOS, set);
}

export function clearDeletedTecnicoIds() {
  try { localStorage.removeItem(KEY_DELETED_TECNICOS); } catch (e) {}
}

export function getDeletedPreventivaIds(): Set<string> {
  return getStoredSet(KEY_DELETED_PREVENTIVAS);
}

export function addDeletedPreventivaId(id: string) {
  const set = getStoredSet(KEY_DELETED_PREVENTIVAS);
  set.add(id);
  saveStoredSet(KEY_DELETED_PREVENTIVAS, set);
}

export function clearDeletedPreventivaIds() {
  try { localStorage.removeItem(KEY_DELETED_PREVENTIVAS); } catch (e) {}
}

const KEY_DELETED_PARADAS = 'rft_deleted_parada_ids';

export function getDeletedParadaIds(): Set<string> {
  return getStoredSet(KEY_DELETED_PARADAS);
}

export function addDeletedParadaId(id: string) {
  const set = getStoredSet(KEY_DELETED_PARADAS);
  set.add(id);
  saveStoredSet(KEY_DELETED_PARADAS, set);
}

export function clearDeletedParadaIds() {
  try { localStorage.removeItem(KEY_DELETED_PARADAS); } catch (e) {}
}

