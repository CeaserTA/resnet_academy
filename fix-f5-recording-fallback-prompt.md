# Task: Recording fallback for missed live sessions (F5 fix)

## Problem being fixed
Live session items are required for module completion, but a student who joins a cohort after a live session's date has passed has no way to ever complete that item — permanently blocking the module, the course, and the certificate. This should fall back to a recording instead.

## What to build

1. **Schema:** add a nullable `recording_url` field to the live session item (wherever live sessions are modeled).

2. **Attaching a recording:** let an admin or the instructor paste a link into that field after the session ends (Zoom cloud recording link, or the Google Drive link Google Meet auto-saves recordings to — both are just plain URLs). No file upload, no third-party API integration, no auto-fetching — just a link field they can set/edit. Reasonable place for this: wherever admins/instructors already manage the live session (session edit screen, or the admin cohort/course management area — use whatever's most consistent with how similar fields are managed already).

   **The link has to actually be viewable, not just present — build in a safeguard, don't just trust the paste:**
   - Show a short, explicit hint right next to the field, e.g. "Make sure sharing is set to 'Anyone with the link can view' (Google Drive) or the recording isn't password-protected / restricted to authenticated users (Zoom) — otherwise students won't be able to open it."
   - When the link is saved, do a basic reachability check server-side: fetch the URL and check whether the response looks like a login/access-request/permission-denied page rather than the actual recording (e.g. redirected to a Google accounts login, a Zoom passcode prompt, or a Drive "request access" page). This won't catch everything, but it catches the common mistake of pasting a restricted link.
   - If the check fails, warn the admin/instructor immediately in the UI when they save the link, rather than letting it silently go live and having a student discover it's broken.

3. **Completion rule:** a student can complete the live session item by:
   - joining live during the existing join-window, **or**
   - opening the recording link, once one is attached — same completion pattern as the existing video-resource item (open it → mark complete).

4. **Handling the "no recording yet" state:** if a student's join-window has passed and no `recording_url` is set yet, the item should show a clear "recording pending" state instead of silently blocking or showing an unhelpful error. It should become completable automatically as soon as the link is attached.

5. **Admin visibility:** give admins a way to see which past live sessions are missing a recording (e.g. a flag/filter in the admin session list), so this doesn't silently fall through the cracks.

## Testing
Test the full path end to end:
- A live session whose date has passed, with no recording attached — confirm the student sees "recording pending", not an error or a dead end.
- Admin/instructor pastes a Zoom or Drive link into `recording_url`.
- Test the reachability check with both a properly-shared link (should save cleanly) and a restricted/private link (should warn the admin at save time).
- The same student can now open the link and the item marks complete.
- The module/course completion flow (and certificate issuance, per the existing fix) still works correctly with a session completed this way.
- A student who joins during the actual live window can still complete it the original way — don't regress that path.

Log any friction or inconsistency you hit while testing this, with evidence, the same way as the last run — but only real issues, not stylistic nitpicks.
