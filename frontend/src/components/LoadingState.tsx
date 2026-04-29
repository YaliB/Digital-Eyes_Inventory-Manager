import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface LoadingState {
  state: 'loading' | 'error' | 'empty';
  message?: string;
  onRetry?: () => void;
}

export const LoadingState = ({ state, message, onRetry }: LoadingState) => {
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12"
        >
          <div className="w-full h-full border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </motion.div>
        <p className="text-neutral-600 font-medium">Processing with AI...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 gap-4"
      >
        <AlertCircle className="w-12 h-12 text-alert-600" />
        <div className="text-center">
          <p className="text-neutral-900 font-medium">{message || 'Something went wrong'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Try Again
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 gap-4"
    >
      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
      </div>
      <p className="text-neutral-600 font-medium">{message || 'No data available'}</p>
    </motion.div>
  );
};
