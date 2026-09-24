# Tasks

## 1. Seed the reviews table
Add a seeder that populates the `reviews` table with a reasonable number of sample records (realistic ratings/comments, varied data).

## 2. Fix evaluation timer (sticky positioning)
While a student is taking an evaluation, the countdown timer must stay fixed at the top of the viewport as they scroll through the questions. Currently it scrolls away with the page content.

## 3. End-to-end course testing (Backend Development course)

**Goal:** Go through the full student journey as a real user would, and log every point of friction or inconsistency — with evidence (screenshots, error messages, steps to reproduce). Skip anything that's genuinely fine; don't invent problems or over-engineer fixes for non-issues.

**Steps, in order:**

1. **Create a new student account.** Record the email and password used — I need these to log in and verify your work myself.
2. **Apply for the Backend Development course** using that account.
3. **Complete every module in the course, in order,** by working through all resources inside each module:
   - Documents → mark as read.
   - Video links → click to trigger completion.
   - Live classes → some dates may be in the past or too far in the future to test normally. Log in as the test admin (`admin@resnet.test` password: password) and adjust the relevant dates so you can complete these as a student.
   - Evaluations with manually-graded questions, and assignments → after submitting as the student, log in as the test admin and grade them so the module can be marked complete.
4. **Continue module-by-module until the final resource in the final module of the course is completed.**
5. **Throughout, keep a friction log:** anything confusing, broken, inconsistent, or blocking — with evidence for each. Only include real problems.

## 4. Fix: certificate stuck on "Generating" and unclickable

After all modules are completed, the course card shows "Generating certificate" but it's not clickable and the student can never access the certificate.

- Investigate the root cause (likely a backend job/queue not firing, a completion-status check that never flips, or a missing route/permission).
- Fix it so the certificate is generated and accessible as soon as all modules in the course are finished.

## Deliverables
- Reviews seeder in place.
- Timer fix in place (verified by scrolling through an evaluation).
- Friction/inconsistency log with evidence for the course-taking flow.
- Certificate bug root cause + fix, verified by actually generating and opening a certificate.
- The student account email + password used for testing, so I can log in and verify.
