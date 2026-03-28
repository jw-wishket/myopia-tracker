create table public.treatment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#7c3aed',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.treatment_types enable row level security;
create policy "Anyone can view treatment types" on public.treatment_types for select using (true);
create policy "Admin can manage treatment types" on public.treatment_types for insert with check (public.get_my_role() = 'admin');
create policy "Admin can update treatment types" on public.treatment_types for update using (public.get_my_role() = 'admin');
create policy "Admin can delete treatment types" on public.treatment_types for delete using (public.get_my_role() = 'admin');
-- Also allow doctors to insert (for custom types)
create policy "Doctors can add treatment types" on public.treatment_types for insert with check (public.get_my_role() = 'doctor');

-- Seed default treatment types
insert into public.treatment_types (name, color, sort_order) values
  ('아트로핀 0.01%', '#dc2626', 1),
  ('아트로핀 0.025%', '#ea580c', 2),
  ('아트로핀 0.05%', '#d97706', 3),
  ('아트로핀 0.1%', '#65a30d', 4),
  ('드림렌즈', '#059669', 5),
  ('마이사이트', '#0891b2', 6),
  ('PPSL', '#7c3aed', 7)
on conflict (name) do nothing;
