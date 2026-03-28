# 근시관리 트래커 - 레퍼런스 대비 변동 내역

## 개요

원본 레퍼런스(`reference-index.html`)는 Firebase 기반 단일 HTML 파일(2,021줄)이었습니다.
현재 버전은 Vite + Supabase 기반 모듈화된 SPA(44개 파일)로 완전히 재구축되었습니다.

- **커밋 수:** 42회
- **DB 마이그레이션:** 12개
- **문서:** 5개
- **빌드 시간:** ~211ms

---

## 1. 아키텍처 변경

| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 구조 | 단일 HTML (2,021줄) | 모듈화 SPA (44개 파일) |
| 빌드 | 없음 (CDN 직접 로드) | Vite 8 + 코드 분할 |
| 스타일 | 인라인 CSS (~165줄) | Tailwind CSS 4 + 커스텀 테마 |
| 백엔드 | Firebase Firestore | Supabase (PostgreSQL + RLS) |
| 인증 | Firebase Auth | Supabase Auth (이메일/비밀번호) |
| 배포 | 없음 | Vercel 자동 배포 (Git push) |
| 보안 | 클라이언트 규칙 | Row Level Security (DB) + CSP |
| 상태관리 | 전역 변수 | Observer 패턴 + 클라이언트 캐시 |

### 프로젝트 구조

```
eyes/
├── index.html                 # Vite 엔트리 + CSP + 폰트 preconnect
├── package.json               # Vite 8, Tailwind 4, Chart.js 4.5, Supabase
├── vite.config.js             # 코드 분할 (chart/supabase/app 3개 청크)
├── vercel.json                # 보안 헤더 (CSP, X-Frame-Options 등)
├── public/favicon.svg
├── scripts/seed.mjs           # 테스트 데이터 시딩 스크립트
├── supabase/
│   ├── config.toml
│   └── migrations/            # 12개 마이그레이션
├── docs/
│   ├── changelog-vs-reference.md
│   ├── business-process-flow.md
│   ├── test-scenarios.md
│   ├── e2e-test-plan.md
│   └── social-login-guide.md
└── src/
    ├── main.js                # 엔트리: lazy 라우팅, 인증 가드
    ├── router.js              # 해시 기반 SPA 라우터
    ├── state.js               # 전역 상태 (observer 패턴)
    ├── constants.js            # 백분위 참조 데이터, 치료 색상
    ├── utils.js               # 계산 함수, escapeHtml, 메모이제이션
    ├── style.css              # Tailwind 디렉티브 + 커스텀 스타일
    ├── data/
    │   ├── dataService.js      # 배럴 파일 (re-export)
    │   ├── supabaseClient.js   # Supabase 클라이언트
    │   ├── patientCache.js     # 클라이언트 캐시 (30초 TTL)
    │   ├── mockData.js         # 데모 데이터
    │   └── services/
    │       ├── helpers.js      # 공통 (toPatientJS, fetchPatientFull, logAudit)
    │       ├── auth.js         # 인증 (login, register, password)
    │       ├── patients.js     # 환자 CRUD + 검색 + 캐시
    │       ├── measurements.js # 측정 CRUD + 배치 임포트
    │       ├── treatments.js   # 치료 CRUD + 치료 종류 관리
    │       ├── clinics.js      # 안과 CRUD
    │       ├── admin.js        # 관리자 (승인, 통계, 비활성화)
    │       └── notes.js        # 환자 메모 CRUD
    ├── components/             # 15개 UI 컴포넌트
    │   ├── navbar.js           # 네비게이션 바
    │   ├── sidebar.js          # 검색 중심 환자 사이드바
    │   ├── bottomNav.js        # 모바일 하단 네비게이션
    │   ├── patientInfoBar.js   # 환자 정보 헤더
    │   ├── statsCard.js        # OD/OS 통계 카드
    │   ├── treatmentTags.js    # 치료 태그 (종료일, 직접 입력)
    │   ├── measurementTable.js # 측정 테이블
    │   ├── modal.js            # 범용 모달
    │   ├── syncStatus.js       # 동기화 토스트
    │   ├── growthChart.js      # 성장 차트 (트리쉐이킹, 워터마크)
    │   ├── progressChart.js    # 진행 차트 (AL/SE)
    │   ├── progressReport.js   # 진행 속도 분석 카드
    │   ├── treatmentComparison.js # 치료 효과 분석 카드
    │   ├── rateTable.js        # 구간별 진행 속도 테이블
    │   ├── patientNotes.js     # 환자 메모 컴포넌트
    │   └── printReport.js      # 인쇄용 리포트
    └── screens/                # 6개 화면
        ├── loginScreen.js      # 로그인 (안과선택+조회+로그인+가입)
        ├── registerScreen.js   # 3단계 회원가입 위저드
        ├── doctorScreen.js     # 의사 대시보드
        ├── customerScreen.js   # 보호자 대시보드
        ├── adminScreen.js      # 관리자 대시보드
        ├── pendingScreen.js    # 승인 대기
        └── doctor/
            ├── modals.js       # 의사 모달들 (환자등록, 측정입력 등)
            └── exportUtils.js  # CSV 내보내기
```

