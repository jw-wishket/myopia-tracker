import { describe, it, expect } from 'vitest';
import { classifyRate } from './utils.js';

describe('classifyRate', () => {
  it('표시 정밀도(소수 2자리)로 반올림한 뒤 분류한다 — 0.30으로 표시되는 값은 보통', () => {
    // 이서윤 케이스: 24.45 - 24.15 = 0.30000000000000071 (부동소수점)
    // 365일을 365.25로 연환산하면 0.3002... → 반올림 없이 비교하면 "빠름"으로 오분류
    const rate = (24.45 - 24.15) / (365 / 365.25);
    expect(classifyRate(rate).label).toBe('보통');
  });

  it('경계값은 이하 판정 — 0.1 안정, 0.2 느림, 0.3 보통, 초과는 빠름', () => {
    expect(classifyRate(0.1).label).toBe('안정');
    expect(classifyRate(0.2).label).toBe('느림');
    expect(classifyRate(0.3).label).toBe('보통');
    expect(classifyRate(0.31).label).toBe('빠름');
  });

  it('음수 속도는 절대값으로 분류한다', () => {
    expect(classifyRate(-0.05).label).toBe('안정');
    expect(classifyRate(-0.5).label).toBe('빠름');
  });

  it('표시값과 평가가 일치하도록 0.304는 보통(0.30 표시), 0.306은 빠름(0.31 표시)', () => {
    expect(classifyRate(0.304).label).toBe('보통');
    expect(classifyRate(0.306).label).toBe('빠름');
  });
});
