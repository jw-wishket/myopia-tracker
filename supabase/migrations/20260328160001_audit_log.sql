create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_user on public.audit_log(user_id);

alter table public.audit_log enable row level security;

create policy "Users can view own audit logs" on public.audit_log for select using (true);
create policy "Users can insert audit logs" on public.audit_log for insert with check (true);
