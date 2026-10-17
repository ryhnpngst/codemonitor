import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile, UserRole } from '../types/auth';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  isSupabaseConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signUp: (email: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string; sessionExists: boolean; role?: UserRole }>;
  signInAsDemo: (role: UserRole) => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const DEMO_PROFILES: Record<UserRole, Profile> = {
  teacher: {
    id: 'demo-teacher-001',
    name: 'Pak Rayhan, S.Kom.',
    email: 'rayhan@guru.smk.id',
    role: 'teacher',
    created_at: new Date().toISOString(),
  },
  student: {
    id: 'demo-student-001',
    name: 'Andi Pratama',
    email: 'andi@siswa.smk.id',
    role: 'student',
    created_at: new Date().toISOString(),
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, userEmail: string): Promise<Profile | null> => {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr || !data) {
        console.warn('Profile not found in database, creating fallback profile from metadata');
        return {
          id: userId,
          name: userEmail.split('@')[0],
          email: userEmail,
          role: 'student', // default fallback
        };
      }
      return data as Profile;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    // Check if demo user is stored in localStorage
    const savedDemo = localStorage.getItem('codemonitor_demo_user');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo) as Profile;
        setProfile(parsed);
        setUser({ id: parsed.id, email: parsed.email });
        setIsLoading(false);
        return;
      } catch {
        localStorage.removeItem('codemonitor_demo_user');
      }
    }

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Check active Supabase session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          const userProfile = await fetchProfile(session.user.id, session.user.email || '');
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '' });
        const userProfile = await fetchProfile(session.user.id, session.user.email || '');
        setProfile(userProfile);
      } else if (!localStorage.getItem('codemonitor_demo_user')) {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setIsLoading(true);
    setError(null);

    // If Supabase is not configured, inform the user or check if demo credentials match
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      // Helpful demo check
      if (email === 'rayhan@guru.smk.id') {
        signInAsDemo('teacher');
        return { success: true, role: 'teacher' };
      }
      if (email === 'andi@siswa.smk.id') {
        signInAsDemo('student');
        return { success: true, role: 'student' };
      }

      const errMsg = 'Supabase belum dikonfigurasi pada file .env. Silakan gunakan tombol "Quick Demo Login" di bawah atau isi kredensial Supabase Anda.';
      setError(errMsg);
      return { success: false, error: errMsg };
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return { success: false, error: signInError.message };
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || '' });
        const userProfile = await fetchProfile(data.user.id, data.user.email || '');
        setProfile(userProfile);
        setIsLoading(false);
        return { success: true, role: userProfile?.role || 'student' };
      }

      setIsLoading(false);
      return { success: false, error: 'Login gagal, user tidak ditemukan.' };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat login.';
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<{ success: boolean; error?: string; sessionExists: boolean; role?: UserRole }> => {
    setIsLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      // Demo fallback
      const demoUser: Profile = {
        id: `demo-${role}-${Date.now()}`,
        name,
        email,
        role,
        created_at: new Date().toISOString(),
      };
      setProfile(demoUser);
      setUser({ id: demoUser.id, email: demoUser.email });
      localStorage.setItem('codemonitor_demo_user', JSON.stringify(demoUser));
      return { success: true, sessionExists: true, role };
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return { success: false, error: signUpError.message, sessionExists: false };
      }

      if (data.user) {
        if (data.session) {
          // Email confirmation is disabled, user is immediately logged in
          const newProfile: Profile = {
            id: data.user.id,
            name,
            email,
            role,
            created_at: new Date().toISOString(),
          };
          setUser({ id: data.user.id, email: data.user.email || email });
          setProfile(newProfile);
          setIsLoading(false);
          return { success: true, sessionExists: true, role };
        } else {
          // Email confirmation is enabled, session is pending email verification
          setIsLoading(false);
          return { success: true, sessionExists: false, role };
        }
      }

      setIsLoading(false);
      return { success: false, error: 'Gagal membuat akun.', sessionExists: false };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat pendaftaran.';
      setError(errMsg);
      setIsLoading(false);
      return { success: false, error: errMsg, sessionExists: false };
    }
  };

  const signInAsDemo = (role: UserRole) => {
    const demoProfile = DEMO_PROFILES[role];
    setProfile(demoProfile);
    setUser({ id: demoProfile.id, email: demoProfile.email });
    localStorage.setItem('codemonitor_demo_user', JSON.stringify(demoProfile));
    setError(null);
    setIsLoading(false);
  };

  const signOut = async () => {
    setIsLoading(true);
    localStorage.removeItem('codemonitor_demo_user');
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error,
        isSupabaseConfigured,
        signIn,
        signUp,
        signInAsDemo,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

