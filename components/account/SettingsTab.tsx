'use client';

import { useEffect, useState } from 'react';
import { PasswordInput, Button, InlineNotification, RadioButtonGroup, RadioButton } from '@carbon/react';
import { Density, getDensity, saveDensity } from '@/lib/density';

function PasswordSection({ onChangePassword }: { onChangePassword: (current: string, next: string) => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSaving(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[15px] font-semibold text-[color:var(--cds-text-primary)]">Cambiar contraseña</h2>
      {error && <InlineNotification kind="error" title={error} lowContrast hideCloseButton />}
      {saved && <InlineNotification kind="success" title="Contraseña actualizada" lowContrast hideCloseButton />}
      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
        <PasswordInput
          id="current-password"
          labelText="Contraseña actual"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          hidePasswordLabel="Ocultar contraseña"
          showPasswordLabel="Mostrar contraseña"
        />
        <PasswordInput
          id="new-password"
          labelText="Contraseña nueva"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          hidePasswordLabel="Ocultar contraseña"
          showPasswordLabel="Mostrar contraseña"
        />
        <PasswordInput
          id="confirm-new-password"
          labelText="Confirmar contraseña nueva"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          hidePasswordLabel="Ocultar contraseña"
          showPasswordLabel="Mostrar contraseña"
        />
        <Button type="submit" disabled={saving} className="self-start">
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </Button>
      </form>
    </section>
  );
}

function DensitySection() {
  const [density, setDensity] = useState<Density>('comoda');

  // Se lee en un efecto (no en el useState inicial) para que el primer render
  // del cliente coincida con el HTML del servidor — localStorage no existe ahí.
  useEffect(() => {
    setDensity(getDensity());
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[15px] font-semibold text-[color:var(--cds-text-primary)]">Densidad del tablero</h2>
      <RadioButtonGroup
        legendText="Cómo se ven las tarjetas en el tablero"
        name="density"
        valueSelected={density}
        onChange={(value) => {
          const next = value as Density;
          setDensity(next);
          saveDensity(next);
        }}
      >
        <RadioButton id="density-comoda" labelText="Cómoda — más espacio entre tarjetas" value="comoda" />
        <RadioButton id="density-densa" labelText="Densa — el doble de vacantes sin hacer scroll" value="densa" />
      </RadioButtonGroup>
    </section>
  );
}

function DangerZone({ onDeleteAccount }: { onDeleteAccount: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    if (!password) {
      setError('Escribe tu contraseña para confirmar.');
      return;
    }
    if (!window.confirm('¿Eliminar tu cuenta? Se borran todas tus postulaciones y no se puede deshacer.')) return;

    setDeleting(true);
    try {
      await onDeleteAccount(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la cuenta');
      setDeleting(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 border-l-[3px] p-4" style={{ borderColor: 'var(--cds-support-error)', background: 'var(--cds-layer)' }}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold text-[color:var(--cds-text-primary)]">Zona de peligro</h2>
        <p className="text-[13px] text-[color:var(--cds-text-secondary)]">
          Elimina tu cuenta y todas tus postulaciones de forma permanente.
        </p>
      </div>
      {error && <InlineNotification kind="error" title={error} lowContrast hideCloseButton />}
      <div className="flex max-w-sm flex-col gap-3">
        <PasswordInput
          id="delete-account-password"
          labelText="Confirma tu contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hidePasswordLabel="Ocultar contraseña"
          showPasswordLabel="Mostrar contraseña"
        />
        <Button kind="danger" disabled={deleting} onClick={handleDelete} className="self-start">
          {deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
        </Button>
      </div>
    </section>
  );
}

export function SettingsTab({
  onChangePassword,
  onDeleteAccount,
}: {
  onChangePassword: (current: string, next: string) => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
}) {
  return (
    <div className="flex max-w-lg flex-col gap-8 py-6">
      <PasswordSection onChangePassword={onChangePassword} />
      <DensitySection />
      <DangerZone onDeleteAccount={onDeleteAccount} />
    </div>
  );
}
