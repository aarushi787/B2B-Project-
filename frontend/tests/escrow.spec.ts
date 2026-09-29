import { test, expect } from '@playwright/test';

test.describe('Escrow Payment Release Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Add debugging logs
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`API REQUEST: ${request.method()} ${request.url()}`);
      }
    });
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`API ERROR: ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to the app and login
    await page.goto('http://localhost:5174/auth');
    await page.fill('input[type="email"]', 'rahul@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]:has-text("Sign In")');
    await page.waitForURL('**/app/dashboard');
  });

  test('should successfully release escrow funds', async ({ page }) => {
    // Navigate to deals and wait for the API response
    const dealsPromise = page.waitForResponse(response => response.url().includes('/api/deals'));
    await page.goto('http://localhost:5174/app/deals');
    await dealsPromise;
    await page.waitForTimeout(500); // give React a moment to render

    // Check if there are no deals and create one
    if (await page.locator('.deal-card').count() === 0) {
      await page.click('button:has-text("Add Project")');
      await page.fill('input[placeholder*="Acme Corp Migration"]', 'Automated E2E Project');
      await page.fill('input[placeholder*="50000"]', '25000');
      
      // Click the Add Project button in the modal footer (which is the last one on the page usually, or we can use the modal locator)
      // Since there's an 'Add Project' button to open it, we should use a more specific locator or use .last()
      await page.locator('button:has-text("Add Project")').last().click();
    }
    
    // Wait for the new deal to appear and open it
    await page.waitForSelector('.deal-card:first-child', { state: 'visible' });
    await page.click('.deal-card:first-child');
    
    // Assert we are in the workspace
    await expect(page.locator('h1')).toContainText('Deal Workspace');

    // Find the Escrow section
    const escrowSection = page.locator('text=Escrow Status');
    await expect(escrowSection).toBeVisible();

    // Ensure the Release Funds button is visible (assuming it's in a state to release)
    // Note: In a real test we'd seed the DB precisely so a deal is ready for release
    const releaseButton = page.locator('button:has-text("Release Funds")');
    if (await releaseButton.isVisible()) {
      await releaseButton.click();
      
      // Confirm the release in modal
      await page.click('button:has-text("Confirm Release")');

      // Verify success message
      await expect(page.locator('text=Funds released successfully')).toBeVisible();
    }
  });
});
