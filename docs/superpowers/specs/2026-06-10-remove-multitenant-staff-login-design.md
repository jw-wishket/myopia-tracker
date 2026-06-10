# 멀티테넌트 제거 → 의사·간호사 단일 워크스페이스 설계

- **날짜:** 2026-06-10
- **브랜치:** `refactor/single-tenant-staff`
- **상태:** 승인됨 (구현 계획 작성 단계로 진행)

## 1. 배경 & 목표

현재 앱은 멀티테넌트(여러 안과 = clinic)로 구현되어 있고, 의사/보호자/관리자/익명 환자조회 등 여러 역할이 얽혀 있다. 이 복잡도를 전부 걷어내고, **의사와 간호사만 간단히 가입·로그인하여 하나의 공용 환자 데이터를 함께 보고 공유하는** 단순한 단일 워크스페이스로 전환한다.

핵심 가치: 의료진이 로그인 후 환자를 등록/측정/치료 입력하고, **growth chart(성장 곡선)와 측정 기록이 정확하게 표시**되는 것. 그래프 관련 데이터·로직은 테넌트와 무관하므로 회귀가 없어야 한다.

## 2. 확정된 결정사항

| 항목 | 결정 |
|------|------|
| 데이터 공유 | **공용 단일 풀** — clinic 개념 완전 제거, 활성 의료진 전원이 동일 환자 목록 공유 |
| 역할 | `role` ∈ **`doctor` \| `nurse`** 2종 (진료 권한 동일) |
| 관리자 | 별도 role 아님 → **`is_admin` 플래그**. **최초 가입 계정 자동 관리자**, 추가 부여 가능 |
| 가입 승인 | **없음** — 가입 즉시 로그인·사용 |
| 보호자(customer) | **완전 제거** |
| 익명 환자조회 | **완전 제거** |
| Supabase | **스키마 새로 작성** (Approach A) — 단순화된 깨끗한 마이그레이션 |

## 3. 데이터 모델 (Supabase 재작성)

### 삭제 테이블
- `clinics`
- `approval_requests`

### 유지 + 변경 테이블

**profiles**
```
id          uuid primary key references auth.users on delete cascade
email       text
name        text not null
role        text not null check (role in ('doctor','nurse'))   -- 'admin'/'customer'/'deactivated' 제거
is_admin    boolean not null default false                      -- 관리자 모드 권한 (역할과 독립)
is_active   boolean not null default true                       -- 비활성화(차단) 플래그
created_at  timestamptz default now()
```
- 제거 컬럼: `clinic_id`, `clinic_name`, `children`, `approved`

**patients**
```
id              uuid primary key
reg_no          text
name            text not null
birth_date      date not null
gender          text check (gender in ('male','female'))
custom_ref      text
next_visit_date date
follow_up_months integer default 6
created_by      uuid references auth.users                       -- 신규: 등록자 추적(감사용, 접근 제한엔 미사용)
created_at      timestamptz default now()
```
- 제거 컬럼: `clinic_id`
- `custom_ref` 유니크: 기존 `(clinic_id, custom_ref)` → **전역 unique (custom_ref) where custom_ref is not null**

**구조 유지 (변경 없음):** `measurements`, `treatments`, `notes`, `treatment_types`, `audit_log`
→ 그래프/측정 데이터는 그대로이므로 차트 영향 없음.

### 인덱스
- 제거: `idx_patients_clinic`, `idx_profiles_clinic`
- 유지/추가: `idx_measurements_patient`, `idx_treatments_patient`, `idx_notes_patient`, `idx_profiles_role`, `idx_patients_custom_ref_unique`(전역), `idx_audit_log_*`

## 4. 인증 / RLS / 보안

### 헬퍼 함수 (모두 `security definer`, `set search_path = ''`)
- **삭제:** `get_my_clinic_id()`, `customer_can_view_patient()`, `search_patient_public()`, `is_approved_doctor()`
- **유지:** `get_my_role()`
- **신규/통합:**
  - `is_active_staff()` → `role in ('doctor','nurse') and is_active = true` (진료 권한 = 모든 읽기/쓰기)
  - `is_admin()` → `is_active = true and is_admin = true` (관리 권한)

### RLS 정책 (요약)
- **patients / measurements / treatments / notes**
  - SELECT: `is_active_staff()` (전원 전체 조회)
  - INSERT/UPDATE/DELETE: `is_active_staff()` (의사·간호사 동일 CRUD)
- **profiles**
  - SELECT: 활성 staff는 전체 조회(사용자 관리 목록용), 본인 항상 조회
  - UPDATE 본인: `name`만
  - UPDATE 타인 (`is_admin`, `is_active`): `is_admin()` 인 경우만
- **treatment_types**
  - SELECT: 활성 staff 전원 / INSERT(커스텀 추가): 활성 staff 전원(기존 유지) / UPDATE·DELETE: `is_admin()`
- **audit_log**: INSERT 활성 staff, SELECT `is_admin()`
- `using(true)` 절대 금지 원칙 유지.

### handle_new_user() 트리거
- 가입 메타데이터에서 `name`, `role` 수신하되 **`role`은 `doctor`/`nurse`로만 강제** (그 외 값은 `nurse`로 정규화 — 클라이언트가 admin 자가 부여 불가)
- `is_active = true`
- **`is_admin`: 기존 profiles 0개이면 `true`, 아니면 `false`** (최초 가입 = 자동 관리자)
  - 동시 최초가입 경쟁은 테스트 규모에서 무시 (필요 시 추후 advisory lock/partial unique index로 보강 — 현재 범위 외)

