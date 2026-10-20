import React from 'react';
import { LogOut } from 'lucide-react';
import { User } from '../types';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  syncState: 'online' | 'offline' | 'syncing' | 'synced';
  currentViewMode?: 'admin' | 'mechanic';
  onToggleViewMode?: () => void;
}

export function Navbar({
  user,
  onLogout,
  syncState,
  currentViewMode,
  onToggleViewMode
}: NavbarProps) {
  return (
    <header className="bg-[var(--um-branco)] border-b border-[var(--um-cinza-claro)] sticky top-0 z-40 select-none shadow-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Lado Esquerdo: Identificação do Sistema (Títulos em caixa alta Montserrat) */}
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-[16px] sm:text-[18px] font-light uppercase tracking-wider text-[var(--um-verde-principal)] leading-tight">
                U&M MINERAÇÃO
              </h2>
              <span className="text-[12px] font-normal text-[var(--um-cinza-texto)] lowercase block">
                sistema operacional de manutenção
              </span>
            </div>
          </div>

          {/* Lado Direito: Ações, Status, Usuário e LOGOTIPO OFICIAL NO CANTO SUPERIOR DIREITO */}
          <div className="flex items-center gap-3 sm:gap-5">
            
            {/* Alternância de Modo (Admin / Técnico) */}
            {onToggleViewMode && (
              <button
                type="button"
                onClick={onToggleViewMode}
                className="px-3.5 py-2 text-[12px] font-normal uppercase tracking-wider rounded-xl transition-all duration-150 cursor-pointer flex items-center gap-1.5 bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] shadow-xs"
                title={currentViewMode === 'admin' ? "Mudar para Modo Preencher Relatório (Técnico)" : "Mudar para Painel Supervisor (Admin)"}
              >
                {currentViewMode === 'admin' ? (
                  <>
                    <span>✍️</span>
                    <span className="hidden sm:inline">Preencher Relatório</span>
                  </>
                ) : (
                  <>
                    <span>📊</span>
                    <span className="hidden sm:inline">Painel Admin</span>
                  </>
                )}
              </button>
            )}

            {/* Selo de Conectividade com cores pelo significado oficial */}
            <div className="flex items-center">
              {syncState === 'offline' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--um-negativo-claro)] text-[var(--um-negativo-escuro)] text-[12px] font-normal tracking-tight border border-[var(--um-negativo)]">
                  <span>🔴</span>
                  <span>Offline</span>
                </div>
              )}
              
              {syncState === 'syncing' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--um-alerta-claro)] text-[var(--um-alerta-escuro)] text-[12px] font-normal tracking-tight border border-[var(--um-alerta)]">
                  <span className="animate-spin text-[10px]">🟡</span>
                  <span>Sincronizando</span>
                </div>
              )}

              {(syncState === 'synced' || syncState === 'online') && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--um-positivo-claro)] text-[var(--um-positivo-escuro)] text-[12px] font-normal tracking-tight border border-[var(--um-positivo)]">
                  <span>🟢</span>
                  <span>Online</span>
                </div>
              )}
            </div>

            {/* Identificação do Usuário */}
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[12px] font-medium text-[var(--um-cinza-escuro)] leading-tight">
                {user.name}
              </span>
              <span className="text-[12px] text-[var(--um-cinza-texto)] lowercase">
                {user.role === 'admin' ? 'supervisor admin' : 'mecânico / operador'}
              </span>
            </div>

            {/* Botão Sair */}
            <button
              type="button"
              onClick={onLogout}
              className="p-2 text-[var(--um-cinza-texto)] hover:bg-[var(--um-fundo)] hover:text-[var(--um-negativo)] rounded-xl transition-all cursor-pointer"
              title="Sair do sistema"
              id="btn-logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-[var(--um-cinza-claro)] hidden sm:block" />

            {/* LOGOTIPO OFICIAL U&M: Canto superior direito, mantendo proporção, espaço livre, sem recolorir nem sombra */}
            <div className="pl-1 flex items-center">
              <BrandLogo className="h-10 sm:h-12" />
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
