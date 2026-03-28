# 근시관리 트래커 (Myopia Management Tracker)

## 프로젝트 개요

안과 환자의 근시 진행을 추적하고 관리하는 반응형 SPA 웹 애플리케이션.
의사가 환자 데이터를 입력하고, 보호자는 자녀의 기록을 조회하는 구조.
멀티 테넌트 (여러 안과) 또는 단일 병원 전용으로 전환 가능.

## 기술 스택

- **빌드:** Vite 8 (코드 분할: chart/supabase/app 3청크, 화면별 lazy loading)
- **스타일:** Tailwind CSS 4 (`@tailwindcss/vite` 플러그인, tailwind.config.js 불필요)
- **차트:** Chart.js 4.5 (트리쉐이킹 적용) + chartjs-plugin-annotation 3
- **언어:** Vanilla JS (ES Modules)
- **데이터:** Supabase (PostgreSQL + RLS + Auth)
- **캐시:** 클라이언트 환자 캐시 (30초 TTL, src/data/patientCache.js)
- **배포:** Vercel (자동 배포, vercel.json 보안 헤더)

## 실행 방법

```bash
npm run dev      # 개발 서버 (Vite)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 환경 변수

`.env` 파일 (git에서 제외됨):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Vercel에도 동일하게 설정 필요 (Settings → Environment Variables).

## Supabase CLI

```bash
npx supabase login                    # 로그인
npx supabase link --project-ref xxx   # 프로젝트 연결
npx supabase migration new name       # 마이그레이션 생성
echo "y" | npx supabase db push       # 마이그레이션 적용 (비대화형)
```

## 프로젝트 구조

```
src/
├── main.js                 # 엔트리: lazy 라우팅, 인증 가드, 세션 복원
├── router.js               # 해시 기반 SPA 라우터
├── state.js                # 전역 상태 관리 (observer 패턴)
├── constants.js            # 백분위 참조 데이터, 치료 색상
├── utils.js                # calcAge, calcPct, escapeHtml, generateCurveData(메모이제이션)
├── style.css               # Tailwind 디렉티브 + 커스텀 테마 (폰트 @import 없음, index.html에서 로드)
├── data/
│   ├── dataService.js      # 배럴 파일 (모든 서비스 re-export)
│   ├── supabaseClient.js   # Supabase 클라이언트 초기화
│   ├── patientCache.js     # 클라이언트 캐시 (30초 TTL, 뮤테이션 시 invalidate)
│   ├── mockData.js         # 레거시 데모 데이터 (현재 미사용)
│   └── services/
│       ├── helpers.js      # toPatientJS, fetchPatientFull(Promise.all), logAudit, escapeLike
│       ├── auth.js         # loginWithEmail, registerWithEmail, getCurrentUser, changePassword
│       ├── patients.js     # CRUD + getRecentPatients + searchPatientsLight + getPatientCount
│       ├── measurements.js # addMeasurement, deleteRecord, importMeasurements(배치)
│       ├── treatments.js   # CRUD + getTreatmentTypes + addTreatmentType
│       ├── clinics.js      # CRUD + soft delete (is_active)
│       ├── admin.js        # 승인, 통계, 의사/환자 목록, 비활성화
│       └── notes.js        # 환자 메모 CRUD
├── components/             # 15개 컴포넌트
│   ├── navbar.js, sidebar.js, bottomNav.js
│   ├── statsCard.js, patientInfoBar.js, measurementTable.js
│   ├── treatmentTags.js    # 동적 치료 종류 + 직접 입력 + 종료일
│   ├── modal.js, syncStatus.js
│   ├── growthChart.js      # 트리쉐이킹, 워터마크, 메모이제이션
│   ├── progressChart.js    # AL/SE 토글
│   ├── progressReport.js, treatmentComparison.js, rateTable.js
│   ├── patientNotes.js
│   └── printReport.js      # 인쇄용 리포트 (새 창)
└── screens/
    ├── loginScreen.js       # 안과선택+이름+(생일/관리번호) 조회, 레이트리밋
    ├── registerScreen.js    # 3단계 위저드 (role 하드코딩 'customer')
    ├── doctorScreen.js      # 의사 대시보드 (최근10명 사이드바, 키보드 단축키)
    ├── customerScreen.js    # 보호자 (patientId 직접 조회, 다중 안과)
    ├── adminScreen.js       # 5탭 (승인/안과/의사/환자/치료)
    ├── pendingScreen.js     # 미승인 의사 대기 화면
    └── doctor/
        ├── modals.js        # 환자등록/수정, 측정입력, CSV임포트, 설정, 단축키 도움말
        └── exportUtils.js   # CSV 내보내기
