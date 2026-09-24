import { test, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Task 3: full student journey through the Backend Development course, driven as a real user
 * would. Screenshots land in SHOTS_DIR as evidence for the friction log.
 *
 * Credentials are fixed (not timestamped) so the account can be logged into afterwards and the
 * run verified by hand.
 */

const STUDENT = {
    name: 'QA Journey Student',
    email: 'qa.journey.student@resnet.test',
    password: 'Password123!',
    phone: '08012345678',
    country: 'Nigeria',
    city: 'Lagos',
    qualification: "Bachelor's Degree",
};

const COURSE_ID = 2; // Backend Development

const SHOTS_DIR =
    process.env.SHOTS_DIR ??
    'C:/Users/SONY/AppData/Local/Temp/claude/c--Users-SONY-resnet-academy/e5a62885-85a3-490b-8172-801d12e70885/scratchpad/journey';

let shotIndex = 0;

async function shot(page: Page, label: string): Promise<void> {
    fs.mkdirSync(SHOTS_DIR, { recursive: true });
    shotIndex += 1;
    const name = `${String(shotIndex).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    await page.screenshot({ path: path.join(SHOTS_DIR, name), fullPage: true });
    console.log(`[shot] ${name}`);
}

/**
 * Waits for the SPA to actually mount. Neither 'domcontentloaded' (fires before React renders)
 * nor 'networkidle' (never settles on pages with an embedded document/PDF viewer) is a usable
 * signal, so key off a shell element that is always present once the app has rendered.
 */
async function waitForAppReady(page: Page): Promise<void> {
    await page.waitForLoadState('domcontentloaded');
    await page
        .getByRole('link', { name: 'My courses' })
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 })
        .catch(() => console.log('   ! app shell did not render within 60s'));
}

/** Dumps what the page is actually showing, so a failed step stays diagnosable from the log. */
async function describePage(page: Page, label: string): Promise<void> {
    const headings = await page.locator('h1, h2, h3').allInnerTexts().catch(() => []);
    const buttons = await page.getByRole('button').allInnerTexts().catch(() => []);
    const links = await page.getByRole('link').allInnerTexts().catch(() => []);
    console.log(
        `\n=== ${label} ===\n` +
        `URL: ${page.url()}\n` +
        `Headings: ${JSON.stringify(headings.filter(Boolean).slice(0, 12))}\n` +
        `Buttons: ${JSON.stringify(buttons.filter(Boolean).slice(0, 25))}\n` +
        `Links: ${JSON.stringify(links.filter(Boolean).slice(0, 25))}`,
    );
}

/** Logs the student in, registering the account first if it does not exist yet. */
async function signIn(page: Page): Promise<void> {
    await page.goto('/?auth=login');
    await page.getByLabel('Enter email').fill(STUDENT.email);
    await page.getByLabel('Enter password', { exact: true }).fill(STUDENT.password);
    await page.getByRole('button', { name: /^log in$/i }).last().click();
    // Wait for the destination, not networkidle — the dashboard keeps polling and never idles.
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 }).catch(() => {});

    if (page.url().includes('/dashboard')) {
        console.log('[auth] logged in');
        return;
    }

    console.log('[auth] login did not land on dashboard — registering instead');
    await page.goto('/?auth=signup');
    await page.getByLabel('Enter full name').fill(STUDENT.name);
    await page.getByLabel('Enter email').fill(STUDENT.email);
    await page.getByLabel('Enter password', { exact: true }).fill(STUDENT.password);
    await page.getByLabel('Confirm password').fill(STUDENT.password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForLoadState('networkidle');
    console.log(`[auth] after registration, url=${page.url()}`);
}

/** Completes the profile if it is not already complete — applications are gated behind it. */
async function ensureProfileComplete(page: Page): Promise<void> {
    await page.goto('/profile/complete');
    await page.waitForLoadState('networkidle');

    const phone = page.getByLabel(/phone number/i).first();
    if (await phone.inputValue().catch(() => '') !== '') {
        console.log('[profile] already complete');

        return;
    }

    await phone.fill(STUDENT.phone);
    await page.getByLabel(/country/i).first().fill(STUDENT.country);
    await page.getByLabel(/city/i).first().fill(STUDENT.city);

    // Radix combobox, not a <select> — open it and click the option out of its portal.
    await page.getByRole('combobox', { name: /highest qualification/i }).click();
    await page.getByRole('option', { name: STUDENT.qualification, exact: true }).click();
    await page.getByRole('button', { name: /save profile/i }).click();
    await page.waitForLoadState('networkidle');
    console.log('[profile] saved');
}

test('journey stage 1: register, complete profile, apply for the course', async ({ page }) => {
    test.setTimeout(900_000);
    // Individual actions fail fast so one bad selector cannot consume the whole test budget.
    page.setDefaultTimeout(20_000);

    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log(`[browser error] ${msg.text()}`);
    });
    page.on('response', (res) => {
        if (res.status() >= 400) console.log(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
    });

    await signIn(page);
    await ensureProfileComplete(page);

    // ── Course detail page ────────────────────────────────────────────────────
    await page.goto(`/courses/${COURSE_ID}`);
    await page.waitForLoadState('networkidle');
    await describePage(page, 'course detail');
    await shot(page, 'course-detail');

    const applyButton = page
        .getByRole('button', { name: /apply|enrol|enroll/i })
        .or(page.getByRole('link', { name: /apply|enrol|enroll/i }))
        .first();

    if (await applyButton.count() === 0) {
        console.log('[apply] no apply/enrol control found — see the dump above');

        return;
    }

    console.log(`[apply] clicking: ${await applyButton.innerText().catch(() => '?')}`);

    // Clicking too soon after load lands before React attaches the handler and silently does
    // nothing, so confirm the dialog actually opened and click again if it did not.
    const dialog = page.getByRole('dialog');
    for (let attempt = 1; attempt <= 3; attempt++) {
        await applyButton.click();
        const opened = await dialog.waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
        if (opened) {
            console.log(`[apply] dialog opened on attempt ${attempt}`);
            break;
        }
        console.log(`[apply] dialog did not open on attempt ${attempt}; retrying`);
    }
    await shot(page, 'apply-modal');

    // Eligibility questions: each is a Yes/No pair inside a radiogroup. They look like buttons
    // but carry role="radio", so they are not reachable via getByRole('button'). All must be
    // answered or the modal refuses with "Please answer every question before submitting."
    const yesButtons = page.getByRole('radio', { name: 'Yes', exact: true });
    await yesButtons.first().waitFor({ state: 'visible' });
    const questionCount = await yesButtons.count();
    console.log(`[apply] answering ${questionCount} eligibility questions "Yes"`);
    for (let i = 0; i < questionCount; i++) {
        await yesButtons.nth(i).click();
    }
    await shot(page, 'apply-answered');

    await page.getByRole('button', { name: /submit application/i }).click();
    await page.waitForLoadState('networkidle');
    await describePage(page, 'after submitting application');
    await shot(page, 'apply-submitted');

    // Where the student ends up depends on whether the answers auto-qualified them.
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await describePage(page, 'dashboard after applying');
    await shot(page, 'dashboard-after-apply');

    await reportCourseState(page, 'after application');
});

test('journey stage 2: work through the course module by module', async ({ page }) => {
    test.setTimeout(1_800_000);
    page.setDefaultTimeout(20_000);

    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log(`[browser error] ${msg.text()}`);
    });
    page.on('response', (res) => {
        if (res.status() >= 400) console.log(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
    });

    // Starting an attempt and submitting it both raise window.confirm.
    page.on('dialog', (dialog) => {
        console.log(`[dialog] ${dialog.message()}`);
        dialog.accept().catch(() => {});
    });

    await signIn(page);

    const modules = await fetchModules(page);

    for (const module of modules) {
        const items = (module.items ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index);
        console.log(`\n### module ${module.order_index}: ${module.title}`);

        for (const item of items) {
            if (item.is_complete) {
                console.log(`   already complete: ${item.item_type} #${item.id}`);
                continue;
            }

            if (item.item_type === 'resource') {
                const ok = await completeResource(page, item);
                console.log(`   ${ok ? 'did' : 'FAILED'} resource:${item.type} #${item.id} — ${item.title}`);
                continue;
            }

            // Both still need an admin to grade them afterwards before the module completes.
            const ok =
                item.item_type === 'assignment'
                    ? await submitAssignment(page, item)
                    : await takeEvaluation(page, item);
            console.log(`   ${ok ? 'did' : 'FAILED'} ${item.item_type} #${item.id} — ${item.title}`);
        }

        // Only the first module is attempted per run until assignments/evaluations are scripted —
        // later modules stay locked until this one completes anyway.
        break;
    }

    await reportCourseState(page, 'end of stage 2');
});

