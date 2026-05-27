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
