import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, Zap } from 'lucide-react';

interface HealthScoreProps {
  score: number; // 0-100
}

export const HealthScore = ({ score }: HealthScoreProps) => {
  const getStatus = () => {
    if (score >= 80) return { label: 'Excellent', color: 'text-success-600', bg: 'bg-success-50' };
    if (score >= 60) return { label: 'Good', color: 'text-warning-600', bg: 'bg-warning-50' };
    if (score >= 40) return { label: 'Fair', color: 'text-warning-600', bg: 'bg-warning-50' };
    return { label: 'Critical', color: 'text-alert-600', bg: 'bg-alert-50' };
  };

  const status = getStatus();
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`${status.bg} rounded-xl p-6`}>
      <h3 className="text-neutral-700 font-semibold mb-4">Shelf Health Score</h3>
      <div className="flex items-center justify-between">
        <div className="relative w-32 h-32">
          <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="45"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className={status.color}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeInOut' }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-neutral-900">{score}</p>
              <p className="text-xs text-neutral-600">Score</p>
            </motion.div>
          </div>
        </div>
        <div className="flex-1 ml-6">
          <p className={`text-2xl font-bold ${status.color}`}>{status.label}</p>
          <p className="text-sm text-neutral-600 mt-2">
            {score >= 80 && 'All shelves are well-stocked'}
            {score >= 60 && score < 80 && 'Minor restocking needed'}
            {score >= 40 && score < 60 && 'Significant restocking required'}
            {score < 40 && 'Urgent attention required'}
          </p>
        </div>
      </div>
    </div>
  );
};

interface AlertItemProps {
  priority: 'critical' | 'high' | 'medium' | 'low';
  productName: string;
  sku: string;
  aisle: string;
  shelf: string;
}

export const AlertItem = ({ priority, productName, sku, aisle, shelf }: AlertItemProps) => {
  const getPriorityColor = () => {
    switch (priority) {
      case 'critical':
        return { bg: 'bg-alert-50', icon: AlertCircle, color: 'text-alert-600' };
      case 'high':
        return { bg: 'bg-warning-50', icon: AlertTriangle, color: 'text-warning-600' };
      case 'medium':
        return { bg: 'bg-warning-50', icon: AlertTriangle, color: 'text-warning-600' };
      case 'low':
        return { bg: 'bg-primary-50', icon: Zap, color: 'text-primary-600' };
    }
  };

  const config = getPriorityColor();
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`${config.bg} rounded-lg p-4 flex gap-3`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.color}`} />
      <div className="flex-1">
        <p className="font-semibold text-neutral-900">{productName}</p>
        <p className="text-xs text-neutral-600 mt-1">SKU: {sku}</p>
        <p className="text-xs text-neutral-600">
          Location: Aisle {aisle}, Shelf {shelf}
        </p>
      </div>
      <span
        className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${
          priority === 'critical'
            ? 'bg-alert-600 text-white'
            : priority === 'high'
            ? 'bg-warning-600 text-white'
            : 'bg-neutral-300 text-neutral-700'
        }`}
      >
        {priority.toUpperCase()}
      </span>
    </motion.div>
  );
};
