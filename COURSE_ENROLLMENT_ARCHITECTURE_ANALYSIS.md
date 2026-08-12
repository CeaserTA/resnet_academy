# Course Enrollment Architecture Analysis

## Executive Summary

This document provides a complete analysis of the current course enrollment, application, and progress tracking architecture in the ResNet LMS. This is intended as input for architectural planning around section/cohort/batch-based course scheduling.

---

## 1. Database Schema Overview

### Core Tables & Relationships

#### **users**
- `id`, `role` (admin/instructor/student), `name`, `email`, `password_hash`
- `phone`, `avatar_url`, `status`, `email_verified_at`, `last_login_at`
- Profiles are stored directly in users table (no separate profile table)

#### **courses**
- `id`, `category_id`, `title`, `slug`, `description`, `level`, `status`
- `price`, `currency`, `thumbnail_url`, `prerequisites_text`
- **Enrolment policy**: `enrolment_policy` ENUM('open', 'advisory', 'application')
  - **open**: instant self-enrollment
  - **advisory**: student confirms prerequisites, instant enrollment
  - **application**: requires admin/instructor approval
- `confirmation_delay_hours`: configurable per course (default 24h) for delayed confirmation email
- **`schedule_start_date`**: DATE field - "Course-level start reference used to compute module week offsets"
- `current_version`: lightweight versioning via changelog

**Relationships:**
- `course_instructors` (many-to-many with users, has `is_primary` flag)
- `courses.created_by` → `users.id`

#### **course_applications** (separate from enrollments)
- `id`, `student_id`, `course_id`, `status` ('pending', 'approved', 'rejected')
- `answers` (JSON), `portfolio_url`, `alternative_proof_text`
- `reviewed_by`, `reviewed_at`, `recommended_course_ids` (JSON - set on rejection)
- `rejection_reason`, `dismissed_at`
- **No unique constraint** on (student_id, course_id) - students can reapply after rejection
- **Applications are NOT enrollments** - they exist in a separate table until approved

#### **enrolments** (only created when enrollment is confirmed)
- `id`, `student_id`, `course_id`
- `status` ENUM('confirmed', 'withdrawn') - **no 'pending' status**
- `source` ENUM('self', 'admin_bulk')
- `imported_by` (for admin bulk imports)
- `applied_at`, `confirmation_email_due_at`, `confirmation_email_sent_at`
- **Unique constraint** on (student_id, course_id)
- **Note**: No `updated_at` column - intentionally immutable except for status changes

#### **orders**
- `id`, `student_id`, `course_id`, `enrolment_id`
- `amount`, `amount_paid`, `currency`
- `status` ENUM('pending', 'partial', 'paid') - derived from amount vs amount_paid
- `payment_method`, `provider_ref`, `paid_at`
- **Order created immediately when enrollment is confirmed**, even if price is 0

#### **payment_submissions** (added post-MVP)
- `id`, `order_id`, `amount`, `receipt_path`, `receipt_original_name`
- `status` ENUM('pending', 'confirmed', 'rejected')
- `reviewed_by`, `reviewed_at`
- Students submit claimed payment + receipt image, admin confirms/rejects

---

### Groups & Cohorts (Currently Lightweight)

#### **groups_cohorts**
- `id`, `course_id`, `name`, `description`, `created_at`
- Purpose: Manual grouping of students within a course
- **No scheduling fields** - no start_date, end_date, or intake_date

#### **group_members**
- `group_id`, `student_id`, `added_at`
- Simple many-to-many between groups and students

**Current Use:**
- Groups are used for **module visibility scoping** (FR-7):
  - A module with no linked groups = applies to ALL students in course
  - A module with linked groups = only visible to students in those groups
- Groups do NOT affect enrollment, pricing, scheduling, or deadlines
- UI for groups was "dropped entirely" according to code comments

---

### Modules & Progress Tracking

#### **modules**
- `id`, `course_id`, `title`, `description`, `order_index`
- **`scheduled_start_at`**: DATETIME - when this module becomes available (can be NULL)
- Sequential unlocking controlled by `order_index`

#### **module_groups** (many-to-many)
- Links modules to groups for visibility scoping

#### **module_progress** (per-student tracking)
- `id`, `student_id`, `module_id`
- `status` ENUM('locked', 'not_started', 'in_progress', 'completed')
- `unlocked_at`, `completed_at`
- **No timestamps column** - intentionally lightweight

**Module Unlocking Logic (ProgressEngine):**
- A module unlocks when **BOTH** conditions are met:
  1. `scheduled_start_at` is NULL OR has passed
  2. Previous module (by `order_index`) is completed
