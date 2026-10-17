import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Code2, 
  LogOut, 
  Users, 
  CheckCircle, 
  Clock, 
  Plus, 
  Activity,
  Terminal,
  Search
} from 'lucide-react';

export const TeacherDashboardPage: React.FC = () => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
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
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-200">{profile?.name || 'Pak Guru'}</div>
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

      {/* Main Dashboard Overview */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-slate-900/80 to-slate-900/40 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Selamat datang, {profile?.name || 'Bapak/Ibu Guru'}!
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Kelas aktif: <strong className="text-white">X Teknik Elektronika 1</strong> (Kode Kelas: <span className="font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">ELX7K2</span>)
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30">
              <Plus className="w-4 h-4" />
              <span>Buat Sesi Baru</span>
            </button>
          </div>
        </div>

        {/* PRD Section 21: Classroom Dashboard Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Total Siswa</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2">32</div>
            <div className="text-xs text-slate-400 mt-1">Semua terdaftar</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-medium">🟢 Aktif / Coding</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2">20</div>
            <div className="text-xs text-emerald-300/80 mt-1">Sedang mengetik kode</div>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300 font-medium">🟡 Tidak Aktif</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-2">4</div>
            <div className="text-xs text-amber-300/80 mt-1">&gt; 2 menit idle</div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-cyan-300 font-medium">✅ Submitted</span>
              <CheckCircle className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-400 mt-2">5</div>
            <div className="text-xs text-cyan-300/80 mt-1">Selesai praktik</div>
          </div>
        </div>

        {/* Live Classroom Monitor Preview (PRD F09) */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <h2 className="font-bold text-sm text-white">
                Live Classroom Monitor — Praktik 3 (Percabangan Python)
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Cari siswa..." 
                  className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <span className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                Filter: Semua (32)
              </span>
            </div>
          </div>

          {/* Student rows table */}
          <div className="divide-y divide-slate-800/60 text-xs">
            <div className="p-3.5 px-6 flex items-center justify-between hover:bg-slate-800/40 transition">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">Andi Pratama</div>
                  <div className="text-[11px] text-slate-400">Terakhir aktif 12 detik lalu</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono text-slate-300">Run: 7×</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  ✓ Success
                </span>
                <button className="text-indigo-400 hover:text-indigo-300 font-medium">Buka Live Code</button>
              </div>
            </div>

            <div className="p-3.5 px-6 flex items-center justify-between hover:bg-slate-800/40 transition">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">Budi Santoso</div>
                  <div className="text-[11px] text-slate-400">Terakhir aktif 25 detik lalu</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono text-slate-300">Run: 4×</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  ⚠ Last Run Error (SyntaxError)
                </span>
                <button className="text-indigo-400 hover:text-indigo-300 font-medium">Buka Live Code</button>
              </div>
            </div>

            <div className="p-3.5 px-6 flex items-center justify-between hover:bg-slate-800/40 transition">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">Citra Lestari</div>
                  <div className="text-[11px] text-slate-400">Belum ada aktivitas kode</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono text-slate-400">Run: 0×</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                  ⚪ Belum Mulai
                </span>
                <button className="text-slate-500 cursor-not-allowed">Buka Live Code</button>
              </div>
            </div>

            <div className="p-3.5 px-6 flex items-center justify-between hover:bg-slate-800/40 transition">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <div>
                  <div className="font-semibold text-slate-200">Eka Ramadhani</div>
                  <div className="text-[11px] text-slate-400">Pekerjaan telah dikumpulkan (14:28)</div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono text-slate-300">Run: 8×</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                  ✅ Submitted (Terkunci)
                </span>
                <button className="text-indigo-400 hover:text-indigo-300 font-medium">Lihat Submission</button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
