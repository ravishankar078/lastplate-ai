import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { socketService } from '../services/websocket/socketService';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface NotificationContextValue {
  showToast: (title: string, description?: string, type?: ToastType) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, description?: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, title, description, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  React.useEffect(() => {
    const unsubs = [
      socketService.on('DONATION_CREATED', (data: any) => {
        showToast(
          'New Surplus Food Available!',
          `${data.portions} portions (${data.quantity_kg}kg) posted by ${data.donor_name}.`,
          'info'
        );
      }),
      socketService.on('DISPATCH_REQUIRED', (data: any) => {
        showToast(
          'Dispatch Required 🚀',
          `Mission for "${data.title}" ready for courier assignment.`,
          'warning'
        );
      }),
      socketService.on('STOP_ARRIVED', (data: any) => {
        showToast(
          'Courier Arrived 📍',
          `${data.volunteer_name || 'Courier'} arrived at ${data.organization_name}.`,
          'info'
        );
      }),
      socketService.on('HANDOVER_CONFIRMED', (data: any) => {
        showToast(
          'Handover Authenticated ✅',
          `Physical transfer at ${data.organization_name} confirmed.`,
          'success'
        );
      }),
      socketService.on('SYSTEM_ALERT', (data: any) => {
        showToast(
          data.title || 'System Announcement',
          data.message || 'Urgent logistics broadcast.',
          'warning'
        );
      }),
    ];

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [showToast]);

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Render View */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const iconMap = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
            error: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />,
            info: <Info className="w-5 h-5 text-forest-700 shrink-0 mt-0.5" />,
          };

          const borderMap = {
            success: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
            warning: 'border-amber-200 bg-amber-50/90 text-amber-950',
            error: 'border-rose-200 bg-rose-50/90 text-rose-950',
            info: 'border-forest-200 bg-[#FAF8F5]/95 text-forest-950',
          };

          return (
            <div
              key={toast.id}
              className={`p-4 rounded-2xl border shadow-soft-lg backdrop-blur-md flex items-start justify-between gap-3 pointer-events-auto transition-all animate-in slide-in-from-bottom-3 duration-200 ${borderMap[toast.type]}`}
            >
              <div className="flex items-start gap-2.5">
                {iconMap[toast.type]}
                <div>
                  <h5 className="text-xs sm:text-sm font-bold">{toast.title}</h5>
                  {toast.description && (
                    <p className="text-xs opacity-90 mt-0.5">{toast.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-60 hover:opacity-100 p-0.5 rounded transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
