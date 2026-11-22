import { useEffect, useState, type FormEvent } from 'react';
import { FileCode2, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import type { AuthUser } from '../types/dashboard';

interface AuthGateProps {
  onAuthenticated: (token: string, user: AuthUser) => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => {
        setHasUsers(Boolean(d.hasUsers));
        if (!d.hasUsers) {
          setMode('register');
        }
      })
      .catch(() => setHasUsers(true));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { identifier: identifier.trim(), password }
          : { username: username.trim(), email: email.trim(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      onAuthenticated(data.token, data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#040914] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle architectural grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(56,189,248,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(56,189,248,0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 w-full max-w-md bg-[#081020]/95 border border-[#D4A44A]/50 rounded-[4px] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#D4A44A]/30 bg-gradient-to-b from-[#3b2c13]/40 to-[#081020]">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-white via-[#F7E4B6] to-[#D4A44A]">
              Smart Factory Digital Twin
            </h1>
            <ShieldCheck className="w-5 h-5 text-[#D4A44A] shrink-0" />
          </div>
          <p className="mt-1 text-[12px] text-slate-300">
            {hasUsers === false
              ? 'First-run setup: create the initial operator account to access the control room.'
              : 'Sign in with your operator credentials to access live 3D telemetry.'}
          </p>
        </div>

        {/* Mode Switch */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#040914] border border-slate-800 rounded-[3px]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-1.5 text-[12px] font-medium rounded-[2px] transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-[#6E4D1C]/65 text-amber-100 border border-[#D4A44A]/70'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-1.5 text-[12px] font-medium rounded-[2px] transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-[#6E4D1C]/65 text-amber-100 border border-[#D4A44A]/70'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'login' ? (
            <div>
              <label
                htmlFor="auth-identifier"
                className="block text-[11px] font-medium text-slate-300 mb-1"
              >
                Username or Email
              </label>
              <input
                id="auth-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="operator@factory.io"
                className="w-full px-3 py-2 text-[13px] bg-[#040914] border border-slate-700 focus:border-[#D4A44A] rounded-[3px] text-white placeholder-slate-500 outline-none"
                required
              />
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="auth-username"
                  className="block text-[11px] font-medium text-slate-300 mb-1"
                >
                  Operator Username
                </label>
                <input
                  id="auth-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator1"
                  className="w-full px-3 py-2 text-[13px] bg-[#040914] border border-slate-700 focus:border-[#D4A44A] rounded-[3px] text-white placeholder-slate-500 outline-none"
                  required
                  minLength={3}
                />
              </div>
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-[11px] font-medium text-slate-300 mb-1"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@factory.io"
                  className="w-full px-3 py-2 text-[13px] bg-[#040914] border border-slate-700 focus:border-[#D4A44A] rounded-[3px] text-white placeholder-slate-500 outline-none"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[11px] font-medium text-slate-300 mb-1"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-[13px] bg-[#040914] border border-slate-700 focus:border-[#D4A44A] rounded-[3px] text-white placeholder-slate-500 outline-none"
              required
              minLength={6}
            />
          </div>

          {error ? (
            <div className="px-3 py-2 text-[12px] bg-red-950/70 border border-red-500/50 text-red-200 rounded-[3px]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 text-[13px] font-semibold bg-[#8A6124] hover:bg-[#A6762E] disabled:opacity-50 text-white border border-[#F5C55B]/70 rounded-[3px] transition-colors"
          >
            {submitting
              ? 'Authenticating...'
              : mode === 'login'
                ? 'Enter Digital Twin Console'
                : 'Register & Enter Console'}
          </button>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>External ingest uses X-API-Key</span>
            <a
              href="/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Swagger API Docs
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
