import { test } from '@playwright/test';

test.describe('Responsive Header Screenshots', () => {
  const viewports = [
    { name: 'mobile-320', width: 320, height: 568 },
    { name: 'mobile-375', width: 375, height: 667 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1024', width: 1024, height: 768 },
    { name: 'desktop-1920', width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    test(`Header at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3000');
      
      // Wait for header to load
      await page.waitForSelector('header', { state: 'visible' });
      await page.waitForTimeout(1000);
      
      // Take screenshot of header
      const header = page.locator('header').first();
      await header.screenshot({ 
        path: `/tmp/header-${viewport.name}.png`,
        animations: 'disabled'
      });
    });
  }
});
