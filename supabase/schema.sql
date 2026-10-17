-- ========================================================
-- CODEMONITOR 1.0 — SKEMA DATABASE & AUTENTIKASI SUPABASE
-- Sesuai PRD 1.0 (Bagian 10, 22, 23, 24)
-- ========================================================

-- 1. Buat tabel profiles (merujuk ke auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Buat tabel classes (Kelas yang dibuat oleh Guru)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_code text not null unique,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Buat tabel class_members (Anggota kelas / Siswa yang bergabung)
create table if not exists public.class_members (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (class_id, student_id)
);

-- 4. Buat tabel practice_sessions (Sesi praktik pemrograman)
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  instructions text,
  language text not null default 'Python' check (language in ('Python', 'Arduino/C++')),
  status text not null default 'Active' check (status in ('Draft', 'Active', 'Closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Buat tabel submissions (Workspace & aktivitas kode tiap siswa)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  code text default '',
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_activity_at timestamp with time zone default timezone('utc'::text, now()) not null,
  change_count integer default 0,
  run_count integer default 0,
  last_run_at timestamp with time zone,
  last_run_status text check (last_run_status in ('success', 'error', null)),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  submitted_at timestamp with time zone,
  unique (session_id, student_id)
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.submissions enable row level security;

-- Policies: Profiles
create policy "Allow read profiles" on public.profiles
  for select to authenticated using (true);
create policy "Allow user to insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "Allow user to update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- Policies: Classes
create policy "Allow read classes" on public.classes
  for select to authenticated using (true);
create policy "Allow teachers to insert classes" on public.classes
  for insert to authenticated with check (auth.uid() = teacher_id);
create policy "Allow teachers to update own classes" on public.classes
  for update to authenticated using (auth.uid() = teacher_id);

-- Policies: Class Members
create policy "Allow read class_members" on public.class_members
  for select to authenticated using (true);
create policy "Allow students to join classes" on public.class_members
  for insert to authenticated with check (auth.uid() = student_id);

-- Policies: Practice Sessions
create policy "Allow read practice_sessions" on public.practice_sessions
  for select to authenticated using (true);
create policy "Allow teachers to manage sessions" on public.practice_sessions
  for all to authenticated using (
    exists (select 1 from public.classes where classes.id = practice_sessions.class_id and classes.teacher_id = auth.uid())
  );

-- Policies: Submissions
-- Guru bisa membaca semua submission pada kelas miliknya
-- Siswa hanya bisa membaca dan mengubah submission miliknya sendiri
create policy "Allow read submissions" on public.submissions
  for select to authenticated using (
    student_id = auth.uid() or
    exists (
      select 1 from public.practice_sessions ps
      join public.classes c on c.id = ps.class_id
      where ps.id = submissions.session_id and c.teacher_id = auth.uid()
    )
  );

create policy "Allow students to insert own submission" on public.submissions
  for insert to authenticated with check (student_id = auth.uid());

create policy "Allow students to update own submission" on public.submissions
  for update to authenticated using (student_id = auth.uid());

-- ========================================================
-- FUNCTION & TRIGGER: Auto create profile on auth signup
-- ========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do update set
    name = excluded.name,
    role = excluded.role;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Aktifkan Realtime untuk tabel submissions (PRD F10 & Bagian 23)
alter publication supabase_realtime add table public.submissions;
