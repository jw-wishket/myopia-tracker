# 성장 차트 추세 연장 예측 모드 + 관리자 설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 성장 차트 18세 예측을 "측정점 추세 직선 연장(최소제곱 회귀)" 모드로 추가하고, 관리자가 백분위 추종/추세 연장을 전환하는 전역 설정을 제공한다 (기본값 추세).

**Architecture:** 순수 모델(`myopiaModel.js`)에 `projectByTrend` 추가 + `computeChartModel(patient, mode)`로 모드 주입(예측 전체 일관). 전역 설정은 신규 `app_settings`(Supabase, admin-write RLS)에 저장하고 `settings.js`로 읽고 쓰며, 앱 초기화 시 `state.projectionMode`로 적재해 `doctorScreen → growthChart`로 전달. 관리 화면에 "예측 설정" 탭 추가.

**Tech Stack:** Vanilla JS ESM + Vite 8, Chart.js 4.5, Supabase(Postgres+RLS), Vitest 3.

**Spec:** `docs/superpowers/specs/2026-06-10-chart-projection-mode-design.md`
**Branch:** `feature/chart-projection-mode` (이미 체크아웃됨)

---

## 검증 방식 (먼저 읽기)

- 모델 변경은 **Vitest 단위테스트**로 TDD(`myopiaModel.test.js`). UI/DB 배선은 **`npm run build`**(끊긴 import 검출) + 수동 확인.
- **⚠️ 마이그레이션 게이트:** 런타임(설정 읽기/쓰기, 차트 모드 전환)은 **Task 6의 `app_settings` 마이그레이션이 원격 DB에 적용된 뒤에만** 검증 가능. Task 1~5,7~9는 build/test만으로 진행 가능.
- 커밋 시 `Co-Authored-By` 트레일러 추가 금지.

---

## Task 1: 모델 — `projectByTrend` + 모드 주입 (TDD)

**Files:**
- Modify: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패 테스트 작성.** `src/myopiaModel.test.js` 상단 import 줄(2행)에 `regressionSlope, projectByTrend`를 추가:

기존:
```js
import { interpolateValue, refValue, calcPercentile, calcPct, generatePercentileCurves, generateCurveData, projectToAge, alToRefraction, predictAdultRefraction, progressionRate, assessRisk, computeChartModel } from './myopiaModel.js';
```
변경:
```js
import { interpolateValue, refValue, calcPercentile, calcPct, generatePercentileCurves, generateCurveData, projectToAge, projectByTrend, regressionSlope, alToRefraction, predictAdultRefraction, progressionRate, assessRisk, computeChartModel } from './myopiaModel.js';
```

파일 끝(마지막 `});` 다음)에 아래 describe 블록들을 추가:
```js
describe('regressionSlope', () => {
  it('두 점의 기울기 = (y2-y1)/(x2-x1)', () => {
    expect(regressionSlope([{ x: 12.5, y: 24.20 }, { x: 13.4, y: 24.55 }])).toBeCloseTo(0.3889, 3);
  });
  it('1점이면 null', () => {
    expect(regressionSlope([{ x: 10, y: 23 }])).toBeNull();
  });
  it('동일 나이만 있으면(분모 0) null', () => {
    expect(regressionSlope([{ x: 10, y: 23 }, { x: 10, y: 24 }])).toBeNull();
  });
});

describe('projectByTrend', () => {
  it('마지막 점 앵커 + 회귀 기울기로 18세 예측', () => {
    const proj = projectByTrend([{ x: 12.5, y: 24.20 }, { x: 13.4, y: 24.55 }], 18);
    expect(proj.mode).toBe('trend');
    expect(proj.slope).toBeCloseTo(0.3889, 3);
    expect(proj.predictedAL).toBeCloseTo(26.34, 1);
    expect(proj.points[0]).toEqual({ x: 13.4, y: 24.55 });
    expect(proj.points[proj.points.length - 1].x).toBe(18);
  });
  it('급진행 예측은 32mm로 클램프', () => {
    const proj = projectByTrend([{ x: 10, y: 25 }, { x: 12, y: 28 }], 18);
    expect(proj.predictedAL).toBe(32);
  });
  it('측정 1개면 null(폴백 트리거)', () => {
    expect(projectByTrend([{ x: 10, y: 23 }], 18)).toBeNull();
  });
});

describe('computeChartModel projectionMode', () => {
  const patient = {
    gender: 'female',
    records: [
      { date: '2024-07-01', age: 12.5, odAL: 24.20, osAL: 24.22 },
      { date: '2025-12-01', age: 13.4, odAL: 24.55, osAL: 24.58 },
    ],
    treatments: [],
  };
  it('기본(인자 없음)은 백분위 추종 — 기존 동작 유지', () => {
    const m = computeChartModel(patient);
    expect(m.od.projection.mode).toBeUndefined();
    expect(typeof m.od.projection.percentile).toBe('number');
  });
  it("'trend' 모드는 추세 기반 예측(2점 직선)", () => {
    const m = computeChartModel(patient, 'trend');
    expect(m.od.projection.mode).toBe('trend');
    expect(m.od.projection.points.length).toBe(2);
    expect(m.od.projection.predictedAL).toBeCloseTo(26.34, 1);
  });
  it('측정 1개 + trend → 백분위 폴백', () => {
    const single = { gender: 'female', records: [{ date: '2025-12-01', age: 13.4, odAL: 24.55, osAL: 24.58 }], treatments: [] };
    const m = computeChartModel(single, 'trend');
    expect(m.od.projection.mode).toBeUndefined();
    expect(typeof m.od.projection.percentile).toBe('number');
  });
});
```

