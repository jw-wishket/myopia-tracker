# 근시관리 트래커 - 업무 프로세스 문서

## 1. 시스템 개요

안과 환자의 근시 진행을 추적하고 관리하는 웹 애플리케이션.
3가지 사용자 역할(의사, 보호자, 관리자)에 따라 다른 기능을 제공하며,
비로그인 환자 조회도 지원한다.

### 기술 아키텍처

```
[브라우저] ←→ [Vite SPA] ←→ [Supabase]
                │                 ├── Auth (인증)
                │                 ├── Database (PostgreSQL)
                │                 └── RLS (행 수준 보안)
                │
                ├── router.js (해시 라우팅)
                ├── state.js (전역 상태)
                ├── dataService.js (데이터 서비스)
                └── screens/ + components/ (화면 + 컴포넌트)
```

---

## 2. 사용자 역할 및 권한

| 기능 | 의사 | 보호자 | 관리자 | 비로그인 |
|------|:----:|:------:|:------:|:--------:|
| 환자 등록 | O | X | X | X |
| 환자 삭제 | O | X | X | X |
| 측정 입력 | O | X | X | X |
| 측정 삭제 | O | X | X | X |
| 치료 추가/삭제 | O | X | X | X |
| 환자 검색 | O | X | X | O (이름+생일) |
| 측정 데이터 조회 | O | O (자녀만) | X | O (검색한 환자) |
| 차트 조회 | O | O | X | O |
| CSV 내보내기 | O | X | X | X |
| 의사 승인/거부 | X | X | O | X |
| 통계 조회 | X | X | O | X |
| 안과 목록 조회 | X | X | O | X |

---

## 3. 화면 구조 및 라우팅

```
#login (기본)
├── 환자조회 탭 ──→ #patient-result
├── 로그인 탭
├── 회원가입 탭 ──→ #register (3단계 위저드)
│                    └── 의사 완료 ──→ #pending
│                    └── 보호자 완료 ──→ #login
└── 체험 버튼
    ├── 의사 ──→ #doctor (인증 필요)
    ├── 보호자 ──→ #customer (인증 필요)
    └── 관리자 ──→ #admin (인증 필요)
```

### 인증 가드

```javascript
// 보호된 라우트는 authGuard로 감싸져 있음
function authGuard(renderFn) {
  return async (container) => {
    if (!currentUser) → 로그인 화면으로 리다이렉트
    else → 화면 렌더링
  };
}
```

---

## 4. 전체 데이터 흐름

### 4.1 전역 상태 (state.js)

```javascript
{
  currentUser: null | { id, name, role, clinicId, clinicName, children },
  currentPatient: null | { id, name, birthDate, gender, records[], treatments[] },
  currentChartType: 'AL' | 'SE'
}
```

| 사용자 액션 | 상태 변경 | 결과 |
|-------------|-----------|------|
| 데모 로그인 | currentUser 설정 | 역할별 대시보드로 이동 |
| 환자 선택 | currentPatient 변경 | 환자 상세 정보 렌더링 |
| 측정 추가 | currentPatient 갱신 | 차트/테이블 재렌더링 |
| 차트 토글 | currentChartType 변경 | 진행 차트 재생성 |
| 로그아웃 | 모든 상태 초기화 | 로그인 화면으로 이동 |

### 4.2 데이터베이스 구조

```
clinics ─────────────────┐
  id, name, created_by   │
                          │
profiles ─────────────────┤ clinic_id 참조
  id, email, name, role   │
  approved, clinic_id     │
  children (jsonb)        │
                          │
patients ─────────────────┘ clinic_id 참조
  id, reg_no, name
  birth_date, gender
  clinic_id
      │
      ├── measurements (patient_id 참조, CASCADE 삭제)
      │     date, age, od_al, os_al
      │     od_se, os_se, od_pct, os_pct
      │
      └── treatments (patient_id 참조, CASCADE 삭제)
            type, date, age

approval_requests
  user_id, email, name
  clinic_name, status
```

### 4.3 데이터 변환 흐름

```
DB (snake_case)          JS (camelCase)
─────────────           ──────────────
birth_date        →     birthDate
reg_no            →     regNo
clinic_id         →     clinicId
od_al             →     odAL
os_pct            →     osPct

환자 조회 시:
patients 테이블 → measurements 조회 → treatments 조회
  → 3개를 조합하여 하나의 patient 객체 반환:
  { id, name, birthDate, gender, regNo, clinicId,
    records: [...측정기록], treatments: [...치료기록] }
```

---

## 5. 역할별 상세 업무 프로세스