const API = 'http://127.0.0.1:8000';

/** Reads the live course structure through the student's own session. */
async function fetchModules(page: Page): Promise<any[]> {
    const res = await page.request.get(`${API}/api/v1/courses/${COURSE_ID}/modules`);
    if (!res.ok()) {
        console.log(`[modules] GET failed: ${res.status()}`);

        return [];
    }
    const body = await res.json();

    return (body.data ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index);
}

/**
 * Completes one resource by its type. Every type has its own completion signal in
 * ProgressEngine — mark-as-read for documents, opened_at for links/files, attendance for live
 * sessions — and the UI exposes a different control for each.
 */
async function completeResource(page: Page, item: any): Promise<boolean> {
    await page.goto(`/learn/resources/${item.id}?course=${COURSE_ID}`);
    await waitForAppReady(page);

    const clickMaybePopup = async (name: RegExp): Promise<boolean> => {
        const control = page.getByRole('link', { name }).or(page.getByRole('button', { name })).first();
        await control.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
        if (await control.count() === 0) return false;

        // These open a new tab; the completion signal is sent by the click/navigation itself.
        const popupPromise = page.waitForEvent('popup', { timeout: 5_000 }).catch(() => null);
        await control.click();
        const popup = await popupPromise;
        if (popup) await popup.close().catch(() => {});
        await page.waitForTimeout(1_000);

        return true;
    };

    switch (item.type) {
        case 'document':
        case 'reading':
        case 'scorm': {
            const markRead = page.getByRole('button', { name: /mark as read/i });
            await markRead.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
            if (await markRead.count() === 0) {
                console.log(`      ! no "Mark as read" control on resource #${item.id}`);

                return false;
            }
            await markRead.click();
            await page.waitForTimeout(1_000);

            return true;
        }
        case 'external_link':
            // A YouTube URL renders an inline embed that marks itself opened on mount, so the
            // page visit alone completes it; anything else needs the "Open link" click.
            if (await clickMaybePopup(/open link/i)) return true;
            await page.waitForTimeout(1_500);

            return true;
        case 'downloadable_file':
            return clickMaybePopup(/open file/i);
        case 'live_session':
            return clickMaybePopup(/join session/i);
        default:
            console.log(`      ! no handler for resource type ${item.type}`);

            return false;
    }
}


