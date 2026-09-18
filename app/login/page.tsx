'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TextInput, PasswordInput, Button, InlineNotification, InlineLoading } from '@carbon/react';
import { api, ApiError } from '@/lib/api';
import { saveToken, saveUserEmail } from '@/lib/auth';
import { AuthResponse } from '@/lib/types';

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
    <main
      className="flex min-h-screen items-center justify-center p-4 sm:p-6"
      style={{ background: 'var(--cds-background)' }}
    >
      <section
        className="flex w-full max-w-sm flex-col gap-5 border p-8"
        style={{ borderColor: 'var(--cds-border-subtle-01)', background: 'var(--cds-layer)' }}
      >
        <div className="flex flex-col gap-2.5">
          <span
            className="grid h-[26px] w-[26px] place-items-center font-mono text-[13px] font-semibold"
            style={{ background: 'var(--cds-text-primary)', color: 'var(--cds-background)' }}
          >
            J
          </span>
          <h1 className="text-[22px] font-semibold leading-[1.15] tracking-[-.01em] text-[color:var(--cds-text-primary)]">
            Iniciar sesión
          </h1>
          <p className="text-[14px] leading-[1.5] text-[color:var(--cds-text-secondary)]">
            Continúa el seguimiento de tus postulaciones.
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
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordInput
            id="password"
            labelText="Contraseña"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hidePasswordLabel="Ocultar contraseña"
            showPasswordLabel="Mostrar contraseña"
          />

          <Button type="submit" disabled={loading} className="mt-1 w-full justify-center">
            Entrar
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-[13px] text-[color:var(--cds-text-secondary)]">
            ¿No tienes cuenta? <Link href="/register" className="cds--link">Registrarse</Link>
          </span>
          {loading && <InlineLoading description="Cargando" />}
        </div>
      </section>
    </main>
  );
}
