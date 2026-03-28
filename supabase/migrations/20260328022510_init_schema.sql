-- ============================================
-- Myopia Tracker - Database Schema
-- ============================================

-- 1. Clinics (안과)
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 2. Profiles (사용자 프로필)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null,
  role text not null check (role in ('doctor', 'customer', 'admin')),
  approved boolean default false,
  clinic_id uuid references public.clinics(id),
  clinic_name text,
  children jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 3. Patients (환자)
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  reg_no text,
  name text not null,
  birth_date date not null,
  gender text not null check (gender in ('male', 'female')),
  clinic_id uuid references public.clinics(id),
  created_at timestamptz default now()
);

-- 4. Measurements (측정 기록)
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  date date not null,
  age numeric(4,1),
  od_al numeric(5,2),
  os_al numeric(5,2),
  od_se numeric(5,2),
  os_se numeric(5,2),
  od_pct text,
  os_pct text,
  created_at timestamptz default now()
);

-- 5. Treatments (치료 기록)
create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  type text not null,
  date date not null,
  age numeric(4,1),
  created_at timestamptz default now()
);

-- 6. Approval Requests (의사 승인 요청)
create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text,
  name text,
  clinic_name text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- ============================================
-- Indexes
-- ============================================
create index idx_patients_clinic on public.patients(clinic_id);
create index idx_measurements_patient on public.measurements(patient_id);
create index idx_treatments_patient on public.treatments(patient_id);
create index idx_profiles_clinic on public.profiles(clinic_id);
create index idx_profiles_role on public.profiles(role);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.measurements enable row level security;
alter table public.treatments enable row level security;
alter table public.approval_requests enable row level security;

-- Helper: get current user's role
create or replace function public.get_my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Helper: get current user's clinic_id
create or replace function public.get_my_clinic_id()
returns uuid language sql security definer stable as $$
  select clinic_id from public.profiles where id = auth.uid()
$$;

-- CLINICS
create policy "Anyone can view clinics" on public.clinics for select using (true);
create policy "Doctors can create clinics" on public.clinics for insert with check (public.get_my_role() = 'doctor');

-- PROFILES
create policy "Users can view own profile" on public.profiles for select using (id = auth.uid() or public.get_my_role() = 'admin');
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid());
create policy "Users can insert own profile" on public.profiles for insert with check (id = auth.uid());

-- PATIENTS
create policy "Doctors can view own clinic patients" on public.patients for select using (clinic_id = public.get_my_clinic_id() or public.get_my_role() = 'admin');
create policy "Doctors can create patients" on public.patients for insert with check (public.get_my_role() = 'doctor' and clinic_id = public.get_my_clinic_id());
create policy "Doctors can delete own clinic patients" on public.patients for delete using (public.get_my_role() = 'doctor' and clinic_id = public.get_my_clinic_id());
create policy "Customers can view linked patients" on public.patients for select using (public.get_my_role() = 'customer');

-- MEASUREMENTS
create policy "View measurements" on public.measurements for select using (exists (select 1 from public.patients p where p.id = patient_id and (p.clinic_id = public.get_my_clinic_id() or public.get_my_role() in ('admin', 'customer'))));
create policy "Doctors insert measurements" on public.measurements for insert with check (public.get_my_role() = 'doctor' and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id()));
create policy "Doctors delete measurements" on public.measurements for delete using (public.get_my_role() = 'doctor' and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id()));

-- TREATMENTS
create policy "View treatments" on public.treatments for select using (exists (select 1 from public.patients p where p.id = patient_id and (p.clinic_id = public.get_my_clinic_id() or public.get_my_role() in ('admin', 'customer'))));
create policy "Doctors insert treatments" on public.treatments for insert with check (public.get_my_role() = 'doctor' and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id()));
create policy "Doctors delete treatments" on public.treatments for delete using (public.get_my_role() = 'doctor' and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id()));

-- APPROVAL_REQUESTS
create policy "Users can view own requests" on public.approval_requests for select using (user_id = auth.uid() or public.get_my_role() = 'admin');
create policy "Users can create requests" on public.approval_requests for insert with check (user_id = auth.uid());
create policy "Admin can update requests" on public.approval_requests for update using (public.get_my_role() = 'admin');

-- ============================================
-- Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'customer')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
