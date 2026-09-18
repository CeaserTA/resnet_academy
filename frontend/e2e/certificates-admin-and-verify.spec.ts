import { test, expect, type Browser, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Admin certificate support screen and the public certificate-verification page.
 *
 * Every role gets its own browser context: an already-signed-in user visiting /?auth=login is
 * just redirected to the dashboard, so a shared context would silently keep the first session.
 */

const ADMIN = { email: 'admin@resnet.test', password: 'password' };
const STUDENT = { email: 'qa.journey.student@resnet.test', password: 'Password123!' };

// Seeded for this run: a rendered certificate (the journey student's) and one stuck in
// "generating" (issued to the timer student with no queue worker running).
const READY = { number: 'CERT-LGIUVODZZJ2O', name: 'QA Journey Student', course: 'Backend Development' };
const STUCK = process.env.STUCK_CERT ?? 'CERT-BUZFBUOQRNWQ';

const SHOTS_DIR =
    process.env.SHOTS_DIR ??
    'C:/Users/SONY/AppData/Local/Temp/claude/c--Users-SONY-resnet-academy/e5a62885-85a3-490b-8172-801d12e70885/scratchpad/certificates';

async function shot(page: Page, name: string): Promise<void> {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: false });
    console.log(`[shot] ${name}.png`);
}

