import { PERCENTILE_DATA, PERCENTILE_GRID, REFRACTION_MODEL, PREDICTION_SD, RISK_THRESHOLDS } from './constants.js';

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
  if (!Number.isFinite(al)) return null;
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

// recentSlope: 최근 진행 추세 = 마지막 두 측정점의 기울기 (mm/나이년).
// 측정점이 3개 이상이어도 가장 최근 구간만 사용한다 → 둔화/가속형 환자에서
// 점선 기울기가 차트에 표시된 '진행 속도'(progressionRate)와 일치하고 꺾임이 없다.
// n<2 또는 두 점의 나이가 같으면(분모 0) null.
export function recentSlope(points) {
  const n = points.length;
  if (n < 2) return null;
  const last = points[n - 1];
  const prev = points[n - 2];
  const dx = last.x - prev.x;
  if (dx === 0) return null;
  return (last.y - prev.y) / dx;
}

// projectByTrend: 최근 진행 추세(마지막 두 측정점의 기울기)를 마지막 점에 앵커해 toAge까지 직선 연장.
// 전체 회귀가 아닌 최근 구간 기울기를 써서 점선이 마지막 측정 추세를 그대로 잇는다.
// 추세 산출 불가(<2점/동일나이)면 null → 호출부가 백분위 추종으로 폴백.
export function projectByTrend(eyePoints, toAge = 18) {
  const slope = recentSlope(eyePoints);
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

// refVelocity: 특정 백분위 기준곡선이 해당 나이에서 갖는 순간 기울기(mm/나이년). 중앙차분(±0.5세).
function refVelocity(gender, age, pNum) {
  const lo = Math.max(4, age - 0.5);
  const hi = Math.min(18, age + 0.5);
  if (hi <= lo) return null;
  return (refValue(gender, hi, pNum) - refValue(gender, lo, pNum)) / (hi - lo);
}

// projectByTrendCurve: 최근 진행 속도를 앵커로, 환자 현재 백분위 곡선의 감속(곡률) 모양을 따라 toAge까지 곡선 연장.
// - 시작 기울기 = recentSlope → 대시보드 '진행 속도' 값과 일치 (직선 모드의 일관성 유지)
// - 곡률 = 기준 백분위 곡선의 모양 → 18세로 갈수록 자연 둔화, 단조 비감소, 역전 없음
// k = recentSlope / refVelocity(앵커나이): 환자 속도를 기준곡선 속도에 맞춰 스케일.
// 산출 불가(<2점 / 백분위 범위밖 / 기준속도≤0)면 null → 호출부가 직선→백분위로 폴백.
export function projectByTrendCurve(gender, eyePoints, toAge = 18) {
  const slope = recentSlope(eyePoints);
  if (slope === null) return null;
  const last = eyePoints[eyePoints.length - 1];
  const p = calcPercentile(gender, last.x, last.y);
  if (p === null) return null;
  const pNum = p === '<3' ? 3 : p === '>95' ? 95 : p;
  const refVel = refVelocity(gender, last.x, pNum);
  if (refVel === null || refVel <= 0) return null;
  const k = slope / refVel;
  const refLast = refValue(gender, last.x, pNum);
  const points = [];
  let prevY = last.y;
  for (let a = last.x; a <= toAge + 1e-9; a += 0.5) {
    const ax = Math.round(a * 10) / 10;
    const raw = last.y + k * (refValue(gender, ax, pNum) - refLast);
    const y = Math.max(prevY, Math.max(18, Math.min(32, raw))); // 18~32 클램프 + 단조 비감소 가드
    points.push({ x: ax, y });
    prevY = y;
  }
  if (points[points.length - 1].x < toAge) {
    const raw = last.y + k * (refValue(gender, toAge, pNum) - refLast);
    points.push({ x: toAge, y: Math.max(prevY, Math.max(18, Math.min(32, raw))) });
  }
  return { mode: 'trend', slope, points, predictedAL: points[points.length - 1].y };
}

// alToRefraction(al): R = alpha + beta * AL (선형 변환)
export function alToRefraction(al) {
  const { alpha, beta } = REFRACTION_MODEL;
  return alpha + beta * al;
}

// predictAdultRefraction(predictedAL): 예측 안축장 → 굴절 분포(평균/표준편차/2σ 밴드)
// 밴드는 평균 ± 2·σ (≈95.45% 신뢰구간) — BHVI 레퍼런스 이미지의 (-3.5, +0.5) 밴드를 정확 재현.
export function predictAdultRefraction(predictedAL) {
  const mean = alToRefraction(predictedAL);
  const sd = Math.abs(REFRACTION_MODEL.beta) * PREDICTION_SD;
  return { mean, sd, lo: mean - 2 * sd, hi: mean + 2 * sd };
}

// progressionRate(records, alKey): 최근 두 측정으로 안축장 연간 진행속도(mm/년)
export function progressionRate(records, alKey = 'odAL') {
  const valid = (records || []).filter((r) => Number.isFinite(r[alKey]));
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

const RISK_LABELS = ['낮음', '중간', '높음'];

function _eyeModel(gender, records, alKey, mode = 'percentile') {
  const eyeRecords = records.filter((r) => Number.isFinite(r[alKey]));
  if (eyeRecords.length === 0) return null;
  const points = eyeRecords.map((r) => ({ x: r.age, y: r[alKey] }));
  let projection = mode === 'trend'
    ? (projectByTrendCurve(gender, points, 18) || projectByTrend(points, 18))
    : null;
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

// computeChartModel(patient, projectionMode): 차트·패널·게이지가 공유하는 단일 진실원
export function computeChartModel(patient, projectionMode = 'percentile') {
  const gender = patient?.gender;
  if (!gender || !PERCENTILE_DATA[gender]) return { error: 'gender' };
  const records = (patient.records || []).filter((r) => r.age >= 4 && r.age <= 18);

  const curves = generatePercentileCurves(gender);
  const od = _eyeModel(gender, records, 'odAL', projectionMode);
  const os = _eyeModel(gender, records, 'osAL', projectionMode);

  const current = _riskFor(gender, records, projectionMode);
  const prev = records.length >= 3 ? _riskFor(gender, records.slice(0, -1), projectionMode) : null;

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
