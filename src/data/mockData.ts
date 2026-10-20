import { Report, User, Tecnico } from '../types';

export const PRESET_USERS: User[] = [
  { username: 'admin', name: 'Supervisor Admin', role: 'admin' },
  { username: 'controle', name: 'Controle de Frota (Ezequias)', role: 'mechanic' }
];

// Start completely empty so the user can register their own team from scratch
export const PRESET_TECNICOS: Tecnico[] = [];
export const SAMPLE_TECNICOS_UM: Tecnico[] = [];

export const INITIAL_REPORTS: Report[] = [];