### 추가 관리자 부여
- 관리 화면의 사용자 목록에서 `is_admin` 토글. profiles UPDATE 정책으로 `is_admin()` 사용자만 가능.
- (선택, 범위 외 가정) "최소 1명 관리자 유지" 강제는 하지 않음.

### Supabase Auth 설정 노트
- 마찰 없는 접속 테스트를 위해 대시보드에서 **이메일 확인(Confirm email) 비활성화** 권장. (코드 변경 아님, 운영 설정 메모)

## 5. 가입 / 로그인 흐름

1. 로그인 화면 탭: **`로그인` / `회원가입`** (기존 `환자조회` 탭·안과 드롭다운 제거)
2. 회원가입: **1화면** — 이메일·비밀번호(로그인 탭 회원가입에서 수집) + **의사/간호사 선택 + 이름**. 안과·자녀 단계 전부 제거. 승인/대기 없음 → 즉시 로그인 가능
3. 로그인 후 라우팅: **의사·간호사 모두 의사 대시보드(`#doctor`)** 로 진입
4. `is_admin=true` 사용자에게만 navbar/사이드바에 **"관리"** 진입점 노출 → `#admin`

## 6. 프론트엔드 변경 (파일별)

### 삭제
- `src/screens/customerScreen.js`
- `src/screens/pendingScreen.js`
- `src/data/services/clinics.js`
- `src/main.js`의 `customer`·`pending`·`patient-result`(익명) 라우트

### 수정
- `src/screens/loginScreen.js`: 환자조회 탭/안과 select/검색 핸들러 제거, `로그인`·`회원가입` 2탭. 라우팅을 role 대신 `isAdmin`/기본 doctor 기준으로
- `src/screens/registerScreen.js`: 3단계 위저드 → 단일 폼(의사/간호사 + 이름). clinic/children/pending 로직 제거
- `src/screens/doctorScreen.js`: `clinicId` 인자 전부 제거(전체 환자 조회), navbar clinicName 제거. 의사·간호사 공용. is_admin이면 "관리" 링크 노출
- `src/screens/adminScreen.js`: `승인`·`안과` 탭 제거 → **사용자**(의사/간호사 목록 + 관리자 권한 토글 + 비활성화) + **치료종류** 2탭
- `src/screens/doctor/modals.js`: 환자 등록 시 `clinicId` 제거
- `src/data/services/patients.js`: 모든 함수에서 `clinicId` 파라미터/필터 제거, `searchPatientByInfo`(익명 RPC) 제거, `getRecentPatients/searchPatientsLight/getPatientCount/getOverduePatients`는 clinic 인자 없이 전체 대상
- `src/data/services/auth.js`: clinic name 조회 제거, children 검증 제거, pending 로직 제거. `getCurrentUser` 반환에 `isAdmin`, `isActive` 포함, `role==='deactivated'` 대신 `is_active===false` 차단
- `src/data/services/admin.js`: 승인 함수(`getApprovalRequests/approveRequest/rejectRequest`)·clinic 함수 제거. 유지/추가: 사용자 목록, `is_admin` 부여/해제, `is_active` 비활성화, 치료종류 관리
- `src/data/services/helpers.js`: clinic 참조 제거, `toProfileJS`에 `isAdmin/isActive` 매핑
- `src/data/dataService.js`(배럴): 삭제된 export 정리
- `src/components/navbar.js`: clinicName 표기 제거, is_admin 시 "관리" 링크
- `src/main.js`: 라우트/authGuard 정리 — `admin` 라우트는 `isAdmin` 가드, 없으면 doctor로
- `src/state.js`: `currentUser` 형태 `{ id, email, name, role, isAdmin, isActive }`

### 잔존 정리
- `src/data/mockData.js`: 미사용 레거시 — 이번에 함께 삭제(선택)

## 7. 라우팅 (변경 후)

| 해시 | 화면 | 접근 |
|------|------|------|
| `#login` | loginScreen | 불필요 |
| `#register` | registerScreen | 불필요 |
| `#doctor` | doctorScreen | 활성 staff (doctor/nurse) |
| `#admin` | adminScreen(관리) | `is_admin` 만 |

제거: `#customer`, `#pending`, `#patient-result`

## 8. 검증 기준 (Acceptance)

1. `npm run build` 성공 (삭제된 import/참조 잔존 없음)
2. 첫 계정 가입 → 자동 `is_admin=true`, "관리" 진입점 노출
3. 두 번째 계정(간호사) 가입 → 일반 계정, "관리" 미노출, 동일 환자 풀 조회/편집 가능
4. 관리 화면에서 간호사에게 관리자 권한 부여/해제, 계정 비활성화 동작
5. 비활성화 계정 로그인 차단
6. **환자 등록 → 측정 입력 후 growth chart(AL/SE 백분위)·측정 테이블 정확 표시** (핵심 회귀 검증)
7. 익명 환자조회·보호자·승인·안과 관련 UI/라우트 완전 부재

## 9. 마이그레이션 / 배포 노트

- Supabase는 새 스키마로 재작성. 기존 `supabase/migrations/`는 단일 초기화 마이그레이션으로 재구성하거나, 깨끗한 재설정 후 신규 마이그레이션 1세트 작성 (구현 계획에서 방식 확정).
- 테스트 데이터 보존 불필요(신규 시작).
- `.env` / Vercel 환경변수는 그대로(같은 Supabase 프로젝트 사용 시) 또는 신규 프로젝트 ref로 갱신.

## 10. 가정 / 범위 외

- 간호사 세분화 권한(측정만 가능 등)은 적용 안 함 — 의사와 동일 (추후 `is_active_staff()` 분기로 확장 여지).
- 동시 최초가입 경쟁 조건 보강은 범위 외.
- 최소 관리자 1명 유지 강제는 범위 외.
- 데이터 마이그레이션/백필 없음.
