function AskQuestionSection({
  question,
  onQuestionChange,
  onQuestionSubmit,
  hasUploadedPdfs,
  isAnswering,
  errorMessage,
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-3 shadow-sm shadow-slate-950/20 sm:p-4">
      {errorMessage ? (
        <p className="mb-3 text-sm text-rose-300">{errorMessage}</p>
      ) : null}

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={onQuestionSubmit}
      >
        <input
          type="text"
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder={
            hasUploadedPdfs
              ? "Type your question here..."
              : "Upload a PDF first, then ask a question."
          }
          className="h-12 w-full flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isAnswering}
        />

        <button
          type="submit"
          disabled={isAnswering}
          className="h-12 rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-900"
        >
          {isAnswering ? "Thinking..." : "Ask question"}
        </button>
      </form>
    </section>
  );
}

export default AskQuestionSection;