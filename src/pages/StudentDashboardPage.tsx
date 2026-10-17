import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Code2, 
  LogOut, 
  BookOpen, 
  ArrowRight, 
  Terminal, 
  PlusCircle, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (classCode.trim()) {
      setJoinSuccess(true);
      setTimeout(() => setJoinSuccess(false), 3000);
      setClassCode('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-3.5 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-600/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg font-mono tracking-tight text-white">
                Code<span className="text-cyan-400">Monitor</span>
              </span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                STUDENT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-200">{profile?.name || 'Siswa'}</div>
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

      {/* Main Student Workspace Overview */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        
        {/* Welcome Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-slate-900/40 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-mono mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Workspace Siswa</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Halo, {profile?.name || 'Peserta Didik'}!
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Selamat datang di CodeMonitor. Buka sesi praktik Anda dan mulai menulis program.
            </p>
          </div>
          
          {/* Join class card */}
          <form onSubmit={handleJoinClass} className="flex items-center gap-2">
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="Masukkan Kode Kelas (cth: ELX7K2)"
              maxLength={8}
              className="px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 font-mono uppercase focus:outline-none focus:border-cyan-500 transition"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-cyan-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Gabung</span>
            </button>
          </form>
        </div>

        {joinSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Berhasil mendaftar ke kelas baru!</span>
          </div>
        )}

        {/* Practice Sessions Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span>Sesi Praktik Aktif</span>
            </h2>
            <span className="text-xs text-slate-400">Kelas: X Teknik Elektronika 1</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Session Card 1 */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Python 3.11
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    🟢 Sesi Aktif
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                  Praktik 3 — Percabangan Python
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                  Buat program untuk menentukan kondisi suhu berdasarkan input pengguna (Normal vs Bahaya). Program harus menggunakan percabangan if-else.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Status Anda: <strong className="text-emerald-400">Sedang Mengerjakan</strong></span>
                <button 
                  onClick={() => alert('Editor Monaco & Pyodide Runner akan dibuka pada sesi praktik ini!')}
                  className="px-3.5 py-1.5 bg-cyan-600 group-hover:bg-cyan-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Buka Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Session Card 2 */}
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 opacity-80 hover:opacity-100 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono">
                    Arduino / C++
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400">
                    Selesai
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-200">
                  Praktik 2 — LED Blink Arduino
                </h3>
                <p className="text-xs text-slate-400 mt-2">
                  Membuat program kedip LED pin 13 dengan interval 1000ms pada mikrokontroler Arduino Uno.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Status Anda: <strong className="text-cyan-400">Sudah Submit</strong></span>
                <button 
                  onClick={() => alert('Submission sudah dikumpulkan dan bersifat Read-Only.')}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 transition"
                >
                  Lihat Kode
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

