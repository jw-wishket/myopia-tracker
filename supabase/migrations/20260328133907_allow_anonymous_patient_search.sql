-- Allow anonymous (non-logged-in) users to search patients by name + birth_date
-- This enables the patient lookup feature on the login screen
create policy "Anonymous can search patients by name and birthdate"
  on public.patients for select
  using (true);

-- Allow anonymous to view measurements for searched patients
create policy "Anonymous can view measurements"
  on public.measurements for select
  using (true);

-- Allow anonymous to view treatments for searched patients
create policy "Anonymous can view treatments"
  on public.treatments for select
  using (true);
