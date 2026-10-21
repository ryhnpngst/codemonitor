import { describe, it, expect } from 'vitest';
import {
  generateClassCode,
  formatRelativeTime,
  calculateStudentStatus,
  sortStudentsByPriority,
  calculateClassroomMetrics,
  filterStudents,
  toggleSessionStatus,
  isSessionEditable,
} from '../utils/classroom';
import type { StudentMonitorItem } from '../types/database.types';

describe('Classroom Utilities', () => {
  describe('generateClassCode()', () => {
    it('harus menghasilkan kode kelas sepanjang 6 karakter', () => {
      const code = generateClassCode();
      expect(code).toHaveLength(6);
      expect(typeof code).toBe('string');
    });

    it('harus hanya menggunakan karakter alfanumerik yang valid (tanpa karakter ambigu seperti O, 0, I, 1)', () => {
      const allowedChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
      for (let i = 0; i < 20; i++) {
        const code = generateClassCode();
        expect(code).toMatch(allowedChars);
        expect(code).not.toMatch(/[01IO]/);
      }
    });

    it('harus menghasilkan kode acak yang bervariasi', () => {
      const codes = new Set();
      for (let i = 0; i < 50; i++) {
        codes.add(generateClassCode());
      }
      expect(codes.size).toBeGreaterThan(45);
    });
  });

  describe('formatRelativeTime()', () => {
    const fixedNow = 1700000000000;

    it('harus mengembalikan "Belum ada aktivitas" jika timestamp kosong', () => {
      expect(formatRelativeTime(undefined)).toBe('Belum ada aktivitas');
      expect(formatRelativeTime('')).toBe('Belum ada aktivitas');
    });

    it('harus mengembalikan "Baru saja" jika aktivitas kurang dari 10 detik lalu', () => {
      const recent = new Date(fixedNow - 5000).toISOString();
      expect(formatRelativeTime(recent, fixedNow)).toBe('Baru saja');
    });

    it('harus mengembalikan "X detik lalu" jika antara 10 dan 59 detik lalu', () => {
      const fortySecAgo = new Date(fixedNow - 40000).toISOString();
      expect(formatRelativeTime(fortySecAgo, fixedNow)).toBe('40 detik lalu');
    });

    it('harus mengembalikan "X menit lalu" jika antara 1 dan 59 menit lalu', () => {
      const fiveMinAgo = new Date(fixedNow - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinAgo, fixedNow)).toBe('5 menit lalu');
    });

    it('harus mengembalikan "X jam lalu" jika antara 1 dan 23 jam lalu', () => {
      const threeHoursAgo = new Date(fixedNow - 3 * 3600 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo, fixedNow)).toBe('3 jam lalu');
    });

    it('harus mengembalikan format tanggal lokal jika lebih dari 24 jam lalu', () => {
      const twoDaysAgo = new Date(fixedNow - 48 * 3600 * 1000).toISOString();
      const result = formatRelativeTime(twoDaysAgo, fixedNow);
      expect(result).not.toContain('jam lalu');
      expect(result).not.toContain('menit lalu');
    });
  });

  describe('calculateStudentStatus()', () => {
    const fixedNow = 1700000000000;

    it('harus mengembalikan "not_started" jika submission kosong atau belum ada aktivitas', () => {
      expect(calculateStudentStatus(null, fixedNow)).toBe('not_started');
      expect(calculateStudentStatus(undefined, fixedNow)).toBe('not_started');
      expect(calculateStudentStatus({ status: 'in_progress' }, fixedNow)).toBe('not_started');
    });

    it('harus mengembalikan "submitted" jika status submission sudah disubmit', () => {
      expect(calculateStudentStatus({ status: 'submitted' }, fixedNow)).toBe('submitted');
    });

    it('harus mengembalikan "active" jika aktivitas terjadi dalam jendela 2 menit (<= 120 detik)', () => {
      const oneMinuteAgo = new Date(fixedNow - 60 * 1000).toISOString();
      expect(calculateStudentStatus({ status: 'in_progress', last_activity_at: oneMinuteAgo }, fixedNow)).toBe('active');

      const almostTwoMinutesAgo = new Date(fixedNow - 119 * 1000).toISOString();
      expect(calculateStudentStatus({ status: 'in_progress', last_activity_at: almostTwoMinutesAgo }, fixedNow)).toBe('active');
    });

    it('harus mengembalikan "inactive" jika tidak ada aktivitas lebih dari 2 menit (> 120 detik)', () => {
      const threeMinutesAgo = new Date(fixedNow - 180 * 1000).toISOString();
      expect(calculateStudentStatus({ status: 'in_progress', last_activity_at: threeMinutesAgo }, fixedNow)).toBe('inactive');
    });
  });

  describe('sortStudentsByPriority()', () => {
    it('harus mengurutkan siswa dengan prioritas: active > inactive > submitted > not_started', () => {
      const mockStudents: StudentMonitorItem[] = [
        { student_id: '1', name: 'Siswa A', email: 'a@mail.com', status: 'not_started', run_count: 0, change_count: 0 },
        { student_id: '2', name: 'Siswa B', email: 'b@mail.com', status: 'submitted', run_count: 2, change_count: 10 },
        { student_id: '3', name: 'Siswa C', email: 'c@mail.com', status: 'active', run_count: 1, change_count: 5 },
        { student_id: '4', name: 'Siswa D', email: 'd@mail.com', status: 'inactive', run_count: 3, change_count: 8 },
      ];

      const sorted = sortStudentsByPriority(mockStudents);
      expect(sorted.map(s => s.status)).toEqual(['active', 'inactive', 'submitted', 'not_started']);
    });
  });

  describe('calculateClassroomMetrics()', () => {
    it('harus menghitung ringkasan metrik dashboard kelas dengan benar', () => {
      const mockStudents: StudentMonitorItem[] = [
        { student_id: '1', name: 'A', email: 'a@mail.com', status: 'active', run_count: 1, change_count: 1 },
        { student_id: '2', name: 'B', email: 'b@mail.com', status: 'active', run_count: 2, change_count: 3 },
        { student_id: '3', name: 'C', email: 'c@mail.com', status: 'inactive', run_count: 1, change_count: 2 },
        { student_id: '4', name: 'D', email: 'd@mail.com', status: 'submitted', run_count: 5, change_count: 12 },
        { student_id: '5', name: 'E', email: 'e@mail.com', status: 'not_started', run_count: 0, change_count: 0 },
        { student_id: '6', name: 'F', email: 'f@mail.com', status: 'active', last_run_status: 'error', run_count: 2, change_count: 4 },
      ];

      const metrics = calculateClassroomMetrics(mockStudents);
      expect(metrics.total).toBe(6);
      expect(metrics.active).toBe(3);
      expect(metrics.inactive).toBe(1);
      expect(metrics.submitted).toBe(1);
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('filterStudents()', () => {
    const mockStudents: StudentMonitorItem[] = [
      { student_id: '1', name: 'Budi Santoso', email: 'budi@smk.id', status: 'active', run_count: 1, change_count: 5 },
      { student_id: '2', name: 'Siti Rahma', email: 'siti@smk.id', status: 'inactive', run_count: 2, change_count: 2 },
      { student_id: '3', name: 'Ahmad Dani', email: 'ahmad@smk.id', status: 'submitted', run_count: 3, change_count: 8 },
      { student_id: '4', name: 'Rian Pratama', email: 'rian@smk.id', status: 'active', last_run_status: 'error', run_count: 1, change_count: 3 },
    ];

    it('harus memfilter siswa berdasarkan pencarian nama (case-insensitive)', () => {
      const result = filterStudents(mockStudents, 'budi', 'all');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Budi Santoso');
    });

    it('harus memfilter siswa berdasarkan status aktif', () => {
      const result = filterStudents(mockStudents, '', 'active');
      expect(result).toHaveLength(2);
      expect(result.every(s => s.status === 'active')).toBe(true);
    });

    it('harus memfilter siswa yang mengalami last run error', () => {
      const result = filterStudents(mockStudents, '', 'error');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Rian Pratama');
    });

    it('harus mengembalikan array kosong jika pencarian tidak ditemukan', () => {
      const result = filterStudents(mockStudents, 'nama-tidak-ada', 'all');
      expect(result).toHaveLength(0);
    });
  });

  describe('toggleSessionStatus()', () => {
    it('harus mengubah status Active menjadi Closed', () => {
      expect(toggleSessionStatus('Active')).toBe('Closed');
    });

    it('harus mengubah status Closed menjadi Active', () => {
      expect(toggleSessionStatus('Closed')).toBe('Active');
    });

    it('harus mengubah status Draft menjadi Closed jika ditutup', () => {
      expect(toggleSessionStatus('Draft')).toBe('Closed');
    });
  });

  describe('isSessionEditable()', () => {
    it('harus mengizinkan pengeditan jika sesi Active dan belum dikumpulkan', () => {
      expect(isSessionEditable('Active', 'in_progress')).toBe(true);
      expect(isSessionEditable('Active', undefined)).toBe(true);
    });

    it('harus menolak pengeditan jika submission sudah submitted', () => {
      expect(isSessionEditable('Active', 'submitted')).toBe(false);
    });

    it('harus menolak pengeditan jika sesi berstatus Closed', () => {
      expect(isSessionEditable('Closed', 'in_progress')).toBe(false);
      expect(isSessionEditable('Closed', undefined)).toBe(false);
    });

    it('harus menolak pengeditan jika sesi Closed dan submission submitted', () => {
      expect(isSessionEditable('Closed', 'submitted')).toBe(false);
    });
  });
});


