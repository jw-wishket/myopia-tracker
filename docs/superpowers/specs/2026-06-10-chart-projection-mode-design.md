# 성장 차트 18세 예측 — 추세 연장 모드 + 관리자 설정 설계

- **날짜:** 2026-06-10
- **브랜치:** `feature/chart-projection-mode`
- **상태:** 승인됨 (구현 계획 작성 단계로 진행)

## 1. 배경 & 목표

성장 차트의 "18세 예측" 점선은 현재 `myopiaModel.js`의 `projectToAge()`가 담당한다. 이는 **마지막 측정 1점의 백분위를 구해 그 백분위 곡선을 18세까지 그대로 추종**하는 방식이다(백분위 추종). 예측 안축장(predictedAL)·우측 굴절 패널·위험도 게이지가 모두 이 값에서 파생된다.

목표: 환자의 **측정점 추세(기울기)를 18세까지 직선 연장**하는 예측 모드를 추가하고, 두 모드를 **관리자가 전환**할 수 있게 한다. 기본값은 새 방식(추세 연장).

## 2. 확정된 결정사항

| 항목 | 결정 |
|------|------|
| 기울기 계산 | **최소제곱 회귀 (전체 측정점)** |
| 옵션 적용 범위 | **예측 전체 일관 적용** (점선 + 18세 예측 AL 라벨 + 굴절 패널 + 위험도) |
| 기본 모드 | **추세 연장** (관리자가 백분위로 전환 가능) |
| 설정 주체/범위 | **전역 단일 설정**, 관리자(is_admin)만 변경 |
| 추세선 형태 | **마지막 측정점 앵커 + 회귀 기울기**로 18세까지 직선 |
| 데이터 부족 시 | 측정 2개 미만/분모 0 → **백분위 추종으로 자동 폴백** |
| 극단값 보호 | `predictedAL`을 **[18, 32]mm로 클램프** |

## 3. 예측 알고리즘 (`src/myopiaModel.js`)

### 신규 함수
- `regressionSlope(points)` — `points: [{x:age, y:AL}]`. 최소제곱 기울기 반환. `n<2` 또는 Σ(x−x̄)²==0 이면 `null`.
- `projectByTrend(eyePoints, toAge = 18)`:
  - `slope = regressionSlope(eyePoints)`; `null`이면 `null` 반환(호출부가 폴백).
  - `last = eyePoints[마지막]`; `rawPredicted = last.y + slope·(toAge − last.x)`.
  - `predictedAL = clamp(rawPredicted, 18, 32)`.
  - 반환: `{ mode:'trend', slope, points:[{x:last.x,y:last.y},{x:toAge,y:predictedAL}], predictedAL }`.
  - (반환 형태는 `projectToAge`의 `{ points, predictedAL }`와 호환 — 차트/패널/게이지 변경 불필요)

### 변경 함수
- `_eyeModel(gender, records, alKey, mode = 'percentile')`:
  - 측정점 `points` 생성.
  - `mode==='trend'` → `projection = projectByTrend(points, 18)`.
  - `projection`이 없으면(백분위 모드 또는 trend 폴백) → 기존 `projectToAge(gender, lastAge, lastAL, 18)`.
  - 나머지(`predSE = predictAdultRefraction(projection.predictedAL)`) 동일.
- `_riskFor(gender, records, mode)` — `mode`를 `_eyeModel`로 전달.
- `computeChartModel(patient, projectionMode = 'percentile')` — `mode`를 `_eyeModel`/`_riskFor`로 전달.
  - 함수 기본값을 `'percentile'`로 둬 **기존 36개 테스트가 그대로 통과**(테스트는 인자 없이 호출). 앱은 항상 설정값(기본 'trend')을 명시 전달.

### 테스트 (`src/myopiaModel.test.js`에 추가)
- `projectByTrend`: 양/음 기울기 산출, [18,32] 클램프, `n<2`/동일나이 → `null`(폴백 트리거).
- `computeChartModel(patient, 'trend')`: od/os projection이 추세 기반(2점 직선, predictedAL = 클램프된 추세값)임을 검증.
- 기존 `projectToAge`/`computeChartModel`(인자 없음) 테스트는 변경 없이 통과해야 함.

## 4. 설정 저장 (Supabase — 추가 마이그레이션, wipe 없음)

신규 마이그레이션 `supabase/migrations/<ts>_app_settings.sql`:
```sql
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
insert into public.app_settings (key, value) values ('projection_mode', 'trend')
  on conflict (key) do nothing;
```
- `projection_mode` 도메인: `'trend' | 'percentile'` (클라이언트 검증).

