import { useState } from 'react';

function UploadPdfSection({ onPdfUpload, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleChange(event) {
    if (event.target.files && event.target.files.length > 0) {
      onPdfUpload(event.target.files);
    }
    event.target.value = '';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onPdfUpload(e.dataTransfer.files);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-sm shadow-slate-950/20 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Upload PDFs
        </h2>
        <span className="text-[11px] text-slate-500 font-medium">Max 5 files · 25MB each</span>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-400">
        Upload textbook chapters, research papers, or lecture slides to build your vector study set.
      </p>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-4 rounded-2xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? 'border-sky-400 bg-sky-950/30'
            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950/80'
        }`}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-950/50 text-sky-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <p className="mt-3 text-xs font-medium text-slate-200">
          {isDragging ? 'Drop your PDF files here' : 'Drag & drop PDF files here, or browse'}
        </p>

        <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60">
          {isUploading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              Indexing Chunks...
            </span>
          ) : (
            'Browse PDF(s)'
          )}
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={handleChange}
            disabled={isUploading}
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
        <svg className="h-3.5 w-3.5 text-emerald-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>Streamed to disk · OOM crash-protected</span>
      </div>
    </section>
  );
}

export default UploadPdfSection;
