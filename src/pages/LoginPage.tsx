import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Code2, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  Terminal, 
  Cpu, 
  Activity, 
  AlertCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signIn, isLoading, error, isSupabaseConfigured, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      const destination = location.state?.from?.pathname || (profile.role === 'teacher' ? '/teacher' : '/student');
      navigate(destination, { replace: true });
    }
  }, [user, profile, navigate, location]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim() || !password) {
      setFormError('Harap masukkan email dan kata sandi Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.success && result.role) {
        const dest = result.role === 'teacher' ? '/teacher' : '/student';
        navigate(dest, { replace: true });
      } else if (result.error) {
        setFormError(result.error);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Gagal melakukan login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute top-1/2 right-10 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Top Header / Brand */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white font-mono">
                Code<span className="text-indigo-400">Monitor</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                v1.0 MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Platform Praktik & Live Monitoring Siswa SMK
            </p>
          </div>
        </div>

        {/* Status Supabase pill */}
        <div className="flex items-center gap-2">
          {isSupabaseConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Supabase Terhubung
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Demo Mode Aktif
            </span>
          )}
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1 flex items-center justify-center z-10">
        <div className="w-full grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Product Information & Value Proposition */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Pantau Aktivitas Coding Siswa secara{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
                Real-Time
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              Guru tidak perlu lagi berkeliling dari satu komputer ke komputer lain. 
              Ketahui siswa yang sedang coding, mengalami error, tidak aktif, atau sudah selesai dalam satu dashboard terintegrasi.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-indigo-500/40 transition">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="font-semibold text-sm text-slate-200">Python WebAssembly</div>
                <div className="text-xs text-slate-400 mt-0.5">Eksekusi Pyodide di browser tanpa server compiler</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-cyan-500/40 transition">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="font-semibold text-sm text-slate-200">Arduino / C++</div>
                <div className="text-xs text-slate-400 mt-0.5">Editor terstruktur siap transfer ke Arduino IDE</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm hover:border-emerald-500/40 transition">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="font-semibold text-sm text-slate-200">Live Monitor</div>
                <div className="text-xs text-slate-400 mt-0.5">Autosave debounce & status Run real-time</div>
              </div>
            </div>

            {/* Teacher - Student Role Indicators */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 text-xs text-slate-400 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span><strong className="text-slate-200">Guru:</strong> Buat kelas, sesi praktik & pantau live code</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span><strong className="text-slate-200">Siswa:</strong> Workspace privat & submit program</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign-In Card */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Masuk ke Akun
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Masukkan email dan kata sandi untuk mengakses workspace Anda.
                </p>
              </div>

              {/* Alert Error Box */}
              {(formError || error) && (
                <div 
                  role="alert" 
                  aria-live="polite" 
                  className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs sm:text-sm">
                    {formError || error}
                  </div>
                </div>
              )}

              {/* Compliance with modern-web-guidance: Semantic <form> element with autofill attributes */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
                
                {/* Email Input */}
                <div>
                  <label 
                    htmlFor="email" 
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Alamat Email
                  </label>
                  <div className="relative rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      autoComplete="username"
                      required
                      enterKeyHint="next"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@guru.smk.id atau siswa@smk.id"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label 
                      htmlFor="current-password" 
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                    >
                      Kata Sandi
                    </label>
                    <a 
                      href="#forgot-password" 
                      onClick={(e) => {
                        e.preventDefault();
                        alert('Silakan hubungi administrator lab komputer atau guru pengampu untuk mereset kata sandi Anda.');
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Lupa kata sandi?
                    </a>
                  </div>

                  <div className="relative rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 transition">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="current-password"
                      name="password"
                      autoComplete="current-password"
                      required
                      enterKeyHint="done"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-xs text-slate-400">Ingat sesi saya di komputer ini</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isSubmitting || isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Memverifikasi akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Platform</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Register Link */}
              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Belum memiliki akun?{' '}
                  <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
                    Daftar akun baru
                  </Link>
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-900 z-10 flex items-center justify-center">
        <p>© 2026 CodeMonitor.</p>
      </footer>
    </div>
  );
};