async function signedInPage(browser: Browser, email: string, password: string): Promise<Page> {
    const page = await (await browser.newContext()).newPage();
    page.setDefaultTimeout(30_000);
    await page.goto('/?auth=login', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByLabel('Enter email').waitFor({ state: 'visible', timeout: 90_000 });
    await page.getByLabel('Enter email').fill(email);
    await page.getByLabel('Enter password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /^log in$/i }).last().click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    console.log(`[auth] signed in as ${email}`);

    return page;
}

/** Verification happens in a modal opened from the site footer — never on a page of its own. */
async function openVerifyModal(page: Page, from: string): Promise<void> {
    await page.goto(from, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const trigger = page.getByRole('button', { name: 'Verify a certificate' });
    await trigger.waitFor({ state: 'visible', timeout: 90_000 });
    await trigger.click();
    await page.getByRole('dialog', { name: 'Verify a certificate' }).waitFor({ state: 'visible', timeout: 30_000 });
}

async function verify(page: Page, number: string): Promise<void> {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Certificate number').fill(number);
    await dialog.getByRole('button', { name: /^verify$/i }).click();
    await dialog.getByRole('status').first().waitFor({ state: 'visible', timeout: 60_000 });
}

test('verify a certificate in a footer modal: valid and invalid numbers, logged out, no navigation', async ({ browser }) => {
    test.setTimeout(600_000);
    const page = await (await browser.newContext()).newPage();
    page.setDefaultTimeout(30_000);

    await openVerifyModal(page, '/about');
    const startUrl = page.url();
    await shot(page, '01-verify-modal-open');

    await verify(page, READY.number);
    const dialog = page.getByRole('dialog');
    const result = dialog.getByRole('status').first();
    await expect(result).toContainText('Valid certificate');
    await expect(result).toContainText(READY.name);
    await expect(result).toContainText(READY.course);
    await expect(result).toContainText(READY.number);
    await expect(result).not.toContainText('@');
    console.log(`[verify] valid -> "${(await result.innerText()).replace(/\s+/g, ' ')}"`);
    await shot(page, '02-verify-modal-valid');

    // Straight after a valid result: the old "valid" block must not linger beside a bad number.
    await verify(page, 'CERT-DOESNOTEXIST');
    await expect(dialog.getByText('No matching certificate')).toBeVisible();
    await expect(dialog.getByText('Valid certificate')).toHaveCount(0);
    await expect(dialog.getByText(/No query results/)).toHaveCount(0);
    await shot(page, '03-verify-modal-invalid');

    // It is a modal, not a page: the URL never changed, and closing it leaves the visitor in place.
    expect(page.url()).toBe(startUrl);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(page.url()).toBe(startUrl);

    // Reopening starts blank rather than showing the previous lookup.
    await page.getByRole('button', { name: 'Verify a certificate' }).click();
    await expect(page.getByRole('dialog').getByLabel('Certificate number')).toHaveValue('');
    await expect(page.getByRole('dialog').getByRole('status')).toHaveCount(0);
    await shot(page, '04-verify-modal-reopened-blank');
});

test('the modal is available from the footer on the landing page too, and the old URL no longer serves a page', async ({ browser }) => {
    test.setTimeout(300_000);
    const page = await (await browser.newContext()).newPage();
    page.setDefaultTimeout(30_000);

    await openVerifyModal(page, '/');
    await expect(page.getByRole('dialog', { name: 'Verify a certificate' })).toBeVisible();

    await page.goto('/verify-certificate', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForURL((url) => !url.pathname.includes('verify-certificate'), { timeout: 60_000 });
    console.log(`[verify] /verify-certificate now redirects to ${page.url()}`);
});

test('admin certificates: list, filter, open another student’s certificate, regenerate a stuck one', async ({ browser }) => {
    test.setTimeout(900_000);
    const admin = await signedInPage(browser, ADMIN.email, ADMIN.password);
    admin.on('response', (res) => {
        if (res.url().includes('/api/') && (res.request().method() !== 'GET' || res.status() >= 400)) {
            console.log(`[admin http ${res.status()}] ${res.request().method()} ${res.url()}`);
        }
    });
    admin.on('framenavigated', (frame) => {
        if (frame === admin.mainFrame()) console.log(`[admin nav] ${frame.url()}`);
    });

    // Reachable from the admin nav, not only by URL.
    await admin.getByRole('link', { name: 'Certificates' }).click();
    await expect(admin).toHaveURL(/\/admin\/certificates/);
    await expect(admin.getByText(READY.number)).toBeVisible({ timeout: 90_000 });
    await expect(admin.getByText(STUCK)).toBeVisible();
    await shot(admin, '05-admin-list');

    await admin.getByRole('button', { name: 'Generating' }).click();
    await expect(admin.getByText(READY.number)).toHaveCount(0, { timeout: 30_000 });
    await expect(admin.getByText(STUCK)).toBeVisible();
    await shot(admin, '06-admin-filter-generating');

    await admin.getByRole('button', { name: 'All' }).click();
    await admin.getByLabel('Search certificates').fill('journey');
    await expect(admin.getByText(STUCK)).toHaveCount(0, { timeout: 30_000 });
    await expect(admin.getByText(READY.number)).toBeVisible();
    await shot(admin, '07-admin-search');

    // Open another student's certificate. A real click opens a new tab that Chromium closes as
    // soon as the PDF downloads, so follow the same URL as a navigation carrying the Referer a
    // click sends (Sanctum needs it to honour the session).
    const href = await admin.getByRole('link', { name: `Open certificate ${READY.number}` }).getAttribute('href');
    await admin.setExtraHTTPHeaders({ Referer: 'http://127.0.0.1:3000/admin/certificates' });
    const downloadPromise = admin.waitForEvent('download', { timeout: 60_000 });
    await admin.goto(href!, { waitUntil: 'commit' }).catch(() => {});
    const download = await downloadPromise;
    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    console.log(`[admin] downloaded ${download.suggestedFilename()} bytes=${body.length} magic=${body.subarray(0, 5).toString()}`);
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    await admin.setExtraHTTPHeaders({});

    // Regenerate the stuck one.
    await admin.goto('/admin/certificates', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const regenerate = admin.getByRole('button', { name: `Regenerate certificate ${STUCK}` });
    await regenerate.waitFor({ state: 'visible', timeout: 90_000 });
    await shot(admin, '08-admin-before-regenerate');
    await regenerate.click();
    await expect(regenerate).toHaveCount(0, { timeout: 120_000 });
    await shot(admin, '09-admin-after-regenerate');
    console.log('[admin] regenerate button gone — certificate now ready');
});

test('a student cannot reach the admin certificates screen', async ({ browser }) => {
    test.setTimeout(600_000);
    const student = await signedInPage(browser, STUDENT.email, STUDENT.password);

    await expect(student.getByRole('link', { name: 'Certificates' })).toHaveCount(0);

    await student.goto('/admin/certificates', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await student.waitForTimeout(4_000);
    console.log(`[student] /admin/certificates landed on ${student.url()}`);
    expect(student.url()).not.toContain('/admin/certificates');

    // And the API itself refuses, independent of the UI.
    const status = await student.evaluate(async () => {
        const res = await fetch('http://127.0.0.1:8000/api/v1/admin/certificates', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        return res.status;
    });
    console.log(`[student] GET /api/v1/admin/certificates -> ${status}`);
    expect(status).toBe(403);
    await shot(student, '10-student-blocked');
});
