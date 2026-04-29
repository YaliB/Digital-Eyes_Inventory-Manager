import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, BarChart3, ScanLine, ClipboardList, Eye, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';

interface NavLink {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard',    path: '/dashboard',    icon: BarChart3,     roles: ['admin'] },
  { label: 'Scanner',      path: '/scanner',      icon: ScanLine,      roles: ['admin', 'employee'] },
  { label: 'My Tasks',     path: '/tasks',        icon: ClipboardList, roles: ['admin', 'employee'] },
  { label: 'Shelf Status', path: '/shelf-status', icon: Eye,           roles: ['admin', 'employee', 'viewer'] },
];

const ROLE_CHIP: Record<UserRole, string> = {
  admin:    'bg-primary-100 text-primary-800',
  employee: 'bg-success-100 text-success-700',
  viewer:   'bg-neutral-100 text-neutral-600',
};

interface LayoutProps {
  children: ReactNode;
  headerTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const Layout = ({ children, headerTitle, showBackButton = false, onBack }: LayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleLinks = user
    ? NAV_LINKS.filter(link => link.roles.includes(user.role))
    : [];

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* ── Top Navbar ── */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">

          {/* Main row */}
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors mr-0.5"
                  aria-label="Go back"
                >
                  <ChevronLeft className="w-5 h-5 text-neutral-600" />
                </button>
              )}
              <div className="w-7 h-7 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-neutral-900 text-sm hidden sm:block tracking-tight">
                Digital Eyes
              </span>
            </div>

            {/* Desktop nav links */}
            {user && (
              <nav className="hidden md:flex items-center gap-0.5">
                {visibleLinks.map(({ label, path, icon: Icon }) => {
                  const active = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* User info + logout */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-semibold text-neutral-900 leading-tight capitalize">
                    {user.name}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${ROLE_CHIP[user.role]}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:text-alert-700 hover:bg-alert-50 rounded-lg transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile nav tabs */}
          {user && (
            <div className="flex md:hidden gap-1 pb-2 overflow-x-auto">
              {visibleLinks.map(({ label, path, icon: Icon }) => {
                const active = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                      active
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Optional page sub-title */}
      {headerTitle && (
        <div className="bg-white border-b border-neutral-100 px-4 py-2 sm:px-6">
          <div className="w-full max-w-5xl mx-auto">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {headerTitle}
            </p>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