- [ ] **Step 2: 실패 확인.** Run: `npm test -- myopiaModel`
  Expected: FAIL — `regressionSlope`/`projectByTrend` not exported, `computeChartModel(patient,'trend')` no mode handling.

- [ ] **Step 3: 구현.** `src/myopiaModel.js`에서 `projectToAge`(85–99행) 바로 아래에 두 함수 추가:
```js
// regressionSlope: 최소제곱 기울기 (points: [{x,y}]). n<2 또는 분모 0이면 null.
export function regressionSlope(points) {
  const n = points.length;
  if (n < 2) return null;
  let meanX = 0, meanY = 0;
  for (const p of points) { meanX += p.x; meanY += p.y; }
  meanX /= n; meanY /= n;
  let num = 0, den = 0;
  for (const p of points) { num += (p.x - meanX) * (p.y - meanY); den += (p.x - meanX) ** 2; }
  if (den === 0) return null;
  return num / den;
}

// projectByTrend: 측정점 추세(회귀 기울기)를 마지막 점에 앵커해 toAge까지 직선 연장.
// 회귀 불가(<2점/동일나이)면 null → 호출부가 백분위 추종으로 폴백.
export function projectByTrend(eyePoints, toAge = 18) {
  const slope = regressionSlope(eyePoints);
  if (slope === null) return null;
  const last = eyePoints[eyePoints.length - 1];
  const raw = last.y + slope * (toAge - last.x);
  const predictedAL = Math.max(18, Math.min(32, raw));
  return {
    mode: 'trend',
    slope,
    points: [{ x: last.x, y: last.y }, { x: toAge, y: predictedAL }],
    predictedAL,
  };
}
```

`_eyeModel`(141–152행)을 교체:
```js
function _eyeModel(gender, records, alKey, mode = 'percentile') {
  const eyeRecords = records.filter((r) => Number.isFinite(r[alKey]));
  if (eyeRecords.length === 0) return null;
  const points = eyeRecords.map((r) => ({ x: r.age, y: r[alKey] }));
  let projection = mode === 'trend' ? projectByTrend(points, 18) : null;
  if (!projection) {
    const lr = eyeRecords[eyeRecords.length - 1];
    projection = projectToAge(gender, lr.age, lr[alKey], 18);
  }
  if (!projection) return null;
  return {
    points,
    projection,
    predSE: predictAdultRefraction(projection.predictedAL),
  };
}
```

`_riskFor`(154–163행) 시그니처에 `mode` 추가 + 전달:
```js
function _riskFor(gender, records, mode = 'percentile') {
  const od = _eyeModel(gender, records, 'odAL', mode);
  const os = _eyeModel(gender, records, 'osAL', mode);
  const ses = [od?.predSE.mean, os?.predSE.mean].filter((v) => v != null);
  if (ses.length === 0) return null;
  const worstSE = Math.min(...ses);
  const rates = [progressionRate(records, 'odAL'), progressionRate(records, 'osAL')].filter((v) => v != null);
  const maxRate = rates.length ? Math.max(...rates) : null;
  return { label: assessRisk(worstSE, maxRate), rate: maxRate };
}
```

