import { Report, User, Parada } from '../types';

const DB_NAME = 'RelatorioManutencaoDB';
const DB_VERSION = 2;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Erro ao abrir IndexedDB:', event);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      // Store for reports (Key is report.id)
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id' });
      }

      // Store for cached preset users for offline verification
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' });
      }

      // Store to preserve active session
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'key' });
      }

      // Config and miscellaneous
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }

      // Store for Paradas
      if (!db.objectStoreNames.contains('paradas')) {
        db.createObjectStore('paradas', { keyPath: 'id' });
      }
    };
  });
}

// Reports Operations
export async function dbSaveReport(report: Report): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('reports', 'readwrite');
    const store = transaction.objectStore(transaction.objectStoreNames[0] || 'reports');
    const request = store.put(report);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetReports(): Promise<Report[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('reports', 'readonly');
    const store = transaction.objectStore('reports');
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort reports by createdAt or custom date desc (newest first)
      const reports = request.result as Report[];
      reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(reports);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function dbDeleteReport(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('reports', 'readwrite');
    const store = transaction.objectStore('reports');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function dbClearReports(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('reports', 'readwrite');
    const store = transaction.objectStore('reports');
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function dbSaveReportsBulk(reports: Report[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('reports', 'readwrite');
    const store = transaction.objectStore('reports');
    
    reports.forEach((report) => {
      store.put(report);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// User Session persistence
export async function dbSaveSession(user: User | null): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('session', 'readwrite');
    const store = transaction.objectStore('session');
    
    if (user === null) {
      const request = store.delete('current_user');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } else {
      const request = store.put({ key: 'current_user', value: user });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }
  });
}

export async function dbGetSession(): Promise<User | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction('session', 'readonly');
      const store = transaction.objectStore('session');
      const request = store.get('current_user');

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => resolve(null); // Fallback gracefully if store is empty
    } catch {
      resolve(null);
    }
  });
}

// Users Catalog operations (For offline authentication cache)
export async function dbSaveUsers(users: User[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('users', 'readwrite');
    const store = transaction.objectStore('users');
    
    users.forEach((user) => {
      store.put(user);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function dbGetUsers(): Promise<User[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction('users', 'readonly');
      const store = transaction.objectStore('users');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result.length > 0 ? request.result : []);
      };
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

// Paradas Operations
export async function dbSaveParada(parada: Parada): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction('paradas', 'readwrite');
      const store = transaction.objectStore('paradas');
      const request = store.put(parada);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    } catch (e) {
      // Fallback if store not present
      try {
        const local = JSON.parse(localStorage.getItem('rft_paradas') || '[]');
        const updated = [parada, ...local.filter((p: Parada) => p.id !== parada.id)];
        localStorage.setItem('rft_paradas', JSON.stringify(updated));
        resolve();
      } catch (err) {
        resolve();
      }
    }
  });
}

export async function dbGetParadas(): Promise<Parada[]> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('paradas')) {
        const local = JSON.parse(localStorage.getItem('rft_paradas') || '[]');
        return resolve(local);
      }
      const transaction = db.transaction('paradas', 'readonly');
      const store = transaction.objectStore('paradas');
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result as Parada[]);
      };
      request.onerror = () => {
        const local = JSON.parse(localStorage.getItem('rft_paradas') || '[]');
        resolve(local);
      };
    } catch {
      const local = JSON.parse(localStorage.getItem('rft_paradas') || '[]');
      resolve(local);
    }
  });
}

export async function dbDeleteParada(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('paradas')) {
        const local = JSON.parse(localStorage.getItem('rft_paradas') || '[]');
        localStorage.setItem('rft_paradas', JSON.stringify(local.filter((p: Parada) => p.id !== id)));
        return resolve();
      }
      const transaction = db.transaction('paradas', 'readwrite');
      const store = transaction.objectStore('paradas');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function dbClearParadas(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('paradas')) {
        localStorage.removeItem('rft_paradas');
        return resolve();
      }
      const transaction = db.transaction('paradas', 'readwrite');
      const store = transaction.objectStore('paradas');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function dbSaveParadasBulk(paradas: Parada[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('paradas')) {
        localStorage.setItem('rft_paradas', JSON.stringify(paradas));
        return resolve();
      }
      const transaction = db.transaction('paradas', 'readwrite');
      const store = transaction.objectStore('paradas');
      paradas.forEach((p) => store.put(p));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