/**
 * Correct answers for module 1's "Backend Fundamentals Check". The DOM deliberately strips
 * `is_correct`, so a student-side script cannot derive them — they are listed here so the run
 * reaches the 70% pass mark the module completion check requires.
 */
const CORRECT_OPTIONS = new Set([
    'POST',
    '422 Unprocessable Entity',
    'True',
    '201 Created',
    'Managing dependencies and generating an autoloader',
]);

const SHORT_ANSWER = '$_POST';

/** Waits for a page's own content, not just the app shell, to finish loading. */
async function waitForPageContent(page: Page): Promise<void> {
    await waitForAppReady(page);
    // The route-level Spinner is swapped for real content once the queries resolve.
    await page
        .locator('main h1, main h2, main form, main [role="alert"]')
        .first()
        .waitFor({ state: 'visible', timeout: 60_000 })
        .catch(() => console.log('   ! page content did not render within 60s'));
}

async function submitAssignment(page: Page, item: any): Promise<boolean> {
    await page.goto(`/learn/assignments/${item.id}?course=${COURSE_ID}`);
    await waitForPageContent(page);
    await describePage(page, `assignment #${item.id}`);

    const answer = page.getByLabel(/written answer/i).first();
    if (await answer.count() === 0) {
        await shot(page, `assignment-${item.id}-no-form`);
        console.log(`   ! no "Written answer" field on assignment #${item.id}`);

        return false;
    }

    await answer.fill(
        'Defined GET /api/v1/ping in routes/api.php returning a JSON payload, then documented '
        + 'the route, its method, and its response shape in the project README.',
    );
    await shot(page, `assignment-${item.id}-filled`);
    await page.getByRole('button', { name: /submit assignment/i }).click();
    await page.waitForTimeout(3_000);
    await describePage(page, `assignment #${item.id} after submit`);
    await shot(page, `assignment-${item.id}-submitted`);

    return true;
}

