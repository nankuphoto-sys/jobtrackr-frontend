import { test, expect, Page } from '@playwright/test';
import { registerTestUser, loginAs, API_URL } from './helpers';

// El extractor se simula con page.route (no hace falta Ollama); crear la
// tarjeta sí va contra el backend real, con el POST /applications de siempre.
const OFERTA = {
  company: 'Mapa Verde',
  role: 'Desarrollador/a Frontend Vue.js',
  location: 'Latinoamérica',
  modality: 'remote',
  seniority: 'mid',
  salary: { min: null, max: null, currency: null, period: null },
  stack: ['Vue.js', 'Pinia', 'GraphQL'],
  requirements: ['2 a 4 años con Vue.js'],
  language: 'Inglés',
  applyUrl: 'https://mapaverde.org/trabaja-con-nosotros',
  deadline: '2026-11-15',
  summary: 'Rol frontend remoto para LATAM.',
};

async function simularExtractor(page: Page, estado: object, extraccion?: { status: number; body: object }) {
  await page.route(`${API_URL}/ai/status`, (route) => route.fulfill({ json: estado }));
  if (extraccion) {
    await page.route(`${API_URL}/ai/extract-job`, (route) => route.fulfill({ status: extraccion.status, json: extraccion.body }));
  }
}

async function abrirPegarOferta(page: Page, token: string) {
  await loginAs(page, token);
  await page.goto('/applications');
  await page.getByRole('button', { name: 'Pegar oferta' }).click();
  await expect(page.getByRole('heading', { name: 'Pegar oferta' })).toBeVisible();
}

test('pegar oferta: extrae, se revisa y edita, y crea la tarjeta en "Por aplicar"', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-pegar-ok');
  await simularExtractor(page, { habilitado: true, disponible: true, modelo: 'qwen3:4b' }, {
    status: 200,
    body: { oferta: OFERTA, descartados: [], intentos: 1, ms: 3200 },
  });
  await abrirPegarOferta(page, token);

  await page.getByLabel('Texto de la oferta').fill('Mapa Verde busca Desarrollador/a Frontend Vue.js…');
  await page.getByRole('button', { name: 'Extraer con IA local' }).click();

  // Formulario prellenado y editable.
  await expect(page.getByRole('heading', { name: 'Revisa antes de crear la tarjeta' })).toBeVisible();
  await expect(page.getByLabel('Empresa')).toHaveValue('Mapa Verde');
  await expect(page.getByLabel('Modalidad')).toHaveValue('remote');
  await expect(page.getByLabel('Notas')).toHaveValue(/Requisitos:\n- 2 a 4 años con Vue.js\n\nIdioma: Inglés/);
  await expect(page.getByLabel('Stack', { exact: true }).getByText('Pinia')).toBeVisible();
  await page.getByLabel('Cargo').fill('Frontend Vue.js (LATAM)');

  await page.getByRole('button', { name: 'Crear tarjeta' }).click();
  await expect(page.locator('[data-testid="column-POR_APLICAR"]').getByText('Mapa Verde')).toBeVisible();

  const apps = await request.get(`${API_URL}/applications`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  expect(apps[0]).toMatchObject({
    role: 'Frontend Vue.js (LATAM)', status: 'POR_APLICAR', modality: 'remote', seniority: 'mid',
    stack: ['Vue.js', 'Pinia', 'GraphQL'], link: 'https://mapaverde.org/trabaja-con-nosotros',
  });
  expect(apps[0].deadline).toMatch(/^2026-11-15/);
});

test('pegar oferta: si Ollama no responde (503) avisa y deja llenar a mano', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-pegar-503');
  await simularExtractor(page, { habilitado: true, disponible: true, modelo: 'qwen3:4b' }, {
    status: 503,
    body: { error: 'El modelo local no está disponible. ¿Está abierto Ollama?' },
  });
  await abrirPegarOferta(page, token);

  await page.getByLabel('Texto de la oferta').fill('Una oferta cualquiera');
  await page.getByRole('button', { name: 'Extraer con IA local' }).click();
  await expect(page.getByText('El modelo local no está disponible. ¿Está abierto Ollama?')).toBeVisible();

  await page.getByRole('button', { name: 'Llenar a mano' }).click();
  await expect(page.getByLabel('Notas')).toHaveValue(/Oferta original:\nUna oferta cualquiera/);
  await page.getByLabel('Empresa').fill('Acme');
  await page.getByLabel('Cargo').fill('QA');
  await page.getByRole('button', { name: 'Crear tarjeta' }).click();
  await expect(page.locator('[data-testid="column-POR_APLICAR"]').getByText('Acme')).toBeVisible();
});

test('pegar oferta: con el extractor apagado (producción) se avisa y no se puede extraer', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-pegar-off');
  await simularExtractor(page, { habilitado: false, disponible: false, modelo: 'qwen3:4b' });
  await abrirPegarOferta(page, token);

  await expect(page.getByText('El extractor de IA local no está disponible.')).toBeVisible();
  await page.getByLabel('Texto de la oferta').fill('Texto');
  await expect(page.getByRole('button', { name: 'Extraer con IA local' })).toBeDisabled();
});

test('pegar oferta: avisa qué datos se descartaron por no estar en el texto', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-pegar-descartes');
  await simularExtractor(page, { habilitado: true, disponible: true, modelo: 'qwen3:4b' }, {
    status: 200,
    body: { oferta: { ...OFERTA, company: null }, descartados: ['company'], intentos: 1, ms: 2900 },
  });
  await abrirPegarOferta(page, token);

  await page.getByLabel('Texto de la oferta').fill('Oferta sin nombre de empresa');
  await page.getByRole('button', { name: 'Extraer con IA local' }).click();
  await expect(page.getByText(/no aparecen en el texto: empresa/)).toBeVisible();
  await expect(page.getByLabel('Empresa')).toHaveValue('');
});
