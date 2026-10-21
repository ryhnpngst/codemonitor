import { describe, it, expect } from 'vitest';
import {
  getDefaultStarterCode,
  sanitizeClassCode,
  calculateStudentMetrics,
} from '../utils/editor';

describe('Editor & Workspace Utilities', () => {
  describe('getDefaultStarterCode()', () => {
    it('harus memberikan template awal Python lengkap dengan contoh input dan print', () => {
      const code = getDefaultStarterCode('Python');
      expect(code).toContain('input(');
      expect(code).toContain('print(');
      expect(code).toContain('# Tulis program Python Anda di sini');
    });

    it('harus memberikan template awal Arduino / C++ dengan fungsi setup() dan loop()', () => {
      const code = getDefaultStarterCode('Arduino/C++');
      expect(code).toContain('void setup()');
      expect(code).toContain('void loop()');
      expect(code).toContain('digitalWrite(');
    });

    it('harus fallback ke template Arduino / C++ jika bahasa tidak dikenal', () => {
      const code = getDefaultStarterCode('UnknownLanguage');
      expect(code).toContain('void setup()');
    });
  });

  describe('sanitizeClassCode()', () => {
    it('harus menghapus spasi di awal dan akhir', () => {
      expect(sanitizeClassCode('  AB12CD  ')).toBe('AB12CD');
    });

    it('harus mengubah huruf kecil menjadi huruf kapital', () => {
      expect(sanitizeClassCode('ab12cd')).toBe('AB12CD');
      expect(sanitizeClassCode('   xyz890   ')).toBe('XYZ890');
    });

    it('harus mengembalikan string kosong jika input hanya spasi', () => {
      expect(sanitizeClassCode('   ')).toBe('');
    });
  });

  describe('calculateStudentMetrics()', () => {
    it('harus menghitung metrik sesi praktik siswa dengan akurat', () => {
      const mockSessions = [
        { id: '1', submission: { status: 'submitted' } },
        { id: '2', submission: { status: 'submitted' } },
        { id: '3', submission: { status: 'in_progress' } },
        { id: '4', submission: null },
        { id: '5', submission: undefined },
      ];

      const metrics = calculateStudentMetrics(mockSessions);
      expect(metrics.total).toBe(5);
      expect(metrics.submitted).toBe(2);
      expect(metrics.inProgress).toBe(1);
      expect(metrics.notStarted).toBe(2);
    });

    it('harus mengembalikan nol untuk semua metrik jika daftar sesi kosong', () => {
      const metrics = calculateStudentMetrics([]);
      expect(metrics.total).toBe(0);
      expect(metrics.submitted).toBe(0);
      expect(metrics.inProgress).toBe(0);
      expect(metrics.notStarted).toBe(0);
    });
  });
});

