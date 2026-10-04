import { test, expect } from '@playwright/test';
import { uniqueAccount } from './helpers';

// The marketplace journey: sign up -> requirement -> proposal -> deal -> escrow.
// Stages are enabled as the features land. The ones marked fixme need backend work first.
test.describe('Marketplace journey', () => {
  test('sign up, stay signed in via cookie, and lose access when the session is gone', async ({ page, context }) => {
    const account = uniqueAccount('journey');

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Create Account' }).first().click();
    await page.getByPlaceholder('Arjun Sharma').fill(account.name);
    await page.getByPlaceholder('you@company.com').fill(account.email);
    await page.getByPlaceholder('+91 98765 43210').fill(account.phone);
    await page.getByPlaceholder('Acme Pvt Ltd').fill(account.companyName);
    const passwords = page.locator('input[type="password"]');
    await passwords.nth(0).fill(account.password);
    await passwords.nth(1).fill(account.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/app/dashboard');

    // Cookie-only auth: no token is reachable from page JavaScript.
    const storage = await page.evaluate(() => ({
      keys: Object.keys(localStorage).concat(Object.keys(sessionStorage)),
      cookie: document.cookie,
    }));
    expect(storage.keys.filter(k => /token/i.test(k))).toEqual([]);
    expect(storage.cookie).not.toMatch(/access_token|refresh_token/);

    // The session survives a reload (httpOnly cookie plus silent session restore).
    await page.reload();
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Regular users cannot open the admin console.
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Without cookies the app sends you to sign in.
    await context.clearCookies();
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/auth/);
  });

  test.fixme('post a requirement', async () => {
    // Needs the requirements API (step 4).
  });

  test.fixme('another company sends a proposal and the requester compares proposals', async () => {
    // Needs the proposals API (step 4).
  });

  test.fixme('accepting a proposal creates a deal with the buyer/seller badge and next-step card', async () => {
    // Step 4.
  });

  test.fixme('buyer funds escrow, seller delivers, buyer releases payment', async () => {
    // Step 5: milestone escrow.
  });
});
