import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sanitizeClassCode, calculateStudentMetrics } from '../utils/editor';
import type { EnrolledClassModel, StudentSessionItem } from '../types/database.types';
import { 
  Code2, 
  LogOut, 
  BookOpen, 
  ArrowRight, 
  Terminal, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Check,
  Copy,
  X,
  Eye,
  RefreshCw,
  ChevronDown,
  Layers
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  // State: Classes
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClassModel[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // State: Practice Sessions
  const [sessions, setSessions] = useState<StudentSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // State: Join Class Form
  const [classCode, setClassCode] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // State: View Submitted Code Modal
  const [viewingSession, setViewingSession] = useState<StudentSessionItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Selected Class object
  const activeClass = useMemo(() => {
    return enrolledClasses.find(c => c.id === selectedClassId) || null;
  }, [enrolledClasses, selectedClassId]);

  // Helper: Format relative or full time
  const formatTime = (timestamp?: string | null): string => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 1. Fetch classes where this student is enrolled
  const fetchEnrolledClasses = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      interface MemberWithClass {
        class_id: string;
        classes: {
          id: string;
          name: string;
          class_code: string;
          teacher_id: string;
          created_at: string;
          teacher: {
            name: string;
            email: string;
          } | null;
        } | null;
      }

      const { data, error } = await supabase
        .from('class_members')
        .select(`
          class_id,
          classes:class_id (
            id,
            name,
            class_code,
            teacher_id,
            created_at,
            teacher:teacher_id (name, email)
          )
        `)
        .eq('student_id', user.id);

      if (error) {
        console.warn('Error fetching enrolled classes:', error.message);
        setDbError('Tabel kelas atau anggota kelas belum siap di Supabase.');
        setIsLoading(false);
        return;
      }

      const members = (data as unknown as MemberWithClass[]) || [];
      const classList: EnrolledClassModel[] = [];

      members.forEach((m) => {
        if (m.classes) {
          classList.push({
            id: m.classes.id,
            name: m.classes.name,
            class_code: m.classes.class_code,
            teacher_id: m.classes.teacher_id,
            created_at: m.classes.created_at,
            teacher: m.classes.teacher ? {
              name: m.classes.teacher.name,
              email: m.classes.teacher.email,
            } : undefined,
          });
        }
      });

      setEnrolledClasses(classList);

      if (classList.length > 0) {
        setSelectedClassId(prev => prev && classList.some(c => c.id === prev) ? prev : classList[0].id);
      } else {
        setSelectedClassId('');
      }
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 2. Fetch practice sessions & student submissions for selected class
  const fetchSessionsAndSubmissions = useCallback(async (classId: string) => {
    if (!classId || !user || !isSupabaseConfigured) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    try {
      // Step A: Fetch practice sessions for this class
      const { data: sessionData, error: sessionErr } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('class_id', classId)
        .neq('status', 'Draft')
        .order('created_at', { ascending: false });

      if (sessionErr) {
        console.warn('Error fetching practice sessions:', sessionErr.message);
        setIsLoading(false);
        return;
      }

      const sessionList = sessionData || [];

      // Step B: Fetch submissions by this student for these sessions
      const sessionIds = sessionList.map(s => s.id);
      let submissionMap: Record<string, any> = {};

      if (sessionIds.length > 0) {
        const { data: subData } = await supabase
          .from('submissions')
          .select('*')
          .eq('student_id', user.id)
          .in('session_id', sessionIds);

        if (subData) {
          subData.forEach((sub: any) => {
            submissionMap[sub.session_id] = sub;
          });
        }
      }

      // Step C: Combine sessions with submission
      const combinedItems: StudentSessionItem[] = sessionList.map((sess: any) => ({
        ...sess,
        submission: submissionMap[sess.id] || null,
      }));

      setSessions(combinedItems);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    fetchEnrolledClasses();
  }, [fetchEnrolledClasses]);

  // When selected class changes, load its sessions
  useEffect(() => {
    if (selectedClassId) {
      setIsLoading(true);
      fetchSessionsAndSubmissions(selectedClassId);
    } else {
      setSessions([]);
    }
  }, [selectedClassId, fetchSessionsAndSubmissions]);

  // Handler: Join Class using Class Code (F02)
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    setJoinSuccess(null);

    const cleanCode = sanitizeClassCode(classCode);
    if (!cleanCode) {
      setJoinError('Silakan masukkan kode kelas.');
      return;
    }

    if (!user) {
      setJoinError('Anda harus login terlebih dahulu.');
      return;
    }

    setIsJoining(true);

    try {
      // Step A: Find class by code
      const { data: foundClass, error: findErr } = await supabase
        .from('classes')
        .select('id, name')
        .eq('class_code', cleanCode)
        .maybeSingle();

      if (findErr || !foundClass) {
        setJoinError('Kode kelas tidak valid atau tidak ditemukan. Mohon tanyakan kembali kode kelas ke guru Anda.');
        setIsJoining(false);
        return;
      }

      // Step B: Check if already enrolled
      const { data: existingMember } = await supabase
        .from('class_members')
        .select('id')
        .eq('class_id', foundClass.id)
        .eq('student_id', user.id)
        .maybeSingle();

      if (existingMember) {
        setJoinError(`Anda sudah terdaftar di kelas "${foundClass.name}".`);
        setSelectedClassId(foundClass.id);
        setIsJoining(false);
        return;
      }

      // Step C: Ensure student profile exists in public.profiles (to satisfy foreign key constraint)
      const { data: profCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profCheck) {
        const studentName = profile?.name || user.email.split('@')[0] || 'Siswa';
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: studentName,
            email: user.email,
            role: 'student',
          });
      }

      // Step D: Insert into class_members
      let { error: joinErr } = await supabase
        .from('class_members')
        .insert({
          class_id: foundClass.id,
          student_id: user.id,
        });

      // Self-healing retry if foreign key constraint error occurred
      if (joinErr && (joinErr.message.includes('foreign key') || joinErr.message.includes('class_members_student_id_fkey'))) {
        const studentName = profile?.name || user.email.split('@')[0] || 'Siswa';
        await supabase.from('profiles').upsert({
          id: user.id,
          name: studentName,
          email: user.email,
          role: 'student',
        });

        const retryResult = await supabase
          .from('class_members')
          .insert({
            class_id: foundClass.id,
            student_id: user.id,
          });
        joinErr = retryResult.error;
      }

      if (joinErr) {
        setJoinError('Gagal bergabung: ' + joinErr.message);
      } else {
        setJoinSuccess(`Berhasil bergabung ke kelas "${foundClass.name}"!`);
        setClassCode('');
        // Re-fetch classes
        await fetchEnrolledClasses();
        setSelectedClassId(foundClass.id);
      }
    } catch (err: unknown) {
      setJoinError('Terjadi kesalahan saat bergabung ke kelas.');
    } finally {
      setIsJoining(false);
    }
  };

  // Handler: Manual Refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (selectedClassId) {
      fetchSessionsAndSubmissions(selectedClassId);
    } else {
      fetchEnrolledClasses();
    }
  };

  // Handler: Copy submitted code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Metrics summary
  const metrics = useMemo(() => calculateStudentMetrics(sessions), [sessions]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-600/30 shrink-0">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg font-mono tracking-tight text-white">
                Code<span className="text-cyan-400">Monitor</span>
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                STUDENT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-200">{profile?.name || 'Peserta Didik'}</div>
              <div className="text-xs text-slate-400">{profile?.email}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Student Workspace Overview */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Notice if tables not found */}
        {dbError && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-white">Konfigurasi Database Belum Selesai</div>
              <p className="text-xs text-slate-300 mt-1">
                Tabel database belum dibuat secara lengkap di Supabase. Silakan pastikan skrip pada file <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">supabase/schema.sql</code> telah dieksekusi di SQL Editor.
              </p>
            </div>
          </div>
        )}

        {/* Welcome & Join Class Banner */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-slate-900/80 to-slate-900/50 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Halo, {profile?.name || 'Peserta Didik'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Selamat datang di workspace praktik coding Anda. Pilih sesi praktik di bawah dan mulai menulis program.
            </p>

            {/* Active Class & Switcher */}
            {enrolledClasses.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-2 text-xs text-slate-300">
                <span>Kelas Saat Ini:</span>
                <div className="relative inline-block">
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="bg-slate-900 border border-cyan-500/40 text-white font-medium text-xs rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-cyan-400 cursor-pointer shadow-sm"
                  >
                    {enrolledClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Kode: {cls.class_code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {activeClass?.teacher && (
                  <span className="text-slate-400 hidden sm:inline">
                    • Guru: <strong className="text-slate-200">{activeClass.teacher.name}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Join class card (PRD F02) */}
          <div className="shrink-0 w-full md:w-auto pt-2 sm:pt-0">
            <form onSubmit={handleJoinClass} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                placeholder="Kode Kelas (cth: ELX7K2)"
                maxLength={8}
                className="px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-mono uppercase focus:outline-none focus:border-cyan-500 transition min-w-0 sm:min-w-[200px] w-full sm:w-auto"
              />
              <button
                type="submit"
                disabled={isJoining}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-[0.99] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isJoining ? 'Memeriksa...' : 'Gabung Kelas'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Feedback alerts */}
        {joinSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{joinSuccess}</span>
            </div>
            <button onClick={() => setJoinSuccess(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {joinError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{joinError}</span>
            </div>
            <button onClick={() => setJoinError(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Metrics Row */}
        {enrolledClasses.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Total Sesi</span>
                <BookOpen className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">{metrics.total}</div>
              <div className="text-[11px] text-slate-500 mt-1">Pada kelas aktif</div>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-cyan-300 font-medium">✅ Selesai / Submit</span>
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-400 mt-1.5">{metrics.submitted}</div>
              <div className="text-[11px] text-cyan-300/70 mt-1">Telah dikumpulkan</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-emerald-300 font-medium">🟢 Sedang Dikerjakan</span>
                <Terminal className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1.5">{metrics.inProgress}</div>
              <div className="text-[11px] text-emerald-300/70 mt-1">Dalam proses coding</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">⚪ Belum Mulai</span>
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-300 mt-1.5">{metrics.notStarted}</div>
              <div className="text-[11px] text-slate-500 mt-1">Siap dikerjakan</div>
            </div>
          </div>
        )}

        {/* Practice Sessions Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">
                Daftar Sesi Praktik Pemrograman
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              {activeClass && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Kelas: <strong className="text-slate-200">{activeClass.name}</strong>
                </span>
              )}
              <button
                onClick={handleManualRefresh}
                title="Muat ulang data sesi"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-slate-400 rounded-2xl bg-slate-900/40 border border-slate-800/80">
              <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3"></div>
              <span>Memuat sesi praktik dari database...</span>
            </div>
          ) : enrolledClasses.length === 0 ? (
            /* Empty State: Not enrolled in any class */
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600/10 text-cyan-400 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-white text-base">Anda Belum Terdaftar di Kelas</h3>
                <p className="text-xs text-slate-400">
                  Masukkan kode kelas (6 karakter, contoh: <code className="text-cyan-400 font-mono">ELX7K2</code>) yang diberikan oleh guru Anda pada kotak di atas untuk mulai melihat tugas dan praktik.
                </p>
              </div>
            </div>
          ) : sessions.length === 0 ? (
            /* Empty State: No sessions in selected class */
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
              <div className="font-semibold text-slate-300">Belum ada sesi praktik aktif di kelas ini</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Guru pengampu belum mengaktifkan sesi praktik untuk kelas ini. Sesi baru akan muncul otomatis begitu guru membuatnya.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {sessions.map((sess) => {
                const sub = sess.submission;
                const isSubmitted = sub?.status === 'submitted';
                const isInProgress = sub?.status === 'in_progress';

                return (
                  <div 
                    key={sess.id}
                    className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition flex flex-col justify-between group shadow-sm"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 border ${
                          sess.language === 'Python'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}>
                          <Terminal className="w-3.5 h-3.5" />
                          <span>{sess.language}</span>
                        </span>

                        {isSubmitted ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            ✅ Sudah Dikumpulkan
                          </span>
                        ) : isInProgress ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            🟢 Sedang Mengerjakan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            ⚪ Belum Mulai
                          </span>
                        )}
                      </div>

                      {/* Title & Instructions */}
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                        {sess.title}
                      </h3>
                      
                      <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                        {sess.instructions || 'Tidak ada instruksi khusus untuk sesi praktik ini.'}
                      </p>
                    </div>

                    {/* Bottom Metadata & Action */}
                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        {isSubmitted ? (
                          <span className="text-slate-400">
                            Dikumpulkan: <strong className="text-slate-200">{formatTime(sub?.submitted_at)}</strong>
                          </span>
                        ) : isInProgress ? (
                          <div className="flex items-center gap-2 text-slate-400">
                            <span>Run: <strong className="font-mono text-slate-200">{sub?.run_count}×</strong></span>
                            <span>•</span>
                            <span className="font-mono text-slate-300">{sub?.change_count} perubahan</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Belum dibuka</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {isSubmitted ? (
                          <button
                            onClick={() => setViewingSession(sess)}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Lihat Submission</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/student/practice/${sess.id}`)}
                            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-cyan-600/30"
                          >
                            <span>{isInProgress ? 'Lanjutkan Coding' : 'Mulai Praktik'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* MODAL: View Submitted Code (Read-Only) */}
      {viewingSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{viewingSession.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                      SUBMITTED (READ ONLY)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bahasa: {viewingSession.language} • Dikumpulkan: {formatTime(viewingSession.submission?.submitted_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(viewingSession.submission?.code || '')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer border border-slate-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedCode ? 'Disalin' : 'Salin Kode'}</span>
                </button>
                <button
                  onClick={() => setViewingSession(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Sub-Header */}
            <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>Total Run: <strong className="font-mono text-white">{viewingSession.submission?.run_count || 0}×</strong></span>
                <span>Total Perubahan: <strong className="font-mono text-white">{viewingSession.submission?.change_count || 0}</strong></span>
              </div>
              <div className="text-[11px] text-slate-500">
                Pekerjaan terkunci dan tidak dapat diubah kembali.
              </div>
            </div>

            {/* Code Body */}
            <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-xs leading-relaxed text-slate-200 select-text">
              {viewingSession.submission?.code ? (
                <pre className="p-2 whitespace-pre-wrap">
                  {viewingSession.submission.code}
                </pre>
              ) : (
                <div className="p-8 text-center text-slate-500 italic">
                  Tidak ada kode yang tersimpan.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-6 border-t border-slate-800 bg-slate-900/80 text-right">
              <button
                onClick={() => setViewingSession(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-900 z-10 flex items-center justify-center">
        <p>© 2026 CodeMonitor</p>
      </footer>
    </div>
  );
};
