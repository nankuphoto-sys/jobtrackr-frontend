'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { saveToken, saveUserEmail } from '@/lib/auth';
import { AuthResponse } from '@/lib/types';

const inputClass =
  'w-full border px-3 py-3 text-[14px] text-ink outline-none focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1;
  const variety = [/[a-z]/.test(pw), /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw)].filter(
    Boolean
  ).length;
  if (pw.length >= 12 && variety >= 3) return 3;
  if (variety >= 2) return 2;
  return 1;
}

const STRENGTH_BAR_COLOR = ['bg-line', 'bg-status-rechazado', 'bg-status-entrevista', 'bg-status-oferta'];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailValid = EMAIL_RE.test(email);
  const strength = passwordStrength(password);
  const passwordValid = password.length >= 8;
  const confirmValid = confirmPassword === password && confirmPassword.length > 0;
  const formValid = emailValid && passwordValid && confirmValid;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true, confirmPassword: true });
    setError(null);
    if (!formValid) return;

    setLoading(true);
    try {
      const data = await api.post<AuthResponse>('/auth/register', { email, password });
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
          <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-.01em] text-ink">Crear cuenta</h1>
          <p className="text-[14px] leading-[1.5] text-muted">Un tablero para todas tus vacantes.</p>
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
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              className={`${inputClass} ${touched.email && !emailValid ? 'border-status-rechazado' : 'border-line-strong'}`}
              placeholder="tu@correo.com"
            />
            {touched.email && !emailValid && (
              <span className="text-[12px] font-medium leading-[1.4] text-status-rechazado-text">
                Escribe un correo válido, por ejemplo nombre@correo.com
              </span>
            )}
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
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              className={`${inputClass} ${touched.password && !passwordValid ? 'border-status-rechazado' : 'border-line-strong'}`}
              placeholder="Mínimo 8 caracteres"
            />
            <div className="mt-0.5 flex gap-1">
              {[1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className={`h-[3px] flex-1 ${bar <= strength ? STRENGTH_BAR_COLOR[strength] : 'bg-line'}`}
                />
              ))}
            </div>
            {touched.password && !passwordValid && (
              <span className="text-[12px] font-medium leading-[1.4] text-status-rechazado-text">
                Mínimo 8 caracteres.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">
              Confirmar contraseña
            </span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
              className={`${inputClass} ${touched.confirmPassword && !confirmValid ? 'border-status-rechazado' : 'border-line-strong'}`}
              placeholder="Repite la contraseña"
            />
            {touched.confirmPassword && !confirmValid && (
              <span className="text-[12px] font-medium leading-[1.4] text-status-rechazado-text">
                Las contraseñas no coinciden.
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={loading || (Object.values(touched).some(Boolean) && !formValid)}
            className="mt-1 w-full bg-ink px-4 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink-2 disabled:opacity-[.45]"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <span className="text-[13px] text-muted">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-ink underline underline-offset-2 hover:text-muted">
            Iniciar sesión
          </Link>
        </span>
      </section>
    </main>
  );
}