`computeChartModel`(166행) 시그니처/호출 교체:
```js
export function computeChartModel(patient, projectionMode = 'percentile') {
```
그리고 내부 `_eyeModel`/`_riskFor` 호출 4곳에 `projectionMode` 전달:
```js
  const od = _eyeModel(gender, records, 'odAL', projectionMode);
  const os = _eyeModel(gender, records, 'osAL', projectionMode);

  const current = _riskFor(gender, records, projectionMode);
  const prev = records.length >= 3 ? _riskFor(gender, records.slice(0, -1), projectionMode) : null;
```

- [ ] **Step 4: 통과 확인.** Run: `npm test`
  Expected: PASS — 기존 36개 + 신규(regressionSlope 3 / projectByTrend 3 / computeChartModel projectionMode 3) 모두 통과.

- [ ] **Step 5: 커밋.**
```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat(model): trend projection (least-squares) with mode + clamp + fallback"
```

---

## Task 2: `app_settings` 마이그레이션 (파일 작성)

DB 적용은 Task 6. 이 태스크는 파일만.

**Files:**
- Create: `supabase/migrations/20260610010000_app_settings.sql`

- [ ] **Step 1: 마이그레이션 작성.** 정확히 아래 내용:
```sql
-- app_settings: 전역 key/value 설정(관리자 관리). RLS: 활성 staff 읽기, admin 쓰기.
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
-- 기본 예측 모드 = 추세 연장
insert into public.app_settings (key, value) values ('projection_mode', 'trend')
  on conflict (key) do nothing;
```

- [ ] **Step 2: 커밋.**
```bash
git add supabase/migrations/20260610010000_app_settings.sql
git commit -m "feat(db): app_settings table (admin-managed global config)"
```

---

## Task 3: `settings.js` 서비스 + 배럴

**Files:**
- Create: `src/data/services/settings.js`
- Modify: `src/data/dataService.js`

- [ ] **Step 1: 서비스 작성.** `src/data/services/settings.js`:
```js
import { supabase } from '../supabaseClient.js';
import { logAudit } from './helpers.js';

export async function getSetting(key) {
  const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

export async function setSetting(key, value) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('app_settings')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: user?.id });
  if (error) { console.error('setSetting error:', error); return false; }
  await logAudit('update_setting', 'app_settings', null, { key, value });
  return true;
}
```

- [ ] **Step 2: 배럴에 추가.** `src/data/dataService.js` 끝에 한 줄 추가:
```js
export * from './services/settings.js';
```
최종 파일:
```js
export * from './services/auth.js';
export * from './services/patients.js';
export * from './services/measurements.js';
export * from './services/treatments.js';
export * from './services/admin.js';
export * from './services/notes.js';
export * from './services/settings.js';
```

- [ ] **Step 3: 빌드.** Run: `npm run build` → 성공.

- [ ] **Step 4: 커밋.**
```bash
git add src/data/services/settings.js src/data/dataService.js
git commit -m "feat(settings): getSetting/setSetting service"
```

---

## Task 4: `state.js` — projectionMode 기본값

**Files:**
- Modify: `src/state.js`

- [ ] **Step 1: 상태 추가.** `_state` 초기값(2–5행)을 교체:
```js
let _state = {
  currentUser: null,
  currentPatient: null,
  currentChartType: 'AL',
  projectionMode: 'trend',
};
```

- [ ] **Step 2: 빌드.** Run: `npm run build` → 성공.

- [ ] **Step 3: 커밋.**
```bash
git add src/state.js
git commit -m "feat(state): add projectionMode (default trend)"
```

---

## Task 5: `main.js` — 설정 적재

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: import 추가.** 3행을 교체:
```js
import { getCurrentUser, getSetting } from './data/dataService.js';
```

- [ ] **Step 2: 세션 복원에서 설정 로드.** 하단 IIFE(현재 `(async () => { const user = await getCurrentUser(); ... })();`)를 교체:
```js
(async () => {
  const user = await getCurrentUser();
  if (user) {
    setState({ currentUser: user });
    try {
      const mode = await getSetting('projection_mode');
      if (mode) setState({ projectionMode: mode });
    } catch { /* 실패 시 기본 'trend' 유지 */ }
    window.location.hash = routeForUser(user);
  }
  startRouter(document.getElementById('app'));
  document.getElementById('loadingOverlay')?.classList.add('hidden');
})();
```

