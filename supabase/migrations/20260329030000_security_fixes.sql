-- ============================================
-- CRITICAL-1: Remove blanket using(true) policies
-- ============================================
drop policy if exists "Anonymous can search patients by name and birthdate" on public.patients;
drop policy if exists "Anonymous can view measurements" on public.measurements;
drop policy if exists "Anonymous can view treatments" on public.treatments;

-- Create secure RPC function for anonymous patient search
create or replace function public.search_patient_public(
  p_name text,
  p_birth_date date default null,
  p_clinic_id uuid default null,
  p_custom_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  patient_row record;
  measurements_arr jsonb;
  treatments_arr jsonb;
begin
  -- Require clinic_id and name
  if p_clinic_id is null or p_name is null then
    return null;
  end if;

  -- Require either birth_date or custom_ref
  if p_birth_date is null and p_custom_ref is null then
    return null;
  end if;

  -- Find patient
  if p_custom_ref is not null then
    select * into patient_row from public.patients
    where clinic_id = p_clinic_id and name = p_name and custom_ref = p_custom_ref
    limit 1;
  else
    select * into patient_row from public.patients
    where clinic_id = p_clinic_id and name = p_name and birth_date = p_birth_date
    limit 1;
  end if;

  if patient_row is null then
    return null;
  end if;

  -- Get measurements
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id, 'date', m.date, 'age', m.age,
    'od_al', m.od_al, 'os_al', m.os_al,
    'od_se', m.od_se, 'os_se', m.os_se,
    'od_pct', m.od_pct, 'os_pct', m.os_pct
  ) order by m.date), '[]'::jsonb)
  into measurements_arr
  from public.measurements m where m.patient_id = patient_row.id;

  -- Get treatments
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'type', t.type, 'date', t.date,
    'age', t.age, 'end_date', t.end_date
  ) order by t.date), '[]'::jsonb)
  into treatments_arr
  from public.treatments t where t.patient_id = patient_row.id;

  return jsonb_build_object(
    'id', patient_row.id,
    'name', patient_row.name,
    'birth_date', patient_row.birth_date,
    'gender', patient_row.gender,
    'reg_no', patient_row.reg_no,
    'custom_ref', patient_row.custom_ref,
    'clinic_id', patient_row.clinic_id,
    'measurements', measurements_arr,
    'treatments', treatments_arr
  );
end;
$$;

-- Grant execute to anon and authenticated
grant execute on function public.search_patient_public to anon, authenticated;

-- ============================================
-- CRITICAL-2: Fix handle_new_user trigger - hardcode 'customer' role
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'customer'  -- Always customer on signup, admin promotes later
  );
  return new;
end;
$$;

-- ============================================
-- CRITICAL-3 + MEDIUM-1: Add approved check to doctor write policies
-- ============================================
-- Helper function to check if current doctor is approved
create or replace function public.is_approved_doctor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'doctor' and approved = true
  )
$$;

-- Drop and recreate doctor write policies with approved check
drop policy if exists "Doctors can create patients" on public.patients;
create policy "Approved doctors can create patients" on public.patients
  for insert with check (public.is_approved_doctor() and clinic_id = public.get_my_clinic_id());

drop policy if exists "Doctors can delete own clinic patients" on public.patients;
create policy "Approved doctors can delete patients" on public.patients
  for delete using (public.is_approved_doctor() and clinic_id = public.get_my_clinic_id());

drop policy if exists "Doctors insert measurements" on public.measurements;
create policy "Approved doctors insert measurements" on public.measurements
  for insert with check (
    public.is_approved_doctor()
    and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id())
  );

drop policy if exists "Doctors delete measurements" on public.measurements;
create policy "Approved doctors delete measurements" on public.measurements
  for delete using (
    public.is_approved_doctor()
    and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id())
  );

drop policy if exists "Doctors insert treatments" on public.treatments;
create policy "Approved doctors insert treatments" on public.treatments
  for insert with check (
    public.is_approved_doctor()
    and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id())
  );

drop policy if exists "Doctors delete treatments" on public.treatments;
create policy "Approved doctors delete treatments" on public.treatments
  for delete using (
    public.is_approved_doctor()
    and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id())
  );

-- Doctors can create clinics only if approved (or new registration)
drop policy if exists "Doctors can create clinics" on public.clinics;
create policy "Approved doctors can create clinics" on public.clinics
  for insert with check (public.get_my_role() in ('doctor', 'admin'));

-- ============================================
-- CRITICAL-4: Fix role CHECK constraint to allow 'deactivated'
-- ============================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('doctor', 'customer', 'admin', 'deactivated'));

-- ============================================
-- HIGH-2: Fix customer RLS to restrict to their children only
-- ============================================
create or replace function public.customer_can_view_patient(p_patient_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'customer'
      and (
        exists (
          select 1 from jsonb_array_elements(pr.children) as c
          where (c->>'patientId')::uuid = p_patient_id
        )
        or exists (
          select 1 from jsonb_array_elements(pr.children) as c, public.patients p
          where p.id = p_patient_id
            and p.name = c->>'name'
            and p.birth_date = (c->>'birthDate')::date
        )
      )
  )
$$;

drop policy if exists "Customers can view linked patients" on public.patients;
create policy "Customers can view own children patients" on public.patients
  for select using (
    clinic_id = public.get_my_clinic_id()
    or public.get_my_role() = 'admin'
    or public.customer_can_view_patient(id)
  );

-- Fix measurements and treatments customer access too
drop policy if exists "View measurements" on public.measurements;
create policy "View measurements" on public.measurements
  for select using (
    exists (
      select 1 from public.patients p
      where p.id = patient_id
      and (
        p.clinic_id = public.get_my_clinic_id()
        or public.get_my_role() = 'admin'
        or public.customer_can_view_patient(p.id)
      )
    )
  );

drop policy if exists "View treatments" on public.treatments;
create policy "View treatments" on public.treatments
  for select using (
    exists (
      select 1 from public.patients p
      where p.id = patient_id
      and (
        p.clinic_id = public.get_my_clinic_id()
        or public.get_my_role() = 'admin'
        or public.customer_can_view_patient(p.id)
      )
    )
  );

-- ============================================
-- HIGH-4: Fix audit log policies
-- ============================================
drop policy if exists "Users can view own audit logs" on public.audit_log;
drop policy if exists "Users can insert audit logs" on public.audit_log;

create policy "Users can view own audit logs" on public.audit_log
  for select using (user_id = auth.uid() or public.get_my_role() = 'admin');

create policy "Authenticated users can insert own audit logs" on public.audit_log
  for insert with check (user_id = auth.uid());
