import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ClassModel, PracticeSessionModel, StudentMonitorItem } from '../types/database.types';
import { 
  Code2, 
  LogOut, 
  Users, 
  CheckCircle, 
  Clock, 
  Plus, 
  Activity,
  Terminal,
  Search,
  Copy,
  Check,
  RefreshCw,
  X,
  AlertTriangle,
  Eye,
  ChevronDown
} from 'lucide-react';

export const TeacherDashboardPage: React.FC = () => {
  const { user, profile, signOut } = useAuth();

  // State: Classes & Sessions
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sessions, setSessions] = useState<PracticeSessionModel[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  // State: Monitoring data
  const [students, setStudents] = useState<StudentMonitorItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'not_started' | 'submitted' | 'error'>('all');

  // Modals
  const [showCreateClassModal, setShowCreateClassModal] = useState<boolean>(false);
  const [newClassName, setNewClassName] = useState<string>('');
  const [isCreatingClass, setIsCreatingClass] = useState<boolean>(false);

  const [showCreateSessionModal, setShowCreateSessionModal] = useState<boolean>(false);
  const [newSessionTitle, setNewSessionTitle] = useState<string>('');
  const [newSessionInstructions, setNewSessionInstructions] = useState<string>('');
  const [newSessionLang, setNewSessionLang] = useState<'Python' | 'Arduino/C++'>('Python');
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  // Live Code Viewer Modal
  const [viewingStudent, setViewingStudent] = useState<StudentMonitorItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedClassCode, setCopiedClassCode] = useState<boolean>(false);

  // Helper: Format relative time
  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return 'Belum ada aktivitas';
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 10) return 'Baru saja';
    if (seconds < 60) return `${seconds} detik lalu`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    return new Date(timestamp).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: Random 6-char Class Code
  const generateClassCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Selected Class & Session objects
  const activeClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // 1. Fetch Classes for Teacher
  const fetchClasses = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        console.warn('Error fetching classes:', error.message);
        setDbError('Tabel classes belum siap atau belum dibuat di Supabase.');
        return;
      }

      setClasses(data as ClassModel[] || []);
      if (data && data.length > 0) {
        setSelectedClassId(prev => prev && data.some(c => c.id === prev) ? prev : data[0].id);
      } else {
        setSelectedClassId('');
      }
    } catch (err: unknown) {
      console.error(err);
    }
  }, [user]);

  // 2. Fetch Practice Sessions for Selected Class
  const fetchSessions = useCallback(async (classId: string) => {
    if (!classId || !isSupabaseConfigured) {
      setSessions([]);
      setSelectedSessionId('');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching sessions:', error.message);
        return;
      }

      setSessions(data as PracticeSessionModel[] || []);
      if (data && data.length > 0) {
        setSelectedSessionId(prev => prev && data.some(s => s.id === prev) ? prev : data[0].id);
      } else {
        setSelectedSessionId('');
      }
    } catch (err: unknown) {
      console.error(err);
    }
  }, []);

  // 3. Fetch Class Members & Submissions for Real-time Monitoring
  const fetchMonitoringData = useCallback(async (classId: string, sessionId: string) => {
    if (!classId || !isSupabaseConfigured) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    try {
      // Step A: Fetch students enrolled in this class
      interface ClassMemberResponse {
        student_id: string;
        profiles: {
          id: string;
          name: string;
          email: string;
        } | null;
      }

      let members: ClassMemberResponse[] = [];

      const { data: memberData, error: memberErr } = await supabase
        .from('class_members')
        .select(`
          student_id,
          profiles:student_id (id, name, email)
        `)
        .eq('class_id', classId);

      if (!memberErr && memberData) {
        members = memberData as unknown as ClassMemberResponse[];
      } else {
        // Fallback: If foreign key relationship alias is not in schema cache, fetch directly
        const { data: simpleData } = await supabase
          .from('class_members')
          .select('student_id')
          .eq('class_id', classId);

        if (simpleData && simpleData.length > 0) {
          const studentIds = simpleData.map((s: any) => s.student_id);
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', studentIds);

          const profMap = new Map((profs || []).map((p: any) => [p.id, p]));
          members = simpleData.map((s: any) => ({
            student_id: s.student_id,
            profiles: profMap.get(s.student_id) || null,
          }));
        } else {
          members = [];
        }
      }

      // Step B: Fetch submissions for this session
      let submissions: Record<string, any> = {};
      if (sessionId) {
        const { data: subData, error: subErr } = await supabase
          .from('submissions')
          .select('*')
          .eq('session_id', sessionId);

        if (!subErr && subData) {
          subData.forEach((s: any) => {
            submissions[s.student_id] = s;
          });
        }
      }

      // Step C: Map into StudentMonitorItem
      const now = Date.now();
      const studentItems: StudentMonitorItem[] = members.map((m) => {
        const profileInfo = m.profiles;
        const sub = submissions[m.student_id];

        let status: StudentMonitorItem['status'] = 'not_started';
        if (sub) {
          if (sub.status === 'submitted') {
            status = 'submitted';
          } else {
            // Check active vs inactive (2 minutes inactivity window as defined in PRD Section 18)
            const lastActiveTime = new Date(sub.last_activity_at).getTime();
            const inactiveDiff = now - lastActiveTime;
            if (inactiveDiff <= 2 * 60 * 1000) {
              status = 'active';
            } else {
              status = 'inactive';
            }
          }
        }

        return {
          student_id: m.student_id,
          name: profileInfo?.name || 'Siswa',
          email: profileInfo?.email || '',
          submission_id: sub?.id,
          code: sub?.code || '',
          status,
          last_run_status: sub?.last_run_status || null,
          run_count: sub?.run_count || 0,
          change_count: sub?.change_count || 0,
          last_activity_at: sub?.last_activity_at,
          submitted_at: sub?.submitted_at,
        };
      });

      // Sort: Active first, then inactive, submitted, then not_started
      const priorityOrder: Record<string, number> = {
        active: 1,
        inactive: 2,
        submitted: 3,
        not_started: 4,
      };

      studentItems.sort((a, b) => (priorityOrder[a.status] || 5) - (priorityOrder[b.status] || 5));

      setStudents(studentItems);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load: Fetch classes
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // When selected class changes, fetch its sessions
  useEffect(() => {
    if (selectedClassId) {
      fetchSessions(selectedClassId);
    } else {
      setSessions([]);
      setSelectedSessionId('');
    }
  }, [selectedClassId, fetchSessions]);

  // When class or session changes, fetch monitoring data
  useEffect(() => {
    if (selectedClassId) {
      setIsLoading(true);
      fetchMonitoringData(selectedClassId, selectedSessionId);
    }
  }, [selectedClassId, selectedSessionId, fetchMonitoringData]);

  // Supabase Realtime Subscription: Listen to live changes in submissions table
  useEffect(() => {
    if (!selectedSessionId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`realtime-submissions-${selectedSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `session_id=eq.${selectedSessionId}`,
        },
        () => {
          // Re-fetch monitoring data silently when student activities happen
          fetchMonitoringData(selectedClassId, selectedSessionId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSessionId, selectedClassId, fetchMonitoringData]);

  // Handler: Manual Refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (selectedClassId) {
      fetchMonitoringData(selectedClassId, selectedSessionId);
    }
  };

  // Handler: Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !user) return;

    setIsCreatingClass(true);
    try {
      // Ensure teacher profile exists in public.profiles (to satisfy foreign key constraint)
      const { data: profCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profCheck) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: profile?.name || user.email.split('@')[0] || 'Guru',
            email: user.email,
            role: 'teacher',
          });
      }

      const classCode = generateClassCode();
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: newClassName.trim(),
          class_code: classCode,
          teacher_id: user.id,
        })
        .select()
        .single();

      if (error) {
        alert('Gagal membuat kelas: ' + error.message);
      } else if (data) {
        setClasses(prev => [data as ClassModel, ...prev]);
        setSelectedClassId(data.id);
        setShowCreateClassModal(false);
        setNewClassName('');
      }
    } catch (err: unknown) {
      alert('Terjadi kesalahan saat membuat kelas.');
    } finally {
      setIsCreatingClass(false);
    }
  };

  // Handler: Create Practice Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionTitle.trim() || !selectedClassId) return;

    setIsCreatingSession(true);
    try {
      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          class_id: selectedClassId,
          title: newSessionTitle.trim(),
          instructions: newSessionInstructions.trim() || null,
          language: newSessionLang,
          status: 'Active',
        })
        .select()
        .single();

      if (error) {
        alert('Gagal membuat sesi: ' + error.message);
      } else if (data) {
        setSessions(prev => [data as PracticeSessionModel, ...prev]);
        setSelectedSessionId(data.id);
        setShowCreateSessionModal(false);
        setNewSessionTitle('');
        setNewSessionInstructions('');
      }
    } catch (err: unknown) {
      alert('Terjadi kesalahan saat membuat sesi.');
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Handler: Copy Class Code
  const handleCopyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedClassCode(true);
    setTimeout(() => setCopiedClassCode(false), 2000);
  };

  // Handler: Copy Student Code in Modal
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Metrics (PRD Section 21)
  const metrics = useMemo(() => {
    const total = students.length;
    const active = students.filter(s => s.status === 'active').length;
    const inactive = students.filter(s => s.status === 'inactive').length;
    const notStarted = students.filter(s => s.status === 'not_started').length;
    const submitted = students.filter(s => s.status === 'submitted').length;
    const errorCount = students.filter(s => s.last_run_status === 'error').length;
    return { total, active, inactive, notStarted, submitted, errorCount };
  }, [students]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            student.email.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'error') return student.last_run_status === 'error';
      return student.status === statusFilter;
    });
  }, [students, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg font-mono tracking-tight text-white">
                Code<span className="text-indigo-400">Monitor</span>
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                TEACHER
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-200">{profile?.name || 'Bapak/Ibu Guru'}</div>
              <div className="text-xs text-slate-400">{profile?.email}</div>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Supabase Schema Notice if tables are not found */}
        {dbError && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-white">Konfigurasi Tabel Supabase Belum Lengkap</div>
              <p className="text-xs text-slate-300 mt-1">
                Tabel `classes`, `practice_sessions`, atau `submissions` belum terdeteksi di database Supabase Anda. 
                Silakan jalankan script SQL lengkap pada file <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono">supabase/schema.sql</code> di menu **SQL Editor** dashboard Supabase Anda.
              </p>
            </div>
          </div>
        )}

        {/* Header Controls: Class Selector & Session Management */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-slate-900/50 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-white">
              {profile?.name ? `Selamat datang, ${profile.name}!` : 'Classroom Dashboard'}
            </h1>
            
            {/* Active Class Info & Selector */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-slate-300">
              {classes.length > 0 ? (
                <div className="flex items-center gap-2">
                  <span>Kelas Aktif:</span>
                  <div className="relative inline-block">
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="bg-slate-900 border border-indigo-500/40 text-white font-medium text-xs rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.class_code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {activeClass && (
                    <button
                      onClick={() => handleCopyClassCode(activeClass.class_code)}
                      title="Salin kode kelas untuk dibagikan ke siswa"
                      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 hover:bg-indigo-900/80 transition cursor-pointer"
                    >
                      <span>Kode: <strong>{activeClass.class_code}</strong></span>
                      {copiedClassCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-indigo-400" />}
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Belum ada kelas yang dibuat.</span>
              )}
            </div>
          </div>

          {/* Action Buttons: Buat Kelas & Buat Sesi */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCreateClassModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-400" />
              <span>Tambah Kelas</span>
            </button>

            <button
              onClick={() => setShowCreateSessionModal(true)}
              disabled={!selectedClassId}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Sesi Praktik</span>
            </button>
          </div>
        </div>

        {/* PRD Section 21: Classroom Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Siswa</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">{metrics.total}</div>
            <div className="text-[11px] text-slate-500 mt-1">Terdaftar di kelas ini</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-medium">🟢 Aktif / Coding</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">{metrics.active}</div>
            <div className="text-[11px] text-emerald-300/70 mt-1">&le; 2 menit aktif</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300 font-medium">🟡 Tidak Aktif</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">{metrics.inactive}</div>
            <div className="text-[11px] text-amber-300/70 mt-1">&gt; 2 menit idle</div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyan-300 font-medium">✅ Submitted</span>
              <CheckCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 mt-2">{metrics.submitted}</div>
            <div className="text-[11px] text-cyan-300/70 mt-1">Telah dikumpulkan</div>
          </div>

          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-rose-300 font-medium">🔴 Last Run Error</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2">{metrics.errorCount}</div>
            <div className="text-[11px] text-rose-300/70 mt-1">Perlu pendampingan</div>
          </div>
        </div>

        {/* Live Classroom Monitor Container (PRD F09) */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
          
          {/* Header of Table: Sesi Praktik Switcher, Search & Filters */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Session Selector */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                  Sesi Praktik Aktif
                </div>
                {sessions.length > 0 ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="relative inline-block">
                      <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-white font-semibold text-xs rounded-lg px-2.5 py-1 pr-7 appearance-none focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {sessions.map((sess) => (
                          <option key={sess.id} value={sess.id}>
                            {sess.title} ({sess.language})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                    </div>
                    {activeSession?.instructions && (
                      <span className="text-[11px] text-slate-400 hidden xl:inline max-w-xs truncate" title={activeSession.instructions}>
                        • {activeSession.instructions}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Belum ada sesi praktik. Klik "Buat Sesi Praktik".</span>
                )}
              </div>
            </div>

            {/* Search, Filter Tabs & Refresh */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa..." 
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition" 
                />
              </div>

              {/* Status Filter Dropdown / Pills */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                {(['all', 'active', 'inactive', 'not_started', 'submitted', 'error'] as const).map((filter) => {
                  const labels: Record<string, string> = {
                    all: 'Semua',
                    active: '🟢 Aktif',
                    inactive: '🟡 Idle',
                    not_started: '⚪ Belum',
                    submitted: '✅ Submit',
                    error: '🔴 Error',
                  };
                  return (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                        statusFilter === filter
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                })}
              </div>

              {/* Manual Refresh button */}
              <button
                onClick={handleManualRefresh}
                title="Muat ulang data live monitoring"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table Column Headers */}
          <div className="hidden sm:grid grid-cols-12 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <div className="col-span-6">Nama Siswa & Aktivitas</div>
            <div className="col-span-6 flex items-center justify-end gap-6 sm:gap-8">
              <span>Status & Eksekusi</span>
              <span className="w-28 text-right">Aksi</span>
            </div>
          </div>

          {/* Student Table Rows */}
          <div className="divide-y divide-slate-800/60 text-xs">
            {isLoading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"></div>
                <span>Memuat data siswa dari database...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-200 text-sm">
                    {students.length === 0 ? 'Belum ada siswa' : 'Tidak ada siswa yang sesuai filter'}
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {students.length === 0 
                      ? (activeClass 
                          ? `Belum ada siswa yang bergabung di kelas ${activeClass.name}. Bagikan kode kelas kepada siswa untuk bergabung.` 
                          : 'Belum ada kelas yang dipilih atau dibuat. Silakan tambahkan kelas terlebih dahulu.')
                      : 'Coba ubah kata kunci pencarian atau filter status yang dipilih.'}
                  </p>
                </div>
                {students.length === 0 && activeClass && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
                    <span>Kode Kelas: <strong>{activeClass.class_code}</strong></span>
                    <button
                      onClick={() => handleCopyClassCode(activeClass.class_code)}
                      className="hover:text-white transition cursor-pointer"
                      title="Salin kode kelas"
                    >
                      {copiedClassCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isError = student.last_run_status === 'error';
                const isSuccess = student.last_run_status === 'success';

                return (
                  <div 
                    key={student.student_id} 
                    className="p-3.5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition"
                  >
                    {/* Left: Student Status & Name */}
                    <div className="flex items-center gap-3">
                      <span 
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          student.status === 'active' ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse' :
                          student.status === 'inactive' ? 'bg-amber-400' :
                          student.status === 'submitted' ? 'bg-cyan-400' :
                          'bg-slate-500'
                        }`}
                        title={
                          student.status === 'active' ? 'Sedang coding' :
                          student.status === 'inactive' ? 'Tidak aktif > 2 menit' :
                          student.status === 'submitted' ? 'Sudah mengumpulkan' :
                          'Belum memulai'
                        }
                      ></span>

                      <div>
                        <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                          <span>{student.name}</span>
                          {student.status === 'submitted' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-normal">
                              Terkunci
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{formatRelativeTime(student.last_activity_at)}</span>
                          {student.change_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{student.change_count} perubahan</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Run Stats, Last Status, and Action Button */}
                    <div className="flex items-center gap-4 sm:gap-6 ml-5 sm:ml-0">
                      <span className="font-mono text-slate-300 text-xs">
                        Run: <strong>{student.run_count}×</strong>
                      </span>

                      {/* Run Status Badges */}
                      {isError && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Last Run Error</span>
                        </span>
                      )}

                      {isSuccess && !isError && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
                          ✓ Success
                        </span>
                      )}

                      {!isSuccess && !isError && student.status === 'not_started' && (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium text-[11px]">
                          ⚪ Belum Mulai
                        </span>
                      )}

                      {/* Button to Open Live Code Viewer (PRD F10) */}
                      <button 
                        onClick={() => setViewingStudent(student)}
                        disabled={!student.submission_id}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                          student.submission_id
                            ? 'text-indigo-400 hover:text-white hover:bg-indigo-600/20 border border-indigo-500/30'
                            : 'text-slate-600 border border-transparent cursor-not-allowed'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Live Code</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* MODAL 1: Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Buat Kelas Baru</span>
              </h3>
              <button 
                onClick={() => setShowCreateClassModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Cth: X Teknik Elektronika 1"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Sistem akan otomatis meng-generate 6 karakter kode unik (cth: ELX7K2) untuk siswa bergabung.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClass}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isCreatingClass ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Practice Session Modal */}
      {showCreateSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Buat Sesi Praktik Baru</span>
              </h3>
              <button 
                onClick={() => setShowCreateSessionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Judul Praktik
                </label>
                <input
                  type="text"
                  required
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="Cth: Praktik 3 — Percabangan Python"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Bahasa Pemrograman
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewSessionLang('Python')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      newSessionLang === 'Python'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">Python</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Pyodide WebAssembly (Run di browser)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSessionLang('Arduino/C++')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      newSessionLang === 'Arduino/C++'
                        ? 'bg-cyan-600/20 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">Arduino / C++</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Workspace & monitoring kode</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Instruksi / Soal Praktik (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={newSessionInstructions}
                  onChange={(e) => setNewSessionInstructions(e.target.value)}
                  placeholder="Buat program untuk menentukan kondisi suhu..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
                >
                  {isCreatingSession ? 'Menyimpan...' : 'Aktifkan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Live Code Viewer (PRD F10) */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold">
                  {viewingStudent.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{viewingStudent.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      READ ONLY
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{viewingStudent.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(viewingStudent.code || '')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedCode ? 'Disalin' : 'Salin Kode'}</span>
                </button>
                <button
                  onClick={() => setViewingStudent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Sub-Header Stats */}
            <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>Status: <strong className="text-white capitalize">{viewingStudent.status.replace('_', ' ')}</strong></span>
                <span>Run: <strong className="font-mono text-white">{viewingStudent.run_count}×</strong></span>
                <span>Perubahan: <strong className="font-mono text-white">{viewingStudent.change_count}</strong></span>
              </div>
              <div className="text-[11px]">
                Aktivitas terakhir: {formatRelativeTime(viewingStudent.last_activity_at)}
              </div>
            </div>

            {/* Code Body */}
            <div className="p-4 flex-1 overflow-auto bg-slate-950 font-mono text-xs leading-relaxed text-slate-200 select-text">
              {viewingStudent.code ? (
                <pre className="p-2 whitespace-pre-wrap">
                  {viewingStudent.code}
                </pre>
              ) : (
                <div className="p-8 text-center text-slate-500 italic">
                  Siswa belum menuliskan kode pada sesi ini.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-6 border-t border-slate-800 bg-slate-900/80 text-right">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
              >
                Tutup Viewer
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
