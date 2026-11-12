import { createContext, useCallback, useEffect, useRef, useState } from "react";

const TOAST_MS = 3200;

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, icon = "✅") => {
    setToast({ message, icon });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold">
          <span>{toast.icon}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
