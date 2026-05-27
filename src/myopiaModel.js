import { PERCENTILE_DATA, PERCENTILE_GRID } from './constants.js';

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
