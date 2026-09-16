'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getToken, clearToken } from '@/lib/auth';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  POR_APLICAR: 'bg-gray-100 text-gray-700',
  APLICADO: 'bg-blue-100 text-blue-700',
  ENTREVISTA: 'bg-amber-100 text-amber-700',
  OFERTA: 'bg-green-100 text-green-700',
  RECHAZADO: 'bg-red-100 text-red-700',
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    api
      .get<JobApplication[]>('/applications')
      .then(setApplications)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const previous = applications;
    setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, status } : a)));

    try {
      await api.put<JobApplication>(`/applications/${id}`, { status });
    } catch (err) {
      setApplications(previous);
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Borrar esta postulación? Esta acción no se puede deshacer.')) return;

    const previous = applications;
    setApplications((apps) => apps.filter((a) => a.id !== id));

    try {
      await api.delete(`/applications/${id}`);
    } catch (err) {
      setApplications(previous);
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar la postulación');
    }
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Mis postulaciones</h1>
          <div className="flex gap-2">
            <Link
              href="/applications/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 text-center"
            >
              + Nueva postulación
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Cargando...</p>}

        {error && (
          <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && applications.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">
            Todavía no registraste ninguna postulación.
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {applications.map((app) => (
            <li key={app.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{app.company}</p>
                  <p className="text-sm text-gray-600">{app.role}</p>
                </div>
                <button
                  onClick={() => handleDelete(app.id)}
                  className="text-sm text-red-500 hover:text-red-700 hover:underline whitespace-nowrap"
                >
                  Borrar
                </button>
              </div>
              {app.link && (
                <a
                  href={app.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline break-all"
                >
                  {app.link}
                </a>
              )}
              {app.notes && <p className="mt-2 text-sm text-gray-500">{app.notes}</p>}

              <select
                value={app.status}
                onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                className={`mt-3 text-xs font-medium rounded-full px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_STYLES[app.status]}`}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
