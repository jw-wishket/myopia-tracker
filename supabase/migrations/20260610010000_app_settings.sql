-- app_settings: 전역 key/value 설정(관리자 관리). RLS: 활성 staff 읽기, admin 쓰기.
create table public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);
alter table public.app_settings enable row level security;
create policy "Staff read settings" on public.app_settings
  for select using (public.is_active_staff());
create policy "Admin insert settings" on public.app_settings
  for insert with check (public.is_admin());
create policy "Admin update settings" on public.app_settings
  for update using (public.is_admin());
-- 기본 예측 모드 = 추세 연장
insert into public.app_settings (key, value) values ('projection_mode', 'trend')
  on conflict (key) do nothing;
