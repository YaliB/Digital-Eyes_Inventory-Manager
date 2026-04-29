import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
}

export const ProgressBar = ({ value, className = '' }: ProgressBarProps) => {
  return (
    <div className={`w-full bg-neutral-200 rounded-full h-2 overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
      />
    </div>
  );
};

interface BadgeProps {
  label: string;
  variant?: 'success' | 'alert' | 'warning' | 'info';
  size?: 'sm' | 'md';
}

export const Badge = ({ label, variant = 'info', size = 'sm' }: BadgeProps) => {
  const variants = {
    success: 'bg-success-100 text-success-700',
    alert: 'bg-alert-100 text-alert-700',
    warning: 'bg-warning-100 text-warning-700',
    info: 'bg-primary-100 text-primary-700',
  };

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`${variants[variant]} ${sizes[size]} rounded-full font-semibold inline-block`}
    >
      {label}
    </span>
  );
};

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const EmptyState = ({ title, description, icon }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {icon && <div className="w-16 h-16 text-neutral-300 mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-neutral-900 text-center">{title}</h3>
      {description && (
        <p className="text-neutral-600 text-center mt-2 text-sm">{description}</p>
      )}
    </motion.div>
  );
};
