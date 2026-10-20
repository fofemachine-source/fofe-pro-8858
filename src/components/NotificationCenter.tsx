import React from 'react';
import { X, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          ) : (
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
          );

        const borderClass =
          toast.type === 'success' ? 'border-emerald-500' :
          toast.type === 'warning' ? 'border-amber-500' :
          toast.type === 'error' ? 'border-rose-500' : 'border-blue-500';

        return (
          <div
            key={toast.id}
            className={`bg-white rounded-xl shadow-lg border-l-4 ${borderClass} p-4 flex gap-3 justify-between items-start transition-all transform animate-slide-in`}
          >
            <div className="flex gap-2 items-start">
              {icon}
              <div>
                <h4 className="font-bold text-xs text-gray-850 uppercase tracking-wider">{toast.title}</h4>
                <p className="text-xs text-gray-600 mt-1 leading-snug">{toast.message}</p>
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
