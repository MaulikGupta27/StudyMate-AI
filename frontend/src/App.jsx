import { useEffect, useState } from 'react';
import Header from './components/Header';
import UploadPdfSection from './components/UploadPdfSection';
import AskQuestionSection from './components/AskQuestionSection';
import UploadedPdfList from './components/UploadedPdfList';
import LockScreen from './components/LockScreen';
import api, {
  clearStoredAccessPassword,
  getOrCreateUserId,
  getStoredAccessPassword,
} from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(getStoredAccessPassword())
  );
  const [userId, setUserId] = useState(() => getOrCreateUserId());
  const [uploadedPdfs, setUploadedPdfs] = useState([]);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState(() => {
    try {
      const activeId = getOrCreateUserId();
      const saved = localStorage.getItem(`studymate_chat_${activeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check server auth configuration on mount
  useEffect(() => {
    async function checkServerAuth() {
      try {
        const { data } = await api.get('/api/auth/status');
        if (!data.requires_password) {
          setIsAuthenticated(true);
        } else if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        // Fall back to stored passcode presence if endpoint fails
      }
    }

    checkServerAuth();

    function handleUnauthorized() {
      setIsAuthenticated(false);
    }

    window.addEventListener('studymate_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('studymate_unauthorized', handleUnauthorized);
    };
  }, []);

  // Synchronize documents from ChromaDB for the active user
  async function syncUserDocuments(targetUserId = userId) {
    if (!targetUserId || !isAuthenticated) return;
    setIsSyncing(true);
    try {
      const { data } = await api.get('/api/documents', {
        headers: { 'X-User-Id': targetUserId },
      });
      if (data.documents && data.documents.length > 0) {
        const loaded = data.documents.map((doc, index) => ({
          id: `${doc.filename}-${index}`,
          name: doc.filename,
          chunksCreated: doc.chunks_created,
        }));
        setUploadedPdfs(loaded);
      } else {
        setUploadedPdfs([]);
      }
    } catch (err) {
      console.warn('Could not sync documents from database:', err);
    } finally {
      setIsSyncing(false);
    }
  }

  // Persist conversation to localStorage whenever it changes
  useEffect(() => {
    try {
      if (conversation.length > 0) {
        localStorage.setItem(`studymate_chat_${userId}`, JSON.stringify(conversation));
      } else {
        localStorage.removeItem(`studymate_chat_${userId}`);
      }
    } catch (err) {
      console.warn('Could not persist conversation:', err);
    }
  }, [conversation, userId]);

  // Synchronize documents on mount and listen for cross-tab updates or tab focus
  useEffect(() => {
    if (!isAuthenticated) return;

    syncUserDocuments(userId);

    function handleTabFocus() {
      if (document.visibilityState === 'visible') {
        const storedUserId = localStorage.getItem('studymate_user_id') || userId;
        if (storedUserId !== userId) {
          setUserId(storedUserId);
        }
        syncUserDocuments(storedUserId);

        try {
          const savedChat = localStorage.getItem(`studymate_chat_${storedUserId}`);
          if (savedChat) {
            setConversation(JSON.parse(savedChat));
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    function handleStorage(e) {
      if (e.key === 'studymate_user_id' && e.newValue) {
        setUserId(e.newValue);
        syncUserDocuments(e.newValue);
        try {
          const savedChat = localStorage.getItem(`studymate_chat_${e.newValue}`);
          setConversation(savedChat ? JSON.parse(savedChat) : []);
        } catch {
          setConversation([]);
        }
      } else if (e.key === `studymate_chat_${userId}` && e.newValue) {
        try {
          setConversation(JSON.parse(e.newValue));
        } catch {
          // ignore parse errors
        }
      } else if (e.key === 'studymate_docs_version') {
        syncUserDocuments(userId);
      }
    }

    window.addEventListener('focus', handleTabFocus);
    document.addEventListener('visibilitychange', handleTabFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleTabFocus);
      document.removeEventListener('visibilitychange', handleTabFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId, isAuthenticated]);

  function handleLock() {
    clearStoredAccessPassword();
    setIsAuthenticated(false);
  }

  async function handleNewSession() {
    try {
      // Automatically clear ChromaDB chunks and Mem0 memories for the current session
      await api.delete('/api/documents');
    } catch (err) {
      console.warn('Could not clear documents during new session:', err);
    }

    // Clean up cached chat for the old session
    try {
      localStorage.removeItem(`studymate_chat_${userId}`);
    } catch {
      // ignore
    }

    const freshId = 'user_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('studymate_user_id', freshId);
    localStorage.setItem('studymate_docs_version', Date.now().toString());

    setUserId(freshId);
    setUploadedPdfs([]);
    setConversation([]);
    setErrorMessage('');
  }

  function handleClearChat() {
    setConversation([]);
    try {
      localStorage.removeItem(`studymate_chat_${userId}`);
    } catch {
      // ignore
    }
  }

  async function handleClearAll() {
    try {
      await api.delete('/api/documents');
      localStorage.setItem('studymate_docs_version', Date.now().toString());
      setUploadedPdfs([]);
    } catch (err) {
      setErrorMessage('Could not clear documents from the database.');
    }
  }

  async function handlePdfUpload(files) {
    if (!files || files.length === 0) {
      return;
    }

    const pdfFiles = Array.from(files).filter((file) => file.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      return;
    }

    const formData = new FormData();
    pdfFiles.forEach((file) => {
      formData.append('files', file);
    });

    setIsUploading(true);
    setErrorMessage('');

    try {
      const { data } = await api.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const nextFiles = (data.processed_pdfs || []).map((file, index) => ({
        id: `${file.filename}-${Date.now()}-${index}`,
        name: file.filename,
        chunksCreated: file.chunks_created,
      }));

      setUploadedPdfs((currentFiles) => [...currentFiles, ...nextFiles]);
      // Notify other open tabs that documents were added
      localStorage.setItem('studymate_docs_version', Date.now().toString());
    } catch (error) {
      const detail = error.response?.data?.detail;
      setErrorMessage(detail || 'Could not upload the PDFs. Check the backend server and try again.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    setIsAnswering(true);
    setErrorMessage('');

    try {
      const userQuestion = question.trim();
      const { data } = await api.post('/api/ask', {
        question: userQuestion,
        user_id: userId,
      });

      const updatedConversation = [
        ...conversation,
        {
          id: `${Date.now()}-${conversation.length}`,
          question: userQuestion,
          answer: data.answer,
          source_filenames: data.source_filenames || [],
          source_page_numbers: data.source_page_numbers || [],
          sources: data.sources || [],
          memories_used: data.memories_used || [],
        },
      ];

      setConversation(updatedConversation);
      try {
        localStorage.setItem(`studymate_chat_${userId}`, JSON.stringify(updatedConversation));
      } catch {
        // ignore
      }
      setQuestion('');
    } catch (error) {
      const detail = error.response?.data?.detail;
      setErrorMessage(detail || 'Could not get an answer. Make sure the backend is running and PDFs have been uploaded.');
    } finally {
      setIsAnswering(false);
    }
  }

  if (!isAuthenticated) {
    return <LockScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Header userId={userId} onNewSession={handleNewSession} onLock={handleLock} />

        <main className="mt-6 grid gap-6 lg:grid-cols-[30%_70%]">
          <aside className="space-y-6">
            <UploadPdfSection onPdfUpload={handlePdfUpload} isUploading={isUploading} />
            <UploadedPdfList
              uploadedPdfs={uploadedPdfs}
              onClearAll={handleClearAll}
              onRefresh={() => syncUserDocuments(userId)}
              isSyncing={isSyncing}
            />
          </aside>

          <section className="flex min-h-[calc(100vh-11rem)] flex-col rounded-3xl border border-white/10 bg-slate-900/50 p-4 shadow-lg shadow-slate-950/20 sm:p-6">
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-sm font-semibold text-white">Conversation</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Grounded Q&A with direct page-level citations.
                    </p>
                  </div>

                  {conversation.length > 0 ? (
                    <button
                      onClick={handleClearChat}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-white transition"
                      title="Clear chat messages (keeps uploaded PDFs in database)"
                    >
                      <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Clear Chat</span>
                    </button>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  {conversation.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/40 px-6 py-12 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-950/40 text-sky-400 shadow-inner">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>

                      <p className="mt-3 text-sm font-semibold text-slate-200">
                        {uploadedPdfs.length > 0 ? 'Ready for your questions' : 'No questions yet'}
                      </p>
                      <p className="mt-1 max-w-sm text-xs text-slate-400 leading-5">
                        {uploadedPdfs.length > 0
                          ? 'Ask any question about your uploaded PDFs, or click one of the suggested prompts below:'
                          : 'Upload one or more PDFs on the left, then ask questions to begin studying.'}
                      </p>

                      {uploadedPdfs.length > 0 ? (
                        <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-md">
                          {[
                            'Summarize the core takeaways from the PDF',
                            'What are the main concepts and definitions?',
                            'List the key formulas, rules, or steps',
                          ].map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => setQuestion(prompt)}
                              className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 hover:border-sky-500/40 hover:bg-sky-950/30 hover:text-sky-200 transition"
                            >
                              💡 {prompt}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {conversation.map((turn) => (
                        <article key={turn.id} className="space-y-3">
                          <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-sky-500 px-4 py-3 text-sm leading-6 text-white shadow-sm sm:max-w-[80%]">
                            {turn.question}
                          </div>

                          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-slate-800 bg-slate-900/90 px-4 py-3.5 text-sm leading-6 text-slate-200 shadow-md sm:max-w-[80%]">
                            <p className="whitespace-pre-wrap">{turn.answer}</p>

                            {turn.memories_used && turn.memories_used.length > 0 ? (
                              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
                                <div className="flex items-center gap-1.5 font-semibold uppercase tracking-[0.15em] text-[10px] text-emerald-400">
                                  <span>🧠</span>
                                  <span>Mem0 Context Recalled</span>
                                </div>
                                <ul className="mt-1 space-y-0.5 text-[11px] text-emerald-200/90 list-disc list-inside">
                                  {turn.memories_used.map((memory, index) => (
                                    <li key={index}>{memory}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-300">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold uppercase tracking-[0.15em] text-slate-400 text-[10px]">
                                  Page-Level Citations ({turn.sources.length})
                                </p>
                              </div>

                              {turn.sources.length === 0 ? (
                                <p className="mt-1 text-[11px] text-slate-500">No direct document citations found.</p>
                              ) : (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {turn.sources.map((source, index) => (
                                    <span
                                      key={`${source.filename}-${source.page_number}-${index}`}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 shadow-sm"
                                    >
                                      <svg className="h-3.5 w-3.5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="max-w-[180px] truncate font-medium text-slate-200" title={source.filename}>
                                        {source.filename}
                                      </span>
                                      <span className="rounded bg-sky-950 px-1 py-0.2 text-[10px] font-mono text-sky-300 border border-sky-500/30">
                                        p. {source.page_number}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <AskQuestionSection
                question={question}
                onQuestionChange={setQuestion}
                onQuestionSubmit={handleQuestionSubmit}
                hasUploadedPdfs={uploadedPdfs.length > 0}
                isAnswering={isAnswering}
                errorMessage={errorMessage}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
