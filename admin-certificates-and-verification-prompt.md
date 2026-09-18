# Task: Admin certificate access + verify the public certificate-verification page

## Part 1 — Admin certificate access (admin-only)

Currently, once a certificate is auto-generated on course completion, admins have no way to see or manage it — there's no visibility if generation fails or gets stuck, and no way to help a student who reports an issue.

Build an admin-only certificates screen:

1. **List view:** every certificate — student, course/cohort, certificate number, status (`generating` / `ready` / `failed` — use whatever states already exist in the system), issue date, and a way to view/download it. Filterable/searchable by student, course/cohort, and status, so a support case can be resolved quickly.

2. **View/download:** reuse the existing `GET /api/v1/certificates/{id}/download` endpoint (already built as part of the certificate-generation fix) — just make it accessible to an authenticated admin viewing any student's certificate, not only the owning student.

3. **Manual regenerate:** for a certificate stuck in `generating` or `failed`, give the admin a button that re-triggers the existing `CertificateService::ensurePdf()` (the same idempotent method already used by the fix) rather than building new generation logic.

4. **Access control:** this whole screen and its endpoints must be admin-only. Confirm a non-admin (student/instructor) hitting these routes directly gets rejected, not just hidden from nav.

## Part 2 — Verify (and fix if needed) the public certificate-verification page

There's an existing public page where anyone can enter a certificate number to confirm it's genuine (for employers/third parties). Test it thoroughly:

- Enter a valid, existing certificate number — confirm it correctly shows a "valid" result with accurate details (student name, course/cohort, certificate number, issue date).
- Enter an invalid/made-up certificate number — confirm it clearly shows "not found/invalid," not an error or a false positive.
- Enter a certificate number belonging to a certificate that's still `generating`/not yet ready (if that state is reachable) — confirm it behaves sensibly rather than showing broken or misleading data.
- Confirm the page does **not** expose anything beyond what's needed to verify authenticity — no student email, phone, or other profile data. If it currently does, trim it down to: student name, course/cohort, certificate number, issue date, validity status.
- Check the page works without requiring login (it's meant to be public).

If any of the above is broken, fix it as part of this same piece of work — don't leave it for a separate pass.

## Testing
- As an admin: view the certificates list, filter it, open/download a certificate belonging to another student, and manually regenerate one that's stuck.
- As a non-admin: confirm the admin certificate routes correctly reject access.
- On the public verification page: run through the valid/invalid/in-progress cases above and confirm the response data is accurate and appropriately limited.
- Log any friction or inconsistency found, with evidence, same as previous runs — only real issues.
