import { describe, it, expect, beforeEach } from 'vitest';
import { saveToken, getToken, clearToken } from './auth';

describe('auth token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when there is no token saved', () => {
    expect(getToken()).toBeNull();
  });

  it('saves and retrieves a token', () => {
    saveToken('abc.def.ghi');
    expect(getToken()).toBe('abc.def.ghi');
  });

  it('clears the token', () => {
    saveToken('abc.def.ghi');
    clearToken();
    expect(getToken()).toBeNull();
  });
});
