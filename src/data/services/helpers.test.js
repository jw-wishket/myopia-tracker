import { describe, it, expect, vi } from 'vitest';

// helpers.js transitively imports supabaseClient.js, which calls createClient()
// at module load and throws without env. Mock it so we can test pure mappers.
vi.mock('../supabaseClient.js', () => ({ supabase: {} }));

import { toProfileJS, firstDistinctPatientIds, groupByPatientId } from './helpers.js';

describe('firstDistinctPatientIds', () => {
  it('날짜 내림차순 측정 행에서 중복 없이 최근 환자 id를 limit개까지 뽑는다', () => {
    const rows = [
      { patient_id: 'a' }, { patient_id: 'b' }, { patient_id: 'a' },
      { patient_id: 'c' }, { patient_id: 'b' }, { patient_id: 'd' },
    ];
    expect(firstDistinctPatientIds(rows, 3)).toEqual(['a', 'b', 'c']);
    expect(firstDistinctPatientIds(rows, 10)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('빈 입력은 빈 배열', () => {
    expect(firstDistinctPatientIds([], 5)).toEqual([]);
    expect(firstDistinctPatientIds(null, 5)).toEqual([]);
  });
});

describe('groupByPatientId', () => {
  it('행들을 patient_id별로 묶고 행 순서를 보존한다', () => {
    const rows = [
      { patient_id: 'a', date: '2026-01-01' },
      { patient_id: 'b', date: '2026-02-01' },
      { patient_id: 'a', date: '2026-03-01' },
    ];
    const grouped = groupByPatientId(rows);
    expect(grouped.a).toEqual([
      { patient_id: 'a', date: '2026-01-01' },
      { patient_id: 'a', date: '2026-03-01' },
    ]);
    expect(grouped.b).toEqual([{ patient_id: 'b', date: '2026-02-01' }]);
  });

  it('빈/널 입력은 빈 객체', () => {
    expect(groupByPatientId([])).toEqual({});
    expect(groupByPatientId(null)).toEqual({});
  });
});

describe('toProfileJS', () => {
  it('maps role, is_admin, is_active and omits removed tenant fields', () => {
    const row = { id: 'u1', email: 'a@b.com', name: '김의사', role: 'doctor', is_admin: true, is_active: true };
    const p = toProfileJS(row);
    expect(p).toEqual({ id: 'u1', email: 'a@b.com', name: '김의사', role: 'doctor', isAdmin: true, isActive: true });
    expect('clinicId' in p).toBe(false);
    expect('children' in p).toBe(false);
  });

  it('defaults is_admin/is_active sanely when missing', () => {
    const p = toProfileJS({ id: 'u2', name: 'n', role: 'nurse' });
    expect(p.isAdmin).toBe(false);
    expect(p.isActive).toBe(true);
  });
});
