export interface SyncLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function getSyncLogs(): SyncLog[] {
  try {
    const saved = localStorage.getItem('rft_sync_logs');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function saveSyncLogs(logs: SyncLog[]) {
  try {
    localStorage.setItem('rft_sync_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Falha de escrita no localStorage para logs:', e);
  }
}

export function addSyncLog(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): SyncLog {
  const logs = getSyncLogs();
  const formatTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };
  
  const newLog: SyncLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: formatTime(new Date()),
    message,
    type
  };
  
  // Keep last 80 logs for premium space performance
  const updated = [newLog, ...logs].slice(0, 80);
  saveSyncLogs(updated);
  
  // Dispatch a custom event so any React component can re-render in real-time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rft_new_sync_log', { detail: newLog }));
  }
  
  return newLog;
}

export function clearSyncLogs() {
  try {
    localStorage.removeItem('rft_sync_logs');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rft_new_sync_log', { detail: null }));
    }
  } catch (e) {
    console.error(e);
  }
}
