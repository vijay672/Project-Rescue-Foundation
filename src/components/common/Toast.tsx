import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md text-xs transition-all animate-in slide-in-from-bottom-2 ${
            toast.type === 'error'
              ? 'bg-[#FFFFFF] border-[#C34D4D]/30 text-[#C34D4D]'
              : toast.type === 'success'
              ? 'bg-[#FFFFFF] border-[#247A58]/30 text-[#247A58]'
              : 'bg-[#FFFFFF] border-[#176B68]/30 text-[#17252B]'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#C34D4D] shrink-0 mt-0.5" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#247A58] shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-[#176B68] shrink-0 mt-0.5" />
            )}
            <span className="font-medium leading-relaxed">{toast.message}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-[#64737A] hover:text-[#17252B] p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