### 서비스 (`src/data/services/settings.js`, 신규)
```js
export async function getSetting(key)        // select value, maybeSingle, null 가능
export async function setSetting(key, value) // upsert(key,value,updated_at,updated_by) + logAudit('update_setting','app_settings',null,{key,value})
```
- `dataService.js` 배럴에 `export * from './services/settings.js';` 추가.

## 5. 앱 배선

- **`src/main.js`** 세션 복원: `getCurrentUser` 성공 후 `getSetting('projection_mode')` 조회 → `setState({ projectionMode: value || 'trend' })`. (비로그인/실패 시 'trend' 폴백.)
- **`src/state.js`**: `_state`에 `projectionMode: 'trend'` 추가.
- **`src/screens/doctorScreen.js`**: `initGrowthChart('growthChart', selectedPatient, getState().projectionMode || 'trend')`.
- **`src/components/growthChart.js`**:
  - `initGrowthChart(canvasId, patient, projectionMode = 'trend')` → `computeChartModel(patient, projectionMode)`.
  - `renderGrowthChart(canvasId, patient, projectionMode = 'trend')` → 범례 "18세 예측"을 `18세 예측 · ${mode==='trend'?'추세 연장':'백분위 추종'}`로 표기. (doctorScreen이 템플릿에서 `renderGrowthChart`에 mode 전달.)
  - (DOM 계층 함수는 앱 기본값 'trend'로 통일. 순수 모델 함수 `computeChartModel`만 기존 테스트 호환을 위해 'percentile' 기본 유지 — 앱은 항상 명시 전달하므로 실제 동작은 설정값을 따른다.)

## 6. 관리자 UI (`src/screens/adminScreen.js`)

- 탭 추가: 기존 `사용자` / `치료종류` + **`예측 설정`** (activeTab 'settings').
- 데이터 로드에 현재 `projection_mode` 포함(`getSetting`).
- `renderSettings(currentMode)`: 라디오 2개(`백분위 추종` / `추세 연장`) + 간단 설명.
- 변경 핸들러: `setSetting('projection_mode', value)` 성공 시 `setState({ projectionMode: value })` 후 재렌더. (관리자가 대시보드로 돌아가면 즉시 반영; 타 사용자는 새로고침 시.)
- import에 `getSetting, setSetting` 추가.

## 7. 엣지 케이스 / 동작

- 측정 0개: 기존과 동일(eye=null, 예측·차트 없음).
- 측정 1개: 추세 불가 → 백분위 추종 폴백(1점에서 동작).
- 음의 기울기(AL 감소, 측정오차): 추세선 하강 — 그대로 표시.
- 급진행: rawPredicted가 32 초과면 32로 클램프(라벨·굴절·위험도 모두 클램프값 사용). 점선 끝점도 클램프값이므로 라벨과 일치. y축(20–28)이 시각적으로 상단 클립.
- 설정 읽기 실패: 'trend' 폴백(차트는 항상 그려짐).

## 8. 검증 기준 (Acceptance)

1. `npm run build` 성공, `npm test` 전체 통과(기존 36 + 신규 추세 테스트).
2. 기본 상태(설정 미변경): 차트 점선이 **마지막 측정점에서 회귀 기울기로 18세까지 직선** 연장, 범례 "추세 연장" 표기, 18세 예측 AL·굴절·위험도가 추세값 기반.
3. 관리 화면 "예측 설정"에서 **백분위 추종으로 전환** → 대시보드 점선이 백분위 곡선 추종으로 바뀌고 라벨/굴절/위험도도 백분위 기반으로 일관 변경.
4. 측정 1개 환자: 추세 모드여도 백분위 폴백으로 정상 표시(에러 없음).
5. 비관리자(간호사)는 "예측 설정" 탭/변경 불가(관리 화면 자체가 is_admin 전용); RLS로 app_settings 쓰기 차단.

## 9. 적용 / 배포 노트

- 추가형 마이그레이션이므로 데이터 보존, `supabase db push`로 적용(직전 `db reset --linked`로 마이그레이션 히스토리 동기화됨). 적용 단계는 사용자 실행 또는 안내.
- Vercel 환경변수/프로젝트 변경 없음(같은 프로젝트).

## 10. 가정 / 범위 외

- 환자별 모드 오버라이드는 범위 외(전역 단일 설정).
- 추세선은 마지막 점 앵커 방식(순수 회귀선 표시는 채택 안 함).
- 다른 사용자 세션 실시간 반영은 범위 외(새로고침 시 반영).
- 클램프 경계(18/32)는 입력 검증 AL 범위와 일치시켜 고정.