### 빌드 결과 (코드 분할)

| 청크 | 크기 | 설명 |
|------|------|------|
| index (main) | 26KB | 라우터 + 인증 |
| doctorScreen | 48KB | lazy load |
| adminScreen | 17KB | lazy load |
| printReport | 16KB | lazy load |
| customerScreen | 14KB | lazy load |
| loginScreen | 11KB | lazy load |
| chart | 214KB | Chart.js (트리쉐이킹) |
| supabase | 184KB | Supabase SDK |
| CSS | 34KB | Tailwind |

---

## 2. 데이터베이스 변경

### 레퍼런스 (Firebase Firestore)
```
users      → { email, name, role, clinicId, children[] }
patients   → { name, birthDate, gender, regNo, records[], treatments[] }
clinics    → { name }
approvalRequests → { userId, status }
```

### 현재 (Supabase PostgreSQL) - 9개 테이블
```
profiles           → id, email, name, role, approved, clinic_id, clinic_name, children(jsonb)
patients           → id, name, birth_date, gender, reg_no, custom_ref, clinic_id,
                     next_visit_date, follow_up_months
measurements       → id, patient_id(FK CASCADE), date, age, od_al, os_al, od_se, os_se,
                     od_pct, os_pct
treatments         → id, patient_id(FK CASCADE), type, date, age, end_date
clinics            → id, name, created_by, is_active
treatment_types    → id, name, color, sort_order, is_active
notes              → id, patient_id(FK CASCADE), content, created_by
approval_requests  → id, user_id, email, name, clinic_name, status
audit_log          → id, user_id, action, entity_type, entity_id, details(jsonb)
```

### 주요 변경점
- records/treatments 배열 → 별도 테이블로 정규화 (CASCADE 삭제)
- 환자 메모 테이블 신규
- 치료 종류 관리 테이블 신규
- 감사 로그 테이블 신규
- 치료 종료일 필드 추가
- 추적 검사일/주기 필드 추가
- 관리번호(custom_ref) 필드 추가
- 안과 소프트 삭제(is_active) 추가
- 등록번호(reg_no)는 내부 자동생성, UI에서 숨김

---

## 3. UI/UX 변경

### 디자인 시스템
| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 폰트 | Noto Sans KR | Geist + Noto Sans KR |
| Primary | #0066cc | #2563eb (Blue 600) |
| 스타일 | 무거운 그림자, 이모지 아이콘 | 미니멀, SVG 아이콘, 1px 보더 |
| 네비바 | 그라데이션 헤더 | Glass-morphism (backdrop-blur) |
| 반응형 | 기본 미디어쿼리 | 사이드바↔하단네비 전환, 모바일 최적화 |
| 로딩 | 기본 스피너 | 로딩 오버레이 + 동기화 토스트 |

### 로그인 화면
| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 환자 조회 | 이름+생일만 | 안과 선택(필수) + 이름 + (생일 OR 관리번호) |
| 인증 | 이메일+Google+익명 | 이메일/비밀번호 + 비밀번호 찾기 |
| 회원가입 | 탭 이동 | 이메일 수집 → 3단계 위저드 |
| 에러 | 영어 메시지 | 한국어 에러 메시지 |
| UX | - | Enter 키 지원, 검색 레이트 리밋 |

