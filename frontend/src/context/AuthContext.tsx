import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { login as apiLogin } from '@/services/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => void;
  signup: (fullName: string, username: string, email: string, password: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (identifier: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await apiLogin(identifier, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      const loggedInUser: User = {
        id: data.user_id,
        name: data.user_id,
        email: `${data.user_id}@store.com`,
        role: data.role as UserRole,
        storeId: 'store-1',
      };
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (
    fullName: string,
    username: string,
    email: string,
    _password: string
  ): Promise<User> => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const newUser: User = {
        id: Date.now().toString(),
        name: fullName.trim(),
        username: username.trim(),
        email,
        role: 'supplier',
        storeId: 'store-1',
      };
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
