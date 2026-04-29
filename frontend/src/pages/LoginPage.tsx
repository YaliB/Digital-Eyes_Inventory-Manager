import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, User, Camera, Scan, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

const features = [
  { icon: Scan,        text: 'AI-powered shelf scanning' },
  { icon: BarChart3,   text: 'Real-time inventory analytics' },
  { icon: ShieldCheck, text: 'Role-based access control' },
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(identifier, password);
      if (rememberMe) localStorage.setItem('rememberMe', 'true');
      navigate(
        user.role === 'manager' ? '/dashboard' :
        user.role === 'worker' ? '/scanner' :
        '/shelf-status'
      );
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left Branding Panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-white/[0.03] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-3"
        >
          <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Digital Eyes</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative space-y-10"
        >
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Smart Shelf Monitoring<br />for Modern Retail
            </h2>
            <p className="text-primary-200 text-base leading-relaxed">
              AI-powered inventory tracking that keeps your shelves stocked and your customers satisfied.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-primary-100 text-sm">{text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="relative text-primary-400 text-xs"
        >
          © 2026 Digital Eyes. All rights reserved.
        </motion.p>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 sm:px-10 lg:px-16 xl:px-24">

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-10 lg:hidden"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900">Digital Eyes</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">Welcome back</h2>
            <p className="text-neutral-500 text-sm">Sign in to your account to continue</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 bg-alert-50 border border-alert-300 text-alert-700 rounded-lg text-sm flex items-start gap-2"
            >
              <span className="font-semibold shrink-0">Error:</span>
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Username / Email */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                  autoComplete="username"
                  className="w-full pl-9 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    rememberMe
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-neutral-300 group-hover:border-primary-400'
                  }`}
                  onClick={() => setRememberMe(v => !v)}
                >
                  {rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-neutral-600">Remember me</span>
              </label>
              <button type="button" className="text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Forgot password?
              </button>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isLoading}
                disabled={!identifier.trim() || !password || isLoading}
              >
                Sign In
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Create one
            </Link>
          </p>

          {/* Demo credentials */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-4 bg-neutral-50 border border-neutral-200 rounded-xl"
          >
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-2">
              Demo accounts
            </p>
            <div className="space-y-1 text-xs text-neutral-600">
              <p><span className="font-semibold">Manager:</span> manager1 / manager123</p>
              <p><span className="font-semibold">Worker:</span> worker1 / worker123</p>
              <p><span className="font-semibold">Supplier:</span> supplier1 / supplier123</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
