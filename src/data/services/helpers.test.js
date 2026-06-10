import { describe, it, expect, vi } from 'vitest';

// helpers.js transitively imports supabaseClient.js, which calls createClient()
// at module load and throws without env. Mock it so we can test pure mappers.
vi.mock('../supabaseClient.js', () => ({ supabase: {} }));

import { toProfileJS } from './helpers.js';

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