- [ ] **Step 3: 빌드.** Run: `npm run build` → 성공.

- [ ] **Step 4: 커밋.**
```bash
git add src/main.js
git commit -m "feat(main): load projection_mode into state on session restore"
```

---

## Task 6: 마이그레이션 적용 (런타임 게이트 — 사용자 실행)

추가형 마이그레이션이라 wipe 없음. 직전 `db reset --linked`로 히스토리 동기화됨.

- [ ] **Step 1:** 저장소 루트에서:
```
cd C:\workspace\wishket\myopia-tracker
npx supabase db push
```
(연결돼 있지 않으면 먼저 `npx supabase link --project-ref rwqggjbozibuyajdluqn`. DB 비밀번호 요구될 수 있음.)

- [ ] **Step 2: 확인.** 대시보드 또는 SQL로 `app_settings`에 `projection_mode = 'trend'` 1행 존재, RLS 활성 확인.

커밋 없음(환경 작업).

---

## Task 7: `growthChart.js` — 모드 파라미터 + 범례

**Files:**
- Modify: `src/components/growthChart.js`

- [ ] **Step 1: `renderGrowthChart` 시그니처 + 범례.** 40행 시그니처를 교체:
```js
export function renderGrowthChart(canvasId, patient, projectionMode = 'trend') {
```
52행의 "18세 예측" 범례 `<span>`을 교체:
```js
      <span class="flex items-center gap-1.5"><span class="w-5 border-t-2 border-dashed border-slate-400"></span>18세 예측 · ${projectionMode === 'trend' ? '추세 연장' : '백분위 추종'}</span>
```

- [ ] **Step 2: `initGrowthChart` 시그니처 + 모델 호출.** 58행 시그니처를 교체:
```js
export function initGrowthChart(canvasId, patient, projectionMode = 'trend') {
```
64행을 교체:
```js
  const model = computeChartModel(patient, projectionMode);
```

- [ ] **Step 3: 빌드.** Run: `npm run build` → 성공. (doctorScreen은 아직 인자 미전달이지만 기본값 'trend'로 동작.)

- [ ] **Step 4: 커밋.**
```bash
git add src/components/growthChart.js
git commit -m "feat(growthChart): accept projectionMode, label legend"
```

---

## Task 8: `doctorScreen.js` — 모드 전달

**Files:**
- Modify: `src/screens/doctorScreen.js`

- [ ] **Step 1: 차트 초기화에 모드 전달.** 114행을 교체:
```js
    initGrowthChart('growthChart', selectedPatient, getState().projectionMode || 'trend');
```

- [ ] **Step 2: 차트 마크업(범례)에 모드 전달.** 264행 `${renderGrowthChart('growthChart', patient)}` 을 교체:
```js
        ${renderGrowthChart('growthChart', patient, getState().projectionMode || 'trend')}
```
(`getState`는 이미 13행에서 import됨.)

- [ ] **Step 3: 빌드 + 테스트.** Run: `npm run build && npm test` → 성공/전체 통과.

- [ ] **Step 4: 커밋.**
```bash
git add src/screens/doctorScreen.js
git commit -m "feat(doctor): pass projectionMode to growth chart"
```

---

## Task 9: `adminScreen.js` — 예측 설정 탭

**Files:**
- Modify: `src/screens/adminScreen.js`

- [ ] **Step 1: import 추가.**
  2행 `import { getState } from '../state.js';` → `import { getState, setState } from '../state.js';`
  dataService import 블록(3–6행)에 `getSetting, setSetting` 추가:
```js
import {
  getStats, getUsers, setUserAdmin, setUserActive,
  getTreatmentTypes, addTreatmentType, deleteTreatmentType,
  getSetting, setSetting,
} from '../data/dataService.js';
```

- [ ] **Step 2: 데이터 로드에 설정 추가.** `const [stats, users, treatmentTypes] = await Promise.all([ getStats(), getUsers(), getTreatmentTypes() ]);` 를 교체:
```js
  const [stats, users, treatmentTypes, projectionMode] = await Promise.all([
    getStats(), getUsers(), getTreatmentTypes(), getSetting('projection_mode'),
  ]);
```

