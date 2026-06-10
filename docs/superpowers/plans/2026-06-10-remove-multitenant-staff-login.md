# 멀티테넌트 제거 → 의사·간호사 단일 워크스페이스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip all multi-tenant (clinic) structure and the 보호자/익명조회/승인 flows, leaving a single shared-pool workspace where doctors and nurses sign up, log in, and manage the same patients — with the growth chart and records rendering correctly.

**Architecture:** Single Supabase schema rewrite (no `clinics`/`approval_requests`, no `clinic_id`). Roles are `doctor`/`nurse` (identical clinical CRUD) plus an `is_admin` capability flag; the first registered account auto-becomes admin. RLS reduces to `is_active_staff()` (read+write) and `is_admin()` (manage users/treatment types). Frontend drops the customer/pending/anonymous screens and clinic UI; everyone lands on the doctor dashboard, admins additionally see a 관리 entry point.

**Tech Stack:** Vanilla JS ESM + Vite 8, Tailwind 4, Chart.js 4.5, Supabase (Postgres + RLS + Auth), Vitest 3 (test runner, currently unused).

**Spec:** `docs/superpowers/specs/2026-06-10-remove-multitenant-staff-login-design.md`

**Branch:** `refactor/single-tenant-staff` (already created and checked out)

---

## Verification approach (read first)

This is a DOM + Supabase-RLS codebase with **no existing tests**. Per-task automated gate is **`npm run build`** (Vite) — it fails on any dangling import/reference, which is the dominant risk in a deletion refactor. Two genuine **Vitest** unit tests are added for the only pure logic worth locking (`routeForUser`, `toProfileJS`). Everything DB/UI is verified manually.

**⚠️ Schema gate:** All *runtime* acceptance (login, first-admin, shared pool, chart) is **blocked until Task 2 applies the new schema**. Tasks 1, 3–14 only require `npm run build` + unit tests to pass and can be done before the schema is live. Do **not** claim runtime criteria pass until Task 2 is done.

**Security note (do not "fix" by trusting the client):** A deactivated user is blocked by `is_active` *inside the RLS functions* (`is_active_staff()`/`is_admin()`), which is the real gate. The `getCurrentUser` client check is UX only.

---

## Task 1: New consolidated Supabase schema (migration file)

Replace the 12 multi-tenant migrations with one clean migration reflecting the single-tenant model. This task only writes/moves files; no DB or build impact.

**Files:**
- Create: `supabase/migrations/20260610000000_init_single_tenant.sql`
- Delete: all existing `supabase/migrations/*.sql` (12 files: `20260328022510_init_schema.sql` … `20260329040000_security_hardening.sql`)

- [ ] **Step 1: Remove the old migrations**

```bash
cd "C:/workspace/wishket/myopia-tracker"
git rm supabase/migrations/20260328022510_init_schema.sql \
  supabase/migrations/20260328050000_add_notes.sql \
  supabase/migrations/20260328060000_admin_policies.sql \
  supabase/migrations/20260328133907_allow_anonymous_patient_search.sql \
  supabase/migrations/20260328150000_add_custom_ref.sql \
  supabase/migrations/20260328160000_treatment_end_date.sql \
  supabase/migrations/20260328160001_audit_log.sql \
  supabase/migrations/20260328170000_follow_up.sql \
  supabase/migrations/20260329010000_treatment_types.sql \
  supabase/migrations/20260329020000_data_consistency.sql \
  supabase/migrations/20260329030000_security_fixes.sql \
  supabase/migrations/20260329040000_security_hardening.sql
```

- [ ] **Step 2: Write the new consolidated migration**

Create `supabase/migrations/20260610000000_init_single_tenant.sql`:

