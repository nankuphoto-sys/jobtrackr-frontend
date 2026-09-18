'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { saveToken, saveUserEmail } from '@/lib/auth';
import { AuthResponse } from '@/lib/types';

const inputClass =
  'w-full border px-3 py-3 text-[14px] text-ink outline-none focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.post<AuthResponse>('/auth/login', { email, password });
      saveToken(data.token);
      saveUserEmail(data.user.email);
      router.push('/applications');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-4 sm:p-6">
      <section className="flex w-full max-w-sm flex-col gap-5 border border-line-strong bg-surface p-8">
        <div className="flex flex-col gap-2.5">
          <span className="grid h-[26px] w-[26px] place-items-center bg-ink font-mono text-[13px] font-semibold text-white">
            J
          </span>
          <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-.01em] text-ink">Iniciar sesión</h1>
          <p className="text-[14px] leading-[1.5] text-muted">Continúa el seguimiento de tus postulaciones.</p>
        </div>

        {error && (
          <div className="border border-l-[3px] border-status-rechazado bg-status-rechazado-bg px-[13px] py-[11px]">
            <span className="text-[13px] font-medium text-status-rechazado-text">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">Correo</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputClass} border-line-strong`}
              placeholder="tu@correo.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">
              Contraseña
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} ${error ? 'border-status-rechazado' : 'border-line-strong'}`}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full bg-ink px-4 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink-2 disabled:opacity-50"
          >
            Entrar
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-[13px] text-muted">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-ink underline underline-offset-2 hover:text-muted">
              Registrarse
            </Link>
          </span>
          {loading && (
            <span className="flex items-center gap-2 border border-line px-3 py-2 font-mono text-[12px] font-semibold uppercase tracking-[.06em] text-muted">
              <span className="h-[9px] w-[9px] animate-spin rounded-full border-2 border-line-strong border-t-muted" />
              Cargando
            </span>
          )}
        </div>
      </section>
    </main>
  );
}
