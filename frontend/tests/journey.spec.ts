import { test, expect, type Page } from '@playwright/test';
import { Session, uniqueAccount } from './helpers';

async function signUpThroughUi(page: Page, label: string) {
  const account = uniqueAccount(label);
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
  return account;
}

// The marketplace journey: sign up -> requirement -> proposal -> negotiate -> deal -> escrow.
test.describe('Marketplace journey', () => {
  test('sign up, stay signed in via cookie, and lose access when the session is gone', async ({ page, context }) => {
    await signUpThroughUi(page, 'journey');

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

  test('post a requirement, compare a proposal, negotiate, accept and land in the deal', async ({ page }) => {
    const title = `Journey requirement ${Date.now().toString(36)}`;
    await signUpThroughUi(page, 'buyer');

    // 1. Post a requirement through the form.
    await page.goto('/app/requirements/new');
    await page.getByRole('button', { name: 'Cloud & DevOps' }).click();
    await page.getByPlaceholder('E.g. Build an e-commerce website').fill(title);
    await page.getByPlaceholder('Provide as much detail as possible...').fill('Move our servers to AWS with a CI/CD pipeline and handover docs.');
    await page.getByRole('button', { name: '50K-1L' }).click();
    await page.getByRole('button', { name: 'Within 1 Month' }).click();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.waitForURL('**/app/requirements/active');
    await expect(page.getByText(title)).toBeVisible();

    // 2. Another company finds it and sends a proposal.
    const vendor = await Session.create('vendor');
    const open = await (await vendor.get(`/requirements?scope=open&q=${encodeURIComponent(title)}`)).json();
    expect(open.data).toHaveLength(1);
    const requirementId = open.data[0].id as string;
    const sent = await vendor.post(`/requirements/${requirementId}/proposals`, { amount: 85000, timeline: '3 weeks', message: 'We have done this many times.' });
    expect(sent.status()).toBe(201);
    const proposal = await sent.json();

    // 3. The buyer sees it in the comparison table and opens the negotiation page.
    await page.getByText(title).click();
    await expect(page.getByRole('heading', { name: /Proposals/ })).toBeVisible();
    await expect(page.getByRole('table')).toContainText('₹85,000');
    await page.getByRole('link', { name: 'Review and negotiate' }).click();
    await expect(page.getByRole('status', { name: 'Negotiation status' })).toContainText('It is your turn');

    // 4. Counter-offer, then the page shows it is the vendor's turn.
    await page.getByRole('button', { name: 'Counter offer' }).click();
    await page.getByLabel('Amount (₹)').fill('78000');
    await page.getByRole('button', { name: 'Send counter-offer' }).click();
    await expect(page.getByRole('status', { name: 'Negotiation status' })).toContainText('Waiting for');
    await expect(page.getByText('Round 2').first()).toBeVisible();

    // 5. The vendor accepts the counter-offer, which creates the deal.
    const accepted = await vendor.post(`/proposals/${proposal.id}/accept`);
    expect(accepted.status()).toBe(200);
    const { dealId } = await accepted.json();

    // 6. The buyer opens the deal and sees their side and the next step.
    await page.reload();
    await expect(page.getByRole('status', { name: 'Negotiation status' })).toContainText('accepted');
    await page.getByRole('link', { name: 'Open the deal' }).click();
    await page.waitForURL(`**/app/deals/${dealId}`);
    await expect(page.getByText('You are the buyer')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Next step' })).toBeVisible();
    await vendor.dispose();
  });

  test.fixme('buyer funds escrow, seller delivers, buyer releases payment', async () => {
    // Step 5: milestone escrow.
  });
});
