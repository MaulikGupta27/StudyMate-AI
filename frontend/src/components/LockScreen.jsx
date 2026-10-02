import { useState } from 'react';
import api, { setStoredAccessPassword } from '../api';

function LockScreen({ onAuthenticated }) {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!passcode.trim()) {
      setErrorMessage('Please enter the access passcode.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const { data } = await api.post('/api/auth/verify', {
        password: passcode.trim(),
      });

      if (data.authenticated) {
        setStoredAccessPassword(passcode.trim());
        onAuthenticated();
      } else {
        setErrorMessage('Invalid access passcode. Please try again.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMessage(detail || 'Incorrect access passcode. Access denied.');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl"></div>

      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {/* Header Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-950/50 shadow-inner shadow-sky-500/20">
              <svg
                className="h-8 w-8 text-sky-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              StudyMate AI
            </h1>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sky-500/20 bg-sky-950/40 px-3 py-0.5 text-xs font-medium text-sky-300">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              Protected Live Demo
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              This deployment is secured with server-side authentication to safeguard OpenAI and Mem0 API credits against automated traffic.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-3.5 py-2.5 text-center text-xs text-rose-300">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="passcode"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Access Passcode
              </label>
              <div className="relative mt-2">
                <input
                  id="passcode"
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter demo passcode..."
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3.5 pr-11 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200"
                  title={showPassword ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying || !passcode.trim()}
              className="flex w-full items-center justify-center rounded-2xl bg-sky-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVerifying ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Verifying Passcode...
                </span>
              ) : (
                'Unlock Application'
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-[11px] text-slate-500">
              For evaluation access during interviews or reviews. Contact the repository owner for access credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LockScreen;
