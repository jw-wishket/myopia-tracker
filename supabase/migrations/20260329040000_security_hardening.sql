-- Fix search_path on all security definer functions

-- get_my_role
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- get_my_clinic_id
create or replace function public.get_my_clinic_id()
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select clinic_id from public.profiles where id = auth.uid()
$$;

-- is_approved_doctor
create or replace function public.is_approved_doctor()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'doctor' and approved = true
  )
$$;

-- customer_can_view_patient - tighter version with clinic restriction on fallback
create or replace function public.customer_can_view_patient(p_patient_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
      and pr.role = 'customer'
      and (
        -- Direct patientId link (most secure)
        exists (
          select 1 from jsonb_array_elements(pr.children) as c
          where (c->>'patientId')::uuid = p_patient_id
        )
        or
        -- Fallback: name+birthDate match, but only within customer's associated clinics
        exists (
          select 1 from jsonb_array_elements(pr.children) as c, public.patients p
          where p.id = p_patient_id
            and p.name = c->>'name'
            and p.birth_date = (c->>'birthDate')::date
            and (
              p.clinic_id = pr.clinic_id
              or p.clinic_id = (c->>'clinicId')::uuid
            )
        )
      )
  )
$$;

-- Fix clinic creation policy - require approved doctor or admin
drop policy if exists "Approved doctors can create clinics" on public.clinics;
create policy "Approved doctors or admin can create clinics" on public.clinics
  for insert with check (public.is_approved_doctor() or public.get_my_role() = 'admin');
