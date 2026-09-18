import { JobApplication } from './types';

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo, 1 = lunes, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function computeStats(applications: JobApplication[]) {
  const total = applications.length;
  const weekStart = startOfWeek();
  const thisWeek = applications.filter((a) => new Date(a.createdAt) >= weekStart).length;

  // "Tasa de respuesta": de las que ya se aplicaron (todo menos "Por aplicar"),
  // qué porcentaje avanzó a Entrevista u Oferta.
  const applied = applications.filter((a) => a.status !== 'POR_APLICAR');
  const advanced = applied.filter((a) => a.status === 'ENTREVISTA' || a.status === 'OFERTA');
  const responseRate = applied.length > 0 ? Math.round((advanced.length / applied.length) * 100) : null;

  return { total, thisWeek, responseRate };
}