### 5.1 의사 (Doctor) 워크플로우

#### 로그인 → 대시보드 진입

```
로그인 → login('doctor')
  → Supabase 인증
  → profiles 테이블에서 프로필 조회
  → setState({ currentUser: profile })
  → navigate('doctor')
  → getPatients(clinicId) 호출
    → 소속 안과의 모든 환자 + 측정기록 + 치료기록 조회
  → 첫 번째 환자 자동 선택
  → 차트 초기화 (growthChart, progressChart)
```

#### 환자 관리

**환자 검색**
```
사이드바 검색 입력 → input 이벤트
  → searchPatients(query, clinicId)
  → 이름 또는 등록번호로 ILIKE 검색
  → 필터된 환자 목록으로 재렌더링
```

**새 환자 등록**
```
"새 환자" 클릭 → 모달 열림
  → 입력: 이름, 생년월일, 성별(남/여), 등록번호
  → "등록" 클릭
  → addPatient({ name, birthDate, gender, regNo, clinicId })
  → DB INSERT → patients 테이블
  → setState({ currentPatient: newPatient })
  → 화면 재렌더링
```

**환자 선택**
```
사이드바 환자 클릭 (데스크탑)
  또는 환자 칩 클릭 (모바일)
  → getPatientById(id)
  → measurements + treatments 함께 조회
  → setState({ currentPatient: patient })
  → 상세 정보 + 차트 재렌더링
```

#### 측정 데이터 입력

```
"새 측정" 클릭 → 모달 열림
  → 입력 필드:
    - 측정일 (기본값: 오늘)
    - 우안(OD): 안축장(mm), 굴절력(D)
    - 좌안(OS): 안축장(mm), 굴절력(D)
  → "측정 저장" 클릭
  → addMeasurement(patientId, record)
    내부 처리:
    1. 환자의 birth_date 조회
    2. age = calcAge(birth_date, 측정일) → 소수점 1자리 나이
    3. odPct = calcPct(gender, age, odAL) → 백분위 계산
    4. osPct = calcPct(gender, age, osAL) → 백분위 계산
    5. DB INSERT → measurements 테이블
  → setState({ currentPatient: 갱신된 환자 })
  → 차트 재생성 (새 데이터 포인트 반영)
```

#### 백분위 계산 로직

```
calcPct(gender, age, axialLength):
  1. PERCENTILE_DATA[gender] 참조 (4~18세, 남/여 별도)
  2. 해당 나이의 P3~P95 값을 선형 보간으로 계산
  3. axialLength가 어느 백분위 범위에 속하는지 판단
  4. 결과: '<3', 5, 10, 25, 50, 75, 90, '>95'

  색상 표시:
  - 초록 (≤50%ile): 정상 범위
  - 노랑 (51~75%ile): 주의
  - 빨강 (>75%ile): 높은 진행도
```

#### 치료 기록 관리

```
치료 추가:
  "추가" 클릭 → 드롭다운 + 날짜 입력 폼 표시
  → 치료 종류 선택:
    - 아트로핀 0.01% (빨강 #dc2626)
    - 아트로핀 0.025% (주황 #ea580c)
    - 아트로핀 0.05% (노랑 #d97706)
    - 아트로핀 0.1% (초록 #65a30d)
    - 드림렌즈 (청록 #059669)
    - 마이사이트 (시안 #0891b2)
    - PPSL (보라 #7c3aed)
  → 날짜 입력
  → "추가" 클릭
  → addTreatment(patientId, { type, date })
  → DB INSERT → treatments 테이블
  → 성장 차트에 치료 시점 수직선 표시

치료 삭제:
  태그의 X 버튼 클릭
  → removeTreatment(patientId, treatmentId)
  → DB DELETE
```

#### 측정 기록 삭제

```
테이블 행의 휴지통 아이콘 클릭
  → confirm("이 측정 기록을 삭제하시겠습니까?")
  → 확인 시: deleteRecord(patientId, recordId)
  → DB DELETE → measurements 테이블
  → 차트/테이블 재렌더링
```

#### CSV 내보내기

```
"CSV" 버튼 클릭
  → exportCSV(patient)
  → 헤더: 날짜,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct
  → 각 측정 행 데이터 생성
  → UTF-8 BOM 포함 Blob 생성
  → 파일 다운로드: {환자이름}_measurements.csv
```

#### 차트 시스템