### 의사 대시보드
| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 환자 목록 | 전체 로드 | 최근 10명 + 검색 (디바운스 300ms) |
| 빠른 진행 | 텍스트 라벨만 | 빨간 경고 박스 + 사이드바 빨간 점 + 카운트 |
| 측정 입력 | 기본 모달 | 이전 측정값 표시 + 범위 검증 + 중복 경고 |
| 치료 | 시작일만 | 시작~종료일 + 종료 버튼 + 직접 입력 |
| 내보내기 | CSV만 | CSV + 전체 CSV + PDF 리포트 + 차트 이미지 |
| 가져오기 | 없음 | CSV 파일 업로드 (배치 Insert) |
| 환자 관리 | 등록만 | 등록 + 수정 + 삭제 + 중복 방지 |
| 메모 | 없음 | 환자별 메모 CRUD |
| 추적 검사 | 없음 | 자동 6개월 후 설정 + 과기 환자 알림 |
| 키보드 | 없음 | N/P/S/E/R/? 단축키 |

---

## 4. 신규 기능 (레퍼런스에 없음)

### 진행 분석 시스템
| 기능 | 설명 |
|------|------|
| 진행 속도 분석 | 6개월/1년/전체 기간별 AL 변화율 + 4단계 평가 (안정/느림/보통/빠름) |
| 치료 효과 분석 | 치료 시작 전후 진행 속도 비교 + 변화율(%) + 효과 판정 |
| 구간별 진행 속도 | 측정 구간별 상세 변화량/속도 + 연간 환산 |
| 빠른 진행 경고 | 빨간 경고 박스 + 사이드바 카운트 + 환자별 빨간 점 |

### 치료 관리 시스템
| 기능 | 설명 |
|------|------|
| 치료 종료일 | 시작~종료 기간 표시, ⏹ 종료 처리 버튼 |
| 치료 종류 DB 관리 | 관리자가 추가/삭제/색상 변경, 의사가 "직접 입력" 가능 |
| 치료 이름 변경 동기화 | 이름 변경 시 기존 기록도 함께 업데이트 |

### 보호자 기능
| 기능 | 설명 |
|------|------|
| 자녀 관리 | 가입 후 자녀 추가/수정/삭제 |
| 다중 안과 지원 | 자녀별 다른 안과 연결, 병렬 데이터 조회 |
| patientId 연결 | 이름+생일 매칭 → 자동 ID 연결 (이름 변경에도 안전) |
| 최근 측정일 표시 | 자녀 카드에 마지막 측정 날짜 |
| NEW 배지 | 7일 이내 측정 시 표시 |
| 리포트 출력 | 인쇄용 임상 요약 (PDF 저장 가능) |

### 관리자 기능
| 기능 | 레퍼런스 | 현재 |
|------|---------|------|
| 승인 관리 | 있음 | 있음 (동일) |
| 안과 관리 | 목록만 | 추가/수정/비활성화 + 의사/환자 수 표시 |
| 의사 목록 | 없음 | 전체 조회 + 승인 취소 + 계정 비활성화 |
| 환자 목록 | 없음 | 전체 조회 + 검색 + 관리번호 표시 |
| 치료 관리 | 없음 | 치료 종류 추가/삭제 + 색상 관리 |
| 통계 | 기본 카운트 | 4개 통계 카드 (환자/의사/안과/대기) |

### 데이터 관리
| 기능 | 설명 |
|------|------|
| CSV Import | 파일 업로드로 측정 데이터 일괄 등록 (배치 INSERT) |
| CSV Export (개별) | 환자별 측정 데이터 내보내기 |
| CSV Export (전체) | 클리닉 전체 데이터 내보내기 |
| 차트 이미지 저장 | 성장 차트 PNG 다운로드 (워터마크 포함) |
| 인쇄용 리포트 | 환자 정보 + 측정 기록 + 치료 이력 인쇄 페이지 |
| 감사 로그 | 모든 CRUD 작업 기록 (user_id, action, entity 등) |

### 추적 검사 시스템
| 기능 | 설명 |
|------|------|
| 자동 다음 검사일 | 측정 입력 시 6개월 후 자동 설정 |
| 과기 환자 알림 | 검사 예정일 초과 환자 목록 (노란 경고바) |

