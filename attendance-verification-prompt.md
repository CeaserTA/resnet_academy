# Task: Replace self-reported live session attendance with a signed join-link flow

## Context


Currently, students can self-mark a live session as "attended" via a button in the UI, with nothing stopping them from doing this without ever opening the session link. This task removes that self-report button and replaces it with a server-verified join flow: a student is only marked as having attended when they actually click through the LMS to join, and that action is what redirects them to the real Zoom/Meet URL.

This is Phase 1 of attendance tracking. A later phase will add provider-verified attendance (pulling participant duration from the Zoom/Meet APIs) — do not build that now, but design the schema so it can be added later without a breaking migration (see the `source` column below).

## Goal

1. Remove the existing student-facing "Mark as Attended" action entirely — no route, no controller method, no button.
2. Add an `attendances` table and model.
3. Add a `GET /sessions/{liveSession}/join` route (name: `sessions.join`) that:
   - Requires an authenticated student.
   - 403s if the student is not enrolled in the cohort that owns the session.
   - 403s if the current time is before the session's `starts_at`.
   - 403s if the current time is more than 30 minutes after the session's `ends_at` (adjust if the project already has a different grace-period convention — check for one before assuming).
   - Writes (or finds, if one already exists) an `attendances` row with `joined_at = now()` and `source = 'click'` for this student/session pair. Must not error or duplicate on repeat clicks (use `firstOrCreate` keyed on `live_session_id` + `student_id`).
   - Redirects (302, external redirect) to the session's stored join URL. The raw provider URL should never be rendered directly in the React frontend for students.
4. Update the React frontend: replace the "Mark as Attended" button with a plain link/button to `/sessions/{id}/join`. No client-side attendance state or API call — the anchor href (or a simple `window.location` handler) is enough.
5. Add an instructor-facing attendance list for a session (who has `joined_at` set, sorted earliest first) if no equivalent view already exists — check existing instructor session views first and extend rather than duplicate.

## Schema

Check whether `live_sessions` (or an equivalently named table) already exists with `cohort_id`/`module_id`, `starts_at`, `ends_at`, and an external join URL column, and reuse it — do not create a duplicate sessions table. If the join URL column is named something else (e.g. `meeting_link`), use the existing name throughout.

New table:

```php
Schema::create('attendances', function (Blueprint $table) {
    $table->id();
    $table->foreignId('live_session_id')->constrained()->cascadeOnDelete();
    $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
    $table->timestamp('joined_at');
    $table->string('source')->default('click'); // 'click' today; 'api' reserved for a future Zoom/Meet-verified phase — do not build that phase now
    $table->timestamps();

    $table->unique(['live_session_id', 'student_id']);
});
```

## Controller logic (adapt to existing conventions/naming in the codebase)

```php
public function join(LiveSession $liveSession)
{
    $student = auth()->user();

    abort_unless(
        $liveSession->cohort->students->contains($student->id),
        403
    );

    abort_if(now()->lt($liveSession->starts_at), 403, 'Session has not started yet.');
    abort_if(now()->gt($liveSession->ends_at->addMinutes(30)), 403, 'Session has ended.');

    Attendance::firstOrCreate(
        [
            'live_session_id' => $liveSession->id,
            'student_id' => $student->id,
        ],
        ['joined_at' => now(), 'source' => 'click']
    );

    return redirect()->away($liveSession->external_join_url); // use actual column name from existing schema
}
```

Match the enrollment check to however the codebase already checks cohort membership (e.g. an `enrollments` pivot) rather than assuming `$liveSession->cohort->students` — inspect the existing student/cohort relationship first.

## What to look for / confirm before writing code

- Locate and remove the existing self-report attendance route, controller method, and any related frontend component/button.
- Confirm the actual table/column names for live sessions, cohorts, and the student-cohort relationship, and adapt the above to match rather than assuming these exact names.
- Confirm whether there's an existing `Attendance` model/migration already (in case a stub exists) before creating a new one.
- Add tests: a student not enrolled gets 403; a student joining before `starts_at` gets 403; a student joining twice only produces one `attendances` row with the original `joined_at`; a successful join redirects to the correct external URL.

## Explicitly out of scope for this task

- Zoom/Google Meet API integration, webhooks, or participant-duration verification.
- Any change to how instructors create/schedule sessions or paste in join links.
- Any UI beyond replacing the mark-attended button with a join link and (if missing) a simple instructor attendance list.
