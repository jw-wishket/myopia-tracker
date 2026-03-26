# 근시관리 트래커 (Myopia Management Tracker)

## 프로젝트 개요

안과 환자의 근시 진행을 추적하고 관리하는 반응형 SPA 웹 애플리케이션.
의사가 환자 데이터를 입력하고, 보호자는 자녀의 기록을 조회하는 구조.

## 기술 스택

- **빌드:** Vite 8
- **스타일:** Tailwind CSS 4 (`@tailwindcss/vite` 플러그인)
- **차트:** Chart.js 4 + chartjs-plugin-annotation 3
- **언어:** Vanilla JS (ES Modules)
- **데이터:** localStorage (Supabase 전환 예정)
- **배포 예정:** Vercel

## 실행 방법

```bash
npm run dev      # 개발 서버 (Vite)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 프로젝트 구조

```
src/
├── main.js              # 엔트리: 라우터 등록, 인증 가드, 세션 복원
├── router.js            # 해시 기반 SPA 라우터 (#login, #doctor 등)
├── state.js             # 전역 상태 관리 (observer 패턴)
├── constants.js         # 백분위 참조 데이터, 치료 색상, 차트 스타일
├── utils.js             # calcAge, calcPct, interpolateValue 등
├── style.css            # Tailwind 디렉티브 + 커스텀 테마 변수
├── data/
│   ├── mockData.js      # 데모 사용자/환자/안과/승인요청 데이터
│   └── dataService.js   # CRUD 서비스 (localStorage 기반)
├── components/
│   ├── navbar.js        # 상단 네비게이션 바 (로그아웃, 뒤로가기)
│   ├── bottomNav.js     # 모바일 하단 탭 네비게이션
│   ├── sidebar.js       # 의사 대시보드 환자 목록 사이드바
│   ├── statsCard.js     # OD/OS 측정 통계 카드
│   ├── treatmentTags.js # 치료 기록 태그 (추가/삭제 지원)
│   ├── measurementTable.js # 측정 기록 테이블 (삭제 지원)
│   ├── growthChart.js   # 성장 차트 (백분위 곡선 + 치료 주석)
│   ├── progressChart.js # 진행 차트 (AL/SE 시간 추이)
│   ├── patientInfoBar.js # 환자 정보 헤더 바
│   └── modal.js         # 범용 모달 컴포넌트
└── screens/
    ├── loginScreen.js       # 로그인/환자조회/회원가입 탭
    ├── doctorScreen.js      # 의사 대시보드 (환자 관리 전체)
    ├── customerScreen.js    # 보호자 대시보드 (읽기 전용)
    ├── adminScreen.js       # 관리자 대시보드 (승인/통계)
    ├── registerScreen.js    # 3단계 회원가입 위저드
    └── pendingScreen.js     # 의사 승인 대기 화면
```

## 라우팅

| 해시 | 화면 | 인증 | 설명 |
|------|------|------|------|
| `#login` | loginScreen | 불필요 | 기본 화면, 3개 탭 |
| `#register` | registerScreen | 불필요 | 역할→안과→자녀 등록 |
| `#pending` | pendingScreen | 불필요 | 의사 승인 대기 |
| `#doctor` | doctorScreen | 필요 | 의사 전용 환자 관리 |
| `#customer` | customerScreen | 필요 | 보호자 읽기 전용 |
| `#admin` | adminScreen | 필요 | 관리자 전용 |
| `#patient-result` | (인라인) | 불필요 | 환자 검색 결과 |

## 사용자 역할

- **의사 (doctor):** 환자 등록, 측정 입력, 치료 기록, CSV 내보내기
- **보호자 (customer):** 자녀 측정/차트/치료 읽기 전용 조회
- **관리자 (admin):** 의사 승인/거부, 전체 통계
- **체험 모드:** 로그인 없이 데모 데이터로 각 역할 체험

## 데이터 모델

### 환자 (Patient)
```js
{ id, regNo, name, birthDate, gender, clinicId, records[], treatments[] }
```

### 측정 기록 (Record)
```js
{ date, age, odAL, osAL, odSE, osSE, odPct, osPct }
```
- `odAL/osAL`: 안축장 (mm), `odSE/osSE`: 굴절력 (D)
- `odPct/osPct`: 백분위 (자동 계산)

### 치료 (Treatment)
```js
{ type, date, age }
```
- 종류: 아트로핀 0.01~0.1%, 드림렌즈, 마이사이트, PPSL

## 핵심 비즈니스 로직

### 백분위 계산
- `constants.js`에 4~18세 남/여 P3~P95 참조 데이터 내장
- `utils.js`의 `calcPct(gender, age, al)`: 성별/나이/안축장으로 백분위 산출
- `interpolateValue()`: 연령 간 선형 보간

### 성장 차트
- Chart.js scatter + line 혼합
- 7개 백분위 참조선 (P5, P10, P25, P50, P75, P90, P95)
- 치료 시점 수직선 annotation
- OD: cyan (#0891b2), OS: rose (#e11d48)

## Supabase 전환 가이드

`src/data/dataService.js`만 교체하면 됨. 현재 export하는 함수 목록:

```
login(role), logout(), getCurrentUser()
getPatients(clinicId), getPatientById(id), searchPatients(query, clinicId)
searchPatientByInfo(name, birthDate), addPatient(patient), deletePatient(id)
addMeasurement(patientId, record), deleteRecord(patientId, index)
addTreatment(patientId, treatment), removeTreatment(patientId, index)
getClinics(), getApprovalRequests(), approveRequest(id), rejectRequest(id)
getStats(), resetData()
```

이 API를 동일하게 유지하면서 내부를 Supabase 호출로 교체하면 나머지 코드 변경 없이 전환 가능.

## 디자인 시스템

- **폰트:** Geist + Noto Sans KR
- **Primary:** #2563eb (Blue 600)
- **OD 색상:** #0891b2 (Cyan), **OS 색상:** #e11d48 (Rose)
- **카드:** 흰색 배경, 1px slate-200 보더, 12px 라운드
- **반응형:** Desktop (사이드바+2컬럼) / Mobile (단일컬럼+하단네비)