### 기타 UX
| 기능 | 설명 |
|------|------|
| 로딩 오버레이 | 페이지 전환 시 스피너 |
| 동기화 토스트 | 저장/삭제 시 상태 표시 (syncing/synced/error) |
| 비밀번호 변경 | 설정 모달 내 비밀번호 변경 |
| 모바일 하단 네비 | 환자/차트/측정/설정 탭 동작 연결 |
| 측정 기간 필터 | 전체/최근1년/최근6개월 (부분 DOM 업데이트) |
| 키보드 단축키 | N(측정)/P(환자)/S(검색)/E(수정)/R(리포트)/?(도움말) |
| 날짜 입력 제한 | 4자리 연도 (1900~2099) |

---

## 5. 보안 개선

### RLS (Row Level Security)
| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 데이터 접근 | 클라이언트 규칙 | PostgreSQL RLS 정책 |
| 의사 접근 | role 체크만 | `is_approved_doctor()` (승인+역할 체크) |
| 보호자 접근 | 없음 | `customer_can_view_patient()` (children 배열 기반) |
| 익명 조회 | 전체 공개 | `search_patient_public` RPC (제한된 조회) |
| 감사 로그 | 없음 | user_id 기반 접근 제한 |

### 보안 조치 (20개 취약점 수정)
| 조치 | 설명 |
|------|------|
| 역할 자가 승격 차단 | DB 트리거에서 role을 'customer'로 하드코딩 |
| 미승인 의사 차단 | RLS + 앱에서 approved 체크, pending 라우팅 |
| XSS 방지 | `escapeHtml()` 전역 적용, CSS injection 방지 |
| CSP 헤더 | Content-Security-Policy (vercel.json + meta 태그) |
| 보안 헤더 | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| 비활성화 | role CHECK 제약 + 세션 무효화 |
| LIKE 인젝션 방지 | `escapeLike()` 적용 |
| 검색 레이트 리밋 | 2초 쿨다운 |
| 비밀번호 메모리 정리 | 사용 후 즉시 초기화 |
| search_path 보호 | 모든 security definer 함수에 `set search_path = ''` |
| 환자 중복 방지 | 같은 안과 내 이름+생일 중복 차단 |
| 관리번호 고유 제약 | `UNIQUE(clinic_id, custom_ref)` |
| 색상 값 검증 | hex 코드 정규식 검증 |
| 안과 삭제 → 비활성화 | 소프트 삭제로 연관 데이터 보호 |
| 안과 이름 변경 동기화 | profiles.clinic_name 자동 업데이트 |
| children 연결 검증 | patientId 검증 후 연결 허용 |
| 자녀 접근 클리닉 제한 | customer_can_view_patient에 clinic 매칭 |

---

## 6. 성능 최적화

### 네트워크
| 최적화 | 효과 |
|--------|------|
| `fetchPatientFull` Promise.all | 측정+치료 병렬 조회 (환자당 50% 단축) |
| getNotes+getOverduePatients 병렬화 | 초기 로드 200~400ms 절감 |
| importMeasurements 배치 INSERT | N회 → 1회 API 호출 |
| 보호자 직접 ID 조회 | 전체 환자 로드 → 1~2명만 조회 |
| 검색 디바운스 300ms | 불필요한 API 호출 방지 |

### 렌더링
| 최적화 | 효과 |
|--------|------|
| 클라이언트 환자 캐시 (30초 TTL) | 재렌더링 시 네트워크 0회 |
| generateCurveData 메모이제이션 | 차트 전환 시 연산 제거 |
| 부분 DOM 업데이트 (필터) | 테이블만 교체, 전체 리렌더 제거 |
| 키보드 리스너 누수 수정 | 이전 핸들러 제거 후 등록 |

### 번들
| 최적화 | 효과 |
|--------|------|
| 화면별 lazy loading | 초기 JS 파싱 ~70% 감소 (26KB만 즉시 로드) |
| Chart.js 트리쉐이킹 | 사용 컨트롤러만 포함 (214KB) |
| 코드 분할 3청크 | chart/supabase/app 병렬 로드 |
| 파일 분할 (44개) | doctorScreen 1000줄→3파일, dataService 691줄→9파일 |

### 폰트
| 최적화 | 효과 |
|--------|------|
| preconnect 힌트 | DNS/TLS 사전 연결 |
| 폰트 요청 통합 | 2회 → 1회 |
| CSS @import 제거 | 렌더링 블로킹 1단계 제거 |
| 미사용 weight 제거 | weight 300 제거 (2 파일 다운로드 절감) |

---

## 7. 차트 개선

| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 성장 차트 | 기본 scatter+line | 워터마크 + 트리쉐이킹 + 메모이제이션 |
| 진행 차트 | AL만 | AL/SE 토글 |
| 차트 저장 | saveChartAsImage | "이미지 저장" 버튼 (PNG) |
| 임포트 | `registerables` (전체) | 선택적 임포트 (ScatterController 등) |

---

## 8. 문서화

| 문서 | 설명 |
|------|------|
| `CLAUDE.md` | 프로젝트 가이드, 구조, Supabase 전환 가이드 |
| `docs/business-process-flow.md` | 전체 업무 프로세스, 데이터 흐름, 역할별 워크플로우 |
| `docs/changelog-vs-reference.md` | 레퍼런스 대비 변동 내역 (이 문서) |
| `docs/test-scenarios.md` | 12개 테스트 시나리오 |
| `docs/e2e-test-plan.md` | 8개 E2E 테스트 계획 |
| `docs/social-login-guide.md` | Google/카카오톡 로그인 구현 가이드 |

---

## 9. 커밋 히스토리 (42회)

```
0f8f98f perf: add patient cache, fix keyboard listener leak, partial DOM updates
792695c perf: lazy load screens, tree-shake Chart.js, optimize customer data loading
588731d perf: parallelize queries, optimize fonts, memoize curves, batch imports
3cacff5 refactor: split large files into modules, add Vite code splitting
deaaca5 feat: add keyboard shortcuts for doctor screen (N/P/S/E/R/?)
c8ad8b1 fix: remove frame-ancestors from CSP meta tag
99a14a4 fix: patients variable not defined in doctorScreen
d26964d docs: add comprehensive E2E test plan
144fd0f security: fix remaining issues - XSS, search_path, patient linking, CSP
c9a8dad security: fix MEDIUM vulnerabilities - CSP, CSS injection, rate limit
bf5801d security: fix CRITICAL+HIGH vulnerabilities - RLS, role escalation, XSS
f62d7e1 fix: clinic soft-delete, children linking, clinic_name join, custom_ref uniqueness
d8ded57 fix: sync clinic_name in profiles when clinic is renamed
9c3cdc1 fix: limit date input year to 4 digits (1900-2099)
dd9bce4 perf: search-focused sidebar with recent patients, debounced search
827ae17 feat: treatment date default, sidebar rapid indicator, changelog document
288e23c feat: dynamic treatment type management with admin control
522da72 docs: add comprehensive test scenarios
707890a feat: add data notifications, print report, multi-clinic children
786d485 feat: add clinic export, account deactivation, follow-up tracking, alerts
b2bc8e5 feat: add measurement validation, duplicate prevention, treatment end date, audit
fc9c9df refactor: make reg_no internal, use custom_ref per clinic, require clinic for search
bc5a3bf feat: auto-generate reg_no per clinic, add custom_ref field
aedd610 fix: require name + (birthday OR regNo) for patient search security
ffc785a feat: allow patient search by name+birthday OR registration number
a6692af feat: add rate table and chart watermark
90be807 feat: add loading overlay, customer children management, sync status toast
09d9bbb docs: add social login (Google/Kakao) implementation guide
ad051a3 fix: add RLS policy for anonymous patient search
6702651 feat: add Enter key support for login, search, and register forms
d9052da fix: correct gender display in admin patient list
d4671c1 feat: expand admin with clinic CRUD, doctor list, patient list
ebcd8f8 feat: add patient notes and CSV import
49bfe5a feat: add password change, progress report, treatment comparison
8a27345 feat: add mobile nav actions, chart image save, measurement filter
b5ed39c feat: add patient delete/edit and loading states
129c25d fix: growth chart rendering timing and null clinic creator display
6b00414 feat: add seed script with test accounts and sample data
5a883c5 fix: add new clinic option, password reset, Korean error messages
1e65625 fix: implement working login and registration auth flow
8376fee refactor: remove demo login buttons and login() function
e72e228 docs: add business process flow documentation
a6f7b04 feat: replace localStorage with Supabase backend
b427118 docs: add CLAUDE.md project documentation
6edaca4 fix: reorder CSS imports to fix build warning
2533ff8 feat: add all screens and finalize main.js with auth guards
e8d6e25 feat: add shared UI components and Chart.js chart components
08101c8 feat: add data layer, router, and navigation components
dc375f2 feat: scaffold Vite + Tailwind project for myopia tracker
```
