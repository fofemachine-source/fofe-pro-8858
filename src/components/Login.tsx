import React, { useState } from 'react';
import { User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { PRESET_USERS } from '../data/mockData';
import { User } from '../types';
import { BrandLogo } from './BrandLogo';

interface LoginProps {
  onLogin: (user: User) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const u = username.trim().toLowerCase();
    const p = password.trim();

    if (!u || !p) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (p === '123') {
      const matchedUser = PRESET_USERS.find(
        (user) => user.username.toLowerCase() === u
      );
      if (matchedUser) {
        onLogin(matchedUser);
        return;
      } else {
        let displayName = u;
        if (u.includes('@')) {
          displayName = u.split('@')[0];
        }
        displayName = displayName
          .replace(/[_\-.]+/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        const dynamicUser: User = {
          username: u,
          name: displayName,
          role: (u.includes('admin') || u.includes('supervisor')) ? 'admin' : 'mechanic'
        };
        onLogin(dynamicUser);
        return;
      }
    }

    setError('Usuário ou senha incorretos. Dica: utilize "controle" ou "admin" com a senha "123".');
  };

  return (
    <div className="min-h-screen bg-[var(--um-fundo)] flex flex-col justify-between p-6 sm:p-10 font-sans">
      {/* Topo com Logotipo U&M posicionado no canto superior direito */}
      <header className="flex justify-between items-center w-full max-w-5xl mx-auto">
        <div>
          <span className="text-[12px] font-light uppercase tracking-wider text-[var(--um-cinza-texto)]">
            U&M MINERAÇÃO E CONSTRUÇÃO
          </span>
        </div>
        <div>
          <BrandLogo className="h-10 sm:h-12" />
        </div>
      </header>

      {/* Cartão de Autenticação */}
      <main className="flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-2xl p-8 sm:p-10 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-[28px] sm:text-[32px] font-light uppercase text-[var(--um-verde-principal)] tracking-wide">
              RELATÓRIO DE MANUTENÇÃO
            </h1>
            <h2 className="text-[14px] sm:text-[16px] font-light uppercase text-[var(--um-cinza-texto)] mt-1 tracking-wider">
              ACESSO AO SISTEMA
            </h2>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} id="login-form">
            {error && (
              <div className="bg-[var(--um-negativo-claro)] border border-[var(--um-negativo)] rounded-xl p-3 flex gap-2 text-[var(--um-negativo-escuro)] text-[12px] items-center">
                <AlertCircle className="w-4 h-4 shrink-0 text-[var(--um-negativo)]" />
                <span className="font-normal">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-[12px] font-light uppercase tracking-wider text-[var(--um-cinza-texto)] mb-2">
                USUÁRIO DO OPERADOR / SUPERVISOR
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-[var(--um-cinza-texto)]" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: controle ou admin"
                  className="w-full pl-10 pr-4 py-3 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-xl text-[12px] font-normal text-[var(--um-cinza-escuro)] placeholder-[var(--um-cinza-claro)] focus:outline-none focus:border-[var(--um-verde-principal)] focus:ring-1 focus:ring-[var(--um-verde-principal)] transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[12px] font-light uppercase tracking-wider text-[var(--um-cinza-texto)] mb-2">
                SENHA DE ACESSO
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[var(--um-cinza-texto)]" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha (padrão: 123)"
                  className="w-full pl-10 pr-4 py-3 bg-[var(--um-branco)] border border-[var(--um-cinza-claro)] rounded-xl text-[12px] font-normal text-[var(--um-cinza-escuro)] placeholder-[var(--um-cinza-claro)] focus:outline-none focus:border-[var(--um-verde-principal)] focus:ring-1 focus:ring-[var(--um-verde-principal)] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-[var(--um-verde-principal)] hover:bg-[var(--um-verde-secundario)] text-[var(--um-branco)] text-[14px] font-light uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer shadow-xs mt-2"
            >
              ENTRAR NO SISTEMA
            </button>
          </form>

          {/* Dica de Acesso */}
          <div className="mt-8 pt-6 border-t border-[var(--um-cinza-claro)] text-center">
            <span className="text-[12px] font-normal text-[var(--um-cinza-texto)] block">
              Contas de teste rápido:
            </span>
            <div className="flex justify-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('123'); }}
                className="px-3 py-1.5 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-principal)] text-[var(--um-cinza-texto)] rounded-lg text-[12px] font-normal uppercase transition cursor-pointer"
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() => { setUsername('controle'); setPassword('123'); }}
                className="px-3 py-1.5 bg-[var(--um-fundo)] border border-[var(--um-cinza-claro)] hover:border-[var(--um-verde-principal)] text-[var(--um-cinza-texto)] rounded-lg text-[12px] font-normal uppercase transition cursor-pointer"
              >
                CONTROLE
              </button>
            </div>
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
