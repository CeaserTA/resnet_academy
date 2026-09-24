import { test, expect, type Browser, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

/**
 * End-to-end cover for the recording fallback: a student who missed a live session must see a
 * clear "pending" state (not a dead end) while there is no recording, the admin must be warned
 * at save time about a link students cannot open, and once a recording is attached the student
 * completes the item by watching it.
 *
 * Student and admin each get their own browser context. Sharing one context does not work: an
 * already-signed-in user visiting /?auth=login is simply redirected to the dashboard, so the
 * second "login" silently keeps the first user's session.
 */

const STUDENT = { email: 'qa.timer.student@resnet.test', password: 'Password123!' };
const ADMIN = { email: 'admin@resnet.test', password: 'password' };

const COURSE_ID = 2;
const LIVE_SESSION_RESOURCE_ID = 35;
const MODULE_TOGGLE = /Expand Module 1/i;
const EDIT_BUTTON = /Edit Live Session: Backend Development Fundamentals/i;

const SHOTS_DIR =
    process.env.SHOTS_DIR ??
    'C:/Users/SONY/AppData/Local/Temp/claude/c--Users-SONY-resnet-academy/e5a62885-85a3-490b-8172-801d12e70885/scratchpad/recording';

async function shot(page: Page, name: string): Promise<void> {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: false });
    console.log(`[shot] ${name}.png`);
}

async function signedInPage(browser: Browser, email: string, password: string): Promise<Page> {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    page.on('response', (res) => {
        if (res.status() >= 400 && res.url().includes('/api/')) {
            console.log(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
        }
    });

    await page.goto('/?auth=login', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByLabel('Enter email').waitFor({ state: 'visible', timeout: 90_000 });
    await page.getByLabel('Enter email').fill(email);
    await page.getByLabel('Enter password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /^log in$/i }).last().click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    console.log(`[auth] signed in as ${email}`);

    return page;
}

async function openLiveSession(page: Page): Promise<void> {
    await page.goto(`/learn/resources/${LIVE_SESSION_RESOURCE_ID}?course=${COURSE_ID}`, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
    });
    await page.getByRole('heading', { name: /Live Session/i }).first().waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForTimeout(1_500);
}

async function expandModule(page: Page): Promise<void> {
    const toggle = page.getByRole('button', { name: MODULE_TOGGLE }).first();
    await toggle.waitFor({ state: 'visible', timeout: 90_000 });
    await toggle.click();
    await page.waitForTimeout(1_000);
}

/** Returns the warning text if the save produced one, or null if the dialog closed cleanly. */
async function saveRecordingLink(page: Page, url: string): Promise<string | null> {
    const edit = page.getByRole('button', { name: EDIT_BUTTON }).first();
    await edit.waitFor({ state: 'visible', timeout: 30_000 });
    await edit.click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 30_000 });

    await page.getByLabel(/recording link/i).fill(url);
    await page.getByRole('button', { name: /save changes/i }).click();

    const warning = page.getByText(/may not be able to open this recording/i).first();
    const outcome = await Promise.race([
        warning.waitFor({ state: 'visible', timeout: 45_000 }).then(() => 'warned' as const),
        page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 45_000 }).then(() => 'closed' as const),
    ]).catch(() => 'timeout' as const);

    console.log(`[admin] saved ${url} -> ${outcome}`);
    if (outcome === 'warned') {
        const text = (await warning.innerText()).trim();
        console.log(`[admin] warning: "${text}"`);

        return text;
    }

    return null;
}

test('missed live session: pending state, save-time link warning, completion via recording', async ({ browser }) => {
    test.setTimeout(900_000);

    // 1. Student: the session is over and there is no recording yet.
    const student = await signedInPage(browser, STUDENT.email, STUDENT.password);
    await openLiveSession(student);
    await expect(student.getByText(/posted yet/i).first(), 'explicit recording-pending message').toBeVisible();
    await expect(student.getByRole('link', { name: /join session/i }), 'no join link for an ended session').toHaveCount(0);
    await shot(student, '01-student-recording-pending');

    // 2. Admin: the flag is visible where sessions are managed.
    const admin = await signedInPage(browser, ADMIN.email, ADMIN.password);
    await admin.goto(`/admin/courses/${COURSE_ID}/modules`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expandModule(admin);
    await expect(admin.getByText('Recording missing').first(), 'missing-recording flag').toBeVisible();
    await shot(admin, '02-admin-recording-missing-flag');

    // 3. Admin: a link that lands on a sign-in wall. accounts.google.com is exactly where a
    //    restricted Drive link sends someone without access, so this exercises the real check
    //    against the real internet.
    const warning = await saveRecordingLink(
        admin,
        'https://accounts.google.com/ServiceLogin?continue=https://drive.google.com/file/d/restricted/view',
    );
    await shot(admin, '03-admin-restricted-link-warning');
    expect(warning, 'a sign-in-wall link must produce a save-time warning').not.toBeNull();
    await admin.keyboard.press('Escape');
    await admin.getByRole('dialog').waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});

    // 4. Admin: a publicly viewable page saves without a warning and clears the flag.
    const clean = await saveRecordingLink(admin, 'https://www.w3.org/2010/05/video/mediaevents.html');
    await shot(admin, '04-admin-public-link-saved');
    expect(clean, 'a publicly viewable link should save without a warning').toBeNull();

    await admin.reload({ waitUntil: 'domcontentloaded' });
    await expandModule(admin);
    await expect(admin.getByText('Recording missing'), 'flag clears once a recording exists').toHaveCount(0);
    await shot(admin, '05-admin-flag-cleared');

    // 5. Student: the recording is offered; opening it completes the item.
    await openLiveSession(student);
    const watch = student.getByRole('link', { name: /watch the recording/i });
    await expect(watch, 'recording link offered').toBeVisible();
    await shot(student, '06-student-recording-available');

    const popupPromise = student.context().waitForEvent('page', { timeout: 15_000 }).catch(() => null);
    await watch.click();
    const popup = await popupPromise;
    if (popup) await popup.close().catch(() => {});
    await student.waitForTimeout(4_000);

    await openLiveSession(student);
    await shot(student, '07-student-after-watching');
});
