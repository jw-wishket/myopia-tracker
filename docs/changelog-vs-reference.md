# 근시관리 트래커 - 레퍼런스 대비 개선 사항

## 개요
원본 레퍼런스(reference-index.html)는 Firebase 기반 단일 HTML 파일(2,021줄)이었습니다.
현재 버전은 Vite + Supabase 기반 모듈화된 SPA로 완전히 재구축되었으며, 다음과 같은 개선이 이루어졌습니다.

---

## 아키텍처 개선

| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 구조 | 단일 HTML 파일 (2,021줄) | 모듈화된 SPA (30+ 파일) |
| 빌드 | 없음 (CDN 직접 로드) | Vite 8 + 빌드 최적화 |
| 스타일 | 인라인 CSS (~165줄) | Tailwind CSS 4 + 커스텀 테마 |
| 백엔드 | Firebase Firestore | Supabase (PostgreSQL + Auth + RLS) |
| 인증 | Firebase Auth | Supabase Auth (이메일/비밀번호) |
| 배포 | 없음 | Vercel 자동 배포 (Git push) |
| 보안 | 클라이언트 측 규칙 | Row Level Security (DB 레벨) |
| 상태관리 | 전역 변수 | Observer 패턴 상태 관리 |

---

## UI/UX 개선

### 디자인 시스템
- **레퍼런스**: 기본적인 CSS, 무거운 그림자, 이모지 아이콘
- **현재**: Geist 폰트, 미니멀 디자인, SVG 아이콘, 1px 보더, 넉넉한 여백
- Glass-morphism 네비바 (backdrop-blur)
- 반응형 디자인 (데스크탑 사이드바 ↔ 모바일 하단 네비)

### 로그인 화면
- **레퍼런스**: 이메일/비밀번호 + Google + 익명
- **현재**: 안과 선택 드롭다운 + 이름+생년월일/관리번호 조회 + 이메일 로그인 + 회원가입 위저드
- 비밀번호 찾기 기능 추가
- Enter 키 지원
- 한국어 에러 메시지

### 의사 대시보드
- **레퍼런스**: 기본 환자 목록 + 차트 + 테이블
- **현재**: 추가된 기능:
  - 환자 수정/삭제
  - 측정값 범위 검증 (AL 18~32mm, SE -30~+8D)
  - 중복 날짜 경고
  - 이전 측정값 모달 내 표시
  - 측정 기간 필터 (전체/1년/6개월)
  - CSV 가져오기 (Import)
  - 전체 클리닉 데이터 내보내기
  - 인쇄용 리포트
  - 동기화 상태 토스트

---

## 신규 기능 (레퍼런스에 없음)

### 진행 분석 시스템
| 기능 | 설명 |
|------|------|
| 진행 속도 분석 | 6개월/1년/전체 기간별 AL 변화율 + 4단계 평가 |
| 치료 효과 분석 | 치료 시작 전후 진행 속도 비교 + 변화율(%) |
| 구간별 진행 속도 | 측정 구간별 상세 변화량/속도 테이블 |
| 빠른 진행 경고 | 빨간 경고 박스 + 사이드바 카운트 + 환자별 빨간 점 표시 |

### 치료 관리
| 기능 | 설명 |
|------|------|
| 치료 종료일 | 시작~종료 기간 표시, 종료 처리 버튼 |
| 치료 종류 DB 관리 | 관리자가 치료 종류 추가/삭제, 의사가 직접 입력 가능 |
| 색상별 태그 | 치료 종류별 컬러 코딩 |

### 환자 메모/노트
- 환자별 의사 메모 기록 (CRUD)
- 날짜/시간 표시
- DB 저장 (notes 테이블)

### 추적 검사 시스템
| 기능 | 설명 |
|------|------|
| 자동 다음 검사일 | 측정 입력 시 6개월 후 자동 설정 |
| 과기 환자 알림 | 검사 예정일 초과 환자 목록 (노란 경고바) |

### 데이터 백업/복원
| 기능 | 설명 |
|------|------|
| CSV Import | 파일 업로드로 측정 데이터 일괄 등록 |
| CSV Export (개별) | 환자별 측정 데이터 내보내기 |
| CSV Export (전체) | 클리닉 전체 데이터 내보내기 |
| 차트 이미지 저장 | 성장 차트 PNG 다운로드 |

