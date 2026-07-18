import { useState } from 'react';
import Header from './components/Header';
import UploadPdfSection from './components/UploadPdfSection';
import AskQuestionSection from './components/AskQuestionSection';
import UploadedPdfList from './components/UploadedPdfList';
import api from './api';

function App() {
  const [uploadedPdfs, setUploadedPdfs] = useState([]);
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    } catch (error) {
      setErrorMessage('Could not upload the PDFs. Check the backend server and try again.');
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
      });
      setConversation((currentConversation) => [
        ...currentConversation,
        {
          id: `${Date.now()}-${currentConversation.length}`,
          question: userQuestion,
          answer: data.answer,
          source_filenames: data.source_filenames || [],
          source_page_numbers: data.source_page_numbers || [],
          sources: data.sources || [],
        },
      ]);
      setQuestion('');
    } catch (error) {
      setErrorMessage('Could not get an answer. Make sure the backend is running and PDFs have been uploaded.');
    } finally {
      setIsAnswering(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <Header />

        <main className="mt-6 grid gap-6 lg:grid-cols-[30%_70%]">
          <aside className="space-y-6">
            <UploadPdfSection onPdfUpload={handlePdfUpload} isUploading={isUploading} />
            <UploadedPdfList uploadedPdfs={uploadedPdfs} />
          </aside>

          <section className="flex min-h-[calc(100vh-11rem)] flex-col rounded-3xl border border-white/10 bg-slate-900/50 p-4 shadow-lg shadow-slate-950/20 sm:p-6">
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="flex h-full flex-col">
                <div className="border-b border-slate-800 px-4 py-3 sm:px-5">
                  <p className="text-sm font-medium text-white">Conversation</p>
                  <p className="mt-1 text-xs text-slate-400">Previous questions and answers appear here in order.</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                  {conversation.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-10 text-center">
                      <div>
                        <p className="text-sm font-medium text-slate-200">No questions yet</p>
                        <p className="mt-2 text-sm text-slate-400">
                          Upload PDFs on the left, then ask a question to begin the conversation.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {conversation.map((turn) => (
                        <article key={turn.id} className="space-y-3">
                          <div className="ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-sky-500 px-4 py-3 text-sm leading-6 text-white sm:max-w-[80%]">
                            {turn.question}
                          </div>

                          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-200 sm:max-w-[80%]">
                            <p className="whitespace-pre-wrap">{turn.answer}</p>

                            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                              <p className="font-medium uppercase tracking-[0.2em] text-slate-400">Sources</p>

                              {turn.sources.length === 0 ? (
                                <p className="mt-1 text-slate-400">No sources found.</p>
                              ) : (
                                <ul className="mt-2 space-y-1">
                                  {turn.sources.map((source, index) => (
                                    <li key={`${source.filename}-${source.page_number}-${index}`}>
                                      {source.filename} - page {source.page_number}
                                    </li>
                                  ))}
                                </ul>
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
