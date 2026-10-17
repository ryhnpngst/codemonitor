import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PracticeSessionModel, SubmissionModel } from '../types/database.types';
import { 
  ArrowLeft, 
  Play, 
  Check, 
  Copy, 
  Terminal, 
  Send, 
  FileCode, 
  Info, 
  AlertCircle, 
  RotateCcw,
  Lock,
  CheckCircle2
} from 'lucide-react';

export const StudentPracticePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State: Session & Submission
  const [session, setSession] = useState<PracticeSessionModel | null>(null);
  const [submission, setSubmission] = useState<SubmissionModel | null>(null);
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // State: Autosave status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const changeCountRef = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State: Pyodide Python Runner
  const [isPyodideReady, setIsPyodideReady] = useState<boolean>(false);
  const [isPyodideLoading, setIsPyodideLoading] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const pyodideInstanceRef = useRef<any>(null);

  // Terminal output
  const [terminalOutput, setTerminalOutput] = useState<{ text: string; type: 'stdout' | 'stderr' | 'system' }[]>([
    { text: 'CodeMonitor Python WebAssembly Terminal ready.\nTekan [▶ Jalankan Program] untuk mengeksekusi kode.', type: 'system' }
  ]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // State: Submit Modal & Copy
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalOutput]);

  // 1. Fetch Practice Session & Student's Submission
  const fetchSessionData = useCallback(async () => {
    if (!sessionId || !user || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      // Step A: Load session details
      const { data: sessData, error: sessErr } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessErr || !sessData) {
        setErrorMsg('Sesi praktik tidak ditemukan.');
        setIsLoading(false);
        return;
      }

      setSession(sessData as PracticeSessionModel);

      // Step B: Load or initialize submission for this student
      const { data: subData, error: subErr } = await supabase
        .from('submissions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (subErr) {
        console.warn('Error fetching submission:', subErr.message);
      }

      if (subData) {
        setSubmission(subData as SubmissionModel);
        setCode(subData.code || getDefaultStarterCode(sessData.language));
        changeCountRef.current = subData.change_count || 0;
        if (subData.status === 'submitted') {
          setIsSubmitted(true);
        }
      } else {
        // Create initial submission row
        const defaultCode = getDefaultStarterCode(sessData.language);
        setCode(defaultCode);

        const { data: newSub, error: createErr } = await supabase
          .from('submissions')
          .insert({
            session_id: sessionId,
            student_id: user.id,
            code: defaultCode,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            change_count: 0,
            run_count: 0,
          })
          .select()
          .single();

        if (!createErr && newSub) {
          setSubmission(newSub as SubmissionModel);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat sesi.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, user]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Default starter code helper
  const getDefaultStarterCode = (language: string): string => {
    if (language === 'Python') {
      return `# Tulis program Python Anda di sini\n# Contoh:\nsuhu = float(input("Masukkan suhu tubuh (derajat C): "))\n\nif suhu > 35:\n    print("Kondisi: Suhu Tinggi / Bahaya")\nelse:\n    print("Kondisi: Suhu Normal")\n`;
    } else {
      return `// Sesi Praktik Arduino / C++\nvoid setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}\n`;
    }
  };

  // 2. Autosave with Debounce (PRD F05)
  const performSave = useCallback(async (codeToSave: string, count: number) => {
    if (!sessionId || !user || !isSupabaseConfigured || isSubmitted) return;

    setSaveStatus('saving');
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('submissions')
        .upsert({
          session_id: sessionId,
          student_id: user.id,
          code: codeToSave,
          last_activity_at: now,
          updated_at: now,
          change_count: count,
          status: 'in_progress',
        }, { onConflict: 'session_id, student_id' });

      if (error) {
        console.warn('Autosave error:', error.message);
        setSaveStatus('error');
      } else {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      setSaveStatus('error');
    }
  }, [sessionId, user, isSubmitted]);

  const handleCodeChange = (newCode?: string) => {
    if (isSubmitted) return;
    const value = newCode || '';
    setCode(value);
    changeCountRef.current += 1;
    setSaveStatus('idle');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce 1.5 seconds per PRD Section 14
    saveTimeoutRef.current = setTimeout(() => {
      performSave(value, changeCountRef.current);
    }, 1500);
  };

  // 3. Load Pyodide WebAssembly for Python Runner (PRD F06)
  const initPyodide = useCallback(async () => {
    if (session?.language !== 'Python' || isPyodideReady || isPyodideLoading) return;

    setIsPyodideLoading(true);
    try {
      // Check if pyodide.js is loaded
      if (!(window as any).loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Gagal memuat runtime WebAssembly'));
          document.head.appendChild(script);
        });
      }

      const pyodide = await (window as any).loadPyodide();
      
      // Setup stdin with prompt
      pyodide.setStdin({
        stdin: () => {
          const input = window.prompt('Masukkan input untuk program Python:');
          return input !== null ? input : '';
        }
      });

      pyodideInstanceRef.current = pyodide;
      setIsPyodideReady(true);
      setTerminalOutput(prev => [
        ...prev,
        { text: '✓ Python WebAssembly runtime aktif. Siap mengeksekusi program.', type: 'system' }
      ]);
    } catch (err: unknown) {
      console.error(err);
      setTerminalOutput(prev => [
        ...prev,
        { text: '⚠ Gagal menginisialisasi Pyodide. Pastikan koneksi internet aktif.', type: 'stderr' }
      ]);
    } finally {
      setIsPyodideLoading(false);
    }
  }, [session, isPyodideReady, isPyodideLoading]);

  useEffect(() => {
    if (session?.language === 'Python' && !isPyodideReady) {
      initPyodide();
    }
  }, [session, isPyodideReady, initPyodide]);

  // 4. Run Python Code (PRD F06)
  const handleRunPython = async () => {
    if (!isPyodideReady || isRunning) return;

    setIsRunning(true);
    const runStartTime = performance.now();

    setTerminalOutput(prev => [
      ...prev,
      { text: `\n[RUN] Menjalankan kode Python...`, type: 'system' }
    ]);

    let capturedOutput = '';
    let isError = false;
    let errorMessage = '';

    try {
      const pyodide = pyodideInstanceRef.current;

      // Redirect stdout & stderr using sys
      await pyodide.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
sys.stderr = StringIO()
`);

      // Execute student code
      await pyodide.runPythonAsync(code);

      // Extract stdout
      const stdout = await pyodide.runPythonAsync('sys.stdout.getvalue()');
      const stderr = await pyodide.runPythonAsync('sys.stderr.getvalue()');

      if (stdout) {
        capturedOutput += stdout;
        setTerminalOutput(prev => [...prev, { text: stdout, type: 'stdout' }]);
      }
      if (stderr) {
        capturedOutput += stderr;
        isError = true;
        setTerminalOutput(prev => [...prev, { text: stderr, type: 'stderr' }]);
      }

      if (!stdout && !stderr) {
        setTerminalOutput(prev => [...prev, { text: '(Program selesai tanpa output teks)', type: 'system' }]);
      }
    } catch (err: unknown) {
      isError = true;
      errorMessage = err instanceof Error ? err.message : String(err);
      setTerminalOutput(prev => [
        ...prev,
        { text: errorMessage, type: 'stderr' }
      ]);
    } finally {
      const duration = ((performance.now() - runStartTime) / 1000).toFixed(2);
      setIsRunning(false);

      setTerminalOutput(prev => [
        ...prev,
        { 
          text: `[Selesai dalam ${duration} detik — ${isError ? 'Terjadi Error' : 'Success'}]`, 
          type: isError ? 'stderr' : 'system' 
        }
      ]);

      // Update Activity Tracking in Database (PRD F08)
      if (sessionId && user && isSupabaseConfigured) {
        const nextRunCount = (submission?.run_count || 0) + 1;
        const now = new Date().toISOString();

        await supabase
          .from('submissions')
          .update({
            run_count: nextRunCount,
            last_run_at: now,
            last_run_status: isError ? 'error' : 'success',
            last_activity_at: now,
          })
          .eq('session_id', sessionId)
          .eq('student_id', user.id);

        setSubmission(prev => prev ? ({
          ...prev,
          run_count: nextRunCount,
          last_run_at: now,
          last_run_status: isError ? 'error' : 'success',
        }) : null);
      }
    }
  };

  // 5. Submit Work (PRD F11)
  const handleConfirmSubmit = async () => {
    if (!sessionId || !user || !isSupabaseConfigured) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      // Final autosave + lock
      const { error } = await supabase
        .from('submissions')
        .upsert({
          session_id: sessionId,
          student_id: user.id,
          code,
          status: 'submitted',
          submitted_at: now,
          updated_at: now,
          last_activity_at: now,
          change_count: changeCountRef.current,
        }, { onConflict: 'session_id, student_id' });

      if (error) {
        alert('Gagal mengumpulkan: ' + error.message);
      } else {
        setIsSubmitted(true);
        setShowSubmitModal(false);
        setSaveStatus('saved');
        setSubmission(prev => prev ? ({
          ...prev,
          status: 'submitted',
          submitted_at: now,
          code,
        }) : null);
        setShowSuccessModal(true);
      }
    } catch {
      alert('Terjadi kesalahan saat mengumpulkan tugas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy Code helper
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Clear Terminal
  const handleClearTerminal = () => {
    setTerminalOutput([
      { text: 'Terminal dibersihkan.', type: 'system' }
    ]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400">Menyiapkan workspace praktik Anda...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">{errorMsg || 'Sesi Praktik Tidak Ditemukan'}</h2>
          <Link
            to="/student"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const isPython = session.language === 'Python';

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden selection:bg-cyan-500 selection:text-white">
      
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">
        
        {/* Left: Back & Session Title */}
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={() => navigate('/student')}
            title="Kembali ke Dashboard Siswa"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 truncate">
            <span className="font-bold text-sm text-white truncate">
              {session.title}
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border shrink-0 ${
              isPython 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>
              {session.language}
            </span>
          </div>
        </div>

        {/* Center: Autosave Status Indicator (PRD F05) */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
              <Lock className="w-3 h-3" />
              <span>Terkunci (Submitted)</span>
            </span>
          ) : saveStatus === 'saving' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              <span>Menyimpan...</span>
            </span>
          ) : saveStatus === 'saved' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Check className="w-3 h-3" />
              <span>Tersimpan {lastSavedTime ? `(${lastSavedTime})` : ''}</span>
            </span>
          ) : saveStatus === 'error' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-3 h-3" />
              <span>Gagal menyimpan</span>
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">Siap</span>
          )}
        </div>

        {/* Right: Actions (Run, Copy, Submit) */}
        <div className="flex items-center gap-2">
          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            title="Salin kode ke clipboard"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedCode ? 'Disalin' : 'Salin'}</span>
          </button>

          {/* Run Button (for Python) */}
          {isPython && (
            <button
              onClick={handleRunPython}
              disabled={isRunning || !isPyodideReady || isSubmitted}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Jalankan (Run)</span>
                </>
              )}
            </button>
          )}

          {/* Submit Work Button (PRD F11) */}
          {!isSubmitted ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-cyan-600/30 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim Pekerjaan</span>
            </button>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
              ✅ Sudah Dikirim
            </span>
          )}
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Side: Task Instructions & Details (3 Cols on Desktop) */}
        <div className="lg:col-span-3 border-r border-slate-800 bg-slate-900/40 p-5 overflow-y-auto space-y-5 hidden md:block">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Instruksi Tugas</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
              {session.instructions || 'Tidak ada instruksi tertulis untuk praktik ini. Ikuti arahan dari guru pengampu.'}
            </div>
          </div>

          {/* Submission Info / Statistics */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Aktivitas Anda
            </div>
            
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Jumlah Run:</span>
                <span className="font-mono font-semibold text-white">{submission?.run_count || 0}×</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Perubahan:</span>
                <span className="font-mono font-semibold text-white">{changeCountRef.current}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status Terakhir:</span>
                <span className="font-medium text-white">
                  {isSubmitted ? '✅ Submitted' : '🟢 In Progress'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Monaco Editor + Terminal Output (9 Cols on Desktop) */}
        <div className="lg:col-span-9 flex flex-col overflow-hidden bg-slate-950">
          
          {/* Top of Editor: Tab Indicator */}
          <div className="h-9 bg-slate-900/60 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-slate-200 font-medium">
                {isPython ? 'main.py' : 'sketch.ino'}
              </span>
            </div>
            {isSubmitted && (
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Mode Baca (Telah Dikumpulkan)</span>
              </span>
            )}
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px] relative">
            <Editor
              height="100%"
              language={isPython ? 'python' : 'cpp'}
              value={code}
              theme="vs-dark"
              onChange={handleCodeChange}
              options={{
                readOnly: isSubmitted,
                fontSize: 14,
                fontFamily: "'Fira Code', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
              }}
            />
          </div>

          {/* Bottom Panel: Terminal / Output for Python */}
          {isPython && (
            <div className="h-52 border-t border-slate-800 bg-slate-900/90 flex flex-col shrink-0">
              
              {/* Terminal Title Bar */}
              <div className="h-8 border-b border-slate-800 px-4 flex items-center justify-between text-xs bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-slate-300 font-mono text-[11px]">
                    TERMINAL / OUTPUT
                  </span>
                  {isPyodideLoading && (
                    <span className="text-[10px] text-slate-500 italic">
                      (Menyiapkan runtime Python...)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearTerminal}
                    title="Bersihkan terminal"
                    className="p-1 text-slate-400 hover:text-white transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Terminal Body */}
              <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs leading-relaxed select-text bg-slate-950/80">
                {terminalOutput.map((item, idx) => (
                  <div 
                    key={idx}
                    className={`whitespace-pre-wrap ${
                      item.type === 'stdout' ? 'text-slate-100' :
                      item.type === 'stderr' ? 'text-rose-400 font-medium' :
                      'text-cyan-400/80'
                    }`}
                  >
                    {item.text}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

            </div>
          )}

        </div>

      </div>

      {/* CONFIRMATION MODAL: Kirim Pekerjaan (PRD F11) */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Kirim Pekerjaan Anda?</h3>
                <p className="text-xs text-slate-400">Pastikan program Anda telah diuji dan berfungsi.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
              <strong>Penting:</strong> Setelah dikirim, kode Anda akan <strong>terkunci (read-only)</strong> dan guru akan menerima status bahwa Anda telah menyelesaikan sesi praktik ini.
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
              >
                Kembali ke Editor
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? 'Mengirim...' : 'Ya, Kirim Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL: Pekerjaan Berhasil Dikumpulkan */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-bold text-white text-lg">Pekerjaan Berhasil Dikumpulkan!</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                Tugas praktik Anda untuk sesi <strong className="text-white">"{session.title}"</strong> telah tersimpan dan status guru telah diperbarui menjadi <span className="text-cyan-400 font-medium">Submitted</span>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status Editor:</span>
                <span className="font-medium text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Terkunci (Read-Only)</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Run:</span>
                <span className="font-mono text-white">{submission?.run_count || 0}×</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Waktu Pengumpulan:</span>
                <span className="text-slate-200">
                  {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer border border-slate-700"
              >
                Lihat Kode
              </button>
              <button
                type="button"
                onClick={() => navigate('/student')}
                className="w-full px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition cursor-pointer shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
