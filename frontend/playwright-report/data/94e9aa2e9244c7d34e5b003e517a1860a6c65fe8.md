# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: escrow.spec.ts >> Escrow Payment Release Flow >> should successfully release escrow funds
- Location: tests\escrow.spec.ts:26:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "Deal Workspace"
Received string:    "Portfolio"
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('h1') with timeout 5000ms
  - waiting for locator('h1')
    14 × locator resolved to <h1 class="text-xl font-black text-slate-900 tracking-tight leading-tight">Portfolio</h1>
       - unexpected value "Portfolio"

```

```yaml
- heading "Portfolio" [level=1]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Escrow Payment Release Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Add debugging logs
  6  |     page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  7  |     page.on('request', request => {
  8  |       if (request.url().includes('/api/')) {
  9  |         console.log(`API REQUEST: ${request.method()} ${request.url()}`);
  10 |       }
  11 |     });
  12 |     page.on('response', response => {
  13 |       if (response.status() >= 400) {
  14 |         console.log(`API ERROR: ${response.status()} ${response.url()}`);
  15 |       }
  16 |     });
  17 | 
  18 |     // Navigate to the app and login
  19 |     await page.goto('http://localhost:5174/auth');
  20 |     await page.fill('input[type="email"]', 'rahul@example.com');
  21 |     await page.fill('input[type="password"]', 'password123');
  22 |     await page.click('button[type="submit"]:has-text("Sign In")');
  23 |     await page.waitForURL('**/app/dashboard');
  24 |   });
  25 | 
  26 |   test('should successfully release escrow funds', async ({ page }) => {
  27 |     // Navigate to deals and wait for the API response
  28 |     const dealsPromise = page.waitForResponse(response => response.url().includes('/api/deals'));
  29 |     await page.goto('http://localhost:5174/app/deals');
  30 |     await dealsPromise;
  31 |     await page.waitForTimeout(500); // give React a moment to render
  32 | 
  33 |     // Check if there are no deals and create one
  34 |     if (await page.locator('.deal-card').count() === 0) {
  35 |       await page.click('button:has-text("Add Project")');
  36 |       await page.fill('input[placeholder*="Acme Corp Migration"]', 'Automated E2E Project');
  37 |       await page.fill('input[placeholder*="50000"]', '25000');
  38 |       
  39 |       // Click the Add Project button in the modal footer (which is the last one on the page usually, or we can use the modal locator)
  40 |       // Since there's an 'Add Project' button to open it, we should use a more specific locator or use .last()
  41 |       await page.locator('button:has-text("Add Project")').last().click();
  42 |     }
  43 |     
  44 |     // Wait for the new deal to appear and open it
  45 |     await page.waitForSelector('.deal-card:first-child', { state: 'visible' });
  46 |     await page.click('.deal-card:first-child');
  47 |     
  48 |     // Assert we are in the workspace
> 49 |     await expect(page.locator('h1')).toContainText('Deal Workspace');
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  50 | 
  51 |     // Find the Escrow section
  52 |     const escrowSection = page.locator('text=Escrow Status');
  53 |     await expect(escrowSection).toBeVisible();
  54 | 
  55 |     // Ensure the Release Funds button is visible (assuming it's in a state to release)
  56 |     // Note: In a real test we'd seed the DB precisely so a deal is ready for release
  57 |     const releaseButton = page.locator('button:has-text("Release Funds")');
  58 |     if (await releaseButton.isVisible()) {
  59 |       await releaseButton.click();
  60 |       
  61 |       // Confirm the release in modal
  62 |       await page.click('button:has-text("Confirm Release")');
  63 | 
  64 |       // Verify success message
  65 |       await expect(page.locator('text=Funds released successfully')).toBeVisible();
  66 |     }
  67 |   });
  68 | });
  69 | 
```