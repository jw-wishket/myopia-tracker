import { describe, it, expect } from 'vitest';
import { interpolateValue, refValue, calcPercentile, calcPct, generatePercentileCurves, generateCurveData, projectToAge } from './myopiaModel.js';
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
