import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  onClose?: () => void;
  dismissible?: boolean;
}

export const Alert = ({
  type,
  title,
  message,
  onClose,
  dismissible = true,
}: AlertProps) => {
  const variants = {
    success: {
      bg: 'bg-success-50',
      border: 'border-success-300',
      icon: CheckCircle2,
      iconColor: 'text-success-600',
    },
    error: {
      bg: 'bg-alert-50',
      border: 'border-alert-300',
      icon: AlertCircle,
      iconColor: 'text-alert-600',
    },
    warning: {
      bg: 'bg-warning-50',
      border: 'border-warning-300',
      icon: AlertTriangle,
      iconColor: 'text-warning-600',
    },
    info: {
      bg: 'bg-primary-50',
      border: 'border-primary-300',
      icon: Info,
      iconColor: 'text-primary-600',
    },
  };

  const config = variants[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${config.bg} border-l-4 ${config.border} p-4 rounded-lg flex gap-3`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1">
        <h3 className="font-semibold text-neutral-900">{title}</h3>
        {message && <p className="text-sm text-neutral-600 mt-1">{message}</p>}
      </div>
      {dismissible && onClose && (
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
};
