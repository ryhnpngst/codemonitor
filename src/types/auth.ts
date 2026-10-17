export type UserRole = 'teacher' | 'student';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