```sql
-- ============================================================
-- Myopia Tracker — Single-tenant (doctor/nurse) consolidated schema
-- Replaces all prior multi-tenant migrations.
-- Roles: doctor | nurse (identical clinical CRUD). is_admin = capability flag.
-- ============================================================

-- ---------- Tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text not null,
  role text not null check (role in ('doctor','nurse')),
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  reg_no text,
  name text not null,
  birth_date date not null,
  gender text not null check (gender in ('male','female')),
  custom_ref text,
  next_visit_date date,
  follow_up_months integer default 6,
  created_at timestamptz default now()
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  date date not null,
  age numeric(4,1),
  od_al numeric(5,2),
  os_al numeric(5,2),
  od_se numeric(5,2),
  os_se numeric(5,2),
  od_pct text,
  os_pct text,
  created_at timestamptz default now()
);

create table public.treatments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  type text not null,
  date date not null,
  age numeric(4,1),
  end_date date,
  created_at timestamptz default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  content text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table public.treatment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#7c3aed',
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ---------- Indexes ----------
create index idx_measurements_patient on public.measurements(patient_id);
create index idx_treatments_patient on public.treatments(patient_id);
create index idx_notes_patient on public.notes(patient_id);
create index idx_profiles_role on public.profiles(role);
create unique index idx_patients_custom_ref_unique
  on public.patients(custom_ref) where custom_ref is not null;
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_user on public.audit_log(user_id);

-- ---------- RLS enable ----------
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.measurements enable row level security;
alter table public.treatments enable row level security;
alter table public.notes enable row level security;
alter table public.treatment_types enable row level security;
alter table public.audit_log enable row level security;

-- ---------- Helper functions (all security definer, search_path='') ----------
create or replace function public.get_my_role()
returns text language sql security definer stable set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_active_staff()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('doctor','nurse') and is_active = true
  )
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true and is_active = true
  )
$$;

-- ---------- Profiles policies ----------
-- A user can always read their own row (so the client can detect deactivation);
-- active staff can read all rows (for the admin user-management list).
create policy "View profiles" on public.profiles
  for select using (id = auth.uid() or public.is_active_staff());
create policy "Insert own profile" on public.profiles
  for insert with check (id = auth.uid());
create policy "Update own profile" on public.profiles
  for update using (id = auth.uid());
create policy "Admins update any profile" on public.profiles
  for update using (public.is_admin());

-- SECURITY-CRITICAL: profiles UPDATE policies have no column-level restriction,
-- so this trigger is the ONLY thing preventing a non-admin from self-granting
-- is_admin / reactivating themselves / changing their role. Non-admin callers
-- get privileged columns reverted to their prior values; admins may change them.
create or replace function public.guard_profile_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_admin := old.is_admin;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;
create trigger guard_profile_changes_trg
  before update on public.profiles
  for each row execute function public.guard_profile_changes();

-- ---------- Patients policies (shared pool: any active staff, full CRUD) ----------
create policy "Staff view patients" on public.patients
  for select using (public.is_active_staff());
create policy "Staff insert patients" on public.patients
  for insert with check (public.is_active_staff());
create policy "Staff update patients" on public.patients
  for update using (public.is_active_staff());
create policy "Staff delete patients" on public.patients
  for delete using (public.is_active_staff());

-- ---------- Measurements policies ----------
create policy "Staff view measurements" on public.measurements
  for select using (public.is_active_staff());
create policy "Staff insert measurements" on public.measurements
  for insert with check (public.is_active_staff());
create policy "Staff update measurements" on public.measurements
  for update using (public.is_active_staff());
create policy "Staff delete measurements" on public.measurements
  for delete using (public.is_active_staff());

-- ---------- Treatments policies ----------
create policy "Staff view treatments" on public.treatments
  for select using (public.is_active_staff());
create policy "Staff insert treatments" on public.treatments
  for insert with check (public.is_active_staff());
create policy "Staff update treatments" on public.treatments
  for update using (public.is_active_staff());
create policy "Staff delete treatments" on public.treatments
  for delete using (public.is_active_staff());

-- ---------- Notes policies ----------
-- DELIBERATE DECISION: unlike patients/measurements/treatments (shared-pool delete),
-- a note may only be deleted by its author or an admin — clinical notes are personal.
create policy "Staff view notes" on public.notes
  for select using (public.is_active_staff());
create policy "Staff insert notes" on public.notes
  for insert with check (public.is_active_staff() and created_by = auth.uid());
create policy "Delete own notes or admin" on public.notes
  for delete using (created_by = auth.uid() or public.is_admin());

-- ---------- Treatment types policies ----------
create policy "Staff view treatment types" on public.treatment_types
  for select using (public.is_active_staff());
create policy "Staff add treatment types" on public.treatment_types
  for insert with check (public.is_active_staff());
create policy "Admin update treatment types" on public.treatment_types
  for update using (public.is_admin());
create policy "Admin delete treatment types" on public.treatment_types
  for delete using (public.is_admin());

-- ---------- Audit log policies ----------
create policy "Staff insert audit" on public.audit_log
  for insert with check (public.is_active_staff() and user_id = auth.uid());
create policy "Admin view audit" on public.audit_log
  for select using (public.is_admin());

-- ---------- Seed default treatment types ----------
insert into public.treatment_types (name, color, sort_order) values
  ('아트로핀 0.01%', '#dc2626', 1),
  ('아트로핀 0.025%', '#ea580c', 2),
  ('아트로핀 0.05%', '#d97706', 3),
  ('아트로핀 0.1%', '#65a30d', 4),
  ('드림렌즈', '#059669', 5),
  ('마이사이트', '#0891b2', 6),
  ('PPSL', '#7c3aed', 7)
on conflict (name) do nothing;

-- ---------- Auto-create profile on signup; FIRST account becomes admin ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
  v_is_admin boolean;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'nurse');
  if v_role not in ('doctor','nurse') then
    v_role := 'nurse';  -- never allow client to self-assign anything else
  end if;
  -- First registered account auto-becomes admin (typically the doctor).
  v_is_admin := (select count(*) from public.profiles) = 0;
  insert into public.profiles (id, email, name, role, is_admin, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    v_role,
    v_is_admin,
    true
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3: Commit**

```bash
cd "C:/workspace/wishket/myopia-tracker"
git add supabase/migrations
git commit -m "feat(db): consolidated single-tenant schema (doctor/nurse, is_admin, shared pool)"
```

---

## Task 2: Apply the new schema (EXPLICIT GATE — blocks all runtime acceptance)

This is a real step, not a footnote. Replacing migration files and running `db push` against an already-migrated linked project **will fail on history mismatch**. Pick ONE mechanism. This likely requires the user (credentials / Docker / dashboard). **Pause and confirm with the user before assuming it's done.**

**Option A — Local reset (needs Docker Desktop, which is on PATH):**
```bash
cd "C:/workspace/wishket/myopia-tracker"
npx supabase start
npx supabase db reset   # drops local DB, replays the single migration
```
Then point `.env` `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` at the local stack (`npx supabase status` prints them).

**Option B — Fresh cloud project (recommended for a shared test):**
1. Create a new Supabase project in the dashboard.
2. `npx supabase link --project-ref <new-ref>`
3. `echo "y" | npx supabase db push`
4. Update `.env` and Vercel env vars with the new project URL + anon key.

**Option C — Wipe & re-push existing project:** In the dashboard SQL editor, drop the old objects (or reset the project), clear `supabase_migrations.schema_migrations`, then `db push`. Only if A/B aren't viable.

**Supabase Auth config (either option):** Dashboard → Authentication → Providers → Email → **disable "Confirm email"** so 가입 즉시 로그인 works for testing.

- [ ] **Step 1:** Decide mechanism with the user; apply schema.
- [ ] **Step 2:** Disable email confirmation in Auth settings.
- [ ] **Step 3:** Verify in dashboard: tables `profiles, patients, measurements, treatments, notes, treatment_types, audit_log` exist; `clinics`/`approval_requests` do **not**; 7 treatment_types rows seeded.
- [ ] **Step 4 (guard-trigger acceptance — security critical):** In the SQL editor, after two test users exist (do this during Task 15 manual pass), confirm: a non-admin `update profiles set is_admin=true where id=auth.uid()` leaves `is_admin=false`; an admin updating another user's `is_admin`/`is_active` persists. Document the result.

No commit (environment action).

---

## Task 3: `helpers.js` — profile mapping + unit test

**Files:**
- Modify: `src/data/services/helpers.js` (`toPatientJS`, `toProfileJS`)
- Create: `src/data/services/helpers.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/data/services/helpers.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { toProfileJS } from './helpers.js';