### 보호자 기능
| 기능 | 설명 |
|------|------|
| 자녀 관리 | 가입 후 자녀 추가/수정/삭제 |
| 다중 안과 지원 | 자녀별 다른 안과 연결 가능 |
| 최근 측정일 표시 | 자녀 카드에 마지막 측정 날짜 |
| NEW 배지 | 7일 이내 측정 시 표시 |
| 리포트 출력 | 인쇄용 임상 요약 보기 |

### 관리자 기능
| 기능 | 레퍼런스 | 현재 |
|------|---------|------|
| 승인 관리 | 있음 | 있음 (동일) |
| 안과 관리 | 목록만 | 추가/수정/삭제 + 의사/환자 수 표시 |
| 의사 목록 | 없음 | 전체 의사 조회 + 승인 취소 + 비활성화 |
| 환자 목록 | 없음 | 전체 환자 조회 + 검색 필터 |
| 치료 관리 | 없음 | 치료 종류 추가/삭제 + 색상 관리 |
| 통계 | 기본 카운트 | 4개 통계 카드 (환자/의사/안과/대기) |

### 보안 개선
| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 인증 | Firebase Auth (클라이언트) | Supabase Auth + RLS (서버) |
| 환자 조회 | 이름+생일만 | 안과 선택 필수 + 이름+(생일 OR 관리번호) |
| 데이터 접근 | 클라이언트 규칙 | Row Level Security (PostgreSQL) |
| 감사 로그 | 없음 | 모든 CRUD 작업 기록 (audit_log 테이블) |
| 계정 관리 | 없음 | 계정 비활성화 기능 |
| 환자 중복 | 없음 | 같은 안과 내 이름+생일 중복 차단 |

### 차트 개선
| 항목 | 레퍼런스 | 현재 |
|------|---------|------|
| 성장 차트 | 있음 (동일 구조) | 워터마크 추가 |
| 진행 차트 | AL만 | AL/SE 토글 |
| 차트 저장 | saveChartAsImage | 이미지 저장 버튼 |

### 기타
- 로딩 오버레이 (페이지 전환 시)
- 동기화 상태 토스트 (저장/삭제 시)
- 비밀번호 변경 기능
- 모바일 하단 네비게이션 동작 연결
- 등록번호 자동 생성 (내부용)
- 관리번호 (안과별 독립)

---

## 데이터 모델 개선

### 레퍼런스 (Firebase)
```
users → { email, name, role, clinicId, children[] }
patients → { name, birthDate, gender, regNo, records[], treatments[] }
clinics → { name }
approvalRequests → { userId, status }
```

### 현재 (Supabase PostgreSQL)
```
profiles → { email, name, role, approved, clinic_id, children[] }
patients → { name, birth_date, gender, reg_no, custom_ref, clinic_id, next_visit_date }
measurements → { patient_id, date, age, od_al, os_al, od_se, os_se, od_pct, os_pct }
treatments → { patient_id, type, date, age, end_date }
clinics → { name, created_by }
treatment_types → { name, color, sort_order, is_active }
notes → { patient_id, content, created_by }
approval_requests → { user_id, email, name, clinic_name, status }
audit_log → { user_id, action, entity_type, entity_id, details }
```

주요 변경:
- records/treatments 배열 → 별도 테이블로 정규화
- 감사 로그 테이블 추가
- 환자 메모 테이블 추가
- 치료 종류 관리 테이블 추가
- 치료 종료일 필드 추가
- 추적 검사일 필드 추가
- 관리번호(custom_ref) 필드 추가

---

## 파일 구조 비교

### 레퍼런스
```
index.html (2,021줄 단일 파일)
```

### 현재
```
30+ 모듈 파일
├── src/main.js, router.js, state.js, constants.js, utils.js, style.css
├── src/data/ (supabaseClient, dataService, mockData)
├── src/components/ (12개 컴포넌트)
├── src/screens/ (6개 화면)
├── supabase/migrations/ (7개 마이그레이션)
├── docs/ (4개 문서)
└── scripts/seed.mjs
```
