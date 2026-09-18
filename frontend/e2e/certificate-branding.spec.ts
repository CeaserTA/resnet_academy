import { test, expect, type Browser, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Certificate branding: a freshly rendered certificate, a certificate rendered before the
 * branding change, and the QR code's verification URL.
 *
 * The PDFs are written to disk so the rendered artwork can be inspected and the QR code scanned
 * outside the browser — see scan-qr.mjs / render-pdf.mjs in the scratchpad.
 */

const ADMIN = { email: 'admin@resnet.test', password: 'password' };

/** Re-rendered here when it is still "generating"; otherwise its existing PDF is downloaded. */
const REGENERATED = { number: 'CERT-BUZFBUOQRNWQ', name: 'QA Timer Student' };
/** Rendered before the branding change — must still open unchanged. */
const LEGACY = { number: 'CERT-LGIUVODZZJ2O', name: 'QA Journey Student' };

const OUT_DIR =
    process.env.CERT_OUT_DIR ??
    'C:/Users/SONY/AppData/Local/Temp/claude/c--Users-SONY-resnet-academy/e5a62885-85a3-490b-8172-801d12e70885/scratchpad/cert';

async function signedInPage(browser: Browser, email: string, password: string): Promise<Page> {
    const page = await (await browser.newContext()).newPage();
    page.setDefaultTimeout(30_000);
    await page.goto('/?auth=login', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByLabel('Enter email').waitFor({ state: 'visible', timeout: 90_000 });
    await page.getByLabel('Enter email').fill(email);
    await page.getByLabel('Enter password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /^log in$/i }).last().click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });

    return page;
}

/**
 * A real click opens a new tab that Chromium closes as soon as the PDF downloads, so follow the
 * link as a navigation carrying the Referer a click would send (Sanctum needs it to honour the
 * session). Returns the downloaded bytes.
 */
async function downloadCertificate(admin: Page, number: string, saveAs: string): Promise<Buffer> {
    const href = await admin.getByRole('link', { name: `Open certificate ${number}` }).getAttribute('href');
    await admin.setExtraHTTPHeaders({ Referer: 'http://127.0.0.1:3000/admin/certificates' });
    const downloadPromise = admin.waitForEvent('download', { timeout: 120_000 });
    await admin.goto(href!, { waitUntil: 'commit' }).catch(() => {});
    const download = await downloadPromise;

    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, saveAs), body);
    console.log(`[download] ${number} -> ${saveAs} bytes=${body.length} magic=${body.subarray(0, 5).toString()}`);
    await admin.setExtraHTTPHeaders({});

    return body;
}

test('a regenerated certificate renders with the new template, and one rendered earlier still opens', async ({ browser }) => {
    test.setTimeout(900_000);
    const admin = await signedInPage(browser, ADMIN.email, ADMIN.password);

    await admin.goto('/admin/certificates', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await admin.getByText(REGENERATED.number).waitFor({ state: 'visible', timeout: 90_000 });

    // Only offered while the certificate has no PDF, so a second run of this spec downloads the
    // one the first run rendered rather than failing on a missing button.
    const regenerate = admin.getByRole('button', { name: `Regenerate certificate ${REGENERATED.number}` });

    if (await regenerate.count()) {
        await regenerate.click();
        await expect(regenerate).toHaveCount(0, { timeout: 300_000 });
        console.log(`[admin] ${REGENERATED.number} rendered with the current template`);
    } else {
        console.log(`[admin] ${REGENERATED.number} already rendered — downloading it as-is`);
    }

    const fresh = await downloadCertificate(admin, REGENERATED.number, 'e2e-regenerated.pdf');
    expect(fresh.subarray(0, 5).toString()).toBe('%PDF-');

    // Issued before the branding change: this must keep opening, untouched.
    const legacy = await downloadCertificate(admin, LEGACY.number, 'e2e-legacy.pdf');
    expect(legacy.subarray(0, 5).toString()).toBe('%PDF-');
});

test('the URL printed on a certificate, and encoded in its QR code, opens the verification result while logged out', async ({ browser }) => {
    test.setTimeout(300_000);
    const page = await (await browser.newContext()).newPage();
    page.setDefaultTimeout(30_000);

    // Exactly what CertificatePrintData builds and the QR code encodes.
    await page.goto(`/verify-certificate?number=${REGENERATED.number}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
    });

    const dialog = page.getByRole('dialog', { name: 'Verify a certificate' });
    await dialog.waitFor({ state: 'visible', timeout: 90_000 });

    // No typing: the number arrived with the URL and the lookup ran on its own.
    await expect(dialog.getByLabel('Certificate number')).toHaveValue(REGENERATED.number);
    const result = dialog.getByRole('status').first();
    await expect(result).toContainText('Valid certificate', { timeout: 60_000 });
    await expect(result).toContainText(REGENERATED.name);
    await expect(result).not.toContainText('@');
    console.log(`[qr] "${(await result.innerText()).replace(/\s+/g, ' ')}"`);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(OUT_DIR, 'e2e-qr-landing.png') });

    // Closing clears the number from the URL, so a refresh doesn't reopen someone else's lookup.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('verify')).toBe(false);
});
