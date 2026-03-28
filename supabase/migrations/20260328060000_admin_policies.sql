-- Allow admin to view all patients
create policy "Admin can view all patients" on public.patients for select using (public.get_my_role() = 'admin');

-- Allow admin to view all profiles
create policy "Admin can view all profiles" on public.profiles for select using (public.get_my_role() = 'admin');

-- Allow admin to update profiles (for revoking doctors)
create policy "Admin can update profiles" on public.profiles for update using (public.get_my_role() = 'admin');

-- Allow admin to manage clinics
create policy "Admin can create clinics" on public.clinics for insert with check (public.get_my_role() = 'admin');
create policy "Admin can update clinics" on public.clinics for update using (public.get_my_role() = 'admin');
create policy "Admin can delete clinics" on public.clinics for delete using (public.get_my_role() = 'admin');
