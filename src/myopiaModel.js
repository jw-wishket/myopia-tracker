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
