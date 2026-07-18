function UploadPdfSection({ onPdfUpload, isUploading }) {
  function handleChange(event) {
    onPdfUpload(event.target.files);
    event.target.value = '';
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-sm shadow-slate-950/20 sm:p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Upload PDFs</h2>
      <p className="mt-2 text-sm text-slate-400">Add one or more PDF files to start building your study set.</p>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-4 text-center text-sm font-medium text-white transition hover:border-sky-400/50 hover:bg-slate-950">
        {isUploading ? 'Uploading PDFs...' : 'Upload PDF(s)'}
        <input type="file" accept="application/pdf" multiple className="hidden" onChange={handleChange} disabled={isUploading} />
      </label>

      {isUploading ? <p className="mt-3 text-xs text-slate-400">Processing files now.</p> : null}
    </section>
  );
}

export default UploadPdfSection;
