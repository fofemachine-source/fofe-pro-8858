import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
console.log('FirebaseConfig:', firebaseConfig);
const app = initializeApp(firebaseConfig);
console.log('Firebase App initialized:', app);

// Initialize Firestore with the exact Database Id from config (crucial for platform consistency)
console.log('Initializing Firestore with DB ID:', firebaseConfig.firestoreDatabaseId);
let firestoreInst;
try {
  firestoreInst = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.error('Failed to initialize Firestore with DB ID:', e);
  firestoreInst = getFirestore(app);
}
export const db = firestoreInst;
console.log('Exported Firestore Database instance:', db);

// Initialize Storage
export const storage = getStorage(app);

// Error handling utility following platform ABAC requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'test-user', // Using default/app user context if Auth is not active
      email: 'user@example.com'
    },
    operationType,
    path
  };
  console.error('Firestore SECURE Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
