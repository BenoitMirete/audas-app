import { describe, it, expect, beforeEach } from 'vitest';
import { setToken, getToken, clearToken } from '../lib/auth';

describe('auth token storage', () => {
  beforeEach(() => localStorage.clear());
  it('stores and retrieves token', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
  });
  it('returns null when no token', () => {
    expect(getToken()).toBeNull();
  });
  it('clears token', () => {
    setToken('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
