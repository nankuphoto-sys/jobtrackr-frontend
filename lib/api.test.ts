import { describe, it, expect, beforeEach, vi } from 'vitest';
import { api, ApiError } from './api';
import { saveToken, getToken } from './auth';

function mockFetch(status: number, body: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: '', pathname: '/applications' },
    });
  });

  it('does not send an Authorization header when there is no token', async () => {
    mockFetch(200, []);
    await api.get('/applications');

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((options.headers as Headers).has('Authorization')).toBe(false);
  });

  it('sends the Authorization header when a token is saved', async () => {
    saveToken('my-token');
    mockFetch(200, []);
    await api.get('/applications');

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((options.headers as Headers).get('Authorization')).toBe('Bearer my-token');
  });

  it('returns undefined on a 204 response', async () => {
    mockFetch(204, null);
    const result = await api.delete('/applications/1');
    expect(result).toBeUndefined();
  });

  it('throws an ApiError with the backend message on a non-ok response', async () => {
    mockFetch(409, { error: 'Ya existe una cuenta con ese email' });

    await expect(api.post('/auth/register', {})).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe una cuenta con ese email',
    });
  });

  it('falls back to a generic message when the backend sends no error field', async () => {
    mockFetch(500, {});
    await expect(api.get('/applications')).rejects.toMatchObject({
      status: 500,
      message: 'Error inesperado',
    });
  });

  it('clears the token and redirects to /login on a 401 from a protected route', async () => {
    saveToken('expired-token');
    mockFetch(401, { error: 'Token inválido o expirado' });

    await expect(api.get('/applications')).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('does not clear the token or redirect on a 401 from /auth/login', async () => {
    mockFetch(401, { error: 'Credenciales inválidas' });

    await expect(api.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError);

    expect(window.location.href).toBe('');
  });
});
