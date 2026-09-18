import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

/**
 * 1. Regression guard for the public header: LandingHeader used to take `isAuthenticated` as a
 *    prop and four of its five call sites never passed it, so logged-in users were shown the
 *    logged-out header. It now reads the auth context itself; this proves that on every page.
 * 2. Characterisation of the profile save. This behaviour was once reported as missing and is
 *    not — the confirmation, the live banner and the forward redirect all work. The test pins
 *    that down so a future change cannot quietly remove them.
 */

const PROFILE_STUDENT = { email: 'qa.profile.student@resnet.test', password: 'Password123!' };

const SHOTS_DIR =
    process.env.SHOTS_DIR ??
    'C:/Users/SONY/AppData/Local/Temp/claude/c--Users-SONY-resnet-academy/e5a62885-85a3-490b-8172-801d12e70885/scratchpad/header-profile';

async function shot(page: Page, name: string): Promise<void> {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS_DIR, `${name}.png`), fullPage: false });
    console.log(`[shot] ${name}.png`);
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
    // The landing page pulls in heavy imagery; waiting for full 'load' is slow and unnecessary.
    await page.goto('/?auth=login', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByLabel('Enter email').fill(email);
    await page.getByLabel('Enter password', { exact: true }).fill(password);
    await page.getByRole('button', { name: /^log in$/i }).last().click();
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 }).catch(() => {});
    console.log(`[auth] signed in as ${email}, url=${page.url()}`);
}

test('a logged-in user sees the authenticated header on every public page', async ({ page }) => {
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);

    await signIn(page, PROFILE_STUDENT.email, PROFILE_STUDENT.password);

    const pages: [string, string][] = [
        ['catalogue', '/courses'],
        ['cohort', '/cohorts/2'],
        ['about', '/about'],
        ['contact', '/contact'],
    ];

    for (const [label, url] of pages) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await page.getByRole('banner').first().waitFor({ state: 'visible', timeout: 30_000 });
        // Let the auth query resolve before judging what the header shows.
        await page.getByRole('link', { name: /go to dashboard|dashboard/i }).first()
            .waitFor({ state: 'visible', timeout: 30_000 })
            .catch(() => {});

        const header = page.getByRole('banner').first();
        const dashboardLinks = await header.getByRole('link', { name: /dashboard/i }).count();
        const loginButtons = await header.getByRole('button', { name: /^log in$/i }).count();
        const signupButtons = await header.getByRole('button', { name: /^sign up$/i }).count();

        console.log(`[${label}] dashboardLinks=${dashboardLinks} loginButtons=${loginButtons} signupButtons=${signupButtons}`);
        await shot(page, `header-${label}`);

        expect(dashboardLinks, `${label} should offer a way back to the dashboard`).toBeGreaterThan(0);
        expect(loginButtons, `${label} should not show a Log in button`).toBe(0);
        expect(signupButtons, `${label} should not show a Sign up button`).toBe(0);
    }
});

test('saving the profile confirms it and sends the user onward', async ({ page }) => {
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);

    page.on('response', (res) => {
        if (res.status() >= 400) console.log(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
    });

    await signIn(page, PROFILE_STUDENT.email, PROFILE_STUDENT.password);

    await page.goto('/profile/complete', { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.getByLabel(/phone number/i).first().waitFor({ state: 'visible', timeout: 30_000 });

    const percentBefore = await page.getByText(/%$/).first().innerText().catch(() => '?');
    console.log(`[profile] banner before: ${percentBefore}`);
    await shot(page, 'profile-before');

    await page.getByLabel(/phone number/i).first().fill('08012345680');
    await page.getByLabel(/country/i).first().fill('Nigeria');
    await page.getByLabel(/city/i).first().fill('Abuja');
    await page.getByLabel(/highest qualification/i).first().selectOption("Bachelor's Degree").catch(async () => {
        await page.getByRole('combobox', { name: /highest qualification/i }).click();
        await page.getByRole('option', { name: "Bachelor's Degree", exact: true }).click();
    });

    const percentFilled = await page.getByText(/%$/).first().innerText().catch(() => '?');
    console.log(`[profile] banner after filling: ${percentFilled}`);

    const clickedAt = Date.now();
    await page.getByRole('button', { name: /save profile/i }).click();

    // Poll rather than sampling once: the save request plus the auth refetch take a moment, so
    // a single early check misses the confirmation entirely.
    const alert = page.getByText(/profile saved successfully/i).first();
    const appeared = await alert.waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => Date.now() - clickedAt)
        .catch(() => null);
    console.log(appeared === null
        ? '[profile] NO success confirmation appeared within 15s'
        : `[profile] success confirmation appeared after ${appeared}ms`);
    expect(appeared, 'a success confirmation must be shown after saving').not.toBeNull();
    await shot(page, 'profile-success-visible');

    // The banner must reflect the completed profile, not still be asking for it.
    await expect(page.getByText('100%')).toBeVisible();

    // And the user must be moved on rather than left sitting on the form.
    await page.waitForURL((url) => !url.pathname.includes('/profile/complete'), { timeout: 20_000 });
    const leftAt = Date.now() - clickedAt;
    console.log(`[profile] landed on ${page.url()} after ${leftAt}ms`);
    console.log(`[profile] confirmation was on screen for ~${leftAt - (appeared ?? 0)}ms before redirect`);
    await shot(page, 'profile-after-redirect');
});
