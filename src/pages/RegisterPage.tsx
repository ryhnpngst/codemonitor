import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Code2, 
  Lock, 
  Mail, 
  User, 
  GraduationCap, 
  UserCheck, 
  ArrowLeft, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { UserRole } from '../types/auth';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInAsDemo } = useAuth();

  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Harap lengkapi semua data pendaftaran.');
      return;
    }

    setIsLoading(true);

    if (!isSupabaseConfigured) {
      // Demo fallback registration
      setTimeout(() => {
        setIsLoading(false);
        signInAsDemo(role);
        navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });
      }, 700);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Upsert to profiles table as defined in PRD Section 22
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name,
          email,
          role,
        });

        alert('Pendaftaran berhasil! Anda akan dialihkan ke dashboard.');
        navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Pendaftaran gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 selection:bg-indigo-500 selection:text-white relative">
      <div className="max-w-md w-full mx-auto my-auto">
        
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/30 mb-3">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white font-mono tracking-tight">
            Code<span className="text-indigo-400">Monitor</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Daftar Akun Baru CodeMonitor
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Role Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Pilih Peran Akun (Role)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    role === 'teacher'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <GraduationCap className={`w-4 h-4 ${role === 'teacher' ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-xs font-bold leading-tight">Guru</div>
                    <div className="text-[10px] text-slate-400">Kelola kelas & live monitor</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    role === 'student'
                      ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <UserCheck className={`w-4 h-4 ${role === 'student' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <div>
                    <div className="text-xs font-bold leading-tight">Siswa</div>
                    <div className="text-[10px] text-slate-400">Praktik coding & submit</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === 'teacher' ? 'Cth: Pak Rayhan, S.Kom.' : 'Cth: Andi Pratama'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@smk.id"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer mt-4"
            >
              {isLoading ? (
                <span>Mendaftarkan akun...</span>
              ) : (
                <>
                  <span>Buat Akun Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sudah punya akun? Masuk ke sini</span>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

