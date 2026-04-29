import { useAuthContext } from '@/context/AuthContext';
import { UserRole } from '@/types';

export const useAuth = () => {
  const auth = useAuthContext();
  const role = auth.user?.role ?? null;

  return {
    ...auth,
    role,
    isAdmin: role === 'admin',
    isEmployee: role === 'employee',
    isViewer: role === 'viewer',
    can: (allowedRoles: UserRole[]) => role !== null && allowedRoles.includes(role),
  };
};