**성장 차트 (Growth Chart)**
```
Chart.js scatter + line 혼합 차트
  데이터셋:
  1. 백분위 참조선 7개 (P5, P10, P25, P50, P75, P90, P95)
     → generateCurveData(gender, pKey): 나이 4~18세, 0.5세 간격
  2. 환자 우안(OD) 데이터 포인트 (시안 #0891b2)
  3. 환자 좌안(OS) 데이터 포인트 (로즈 #e11d48)
  4. 치료 시점 수직 점선 (annotation 플러그인)

  축:
  X축: 나이 (4~18세)
  Y축: 안축장 (20~29mm)
```

**진행 차트 (Progress Chart)**
```
Chart.js line 차트
  토글: 안축장(AL) / 굴절력(SE)
  데이터: 날짜별 OD/OS 값 추이

  진행 속도 라벨:
  progressLabel(records) 계산:
  - 마지막 두 측정 간 변화율
  - rate = (AL차이 / 개월수) × 12 → mm/년
  - ≤0.1: "안정" (초록)
  - ≤0.3: "보통" (노랑)
  - >0.3: "빠름" (빨강)
```

---

### 5.2 보호자 (Customer) 워크플로우

```
로그인 → login('customer')
  → setState({ currentUser: customer_profile })
  → navigate('customer')

화면 구성:
  1. 자녀 선택 영역
     - customer.children 배열과 patients 테이블 매칭
     - 매칭 기준: 이름 + 생년월일 일치
     - 칩/카드 형태로 표시

  2. 선택된 자녀 상세 (읽기 전용)
     - 환자 정보 바
     - 현재 상태 카드 (최신 측정값)
     - 치료 현황 (태그, 삭제 버튼 없음)
     - 성장 차트
     - 측정 기록 테이블 (삭제 버튼 없음)
     - 안내: "측정 데이터는 담당 안과에서 입력합니다"

자녀 선택:
  칩 클릭 → getPatientById(id)
  → setState({ currentPatient: child })
  → 상세 정보 재렌더링
```

---

### 5.3 관리자 (Admin) 워크플로우

```
로그인 → login('admin')
  → navigate('admin')

화면 구성:
  1. 통계 카드 4개
     getStats() → 병렬 쿼리:
     - 전체 환자 수 (patients COUNT)
     - 등록 의사 수 (profiles WHERE role='doctor' COUNT)
     - 안과 수 (clinics COUNT)
     - 승인 대기 건수 (approval_requests WHERE status='pending' COUNT)

  2. 탭 네비게이션
     - "승인 관리" 탭 (기본)
     - "안과 관리" 탭

승인 관리:
  getApprovalRequests() → 대기 중인 요청 목록
  각 요청에 "승인" / "거부" 버튼

  승인 처리:
    "승인" 클릭 → approveRequest(id)
    → approval_requests.status = 'approved'
    → profiles.approved = true (해당 의사)
    → 화면 재렌더링

  거부 처리:
    "거부" 클릭 → rejectRequest(id)
    → approval_requests.status = 'rejected'
    → 화면 재렌더링

안과 관리:
  getClinics() → 전체 안과 목록 테이블
```

---

### 5.4 비로그인 환자 조회

```
[로그인 화면] "환자조회" 탭 선택
  → 입력: 환자 이름, 생년월일, (선택) 등록번호
  → "조회하기" 클릭
  → searchPatientByInfo(name, birthDate)
  → DB 쿼리: patients WHERE name = ? AND birth_date = ?

  찾은 경우:
    → setState({ currentPatient: patient })
    → navigate('patient-result')
    → 환자 정보 + 통계 + 치료 + 차트 + 측정 테이블 표시
    → 안내: "더 자세한 기록 관리를 원하시면 회원가입 후 이용해주세요"

  못 찾은 경우:
    → "일치하는 환자를 찾을 수 없습니다" 오류 표시
```

---

### 5.5 회원가입 프로세스

```
[로그인 화면] → "회원가입" 탭 → #register 이동

Step 1: 계정 유형 선택
  - "안과의사" 또는 "보호자" 선택
  - "다음" 클릭

Step 2: 안과 연결
  - getClinics() → 안과 목록 표시
  - 검색 필터 지원
  - 안과 선택 → "다음" 클릭

Step 3: 상세 정보
  보호자인 경우:
    - 자녀 이름 + 생년월일 입력
    - "추가" → children 배열에 추가 (복수 등록 가능)
    - "가입 완료" → #login 이동

  의사인 경우:
    - 의사 이름 입력
    - 안내: "관리자 승인이 필요합니다"
    - "승인 요청" → approval_requests에 INSERT
    → #pending 이동

[승인 대기 화면]
  - "승인 대기 중입니다" 메시지
  - 관리자가 승인할 때까지 대기
  - 로그아웃만 가능
```

