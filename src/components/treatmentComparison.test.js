import { describe, it, expect } from 'vitest';
import { renderTreatmentComparison } from './treatmentComparison.js';

const base = { id: 'p1', name: '테스트', birthDate: '2016-01-01', gender: 'male' };

describe('renderTreatmentComparison', () => {
  it('치료 전 데이터가 부족해도 치료 후 진행 속도는 표시한다', () => {
    // 치료 시작일 = 첫 측정일 → "치료 전" 측정 0건, "치료 후" 3건(1년, +0.30mm)
    const patient = {
      ...base,
      records: [
        { date: '2024-01-01', odAL: 23.0, osAL: 23.0 },
        { date: '2024-07-01', odAL: 23.2, osAL: 23.2 },
        { date: '2025-01-01', odAL: 23.3, osAL: 23.3 },
      ],
      treatments: [{ id: 't1', type: '드림렌즈', date: '2024-01-01' }],
    };
    const html = renderTreatmentComparison(patient);
    expect(html).toContain('치료 후');
    expect(html).toContain('0.30mm/y');     // 치료 후 속도는 보여야 함
    expect(html).toContain('측정 데이터 부족'); // 치료 전 칸에는 부족 안내
  });

  it('전후 모두 충분하면 변화율을 표시한다', () => {
    const patient = {
      ...base,
      records: [
        { date: '2023-07-01', odAL: 22.8, osAL: 22.8 },
        { date: '2024-01-01', odAL: 23.0, osAL: 23.0 },
        { date: '2024-07-01', odAL: 23.2, osAL: 23.2 },
        { date: '2025-01-01', odAL: 23.3, osAL: 23.3 },
      ],
      treatments: [{ id: 't1', type: '드림렌즈', date: '2024-07-01' }],
    };
    const html = renderTreatmentComparison(patient);
    expect(html).toContain('치료 전');
    expect(html).toContain('치료 후');
    expect(html).toContain('-50%'); // 0.40 → 0.20mm/y
  });
});
