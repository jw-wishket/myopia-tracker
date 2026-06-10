import { describe, it, expect } from 'vitest';
import { routeForUser } from './routing.js';

describe('routeForUser', () => {
  it('routes any logged-in staff (admin or not) to the dashboard', () => {
    expect(routeForUser({ role: 'doctor', isAdmin: true })).toBe('doctor');
    expect(routeForUser({ role: 'doctor', isAdmin: false })).toBe('doctor');
    expect(routeForUser({ role: 'nurse', isAdmin: false })).toBe('doctor');
  });
  it('defaults null/undefined user to login', () => {
    expect(routeForUser(null)).toBe('login');
    expect(routeForUser(undefined)).toBe('login');
  });
});
