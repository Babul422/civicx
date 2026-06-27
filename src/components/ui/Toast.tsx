import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, HelpCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  type: ToastType;
}

// Global subscribers for toast events
type ToastCallback = (toast: ToastItem) => void;
const subscribers = new Set<ToastCallback>();

export const toast = {
  success(title: string, description: string = '') {
    this.show(title, description, 'success');
  },
  error(title: string, description: string = '') {
    this.show(title, description, 'error');
  },
  warning(title: string, description: string = '') {
    this.show(title, description, 'warning');
  },
  info(title: string, description: string = '') {
    this.show(title, description, 'info');
  },
  show(title: string, description: string, type: ToastType) {
    const newToast: ToastItem = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      description,
      type,
    };
    subscribers.forEach((cb) => cb(newToast));
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleNewToast = (newToast: ToastItem) => {
      setToasts((prev) => [...prev, newToast]);
      
      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    subscribers.add(handleNewToast);
    return () => {
      subscribers.delete(handleNewToast);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-[360px] pointer-events-none" id="global-toast-container">
      {toasts.map((item) => {
        let borderClass = 'border-l-blue-500';
        let Icon = Info;
        let iconColor = 'text-blue-500';

        if (item.type === 'success') {
          borderClass = 'border-l-emerald-500';
          Icon = CheckCircle;
          iconColor = 'text-emerald-500';
        } else if (item.type === 'error') {
          borderClass = 'border-l-rose-500';
          Icon = AlertCircle;
          iconColor = 'text-rose-500';
        } else if (item.type === 'warning') {
          borderClass = 'border-l-amber-500';
          Icon = HelpCircle;
          iconColor = 'text-amber-500';
        }

        return (
          <div
            key={item.id}
            className={`pointer-events-auto w-full bg-white border border-slate-100 border-l-4 ${borderClass} rounded-xl shadow-xl p-4 flex gap-3 animate-slide-up transform transition-all duration-300`}
            id={`toast-${item.id}`}
          >
            <div className={`mt-0.5 ${iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {item.title}
              </h4>
              {item.description && (
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  {item.description}
                </p>
              )}
            </div>

            <button
              onClick={() => removeToast(item.id)}
              className="text-slate-400 hover:text-slate-600 self-start transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
