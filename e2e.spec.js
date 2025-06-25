// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dashboard Financiero - E2E', () => {
  const baseURL = 'http://localhost:3000';
  const email = 'jovillarroelb@gmail.com';
  const password = '123456';

  test('Login y logout básico', async ({ page }) => {
    // Capturar errores de consola
    page.on('console', msg => {
      console.log('Browser console:', msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('Browser error:', error.message);
    });

    // Ir a la página principal
    await page.goto(baseURL);
    await expect(page).toHaveTitle(/Dashboard Financiero/);

    // Ir a tab de login (por si está en registro)
    await page.locator('#tab-login').click();
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.locator('#login-submit').click();

    // Esperar redirección a app.html
    await page.waitForURL('**/app.html', { timeout: 10000 });
    await expect(page).toHaveURL(/app\.html/);

    // Verificar que la app se cargó correctamente
    await expect(page.locator('#app-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#monthly-dashboard-view')).toBeVisible({ timeout: 10000 });

    // Verificar que los elementos de navegación están presentes
    await expect(page.locator('#nav-monthly')).toBeVisible();
    await expect(page.locator('#nav-annual')).toBeVisible();
    await expect(page.locator('#logout-btn')).toBeVisible();

    // Verificar que el botón de logout es clickeable
    await expect(page.locator('#logout-btn')).toBeEnabled();

    // Esperar a que la aplicación se inicialice completamente
    await page.waitForTimeout(2000);

    // Logout exitoso - hacer click y esperar logs
    console.log('🔄 Haciendo click en logout...');
    await page.locator('#logout-btn').click();
    
    // Esperar más tiempo para el logout y ver logs
    await page.waitForTimeout(5000);
    
    // Verificar que se redirigió a la página principal
    await expect(page).toHaveURL(baseURL, { timeout: 10000 });

    console.log('✅ Test completado: Login y logout exitosos');
  });
}); 