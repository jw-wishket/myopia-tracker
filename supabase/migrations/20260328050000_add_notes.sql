create table public.notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  content text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index idx_notes_patient on public.notes(patient_id);

alter table public.notes enable row level security;

create policy "Doctors can view notes for own clinic patients" on public.notes
  for select using (
    exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id())
  );

create policy "Doctors can insert notes" on public.notes
  for insert with check (
    public.get_my_role() = 'doctor'
    and exists (select 1 from public.patients p where p.id = patient_id and p.clinic_id = public.get_my_clinic_id())
  );

create policy "Doctors can delete own notes" on public.notes
  for delete using (created_by = auth.uid());
