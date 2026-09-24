# Task: Enforce cohort/course/module date relationships + access timing

## Problem
1. A student who applies for a course tied to a cohort gets full access to the course dashboard and can start modules immediately — even when the cohort's start date is far in the future. Access isn't gated by the cohort's actual start date.
2. There's currently no enforcement tying dated items (live sessions, assignment/evaluation deadlines, etc.) under a course to the cohort's date range — a resource can be scheduled outside the cohort's period entirely.

## Step 1 — Analyze first, before changing anything
Investigate and document the current implementation:
- The actual relationship between cohorts and courses: is a course tied to exactly one cohort, or can the same course be reused/run under multiple cohorts (e.g. a course template that repeats each intake)? This determines where date constraints can even live.
- Every place a date currently exists in this hierarchy: cohort (start/end?), course (does it have its own dates, and are they used?), module, and individual resource types — especially live sessions (`scheduled_at`) and anything with a due date (assignments, evaluations).
- How access is currently granted on course application — what determines that a student can immediately open module content today (i.e. what's missing that should be checking the cohort's start date).

Summarize findings briefly before implementing, since the fix design depends on the answer to the cardinality question above.

## Step 2 — Design the enforcement (adjust based on Step 1 findings)

**Access timing:** enrollment/application should still succeed immediately (a student can apply and reserve a seat before a cohort starts — that shouldn't change). What should change is content access: module content should stay locked/inaccessible until the cohort's actual start date arrives. The dashboard should clearly show the course as upcoming (e.g. "Starts [date]") rather than silently blocking with no explanation.

**Date containment:** any dated item under a course belonging to a cohort — live session `scheduled_at`, assignment/evaluation due dates, and course-level dates if they exist — must fall within that cohort's start/end range. Enforce this as validation at creation/edit time (admin can't save a date outside the cohort's range), not just as a display-layer assumption.

If Step 1 reveals a course can belong to multiple cohorts, adapt this so date constraints are validated against the specific cohort instance a resource belongs to, not the course generically — flag this clearly if it changes the data model meaningfully rather than silently working around it.

## Step 3 — Implement
- Add the content-access gate based on cohort start date.
- Add date-range validation for dated items under a course, against their cohort's range.
- Clear, honest messaging to the student for the "not started yet" state — no dead ends or unexplained blocks.

## Testing
- Apply for a course under a cohort whose start date is in the future — confirm enrollment succeeds but module content is locked with a clear "starts on [date]" state, not silently inaccessible.
- Once the cohort's start date arrives (adjust as test admin if needed, same as prior testing), confirm content unlocks normally.
- Attempt to create/edit a live session, assignment, or evaluation with a date outside its cohort's range — confirm it's rejected with a clear validation message, not silently saved.
- Confirm a course/cohort with correctly-contained dates continues to work exactly as before — no regression for the normal case.
- Log any friction or inconsistency found, with evidence — only real issues.