async function takeEvaluation(page: Page, item: any): Promise<boolean> {
    await page.goto(`/learn/evaluations/${item.id}?course=${COURSE_ID}`);
    await waitForPageContent(page);
    await describePage(page, `evaluation #${item.id}`);
    await shot(page, `evaluation-${item.id}-prestart`);

    const start = page.getByRole('button', { name: /start evaluation|resume attempt/i });
    if (await start.count() === 0) {
        console.log(`   ! no start control on evaluation #${item.id}`);

        return false;
    }

    // Starting pops a window.confirm about the timer beginning immediately.
    await start.click();
    await page.waitForTimeout(3_000);
    await shot(page, `evaluation-${item.id}-questions`);

    // Choice questions are labels wrapping radio/checkbox inputs; pick the ones whose visible
    // text is a known-correct option. Free-text questions get the short answer.
    const choices = page.locator('main label').filter({ has: page.locator('input[type=radio], input[type=checkbox]') });
    const choiceCount = await choices.count();
    let picked = 0;
    for (let i = 0; i < choiceCount; i++) {
        const label = choices.nth(i);
        const text = (await label.innerText().catch(() => '')).trim();
        if (CORRECT_OPTIONS.has(text)) {
            await label.locator('input').click().catch(() => {});
            picked++;
        }
    }
    console.log(`   answered ${picked} of ${choiceCount} choice options`);

    const textAreas = page.locator('main textarea');
    const textCount = await textAreas.count();
    for (let i = 0; i < textCount; i++) {
        await textAreas.nth(i).fill(SHORT_ANSWER).catch(() => {});
    }
    console.log(`   filled ${textCount} free-text answers`);
    await shot(page, `evaluation-${item.id}-answered`);

    await page.getByRole('button', { name: /submit attempt/i }).click();
    await page.waitForTimeout(4_000);
    await describePage(page, `evaluation #${item.id} after submit`);
    await shot(page, `evaluation-${item.id}-submitted`);

    return true;
}

/** Prints per-module completion so progress between runs is visible in the log. */
async function reportCourseState(page: Page, label: string): Promise<void> {
    const modules = await fetchModules(page);
    console.log(`\n--- course state (${label}) ---`);
    for (const m of modules) {
        const items = (m.items ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index);
        const done = items.filter((i: any) => i.is_complete).length;
        console.log(`  [${m.status ?? '?'}] module ${m.order_index} "${m.title}" — ${done}/${items.length} complete`);
        for (const i of items) {
            const kind = i.item_type === 'resource' ? `resource:${i.type}` : i.item_type;
            console.log(`      ${i.is_complete ? 'x' : ' '} ${kind} #${i.id} ${i.title}`);
        }
    }
}

const ADMIN = { email: 'admin@resnet.test', password: 'password' };

/**
 * Stage 3: the admin side. Both the assignment and the evaluation's short-answer question need
 * a human grade before module 1 can complete, which is what unlocks module 2.
 */
