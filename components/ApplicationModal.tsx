'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { STATUS_CHIP_ACTIVE_CLASS, STATUS_CHIP_INACTIVE_CLASS } from '@/lib/statusStyles';

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const inputClass =
  'w-full border border-line-strong bg-surface px-3 py-[11px] text-[14px] text-ink outline-none focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">{label}</span>
      {children}
    </label>
  );
}

type Props = {
  /** null = modo crear */
  app: JobApplication | null;
  onClose: () => void;
  onSaved: (app: JobApplication) => void;
  onDeleted: (id: string) => void;
};

export function ApplicationModal({ app, onClose, onSaved, onDeleted }: Props) {
  const isEdit = app !== null;
  const [company, setCompany] = useState(app?.company ?? '');
  const [role, setRole] = useState(app?.role ?? '');
  const [status, setStatus] = useState<ApplicationStatus>(app?.status ?? 'POR_APLICAR');
  const [appliedAt, setAppliedAt] = useState(app ? toDateInputValue(app.appliedAt) : todayInputValue());
  const [link, setLink] = useState(app?.link ?? '');
  const [notes, setNotes] = useState(app?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  const isDirty =
    company !== (app?.company ?? '') ||
    role !== (app?.role ?? '') ||
    status !== (app?.status ?? 'POR_APLICAR') ||
    appliedAt !== (app ? toDateInputValue(app.appliedAt) : todayInputValue()) ||
    link !== (app?.link ?? '') ||
    notes !== (app?.notes ?? '');

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  function requestClose() {
    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Cerrar de todas formas?')) return;
    onClose();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (link && !isValidUrl(link)) {
      setError('El link de la vacante no es una URL válida.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        company,
        role,
        status,
        link: link || null,
        notes: notes || null,
        appliedAt: appliedAt || null,
      };
      const saved = isEdit
        ? await api.put<JobApplication>(`/applications/${app!.id}`, payload)
        : await api.post<JobApplication>('/applications', payload);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!app) return;
    if (!window.confirm('¿Borrar esta postulación? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/applications/${app.id}`);
      onDeleted(app.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar la postulación');
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-2/80 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-modal-title"
        className="flex w-full max-w-[520px] flex-col border border-ink bg-surface"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="application-modal-title" className="text-[16px] font-semibold leading-none text-ink">
            {isEdit ? 'Editar postulación' : 'Nueva postulación'}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Cerrar"
            className="grid h-7 w-7 place-items-center border border-line font-mono text-sm text-ink-3 hover:border-ink hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-col gap-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Empresa *">
              <input
                ref={firstInputRef}
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Cargo *">
              <input required value={role} onChange={(e) => setRole(e.target.value)} className={inputClass} />
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">Estado</span>
            <div className="flex flex-wrap gap-1.5">
              {APPLICATION_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`border px-[11px] py-[9px] font-mono text-[11px] font-semibold uppercase tracking-[.05em] transition-colors ${
                    status === s ? STATUS_CHIP_ACTIVE_CLASS[s] : STATUS_CHIP_INACTIVE_CLASS
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Link de la vacante">
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className={`${inputClass} font-mono text-[13px]`}
              />
            </Field>
          </div>

          <Field label="Notas">
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} resize-y`}
            />
          </Field>

          {error && (
            <p className="border border-l-[3px] border-status-rechazado bg-status-rechazado-bg px-[13px] py-[11px] text-[13px] font-medium text-status-rechazado-text">
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-5 py-3.5">
          {isEdit ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="border border-line px-[13px] py-2.5 text-[13px] font-semibold text-status-rechazado hover:border-status-rechazado hover:bg-status-rechazado-bg disabled:opacity-50"
            >
              {deleting ? 'Borrando...' : 'Eliminar'}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestClose}
              className="border border-line-strong bg-surface px-[15px] py-2.5 text-[13px] font-semibold text-ink-2 hover:border-ink"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border border-ink bg-ink px-[18px] py-2.5 text-[13px] font-semibold text-white hover:border-ink-2 hover:bg-ink-2 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
