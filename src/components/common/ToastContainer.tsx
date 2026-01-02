import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { useToastStore, type ToastType } from "@/stores/toastStore";

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<
  ToastType,
  { bg: string; border: string; icon: string }
> = {
  success: {
    bg: "bg-success/10",
    border: "border-success/30",
    icon: "text-success",
  },
  error: {
    bg: "bg-danger/10",
    border: "border-danger/30",
    icon: "text-danger",
  },
  warning: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    icon: "text-warning",
  },
  info: {
    bg: "bg-primary-500/10",
    border: "border-primary-500/30",
    icon: "text-primary-400",
  },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          const colors = colorMap[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`
                relative flex items-start gap-3 p-4 rounded-xl backdrop-blur-xl
                ${colors.bg} border ${colors.border}
                shadow-lg shadow-black/20
              `}
            >
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${colors.icon}`} />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {toast.message}
                  </p>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