test('journey stage 3: grade the submitted assignment and evaluation as admin', async ({ page }) => {
    test.setTimeout(900_000);
    page.setDefaultTimeout(20_000);

    page.on('dialog', (dialog) => {
        console.log(`[dialog] ${dialog.message()}`);
        dialog.accept().catch(() => {});
    });
    page.on('response', (res) => {
        if (res.status() >= 400) console.log(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
    });

    await page.goto('/?auth=login');
    await page.getByLabel('Enter email').fill(ADMIN.email);
    await page.getByLabel('Enter password', { exact: true }).fill(ADMIN.password);
    await page.getByRole('button', { name: /^log in$/i }).last().click();
    await page.waitForLoadState('networkidle');
    console.log(`[admin] signed in, url=${page.url()}`);
    await shot(page, 'admin-dashboard');

    // ── Grade the evaluation's manually-marked answer ─────────────────────────
    await page.goto('/admin/evaluations/6/grading');
    await waitForPageContent(page);
    await describePage(page, 'admin evaluation grading queue');
    await shot(page, 'admin-eval-queue');

    const gradeButton = page.getByRole('button', { name: /^grade$/i }).first();
    if (await gradeButton.count() > 0) {
        await gradeButton.click();
        await page.waitForTimeout(1_500);
        await describePage(page, 'admin evaluation grade form');
        await shot(page, 'admin-eval-form');

        const points = page.getByLabel(/points awarded/i).first();
        if (await points.count() > 0) {
            await points.fill('1');
            await shot(page, 'admin-eval-points-filled');
            await page.getByRole('button', { name: /save grade/i }).click();
            await page.waitForTimeout(3_000);
            await describePage(page, 'admin evaluation after save');
            await shot(page, 'admin-eval-saved');
        } else {
            console.log('[admin] no "Points awarded" field found');
        }
    } else {
        console.log('[admin] no Grade button in the evaluation queue');
    }

    // ── Grade the assignment submission ───────────────────────────────────────
    await page.goto('/admin/assignments/1');
    await waitForPageContent(page);
    await describePage(page, 'admin assignment grading');
    await shot(page, 'admin-assignment');

    const assignmentGrade = page.getByRole('button', { name: /^grade$/i }).first();
    if (await assignmentGrade.count() > 0) {
        await assignmentGrade.click();
        await page.waitForTimeout(1_500);
        await describePage(page, 'admin assignment grade form');

        await page.getByLabel(/raw score/i).first().fill('85');
        await page.getByLabel(/feedback/i).first().fill('Route and documentation both correct. Good work.').catch(() => {});
        await shot(page, 'admin-assignment-filled');
        await page.getByRole('button', { name: /save grade/i }).click();
        await page.waitForTimeout(3_000);
        await describePage(page, 'admin assignment after save');
        await shot(page, 'admin-assignment-saved');
    } else {
        console.log('[admin] no Grade button on the assignment page');
    }
});


/**
 * Stage 4: the two fixes that need eyes on a real browser —
 *  (a) the certificate link is clickable and serves a PDF even though no queue worker has run,
 *  (b) the evaluation countdown stays pinned to the top while scrolling through questions.
 */
test('journey stage 4: certificate download and sticky evaluation timer', async ({ page }) => {
    test.setTimeout(900_000);
    page.setDefaultTimeout(20_000);

    page.on('dialog', (dialog) => {
        console.log(`[dialog] ${dialog.message()}`);
        dialog.accept().catch(() => {});
    });
    page.on('response', (res) => {
        if (res.status() >= 400) console.log(`[http ${res.status()}] ${res.request().method()} ${res.url()}`);
    });

    await signIn(page);

    // ── (a) Certificate ───────────────────────────────────────────────────────
    await page.goto('/dashboard');
    await waitForPageContent(page);
    await describePage(page, 'my courses after completing the course');
    await shot(page, 'certificate-my-courses');

    const certLink = page.getByRole('link', { name: /certificate/i }).first();
    const certText = await certLink.innerText().catch(() => '(none)');
    const certHref = await certLink.getAttribute('href').catch(() => null);
    console.log(`[certificate] link text="${certText.trim()}" href=${certHref}`);

    if (certHref) {
        // Follow it the way the browser would, carrying the session cookie.
        const res = await page.request.get(certHref, { maxRedirects: 0 }).catch((e) => {
            console.log(`[certificate] request failed: ${e.message}`);

            return null;
        });

        if (res) {
            console.log(`[certificate] status=${res.status()} location=${res.headers()['location'] ?? '(none)'}`);
            const target = res.headers()['location'];
            if (target) {
                const pdf = await page.request.get(target);
                const body = await pdf.body();
                console.log(`[certificate] pdf status=${pdf.status()} bytes=${body.length} magic=${body.subarray(0, 5).toString()}`);
            }
        }
    }

    // ── (b) Sticky timer ──────────────────────────────────────────────────────
    // A fresh attempt is safe: module completion keys off *any* passed attempt, and this
    // evaluation allows 3. It is only started to observe the timer while scrolling.
    await page.goto(`/learn/evaluations/6?course=${COURSE_ID}`);
    await waitForPageContent(page);

    const start = page.getByRole('button', { name: /start evaluation|resume attempt/i });
    if (await start.count() === 0) {
        console.log('[timer] no start control available — cannot observe the timer');

        return;
    }

    await start.click();
    await page.waitForTimeout(3_000);

    const timer = page.getByText(/remaining/i).first();
    const before = await timer.boundingBox().catch(() => null);
    console.log(`[timer] before scroll: ${JSON.stringify(before)}`);
    await shot(page, 'timer-top-of-page');

    // The scroll container is AppShell's <main>, not the window.
    await page.locator('main').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(1_500);

    const after = await timer.boundingBox().catch(() => null);
    const stillVisible = await timer.isVisible().catch(() => false);
    console.log(`[timer] after scroll: ${JSON.stringify(after)} visible=${stillVisible}`);
    await shot(page, 'timer-after-scrolling-to-bottom');

    if (before && after) {
        console.log(`[timer] y moved from ${before.y} to ${after.y} (stays pinned if roughly unchanged)`);
    }
});


/**
 * Stage 5: click the certificate link the way a student actually would. A real top-level
 * navigation carries the Origin/Referer header that Sanctum's stateful guard needs — an
 * APIRequestContext call does not, and gets bounced to /login, which is a testing artefact
 * rather than a product bug.
 */
test('journey stage 5: open the certificate the way a student does', async ({ page }) => {
    test.setTimeout(600_000);
    page.setDefaultTimeout(20_000);

    await signIn(page);
    await page.goto('/dashboard');
    await waitForPageContent(page);

    const certLink = page.getByRole('link', { name: /certificate/i }).first();
    await certLink.waitFor({ state: 'visible', timeout: 30_000 });
    const href = await certLink.getAttribute('href');
    console.log(`[certificate] text="${(await certLink.innerText()).trim()}" href=${href}`);
    await shot(page, 'certificate-link-visible');

    // A top-level navigation is what a click performs: it carries the SPA's Origin/Referer and
    // session cookie, and follows the cross-origin redirect to the stored PDF (which `fetch`
    // cannot, because R2 sends no CORS headers for this origin).
    // page.goto() is automation-initiated and sends no Referer, which Sanctum's stateful guard
    // treats as a guest request — a real click does send one, so supply it explicitly.
    await page.setExtraHTTPHeaders({ Referer: 'http://127.0.0.1:3000/dashboard' });
    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 }).catch(() => null);
    const response = await page.goto(href!, { waitUntil: 'commit' }).catch(() => null);
    const download = await downloadPromise;

    if (download) {
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(chunk as Buffer);
        const body = Buffer.concat(chunks);
        console.log(`[certificate] downloaded "${download.suggestedFilename()}" from ${download.url()}`);
        console.log(`[certificate] bytes=${body.length} magic=${JSON.stringify(body.subarray(0, 5).toString())}`);
        console.log(body.subarray(0, 5).toString() === '%PDF-'
            ? '[certificate] PASS — a real PDF was served'
            : '[certificate] FAIL — the downloaded file is not a PDF');

        return;
    }

    // No download: report where the navigation actually landed, which is how the old
    // rel="noreferrer" bug showed up (it ended on /login).
    console.log(`[certificate] no download; status=${response?.status()} landed on ${page.url()}`);
    console.log(page.url().includes('/login')
        ? '[certificate] FAIL — bounced to the login page'
        : '[certificate] inconclusive — see the URL above');
});