---

## 6. 컴포넌트 사용 관계

```
화면(Screen)           사용하는 컴포넌트
──────────────        ─────────────────
loginScreen           navbar
doctorScreen          navbar, sidebar, bottomNav, statsCard,
                      treatmentTags, measurementTable, patientInfoBar,
                      growthChart, progressChart, modal
customerScreen        navbar, bottomNav, statsCard, treatmentTags,
                      measurementTable, patientInfoBar, growthChart
adminScreen           navbar
registerScreen        navbar
pendingScreen         navbar
patient-result        navbar, statsCard, treatmentTags,
(main.js 인라인)       measurementTable, patientInfoBar, growthChart
```

---

## 7. 반응형 레이아웃

| 화면 요소 | 데스크탑 (≥768px) | 모바일 (<768px) |
|-----------|-------------------|-----------------|
| 환자 목록 | 좌측 사이드바 (240px) | 상단 가로 스크롤 칩 |
| 컨텐츠 그리드 | 2컬럼 | 1컬럼 |
| 하단 네비게이션 | 숨김 | 고정 표시 |
| 측정 테이블 | 전체 표시 | 가로 스크롤 |
| 네비바 사용자 정보 | 이름+안과 표시 | 아이콘만 표시 |

---

## 8. 보안 체계 (RLS)

### Row Level Security 정책

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| clinics | 모두 가능 | 의사만 | - | - |
| profiles | 본인 또는 관리자 | 본인 | 본인 | - |
| patients | 같은 안과 의사 또는 관리자 | 같은 안과 의사 | - | 같은 안과 의사 |
| measurements | 환자의 안과 소속인 경우 | 같은 안과 의사 | - | 같은 안과 의사 |
| treatments | 환자의 안과 소속인 경우 | 같은 안과 의사 | - | 같은 안과 의사 |
| approval_requests | 본인 또는 관리자 | 본인 | 관리자만 | - |

### 도우미 함수
```sql
get_my_role()      → 현재 로그인 사용자의 role 반환
get_my_clinic_id() → 현재 로그인 사용자의 clinic_id 반환
```

---

## 9. 세션 생명주기

```
앱 시작
  │
  ├─ getCurrentUser() → Supabase auth 세션 확인
  │   ├─ 세션 있음 → profiles 조회 → setState → 역할별 라우팅
  │   └─ 세션 없음 → 로그인 화면 표시
  │
  ├─ 로그인
  │   → Supabase signIn/signUp
  │   → 프로필 조회
  │   → setState({ currentUser })
  │   → 역할별 대시보드로 이동
  │
  ├─ 페이지 새로고침
  │   → Supabase 자동 세션 복원
  │   → getCurrentUser() → 기존 세션 유지
  │
  └─ 로그아웃
      → Supabase signOut
      → setState({ currentUser: null, currentPatient: null })
      → navigate('login')
```

---

## 10. 전체 액션 요약 테이블

| 화면 | 액션 | API 호출 | 상태 변경 | 이동 |
|------|------|----------|-----------|------|
| 로그인 | 의사 체험 | login('doctor') | currentUser | #doctor |
| 로그인 | 보호자 체험 | login('customer') | currentUser | #customer |
| 로그인 | 관리자 체험 | login('admin') | currentUser | #admin |
| 로그인 | 환자 조회 | searchPatientByInfo() | currentPatient | #patient-result |
| 의사 | 환자 검색 | searchPatients() | - | 재렌더링 |
| 의사 | 환자 선택 | getPatientById() | currentPatient | 재렌더링 |
| 의사 | 환자 등록 | addPatient() | currentPatient | 재렌더링 |
| 의사 | 측정 추가 | addMeasurement() | currentPatient | 재렌더링 |
| 의사 | 측정 삭제 | deleteRecord() | currentPatient | 재렌더링 |
| 의사 | 치료 추가 | addTreatment() | currentPatient | 재렌더링 |
| 의사 | 치료 삭제 | removeTreatment() | currentPatient | 재렌더링 |
| 의사 | 차트 토글 | - | currentChartType | 차트 갱신 |
| 의사 | CSV 내보내기 | exportCSV() | - | 파일 다운로드 |
| 보호자 | 자녀 선택 | getPatientById() | currentPatient | 재렌더링 |
| 관리자 | 의사 승인 | approveRequest() | - | 재렌더링 |
| 관리자 | 의사 거부 | rejectRequest() | - | 재렌더링 |
| 모든 화면 | 로그아웃 | logout() | 전체 초기화 | #login |
