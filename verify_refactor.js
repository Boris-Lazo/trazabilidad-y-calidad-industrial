const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Login
  await page.goto('http://localhost:3000/login.html');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin_password');
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await page.waitForURL('**/index.html');
  await page.waitForSelector('.kpi-card');
  // Wait a bit for async data
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '/home/jules/verification/dashboard_refactored.png', fullPage: true });

  const kpis = await page.locator('.kpi-value').allTextContents();
  console.log('KPIs:', kpis);

  await browser.close();
})();
