function UploadedPdfList({ uploadedPdfs }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/50 p-5 shadow-sm shadow-slate-950/20 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Uploaded PDFs</h2>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{uploadedPdfs.length}</span>
      </div>

      {uploadedPdfs.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-slate-400">
          No PDFs have been uploaded yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {uploadedPdfs.map((file) => (
            <li key={file.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
              <p className="font-medium text-white">{file.name}</p>
              <p className="mt-1 text-xs text-slate-400">{file.chunksCreated} indexed chunk(s)</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UploadedPdfList;
