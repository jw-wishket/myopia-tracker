# 프로젝트 인수인계 가이드 (HANDOVER)

근시관리 트래커를 다른 운영자에게 완전히 이전할 때 필요한 절차 정리.
기술 스택·구조·개발 규칙은 [CLAUDE.md](./CLAUDE.md) 참조.

## 현재 운영 정보

| 항목 | 값 |
|------|-----|
| 프로덕션 URL | https://myopia-tracker.vercel.app |
| 소스 저장소 | GitHub `jw-wishket/myopia-tracker` |
| 호스팅 | Vercel (master 푸시 시 자동 배포) |
| DB/인증 | Supabase 프로젝트 `myopia-tracker` (ref: `rwqggjbozibuyajdluqn`) |

## 필요한 계정

인수자는 아래 3개 서비스 계정이 필요하다 (모두 무료 플랜으로 시작 가능):

1. **GitHub** — 소스 코드
2. **Vercel** — 호스팅·자동 배포
3. **Supabase** — PostgreSQL DB + 인증(Auth)

## 인수 절차

### 1단계: GitHub 리포 이전

1. 현 소유자: 리포 → Settings → Danger Zone → **Transfer ownership** → 인수자 계정 입력
2. 커밋 히스토리·이슈 등이 그대로 유지된다.

### 2단계: Supabase 이전 — 두 가지 중 선택

**옵션 A. 기존 프로젝트 그대로 인수 (권장 — 데이터·계정·URL 유지)**

1. 현 소유자: Supabase 대시보드 → Organization → Members → 인수자 이메일 **초대**
2. 인수자 가입·수락 후 **Owner로 승격**
3. 현 소유자가 조직에서 탈퇴
4. 프로젝트 URL·anon key가 그대로이므로 Vercel 환경 변수도 그대로 사용 가능

**옵션 B. 새 프로젝트로 시작 (빈 DB — 기존 데이터·계정 모두 버림)**

1. 인수자: Supabase에서 새 프로젝트 생성
2. 리포에서 마이그레이션 적용:
   ```bash
   npx supabase login
   npx supabase link --project-ref <새 프로젝트 ref>
   echo "y" | npx supabase db push
   ```
3. 새 프로젝트의 URL·anon key를 받아 3단계에서 사용
4. **최초로 회원가입하는 계정이 자동으로 관리자(is_admin)가 된다** — 인수자가 먼저 가입할 것

### 3단계: Vercel 배포 셋업

1. 인수자: Vercel에서 **Add New → Project** → 이전받은 GitHub 리포 import
2. Settings → Environment Variables에 등록 (`.env`와 동일한 값):
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. 배포 후 도메인 확인. `myopia-tracker.vercel.app` 주소를 유지하려면:
   - 현 소유자가 기존 Vercel 프로젝트를 **삭제**한 뒤
   - 인수자가 프로젝트 이름을 `myopia-tracker`로 지정 (선점되지 않았다면 같은 주소를 받음 — 보장은 아님)

### 4단계: 별도 전달 항목 (git에 없음)

- **`.env` 파일 값** — 옵션 A면 현재 값 그대로 전달, 옵션 B면 새 값
- Supabase 대시보드 접근 권한 (2단계에서 처리됨)

## 인계 시점의 데이터 상태 (2026-06 기준)

현재 DB에는 **테스트용 데이터**가 들어 있다. 실 운영 전 정리 여부를 결정할 것:

- **데모 계정**: `demo@example.com` (doctor, 비관리자) — 비밀번호는 `scripts/seed-sample-patients.mjs` 참조. **실 운영 전 삭제 또는 비밀번호 변경 권장**
- **관리자 계정**: 현 소유자의 계정 (최초 가입, is_admin)
- **샘플 환자 12명**: 김도윤·이서윤(DEMO-001~002) + 박지호~송은우(DEMO-003~012), 측정·치료·메모 포함
- 샘플 데이터 재생성: `node scripts/seed-sample-patients.mjs` (멱등 — 이미 있으면 건너뜀)

초기화하려면 Supabase 대시보드 → Table Editor에서 patients 삭제(측정·치료·메모는 FK cascade), Authentication → Users에서 계정 삭제.

## 로컬 개발

```bash
git clone <리포>
cd myopia-tracker
npm install
# .env 파일 생성 (위 환경 변수 2개)
npm run dev      # 개발 서버
npm test         # 단위 테스트 (vitest)
npm run build    # 프로덕션 빌드
```

## 운영 시 알아둘 것

- **권한 구조**: 의사·간호사는 동일한 진료 권한. 관리자(is_admin)만 계정 승인·관리자 부여·치료종류 관리 가능. 신규 가입자는 **관리자 승인(계정 활성화) 후** 로그인 가능
- **보안**: 모든 테이블 RLS 적용. 정책 수정 시 [CLAUDE.md](./CLAUDE.md) "개발 주의사항" 필독 (`using(true)` 금지 등)
- **Supabase 무료 플랜**: 일정 기간 미사용 시 DB가 일시정지되어 첫 접속이 2~5초 느림. 실 운영 시 Pro 플랜 권장
- **마이그레이션**: 스키마 변경은 반드시 `npx supabase migration new <이름>` → SQL 작성 → `db push` 절차로 (대시보드에서 직접 수정하면 리포와 어긋남)
