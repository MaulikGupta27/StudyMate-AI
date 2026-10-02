function Header({ userId, onNewSession, onLock }) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/50 px-5 py-4 shadow-sm shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">StudyMate AI</h1>
        <p className="mt-1 text-sm text-slate-400">Ask questions about your uploaded PDFs with page-level citations.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Mem0 Active
        </span>

        {userId ? (
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-mono text-sky-300">
            User: {userId}
          </span>
        ) : null}

        {onNewSession ? (
          <button
            onClick={onNewSession}
            className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-700 transition"
            title="Start a fresh session with a new User ID"
          >
            + New Session
          </button>
        ) : null}

        {onLock ? (
          <button
            onClick={onLock}
            className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-slate-500 hover:bg-slate-700 transition"
            title="Lock application"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span>Lock</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}


export default Header;
