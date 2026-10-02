import { useState } from 'react';

function UploadedPdfList({ uploadedPdfs, onClearAll, onRefresh, isSyncing }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleConfirmClear() {
    onClearAll();
    setConfirmDelete(false);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-sm shadow-slate-950/20 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Uploaded PDFs
          </h2>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono font-medium text-slate-300">
            {uploadedPdfs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh ? (
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition disabled:opacity-50"
              title="Sync with ChromaDB vector store"
            >
              <svg
                className={`h-3 w-3 ${isSyncing ? 'animate-spin text-sky-400' : 'text-slate-400'}`}
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

          {uploadedPdfs.length > 0 && onClearAll && !confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition"
              title="Wipe uploaded PDFs from vector memory"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear PDFs</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Confirmation Bar for Deletion */}
      {confirmDelete ? (
        <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3">
          <p className="text-xs text-rose-200">
            Wipe all <strong>{uploadedPdfs.length}</strong> indexed PDFs from ChromaDB? This cannot be undone.
          </p>
          <div className="mt-2.5 flex items-center justify-end gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmClear}
              className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 transition"
            >
              Yes, Wipe PDFs
            </button>
          </div>
        </div>
      ) : null}

      {uploadedPdfs.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-300">
            No PDFs indexed for this session
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Upload files above or check database to reload.
          </p>
          {onRefresh ? (
            <button
              onClick={onRefresh}
              className="mt-2.5 inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 underline underline-offset-2"
            >
              <span>Check ChromaDB for indexed PDFs</span>
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {uploadedPdfs.map((file) => (
            <li
              key={file.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 text-sm text-slate-200 transition hover:border-slate-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-950/40 text-sky-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="font-medium text-white text-xs truncate" title={file.name}>
                    {file.name}
                  </p>
                </div>

                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded-md px-1.5 py-0.5">
                  Indexed
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-slate-400">
                  {file.chunksCreated} chunks in ChromaDB
                </span>
                <span className="text-[10px] text-slate-500">Ready for search</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UploadedPdfList;