describe('toProfileJS', () => {
  it('maps role, is_admin, is_active and omits removed tenant fields', () => {
    const row = { id: 'u1', email: 'a@b.com', name: '김의사', role: 'doctor', is_admin: true, is_active: true };
    const p = toProfileJS(row);
    expect(p).toEqual({ id: 'u1', email: 'a@b.com', name: '김의사', role: 'doctor', isAdmin: true, isActive: true });
    expect('clinicId' in p).toBe(false);
    expect('children' in p).toBe(false);
  });

  it('defaults is_admin/is_active sanely when missing', () => {
    const p = toProfileJS({ id: 'u2', name: 'n', role: 'nurse' });
    expect(p.isAdmin).toBe(false);
    expect(p.isActive).toBe(true);
  });
});
```

- [ ] **Step 2: Run it — expect FAIL**

Run: `npm test -- helpers`
Expected: FAIL (current `toProfileJS` returns `approved`/`clinicId`/`children`, no `isAdmin`).

- [ ] **Step 3: Implement**

In `src/data/services/helpers.js`, replace `toProfileJS` (lines 42–53) with:

```js
export function toProfileJS(p) {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    role: p.role,
    isAdmin: p.is_admin ?? false,
    isActive: p.is_active ?? true,
  };
}
```

Also in `toPatientJS` (lines 8–40), delete the `clinicId: p.clinic_id,` line (clinic is gone).

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- helpers`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/services/helpers.js src/data/services/helpers.test.js
git commit -m "refactor(helpers): map isAdmin/isActive, drop clinic/children/approved"
```

---

## Task 4: `auth.js` — getCurrentUser / updateProfile

**Files:**
- Modify: `src/data/services/auth.js`

- [ ] **Step 1: Replace `getCurrentUser` (lines 23–44)** with:

```js
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return null;
  if (profile.is_active === false) return null; // UX gate; real gate is RLS is_active_staff()

  return toProfileJS(profile);
}
```

- [ ] **Step 2: Replace `updateProfile` (lines 56–90)** with a name-only updater (children/clinic removed):

```js
export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (Object.keys(dbUpdates).length === 0) return true;
  const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
  if (error) { console.error('updateProfile error:', error); return false; }
  return true;
}
```

`registerWithEmail`, `loginWithEmail`, `logout`, `resetPassword`, `changePassword`, `resetData` are unchanged.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/data/services/auth.js
git commit -m "refactor(auth): drop clinic/pending/children; block on is_active"
```

---

## Task 5: Routing helper + `main.js` + unit test

**Files:**
- Create: `src/routing.js`
- Create: `src/routing.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Write the failing test**

Create `src/routing.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { routeForUser } from './routing.js';

