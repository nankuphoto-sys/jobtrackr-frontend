import { test, expect } from '@playwright/test';
import { uniqueEmail } from './helpers';

test('home muestra los botones de iniciar sesión y crear cuenta', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeVisible();
});

test('acceder a /applications sin token redirige a /login', async ({ page }) => {
  await page.goto('/applications');
  await expect(page).toHaveURL(/\/login$/);
});

test('registro exitoso guarda el token y redirige a /applications', async ({ page }) => {
  const email = uniqueEmail('e2e-register');

  await page.goto('/register');
  await page.fill('#email', email);
  await page.fill('#password', 'secret123');
  await page.fill('#confirmPassword', 'secret123');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/applications$/);
  const token = await page.evaluate(() => localStorage.getItem('jobtrackr_token'));
  expect(token).toBeTruthy();
});

test('registro con contraseñas distintas no llama al backend', async ({ page }) => {
  let registerCalled = false;
  page.on('request', (req) => {
    if (req.url().includes('/auth/register')) registerCalled = true;
  });

  await page.goto('/register');
  await page.fill('#email', uniqueEmail('e2e-mismatch'));
  await page.fill('#password', 'secret123');
  await page.fill('#confirmPassword', 'otra-cosa');
  await page.click('button[type=submit]');

  await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
  expect(registerCalled).toBe(false);
  await expect(page).toHaveURL(/\/register$/);
});

test('login con contraseña incorrecta muestra error y no redirige', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', uniqueEmail('e2e-nouser'));
  await page.fill('#password', 'lo-que-sea');
  await page.click('button[type=submit]');

  await expect(page.getByText('Credenciales inválidas')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('un token inválido dispara auto-logout y redirige a /login', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => localStorage.setItem('jobtrackr_token', 'esto-no-es-un-jwt-valido'));

  await page.goto('/applications');
  await expect(page).toHaveURL(/\/login$/);

  const token = await page.evaluate(() => localStorage.getItem('jobtrackr_token'));
  expect(token).toBeNull();
});
