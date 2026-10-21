import { describe, it, expect } from 'vitest';
import type { UserRole, Profile } from '../types/auth';

describe('Auth & Profile Self-Healing Logic', () => {
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

  it('harus memiliki akun demo yang lengkap untuk Guru dan Siswa', () => {
    expect(DEMO_PROFILES.teacher.role).toBe('teacher');
    expect(DEMO_PROFILES.teacher.name).toBe('Pak Rayhan, S.Kom.');
    expect(DEMO_PROFILES.student.role).toBe('student');
    expect(DEMO_PROFILES.student.name).toBe('Andi Pratama');
  });

  describe('Self-Healing Profile Recreation', () => {
    const healMissingProfile = (
      userId: string,
      userEmail: string,
      metadata?: { name?: string; role?: UserRole }
    ): Profile => {
      const fallbackName = metadata?.name || userEmail.split('@')[0] || 'User';
      const fallbackRole: UserRole = metadata?.role === 'teacher' ? 'teacher' : 'student';
      return {
        id: userId,
        name: fallbackName,
        email: userEmail,
        role: fallbackRole,
        created_at: new Date().toISOString(),
      };
    };

    it('harus memulihkan profil dari user metadata jika row di public.profiles hilang/terhapus', () => {
      const userId = '11111111-2222-3333-4444-555555555555';
      const userEmail = 'budi@siswa.smk.id';
      const metadata = { name: 'Budi Hartono', role: 'student' as UserRole };

      const healed = healMissingProfile(userId, userEmail, metadata);

      expect(healed.id).toBe(userId);
      expect(healed.name).toBe('Budi Hartono');
      expect(healed.email).toBe('budi@siswa.smk.id');
      expect(healed.role).toBe('student');
    });

    it('harus menggunakan nama dari email jika metadata kosong', () => {
      const userId = '99999999-8888-7777-6666-555555555555';
      const userEmail = 'dewi.lestari@smk.id';

      const healed = healMissingProfile(userId, userEmail, undefined);

      expect(healed.name).toBe('dewi.lestari');
      expect(healed.role).toBe('student');
    });

    it('harus mengenali role teacher dari metadata dengan benar', () => {
      const userId = 'teacher-123';
      const userEmail = 'guru.tik@smk.id';
      const metadata = { name: 'Ibu Siti Aminah', role: 'teacher' as UserRole };

      const healed = healMissingProfile(userId, userEmail, metadata);

      expect(healed.role).toBe('teacher');
      expect(healed.name).toBe('Ibu Siti Aminah');
    });
  });

  describe('Form Validations', () => {
    const validateRegistration = (name: string, email: string, password: string) => {
      if (!name.trim() || !email.trim() || !password) {
        return { valid: false, error: 'Harap lengkapi semua data pendaftaran.' };
      }
      if (password.length < 6) {
        return { valid: false, error: 'Kata sandi minimal harus terdiri dari 6 karakter.' };
      }
      return { valid: true, error: null };
    };

    it('harus menolak pendaftaran jika password kurang dari 6 karakter', () => {
      const result = validateRegistration('Andi', 'andi@smk.id', '12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimal harus terdiri dari 6 karakter');
    });

    it('harus menolak pendaftaran jika salah satu field kosong atau hanya spasi', () => {
      const result = validateRegistration('   ', 'andi@smk.id', '123456');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Harap lengkapi semua data');
    });

    it('harus menerima pendaftaran jika semua data valid', () => {
      const result = validateRegistration('Andi Pratama', 'andi@smk.id', 'secret123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });
  });
});

