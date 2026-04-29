import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, User, Camera, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

const getStrengthLevel = (pwd: string): number => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[!@#$%^&*]/.test(pwd)) score++;
  return score;
};

const STRENGTH_CONFIG: Record<number, { label: string; color: string; bars: number }> = {
  0: { label: '',            color: 'bg-neutral-200', bars: 0 },
  1: { label: 'Very weak',   color: 'bg-alert-500',   bars: 1 },
  2: { label: 'Weak',        color: 'bg-alert-500',   bars: 2 },
  3: { label: 'Fair',        color: 'bg-warning-500', bars: 3 },
  4: { label: 'Strong',      color: 'bg-success-500', bars: 4 },
  5: { label: 'Very strong', color: 'bg-success-600', bars: 5 },
};

export const SignupPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName,        setFullName]        = useState('');
  const [username,        setUsername]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [error,           setError]           = useState('');

  const strength     = getStrengthLevel(password);
  const strengthInfo = STRENGTH_CONFIG[strength];
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const validate = (): string => {
    if (!fullName.trim())                            return 'Please enter your full name.';
    if (!username.trim())                            return 'Please choose a username.';
    if (username.trim().length < 3)                 return 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))  return 'Username may only contain letters, numbers, and underscores.';
    if (!email.includes('@') || !email.includes('.')) return 'Please enter a valid email address.';
    if (password.length < 6)                        return 'Password must be at least 6 characters.';
    if (password !== confirmPassword)               return 'Passwords do not match.';
    return '';
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setIsLoading(true);
    try {
      await signup(fullName, username, email, password);
      navigate('/shelf-status');
    } catch {
      setError('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formIsValid =
    fullName.trim() &&
    username.trim().length >= 3 &&
    email.includes('@') &&
    password.length >= 6 &&
    passwordsMatch;

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
          className="relative space-y-6"
        >
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Join your team on Digital Eyes
            </h2>
            <p className="text-primary-200 text-base leading-relaxed">
              Create your account and start monitoring shelves with AI-powered precision.
            </p>
          </div>

          <div className="space-y-3">
            {['Free to get started', 'Real-time alerts & notifications', 'Secure, role-based access'].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-success-400 flex-shrink-0" />
                <span className="text-primary-100 text-sm">{item}</span>
              </motion.div>
            ))}
          </div>

          <div className="pt-2 p-4 bg-white/10 rounded-xl border border-white/20">
            <p className="text-white/80 text-xs leading-relaxed">
              <span className="font-semibold text-white">New accounts start as Viewers.</span> Your administrator can upgrade your permissions to Employee or Admin after you sign up.
            </p>
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
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-10 sm:px-10 lg:px-16 xl:px-24 overflow-y-auto">

        {/* Mobile logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8 lg:hidden"
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
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">Create your account</h2>
            <p className="text-neutral-500 text-sm">Fill in the details below to get started</p>
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

          <form onSubmit={handleSignup} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe"
                  autoComplete="name"
                  className="w-full pl-9 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-medium select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                  placeholder="your_username"
                  autoComplete="username"
                  className="w-full pl-7 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-9 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4, 5].map(bar => (
                      <div
                        key={bar}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          bar <= strengthInfo.bars ? strengthInfo.color : 'bg-neutral-200'
                        }`}
                      />
                    ))}
                  </div>
                  {strengthInfo.label && (
                    <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">
                      {strengthInfo.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className={`w-full pl-9 pr-16 py-2.5 border rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    confirmPassword && !passwordsMatch
                      ? 'border-alert-400 focus:ring-alert-400'
                      : 'border-neutral-300 focus:ring-primary-500'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {confirmPassword && (
                    passwordsMatch
                      ? <CheckCircle2 className="w-4 h-4 text-success-500" />
                      : <span className="w-4 h-4 flex items-center justify-center text-alert-500 text-xs font-bold">✕</span>
                  )}
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors ml-0.5"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isLoading}
                disabled={!formIsValid || isLoading}
              >
                Create Account
              </Button>
            </div>
          </form>

          <p className="mt-5 text-center text-sm text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
