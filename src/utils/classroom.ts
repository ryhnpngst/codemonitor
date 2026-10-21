import type { StudentMonitorItem } from '../types/database.types';

/**
 * Generate a random 6-character class code excluding visually ambiguous characters.
 */
export const generateClassCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Format timestamp into Indonesian relative time description.
 */
export const formatRelativeTime = (timestamp?: string, now: number = Date.now()): string => {
  if (!timestamp) return 'Belum ada aktivitas';
  const seconds = Math.floor((now - new Date(timestamp).getTime()) / 1000);
  if (seconds < 10) return 'Baru saja';
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(timestamp).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Determine a student's active status based on submission and 2-minute inactivity threshold.
 * (PRD Section 18)
 */
export const calculateStudentStatus = (
  sub: { status?: string; last_activity_at?: string } | null | undefined,
  now: number = Date.now()
): StudentMonitorItem['status'] => {
  if (!sub) return 'not_started';
  if (sub.status === 'submitted') return 'submitted';
  if (!sub.last_activity_at) return 'not_started';

  const lastActiveTime = new Date(sub.last_activity_at).getTime();
  const inactiveDiff = now - lastActiveTime;
  // 2 minutes inactivity window
  if (inactiveDiff <= 2 * 60 * 1000) {
    return 'active';
  }
  return 'inactive';
};

/**
 * Sort students according to monitoring priority:
 * 1. Active (actively typing/running)
 * 2. Inactive (idle > 2 min)
 * 3. Submitted (completed)
 * 4. Not started
 */
export const sortStudentsByPriority = (students: StudentMonitorItem[]): StudentMonitorItem[] => {
  const priorityOrder: Record<string, number> = {
    active: 1,
    inactive: 2,
    submitted: 3,
    not_started: 4,
  };

  return [...students].sort(
    (a, b) => (priorityOrder[a.status] || 5) - (priorityOrder[b.status] || 5)
  );
};

/**
 * Calculate classroom dashboard summary metrics.
 */
export const calculateClassroomMetrics = (students: StudentMonitorItem[]) => {
  const total = students.length;
  const active = students.filter(s => s.status === 'active').length;
  const inactive = students.filter(s => s.status === 'inactive').length;
  const submitted = students.filter(s => s.status === 'submitted').length;
  const errorCount = students.filter(s => s.last_run_status === 'error').length;
  return { total, active, inactive, submitted, errorCount };
};

/**
 * Filter students list by search term and status tab.
 */
export const filterStudents = (
  students: StudentMonitorItem[],
  searchQuery: string,
  statusFilter: 'all' | 'active' | 'inactive' | 'not_started' | 'submitted' | 'error'
): StudentMonitorItem[] => {
  return students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'error') return s.last_run_status === 'error';
    return s.status === statusFilter;
  });
};

/**
 * Toggle practice session status between Active and Closed.
 */
export const toggleSessionStatus = (current: 'Draft' | 'Active' | 'Closed'): 'Active' | 'Closed' => {
  return current === 'Closed' ? 'Active' : 'Closed';
};

/**
 * Check if a practice session is editable by student.
 * Returns false if student already submitted or if session is closed by teacher.
 */
export const isSessionEditable = (sessionStatus?: string, submissionStatus?: string): boolean => {
  if (submissionStatus === 'submitted') return false;
  if (sessionStatus === 'Closed') return false;
  return true;
};


