import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const Card = ({
  children,
  className = '',
  interactive = false,
  onClick,
}: CardProps) => {
  return (
    <motion.div
      whileHover={interactive ? { y: -2 } : {}}
      onClick={onClick}
      className={`bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
