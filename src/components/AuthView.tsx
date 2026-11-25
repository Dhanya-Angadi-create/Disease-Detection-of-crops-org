import { CheckCircle2, KeyRound, Lock, Mail, UserCheck } from 'lucide-react';
import { useState } from 'react';
import type { FarmerProfile, User } from '../types';

interface AuthViewProps {
  onSuccess: (payload: { token: string; user: User; profile: FarmerProfile | null }) => void;
}

type AuthTab = 'login' | 'register' | 'forgot';

export function AuthView({ onSuccess }: AuthViewProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    village_district: '',
    state: '',
    farm_size_acres: '',
    primary_crops: '',
  });

  // Forgot Password 2-step form
  const [forgotStep, setForgotStep] = useState<'verify' | 'reset'>('verify');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotName, setForgotName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const pwChecks = {
    len: regForm.password.length >= 8,
    upper: /[A-Z]/.test(regForm.password),
    lower: /[a-z]/.test(regForm.password),
    num: /[0-9]/.test(regForm.password),
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign in failed.');
        return;
      }
      onSuccess({ token: data.token, user: data.user, profile: data.profile ?? null });
    } catch {
      setError('Network error while signing in.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (regForm.password !== regForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }
      onSuccess({ token: data.token, user: data.user, profile: data.profile ?? null });
    } catch {
      setError('Network error while creating account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, registeredName: forgotName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Account verification failed.');
        return;
      }
      setResetToken(data.resetToken || '');
      setInfo(data.message);
      setForgotStep('reset');
    } catch {
      setError('Network error while verifying account.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          resetToken,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not reset password.');
        return;
      }
      setInfo(data.message);
      setTab('login');
      setLoginEmail(forgotEmail);
      setForgotStep('verify');
      setNewPassword('');
    } catch {
      setError('Network error while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      <div className="rounded-2xl bg-white border border-[#E1E8DD] p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17241B]">
            Farmer Account Access
          </h1>
          <p className="text-sm text-[#526358]">
            Sign in or register to save diagnostic reports, track crop health trends, and manage your farm profile.
          </p>
        </div>

        {/* Segmented Auth Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#EFF3EC] rounded-lg border border-[#DCE4D8]">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'login' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'register' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('forgot');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md cursor-pointer ${
              tab === 'forgot' ? 'bg-white text-[#17241B] shadow-sm' : 'text-[#526358]'
            }`}
          >
            Forgot Password
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-800">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
            {info}
          </div>
        )}

        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#314136] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#526358] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#314136] mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#526358] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="e.g. Suresh Kulkarni"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="suresh@example.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="Min 8 chars, mixed case & number"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  value={regForm.confirmPassword}
                  onChange={(e) => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[#F2F5F0] text-xs">
              <span className={pwChecks.len ? 'text-emerald-700 font-medium' : 'text-[#526358]'}>
                {pwChecks.len ? '✓' : '○'} 8+ characters
              </span>
              <span className={pwChecks.upper ? 'text-emerald-700 font-medium' : 'text-[#526358]'}>
                {pwChecks.upper ? '✓' : '○'} Uppercase letter
              </span>
              <span className={pwChecks.lower ? 'text-emerald-700 font-medium' : 'text-[#526358]'}>
                {pwChecks.lower ? '✓' : '○'} Lowercase letter
              </span>
              <span className={pwChecks.num ? 'text-emerald-700 font-medium' : 'text-[#526358]'}>
                {pwChecks.num ? '✓' : '○'} Number (0–9)
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Village / District</label>
                <input
                  type="text"
                  value={regForm.village_district}
                  onChange={(e) => setRegForm({ ...regForm, village_district: e.target.value })}
                  placeholder="e.g. Mandya"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#314136] mb-1">Primary Crops</label>
                <input
                  type="text"
                  value={regForm.primary_crops}
                  onChange={(e) => setRegForm({ ...regForm, primary_crops: e.target.value })}
                  placeholder="e.g. Tomato, Rice, Chilli"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              {loading ? 'Creating Account...' : 'Create Farmer Account'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <div className="space-y-4">
            {forgotStep === 'verify' ? (
              <form onSubmit={handleForgotVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="farmer@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">Registered Full Name</label>
                  <input
                    type="text"
                    required
                    value={forgotName}
                    onChange={(e) => setForgotName(e.target.value)}
                    placeholder="Exact full name on account"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-60 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  {loading ? 'Verifying...' : 'Verify Identity & Generate Reset Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="p-3 rounded-lg bg-[#F2F5F0] border border-[#DCE4D8] text-xs">
                  <span className="font-semibold text-[#17241B]">Single-Use Reset Code:</span>{' '}
                  <span className="font-mono select-all text-[#15803D]">{resetToken}</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#314136] mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, upper, lower, number"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CED9C8] text-sm focus:outline-none focus:border-[#15803D]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-[#15803D] text-white text-sm font-semibold hover:bg-[#166534] disabled:opacity-60 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