- [ ] **Step 3: 탭 바 + 탭 콘텐츠.** 탭 바에 `${tabBtn('settings', '예측 설정')}` 추가(`치료종류` 다음). 탭 콘텐츠 분기를 교체:
```html
      <div id="adminTabContent">
        ${activeTab === 'treatments' ? renderTreatmentTypesTab(treatmentTypes) :
          activeTab === 'settings' ? renderSettings(projectionMode || 'trend') :
          renderUsers(users, user)}
      </div>
```

- [ ] **Step 4: `renderSettings` 함수 추가.** (다른 render 함수들 근처):
```js
function renderSettings(mode) {
  const opt = (val, title, desc) => `
    <label class="flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${mode === val ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}">
      <input type="radio" name="projMode" value="${val}" class="mt-1" ${mode === val ? 'checked' : ''}>
      <div>
        <div class="text-sm font-medium text-slate-800">${title}</div>
        <div class="text-xs text-slate-500 mt-0.5">${desc}</div>
      </div>
    </label>`;
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-5 max-w-xl">
      <h3 class="text-sm font-semibold text-slate-800 mb-1">성장 차트 18세 예측 방식</h3>
      <p class="text-xs text-slate-500 mb-4">모든 사용자의 차트에 적용됩니다. 변경 시 대시보드에 즉시 반영됩니다.</p>
      <div class="space-y-3">
        ${opt('trend', '추세 연장', '환자 측정점의 기울기(최소제곱 회귀)를 18세까지 직선으로 연장합니다.')}
        ${opt('percentile', '백분위 추종', '현재 백분위 곡선을 18세까지 그대로 따라갑니다.')}
      </div>
    </div>`;
}
```

- [ ] **Step 5: 변경 핸들러 추가.** `renderAdminScreen` 내 이벤트 바인딩 영역(예: 탭 스위칭 핸들러 근처)에 추가:
```js
  container.querySelectorAll('input[name="projMode"]').forEach(radio => {
    radio.addEventListener('change', async () => {
      const ok = await setSetting('projection_mode', radio.value);
      if (ok) setState({ projectionMode: radio.value });
      await renderAdminScreen(container);
    });
  });
```
(`activeTab`은 모듈 레벨이라 재렌더해도 'settings' 유지 → 선택 하이라이트가 저장값을 반영.)

- [ ] **Step 6: 빌드.** Run: `npm run build` → 성공.

- [ ] **Step 7: 커밋.**
```bash
git add src/screens/adminScreen.js
git commit -m "feat(admin): 예측 설정 tab to switch projection mode"
```

---

## Task 10: 최종 검증 (Task 6 적용 후)

**Files:** 없음

- [ ] **Step 1: 빌드+테스트.** Run: `npm run build && npm test` → 성공/전체 통과.
- [ ] **Step 2:** Task 6(마이그레이션 적용) 완료 확인. 미완료면 중단하고 먼저 적용.
- [ ] **Step 3: 수동 수용 검증** (`npm run dev`, 관리자 계정 로그인):
  1. 기본 상태: 환자(측정 2개+) 차트 점선이 **마지막 측정점에서 직선으로 18세까지** 연장, 범례 "18세 예측 · 추세 연장", 18세 AL 라벨/굴절/위험도가 추세값 기반.
  2. 관리 → **예측 설정 → 백분위 추종** 선택 → 대시보드로 돌아가 차트 점선이 **백분위 곡선 추종**으로 변경, 범례 "백분위 추종", 라벨/굴절/위험도도 일관 변경.
  3. 다시 추세 연장으로 전환 → 원복.
  4. 측정 1개 환자: 추세 모드여도 백분위 폴백으로 정상 표시(에러 없음).
  5. 간호사(비관리자) 로그인: "관리"/예측 설정 접근 불가(관리 라우트 is_admin 전용).
- [ ] **Step 4:** 통과 시 브랜치 완료 준비. 결과를 정직하게 보고(특히 마이그레이션 미적용 시 명시).

---

## Notes for the executor

- 각 태스크는 커밋 시 `npm run build`가 green이도록 정렬됨(기본값 'trend' 덕분에 growthChart 변경이 doctorScreen 변경보다 먼저여도 빌드 통과).
- `computeChartModel`의 기본 인자는 'percentile'(기존 테스트 보존), DOM 계층(`initGrowthChart`/`renderGrowthChart`/state)은 'trend'. 앱은 항상 설정값을 명시 전달.
- 차트/모델의 백분위 곡선·굴절·위험도 핵심 수식은 변경하지 않는다. 추가되는 것은 `projectByTrend` 경로뿐.
