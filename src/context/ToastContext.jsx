import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { extractErrorMessage } from "../services/errorHandling";
import "./Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    const reportUnexpectedError = (event) => {
      const error = event.error || event.reason;
      console.error("An uncaught application error occurred.", error || event.message);
      showToast(
        error?.response?.status === 402
          ? extractErrorMessage(error)
          : "An unexpected error occurred. Please try again.",
        "error",
      );
    };

    window.addEventListener("error", reportUnexpectedError);
    window.addEventListener("unhandledrejection", reportUnexpectedError);

    return () => {
      window.removeEventListener("error", reportUnexpectedError);
      window.removeEventListener("unhandledrejection", reportUnexpectedError);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="alert">{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext);
}