- Evaluated on-demand (course view) and via scheduled job
- Idempotent - safe to call repeatedly

#### **module_items** (orders resources/assignments/evaluations within modules)
- `id`, `module_id`, `item_type` ENUM('resource', 'assignment', 'evaluation')
- `item_id` (polymorphic reference), `order_index`
- **`is_required`**: BOOLEAN - if FALSE, item doesn't block module completion

#### **resource_progress**, **assignment_submissions**, **evaluation_attempts**
- Per-student completion signals for each module item type
- Rolled up into `module_progress` by `ProgressEngine::rollupModuleCompletion()`
- Completion of last applicable module triggers certificate issuance

---

## 2. Enrollment Flow (Code Path)

### Flow A: Open Enrollment (enrolment_policy = 'open')

**Frontend:**
1. Student clicks "Enroll" button on `CourseDetailPage`
2. `handleEnrol()` checks policy, calls `enrol.mutateAsync(courseId)`
3. `useEnrol()` hook → `POST /api/v1/courses/:id/enrol`

**Backend:**
1. `EnrolmentController::enrol()`
2. → `EnrolmentService::enrol(student, course, source='self')`
3. Creates `enrolments` row with `status='confirmed'` immediately
4. Creates `orders` row (even if price is 0)
5. Queues `SendEnrolmentConfirmationEmail` job with delay = `course.confirmation_delay_hours`
6. Calls `ProgressEngine::evaluateCourseUnlocks(student, course)` to initialize module locks
7. Logs audit event: `enrolment.confirmed`

**Result:**
- Enrollment is **instant and confirmed**
- No approval needed
- Student can access course content immediately (subject to module locks)

---

### Flow B: Advisory Enrollment (enrolment_policy = 'advisory')

**Frontend:**
1. Student clicks "Enroll" → `handleEnrol()` opens `AdvisoryEnrolModal`
2. Modal shows prerequisites, student checks "I confirm" checkbox
3. Submits → same `POST /api/v1/courses/:id/enrol` endpoint

**Backend:**
- Identical to Flow A - **instant confirmation**
- Advisory is just a frontend confirmation UI, no backend difference

---

### Flow C: Application-Based Enrollment (enrolment_policy = 'application')

**Frontend:**
1. Student clicks "Apply" → `handleEnrol()` opens `ApplicationModal`
2. Student fills out:
   - Dynamic questions (from `course.application_questions` JSON)
   - Portfolio URL (if `course.application_require_portfolio_url`)
   - Alternative proof text (if `course.application_allow_alternative_proof`)
3. Submits → `POST /api/v1/course-applications`

**Backend:**
1. `CourseApplicationController::store()`
2. → `CourseApplicationService::apply(student, course, answers, portfolioUrl, alternativeProofText)`
3. Validates:
   - Course has `enrolment_policy='application'`
   - Student not already enrolled (`enrolments` table check)
   - Student doesn't have pending application already
4. Creates `course_applications` row with `status='pending'`
5. **NO `enrolments` row created yet**
6. Logs audit event: `course_application.submitted`

**Approval Flow:**
1. Admin or instructor views application in review queue
2. Calls `POST /api/v1/course-applications/:id/approve`
3. → `CourseApplicationService::approve(application, reviewer)`
4. Updates application: `status='approved'`, sets `reviewed_by` and `reviewed_at`
5. **Calls `EnrolmentService::enrol()`** with `source='self'`
6. **Now creates enrollment** - same flow as Open/Advisory from here
7. Sends notification to student: "Your application was approved"

**Rejection Flow:**
1. Admin/instructor rejects with optional `recommended_course_ids` and `rejection_reason`
2. Application stays in student's dashboard for 14 days (dismissable)
3. If student enrolls in a recommended course, rejected application auto-hides

---

## 3. Scheduling & Timing Concepts (Current State)

### What EXISTS Today:

#### 1. **Course-Level Schedule Start** (`courses.schedule_start_date`)
- Type: DATE (not DATETIME)
- Purpose: "Reference used to compute module week offsets"
- **Not enforced** - appears to be for display/planning purposes
- Does not block enrollment or access

#### 2. **Module-Level Scheduled Release** (`modules.scheduled_start_at`)
- Type: DATETIME
- Purpose: Time-gated module unlocking
- **IS enforced** by `ProgressEngine::evaluateCourseUnlocks()`
- Module only unlocks when:
  - `scheduled_start_at` is NULL OR has passed
  - AND previous module is completed
- Evaluated:
  - On-demand when student views course
  - Via scheduled command (architecture.md §5.2)

