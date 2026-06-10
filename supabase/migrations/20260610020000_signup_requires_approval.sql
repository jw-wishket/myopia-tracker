-- ============================================================
-- 셀프 가입 + 관리자 승인
-- 최초 등록 계정만 관리자(is_admin) + 즉시 활성(is_active).
-- 그 외 신규 가입은 is_active=false(승인 대기) — 관리자가 활성화해야 사용 가능.
-- 미승인 계정은 RLS(is_active_staff)상 모든 의료 데이터 접근이 0이다.
-- CREATE OR REPLACE 라 기존 계정/데이터에는 영향 없음(신규 가입에만 적용).
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_is_first boolean;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'nurse');
  if v_role not in ('doctor','nurse') then
    v_role := 'nurse';  -- 클라이언트가 임의 role 자가지정 금지
  end if;
  -- 최초 등록 계정만 관리자 + 즉시 활성. 그 외는 승인 대기(비활성).
  v_is_first := (select count(*) from public.profiles) = 0;
  insert into public.profiles (id, email, name, role, is_admin, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    v_role,
    v_is_first,   -- is_admin: 최초 계정만
    v_is_first    -- is_active: 최초 계정만 즉시 활성, 그 외 관리자 승인 대기
  );
  return new;
end;
$$;
