import { test, expect, type Browser, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Content access is gated on the cohort's start date, and dated items under a course must fall
 * inside that cohort's range.
 *
 * Fixture (seeded in the dev database): "Frontend Development" runs in the "January 2027 Intake",
 * 2027-01-04 → 2027-05-04, and `cohort.gate.student@resnet.test` is enrolled on it.
 */

const ADMIN = { email: 'admin@resnet.test', password: 'password' };
const STUDENT = { email: 'cohort.gate.student@resnet.test', password: 'Password123!' };

const COURSE = { id: 1, title: 'Frontend Development', moduleId: 1 };
// The UI formats the date with the browser's own locale, so match either ordering rather than
// baking in one machine's regional settings.
const STARTS_ON = /(?:4 January 2027|January 4, 2027)/;

const SHOTS_DIR =
    process.env.SHOTS_DIR ??
    'C:/Users/SONY/AppData/Local/Temp/claude/c--Users-SONY-resnet-academy/e5a62885-85a3-490b-8172-801d12e70885/scratchpad/cohort';

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

test('a student enrolled in a future cohort sees the start date, not a dead end', async ({ browser }) => {
    test.setTimeout(600_000);
    const student = await signedInPage(browser, STUDENT.email, STUDENT.password);

    // ── Dashboard: the seat is reserved, the course reads as upcoming ──
    const card = student.locator('article, div').filter({ hasText: COURSE.title }).last();
    await expect(student.getByText(COURSE.title).first()).toBeVisible({ timeout: 90_000 });
    await expect(student.getByText('Upcoming').first()).toBeVisible();
    const upcoming = student.getByText(/Your place is reserved/).first();
    await expect(upcoming).toBeVisible();
    await expect(upcoming).toHaveText(STARTS_ON);
    // No button that would only lead to locked modules.
    await expect(card.getByRole('link', { name: /Start learning|Continue learning/ })).toHaveCount(0);
    console.log(`[student] dashboard: "${(await upcoming.innerText()).replace(/\s+/g, ' ')}"`);
    await shot(student, '01-dashboard-upcoming');

    // ── Course page: the date leads, and the module says why it is closed ──
    await student.goto(`/learn/courses/${COURSE.id}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const banner = student.getByText(/This course starts on/).first();
    await expect(banner).toBeVisible({ timeout: 90_000 });
    await expect(banner).toHaveText(STARTS_ON);
    await expect(student.getByText(/Your place is reserved/)).toBeVisible();
    const moduleReason = student.getByText(/^Starts /).last();
    await expect(moduleReason).toHaveText(STARTS_ON);
    console.log(`[student] course page: "${await banner.innerText()}" / module: "${await moduleReason.innerText()}"`);
    console.log('[student] course page explains the lock with the start date');
    await shot(student, '02-course-locked');
});

test('an admin cannot schedule a live session outside the cohort range, and can inside it', async ({ browser }) => {
    test.setTimeout(600_000);
    const admin = await signedInPage(browser, ADMIN.email, ADMIN.password);

    // Driven through the API the admin UI calls, so the assertion is on the server rule rather
    // than on whichever form field happens to be wired to it.
    const attempt = async (scheduledAt: string) =>
        admin.evaluate(
            async ({ moduleId, scheduledAt }) => {
                const xsrf = decodeURIComponent(
                    document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '',
                );
                const res = await fetch(`http://127.0.0.1:8000/api/v1/modules/${moduleId}/resources`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
                    body: JSON.stringify({
                        type: 'live_session',
                        title: 'Cohort range check',
                        provider: 'zoom',
                        meeting_url: 'https://zoom.us/j/123456789',
                        duration_minutes: 60,
                        scheduled_at: scheduledAt,
                    }),
                });

                return { status: res.status, body: await res.json().catch(() => null) };
            },
            { moduleId: COURSE.moduleId, scheduledAt },
        );

    const rejected = await attempt('2026-11-10T14:00:00Z');
    console.log(`[admin] outside range -> ${rejected.status}: ${rejected.body?.error?.fields?.scheduled_at?.[0]}`);
    expect(rejected.status).toBe(422);
    expect(rejected.body?.error?.fields?.scheduled_at?.[0]).toContain('January 2027 Intake');
    expect(rejected.body?.error?.fields?.scheduled_at?.[0]).toContain('4 Jan 2027');

    const accepted = await attempt('2027-02-10T14:00:00Z');
    console.log(`[admin] inside range -> ${accepted.status}`);
    expect(accepted.status).toBe(201);

    // Leave the course as we found it.
    const createdId = accepted.body?.data?.id;
    if (createdId) {
        await admin.evaluate(async (id) => {
            const xsrf = decodeURIComponent(
                document.cookie.split('; ').find((c) => c.startsWith('XSRF-TOKEN='))?.split('=')[1] ?? '',
            );
            await fetch(`http://127.0.0.1:8000/api/v1/resources/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrf },
            });
        }, createdId);
    }
});
