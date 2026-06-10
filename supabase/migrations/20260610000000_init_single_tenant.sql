-- ============================================================
-- Myopia Tracker — Single-tenant (doctor/nurse) consolidated schema
-- Replaces all prior multi-tenant migrations.
-- Roles: doctor | nurse (identical clinical CRUD). is_admin = capability flag.
-- ============================================================

-- ---------- Tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null,
  role text not null check (role in ('doctor','nurse')),
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  reg_no text,
  name text not null,
  birth_date date not null,
  gender text not null check (gender in ('male','female')),
  custom_ref text,
  next_visit_date date,
  follow_up_months integer default 6,
  created_at timestamptz default now()
);

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

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  type text not null,
  date date not null,
  age numeric(4,1),
  end_date date,
  created_at timestamptz default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  content text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.treatment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#7c3aed',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- Indexes ----------
create index idx_measurements_patient on public.measurements(patient_id);
create index idx_treatments_patient on public.treatments(patient_id);
create index idx_notes_patient on public.notes(patient_id);
create index idx_profiles_role on public.profiles(role);
create unique index idx_patients_custom_ref_unique
  on public.patients(custom_ref) where custom_ref is not null;
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_user on public.audit_log(user_id);

-- ---------- RLS enable ----------
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.measurements enable row level security;
alter table public.treatments enable row level security;
alter table public.notes enable row level security;
alter table public.treatment_types enable row level security;
alter table public.audit_log enable row level security;

-- ---------- Helper functions (all security definer, search_path='') ----------
create or replace function public.get_my_role()
returns text language sql security definer stable set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_active_staff()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('doctor','nurse') and is_active = true
  )
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true and is_active = true
  )
$$;

-- ---------- Profiles policies ----------
-- A user can always read their own row (so the client can detect deactivation);
-- active staff can read all rows (for the admin user-management list).
create policy "View profiles" on public.profiles
  for select using (id = auth.uid() or public.is_active_staff());
create policy "Insert own profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "Update own profile" on public.profiles
  for update using (id = auth.uid());
create policy "Admins update any profile" on public.profiles
  for update using (public.is_admin());

-- SECURITY-CRITICAL: profiles UPDATE policies have no column-level restriction,
-- so this trigger is the ONLY thing preventing a non-admin from self-granting
-- is_admin / reactivating themselves / changing their role. Non-admin callers
-- get privileged columns reverted to their prior values; admins may change them.
create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_admin := old.is_admin;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;
create trigger guard_profile_changes_trg
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- ---------- Patients policies (shared pool: any active staff, full CRUD) ----------
create policy "Staff view patients" on public.patients
  for select using (public.is_active_staff());
create policy "Staff insert patients" on public.patients
  for insert with check (public.is_active_staff());
create policy "Staff update patients" on public.patients
  for update using (public.is_active_staff());
create policy "Staff delete patients" on public.patients
  for delete using (public.is_active_staff());

-- ---------- Measurements policies ----------
create policy "Staff view measurements" on public.measurements
  for select using (public.is_active_staff());
create policy "Staff insert measurements" on public.measurements
  for insert with check (public.is_active_staff());
create policy "Staff update measurements" on public.measurements
  for update using (public.is_active_staff());
create policy "Staff delete measurements" on public.measurements
  for delete using (public.is_active_staff());

-- ---------- Treatments policies ----------
create policy "Staff view treatments" on public.treatments
  for select using (public.is_active_staff());
create policy "Staff insert treatments" on public.treatments
  for insert with check (public.is_active_staff());
create policy "Staff update treatments" on public.treatments
  for update using (public.is_active_staff());
create policy "Staff delete treatments" on public.treatments
  for delete using (public.is_active_staff());

-- ---------- Notes policies ----------
-- DELIBERATE DECISION: unlike patients/measurements/treatments (shared-pool delete),
-- a note may only be deleted by its author or an admin — clinical notes are personal.
create policy "Staff view notes" on public.notes
  for select using (public.is_active_staff());
create policy "Staff insert notes" on public.notes
  for insert with check (public.is_active_staff() and created_by = auth.uid());
create policy "Delete own notes or admin" on public.notes
  for delete using (created_by = auth.uid() or public.is_admin());

-- ---------- Treatment types policies ----------
create policy "Staff view treatment types" on public.treatment_types
  for select using (public.is_active_staff());
create policy "Staff add treatment types" on public.treatment_types
  for insert with check (public.is_active_staff());
create policy "Admin update treatment types" on public.treatment_types
  for update using (public.is_admin());
create policy "Admin delete treatment types" on public.treatment_types
  for delete using (public.is_admin());

-- ---------- Audit log policies ----------
create policy "Staff insert audit" on public.audit_log
  for insert with check (public.is_active_staff() and user_id = auth.uid());
create policy "Admin view audit" on public.audit_log
  for select using (public.is_admin());

-- ---------- Seed default treatment types ----------
insert into public.treatment_types (name, color, sort_order) values
  ('아트로핀 0.01%', '#dc2626', 1),
  ('아트로핀 0.025%', '#ea580c', 2),
  ('아트로핀 0.05%', '#d97706', 3),
  ('아트로핀 0.1%', '#65a30d', 4),
  ('드림렌즈', '#059669', 5),
  ('마이사이트', '#0891b2', 6),
  ('PPSL', '#7c3aed', 7)
on conflict (name) do nothing;

-- ---------- Auto-create profile on signup; FIRST account becomes admin ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_is_admin boolean;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'nurse');
  if v_role not in ('doctor','nurse') then
    v_role := 'nurse';  -- never allow client to self-assign anything else
  end if;
  -- First registered account auto-becomes admin (typically the doctor).
  v_is_admin := (select count(*) from public.profiles) = 0;
  insert into public.profiles (id, email, name, role, is_admin, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    v_role,
    v_is_admin,
    true
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
