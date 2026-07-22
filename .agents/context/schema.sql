-- =====================================================================
-- Resnet LMS — Database Schema (MySQL 8.0+, InnoDB, utf8mb4)
-- Generated from PRD v1.0 (Draft)
-- =====================================================================
-- Notes on design decisions tied to the PRD:
--  * FR-3: no eligibility engine -> enrolments are auto-confirmed, no
--    status other than 'confirmed' is needed (kept as enum for future
--    waitlisting per FR-5 note).
--  * FR-4: confirmation email delay is configurable PER COURSE
--    (courses.confirmation_delay_hours).
--  * FR-8/FR-9: scheduled release + sequential completion handled via
--    modules.scheduled_start_at and module_progress.status/unlocked_at.
--  * Module completion is defined per resource/assignment/evaluation
--    type (see "Module completion definition" in PRD) -> tracked in
--    resource_progress / assignment_submissions / evaluation_attempts,
--    rolled up into module_progress.
--  * Course versioning is changelog-style (new version visible
--    immediately, students just get notified) -> course_change_logs,
--    not full content snapshots.
--  * Payments: order/payment entity included now per PRD instruction,
--    provider integration deferred.
--  * Messaging: Admin<->Instructor, Instructor<->Student, Admin<->Student
--    modeled as one generic conversations/messages system (all three
--    are just users with different roles). Student support requests are
--    modeled separately as tickets. Forums are course-scoped, separate
--    from 1:1 messaging. Announcements are a separate broadcast entity.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 1. USERS & ROLES
-- =====================================================================

CREATE TABLE users (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role                ENUM('admin','instructor','student') NOT NULL,
    name                VARCHAR(150) NOT NULL,
    email               VARCHAR(191) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    phone               VARCHAR(30) NULL,
    avatar_url          VARCHAR(500) NULL,
    status              ENUM('active','suspended','deactivated') NOT NULL DEFAULT 'active',
    email_verified_at   DATETIME NULL,
    last_login_at       DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_role (role)
) ENGINE=InnoDB;

