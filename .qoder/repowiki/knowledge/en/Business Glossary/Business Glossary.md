---
kind: business_term
name: Business Glossary
category: business_term
scope:
    - '**'
---

### Course Section
- Definition：A cohort-based offering of a Course, also referred to as a cohort. Each section has its own name, start/end dates, application deadline, capacity limit, seats_taken counter, status (draft/open/closed/in_progress/completed), and primary instructor. Enrolments and applications can target a specific section, and sections enforce capacity through waitlisting.
- Aliases：cohort、section

### Enrolment Policy
- Definition：A Course-level setting that determines how students join a course. Three modes are supported: `open` (instant self-enrolment), `advisory` (self-enrolment gated by an attestation modal), and `application` (student must submit an application reviewed by an instructor before enrolment). The policy controls which API endpoint a student hits first.
- Aliases：enrolment_policy

### Sections Required
- Definition：A Course flag that forces every enrolment to target a specific Course Section, even for open courses. When enabled, students cannot self-enrol without selecting a section; the system validates this at enrolment time.
- Aliases：sections_required

### Course Application
- Definition：A student's request to join a course whose enrolment policy is `application`. Applications carry answers to configurable questions stored as JSON, optional portfolio URL and alternative proof text, and move through pending → approved/rejected states. On approval, the application is converted into an Enrolment via the same service used by direct self-enrolment.
- Aliases：application、course application

### Waitlisted
- Definition：An Enrolment status indicating a student is on the waiting list for a full Course Section. Waitlisted enrolments are promoted to confirmed automatically when a seat opens (withdrawal) or when section capacity is increased, following FIFO order.
- Aliases：waitlist、waitlisted enrolment

### Self-Paced Enrolment
- Definition：An Enrolment where `section_id` is null, meaning the student is enrolled directly in the Course without joining a specific cohort. Self-paced enrolments bypass capacity checks and do not participate in waitlists.
- Aliases：self-paced、no-section enrolment

### Module Item
- Definition：A typed content unit within a Module. Items include resources, assignments, evaluations, live sessions, SCORM packages, readings, videos, external links, and downloadable files. The type is governed by the `ModuleItemType` enum and each item tracks per-student progress.
- Aliases：module item、item

### Assignment Submission
- Definition：A student's attempt to submit work for an Assignment. Submissions track status, late penalties, rubric scores, and plagiarism reports. They are distinct from Evaluation Attempts, which handle quizzes/tests rather than assignment work.
- Aliases：submission、assignment submission

### Evaluation Attempt
- Definition：A student's attempt at an Evaluation (quiz/test). Each attempt contains multiple answers linked to questions in a Question Bank, with per-attempt status tracking. Distinct from Assignment submissions — evaluations are timed/graded assessments while assignments are deliverable-based.
- Aliases：attempt、evaluation attempt

### Resource
- Definition：A learning asset attached to a Module, polymorphically implemented as ResourceVideo, ResourceDocument, ResourceReading, ResourceExternalLink, ResourceScormPackage, ResourceLiveSession, or ResourceDownloadableFile. Each subtype stores its media/content in a dedicated table while sharing a common Resource parent table for ordering and progress tracking.
- Aliases：resource、learning resource

### Confirmation Delay
- Definition：A Course-level setting (`confirmation_delay_hours`, default 24) that schedules a follow-up confirmation email after a student applies or enrolls. The due timestamp is computed as `applied_at + confirmation_delay_hours` and tracked on the Enrolment record.
- Aliases：confirmation delay、confirmation email delay