```

## 라우팅

| 해시 | 화면 | 인증 | 로딩 방식 |
|------|------|------|----------|
| `#login` | loginScreen | 불필요 | lazy |
| `#register` | registerScreen | 불필요 | lazy |
| `#pending` | pendingScreen | 불필요 | lazy |
| `#doctor` | doctorScreen | 필요 (approved) | lazy |
| `#customer` | customerScreen | 필요 | lazy |
| `#admin` | adminScreen | 필요 | lazy |
| `#patient-result` | (인라인) | 불필요 | lazy (컴포넌트별) |

## 사용자 역할

- **의사 (doctor):** 환자 CRUD, 측정/치료 입력, 분석, CSV, 리포트, 메모, 키보드 단축키
- **보호자 (customer):** 자녀 데이터 읽기 전용, 자녀 관리, 리포트 출력
- **관리자 (admin):** 승인/거부, 안과/의사/환자/치료종류 관리, 계정 비활성화
- **비로그인:** 안과+이름+(생일/관리번호)로 환자 조회 (RPC 함수, 레이트리밋)

## 데이터 모델 (Supabase)

9개 테이블: profiles, patients, measurements, treatments, clinics, treatment_types, notes, approval_requests, audit_log

12개 마이그레이션 (supabase/migrations/ 디렉토리)

## 보안

- **RLS:** 모든 테이블에 Row Level Security 적용
- **헬퍼 함수:** `get_my_role()`, `get_my_clinic_id()`, `is_approved_doctor()`, `customer_can_view_patient()` (모두 `set search_path = ''`)
- **익명 조회:** `search_patient_public` RPC 함수 (blanket `using(true)` 절대 사용 금지)
- **XSS:** `escapeHtml()` 전역 적용, `safeColor()` CSS 인젝션 방지
- **CSP:** vercel.json HTTP 헤더 + index.html meta 태그 (frame-ancestors는 HTTP만)
- **감사 로그:** `logAudit()` 모든 CRUD 작업에 호출
- **회원가입 트리거:** `handle_new_user()`에서 role을 'customer'로 하드코딩 (클라이언트 메타데이터 무시)

## 개발 주의사항

- **변수 리네이밍 시** 템플릿 리터럴 내부의 참조도 반드시 확인 (예: `patients` → `sidebarPatients` 변경 시 `${renderPatientContent(selectedPatient, patients)}` 누락 버그 발생함)
- **RLS 정책 추가 시** `using(true)` 절대 사용 금지 — 의료 데이터 전체 노출 위험
- **security definer 함수** 생성 시 반드시 `set search_path = ''` 포함
- **날짜 입력** `<input type="date">`에 `min="1900-01-01" max="2099-12-31"` 필수
- **innerHTML에 DB 데이터 삽입 시** 반드시 `escapeHtml()` 적용
- **fetchPatientFull:** measurements + treatments를 `Promise.all`로 병렬 조회
- **캐시 무효화:** 환자 데이터 변경 후 반드시 `invalidatePatient(id)` 호출
- **안과 이름 변경 시** profiles.clinic_name도 함께 업데이트 (`updateClinic`에 구현됨)
- **치료 종류 이름 변경 시** 기존 treatments 레코드도 함께 업데이트 (`updateTreatmentType`에 구현됨)
- **키보드 리스너:** module-level `currentKeyboardHandler`로 이전 핸들러 제거 후 등록 (누수 방지)
- **Tailwind CSS 4:** `@import "tailwindcss"` 사용, `@import url(...)` 폰트는 index.html `<link>`로

## 키보드 단축키 (의사 화면)

N: 새 측정 / P: 새 환자 / S: 검색 / E: 수정 / R: 리포트 / ?: 도움말

## 디자인 시스템

- **폰트:** Geist (400/500/600/700) + Noto Sans KR (400/500/600/700)
- **Primary:** #2563eb (Blue 600)
- **OD 색상:** #0891b2 (Cyan), **OS 색상:** #e11d48 (Rose)
- **카드:** 흰색 배경, 1px slate-200 보더, 12px 라운드
- **반응형:** Desktop (사이드바+2컬럼) / Mobile (단일컬럼+하단네비)
- **보안 색상 검증:** 치료 색상은 `/^#[0-9a-fA-F]{6}$/` 정규식 검증 (`safeColor()`)