#### 3. **Confirmation Email Delay** (`courses.confirmation_delay_hours`)
- Default: 24 hours
- Configurable per course
- Enrollment confirmation email sent after this delay
- Does NOT affect access - student can start immediately

#### 4. **Assessment Availability Windows**
- `evaluations.available_from`, `evaluations.available_until` (DATETIME)
- `assignments.due_at` (DATETIME, with late submission logic)
- Per-assessment timing, not course-wide

### What DOES NOT Exist:

❌ **Course-level enrollment windows** (no `enrollment_start_date`, `enrollment_end_date`)  
❌ **Course-level active dates** (no `course_start_date`, `course_end_date`)  
❌ **Batch/cohort start dates** (groups have no scheduling fields)  
❌ **Intake dates** or enrollment cycles  
❌ **Capacity limits** (no `max_students` or waitlist)  
❌ **Section/batch-based deadlines** (deadlines are global or per-student)  
❌ **Scheduled course offerings** (no concept of "Spring 2024" vs "Fall 2024" runs)

---

## 4. Capacity & Waitlist Logic

**Current State:** ❌ **None**

- No `max_students` or capacity tracking
- No waitlist table or logic
- Enrollments are unlimited (subject only to payment and approval policy)
- Orders are always created even if course is "full" (concept doesn't exist)

**FR-5 Note from Schema:**
> "enrolments are auto-confirmed, no status other than 'confirmed' is needed (kept as enum for future waitlisting per FR-5 note)"

This indicates **waitlisting was considered but not implemented**.

---

## 5. Progress & Completion Tracking

### Current Model: **Individual, Self-Paced Progress**

#### Per-Student Tracking:
- Each student has their own `module_progress` rows
- Modules unlock sequentially based on:
  - Student's own completion of previous module
  - Course-level `scheduled_start_at` (if set)
- **No shared pace** - students move through modules independently

#### Module Completion:
- Module completes when all **required** module items are complete:
  - Resources: watched 90% (video), marked read (doc/reading), marked opened (link)
  - Assignments: submission exists (grading not required for completion)
  - Evaluations: passed attempt exists (score >= `pass_score`)
- Optional items (`module_items.is_required=false`) don't block completion

#### Course Completion:
- When student completes last applicable module (accounting for group scoping)
- Triggers certificate issuance via `CertificateService::issueForCourseCompletion()`

#### Deadlines:
- **No course-wide or module-wide deadlines**
- Only per-assignment `due_at` (with late penalty logic)
- No enforcement of "you must complete by X date"

---

## 6. Student Grouping/Batching

### Current Implementation: **Manual, Visibility-Based Grouping**

#### What Groups Do:
1. **Module Visibility Scoping** (FR-7):
   - Module with no groups → visible to ALL enrolled students
   - Module with groups → only visible to students in those groups
2. **Used in progress calculations**:
   - `ProgressEngine::applicableModules()` filters by group membership
   - A student's "last module" for certificate issuance considers only applicable modules

#### What Groups DON'T Do:
- ❌ No scheduling (no start/end dates)
- ❌ No capacity limits
- ❌ No pricing variations
- ❌ No separate instructor assignments (instructors are course-level)
- ❌ No batch-specific deadlines
- ❌ No cohort-based forums (forums are course-scoped)

#### UI Status:
- "Groups were dropped from the UI entirely" (per `CourseBuilderPage.tsx` comments)
- Groups exist in database but are not actively managed in current UI

---

## 7. Key Design Decisions & Constraints

### 1. **Applications ≠ Enrollments**
- Separate tables: `course_applications` (pending) vs `enrolments` (confirmed)
- No `enrolments` row exists until application is approved
- This keeps all access-gate checks simple: `WHERE status='confirmed'`

### 2. **Orders Always Created**
- Even for free courses (`price=0`)
- Even if payment not required yet
- Order tracks lifecycle: pending → partial → paid

### 3. **Sequential Module Unlocking**
- Enforced by `order_index` + previous module completion
- Cannot skip ahead
- Optional items don't block progression

### 4. **Self-Paced by Default**
- No concept of "class sessions" or synchronous cohorts
- Students progress at their own speed
- `scheduled_start_at` provides optional time-gating, but no end dates

### 5. **No Eligibility Engine**
- Prerequisites are informational text only
- Advisory policy uses checkbox confirmation (frontend only)
- No programmatic enforcement of prerequisites

### 6. **Lightweight Versioning**
- New course version is visible immediately to all enrolled students
- Changelog records changes, no content snapshots
- Students notified of changes via `course_change_logs`

---

## 8. Relevant Code Paths

### Enrollment Services:
- `app/Services/Enrolment/EnrolmentService.php` - Creates enrollment, order, queues confirmation email
- `app/Services/Enrolment/CourseApplicationService.php` - Handles application lifecycle, delegates to EnrolmentService on approval

### Progress Engine:
- `app/Services/Progress/ProgressEngine.php` - Owns all module unlock/completion logic
- `evaluateCourseUnlocks()` - Called on enrollment and periodically
- `rollupModuleCompletion()` - Called when resource/assignment/evaluation completes

### Controllers:
- `app/Http/Controllers/Api/V1/EnrolmentController.php` - `/courses/:id/enrol` endpoint
- `app/Http/Controllers/Api/V1/CourseApplicationController.php` - Application CRUD

### Frontend:
- `frontend/src/features/catalogue/CourseDetailPage.tsx` - Enrollment CTA and policy routing
- `frontend/src/features/catalogue/ApplicationModal.tsx` - Application form
- `frontend/src/features/catalogue/AdvisoryEnrolModal.tsx` - Advisory confirmation

---

## 9. Architectural Gaps for Section/Cohort/Batch Model

If planning to add **scheduled course sections** (e.g., "Spring 2024 cohort starts March 1"), the following are missing:

### Database:
- ❌ `course_sections` or `course_runs` table (distinct offerings of same course)
- ❌ Section start/end dates
- ❌ Capacity per section
- ❌ Waitlist per section
- ❌ Enrollment tied to specific section (currently just `course_id`)

### Logic:
- ❌ Module deadlines relative to section start (currently `scheduled_start_at` is absolute datetime)
- ❌ Assignment due dates relative to section pace
- ❌ Section-based analytics
- ❌ Cross-section instructor view (instructors currently see all course enrollments)

### UI:
- ❌ Section selection during enrollment
- ❌ "Available sections" listing
- ❌ Section-specific announcements
- ❌ Cohort/batch dashboard for students

---

## 10. Data Flow Diagrams

### Current Enrollment Flow:
```
Student → CourseDetailPage
  ↓
  Check enrolment_policy
  ↓
  ├─ open/advisory → POST /courses/:id/enrol
  │                  ↓
  │                  EnrolmentService::enrol()
  │                  ↓
  │                  ├─ Create enrolments row (status=confirmed)
  │                  ├─ Create orders row
  │                  ├─ Queue confirmation email
  │                  └─ Initialize module_progress rows
  │
  └─ application → POST /course-applications
                   ↓
                   CourseApplicationService::apply()
                   ↓
                   Create course_applications row (status=pending)
                   ↓
                   [Wait for admin approval]
                   ↓
                   CourseApplicationService::approve()
                   ↓
                   Call EnrolmentService::enrol()
                   ↓
                   Same flow as open/advisory
```

### Current Progress Flow:
```
Student accesses course
  ↓
  ProgressEngine::evaluateCourseUnlocks()
  ↓
  For each module (in order_index):
    ├─ Check scheduled_start_at passed?
    ├─ Check previous module completed?
    └─ If both true → unlock (status=not_started)
  ↓
Student completes resource/assignment/evaluation
  ↓
  ProgressEngine::rollupModuleCompletion()
  ↓
  Check all required items in module complete?
  ↓
  If yes → module.status=completed
  ↓
  Call evaluateCourseUnlocks() to unlock next
  ↓
  If last module → Issue certificate
```

---

## 11. Summary for Architecture Planning

### Current State:
- **Individual, self-paced enrollment** with no batch/cohort scheduling
- **Three enrollment policies**: open (instant), advisory (instant with confirmation), application (approval-gated)
- **Sequential module unlocking** with optional time-gating (`scheduled_start_at`)
- **Groups exist** but are minimal (visibility scoping only, no UI, no scheduling)
- **No capacity limits**, no waitlists, no enrollment windows
- **No section/batch/cohort concept** for scheduling or pacing
- **No shared deadlines** (only per-assignment due dates with late penalties)

### If Adding Sections/Batches:
You'll need to:
1. Add `course_sections` table (section start/end, capacity, instructor assignments)
2. Change `enrolments.course_id` to `enrolments.section_id`
3. Make module/assignment deadlines section-relative
4. Add section selection to enrollment flow
5. Update progress engine to respect section boundaries
6. Add capacity/waitlist logic
7. Update analytics to be section-aware
8. Decide: can students switch sections? Can instructor teach multiple sections?

---

**Document Generated:** For architectural planning regarding section/batch-based course scheduling  
**Date:** 2024  
**Based on:** ResNet LMS codebase analysis
