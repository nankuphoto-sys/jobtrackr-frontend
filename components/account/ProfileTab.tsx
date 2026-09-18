'use client';

import { useState } from 'react';
import { TextInput, Button, InlineNotification } from '@carbon/react';
import { UserProfile } from '@/lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function ProfileTab({
  profile,
  onSave,
}: {
  profile: UserProfile;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(profile.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initials = (profile.name || profile.email).slice(0, 2).toUpperCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await onSave(name);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6 py-6">
      <div className="flex items-center gap-4">
        <span
          className="grid h-16 w-16 place-items-center font-mono text-[22px] font-semibold"
          style={{ background: 'var(--cds-text-primary)', color: 'var(--cds-background)' }}
        >
          {initials}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-[17px] font-semibold text-[color:var(--cds-text-primary)]">
            {profile.name || profile.email}
          </span>
          <span className="text-[13px] text-[color:var(--cds-text-secondary)]">
            Miembro desde {formatDate(profile.createdAt)}
          </span>
        </div>
      </div>

      {error && <InlineNotification kind="error" title={error} lowContrast hideCloseButton />}
      {saved && <InlineNotification kind="success" title="Perfil actualizado" lowContrast hideCloseButton />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextInput id="profile-name" labelText="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput id="profile-email" labelText="Correo" value={profile.email} disabled />

        <Button type="submit" disabled={saving} className="self-start">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </div>
  );
}
