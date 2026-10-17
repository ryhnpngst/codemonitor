export interface ClassModel {
  id: string;
  name: string;
  class_code: string;
  teacher_id: string;
  created_at: string;
}

export interface EnrolledClassModel extends ClassModel {
  teacher?: {
    name: string;
    email: string;
  };
}

export interface PracticeSessionModel {
  id: string;
  class_id: string;
  title: string;
  instructions: string | null;
  language: 'Python' | 'Arduino/C++';
  status: 'Draft' | 'Active' | 'Closed';
  created_at: string;
}

export interface SubmissionModel {
  id: string;
  session_id: string;
  student_id: string;
  code: string;
  status: 'in_progress' | 'submitted';
  started_at: string;
  last_activity_at: string;
  change_count: number;
  run_count: number;
  last_run_at: string | null;
  last_run_status: 'success' | 'error' | null;
  updated_at: string;
  submitted_at: string | null;
}

export interface StudentMonitorItem {
  student_id: string;
  name: string;
  email: string;
  submission_id?: string;
  code?: string;
  status: 'not_started' | 'active' | 'inactive' | 'submitted';
  last_run_status?: 'success' | 'error' | null;
  run_count: number;
  change_count: number;
  last_activity_at?: string;
  submitted_at?: string | null;
}

export interface StudentSessionItem extends PracticeSessionModel {
  submission?: SubmissionModel | null;
}
