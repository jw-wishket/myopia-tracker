import { describe, it, expect } from 'vitest';
import { interpolateValue, refValue, calcPercentile, calcPct, generatePercentileCurves, generateCurveData, projectToAge, alToRefraction, predictAdultRefraction, progressionRate, assessRisk, computeChartModel } from './myopiaModel.js';
import { PERCENTILE_GRID } from './constants.js';

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

describe('결측 안축장(NaN) 처리', () => {
  it('calcPercentile: NaN 안축장 → null', () => {
    expect(calcPercentile('female', 13, NaN)).toBeNull();
  });

  it('progressionRate: 모두 NaN인 레코드 → null', () => {
    const records = [
      { date: '2024-01-01', odAL: NaN },
      { date: '2025-01-01', odAL: NaN },
    ];
    expect(progressionRate(records, 'odAL')).toBeNull();
  });

  it('computeChartModel: odAL이 모두 NaN이면 od=null, os는 비-null, risk는 유효 레이블', () => {
    const patient = {
      gender: 'female',
      records: [
        { date: '2024-07-01', age: 12.5, odAL: NaN, osAL: 24.2 },
        { date: '2025-12-01', age: 13.4, odAL: NaN, osAL: 24.5 },
      ],
      treatments: [],
    };
    const m = computeChartModel(patient);
    expect(m.od).toBeNull();
    expect(m.os).not.toBeNull();
    expect(['낮음', '중간', '높음']).toContain(m.risk);
  });
});
