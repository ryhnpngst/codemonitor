-- ========================================================
-- CODEMONITOR 1.0 — SKEMA DATABASE & AUTENTIKASI SUPABASE
-- Sesuai PRD 1.0 (Bagian 10, 22, 24)
-- ========================================================

-- 1. Buat tabel profiles (merujuk ke auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('teacher', 'student')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Aktifkan Row Level Security (RLS) pada tabel profiles
alter table public.profiles enable row level security;

-- 3. Policy RLS untuk profiles:
-- Pengguna dapat melihat profile miliknya sendiri dan profile pengguna lain (diperlukan untuk guru & monitoring kelas)
create policy "Allow read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- Pengguna dapat menyisipkan/mengupdate profil miliknya sendiri
create policy "Allow user to insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Allow user to update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);

-- 4. Function Trigger Otomatis:
-- Ketika pengguna mendaftar via Supabase Auth (auth.users),
-- function ini otomatis membuat baris data pada public.profiles.
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

-- 5. Trigger yang memanggil function di atas setiap kali ada user baru
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