-- Linked Google logins (architecture.md §4) — primary login stays email+password;
-- Google is a linked, non-primary method matched to an existing user by verified email.
CREATE TABLE oauth_accounts (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT UNSIGNED NOT NULL,
    provider            ENUM('google') NOT NULL,
    provider_user_id    VARCHAR(191) NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_oauth_provider_user (provider, provider_user_id),
    KEY idx_oauth_accounts_user (user_id),
    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 2. COURSE CATALOGUE
-- =====================================================================

CREATE TABLE categories (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    slug        VARCHAR(140) NOT NULL,
    parent_id   BIGINT UNSIGNED NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_categories_slug (slug),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE courses (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id                 BIGINT UNSIGNED NULL,
    title                       VARCHAR(200) NOT NULL,
    slug                        VARCHAR(220) NOT NULL,
    description                 TEXT NULL,
    level                       ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
    thumbnail_url               VARCHAR(500) NULL,
    prerequisites_text          TEXT NULL COMMENT 'Informational only, per FR-3 — not programmatically enforced',
    price                       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency                    CHAR(3) NOT NULL DEFAULT 'UGX',
    status                      ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
    current_version             INT UNSIGNED NOT NULL DEFAULT 1,
    confirmation_delay_hours    INT UNSIGNED NOT NULL DEFAULT 24 COMMENT 'FR-4: configurable per course, default 1 day',
    schedule_start_date         DATE NULL COMMENT 'Course-level start reference used to compute module week offsets',
    created_by                  BIGINT UNSIGNED NOT NULL COMMENT 'Admin/instructor who created it',
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_courses_slug (slug),
    KEY idx_courses_status (status),
    CONSTRAINT fk_courses_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_courses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- A course can have a primary instructor + optional co-instructors
CREATE TABLE course_instructors (
    course_id       BIGINT UNSIGNED NOT NULL,
    instructor_id   BIGINT UNSIGNED NOT NULL,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (course_id, instructor_id),
    CONSTRAINT fk_ci_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_ci_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Lightweight versioning: changelog rather than full snapshots
-- (new version is visible immediately to enrolled students; they are notified)
CREATE TABLE course_change_logs (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id       BIGINT UNSIGNED NOT NULL,
    version_number  INT UNSIGNED NOT NULL,
    changed_by      BIGINT UNSIGNED NOT NULL,
    change_summary  TEXT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ccl_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_ccl_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;


-- 3. ENROLMENT 


CREATE TABLE enrolments (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id                  BIGINT UNSIGNED NOT NULL,
    course_id                   BIGINT UNSIGNED NOT NULL,
    status                      ENUM('confirmed','withdrawn') NOT NULL DEFAULT 'confirmed' COMMENT 'No pass/fail gate per FR-3; withdrawn kept for admin-side removal',
    source                      ENUM('self','admin_bulk') NOT NULL DEFAULT 'self',
    imported_by                 BIGINT UNSIGNED NULL COMMENT 'Admin who ran the bulk/CSV import, if applicable',
    applied_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmation_email_due_at   DATETIME NOT NULL COMMENT 'applied_at + course.confirmation_delay_hours',
    confirmation_email_sent_at  DATETIME NULL,
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_enrolment_student_course (student_id, course_id),
    KEY idx_enrolments_course (course_id),
    CONSTRAINT fk_enrol_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrol_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_enrol_imported_by FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Orders/payment (entity now, provider integration later)
CREATE TABLE orders (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,
    course_id       BIGINT UNSIGNED NOT NULL,
    enrolment_id    BIGINT UNSIGNED NULL,
    amount          DECIMAL(10,2) NOT NULL COMMENT 'Total owed',
    -- Added post-MVP for partial-payment tracking. `status` is derived server-side from
    -- comparing amount_paid to amount (Admin\OrderController::update()), never set directly.
    amount_paid     DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Paid so far; remaining balance = amount - amount_paid',
    currency        CHAR(3) NOT NULL DEFAULT 'UGX',
    status          ENUM('pending','partial','paid') NOT NULL DEFAULT 'pending',
    payment_method  VARCHAR(50) NULL,
    provider_ref    VARCHAR(150) NULL COMMENT 'External gateway transaction reference',
    paid_at         DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_orders_student (student_id),
    KEY idx_orders_course (course_id),
    CONSTRAINT fk_orders_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_orders_enrolment FOREIGN KEY (enrolment_id) REFERENCES enrolments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Added post-MVP: a student submits a claimed amount + a receipt image against their own order;
-- it sits `pending` until an admin confirms (applies it to orders.amount_paid, re-derives
-- orders.status) or rejects it (order untouched, student may resubmit).
CREATE TABLE payment_submissions (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id                BIGINT UNSIGNED NOT NULL,
    amount                  DECIMAL(10,2) NOT NULL,
    receipt_path            VARCHAR(255) NOT NULL,
    receipt_original_name   VARCHAR(255) NULL,
    status                  ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by             BIGINT UNSIGNED NULL,
    reviewed_at             DATETIME NULL,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NULL,
    KEY idx_payment_submissions_order (order_id),
    CONSTRAINT fk_payment_submission_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_submission_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 4. GROUPS / COHORTS
-- =====================================================================

CREATE TABLE groups_cohorts (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_group_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE group_members (
    group_id    BIGINT UNSIGNED NOT NULL,
    student_id  BIGINT UNSIGNED NOT NULL,
    added_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, student_id),
    CONSTRAINT fk_gm_group FOREIGN KEY (group_id) REFERENCES groups_cohorts(id) ON DELETE CASCADE,
    CONSTRAINT fk_gm_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 5. MODULES (FR-6..FR-9)
-- =====================================================================

CREATE TABLE modules (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id           BIGINT UNSIGNED NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT NULL,
    order_index         INT UNSIGNED NOT NULL COMMENT 'Defines sequential order for FR-9 locking',
    scheduled_start_at  DATETIME NULL COMMENT 'FR-8: null = available as soon as sequentially unlocked',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_modules_course_order (course_id, order_index),
    CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- If a module has no rows here, it applies to every student in the course (FR-7)
CREATE TABLE module_groups (
    module_id   BIGINT UNSIGNED NOT NULL,
    group_id    BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (module_id, group_id),
    CONSTRAINT fk_mg_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_mg_group FOREIGN KEY (group_id) REFERENCES groups_cohorts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 6. RESOURCES (FR-10) — type-specific detail tables keep each
--    resource type's fields normalized instead of one wide nullable table
-- =====================================================================

CREATE TABLE resources (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id   BIGINT UNSIGNED NOT NULL,
    type        ENUM('video','document','reading','external_link','scorm','live_session','downloadable_file') NOT NULL,
    title       VARCHAR(200) NOT NULL,
    description TEXT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_resources_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE resource_videos (
    resource_id         BIGINT UNSIGNED PRIMARY KEY,
    bunny_stream_video_id VARCHAR(150) NOT NULL,
    duration_seconds    INT UNSIGNED NULL,
    caption_url         VARCHAR(500) NULL COMMENT 'WCAG 2.1 AA captions',
    CONSTRAINT fk_rv_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE resource_documents (
    resource_id BIGINT UNSIGNED PRIMARY KEY,
    file_url    VARCHAR(500) NOT NULL,
    file_type   ENUM('pdf','pptx','docx') NOT NULL,
    file_size_kb INT UNSIGNED NULL,
    CONSTRAINT fk_rd_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE resource_readings (
    resource_id  BIGINT UNSIGNED PRIMARY KEY,
    content_html MEDIUMTEXT NOT NULL,
    CONSTRAINT fk_rr_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE resource_external_links (
    resource_id BIGINT UNSIGNED PRIMARY KEY,
    url         VARCHAR(500) NOT NULL,
    CONSTRAINT fk_rel_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE resource_scorm_packages (
    resource_id BIGINT UNSIGNED PRIMARY KEY,
    package_url VARCHAR(500) NOT NULL,
    standard    ENUM('scorm_1_2','scorm_2004','xapi') NOT NULL,
    CONSTRAINT fk_rsp_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE resource_live_sessions (
    resource_id     BIGINT UNSIGNED PRIMARY KEY,
    provider        ENUM('zoom','google_meet') NOT NULL,
    meeting_url     VARCHAR(500) NOT NULL,
    scheduled_at    DATETIME NOT NULL,
    duration_minutes INT UNSIGNED NOT NULL,
    CONSTRAINT fk_rls_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE resource_downloadable_files (
    resource_id BIGINT UNSIGNED PRIMARY KEY,
    file_url    VARCHAR(500) NOT NULL,
    file_size_kb INT UNSIGNED NULL,
    CONSTRAINT fk_rdf_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE live_session_attendance (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resource_id BIGINT UNSIGNED NOT NULL,
    student_id  BIGINT UNSIGNED NOT NULL,
    attended    BOOLEAN NOT NULL DEFAULT FALSE,
    marked_at   DATETIME NULL,
    marked_by   BIGINT UNSIGNED NULL COMMENT 'Instructor if manually marked; null if auto-tracked',
    UNIQUE KEY uq_attendance (resource_id, student_id),
    CONSTRAINT fk_lsa_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    CONSTRAINT fk_lsa_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_lsa_marked_by FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 7. ASSIGNMENTS
-- =====================================================================

CREATE TABLE late_penalty_policies (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL DEFAULT 'Standard tiered penalty',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tiered/stepped deduction bands, e.g. 0-24h -10%, 24-48h -25%, 48h+ -50%
CREATE TABLE late_penalty_tiers (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    policy_id           BIGINT UNSIGNED NOT NULL,
    hours_late_from     INT UNSIGNED NOT NULL,
    hours_late_to       INT UNSIGNED NULL COMMENT 'NULL = unbounded (e.g. 48h+)',
    penalty_percent     DECIMAL(5,2) NOT NULL,
    CONSTRAINT fk_lpt_policy FOREIGN KEY (policy_id) REFERENCES late_penalty_policies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE assignments (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id           BIGINT UNSIGNED NOT NULL,
    title               VARCHAR(200) NOT NULL,
    instructions         TEXT NULL,
    submission_type      ENUM('file','text','both') NOT NULL DEFAULT 'both',
    due_at               DATETIME NULL,
    allow_late           BOOLEAN NOT NULL DEFAULT TRUE,
    late_penalty_policy_id BIGINT UNSIGNED NULL,
    max_score             DECIMAL(6,2) NOT NULL DEFAULT 100.00,
    plagiarism_check_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignments_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
    CONSTRAINT fk_assignments_policy FOREIGN KEY (late_penalty_policy_id) REFERENCES late_penalty_policies(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE assignment_rubrics (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assignment_id   BIGINT UNSIGNED NOT NULL,
    criterion       VARCHAR(200) NOT NULL,
    max_points      DECIMAL(6,2) NOT NULL,
    order_index     INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT fk_rubric_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE assignment_submissions (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    assignment_id       BIGINT UNSIGNED NOT NULL,
    student_id          BIGINT UNSIGNED NOT NULL,
    attempt_number      INT UNSIGNED NOT NULL DEFAULT 1,
    file_url            VARCHAR(500) NULL,
    text_content         MEDIUMTEXT NULL,
    submitted_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_late              BOOLEAN NOT NULL DEFAULT FALSE,
    late_penalty_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status                ENUM('submitted','graded') NOT NULL DEFAULT 'submitted' COMMENT 'Module completion counts on submitted, not graded',
    raw_score             DECIMAL(6,2) NULL,
    final_score           DECIMAL(6,2) NULL COMMENT 'raw_score after late penalty applied',
    feedback               TEXT NULL,
    graded_by              BIGINT UNSIGNED NULL,
    graded_at               DATETIME NULL,
    KEY idx_submissions_student (student_id),
    CONSTRAINT fk_submission_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_submission_graded_by FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE assignment_submission_rubric_scores (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    submission_id   BIGINT UNSIGNED NOT NULL,
    rubric_id       BIGINT UNSIGNED NOT NULL,
    score           DECIMAL(6,2) NOT NULL,
    comment         TEXT NULL,
    UNIQUE KEY uq_submission_rubric (submission_id, rubric_id),
    CONSTRAINT fk_ssr_submission FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ssr_rubric FOREIGN KEY (rubric_id) REFERENCES assignment_rubrics(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE plagiarism_reports (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    submission_id   BIGINT UNSIGNED NOT NULL,
    similarity_score DECIMAL(5,2) NULL,
    report_url       VARCHAR(500) NULL,
    checked_at        DATETIME NULL,
    CONSTRAINT fk_plagiarism_submission FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 8. EVALUATIONS (quizzes/tests/exams)
-- =====================================================================

CREATE TABLE question_banks (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qb_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE questions (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_bank_id    BIGINT UNSIGNED NOT NULL,
    type                 ENUM('mcq_single','mcq_multi','true_false','short_answer','essay') NOT NULL,
    question_text         TEXT NOT NULL,
    points                 DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    auto_gradable          BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'FALSE for short_answer/essay needing manual grading',
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_questions_bank FOREIGN KEY (question_bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE question_options (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    question_id BIGINT UNSIGNED NOT NULL,
    option_text VARCHAR(500) NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT fk_qo_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluations (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id           BIGINT UNSIGNED NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT NULL,
    pass_score          DECIMAL(5,2) NOT NULL COMMENT 'Percent required to count module item as complete',
    max_attempts        INT UNSIGNED NULL COMMENT 'NULL = unlimited retakes',
    time_limit_minutes  INT UNSIGNED NULL,
    randomize_questions BOOLEAN NOT NULL DEFAULT FALSE,
    questions_per_attempt INT UNSIGNED NULL COMMENT 'For question-bank pull; NULL = use all linked questions',
    available_from       DATETIME NULL,
    available_until       DATETIME NULL,
    created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_evaluations_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_questions (
    evaluation_id   BIGINT UNSIGNED NOT NULL,
    question_id     BIGINT UNSIGNED NOT NULL,
    order_index     INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (evaluation_id, question_id),
    CONSTRAINT fk_eq_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
    CONSTRAINT fk_eq_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_attempts (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    evaluation_id   BIGINT UNSIGNED NOT NULL,
    student_id      BIGINT UNSIGNED NOT NULL,
    attempt_number  INT UNSIGNED NOT NULL DEFAULT 1,
    started_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at    DATETIME NULL,
    score_percent   DECIMAL(5,2) NULL,
    passed          BOOLEAN NULL COMMENT 'score_percent >= evaluation.pass_score; module item completes only when TRUE',
    status          ENUM('in_progress','submitted','graded') NOT NULL DEFAULT 'in_progress',
    KEY idx_attempts_student (student_id),
    CONSTRAINT fk_attempt_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
    CONSTRAINT fk_attempt_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_attempt_answers (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    attempt_id           BIGINT UNSIGNED NOT NULL,
    question_id           BIGINT UNSIGNED NOT NULL,
    selected_option_ids    JSON NULL COMMENT 'Array of question_options.id for mcq types',
    answer_text             TEXT NULL COMMENT 'For short_answer/essay',
    is_correct               BOOLEAN NULL COMMENT 'NULL until graded for manual types',
    points_awarded            DECIMAL(6,2) NULL,
    graded_by                  BIGINT UNSIGNED NULL,
    graded_at                    DATETIME NULL,
    CONSTRAINT fk_eaa_attempt FOREIGN KEY (attempt_id) REFERENCES evaluation_attempts(id) ON DELETE CASCADE,
    CONSTRAINT fk_eaa_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_eaa_graded_by FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================================================================
-- 9. MODULE ITEMS — orders & flags resources/assignments/evaluations
--    within a module (is_required lives here so it's uniform across
--    all three item types, per the "optional resource" rule)
-- =====================================================================

CREATE TABLE module_items (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    module_id   BIGINT UNSIGNED NOT NULL,
    item_type   ENUM('resource','assignment','evaluation') NOT NULL,
    item_id     BIGINT UNSIGNED NOT NULL COMMENT 'FK into resources/assignments/evaluations depending on item_type',
    order_index INT UNSIGNED NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'FALSE = optional supplementary material, does not block module completion',
    UNIQUE KEY uq_module_item (item_type, item_id),
    KEY idx_module_items_module (module_id, order_index),
    CONSTRAINT fk_mi_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 10. PROGRESS TRACKING (FR-13, FR-14, module completion definition)
-- =====================================================================

-- Per-resource completion signal (video %, mark-as-read, link opened)
CREATE TABLE resource_progress (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,
    resource_id     BIGINT UNSIGNED NOT NULL,
    status          ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
    watch_percent   DECIMAL(5,2) NULL COMMENT 'Video: completed at >= 90',
    marked_read_at  DATETIME NULL COMMENT 'Document/reading: "Mark as read" click',
    opened_at       DATETIME NULL COMMENT 'External link: marked opened on click',
    completed_at    DATETIME NULL,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_resource_progress (student_id, resource_id),
    CONSTRAINT fk_rp_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Periodic watch-time pings feeding resource_progress.watch_percent
CREATE TABLE video_watch_pings (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id  BIGINT UNSIGNED NOT NULL,
    resource_id BIGINT UNSIGNED NOT NULL,
    position_seconds INT UNSIGNED NOT NULL,
    pinged_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_pings_student_resource (student_id, resource_id),
    CONSTRAINT fk_vwp_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_vwp_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Rolled-up module status per student (FR-13/FR-14)
CREATE TABLE module_progress (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,
    module_id       BIGINT UNSIGNED NOT NULL,
    status          ENUM('locked','not_started','in_progress','completed') NOT NULL DEFAULT 'locked',
    unlocked_at     DATETIME NULL COMMENT 'When scheduled_start_at passed AND previous module completed',
    completed_at    DATETIME NULL,
    UNIQUE KEY uq_module_progress (student_id, module_id),
    CONSTRAINT fk_mp_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mp_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 11. CERTIFICATES
-- =====================================================================

CREATE TABLE certificates (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id          BIGINT UNSIGNED NOT NULL,
    course_id           BIGINT UNSIGNED NOT NULL,
    certificate_number  VARCHAR(60) NOT NULL,
    certificate_url     VARCHAR(500) NULL,
    issued_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_certificate_number (certificate_number),
    UNIQUE KEY uq_certificate_student_course (student_id, course_id),
    CONSTRAINT fk_cert_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_cert_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 12. COMMUNICATION
-- =====================================================================

-- Generic 1:1 / small-group messaging, covers Admin<->Instructor,
-- Instructor<->Student, Admin<->Student (FR-15/16/17)
CREATE TABLE conversations (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subject     VARCHAR(200) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE conversation_participants (
    conversation_id BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    joined_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id),
    CONSTRAINT fk_cp_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE messages (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_id       BIGINT UNSIGNED NOT NULL,
    body            TEXT NOT NULL,
    sent_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at         DATETIME NULL COMMENT 'Read receipts',
    KEY idx_messages_conversation (conversation_id, sent_at),
    CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Student support tickets to instructor/admin (separate from ad-hoc messaging)
CREATE TABLE tickets (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id      BIGINT UNSIGNED NOT NULL,
    course_id       BIGINT UNSIGNED NULL,
    assigned_to     BIGINT UNSIGNED NULL COMMENT 'Instructor or admin handling it',
    subject         VARCHAR(200) NOT NULL,
    status          ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     DATETIME NULL,
    CONSTRAINT fk_ticket_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ticket_messages (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id   BIGINT UNSIGNED NOT NULL,
    sender_id   BIGINT UNSIGNED NOT NULL,
    body        TEXT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tm_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_tm_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Broadcast announcements (1-to-many, Instructor/Admin -> all enrolled students)
CREATE TABLE announcements (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    posted_by   BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    body        TEXT NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_announcement_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_announcement_poster FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Forums, scoped per course (FR-18)
CREATE TABLE forums (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    course_id   BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL DEFAULT 'General Discussion',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_forum_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE forum_threads (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    forum_id    BIGINT UNSIGNED NOT NULL,
    created_by  BIGINT UNSIGNED NOT NULL,
    title       VARCHAR(200) NOT NULL,
    is_pinned   BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_threads_forum (forum_id),
    CONSTRAINT fk_thread_forum FOREIGN KEY (forum_id) REFERENCES forums(id) ON DELETE CASCADE,
    CONSTRAINT fk_thread_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE forum_posts (
    id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    thread_id                 BIGINT UNSIGNED NOT NULL,
    user_id                   BIGINT UNSIGNED NOT NULL,
    body                      TEXT NOT NULL,
    -- Added post-MVP for the forum feed redesign: a post may carry one optional attachment.
    -- `article` is a long-form text mode (body only) and never populates the path/name columns.
    attachment_type           ENUM('image','video','audio','article') NULL,
    attachment_path           VARCHAR(500) NULL,
    attachment_original_name  VARCHAR(255) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_posts_thread (thread_id),
    FULLTEXT KEY ftx_posts_body (body) COMMENT 'Supports forum search',
    CONSTRAINT fk_post_thread FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
    CONSTRAINT fk_post_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE forum_post_reports (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id     BIGINT UNSIGNED NOT NULL,
    reported_by BIGINT UNSIGNED NOT NULL,
    reason      VARCHAR(300) NOT NULL,
    status      ENUM('pending','reviewed','dismissed') NOT NULL DEFAULT 'pending',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_post FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_reporter FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Notifications (in-app + email + optional push/SMS)
CREATE TABLE notifications (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT UNSIGNED NOT NULL,
    channel             ENUM('in_app','email','sms','push') NOT NULL DEFAULT 'in_app',
    type                VARCHAR(60) NOT NULL COMMENT 'e.g. enrolment_confirmed, assignment_due_soon, grade_posted, forum_reply, module_unlocked',
    title               VARCHAR(200) NOT NULL,
    body                TEXT NULL,
    related_entity_type VARCHAR(60) NULL,
    related_entity_id   BIGINT UNSIGNED NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at             DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notifications_user (user_id, is_read),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 13. ANALYTICS & AUDIT
-- =====================================================================

-- Raw engagement events feeding the analytics dashboard
-- (completion rates, at-risk flags, engagement metrics)
CREATE TABLE engagement_events (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id  BIGINT UNSIGNED NOT NULL,
    course_id   BIGINT UNSIGNED NOT NULL,
    event_type  VARCHAR(60) NOT NULL COMMENT 'e.g. login, resource_viewed, assignment_submitted, quiz_attempted',
    event_meta  JSON NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_engagement_course (course_id, event_type),
    KEY idx_engagement_student (student_id),
    CONSTRAINT fk_engagement_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_engagement_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Who verified/enrolled a student, who changed a grade, etc.
CREATE TABLE audit_logs (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_id    BIGINT UNSIGNED NULL COMMENT 'NULL for system/automated actions (e.g. scheduled jobs)',
    action      VARCHAR(100) NOT NULL COMMENT 'e.g. enrolment.confirmed, grade.changed, user.suspended',
    entity_type VARCHAR(60) NOT NULL,
    entity_id   BIGINT UNSIGNED NOT NULL,
    meta        JSON NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_audit_entity (entity_type, entity_id),
    CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
