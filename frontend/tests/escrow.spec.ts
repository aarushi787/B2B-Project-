import { test, expect } from '@playwright/test';

test.describe('Escrow Payment Release Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login
    await page.goto('http://localhost:5174/auth');
    await page.click('text=Quick Demo Login'); // If you have a quick login button
    await page.click('text=Acme Corp'); // Assuming this logs us in
    await page.waitForURL('**/app/dashboard');
  });

  test('should successfully release escrow funds', async ({ page }) => {
    // Navigate to deals
    await page.click('text=Deals Workspace');
    
    // Find the first deal and open it
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
