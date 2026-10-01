import { useEffect, useRef } from 'react';

function AskQuestionSection({
  question,
  onQuestionChange,
  onQuestionSubmit,
  hasUploadedPdfs,
  isAnswering,
  errorMessage,
}) {
  const textareaRef = useRef(null);

  // Auto-grow height up to 160px, then enable internal vertical scrolling
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const nextHeight = Math.min(scrollHeight, 160);
      textarea.style.height = `${Math.max(48, nextHeight)}px`;
    }
  }, [question]);

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onQuestionSubmit(event);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-3 shadow-sm shadow-slate-950/20 sm:p-4">
      {errorMessage ? (
        <p className="mb-3 text-sm text-rose-300">{errorMessage}</p>
      ) : null}

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={onQuestionSubmit}
      >
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasUploadedPdfs
                ? "Type your question here... (Enter to send, Shift+Enter for new line)"
                : "Upload a PDF first, then ask a question."
            }
            className="w-full resize-none overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ minHeight: '48px', maxHeight: '160px' }}
            disabled={isAnswering}
          />
        </div>

        <button
          type="submit"
          disabled={isAnswering || !question.trim()}
          className="h-12 rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-sky-900/60"
        >
          {isAnswering ? "Thinking..." : "Ask question"}
        </button>
      </form>
    </section>
  );
}

export default AskQuestionSection;