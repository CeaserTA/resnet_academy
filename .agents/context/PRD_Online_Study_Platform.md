# Product Requirements Document (PRD)
## Resnet LMS 

**Version:** 1.0 (Draft)
**Prepared for:** Development kickoff


---

## 1. Overview

The platform is an online learning system that allows an institution to publish courses, enrol students through an automated eligibility/verification process, deliver structured course content (modules → resources/assignments/evaluations and allow for creation of certificates after finishing a course), track learner progress with enforced sequential completion, and support communication between Admins, Instructors, and Students (including peer-to-peer forums).

This document organizes the flags gaps typically found in production LMS platforms (grounded in how Moodle, Canvas, and similar systems handle these problems), and provides an ERD and database schema to start development.

---

## 2. User Roles

| Role | Description |
|---|---|
| **Admin** | Manages the platform, courses, users, eligibility rules, and oversees enrolment/verification exceptions. |
| **Instructor** |teaches one or more courses, manages modules, resources, assignments, evaluations, grades submissions, and communicates with students. |
| **Student** | Browses/applies to courses, undergoes automated verification, consumes content, submits assignments/evaluations, tracks own progress, communicates with instructors/admin(through raising tickets)/peers. |


## 3. Functional Requirements.

### 3.1 Course Discovery & Enrolment
- FR-1: System displays a catalogue of available courses (with filters: category, level, schedule, instructor).
- FR-2: Students can apply/enrol into a course.
- FR-3: - FR-3: **(Simplified)** There is no automated eligibility/rule-checking engine. Every application is **automatically confirmed** — no pass/fail gate. Course-specific **prerequisites are informational only** (e.g., "Recommended: a laptop, basic computer literacy") and are displayed on the course page for the student to self-assess; they are not programmatically enforced.
- FR-4: Every confirmed applicant receives an **automated confirmation email**, sent on a **delayed schedule (1 day after application)**.
- FR-5: *(Removed — no rejection path exists since there's no eligibility gate. Revisit only if capacity-based waitlisting is added later, which is a separate concern from eligibility.)*

### 3.2 Course Structure
- FR-6: A course is broken into **Modules**.
- FR-7: Modules can be tied to specific **Groups/Cohorts** of students (i.e., not every student in a course necessarily shares identical module groupings — supports cohort-based or staggered delivery).
- FR-8: **Scheduled release rule**: if a course/module is scheduled to start in a specific week, students cannot access it before that week arrives.
- FR-9: **Sequential completion rule**: a student cannot proceed to the next module until the current one is marked complete.

### 3.3 Learning Resources
- FR-10: Modules contain learning resources. Client specifically mentioned **videos**.
-
  - Video (via bunny stream hosted)
  - Documents/slides (PDF, PPTX, DOCX)
  - Reading/text pages (rich text lessons)
  - External links
  - SCORM/xAPI packages (for interoperability with authoring tools like Articulate/Camtasia)
  - Live sessions (Zoom/Google Meet links + scheduling)
  - Downloadable files for offline use

### 3.4 Assessment
- FR-11: Students receive and submit **Assignments** (file upload/text submission, due dates, instructor grading + feedback).
- FR-12: **Evaluations** for students — interpreted as quizzes/tests/exams (auto-graded objective questions + manually graded subjective ones).

### 3.5 Progress Tracking
- FR-13: System tracks each student's progress per module/course (not started / in progress / completed).
- FR-14: Enforces the module-locking business rule described in FR-9.

### 3.6 Communication
- FR-15: Admin ↔ Instructor messaging.
- FR-16: Instructor ↔ Student messaging.
- FR-17: Admin ↔ Student messaging.
- FR-18: Student ↔ Student **forums** (discussion boards), likely scoped per course.
**Announcements** (one-to-many broadcast from Instructor/Admin to all enrolled students in a course) — distinct from 1:1 messaging and much simpler to implement/scan.

---

## 4. Core Business Rules. 

1. **Automated eligibility & verification** — no admin-in-the-loop for standard cases.
 **Bulk enrolment** by Admin (e.g., CSV import for a corporate/institutional client) — even though the primary path is automated self-enrolment, admins will eventually need an override/manual path for edge cases.
2. **Delayed confirmation email** — sent 1 day after verification/eligibility decision (not instantly) for a deliberate cooling-off period.   and make the 1 day delay  configurable per course.*
3. **Scheduled course/module access** — content is locked until the scheduled start week.
4. **Sequential module completion** — students must complete Module N before Module N+1 unlocks.
 **Payment/billing** — all courses are paid for and students will need to see the prices of courses before they apply for them. The systemwill need an order/payment entity even at MVP-scope decision time (affects the ERD now, but payment integration comes later).


### Content & Delivery
-
- **Course versioning** — when an instructor edits a live course, already-enrolled students see the  new version immediately although they can be informed of the changes made to the course
- **Content authoring** — will instructors upload raw video/PDF files, or do you need an in-browser lesson/quiz builder?
- **Accessibility (WCAG 2.1 AA)** — captions for video, screen-reader-friendly content.

 Assessment
-Plagiarism detection for assignment submissions.
- **Grading rubrics**, not just a single grade + comment.
- **Gradebook** — an aggregated view of all grades (assignments + evaluations) per student per course, with weighting toward a final grade.
- **Attempt limits & time limits** on evaluations, question randomization/question banks.
- **Late submission policy** (accept late with penalty). here is how the penalty works
Tiered/stepped deduction
Penalty increases in bands:
    0–24h late: -10%
    24–48h late: -25%
    48h+ late: -50%

### Progress & Analytics
- **Admin/Instructor analytics dashboard** — completion rates, at-risk student flags, engagement metrics.
- **Attendance tracking** if live sessions are part of a module.
- **Module completion definition (resolved):** "complete" is defined per resource type, and a module is complete once every *required* resource within it is complete:
  - **Video** — watched ≥ 90% (tracked via periodic watch-time pings, not just "clicked play").
  - **Document/slides** — a "Mark as read" button click (more reliable across devices than scroll-tracking).
  - **Reading/text lesson** — same as document: "Mark as read" button.
  - **External link** — marked "opened" on click; engagement off-platform isn't tracked.
  - **Assignment** — counts as done on *submission*, not on grading, so a slow-grading instructor doesn't block the whole class from progressing.
  - **Evaluation/quiz** — counts as done only when *passed* (score ≥ the evaluation's `pass_score`); retakes are allowed rather than lowering the bar.
  - **Live session** — attendance recorded, or a "Mark as attended" action.
  - Instructors can flag individual resources as optional (not required for module completion) so supplementary material doesn't block progression.
  - Deliberately avoids "time spent" as a completion signal — too easy to game (leaving a tab open) and not a meaningful proxy for understanding compared to an actual engagement action plus a competency check.


### Communication
- **Notifications system** (in-app + email + optionally push/SMS) beyond just the enrolment confirmation — e.g., assignment due soon, new grade posted, new forum reply, module unlocked.
- **Forum moderation** tools (report post, pin, lock thread search ) — important once real students start using them.
- **Read receipts / online presence** for direct messaging.

### Platform / Non-functional

- **Data privacy/compliance** (GDPR / local data protection law relevant to your target market, e.g. Uganda's Data Protection and Privacy Act is applicable applicable).
- **Audit logging** — who verified/enrolled a student, who changed a grade.
- 
- **Mobile responsiveness

---


## 9. Tech Stack 

| Layer | Options |
|---|---|
| Backend |Laravel —
| Database | mysql|
| Queue/Jobs | Redis + BullMQ (Node) / Celery (Python) / Laravel Queues — for the delayed-email and unlock-check jobs |
| File/Video storage | Cloud object storage (S3/Cloudflare R2) + a video CDN/service (Cloudflare Stream, Bunny.net, or Vimeo/YouTube embeds) rather than storing large video in your primary DB or server disk |
| Real-time (optional, for chat/forums) | WebSockets (Socket.io) or a managed service (Pusher, Ably) |
| Frontend | Reactjs 
| Email | Transactional email provider (SendGrid, Postmark, resend) for the automated confirmation and notification emails |