describe('routeForUser', () => {
  it('routes admins to admin', () => {
    expect(routeForUser({ role: 'doctor', isAdmin: true })).toBe('admin');
  });
  it('routes non-admin doctor and nurse to doctor', () => {
    expect(routeForUser({ role: 'doctor', isAdmin: false })).toBe('doctor');
    expect(routeForUser({ role: 'nurse', isAdmin: false })).toBe('doctor');
  });
  it('defaults null/undefined user to login', () => {
    expect(routeForUser(null)).toBe('login');
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`routing.js` missing)

Run: `npm test -- routing`
Expected: FAIL.

- [ ] **Step 3: Create `src/routing.js`**

```js
// Pure routing decision: which screen a logged-in user lands on.
export function routeForUser(user) {
  if (!user) return 'login';
  return user.isAdmin ? 'admin' : 'doctor';
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- routing`
Expected: PASS (3 tests).

- [ ] **Step 5: Rewrite `src/main.js`** to remove customer/pending/patient-result and route via `routeForUser`:

```js
import './style.css';
import { registerRoute, startRouter, navigate } from './router.js';
import { getCurrentUser } from './data/dataService.js';
import { getState, setState } from './state.js';
import { routeForUser } from './routing.js';

// Lazy screen loaders
const screens = {
  login: () => import('./screens/loginScreen.js').then(m => m.renderLoginScreen),
  doctor: () => import('./screens/doctorScreen.js').then(m => m.renderDoctorScreen),
  admin: () => import('./screens/adminScreen.js').then(m => m.renderAdminScreen),
  register: () => import('./screens/registerScreen.js').then(m => m.renderRegisterScreen),
};

function lazyRoute(screenKey) {
  return async (container) => {
    const renderFn = await screens[screenKey]();
    return renderFn(container);
  };
}

// Public routes
registerRoute('login', lazyRoute('login'));
registerRoute('register', lazyRoute('register'));

// Auth-guarded routes
function authGuard(renderFn) {
  return async (container) => {
    const user = getState().currentUser;
    if (!user) { navigate('login'); return; }
    return await renderFn(container);
  };
}

function adminGuard(renderFn) {
  return async (container) => {
    const user = getState().currentUser;
    if (!user) { navigate('login'); return; }
    if (!user.isAdmin) { navigate('doctor'); return; }
    return await renderFn(container);
  };
}

registerRoute('doctor', authGuard(lazyRoute('doctor')));
registerRoute('admin', adminGuard(lazyRoute('admin')));

// Restore session
(async () => {
  const user = await getCurrentUser();
  if (user) {
    setState({ currentUser: user });
    window.location.hash = routeForUser(user);
  }
  startRouter(document.getElementById('app'));
  document.getElementById('loadingOverlay')?.classList.add('hidden');
})();
```

- [ ] **Step 6: Build + test**

Run: `npm run build && npm test`
Expected: build success; all unit tests pass. (`customerScreen.js`/`pendingScreen.js` still exist on disk but are now unreferenced → not bundled. They are deleted in Task 14.)

- [ ] **Step 7: Commit**

```bash
git add src/routing.js src/routing.test.js src/main.js
git commit -m "refactor(routing): drop customer/pending/anon routes; route by isAdmin"
```

---

## Task 6: `loginScreen.js` — two tabs, no clinic/search

**Files:**
- Modify: `src/screens/loginScreen.js`

- [ ] **Step 1: Replace the imports (lines 1–4)** with:

```js
import { renderNavbar } from '../components/navbar.js';
import { loginWithEmail, resetPassword } from '../data/dataService.js';
import { setState } from '../state.js';
import { navigate } from '../router.js';
import { routeForUser } from '../routing.js';
```

- [ ] **Step 2: Remove the entire `환자조회` (search) tab.** In the returned template:
  - Delete the `data-tab="search"` button (line 28) so only `로그인` and `회원가입` tabs remain. Make the `로그인` tab the default-active one (give it the active classes `text-primary-600 bg-primary-50 border-b-2 border-primary-600` and remove `hidden` from `#tab-login`; add `hidden` is not needed since it's first/default).
  - Delete the whole `<!-- Search Tab -->` block (`#tab-search`, lines 34–63).
  - Delete the `getClinics()` call (lines 12–13) and the `clinicOptions` variable.

- [ ] **Step 3: Remove the search handlers.** Delete the search Enter-key binding (lines 123–125) and the entire `#searchBtn` click handler (lines 128–163), plus the module-level `lastSearchTime`/`SEARCH_COOLDOWN` (lines 8–9).

- [ ] **Step 4: Update the login routing.** In the `#loginBtn` handler, replace the route computation (line 184):

```js
      const user = await loginWithEmail(email, password);
      setState({ currentUser: user });
      navigate(routeForUser(user));
```

Keep the existing Korean error mapping. The `회원가입` tab still sets `pendingRegistration` and `navigate('register')` (unchanged).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/screens/loginScreen.js
git commit -m "refactor(login): remove clinic/anon-search; login + register tabs only"
```

---

## Task 7: `registerScreen.js` — single-step doctor/nurse

Collapse the 3-step wizard (clinic + children + pending) into one screen: pick 의사/간호사 + 이름 → 가입 완료 → 로그인.

**Files:**
- Replace entire file: `src/screens/registerScreen.js`

- [ ] **Step 1: Replace the whole file** with:

```js
import { renderNavbar } from '../components/navbar.js';
import { navigate } from '../router.js';
import { registerWithEmail } from '../data/dataService.js';
import { pendingRegistration } from './loginScreen.js';

let selectedRole = 'doctor';

export async function renderRegisterScreen(container) {
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '회원가입', showBack: true, backTarget: 'login' });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-lg mx-auto p-4 sm:p-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 class="text-lg font-semibold text-slate-800 mb-2">계정 유형</h3>
        <p class="text-sm text-slate-500 mb-5">의료진 유형을 선택하고 이름을 입력하세요</p>
        <div class="grid grid-cols-2 gap-4 mb-5">
          <label class="cursor-pointer">
            <input type="radio" name="regRole" value="doctor" class="sr-only peer" ${selectedRole === 'doctor' ? 'checked' : ''}>
            <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
              <div class="text-3xl mb-2">🩺</div>
              <div class="font-medium text-slate-800">의사</div>
              <div class="text-xs text-slate-500 mt-1">환자 데이터 관리</div>
            </div>
          </label>
          <label class="cursor-pointer">
            <input type="radio" name="regRole" value="nurse" class="sr-only peer" ${selectedRole === 'nurse' ? 'checked' : ''}>
            <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
              <div class="text-3xl mb-2">💉</div>
              <div class="font-medium text-slate-800">간호사</div>
              <div class="text-xs text-slate-500 mt-1">환자 데이터 관리</div>
            </div>
          </label>
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium text-slate-600 mb-1.5">이름</label>
          <input type="text" id="regName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="홍길동">
        </div>
        <div class="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 mb-3">최초 가입 계정은 자동으로 관리자 권한을 갖습니다.</div>
        <div id="regError" class="hidden text-sm text-red-500 text-center mb-3"></div>
        <button id="regComplete" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">가입 완료</button>
      </div>
    </main>
  `;

  nav.bind(container);

  container.querySelectorAll('input[name="regRole"]').forEach(r => {
    r.addEventListener('change', () => { selectedRole = r.value; });
  });

  container.querySelector('#regComplete').addEventListener('click', async () => {
    const errEl = container.querySelector('#regError');
    errEl.classList.add('hidden');
    const name = container.querySelector('#regName').value.trim();

    if (!pendingRegistration.email || !pendingRegistration.password) {
      errEl.textContent = '회원가입 정보가 없습니다. 처음부터 다시 시도해주세요.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!name) {
      errEl.textContent = '이름을 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }

    try {
      await registerWithEmail(pendingRegistration.email, pendingRegistration.password, {
        name,
        role: selectedRole,
      });
      pendingRegistration.email = '';
      pendingRegistration.password = '';
      selectedRole = 'doctor';
      navigate('login');
    } catch (err) {
      errEl.textContent = err.message || '회원가입에 실패했습니다';
      errEl.classList.remove('hidden');
    }
  });
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success (no longer imports `getClinics`/`createClinic`).

- [ ] **Step 3: Commit**

```bash
git add src/screens/registerScreen.js
git commit -m "refactor(register): single-step doctor/nurse signup, drop clinic/children/pending"
```

---

## Task 8: `navbar.js` — drop clinic name, add 관리 link for admins

**Files:**
- Modify: `src/components/navbar.js`

- [ ] **Step 1: Replace the `userBadge` block (lines 9–21)** with a version that drops `clinicName` and adds an admin-only 관리 button:

```js
  const adminLink = user && user.isAdmin ? `
    <button id="navAdminBtn" class="hidden sm:inline-flex text-xs font-medium text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors">관리</button>
  ` : '';

  const userBadge = user ? `
    <div class="flex items-center gap-3">
      ${adminLink}
      <div class="hidden sm:flex items-center gap-2 text-sm text-slate-600">
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-semibold">
          ${user.name?.charAt(0) || '?'}
        </div>
        <span>${user.name}${user.role === 'nurse' ? ' · 간호사' : ''}</span>
      </div>
      <button id="navLogoutBtn" class="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors" title="로그아웃">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
      </button>
    </div>
  ` : '';
```

- [ ] **Step 2: Wire the 관리 button in `bind()`.** Add inside `bind(container)` (after the logout handler, before the closing brace of `bind`):

```js
      const adminBtn = container.querySelector('#navAdminBtn');
      if (adminBtn) {
        adminBtn.addEventListener('click', () => navigate('admin'));
      }
```

`navigate` is already imported at the top of the file.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/components/navbar.js
git commit -m "refactor(navbar): drop clinic name; add admin-only 관리 link"
```

---

## Task 9: `patients.js` — drop clinic scoping, remove anon RPC

All clinic filtering goes away (shared pool); duplicate/uniqueness checks become global; the anonymous `searchPatientByInfo` is removed. Function **signatures keep the `clinicId` param** (now ignored) so existing callers don't break before Task 12 cleans them up.

**Files:**
- Modify: `src/data/services/patients.js`

- [ ] **Step 1: Replace clinic-scoped query bodies.** Apply these edits:

`getPatients` (lines 6–12) → drop the clinic filter:
```js
export async function getPatients() {
  const { data, error } = await supabase.from('patients').select('*').order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}
```

`getRecentPatients` (lines 14–66) → no clinic pre-filter:
```js
export async function getRecentPatients(_clinicId, limit = 10) {
  const { data: recentMeasurements } = await supabase
    .from('measurements')
    .select('patient_id, date')
    .order('date', { ascending: false });

  if (!recentMeasurements || recentMeasurements.length === 0) {
    const { data } = await supabase.from('patients').select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!data || data.length === 0) return [];
    const fullPatients = await Promise.all(data.map(p => fetchPatientFull(p)));
    for (const fp of fullPatients) setCachedPatient(fp.id, fp);
    return fullPatients;
  }

  const seen = new Set();
  const recentIds = [];
  for (const m of recentMeasurements) {
    if (!seen.has(m.patient_id)) {
      seen.add(m.patient_id);
      recentIds.push(m.patient_id);
      if (recentIds.length >= limit) break;
    }
  }

  const { data } = await supabase.from('patients').select('*').in('id', recentIds);
  if (!data) return [];
  const patientMap = {};
  data.forEach(p => { patientMap[p.id] = p; });
  const orderedRows = recentIds.map(id => patientMap[id]).filter(Boolean);
  const fullPatients = await Promise.all(orderedRows.map(p => fetchPatientFull(p)));
  for (const fp of fullPatients) setCachedPatient(fp.id, fp);
  return fullPatients;
}
```

`searchPatientsLight` (lines 68–78) → drop `.eq('clinic_id', …)`:
```js
export async function searchPatientsLight(query, _clinicId) {
  const { data } = await supabase.from('patients').select('id, name, birth_date, gender, custom_ref')
    .or(`name.ilike.%${escapeLike(query)}%,custom_ref.ilike.%${escapeLike(query)}%`)
    .order('name')
    .limit(20);
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    gender: p.gender, customRef: p.custom_ref,
  }));
}
```

`getPatientCount` (lines 80–83):
```js
export async function getPatientCount(_clinicId) {
  const { count } = await supabase.from('patients').select('id', { count: 'exact', head: true });
  return count || 0;
}
```

`searchPatients` (lines 96–102) → drop clinic filter:
```js
export async function searchPatients(query, _clinicId) {
  const { data, error } = await supabase.from('patients').select('*')
    .or(`name.ilike.%${escapeLike(query)}%,custom_ref.ilike.%${escapeLike(query)}%`)
    .order('name');
  if (error || !data) return [];
  return Promise.all(data.map(p => fetchPatientFull(p)));
}
```

`getOverduePatients` (lines 207–218):
```js
export async function getOverduePatients(_clinicId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('patients')
    .select('*')
    .lt('next_visit_date', today)
    .order('next_visit_date');
  return (data || []).map(p => ({
    id: p.id, name: p.name, birthDate: p.birth_date,
    nextVisitDate: p.next_visit_date, customRef: p.custom_ref,
  }));
}
```

`exportClinicData` (lines 220–234) → call `getPatients()` with no arg (rest of body unchanged):
```js
export async function exportClinicData() {
  const patients = await getPatients();
  // ...rest of the function body is unchanged...
```

- [ ] **Step 2: Delete `searchPatientByInfo` entirely** (lines 104–134). It used the removed `search_patient_public` RPC and is no longer imported anywhere (loginScreen handled in Task 6; customerScreen deleted in Task 14).

- [ ] **Step 3: Make `addPatient` global (lines 136–170).** Replace with:

```js
export async function addPatient(patient) {
  // Duplicate name + birth_date (global)
  const { data: existing } = await supabase.from('patients')
    .select('id')
    .eq('name', patient.name)
    .eq('birth_date', patient.birthDate);
  if (existing && existing.length > 0) {
    return { error: '같은 이름과 생년월일의 환자가 이미 등록되어 있습니다.' };
  }
  // Duplicate custom_ref (global)
  if (patient.customRef) {
    const { data: existingRef } = await supabase.from('patients')
      .select('id')
      .eq('custom_ref', patient.customRef);
    if (existingRef && existingRef.length > 0) {
      return { error: '같은 관리번호가 이미 사용 중입니다.' };
    }
  }

  const regNo = 'P-' + Date.now();
  const { data, error } = await supabase.from('patients').insert({
    name: patient.name,
    birth_date: patient.birthDate,
    gender: patient.gender,
    reg_no: regNo,
    custom_ref: patient.customRef || null,
  }).select().single();
  if (error) { console.error('addPatient error:', error); return null; }
  await logAudit('create', 'patient', data.id);
  return toPatientJS(data, [], []);
}
```

- [ ] **Step 4: Make `updatePatient` custom_ref check global (lines 178–192).** Replace the uniqueness block at the top of `updatePatient` with:

```js
  if (updates.customRef !== undefined && updates.customRef) {
    const { data: existing } = await supabase.from('patients')
      .select('id')
      .eq('custom_ref', updates.customRef)
      .neq('id', id);
    if (existing && existing.length > 0) {
      return { error: '같은 관리번호가 이미 사용 중입니다.' };
    }
  }
```

The `dbUpdates` mapping and the rest of `updatePatient` are unchanged.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add src/data/services/patients.js
git commit -m "refactor(patients): shared-pool queries, global uniqueness, drop anon search"
```

---

## Task 10: `admin.js` + `adminScreen.js` — user management & treatment types

Done together because the barrel re-exports `admin.js` and `adminScreen.js` is bundled — splitting them would break the build between commits.

**Files:**
- Replace: `src/data/services/admin.js`
- Modify: `src/screens/adminScreen.js`

- [ ] **Step 1: Replace `src/data/services/admin.js`** with the simplified user-management API:

```js
import { supabase } from '../supabaseClient.js';
import { logAudit } from './helpers.js';

export async function getStats() {
  const [patients, staff] = await Promise.all([
    supabase.from('patients').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);
  return {
    totalPatients: patients.count || 0,
    totalStaff: staff.count || 0,
  };
}

// All doctor/nurse accounts for the user-management list.
export async function getUsers() {
  const { data } = await supabase.from('profiles').select('*').order('created_at');
  return (data || []).map(u => ({
    id: u.id, email: u.email, name: u.name, role: u.role,
    isAdmin: u.is_admin, isActive: u.is_active, createdAt: u.created_at,
  }));
}

export async function setUserAdmin(userId, isAdmin) {
  const { error } = await supabase.from('profiles').update({ is_admin: isAdmin }).eq('id', userId);
  if (error) { console.error('setUserAdmin error:', error); return false; }
  await logAudit(isAdmin ? 'grant_admin' : 'revoke_admin', 'user', userId);
  return true;
}

export async function setUserActive(userId, isActive) {
  const { error } = await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) { console.error('setUserActive error:', error); return false; }
  await logAudit(isActive ? 'activate' : 'deactivate', 'user', userId);
  return true;
}
```

- [ ] **Step 2: Rewrite `src/screens/adminScreen.js`** to two tabs (사용자 / 치료종류). Replace the imports (lines 3–8) with:

```js
import {
  getStats, getUsers, setUserAdmin, setUserActive,
  getTreatmentTypes, addTreatmentType, deleteTreatmentType,
} from '../data/dataService.js';
```

Set `let activeTab = 'users';` (was `'approvals'`).

Replace `renderAdminScreen` data load (lines 22–24) with:
```js
  const [stats, users, treatmentTypes] = await Promise.all([
    getStats(), getUsers(), getTreatmentTypes(),
  ]);
```

Replace the stat cards + tab bar + tab content (lines 31–52) with:
```js
      <div class="grid grid-cols-2 gap-4">
        ${statCard('전체 환자', stats.totalPatients + '명')}
        ${statCard('의료진', stats.totalStaff + '명')}
      </div>

      <div class="flex gap-2 border-b border-slate-200 overflow-x-auto">
        ${tabBtn('users', '사용자')}
        ${tabBtn('treatments', '치료종류')}
      </div>

      <div id="adminTabContent">
        ${activeTab === 'treatments' ? renderTreatmentTypesTab(treatmentTypes) : renderUsers(users, user)}
      </div>
```

Update `statCard` to drop the unused `color` param (signature `statCard(label, value)`), and `tabBtn` may keep its signature.

Delete these now-unused functions and their event handlers: `renderApprovals`, `renderClinics`, `renderDoctors`, `renderPatientsList`, and all approval/clinic/revoke/deactivate handlers (lines 66–169 in the original). Replace the user-related handlers with admin/active toggles (below). Keep the treatment-type add/delete handlers (lines 171–202) and `renderTreatmentTypesTab` (lines 360–394) and `safeColor` unchanged.

Add a new `renderUsers` function:
```js
function renderUsers(users, me) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-slate-200">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">이름</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">이메일</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">유형</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">상태</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">관리</th>
        </tr></thead>
        <tbody>
          ${users.length === 0 ? '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-400">등록된 사용자가 없습니다</td></tr>' :
            users.map(u => {
              const isSelf = u.id === me.id;
              return `
              <tr class="border-b border-slate-100 hover:bg-slate-50 ${u.isActive ? '' : 'opacity-50'}">
                <td class="px-4 py-3 text-sm text-slate-800 font-medium">${escapeHtml(u.name) || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(u.email) || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">
                  ${u.role === 'doctor' ? '의사' : '간호사'}${u.isAdmin ? ' <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">관리자</span>' : ''}
                </td>
                <td class="px-4 py-3 text-sm">
                  ${u.isActive
                    ? '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">활성</span>'
                    : '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">비활성</span>'}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-1">
                    ${isSelf ? '' : `
                      <button class="toggle-admin-btn px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${u.isAdmin ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-primary-600 border-primary-200 hover:bg-primary-50'}" data-id="${u.id}" data-admin="${u.isAdmin ? '1' : '0'}">${u.isAdmin ? '관리자 해제' : '관리자 지정'}</button>
                      <button class="toggle-active-btn px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${u.isActive ? 'text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}" data-id="${u.id}" data-active="${u.isActive ? '1' : '0'}">${u.isActive ? '비활성화' : '활성화'}</button>
                    `}
                  </div>
                </td>
              </tr>`;
            }).join('')}
        </tbody>
      </table>
    </div>
  `;
}
```

Add the user toggle handlers (inside `renderAdminScreen`, replacing the deleted approval/clinic handlers):
```js
  container.querySelectorAll('.toggle-admin-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const makeAdmin = btn.dataset.admin !== '1';
      if (!confirm(makeAdmin ? '이 사용자에게 관리자 권한을 부여하시겠습니까?' : '이 사용자의 관리자 권한을 해제하시겠습니까?')) return;
      await setUserAdmin(btn.dataset.id, makeAdmin);
      await renderAdminScreen(container);
    });
  });
  container.querySelectorAll('.toggle-active-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const activate = btn.dataset.active !== '1';
      if (!confirm(activate ? '이 계정을 활성화하시겠습니까?' : '이 계정을 비활성화하시겠습니까? 해당 사용자는 로그인할 수 없습니다.')) return;
      await setUserActive(btn.dataset.id, activate);
      await renderAdminScreen(container);
    });
  });
```

(The admin cannot toggle their own row — `isSelf` hides the buttons — preventing an admin from accidentally locking themselves out. This also keeps at least the acting admin active.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success (no imports of `getApprovalRequests`/`getClinics`/`getDoctors`/`getAllPatients`/`adminCreateClinic`/`updateClinic`/`deleteClinic`/`revokeDoctor`/`deactivateUser`/`updateTreatmentType` remain).

- [ ] **Step 4: Commit**

```bash
git add src/data/services/admin.js src/screens/adminScreen.js
git commit -m "refactor(admin): user management (admin/active toggles) + treatment types only"
```

---

## Task 11: `doctorScreen.js` — drop clinic context, support nurse

**Files:**
- Modify: `src/screens/doctorScreen.js`

- [ ] **Step 1:** In `renderNavbar(...)` calls (lines 38 and 84), change `subtitle: user.clinicName` → `subtitle: ''`. (Both calls.)

- [ ] **Step 2:** Replace the clinic-scoped service calls (they now ignore the arg, but drop it for clarity):
  - line 56: `searchPatientsLight(currentSearchQuery, user.clinicId)` → `searchPatientsLight(currentSearchQuery)`
  - line 61: `getRecentPatients(user.clinicId, 10)` → `getRecentPatients(undefined, 10)`
  - line 63: `getPatientCount(user.clinicId)` → `getPatientCount()`
  - line 79: `getOverduePatients(user.clinicId)` → `getOverduePatients()`

- [ ] **Step 3:** Fix the full-export handler (lines 598–613). Replace with:
```js
  const exportAllBtn = container.querySelector('#exportAllBtn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', async () => {
      exportAllBtn.textContent = '내보내는 중...';
      exportAllBtn.disabled = true;
      const csv = await exportClinicData();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `전체데이터.csv`;
      link.click();
      exportAllBtn.textContent = '전체 내보내기';
      exportAllBtn.disabled = false;
    });
  }
```

`openAddPatientModal(container, user, rerender)` still passes `user`; the modal is fixed in Task 12. No other `user.clinic*` references remain in this file.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/screens/doctorScreen.js
git commit -m "refactor(doctor): drop clinic context; usable by doctor and nurse"
```

---

## Task 12: `doctor/modals.js` — addPatient without clinic

**Files:**
- Modify: `src/screens/doctor/modals.js`

- [ ] **Step 1:** In `openAddPatientModal`'s confirm handler (line 48), replace:
```js
    const result = await addPatient({ name, birthDate, gender, customRef });
```
(removing `clinicId: user.clinicId`). The `user` param stays in the signature (harmless) but is no longer used for clinic.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/screens/doctor/modals.js
git commit -m "refactor(modals): add patient without clinic_id"
```

---

## Task 13: Delete dead files + clean the service barrel

**Files:**
- Delete: `src/screens/customerScreen.js`, `src/screens/pendingScreen.js`, `src/data/services/clinics.js`, `src/data/mockData.js`
- Modify: `src/data/dataService.js`

- [ ] **Step 1: Remove the clinics re-export.** In `src/data/dataService.js` delete line 5 (`export * from './services/clinics.js';`). Final file:
```js
export * from './services/auth.js';
export * from './services/patients.js';
export * from './services/measurements.js';
export * from './services/treatments.js';
export * from './services/admin.js';
export * from './services/notes.js';
```

- [ ] **Step 2: Delete the dead files**
```bash
cd "C:/workspace/wishket/myopia-tracker"
git rm src/screens/customerScreen.js src/screens/pendingScreen.js src/data/services/clinics.js src/data/mockData.js
```

- [ ] **Step 3: Verify nothing references removed symbols.** Expect **no matches**:

Run (Grep tool, or):
```bash
git grep -nE "clinic|customer|pending|searchPatientByInfo|approval|getClinics|getDoctors|getAllPatients|children" -- src/
```
Expected: no results except incidental words. If anything in `src/` still imports a removed function or screen, fix it before continuing. (Known-safe leftover: none — all callers handled in Tasks 4–12.)

- [ ] **Step 4: Build + unit tests**

Run: `npm run build && npm test`
Expected: build success; all unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete customer/pending/clinic/mock dead code; clean service barrel"
```

---

## Task 14: Update project docs (CLAUDE.md)

The root `CLAUDE.md` describes the old multi-tenant model; update the parts that now mislead.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** Update these sections to match the new model (keep edits surgical):
  - 프로젝트 개요: replace "멀티 테넌트 (여러 안과)…" line with single-tenant doctor/nurse shared workspace.
  - 사용자 역할: replace doctor/customer/admin/비로그인 list with **의사/간호사 (동일 진료 권한)** + **관리자(is_admin 플래그, 최초 가입 자동 부여)**; remove 보호자 and 비로그인 익명조회.
  - 데이터 모델: "9개 테이블 … 12개 마이그레이션" → 7 tables (profiles, patients, measurements, treatments, notes, treatment_types, audit_log), 1 consolidated migration.
  - 라우팅 표: remove `#customer`, `#pending`, `#patient-result` rows; `#admin` 인증을 `is_admin`으로.
  - 보안: replace `get_my_clinic_id()/customer_can_view_patient()/search_patient_public` helpers with `is_active_staff()/is_admin()`; note the `guard_profile_changes` trigger protects privileged columns; remove 익명조회 RPC line.
  - 프로젝트 구조: remove deleted files (customerScreen, pendingScreen, clinics.js, mockData.js).

- [ ] **Step 2: Build** (sanity, no code change)

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for single-tenant doctor/nurse model"
```

---

## Task 15: Final verification & manual acceptance (gated on Task 2)

**Files:** none (verification only)

- [ ] **Step 1: Full build + tests**

Run: `npm run build && npm test`
Expected: build success; all unit tests pass.

- [ ] **Step 2: Confirm schema is live** (Task 2 done). If not, STOP and complete Task 2 first — the rest cannot be verified without it.

- [ ] **Step 3: Manual acceptance** (`npm run dev`, fresh DB):
  1. Sign up account #1 (의사). → Lands on doctor dashboard; navbar shows **관리**. In DB, `profiles.is_admin = true` for this user.
  2. Open 관리 → 사용자 tab shows account #1; 치료종류 tab shows the 7 seeded types.
  3. Sign up account #2 (간호사) in another browser/incognito. → Lands on doctor dashboard; **no 관리** link. `is_admin = false`.
  4. As #1, register a patient + add a measurement. As #2, refresh → the **same patient is visible and editable** (shared pool).
  5. **Growth chart + measurement table render correctly** for that patient (AL/SE percentile curves draw, the measurement row appears). ← primary acceptance.
  6. As #1 (admin), grant #2 관리자 → #2 refresh shows 관리 link. Revoke → it disappears.
  7. As #1, 비활성화 #2 → #2 can no longer log in (blocked). Reactivate → can log in again.
  8. Confirm there is no 환자조회/보호자/승인/안과 UI anywhere.

- [ ] **Step 4: Guard-trigger security check** (Supabase SQL editor, as account #2 / non-admin context, or via the app's supabase client): attempt `update profiles set is_admin = true where id = auth.uid()` → re-select shows `is_admin` still `false`. Document the result. (Covers Task 2 Step 4.)

- [ ] **Step 5:** If all pass, the branch is ready for review/merge. Report results honestly, including any criterion that could not be verified (e.g., schema not yet applied).

---

## Notes for the executor

- **Build-green invariant:** every task above is ordered so `npm run build` stays green at each commit. The two tight couplings (admin service↔screen in Task 10; clinics deletion↔barrel in Task 13) are intentionally combined.
- **Do not reintroduce `clinic_id`** anywhere. The `_clinicId` params left in `patients.js` are deliberate compatibility shims; they are ignored.
- **Chart code is untouched** (`growthChart.js`, `progressChart.js`, `constants.js`, `utils.js`) — that is by design; the refactor must not alter percentile/curve logic.
