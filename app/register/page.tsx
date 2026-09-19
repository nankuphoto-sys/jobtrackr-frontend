'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TextInput, PasswordInput, Button, InlineNotification } from '@carbon/react';
import { api, ApiError } from '@/lib/api';
import { saveToken, saveUserEmail } from '@/lib/auth';
import { AuthResponse } from '@/lib/types';
import { Logo } from '@/components/Logo';

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

const STRENGTH_COLOR = [
  'var(--cds-border-subtle-01)',
  'var(--cds-support-error)',
  'var(--cds-support-warning)',
  'var(--cds-support-success)',
];

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
    <main
      className="flex min-h-screen items-center justify-center p-4 sm:p-6"
      style={{ background: 'var(--cds-background)' }}
    >
      <section
        className="flex w-full max-w-sm flex-col gap-5 border p-8"
        style={{ borderColor: 'var(--cds-border-subtle-01)', background: 'var(--cds-layer)' }}
      >
        <div className="flex flex-col gap-2.5">
          <Logo size={32} />
          <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-.01em] text-[color:var(--cds-text-primary)]">
            Crear cuenta
          </h1>
          <p className="text-[14px] leading-[1.5] text-[color:var(--cds-text-secondary)]">
            Un tablero para todas tus vacantes.
          </p>
        </div>

        {error && <InlineNotification kind="error" title={error} lowContrast hideCloseButton />}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextInput
            id="email"
            type="email"
            labelText="Correo"
            placeholder="tu@correo.com"
            required
            value={email}
            invalid={touched.email && !emailValid}
            invalidText="Escribe un correo válido, por ejemplo nombre@correo.com"
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          />

          <div className="flex flex-col gap-2">
            <PasswordInput
              id="password"
              labelText="Contraseña"
              placeholder="Mínimo 8 caracteres"
              required
              value={password}
              invalid={touched.password && !passwordValid}
              invalidText="Mínimo 8 caracteres."
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              hidePasswordLabel="Ocultar contraseña"
              showPasswordLabel="Mostrar contraseña"
            />
            <div className="flex gap-1">
              {[1, 2, 3].map((bar) => (
                <span
                  key={bar}
                  className="h-[3px] flex-1"
                  style={{ background: bar <= strength ? STRENGTH_COLOR[strength] : 'var(--cds-border-subtle-01)' }}
                />
              ))}
            </div>
          </div>

          <PasswordInput
            id="confirmPassword"
            labelText="Confirmar contraseña"
            placeholder="Repite la contraseña"
            required
            value={confirmPassword}
            invalid={touched.confirmPassword && !confirmValid}
            invalidText="Las contraseñas no coinciden."
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
            hidePasswordLabel="Ocultar contraseña"
            showPasswordLabel="Mostrar contraseña"
          />

          <Button
            type="submit"
            disabled={loading || (Object.values(touched).some(Boolean) && !formValid)}
            className="mt-1 w-full justify-center"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>

        <span className="text-[13px] text-[color:var(--cds-text-secondary)]">
          ¿Ya tienes cuenta? <Link href="/login" className="cds--link">Iniciar sesión</Link>
        </span>
      </section>
    </main>
  );
}
