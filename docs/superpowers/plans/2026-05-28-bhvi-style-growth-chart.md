# BHVI 스타일 안축장 성장차트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 `growthChart.js`를 BHVI Myopia Calculator 스타일(19개 백분위 곡선 + 18세 예측 + 굴절 우측 패널 + 위험도 게이지)로 교체/업그레이드한다.

**Architecture:** 임상 계산을 DOM 없는 순수 모듈 `myopiaModel.js`로 모으고(단위 테스트), 렌더링을 `growthChart.js`(메인) + `refractionPanel.js`(우측) + `riskGauge.js`(하단)로 분리한다. 공개 API(`renderGrowthChart`/`initGrowthChart`/`destroyChart`)는 그대로 유지해 호출부(main.js/customerScreen.js/doctorScreen.js) 변경을 최소화한다.

**Tech Stack:** Vanilla JS (ES Modules), Vite 8, Chart.js 4.5 + chartjs-plugin-annotation, Tailwind 4, Vitest(신규).

**설계 출처:** `docs/superpowers/specs/2026-05-27-bhvi-style-al-growth-chart-design.md`

---

## File Structure

| 파일 | 책임 | 작업 |
|------|------|------|
| `src/myopiaModel.js` | 순수 임상 계산 (단일 진실원) | 신규 |
| `src/myopiaModel.test.js` | Vitest 단위 테스트 | 신규 |
| `src/constants.js` | 백분위 데이터 + 신규 상수 | 수정 |
| `src/utils.js` | `calcPct`/`interpolateValue`/`generateCurveData` 하위호환 re-export | 수정 |
| `src/components/growthChart.js` | 메인 차트 (곡선/점/예측/치료선) + 패널·게이지 조합 | 개편 |
| `src/components/refractionPanel.js` | 우측 굴절(D) 패널 (커스텀 캔버스) | 신규 |
| `src/components/riskGauge.js` | 위험도 게이지 (HTML/CSS) | 신규 |
| `package.json` | Vitest devDep + test 스크립트 | 수정 |

**모델 함수 인터페이스(최종):**
- `interpolateValue(data, age, key)` → number
- `refValue(gender, age, pct)` → number | null
- `calcPercentile(gender, age, al)` → number | '<3' | '>95' | null (별칭 `calcPct`)
- `generatePercentileCurves(gender)` → `{ [p]: {x,y}[] }`
- `generateCurveData(gender, pKey)` → `{x,y}[]` (하위호환)
- `alToRefraction(al)` → number
- `predictAdultRefraction(predictedAL)` → `{ mean, sd, lo, hi }`
- `projectToAge(gender, currentAge, al, toAge=18)` → `{ percentile, points:{x,y}[], predictedAL }` | null
- `progressionRate(records, alKey='odAL')` → number(mm/년) | null
- `assessRisk(predictedSE, progRate)` → '낮음' | '중간' | '높음'
- `computeChartModel(patient)` → `{ gender, curves, od, os, risk, riskLevel, previousRisk, previousRiskLevel, progressionRate } | { error }`

---

## Task 1: Vitest 테스트 인프라

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Vitest 설치**

Run:
```bash
npm install -D vitest@^3
```
Expected: `package.json` devDependencies에 `vitest` 추가, 설치 성공.

- [ ] **Step 2: test 스크립트 추가**

`package.json`의 `"scripts"` 블록을 아래로 교체:
```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: 스모크 테스트로 러너 동작 확인**

Create `src/_smoke.test.js`:
```js
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: 테스트 실행**

Run: `npm test`
Expected: PASS (1 passed). 

- [ ] **Step 5: 스모크 파일 삭제 후 커밋**

```bash
rm src/_smoke.test.js
git add package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

## Task 2: constants.js — 신규 상수 추가

**Files:**
- Modify: `src/constants.js` (파일 끝에 추가)

- [ ] **Step 1: 상수 추가**

`src/constants.js` 맨 끝에 다음을 추가:
```js
// 백분위 곡선 그리드 (5% 간격, 5~95% → 19개)
export const PERCENTILE_GRID = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];

// 안축장(AL) → 등가구면 굴절(R) 선형 변환:  R = alpha + beta * AL
// 이미지 보정값(횡단면 기울기). 문헌·클리닉 데이터로 재보정 대상. 설계문서 §3.5/§8 참고.
//   R(25.21mm) = 21.15 - 0.9*25.21 ≈ -1.54D (이미지 우안 밴드 중심)
export const REFRACTION_MODEL = { alpha: 21.15, beta: -0.9, emmetropiaAL: 23.5 };

// 예측 안축장의 표준편차(mm). beta와 결합 보정: |beta|*PREDICTION_SD ≈ 1.02 → 95% 굴절밴드 ≈ ±2.0D
export const PREDICTION_SD = 1.1;

// 위험도 임계값 (설계문서 §3.6). 모두 임상 보정 대상.
export const RISK_THRESHOLDS = {
  refraction: { low: -3.0, high: -6.0 },   // 예측 성인 굴절(D)
  progression: { stable: 0.1, rapid: 0.3 }, // 안축장 진행속도(mm/년)
};
```

- [ ] **Step 2: 빌드로 문법 확인 후 커밋**

Run: `npm run build`
Expected: 빌드 성공 (에러 없음).
```bash
git add src/constants.js
git commit -m "feat: add refraction model, risk thresholds, percentile grid constants"
```

---

## Task 3: myopiaModel — interpolateValue + refValue (TDD)

**Files:**
- Create: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `src/myopiaModel.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { interpolateValue, refValue } from './myopiaModel.js';

