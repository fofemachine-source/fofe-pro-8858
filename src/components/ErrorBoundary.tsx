import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrandLogo } from './BrandLogo';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou uma falha na aplicação U&M:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Tenta recarregar o estado
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--um-fundo)] flex flex-col justify-between p-6 sm:p-10 font-sans">
          {/* Topo com Logo Oficial U&M posicionado no canto superior direito */}
          <header className="flex justify-between items-center w-full max-w-5xl mx-auto">
            <div>
              <span className="text-[12px] font-light uppercase tracking-wider text-[var(--um-cinza-texto)]">
                SISTEMA OPERACIONAL U&M
              </span>
            </div>
            <div>
              <BrandLogo className="h-10 sm:h-12" />
            </div>
          </header>

          {/* Cartão Central de Erro */}
          <main className="flex-1 flex items-center justify-center py-10">
            <div className="w-full max-w-xl bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl p-8 sm:p-10 shadow-sm text-center">
              {/* Ícone de status no padrão U&M (alerta amarelo ouro ou falha vermelha) */}
              <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-[var(--um-alerta-claro)] flex items-center justify-center border border-[var(--um-alerta)]">
                <span className="text-2xl" role="img" aria-label="Atenção">⚠️</span>
              </div>

              <h1 className="text-[24px] sm:text-[28px] font-light uppercase text-[var(--um-verde-principal)] tracking-wide mb-3">
                {this.props.fallbackTitle || 'OCORREU UMA FALHA INESPERADA'}
              </h1>

              <p className="text-[14px] font-normal text-[var(--um-cinza-texto)] leading-relaxed mb-6">
                {this.props.fallbackMessage ||
                  'Identificamos uma instabilidade temporária no carregamento deste módulo. Seus dados locais continuam preservados e seguros.'}
              </p>

              {this.state.error?.message && (
                <div className="p-3 mb-6 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] rounded-xl text-left font-mono text-[12px] text-[var(--um-cinza-texto)] overflow-x-auto">
                  <span className="font-medium text-[var(--um-verde-principal)] block mb-1 uppercase">Detalhe técnico:</span>
                  {this.state.error.message}
                </div>
              )}

              {/* Botão Tentar Novamente seguindo estritamente a identidade visual U&M */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="w-full sm:w-auto px-6 py-3 bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] rounded-xl font-light text-[14px] uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-sm"
                >
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full sm:w-auto px-5 py-3 bg-[var(--um-fundo)] hover:bg-[var(--um-cinza-claro)] text-[var(--um-cinza-texto)] border border-[var(--um-cinza-claro)] rounded-xl font-normal text-[12px] transition cursor-pointer"
                >
                  Limpar Cache & Reiniciar
                </button>
              </div>
            </div>
          </main>

          {/* Rodapé institucional */}
          <footer className="w-full max-w-5xl mx-auto text-center py-4 border-t border-[var(--um-cinza-claro)]">
            <span className="text-[12px] font-normal text-[var(--um-cinza-texto)]">
              U&M Mineração e Construção S/A • Todos os direitos reservados
            </span>
          </footer>
        </div>
      );
    }

    return this.props.children;
  }
}
