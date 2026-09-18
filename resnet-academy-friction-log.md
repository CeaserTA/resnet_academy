# Friction log — Backend Development course journey

Test account used for the run (so you can log in and verify):

| Field | Value |
| --- | --- |
| Email | `qa.journey.student@resnet.test` |
| Password | `Password123!` |
| Name | QA Journey Student |

Admin used for the grading/date-adjustment steps: `admin@resnet.test` / `password`.

Screenshots referenced below are in the run's artifact directory (`scratchpad/journey/`).

---

## F1 — The SPA cannot talk to the API on Vite's default port (blocking)

**Severity:** blocking — the app renders as an empty shell for anyone following the standard Vite workflow.

**What happens:** start the frontend with `npm run dev` (Vite's default port 5173), open it, and every single API call fails. The catalogue, dashboard and course pages render their frames with no data. The browser console is a wall of:

```
Access to XMLHttpRequest at 'http://127.0.0.1:8000/api/v1/cohorts?status=published'
from origin 'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root cause:** two separate allowlists both omit port 5173.

- `config/cors.php` allows only `FRONTEND_URL` (`http://127.0.0.1:3000`), `http://127.0.0.1:3001` and `http://localhost:3001`.
- `config/sanctum.php` `stateful` resolves to `localhost, localhost:3000, 127.0.0.1, 127.0.0.1:3000, 127.0.0.1:8000, ::1` — also no 5173.

Both must match the dev origin: CORS to allow the request at all, Sanctum's stateful list for the session cookie to authenticate it.

**Evidence** (preflight against the two origins):

```
$ curl -i -X OPTIONS http://127.0.0.1:8000/api/v1/courses \
    -H "Origin: http://127.0.0.1:3000" -H "Access-Control-Request-Method: GET"
HTTP/1.0 204 No Content
Access-Control-Allow-Origin: http://127.0.0.1:3000      <-- allowed

$ curl -i -X OPTIONS http://127.0.0.1:8000/api/v1/courses \
    -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET"
HTTP/1.0 204 No Content
                                                         <-- no ACAO header at all
```


**Also note** `localhost` and `127.0.0.1` are distinct origins to a browser even though they resolve to the same host, so `http://localhost:3000` is *also* blocked by CORS despite port 3000 being the intended one. The only origin that works today is exactly `http://127.0.0.1:3000`.

**Suggested fix:** add the Vite default to both lists, or document that the dev server must run on `127.0.0.1:3000`. A `--host 127.0.0.1 --port 3000` in the `dev` script would make the working setup the default one.

---

## F2 — The Playwright e2e suite points at an origin that can never authenticate

**Severity:** high (blocks all e2e work), same root cause as F1.

`frontend/playwright.config.ts` shipped with `baseURL: 'http://localhost:5173'` and the matching `webServer.url`. Because of F1, any test that logs in fails: the requests are blocked before they reach the API. This is not a flaky test — the suite cannot pass as configured.

**Fixed as part of this work:** `baseURL` and `webServer` now default to `http://127.0.0.1:3000` (overridable with `E2E_BASE_URL`), with a comment explaining that the value has to stay in step with `config/cors.php` and `config/sanctum.php`.

---

## F3 — `profile-completion.spec.ts` uses an ambiguous password selector

**Severity:** low (test-only, not user-facing).

The existing helper does `page.getByLabel('Password').fill(...)`, but the signup modal has two password fields — labelled *"Enter password"* and *"Confirm password"*. Playwright's strict mode rejects the ambiguous match:

```
Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
  1) aka getByRole('textbox', { name: 'Enter password' })
  2) aka getByRole('textbox', { name: 'Confirm password' })
```

So this spec's `registerUser` helper fails before it submits. Left as-is (out of scope for these tasks) but worth a follow-up.

---

## F4 — Completed certificates were permanently stuck on "Certificate generating…"

**Severity:** blocking for the student — this is task 4, and the fix is described in the task summary rather than repeated here.

Two defects stacked:

1. `GenerateCertificatePdf` is a queued job and `QUEUE_CONNECTION=database`, so with no `queue:work` running, `certificate_url` was never populated. Evidence at the time of investigation: 14 rows in the `jobs` table all with `attempts=0`, and 1 certificate with `certificate_url = NULL`.
2. Even so, the UI rendered the label inside an anchor with no `href`:

   ```tsx
   <a href={progress.certificate.certificate_url ?? undefined} ...>
       {progress.certificate.certificate_url ? 'Download certificate' : 'Certificate generating…'}
   </a>
   ```

   An `<a>` with `href={undefined}` is inert — which is exactly the "not clickable, can never access it" symptom.

**Fixed:** a `GET /api/v1/certificates/{id}/download` endpoint renders the PDF on demand and redirects to it, the queued job and the endpoint share one idempotent `CertificateService::ensurePdf()` under a cache lock, and the UI now always links to that endpoint.

Separately, `MediaStorageService::putRaw()` ignored the return value of a disk write on a disk configured with `'throw' => false`, so a failed upload would still have persisted a `certificate_url` pointing at a file that was never written. It now raises instead.

---

## F5 — Live session dates make the sessions uncompletable

**Severity:** medium (content/data issue rather than a code bug).

All five live sessions in Backend Development are scheduled `2026-09-14`, which is in the past. `ProgressEngine::recordLiveSessionJoin()` only admits a student between `scheduled_at` and `scheduled_at + duration + 30 min`:

```php
abort_if(now()->lt($liveSession->scheduled_at), 403, 'This session has not started yet.');
abort_if(now()->gt($endsAt->clone()->addMinutes(self::JOIN_GRACE_PERIOD_MINUTES)), 403, 'This session has ended.');
```

Since every live session is a **required** module item, a student who enrols after the session date can never complete that module, and therefore can never finish the course or earn a certificate — with no in-app way to resolve it. The dates were adjusted as admin to run the journey, as the task allowed.

**Resolved — recording fallback.** A missed live session is no longer a dead end:

- `resource_live_sessions` gained a nullable `recording_url`. Admins and the course instructor paste the Zoom or Drive link on the same live-session form they already use, with an inline note about sharing settings.
- Once the join window closes, opening the recording completes the item, reusing the existing `markOpened` signal — the same "open it → complete" rule external links already follow. `ProgressEngine::isResourceComplete()` now accepts attendance **or** an `opened_at`.
- With the window closed and no recording yet, the student sees an explicit *"recording hasn't been posted yet"* state instead of a dead end, and it becomes completable the moment the link is attached — no student action needed in between.
- Saving a link runs a best-effort server-side reachability check and warns the admin immediately if it looks like a sign-in wall, passcode prompt or "request access" page. The warning never blocks the save, because a false positive must not stop legitimate work.
- Past sessions with no recording are counted on the admin dashboard summary and listed at `GET /api/v1/admin/live-sessions/missing-recordings`, and flagged inline in the course module table where sessions are managed.

The join-window rule itself moved onto `ResourceLiveSession` (`joinWindowIsOpen()`, `joinWindowHasClosed()`, `isMissingRecording()`), since it now decides three separate things — whether a join is accepted, whether the student is offered the recording, and whether an admin is told one is missing — and those must not drift apart.

### Testing the recording fallback — what was verified, and what was found

**Verified end to end in a real browser** (`frontend/e2e/live-session-recording.spec.ts`, screenshots in `scratchpad/recording/`), against Backend Development's module 1 live session set 5 hours in the past:

1. Student sees *"This session has already taken place and the recording hasn't been posted yet…"* — no join link, no error.
2. Admin sees the **Recording missing** flag in the module table.
3. Admin saves a link and gets a save-time warning; the edit dialog stays open.
4. Admin saves a publicly viewable link — dialog closes cleanly, flag disappears.
5. Student is offered **Watch the recording**; opening it completed the item. Database afterwards: `opened_at` set, **0** attendance rows, `isResourceComplete = true`.

Backend: 25 tests pass — 10 for the fallback (including certificate issuance on a course finished through a recording), 9 for the link checker, and the 6 pre-existing join tests, confirming the original live-join path did not regress.

**F9 — the save-time warning leaked raw cURL internals to the admin (found and fixed).** When the check could not reach a link, the warning embedded the transport exception verbatim:

```
Saved — but students may not be able to open this recording. We could not reach that link to
check it (cURL error 28: Connection timed out after 8624 milliseconds (see
https://curl.se/libcurl/c/libcurl-errors.html) for https://accounts.google.com/...). ...
```

That is meaningless to an instructor. The detail now goes to the application log, and the admin sees a plain sentence. Covered by a test asserting the transport error no longer appears in the message.

**Honest limit of the real-internet check.** Step 3 used a `accounts.google.com` sign-in URL, intending to prove sign-in-wall detection against the live internet. The warning did fire — but because the outbound request **timed out** from this machine, not because the page was recognised as a login wall. So the real-network run proved the *unreachable* path, not the *sign-in wall* path. Sign-in-wall redirects, 401/403s, "request access" pages and Zoom passcode prompts are covered by the checker's tests with faked responses; they have not been observed working against real Google/Zoom pages from this environment.

**Worth knowing:** the check has an 8-second timeout, so saving a link to a slow or unreachable host keeps the admin on the save spinner for up to ~8 seconds before the warning appears.

---

## F6 — Logged-in users appear logged out on every public page

**Severity:** medium — confusing, and it strands the user with no way back into the app.

**What happens:** log in (the dashboard loads fine), then click "Browse catalogue". The catalogue header shows **"Log in" / "Sign up"** as though you had no account, with no avatar, no profile menu, and no link back to the dashboard. Clicking the call-to-action opens the *"Create your account"* signup modal — for a user who is already signed in.

**Evidence:** screenshot `06-catalogue.png` — taken in the same browser session, seconds after `/dashboard` rendered as the authenticated student "QA Journey Student".

**Root cause:** `LandingHeader` declares the prop but nothing ever passes it.

```tsx
// frontend/src/components/layout/LandingHeader.tsx
export function LandingHeader({ isAuthenticated = false, onLoginClick, onSignupClick }: LandingHeaderProps) {
```

It has full support for the authenticated state internally (`{isAuthenticated ? ... : ...}` in three places), but all four call sites omit the prop, so it always falls back to `false`:

- `frontend/src/features/catalogue/CataloguePage.tsx:335`
- `frontend/src/features/catalogue/CohortPage.tsx:137`
- `frontend/src/pages/AboutPage.tsx:108`
- `frontend/src/pages/ContactPage.tsx:93`

The session itself is fine — this is purely a display/wiring bug. Passing the real auth state from each page fixes all four.

---

## F7 — ~~Saving the profile gives no visible confirmation or forward path~~ **RETRACTED — this finding was wrong**

**Status:** withdrawn after re-testing. The behaviour I reported does not match what the app does.

I originally claimed that saving on `/profile/complete` gave no success message, left the banner
stale, and stranded the user on the form. Re-measured properly in a browser, all three claims are
false:

| Claim | Reality |
| --- | --- |
| No success message | An `Alert` reading *"Profile saved successfully!"* appears **1022ms** after the click and stays on screen **~1267ms** |
| Banner does not update | It updates **live as you type** — measured 33.33% before filling, 100% after, before saving at all |
| User is stranded on the form | Redirects automatically — measured landing on `/dashboard` **2289ms** after the click |

The forward path is not just a dashboard redirect either: `CourseDetailPage.tsx:231` stores
`returnUrl = /courses/{id}?action=apply` when an incomplete profile blocks an application, and
`ProfileCompletionPage` sends the user back there and re-opens the apply flow. Both redirect paths
have passing tests (`ProfileCompletionPage.test.tsx:125,159`).

**Why I got it wrong.** The original observation came from an automated dump that only listed
headings, buttons and links — an `Alert` is none of those — plus a screenshot taken before the
save request had even finished, in a run that navigated away before the redirect could fire. I
did not open that screenshot before writing the finding. The lesson is that "the element I
queried for wasn't there" is not the same as "the feature is missing", and a finding asserting
absence needs a positive check with the right timing.

**The one thing that is arguably weak:** the confirmation is only readable for about 1.3 seconds
before the redirect takes over, so a user who glances away misses it and arrives at the dashboard
with no evidence the save worked. That is a judgement call about toast duration, not a defect.

---

## F8 — `rel="noreferrer"` silently breaks any link to an authenticated API route

**Severity:** high — it turns a working link into a redirect to the login page, with no error.

Found while verifying the certificate fix by actually clicking the link in a browser. The new
certificate link initially carried `rel="noreferrer"` (copied from the old markup, which pointed
straight at a public file URL and so did not care). The download endpoint is Sanctum-authenticated,
and Sanctum's `EnsureFrontendRequestsAreStateful` only honours the session cookie when the
`Origin`/`Referer` header identifies the SPA. `noreferrer` strips that header, so the logged-in
student was treated as a guest:

```
[certificate] href=http://127.0.0.1:8000/api/v1/certificates/2/download
[certificate] status=302 location=http://127.0.0.1:3000/login
[certificate] opened tab url=http://127.0.0.1:3000/dashboard   <-- bounced, no PDF
```

**Fixed:** the link now uses `rel="noopener"` only — which still denies the new tab a
`window.opener` handle, the actual security property `target="_blank"` needs.

This is a sharp edge worth knowing about generally: **any** `target="_blank"` link to an
authenticated API route in this app must use `noopener` and never `noreferrer`. The live-session
join link already carries a long comment explaining exactly this; it is the kind of trap that will
be stepped on again. A shared helper component for "open an authenticated API URL in a new tab"
would make the correct behaviour the default.

---

## Journey record — Backend Development, all 5 modules

Module 1 was completed **entirely through the UI** in a real browser (screenshots in the artifact
directory). Modules 2-5 use the identical seven-item template, so they were completed through the
same domain services the UI calls (`ProgressEngine`, `AssignmentSubmissionService`,
`EvaluationAttemptService`) rather than repeating the same four interactions four more times —
all completion, unlock and certificate-issuance logic still ran for real.

**Module 1, via the UI:**

| Item | Action | Result |
| --- | --- | --- |
| Video Walkthrough (external link) | opened | complete |
| Lecture Notes (Word) | Mark as read | complete |
| Quick Reference (PDF) | Mark as read | complete |
| Slide Deck (PowerPoint) | Mark as read | complete |
| Assignment — Build and Document a Minimal Laravel Route | submitted written answer, graded 85 by admin | complete |
| Evaluation — Backend Fundamentals Check | 5/5 auto-graded correct, short answer graded by admin | graded, 100%, passed |
| Live Session | joined (after the date fix in F5) | attendance recorded |

Sequential unlocking behaved correctly throughout: module 1 went `in_progress` → `completed`, and
module 2 moved from `locked` to `not_started` only once module 1 finished.

**End state:** all five modules `completed`, and a certificate was issued automatically
(`CERT-LGIUVODZZJ2O`) with `certificate_url = NULL` — precisely the state that used to strand the
student on "Certificate generating…" forever. With the fix in place the link reads "Download
certificate" and generates the PDF on the first click.

---

## Verification evidence

**Sticky evaluation timer (task 2).** Measured in a real browser on an active attempt: the
countdown badge sat at `y=114` before scrolling and at `y=114` after scrolling the container
`738px` — **0px drift**, still visible. The breadcrumbs, the "Attempt #1" heading and the
countdown pin together as one bar, and a background strip covers the scroll container's padding
so question text no longer scrolls through the gap above it. Screenshots:
`01-timer-before-scroll.png`, `02-timer-after-scroll.png`.

Getting there took three attempts worth recording, because each fix exposed the next problem:
pinning at `top-0` alone left a strip of question text visible above the bar; covering that strip
with a negative margin hid the breadcrumbs; moving the breadcrumbs inside the sticky region
solved both.

**Certificate (task 4).** The journey ended with a certificate issued automatically and
`certificate_url = NULL` — the exact state that used to strand a student. After the fix:

```
number=CERT-LGIUVODZZJ2O url='certificates/CERT-LGIUVODZZJ2O.pdf'
exists=true bytes=2052
```

The PDF was rendered on demand by the first click, with **no queue worker running** — which is
the whole point of the fix.

---

## Note on the embedded Office document viewer

The Word/PowerPoint resources render through Microsoft's Office Online viewer, which pulls scripts
from `res.public.onecdn.static.microsoft` — several of which 404 during load:

```
[http 404] GET https://res.public.onecdn.static.microsoft/officeonline/p/s/.../BootViewDS.CloudPolicySettingsHelperInstance.js
```

The documents still display and "Mark as read" works, so this is not blocking, but it means those
pages never reach network idle and the console carries permanent 404 noise. Worth a look if the
viewer ever appears slow or flaky to students.

---

## Admin certificate access + public verification page

### F10 — The public certificate-verification page was unreachable (blocking for employers)

**Severity:** high — the one page third parties use to confirm a certificate is genuine did not exist in the UI.

`/verify-certificate` rendered **`VerifyEmailNoticePage`** — the "Verify your email" screen — instead of `CertificateVerifyPage`. A logged-out employer visiting it saw *"We sent a verification link to **[blank]**. Click it to activate your account"*, plus a "resend" button that calls an authenticated endpoint. `CertificateVerifyPage` was fully built but routed nowhere. The backend endpoint worked the whole time; nothing in the UI reached it.

**Root cause (from git):** commit `f62812f` *"Landing page routing restructure"* replaced the route's element:

```diff
-                <Route path="verify-certificate" element={<CertificateVerifyPage />} />
+            <Route path="verify-certificate" element={<VerifyEmailNoticePage />} />
```

The same restructure also dropped the `PublicLayout` wrapper, whose footer held the only link to the page — so it had no entry point anywhere.

**Fixed:** verification is now a **modal** rather than a page — a *"Verify a certificate"* button in the site footer opens it, so it is available on every public page (landing, catalogue, cohort, about, contact) without navigating away. `CertificateVerifyPage` was removed; the old `/verify-certificate` URL redirects home so an existing link doesn't 404. Verified in a browser, logged out: opens from the footer, the URL never changes, and reopening starts blank.

### F11 — An unknown certificate number exposed Laravel internals to the public

**Severity:** medium — information leak on an unauthenticated page, and a confusing result for the visitor.

```
GET /api/v1/certificates/verify/CERT-NOTREAL00000
404 {"error":{"code":"http_error","message":"No query results for model [App\Models\Certificate].", ...}}
```

The page rendered that `message` verbatim in a red error box. Cause: `firstOrFail()` in `CertificateController::verify()`.

**Fixed:** the controller returns a plain *"No certificate was found with that number…"* 404, and the page treats a 404 as an expected answer — a clear **"No matching certificate"** result, not an error. It also resets before each lookup, so a previous *"Valid certificate"* block can no longer sit beside a number that doesn't exist.

### Verified as already correct (no change needed)

- **Minimal data:** the public response contains only `valid`, `certificate_number`, `student_name`, `course_title`, `issued_at` — no email, phone or IDs. A test asserts the exact key set and that a seeded email and phone never appear.
- **Still-generating certificates verify as valid.** That is the right answer: the award exists as soon as the course is completed; the PDF is only the printable copy. The response doesn't reference the PDF, so nothing broken is shown.
- **Lookups ignore case** (`cert-lgiuvodzzj2o` matches), via MySQL collation.
- **Admins could already download any student's certificate:** `CertificatePolicy::view` already allowed admins. It is now covered by a test.

### Worth knowing

- **There is no stored `failed` state.** A certificate is `generating` until its PDF exists, then `ready`. When the queued render exhausts its retries, `GenerateCertificatePdf::failed()` only writes a log line, so a failed certificate looks identical to one still queued. The admin screen treats both the same (regenerate is offered for anything not ready). If "failed" needs to be distinguishable, it needs a persisted status.
- **Rendering is slow here:** one certificate took **~25s** to render and upload on this machine. Under `php artisan serve`, which handles one request at a time, that blocks the admin's other API calls for the duration. Production should use a proper multi-worker server; worth knowing before judging regenerate as "hung".

## Certificate branding and trust elements

The certificate template now carries the ResNet Academy mark and wordmark, the issuing
institution's name, a footer with the website and verification URL, a QR code, a signature block,
an official seal, the course period, a serif student name and a background watermark.

Verified end to end: an admin regenerated a certificate from `/admin/certificates`, downloaded the
resulting PDF, and every element rendered — one page, nothing overlapping. The QR code was scanned
out of that PDF (`http://127.0.0.1:3000/verify-certificate?number=CERT-BUZFBUOQRNWQ`) and opening
that URL logged out showed **"Valid certificate — QA Timer Student — Backend Development"** with no
typing. A certificate issued before the change downloaded byte-for-byte as the old template, since
`ensurePdf()` only renders when `certificate_url` is null.

### F12 — The QR code had no URL to point at: verification was a modal with no address

**Severity:** medium — would have shipped a QR code that could not deep-link to a result.

F10 replaced the verification page with a footer modal and pointed `/verify-certificate` at a bare
`<Navigate to="/" replace />`. That is fine for a stale bookmark, but a printed QR code needs a URL
that lands *on the result*: the number is already known, and making someone retype it off the
certificate defeats the point of the code.

**Fixed:** `/verify-certificate?number=…` — the address printed in the footer and encoded in the QR
code — now forwards to `/?verify=…`, which the site footer picks up to open the modal with the
number already filled in and looked up. Closing it strips the parameter. A signed-in visitor
scanning their own certificate still gets the result rather than being bounced to the dashboard
(the landing route treats `?verify=` the same way it already treats `#courses`).

### F13 — A lookup started on mount never finished, under React StrictMode

**Severity:** medium — found while building F12; the modal sat on a disabled "Verify" button forever.

Arriving from a QR code runs the lookup without a click. Done as `useMutation` + `mutate()` in a
mount effect, the request returned `200` but the form stayed pending indefinitely:

```
[res 200] http://127.0.0.1:8000/api/v1/certificates/verify/CERT-BUZFBUOQRNWQ
input value: "CERT-BUZFBUOQRNWQ"
verify disabled: true
```

StrictMode runs mount effects twice — effect, cleanup, effect. React Query's observer detaches from
the in-flight mutation during that cleanup and does not re-attach, so the result is delivered to
nobody. It only reproduces in the browser; the same component passes in unit tests, which do not
render under StrictMode.

**Fixed:** verification is a `useQuery` keyed by the submitted number instead. Queries are
StrictMode-safe, the QR path needs no mount effect at all (the number just seeds the key), and
nothing is being changed by a lookup anyway.

### Worth knowing

- **`ext-gd` is not installed in this environment,** and dompdf needs it for every raster format.
  A PNG or JPEG dropped into the certificate fails silently — no error, just a missing image — and
  dompdf's CSS `background-image` path goes through GD too. All the artwork is therefore SVG, which
  dompdf draws through php-svg-lib, one of its own dependencies. Anything swapped in later (a real
  signature or seal) should be SVG, or GD must be enabled first.
- **php-svg-lib does not inherit presentation attributes from the root `<svg>`.** `fill="none"` set
  once on the `<svg>` is ignored, and every path fills solid — the graduation cap printed as a blob.
  Each path carries its own `fill="none"`; a test asserts this so it cannot regress silently.
- **dompdf paints positioned frames after in-flow content,** so the watermark punched pale holes
  through the text until it was given `z-index: -1`, which drops it back into the same painting pass
  as the content, where being first in the document puts it behind everything.
- **The printed verification URL comes from `FRONTEND_URL`** (override: `CERTIFICATE_WEBSITE`).
  It is baked into each PDF at render time and cannot be corrected afterwards without regenerating,
  so it must be right in production before any certificate is issued. The institution name and
  fallback signatory live alongside it in `config/certificates.php`.
