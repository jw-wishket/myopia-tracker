-- 1. Clinic soft delete
alter table public.clinics add column if not exists is_active boolean default true;

-- 2. Custom_ref uniqueness per clinic
create unique index if not exists idx_patients_custom_ref_unique
  on public.patients(clinic_id, custom_ref)
  where custom_ref is not null;
