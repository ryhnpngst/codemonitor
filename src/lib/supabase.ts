import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-supabase-url')
);

// Fallback placeholder client if environment variables are not yet provided
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://dummy-codemonitor.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'dummy-anon-key'
);

