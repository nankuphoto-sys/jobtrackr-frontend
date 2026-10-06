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
  InlineNotification,
} from '@carbon/react';
import { Time } from '@carbon/icons-react';
import { api, ApiError } from '@/lib/api';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { STATUS_ACCENT_COLOR, STATUS_SOFT_BG, STATUS_CHIP_TEXT } from '@/lib/statusStyles';
import { fondoRecordatorio } from './KanbanCard';

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
  // Se calcula sobre la postulación guardada, no sobre el formulario a medio editar.
  const recordatorio = app?.aviso ?? null;

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

  /**
   * Acciones rápidas del recordatorio. Guardan y cierran el modal como "Guardar",
   * así que si hay cambios a medio escribir se pide confirmación antes de perderlos.
   */
  async function handleQuickAction(accion: 'seguimiento' | 'rechazado') {
    if (!app) return;
    if (isDirty && !window.confirm('Tienes cambios sin guardar que se van a perder. ¿Continuar?')) return;
    setSaving(true);
    setError(null);
    try {
      const saved =
        accion === 'seguimiento'
          ? await api.post<JobApplication>(`/applications/${app.id}/follow-up`)
          : await api.put<JobApplication>(`/applications/${app.id}`, { status: 'RECHAZADO' });
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
          {recordatorio && (
            <div
              className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ background: fondoRecordatorio(recordatorio) }}
              data-testid="recordatorio-modal"
            >
              <div className="flex items-start gap-2 text-[color:var(--cds-text-primary)]">
                <Time size={16} aria-hidden className="mt-0.5 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-semibold">{recordatorio.texto}</span>
                  <span className="text-[12px] text-[color:var(--cds-text-secondary)]">
                    {recordatorio.tipo === 'cierre'
                      ? 'La fecha límite de la oferta está cerca o ya pasó.'
                      : '¿Escribiste para preguntar cómo va? Márcalo y el aviso se reinicia.'}
                  </span>
                </div>
              </div>
              {recordatorio.tipo !== 'cierre' && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" kind="tertiary" onClick={() => handleQuickAction('seguimiento')} disabled={saving}>
                    Hice seguimiento
                  </Button>
                  <Button size="sm" kind="ghost" onClick={() => handleQuickAction('rechazado')} disabled={saving}>
                    Marcar rechazado
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput id="company" labelText="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
            <TextInput id="role" labelText="Cargo" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="cds--label text-[12px] text-[color:var(--cds-text-secondary)]">Estado</span>
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STATUSES.map((s) => {
                const selected = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className="font-mono text-[11px] font-semibold uppercase tracking-[.05em] transition-colors"
                    style={
                      selected
                        ? {
                            border: `2px solid ${STATUS_ACCENT_COLOR[s]}`,
                            background: STATUS_SOFT_BG[s],
                            color: STATUS_CHIP_TEXT[s],
                            padding: '8px 10px',
                          }
                        : {
                            border: '1px solid var(--cds-border-subtle-01)',
                            background: 'transparent',
                            color: 'var(--cds-text-secondary)',
                            padding: '9px 11px',
                          }
                    }
                  >
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
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
