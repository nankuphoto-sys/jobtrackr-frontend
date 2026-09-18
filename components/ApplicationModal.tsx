'use client';

import { useState } from 'react';
import {
  Button,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  TextInput,
  TextArea,
  Tag,
  InlineNotification,
} from '@carbon/react';
import { api, ApiError } from '@/lib/api';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { STATUS_TAG_TYPE } from '@/lib/statusStyles';

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

  const isDirty =
    company !== (app?.company ?? '') ||
    role !== (app?.role ?? '') ||
    status !== (app?.status ?? 'POR_APLICAR') ||
    appliedAt !== (app ? toDateInputValue(app.appliedAt) : todayInputValue()) ||
    link !== (app?.link ?? '') ||
    notes !== (app?.notes ?? '');

  function requestClose() {
    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Cerrar de todas formas?')) return;
    onClose();
  }

  async function handleSubmit() {
    setError(null);

    if (!company.trim() || !role.trim()) {
      setError('Empresa y cargo son obligatorios.');
      return;
    }
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
    <ComposedModal open size="md" onClose={requestClose} preventCloseOnClickOutside>
      <ModalHeader title={isEdit ? 'Editar postulación' : 'Nueva postulación'} />
      <ModalBody hasForm>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput id="company" labelText="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
            <TextInput id="role" labelText="Cargo" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="cds--label text-[12px] text-[color:var(--cds-text-secondary)]">Estado</span>
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STATUSES.map((s) => (
                <Tag
                  key={s}
                  as="button"
                  type={STATUS_TAG_TYPE[s]}
                  onClick={() => setStatus(s)}
                  style={
                    status === s
                      ? { outline: '2px solid var(--cds-focus)', outlineOffset: '2px' }
                      : { opacity: 0.55 }
                  }
                >
                  {STATUS_LABELS[s]}
                </Tag>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              id="appliedAt"
              type="date"
              labelText="Fecha"
              value={appliedAt}
              onChange={(e) => setAppliedAt(e.target.value)}
            />
            <TextInput
              id="link"
              type="url"
              labelText="Link de la vacante"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <TextArea id="notes" labelText="Notas" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && <InlineNotification kind="error" title={error} lowContrast hideCloseButton />}
        </div>
      </ModalBody>
      {/*
        No usamos primaryButtonText/secondaryButtonText: ModalFooter los ordena
        {children} → secundario → primario, pero el diseño pide "Eliminar" a la
        izquierda y Cancelar/Guardar a la derecha (justify-content: space-between).
      */}
      <ModalFooter>
        <div className="flex w-full items-center justify-between gap-3">
          {isEdit ? (
            <Button kind="danger--tertiary" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Borrando...' : 'Eliminar'}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button kind="secondary" onClick={requestClose}>
              Cancelar
            </Button>
            <Button kind="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </ModalFooter>
    </ComposedModal>
  );
}
