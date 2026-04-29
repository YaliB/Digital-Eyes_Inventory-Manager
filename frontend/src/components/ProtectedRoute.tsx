import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

interface ProtectedRouteProps {
  element: React.ReactElement;
  allowedRoles: UserRole[];
}

const defaultPath = (role: UserRole): string => {
  if (role === 'manager') return '/dashboard';
  if (role === 'worker') return '/scanner';
  return '/shelf-status';
};

export const ProtectedRoute = ({ element, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const role = user!.role;
  if (!allowedRoles.includes(role)) {
    return <Navigate to={defaultPath(role)} replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {element}
    </motion.div>
  );
};