const maleData = [
  { Age: 4, P50: 22.39 }, { Age: 5, P50: 22.69 },
];

describe('interpolateValue', () => {
  it('보간: 4세와 5세 중간(4.5세)은 두 값의 평균', () => {
    expect(interpolateValue(maleData, 4.5, 'P50')).toBeCloseTo(22.54, 2);
  });
  it('범위 밖(하한)은 첫 값으로 clamp', () => {
    expect(interpolateValue(maleData, 3, 'P50')).toBe(22.39);
  });
});

describe('refValue', () => {
  it('알려진 백분위(P50, 남아 10세)는 표값과 일치', () => {
    expect(refValue('male', 10, 50)).toBeCloseTo(23.99, 2);
  });
  it('이미지 재현: 여아 18세 55백분위 ≈ 25.22mm', () => {
    expect(refValue('female', 18, 55)).toBeCloseTo(25.22, 2);
  });
  it('이미지 재현: 여아 18세 56백분위 ≈ 25.25mm', () => {
    expect(refValue('female', 18, 56)).toBeCloseTo(25.25, 2);
  });
  it('백분위 3 이하는 P3로 clamp (남아 10세 P3=22.42)', () => {
    expect(refValue('male', 10, 1)).toBeCloseTo(22.42, 2);
  });
  it('알 수 없는 성별은 null', () => {
    expect(refValue('unknown', 10, 50)).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm test -- myopiaModel`
Expected: FAIL ("Failed to resolve import './myopiaModel.js'" 또는 함수 미정의).

- [ ] **Step 3: 최소 구현 작성**

Create `src/myopiaModel.js`:
```js
import { PERCENTILE_DATA } from './constants.js';

const PCT_KEYS = ['P3', 'P5', 'P10', 'P25', 'P50', 'P75', 'P90', 'P95'];
const PCT_NUMS = [3, 5, 10, 25, 50, 75, 90, 95];

// 나이축 선형 보간 (한 백분위 키에 대해)
export function interpolateValue(data, age, key) {
  if (age <= data[0].Age) return data[0][key];
  if (age >= data[data.length - 1].Age) return data[data.length - 1][key];
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i].Age <= age && data[i + 1].Age >= age) {
      const r = (age - data[i].Age) / (data[i + 1].Age - data[i].Age);
      return data[i][key] + r * (data[i + 1][key] - data[i][key]);
    }
  }
  return data[0][key];
}

// refValue(gender, age, pct): 2단계 보간(나이축 → 백분위축)으로 임의 백분위의 안축장 산출
export function refValue(gender, age, pct) {
  const data = PERCENTILE_DATA[gender];
  if (!data) return null;
  const a = Math.max(4, Math.min(18, age));
  const vals = PCT_KEYS.map((k) => interpolateValue(data, a, k));
  if (pct <= PCT_NUMS[0]) return vals[0];
  if (pct >= PCT_NUMS[PCT_NUMS.length - 1]) return vals[vals.length - 1];
  for (let i = 0; i < PCT_NUMS.length - 1; i++) {
    if (pct >= PCT_NUMS[i] && pct <= PCT_NUMS[i + 1]) {
      const r = (pct - PCT_NUMS[i]) / (PCT_NUMS[i + 1] - PCT_NUMS[i]);
      return vals[i] + r * (vals[i + 1] - vals[i]);
    }
  }
  return vals[4]; // P50 fallback
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm test -- myopiaModel`
Expected: PASS (7 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat: add myopiaModel interpolateValue and refValue with image regression test"
```

---

## Task 4: myopiaModel — calcPercentile (TDD)

**Files:**
- Modify: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패 테스트 추가**

`src/myopiaModel.test.js` 상단 import에 `calcPercentile`, `calcPct` 추가:
```js
import { interpolateValue, refValue, calcPercentile, calcPct } from './myopiaModel.js';
```
파일 끝에 추가:
```js
describe('calcPercentile', () => {
  it('refValue 역함수 왕복: 여아 18세 25.218mm → 55백분위', () => {
    expect(calcPercentile('female', 18, 25.218)).toBe(55);
  });
  it('P3 이하는 "<3"', () => {
    expect(calcPercentile('male', 10, 20.0)).toBe('<3');
  });
  it('P95 이상은 ">95"', () => {
    expect(calcPercentile('male', 10, 30.0)).toBe('>95');
  });
  it('나이 범위 밖은 null', () => {
    expect(calcPercentile('male', 3, 22)).toBeNull();
  });
  it('calcPct는 calcPercentile의 별칭', () => {
    expect(calcPct).toBe(calcPercentile);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- myopiaModel`
Expected: FAIL ("calcPercentile is not a function").

- [ ] **Step 3: 구현 추가**

`src/myopiaModel.js`에 추가:
```js
// calcPercentile(gender, age, al): refValue의 역함수. 측정 안축장이 몇 백분위인지 산출.
export function calcPercentile(gender, age, al) {
  const data = PERCENTILE_DATA[gender];
  if (!data || age < 4 || age > 18) return null;
  const refs = {};
  PCT_KEYS.forEach((k) => { refs[k] = interpolateValue(data, age, k); });
  if (al <= refs.P3) return '<3';
  if (al >= refs.P95) return '>95';
  for (let i = 0; i < PCT_KEYS.length - 1; i++) {
    const lo = refs[PCT_KEYS[i]], hi = refs[PCT_KEYS[i + 1]];
    if (al >= lo && al <= hi) {
      return Math.round(PCT_NUMS[i] + ((al - lo) / (hi - lo)) * (PCT_NUMS[i + 1] - PCT_NUMS[i]));
    }
  }
  return 50;
}

// 하위호환 별칭 (services/helpers.js, measurements.js, patients.js가 calcPct를 import)
export const calcPct = calcPercentile;
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- myopiaModel`
Expected: PASS (12 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat: add calcPercentile (calcPct alias) to myopiaModel"
```

---

## Task 5: myopiaModel — 곡선 생성 (TDD)

**Files:**
- Modify: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패 테스트 추가**

import에 `generatePercentileCurves`, `generateCurveData` 추가. 파일 끝에:
```js
import { PERCENTILE_GRID } from './constants.js';

describe('generatePercentileCurves', () => {
  it('PERCENTILE_GRID의 모든 백분위(19개) 키를 가진다', () => {
    const curves = generatePercentileCurves('male');
    expect(Object.keys(curves).map(Number).sort((a, b) => a - b)).toEqual(PERCENTILE_GRID);
  });
  it('각 곡선은 4세부터 18세까지 0.5세 간격(29점)', () => {
    const curves = generatePercentileCurves('male');
    expect(curves[50].length).toBe(29);
    expect(curves[50][0]).toEqual({ x: 4, y: expect.any(Number) });
    expect(curves[50][28].x).toBe(18);
  });
  it('알 수 없는 성별은 빈 객체', () => {
    expect(generatePercentileCurves('nope')).toEqual({});
  });
});

describe('generateCurveData (하위호환)', () => {
  it('pKey 문자열로 곡선 배열 반환', () => {
    const pts = generateCurveData('male', 'P50');
    expect(pts.length).toBe(29);
    expect(pts[0].y).toBeCloseTo(22.39, 2);
  });
});
```
(상단 import 줄을 `import { PERCENTILE_GRID } from './constants.js';` 한 줄로 합쳐도 됨 — 중복 import 금지.)

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- myopiaModel`
Expected: FAIL ("generatePercentileCurves is not a function").

- [ ] **Step 3: 구현 추가**

`src/myopiaModel.js` 상단 import를 다음으로 교체:
```js
import { PERCENTILE_DATA, PERCENTILE_GRID } from './constants.js';
```
파일에 추가:
```js
const _curveCache = {};

// generatePercentileCurves(gender): PERCENTILE_GRID의 각 백분위에 대해 4~18세(0.5 간격) 곡선
export function generatePercentileCurves(gender) {
  if (!PERCENTILE_DATA[gender]) return {};
  if (_curveCache[gender]) return _curveCache[gender];
  const curves = {};
  for (const p of PERCENTILE_GRID) {
    const points = [];
    for (let age = 4; age <= 18 + 1e-9; age += 0.5) {
      points.push({ x: Math.round(age * 10) / 10, y: refValue(gender, age, p) });
    }
    curves[p] = points;
  }
  _curveCache[gender] = curves;
  return curves;
}

// generateCurveData(gender, pKey): 'P50' 같은 키로 단일 곡선 반환 (하위호환)
export function generateCurveData(gender, pKey) {
  const num = Number(String(pKey).replace('P', ''));
  const points = [];
  for (let age = 4; age <= 18 + 1e-9; age += 0.5) {
    points.push({ x: Math.round(age * 10) / 10, y: refValue(gender, age, num) });
  }
  return points;
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- myopiaModel`
Expected: PASS (16 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat: add percentile curve generators to myopiaModel"
```

---

## Task 6: myopiaModel — projectToAge (TDD)

**Files:**
- Modify: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패 테스트 추가**

import에 `projectToAge` 추가. 파일 끝에:
```js
describe('projectToAge', () => {
  it('여아 13.4세 안축장이 55백분위면 18세 예측 ≈ 25.22mm', () => {
    // 여아 13.4세 55백분위 안축장을 입력으로 사용
    const al = refValue('female', 13.4, 55);
    const proj = projectToAge('female', 13.4, al, 18);
    expect(proj.percentile).toBe(55);
    expect(proj.predictedAL).toBeCloseTo(25.22, 1);
  });
  it('예측 곡선의 마지막 점은 정확히 18세', () => {
    const proj = projectToAge('female', 13.4, 24.5, 18);
    expect(proj.points[proj.points.length - 1].x).toBe(18);
  });
  it('알 수 없는 성별은 null', () => {
    expect(projectToAge('nope', 10, 23, 18)).toBeNull();
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- myopiaModel`
Expected: FAIL ("projectToAge is not a function").

- [ ] **Step 3: 구현 추가**

```js
// projectToAge: 현재 백분위를 toAge까지 추종하는 예측 곡선과 예측 안축장
export function projectToAge(gender, currentAge, al, toAge = 18) {
  const p = calcPercentile(gender, currentAge, al);
  if (p === null) return null;
  const pNum = p === '<3' ? 3 : p === '>95' ? 95 : p;
  const points = [];
  for (let a = currentAge; a <= toAge + 1e-9; a += 0.5) {
    const ax = Math.round(a * 10) / 10;
    points.push({ x: ax, y: refValue(gender, ax, pNum) });
  }
  if (points.length === 0 || points[points.length - 1].x < toAge) {
    points.push({ x: toAge, y: refValue(gender, toAge, pNum) });
  }
  return { percentile: pNum, points, predictedAL: refValue(gender, toAge, pNum) };
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- myopiaModel`
Expected: PASS (19 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat: add projectToAge percentile-tracking projection"
```

---

## Task 7: myopiaModel — 굴절 변환 + 예측 분포 (TDD)

**Files:**
- Modify: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패 테스트 추가**

import에 `alToRefraction`, `predictAdultRefraction` 추가. 파일 끝에:
```js
describe('alToRefraction', () => {
  it('정상안 기준(23.5mm)은 0D', () => {
    expect(alToRefraction(23.5)).toBeCloseTo(0, 5);
  });
  it('이미지 재현: 25.21mm → ≈ -1.54D', () => {
    expect(alToRefraction(25.21)).toBeCloseTo(-1.54, 2);
  });
  it('안축장이 길수록 더 근시(단조 감소)', () => {
    expect(alToRefraction(26)).toBeLessThan(alToRefraction(24));
  });
});

describe('predictAdultRefraction', () => {
  it('이미지 재현: 25.21mm → 평균≈-1.54D, 95% 밴드≈(-3.5, 0.5)', () => {
    const r = predictAdultRefraction(25.21);
    expect(r.mean).toBeCloseTo(-1.54, 2);
    expect(r.lo).toBeCloseTo(-3.48, 1);
    expect(r.hi).toBeCloseTo(0.40, 1);
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- myopiaModel`
Expected: FAIL ("alToRefraction is not a function").

- [ ] **Step 3: 구현 추가**

상단 import를 다음으로 교체:
```js
import { PERCENTILE_DATA, PERCENTILE_GRID, REFRACTION_MODEL, PREDICTION_SD } from './constants.js';
```
추가:
```js
// alToRefraction(al): R = alpha + beta * AL (선형 변환)
export function alToRefraction(al) {
  const { alpha, beta } = REFRACTION_MODEL;
  return alpha + beta * al;
}

// predictAdultRefraction(predictedAL): 예측 안축장 → 굴절 분포(평균/표준편차/95%밴드)
export function predictAdultRefraction(predictedAL) {
  const mean = alToRefraction(predictedAL);
  const sd = Math.abs(REFRACTION_MODEL.beta) * PREDICTION_SD;
  return { mean, sd, lo: mean - 1.96 * sd, hi: mean + 1.96 * sd };
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- myopiaModel`
Expected: PASS (24 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat: add AL-to-refraction conversion and prediction distribution"
```

---

## Task 8: myopiaModel — 진행속도 + 위험도 (TDD)

**Files:**
- Modify: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패 테스트 추가**

import에 `progressionRate`, `assessRisk` 추가. 파일 끝에:
```js
describe('progressionRate', () => {
  it('1년 간격 0.5mm 증가 → 0.5mm/년', () => {
    const records = [
      { date: '2024-01-01', odAL: 24.0 },
      { date: '2025-01-01', odAL: 24.5 },
    ];
    expect(progressionRate(records, 'odAL')).toBeCloseTo(0.5, 1);
  });
  it('측정 1개면 null', () => {
    expect(progressionRate([{ date: '2025-01-01', odAL: 24 }], 'odAL')).toBeNull();
  });
});

describe('assessRisk', () => {
  it('이미지 케이스: 경도근시(-1.5D) + 빠른 진행(0.5) → 높음', () => {
    expect(assessRisk(-1.5, 0.5)).toBe('높음');
  });
  it('경도근시 + 안정 진행 → 낮음', () => {
    expect(assessRisk(-1.0, 0.05)).toBe('낮음');
  });
  it('고도근시(-7D) + 진행정보 없음 → 높음', () => {
    expect(assessRisk(-7, null)).toBe('높음');
  });
  it('중등도(-4D) + 보통진행(0.2) → 둘 다 우려로 1단계 상향 → 높음', () => {
    expect(assessRisk(-4, 0.2)).toBe('높음');
  });
  it('중등도(-4D) + 안정진행(0.05) → 중간', () => {
    expect(assessRisk(-4, 0.05)).toBe('중간');
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- myopiaModel`
Expected: FAIL ("progressionRate is not a function").

- [ ] **Step 3: 구현 추가**

상단 import를 다음으로 교체:
```js
import { PERCENTILE_DATA, PERCENTILE_GRID, REFRACTION_MODEL, PREDICTION_SD, RISK_THRESHOLDS } from './constants.js';
```
추가:
```js
// progressionRate(records, alKey): 최근 두 측정으로 안축장 연간 진행속도(mm/년)
export function progressionRate(records, alKey = 'odAL') {
  const valid = (records || []).filter((r) => r[alKey] != null);
  if (valid.length < 2) return null;
  const last = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  const months = (new Date(last.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= 0) return null;
  return ((last[alKey] - prev[alKey]) / months) * 12;
}

// assessRisk(predictedSE, progRate): 복합 위험도. 진행정보 없으면 굴절만 사용.
export function assessRisk(predictedSE, progRate) {
  const { refraction, progression } = RISK_THRESHOLDS;
  const refLevel = predictedSE > refraction.low ? 0 : predictedSE > refraction.high ? 1 : 2;
  let combined = refLevel;
  if (progRate != null) {
    const progLevel = progRate <= progression.stable ? 0 : progRate <= progression.rapid ? 1 : 2;
    combined = Math.max(refLevel, progLevel);
    if (refLevel >= 1 && progLevel >= 1) combined = Math.min(2, combined + 1);
  }
  return ['낮음', '중간', '높음'][combined];
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- myopiaModel`
Expected: PASS (31 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat: add progression rate and composite risk assessment"
```

---

## Task 9: myopiaModel — computeChartModel 집계 (TDD)

**Files:**
- Modify: `src/myopiaModel.js`
- Test: `src/myopiaModel.test.js`

- [ ] **Step 1: 실패 테스트 추가**

import에 `computeChartModel` 추가. 파일 끝에:
```js
describe('computeChartModel', () => {
  const patient = {
    gender: 'female',
    records: [
      { date: '2024-07-01', age: 12.5, odAL: 24.20, osAL: 24.22 },
      { date: '2025-12-01', age: 13.4, odAL: 24.55, osAL: 24.58 },
    ],
    treatments: [],
  };
  it('성별 결측 시 error 반환', () => {
    expect(computeChartModel({ ...patient, gender: null }).error).toBe('gender');
  });
  it('19개 곡선과 좌/우 예측·위험도를 포함', () => {
    const m = computeChartModel(patient);
    expect(Object.keys(m.curves).length).toBe(19);
    expect(m.od.projection.predictedAL).toBeGreaterThan(24.5);
    expect(['낮음', '중간', '높음']).toContain(m.risk);
    expect(m.od.predSE.mean).toBeLessThan(0);
  });
  it('측정 2개면 previousRisk는 null(이전 진행속도 산출 불가)', () => {
    const m = computeChartModel(patient);
    expect(m.previousRisk).toBeNull();
  });
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npm test -- myopiaModel`
Expected: FAIL ("computeChartModel is not a function").

- [ ] **Step 3: 구현 추가**

```js
const RISK_LABELS = ['낮음', '중간', '높음'];

function _eyeModel(gender, records, alKey) {
  const eyeRecords = records.filter((r) => r[alKey] != null);
  if (eyeRecords.length === 0) return null;
  const lr = eyeRecords[eyeRecords.length - 1];
  const projection = projectToAge(gender, lr.age, lr[alKey], 18);
  if (!projection) return null;
  return {
    points: eyeRecords.map((r) => ({ x: r.age, y: r[alKey] })),
    projection,
    predSE: predictAdultRefraction(projection.predictedAL),
  };
}

function _riskFor(gender, records) {
  const od = _eyeModel(gender, records, 'odAL');
  const os = _eyeModel(gender, records, 'osAL');
  const ses = [od?.predSE.mean, os?.predSE.mean].filter((v) => v != null);
  if (ses.length === 0) return null;
  const worstSE = Math.min(...ses); // 가장 근시 쪽
  const rates = [progressionRate(records, 'odAL'), progressionRate(records, 'osAL')].filter((v) => v != null);
  const maxRate = rates.length ? Math.max(...rates) : null;
  return { label: assessRisk(worstSE, maxRate), rate: maxRate };
}

// computeChartModel(patient): 차트·패널·게이지가 공유하는 단일 진실원
export function computeChartModel(patient) {
  const gender = patient?.gender;
  if (!gender || !PERCENTILE_DATA[gender]) return { error: 'gender' };
  const records = (patient.records || []).filter((r) => r.age >= 4 && r.age <= 18);

  const curves = generatePercentileCurves(gender);
  const od = _eyeModel(gender, records, 'odAL');
  const os = _eyeModel(gender, records, 'osAL');

  const current = _riskFor(gender, records);
  const prev = records.length >= 3 ? _riskFor(gender, records.slice(0, -1)) : null;

  return {
    gender,
    curves,
    od,
    os,
    treatments: patient.treatments || [],
    risk: current ? current.label : null,
    riskLevel: current ? RISK_LABELS.indexOf(current.label) : null,
    progressionRate: current ? current.rate : null,
    previousRisk: prev ? prev.label : null,
    previousRiskLevel: prev ? RISK_LABELS.indexOf(prev.label) : null,
  };
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npm test -- myopiaModel`
Expected: PASS (34 passed).

- [ ] **Step 5: 커밋**

```bash
git add src/myopiaModel.js src/myopiaModel.test.js
git commit -m "feat: add computeChartModel aggregator"
```

---

## Task 10: utils.js — 하위호환 re-export

**Files:**
- Modify: `src/utils.js`

기존 `utils.js`의 `interpolateValue`, `calcPct`, `generateCurveData`(및 `curveCache`)를 제거하고 `myopiaModel`에서 re-export한다. `calcAge`, `formatDate`, `todayStr`, `pctBadgeClass`, `escapeHtml`, `showLoading`, `hideLoading`, `progressLabel`는 그대로 둔다.

- [ ] **Step 1: import 줄 교체**

`src/utils.js` 1번째 줄 `import { PERCENTILE_DATA } from './constants.js';` 를 다음으로 교체:
```js
// 백분위 계산은 myopiaModel로 이전됨. 하위호환을 위해 re-export.
export { interpolateValue, calcPct, generateCurveData } from './myopiaModel.js';
```

- [ ] **Step 2: 이전된 함수 본문 삭제**

`src/utils.js`에서 다음 3개 정의를 통째로 삭제: `interpolateValue` 함수, `calcPct` 함수, `const curveCache = {};` 와 `generateCurveData` 함수. (`calcAge` 위/아래 나머지 함수는 유지.)

- [ ] **Step 3: 테스트 + 빌드로 회귀 확인**

Run: `npm test && npm run build`
Expected: 테스트 PASS, 빌드 성공. (services의 `calcPct` import가 여전히 동작.)

- [ ] **Step 4: 개발 서버로 기존 화면 회귀 육안 확인**

Run: `npm run dev` 후 브라우저에서 `#login`으로 환자 조회 → 성장차트(기존 모양)가 여전히 렌더되는지 확인. 콘솔 에러 없을 것.

- [ ] **Step 5: 커밋**

```bash
git add src/utils.js
git commit -m "refactor: move percentile math to myopiaModel, re-export for back-compat"
```

---

## Task 11: riskGauge.js — 위험도 게이지 (HTML/CSS)

**Files:**
- Create: `src/components/riskGauge.js`

순수 DOM 컴포넌트. `renderRiskGauge(id)`는 마크업을, `initRiskGauge(id, model)`은 마커 위치·라벨을 채운다.

- [ ] **Step 1: 컴포넌트 작성**

Create `src/components/riskGauge.js`:
```js
import { escapeHtml } from '../utils.js';

const LEVEL_LABEL = ['낮음', '중간', '높음'];
const LEVEL_POS = ['16.6%', '50%', '83.3%']; // 각 구간 중앙

export function renderRiskGauge(id) {
  return `
    <div id="${id}" class="mt-4">
      <div class="flex items-center gap-2 mb-1.5 text-sm">
        <span class="text-slate-500">데이터 기반 위험도:</span>
        <span data-role="label" class="font-semibold text-slate-800">-</span>
      </div>
      <div class="relative h-3 rounded-full" style="background:linear-gradient(to right,#16a34a 0%,#facc15 50%,#dc2626 100%)">
        <span data-role="prev" class="hidden absolute -top-1 w-2 h-5 -ml-1 rounded-sm bg-slate-400/70 border border-white" title="직전 방문"></span>
        <span data-role="cur" class="absolute -top-1.5 w-3.5 h-6 -ml-1.5 rounded-sm bg-slate-900 border-2 border-white shadow" title="현재"></span>
      </div>
      <div class="flex justify-between mt-1 text-[11px] text-slate-400">
        <span>위험도 낮음</span><span>위험도 중간</span><span>위험도 높음</span>
      </div>
    </div>`;
}

export function initRiskGauge(id, model) {
  const root = document.getElementById(id);
  if (!root || !model || model.error || model.riskLevel == null) return;
  const label = root.querySelector('[data-role="label"]');
  const cur = root.querySelector('[data-role="cur"]');
  const prev = root.querySelector('[data-role="prev"]');

  label.textContent = escapeHtml(model.risk);
  label.className = 'font-semibold ' + ['text-emerald-600', 'text-amber-600', 'text-red-600'][model.riskLevel];
  cur.style.left = LEVEL_POS[model.riskLevel];

  if (model.previousRiskLevel != null) {
    prev.style.left = LEVEL_POS[model.previousRiskLevel];
    prev.classList.remove('hidden');
  }
}
```

- [ ] **Step 2: 빌드로 문법 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: 커밋**

```bash
git add src/components/riskGauge.js
git commit -m "feat: add risk gauge component"
```

---

## Task 12: refractionPanel.js — 우측 굴절 패널 (커스텀 캔버스)

**Files:**
- Create: `src/components/refractionPanel.js`

세로 D축(-6 ↑ ~ +8 ↓) + 그라데이션 컬러바 + OD/OS 예측 굴절 종형곡선을 2D 캔버스에 그린다.

- [ ] **Step 1: 컴포넌트 작성**

Create `src/components/refractionPanel.js`:
```js
import { OD_COLOR, OS_COLOR } from '../constants.js';

const D_TOP = -6;   // 캔버스 상단 굴절값
const D_BOTTOM = 8; // 캔버스 하단 굴절값
const TICKS = [-6, -4, -2, 0, 2, 4, 6, 8];

export function renderRefractionPanel(id) {
  return `<canvas id="${id}" width="90" height="400" class="block" style="height:400px;max-height:60vh;width:90px"></canvas>`;
}

// 정규분포 밀도 (정규화 안 된 상대값)
function gaussian(x, mean, sd) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z);
}

export function initRefractionPanel(id, model) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!model || model.error) return;

  const padTop = 10, padBottom = 10;
  const plotH = H - padTop - padBottom;
  const barX = 4, barW = 14;
  const yOf = (d) => padTop + ((d - D_TOP) / (D_BOTTOM - D_TOP)) * plotH;

  // 1) 그라데이션 컬러바 (위=근시/위험=빨강, 아래=초록)
  const grad = ctx.createLinearGradient(0, padTop, 0, H - padBottom);
  grad.addColorStop(0, '#dc2626');
  grad.addColorStop(0.45, '#facc15');
  grad.addColorStop(1, '#16a34a');
  ctx.fillStyle = grad;
  ctx.fillRect(barX, padTop, barW, plotH);

  // 2) 눈금 라벨
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.textBaseline = 'middle';
  for (const d of TICKS) {
    const y = yOf(d);
    ctx.fillText(`${d > 0 ? '+' : ''}${d} D`, barX + barW + 4, y);
  }

  // 3) 예측 굴절 종형곡선 (OD/OS)
  const curveLeft = barX + barW + 40;
  const curveMaxW = W - curveLeft - 2;
  function drawBell(predSE, color) {
    if (!predSE) return;
    const { mean, sd } = predSE;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let d = D_TOP; d <= D_BOTTOM; d += 0.1) {
      const x = curveLeft + gaussian(d, mean, sd) * curveMaxW;
      const y = yOf(d);
      d === D_TOP ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 평균 위치 점
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(curveLeft + curveMaxW, yOf(mean), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBell(model.od?.predSE, OD_COLOR);
  drawBell(model.os?.predSE, OS_COLOR);
}

export function destroyRefractionPanel(id) {
  const canvas = document.getElementById(id);
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
```

- [ ] **Step 2: 빌드로 문법 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 3: 커밋**

```bash
git add src/components/refractionPanel.js
git commit -m "feat: add refraction prediction panel (custom canvas)"
```

---

## Task 13: growthChart.js — 메인 차트 개편 + 패널·게이지 조합

**Files:**
- Modify: `src/components/growthChart.js` (전체 재작성)

19개 곡선 + OD/OS 점·연결선 + 18세 예측 점선 + 예측점 라벨 + 치료 수직선. `renderGrowthChart`/`initGrowthChart`/`destroyChart` 시그니처 유지하되 내부에서 패널·게이지를 함께 렌더/초기화.

- [ ] **Step 1: 전체 재작성**

Replace 전체 `src/components/growthChart.js` 내용:
```js
import {
  Chart,
  ScatterController, LineController,
  LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { OD_COLOR, OS_COLOR, TREATMENT_COLORS, PERCENTILE_GRID } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { computeChartModel } from '../myopiaModel.js';
import { renderRefractionPanel, initRefractionPanel, destroyRefractionPanel } from './refractionPanel.js';
import { renderRiskGauge, initRiskGauge } from './riskGauge.js';

const watermarkPlugin = {
  id: 'watermark',
  afterDraw(chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2563eb';
    const cx = (chart.chartArea.left + chart.chartArea.right) / 2;
    const cy = (chart.chartArea.top + chart.chartArea.bottom) / 2;
    ctx.fillText('근시관리 트래커', cx, cy);
    ctx.restore();
  },
};

Chart.register(
  ScatterController, LineController, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
  annotationPlugin, watermarkPlugin,
);

const chartInstances = {};

export function renderGrowthChart(canvasId, patient) {
  const refId = `${canvasId}__refraction`;
  const riskId = `${canvasId}__risk`;
  return `
    <div class="flex gap-2 items-stretch" style="height:400px; max-height:60vh;">
      <div class="flex-1 min-w-0"><canvas id="${canvasId}"></canvas></div>
      <div class="shrink-0">${renderRefractionPanel(refId)}</div>
    </div>
    <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${OD_COLOR}"></span>우안 (OD)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${OS_COLOR}"></span>좌안 (OS)</span>
      <span class="flex items-center gap-1.5"><span class="w-5 h-0.5 rounded" style="background:#16a34a"></span>P50</span>
      <span class="flex items-center gap-1.5"><span class="w-5 border-t-2 border-dashed border-slate-400"></span>18세 예측</span>
    </div>
    ${renderRiskGauge(riskId)}
  `;
}

export function initGrowthChart(canvasId, patient) {
  if (!patient) return;
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const model = computeChartModel(patient);
  const refId = `${canvasId}__refraction`;
  const riskId = `${canvasId}__risk`;

  if (model.error) {
    const c = ctx.getContext('2d');
    c.clearRect(0, 0, ctx.width, ctx.height);
    c.fillStyle = '#94a3b8';
    c.font = '14px sans-serif';
    c.textAlign = 'center';
    c.fillText('성별 정보가 필요합니다', ctx.width / 2, ctx.height / 2);
    return;
  }

  // 19개 백분위 곡선 (P50 굵은 실선, 나머지 얇은 회색)
  const curveDatasets = PERCENTILE_GRID.map((p) => ({
    type: 'line', label: `P${p}`,
    data: model.curves[p],
    borderColor: p === 50 ? '#475569' : '#cbd5e1',
    borderWidth: p === 50 ? 2.5 : 1,
    pointRadius: 0, tension: 0.4, fill: false, order: 10,
  }));

  // 환자 측정점 + 18세 예측 점선
  const eyeDatasets = [];
  for (const [eye, color, label] of [[model.od, OD_COLOR, '우안 (OD)'], [model.os, OS_COLOR, '좌안 (OS)']]) {
    if (!eye) continue;
    eyeDatasets.push({
      type: 'scatter', label, data: eye.points,
      borderColor: color, backgroundColor: color,
      pointRadius: 5, pointHoverRadius: 7, showLine: true, borderWidth: 2, tension: 0.2, order: 1,
    });
    eyeDatasets.push({
      type: 'line', label: `${label} 예측`, data: eye.projection.points,
      borderColor: color, borderWidth: 2, borderDash: [6, 4],
      pointRadius: 0, tension: 0.2, fill: false, order: 2,
    });
  }

  // 치료 수직선
  const annotations = {};
  (model.treatments || []).forEach((t, i) => {
    if (t.age >= 4 && t.age <= 18) {
      const c = TREATMENT_COLORS[t.type] || '#7c3aed';
      annotations['t' + i] = {
        type: 'line', xMin: t.age, xMax: t.age,
        borderColor: c, borderWidth: 2, borderDash: [6, 4],
        label: {
          display: true, content: escapeHtml(t.type), position: i % 2 === 0 ? 'start' : 'end',
          backgroundColor: 'rgba(255,255,255,0.95)', color: c,
          font: { size: 10, weight: 'bold' }, padding: { x: 6, y: 3 }, borderRadius: 4,
        },
      };
    }
  });
  // 예측 안축장 라벨 (18세 지점)
  for (const [eye, color] of [[model.od, OD_COLOR], [model.os, OS_COLOR]]) {
    if (!eye) continue;
    annotations[`pred_${color}`] = {
      type: 'label', xValue: 18, yValue: eye.projection.predictedAL,
      content: `${eye.projection.predictedAL.toFixed(2)}mm`,
      color, font: { size: 10, weight: 'bold' }, position: 'end', xAdjust: -4, yAdjust: -8,
    };
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: [...curveDatasets, ...eyeDatasets] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'nearest' },
      plugins: {
        legend: { display: false },
        tooltip: { filter: (item) => item.dataset.label === '우안 (OD)' || item.dataset.label === '좌안 (OS)' },
        annotation: { annotations },
      },
      scales: {
        x: { type: 'linear', min: 4, max: 18, title: { display: true, text: '나이 (세)' }, ticks: { stepSize: 2 }, grid: { color: '#f1f5f9' } },
        y: { min: 20, max: 28, title: { display: true, text: '안축장 (mm)' }, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
      },
    },
  });

  initRefractionPanel(refId, model);
  initRiskGauge(riskId, model);
}

export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
  destroyRefractionPanel(`${canvasId}__refraction`);
}
```

- [ ] **Step 2: 빌드 + 테스트**

Run: `npm run build && npm test`
Expected: 빌드 성공, 모든 테스트 PASS.

- [ ] **Step 3: 커밋**

```bash
git add src/components/growthChart.js
git commit -m "feat: rework growth chart with 19 curves, projection, panel and gauge"
```

---

## Task 14: 통합 육안 검증 (의사/보호자/익명조회)

**Files:** (변경 없음 — 호출부는 기존 API 그대로 사용)

- [ ] **Step 1: 개발 서버 실행**

Run: `npm run dev`

- [ ] **Step 2: 세 화면에서 차트 확인**

브라우저에서 확인 (콘솔 에러 없을 것):
1. `#login` → 안과+이름+생일로 환자 조회 → `searchResultChart`에 19곡선·예측점선·우측 굴절패널·하단 위험게이지 표시
2. 의사 로그인 → `#doctor` → 환자 선택 → `growthChart` 동일 확인. 치료 수직선 표시.
3. 보호자 로그인 → `#customer` → 자녀 선택 → `customerGrowthChart` 동일 확인.

확인 포인트:
- 예측 점선이 마지막 측정점에서 18세까지 이어지고 18세 라벨(예: "25.21mm")이 보인다.
- 우측 패널 컬러바·종형곡선(OD 시안/OS 로즈)이 보인다.
- 위험게이지 마커 위치와 라벨 색이 위험도와 일치한다.
- 모바일 폭(개발자도구 반응형)에서도 깨지지 않는다.

- [ ] **Step 3: 성별 결측 케이스 확인**

성별이 없는 환자(또는 임시로 gender를 비운 데이터)에서 "성별 정보가 필요합니다" 안내가 캔버스에 표시되는지 확인.

- [ ] **Step 4: 발견된 시각/레이아웃 문제 수정**

문제가 있으면 해당 컴포넌트(`growthChart.js`/`refractionPanel.js`/`riskGauge.js`)에서 수정 후 다시 확인. 수정마다 커밋:
```bash
git add -A
git commit -m "fix: <발견한 문제 요약>"
```

---

## Task 15: 최종 검증 & 정리

**Files:** (없음)

- [ ] **Step 1: 전체 테스트 + 빌드**

Run: `npm test && npm run build`
Expected: 모든 테스트 PASS, 빌드 성공.

- [ ] **Step 2: 사용하지 않는 export 점검**

`generateCurveData`가 더 이상 어디서도 import되지 않으면(`growthChart`가 이제 안 씀) 유지해도 무방(하위호환). `git grep generateCurveData`로 사용처만 확인하고 그대로 둔다.

Run: `git grep -n "generateCurveData"`
Expected: `myopiaModel.js`(정의)·`utils.js`(re-export)·테스트에만 존재해도 정상.

- [ ] **Step 3: 최종 커밋(있다면) 및 PR 준비 안내**

```bash
git status
```
워킹트리가 깨끗하면 완료. PR 생성은 사용자 요청 시 진행.

---

## Self-Review 기록 (작성자 확인 완료)

- **스펙 커버리지:** ①곡선=Task5/13, ②백분위=Task4, ③예측=Task6/13, ④굴절패널=Task7/12, ⑤위험게이지=Task8/11, 집계=Task9, 통합=Task10/13/14, 테스트=Task1/3~9. 모든 요소 매핑됨.
- **타입 일관성:** `computeChartModel` 반환 필드(`curves`,`od/os.projection.points`,`od/os.predSE.{mean,sd}`,`risk`,`riskLevel`,`previousRiskLevel`)를 Task11~13 컴포넌트가 동일 이름으로 소비. `calcPercentile`/`calcPct` 별칭 일치.
- **플레이스홀더:** 없음(모든 코드 단계에 실제 코드 포함).
- **호환성:** `calcPct` re-export로 services 무변경. 공개 API(`renderGrowthChart`/`initGrowthChart`/`destroyChart`) 유지로 호출부 무변경.
