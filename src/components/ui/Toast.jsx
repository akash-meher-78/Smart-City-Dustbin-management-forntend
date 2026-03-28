import { useState, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

const Toast = ({ id, type = "info", title, message, onClose, duration = 3000 }) => {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!duration) return;

    const timer = setTimeout(() => {
      onCloseRef.current();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, id]);

  const typeConfig = {
    success: {
      bg: "bg-green-600",
      border: "border-green-500",
      text: "text-white",
      underline: "bg-green-400",
      icon: CheckCircle,
    },
    error: {
      bg: "bg-red-600",
      border: "border-red-500",
      text: "text-white",
      underline: "bg-red-400",
      icon: AlertCircle,
    },
    info: {
      bg: "bg-blue-600",
      border: "border-blue-500",
      text: "text-white",
      underline: "bg-blue-400",
      icon: Info,
    },
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} border-2 ${config.border} rounded-lg p-4 flex flex-col gap-2 shadow-2xl overflow-hidden relative`}
    >
      {/* Right to Left underline animation */}
      <div
        className={`absolute bottom-0 right-0 h-1 ${config.underline}`}
        style={{
          animation: `slideLeft ${duration}ms linear forwards`,
        }}
      />
      
      <div className="flex gap-3 items-start">
        <Icon className={`${config.text} flex-shrink-0 w-5 h-5 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && <p className={`${config.text} font-bold text-base`}>{title}</p>}
          <p className={`${config.text} text-sm break-words`}>{message}</p>
        </div>
      </div>

      <style>{`
        @keyframes slideLeft {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export const ToastContainer = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed top-4 right-0 z-50 space-y-3 px-4 pointer-events-none max-w-md">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={() => onRemoveToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info", title = "", duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message, title = "Success") => addToast(message, "success", title, 1500);
  const error = (message, title = "Error") => addToast(message, "error", title, 4000);
  const info = (message, title = "Info") => addToast(message, "info", title, 3000);

  return { toasts, addToast, removeToast, success, error, info };
};

export default Toast;
