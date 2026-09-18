# Task: Fix evaluation score visibility + investigate course/module progress tracking

## Context

 Students apply to **cohorts**, cohorts are broken into **modules**, modules contain **resources** (videos, documents, etc.), **assignments**, and **evaluations** (quizzes/tests). Some evaluation questions require manual instructor grading rather than being auto-scored.

This task has two independent issues. **Analyze the current implementation thoroughly before writing any code for either issue** — for Issue 2 in particular, produce a written summary of what you find before proposing changes.

---

## Issue 1: Don't show scores until instructor review is complete

### Current behavior
After a student attempts an evaluation, they immediately see a score, along with a note: "Some answers are still pending instructor grading — scores below may change." This exposes a partial/provisional score before manually-graded questions have been reviewed.

### Desired behavior
- If an evaluation contains any question requiring instructor review, the student should see **no score at all** until an instructor has graded every such question for their attempt.
- Instead of a partial score, show a status like "Review in progress — results will be available once your instructor has finished grading."
- Once all manually-graded questions on that attempt are reviewed, the full final score should display normally.
- Auto-graded evaluations (no manual-review questions) are unaffected — they should continue to show scores immediately.

### Required investigation
1. Find where evaluation scores are currently calculated and rendered (backend scoring logic + frontend result view).
2. Determine how the system currently distinguishes auto-graded vs. instructor-review questions, and how partial grading state is tracked (or if it isn't tracked at all — check for that).
3. **Check whether an instructor-facing interface already exists for reviewing/grading these manually-graded answers.** Look for existing routes, controllers, and views/components related to grading, review, or instructor evaluation.
4. **Check whether instructors/admins have an interface to see and access assignments students have submitted** (separate from evaluations, if assignments are a distinct feature in this codebase). Look for existing submission-inbox or assignment-review functionality.

### What to build
- Update the scoring/display logic per "Desired behavior" above.
- **If no instructor grading interface exists**, build one: a view where an instructor can see pending answers requiring review (per cohort/module/evaluation), grade each one, and where grading an answer updates the attempt's review status so the student's score can unlock once all pending items for that attempt are graded.
- **If no instructor/admin assignment submission interface exists**, build one: a view where instructors/admins can see submitted assignments (per cohort/module), open a student's submission, and grade/give feedback.
- If either interface already exists, extend/fix it rather than duplicating it — report what you found before deciding whether to build new or extend existing.

---

## Issue 2: Course/module progress tracking — investigate and report before fixing

### Symptom
As a student, opening modules and using resources (documents in particular) does not change a course's status away from "not started," no matter how much of the content has actually been used.

### Investigation requested — produce a written report covering:
1. **Full lifecycle**: what event marks a student's course status as `enrolled` → `started` → `finished`? Where in the code does each transition happen?
2. **Resource completion tracking**: how is a resource marked "completed"? Confirm which resource types currently support this (I believe video links do) and which don't (I believe documents don't — confirm).
3. **Module completion**: what conditions currently cause a module to flip from "not started" to "completed"? Is it tied to: all resources in the module being marked completed, the module's assignment being submitted, and the module's evaluation being completed? Confirm or correct this — find the actual logic, don't assume it matches this description.
4. **Module unlocking**: what determines when the *next* module unlocks? Confirm whether it depends on the previous module reaching "completed," and whether the missing document-completion tracking (see below) is the reason later modules stay locked.
5. **Certificate generation**: at what point in the flow is a completion certificate generated — course marked finished, all modules completed, something else?
6. **Review prompt**: at what point is a student prompted to leave a course review — same trigger as certificate generation, or a different one?

### Known bug to fix (after investigation)
Document-type resources never get marked as completed, even when a student has opened/viewed them, unlike video resources which do get marked completed. Since module completion (and therefore unlocking later modules) depends on all resources being marked completed, this bug blocks students from progressing regardless of how much they've actually read.

Determine the right completion signal for documents (e.g., viewed/opened, scrolled to end, opened for a minimum duration, or an explicit "mark as read" action — check if the codebase already has a convention for this on another resource type and reuse it rather than inventing a new pattern) and implement it so documents can reach a "completed" state and unblock module/course progression as designed.

### Deliverable order for Issue 2
1. First, the investigation report (lifecycle findings, current completion/unlock logic, confirmed root cause).
2. Then, once the root cause is confirmed, implement the document-completion fix and any correction to the course "started" status trigger if the investigation shows it's separately broken.

---

## General instructions
- Do not guess at table/column/route names — inspect the actual codebase for both issues before writing code.
- Keep Issue 1 and Issue 2 as separate, independently reviewable changes (separate commits/PRs if the workflow supports it).
- Flag anywhere the existing behavior differs from what's described above as "current behavior" or "I believe," since these are the reporter's understanding from the student-facing UI, not confirmed from the code.
