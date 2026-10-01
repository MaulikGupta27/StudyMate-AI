function UploadedPdfList({ uploadedPdfs, onClearAll, onRefresh, isSyncing }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-sm shadow-slate-950/20 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Uploaded PDFs
        </h2>
        <div className="flex items-center gap-2">
          {onRefresh ? (
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="text-xs text-sky-400 hover:text-sky-300 transition flex items-center gap-1 disabled:opacity-50"
              title="Sync with ChromaDB vector store"
            >
              <svg
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          ) : null}

          {uploadedPdfs.length > 0 && onClearAll ? (
            <button
              onClick={onClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 transition underline underline-offset-2 ml-1"
              title="Wipe uploaded PDFs from vector memory"
            >
              Clear
            </button>
          ) : null}
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 font-mono">
            {uploadedPdfs.length}
          </span>
        </div>
      </div>

      {uploadedPdfs.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800 p-4 text-center">
          <p className="text-sm leading-6 text-slate-400">
            No PDFs loaded for this session yet.
          </p>
          {onRefresh ? (
            <button
              onClick={onRefresh}
              className="mt-2 text-xs text-sky-400 hover:text-sky-300 underline"
            >
              Check database for indexed PDFs
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {uploadedPdfs.map((file) => (
            <li
              key={file.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-white truncate" title={file.name}>
                  {file.name}
                </p>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded-md px-1.5 py-0.5">
                  Indexed
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400 font-mono">
                {file.chunksCreated} indexed chunk(s) in ChromaDB
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UploadedPdfList;

