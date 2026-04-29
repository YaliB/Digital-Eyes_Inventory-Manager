import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { ScannerPage } from '@/pages/ScannerPage';
import { ScannerDashboard } from '@/pages/ScannerDashboard';
import { ManagerDashboard } from '@/pages/ManagerDashboard';
import { ViewerPage } from '@/pages/ViewerPage';

const AppRoutes = () => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  const defaultPath =
    role === 'admin'    ? '/dashboard' :
    role === 'employee' ? '/scanner' :
    '/shelf-status';

  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*"       element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/dashboard"    element={<ProtectedRoute element={<ManagerDashboard />} allowedRoles={['admin']} />} />
        <Route path="/scanner"      element={<ProtectedRoute element={<ScannerPage />}      allowedRoles={['admin', 'employee']} />} />
        <Route path="/tasks"        element={<ProtectedRoute element={<ScannerDashboard />} allowedRoles={['admin', 'employee']} />} />
        <Route path="/shelf-status" element={<ProtectedRoute element={<ViewerPage />}       allowedRoles={['admin', 'employee', 'viewer']} />} />
        <Route path="*"             element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
