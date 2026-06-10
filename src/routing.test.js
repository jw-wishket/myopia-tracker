import { describe, it, expect } from 'vitest';
import { routeForUser } from './routing.js';

describe('routeForUser', () => {
  it('routes admins to admin', () => {
    expect(routeForUser({ role: 'doctor', isAdmin: true })).toBe('admin');
  });
  it('routes non-admin doctor and nurse to doctor', () => {
    expect(routeForUser({ role: 'doctor', isAdmin: false })).toBe('doctor');
    expect(routeForUser({ role: 'nurse', isAdmin: false })).toBe('doctor');
  });
  it('defaults null/undefined user to login', () => {
    expect(routeForUser(null)).toBe('login');
    expect(routeForUser(undefined)).toBe('login');
  });
});