test('journey stage 6: the evaluation timer stays pinned while scrolling', async ({ page }) => {
    test.setTimeout(900_000);
    page.setDefaultTimeout(20_000);

    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));

    await page.goto('/?auth=login');
    await page.getByLabel('Enter email').fill('qa.timer.student@resnet.test');
    await page.getByLabel('Enter password', { exact: true }).fill('Password123!');
    await page.getByRole('button', { name: /^log in$/i }).last().click();
    await page.waitForLoadState('networkidle');
    console.log(`[timer] signed in, url=${page.url()}`);

    await page.goto(`/learn/evaluations/6?course=${COURSE_ID}`);
    await waitForPageContent(page);

    const start = page.getByRole('button', { name: /start evaluation|resume attempt/i });
    await start.waitFor({ state: 'visible', timeout: 30_000 });
    await start.click();
    await page.waitForTimeout(4_000);

    const timer = page.getByText(/remaining/i).first();
    await timer.waitFor({ state: 'visible', timeout: 30_000 });

    const scroller = page.locator('main');
    const before = await timer.boundingBox();
    const scrollBefore = await scroller.evaluate((el) => el.scrollTop);
    console.log(`[timer] before scroll: y=${before?.y} scrollTop=${scrollBefore}`);
    await shot(page, 'timer-before-scroll');

    // AppShell's <main> is the scroll container, not the window.
    await scroller.evaluate((el) => el.scrollTo(0, el.scrollHeight));
    await page.waitForTimeout(1_500);

    const after = await timer.boundingBox();
    const scrollAfter = await scroller.evaluate((el) => el.scrollTop);
    const visible = await timer.isVisible();
    console.log(`[timer] after scroll:  y=${after?.y} scrollTop=${scrollAfter} visible=${visible}`);
    await shot(page, 'timer-after-scroll');

    const drift = Math.abs((after?.y ?? 0) - (before?.y ?? 0));
    console.log(`[timer] scrolled ${scrollAfter - scrollBefore}px; timer moved ${drift}px — pinned if this is ~0`);
});
