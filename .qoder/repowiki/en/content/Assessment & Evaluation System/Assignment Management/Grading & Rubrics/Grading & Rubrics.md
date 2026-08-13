# Grading & Rubrics

<cite>
**Referenced Files in This Document**
- [Assignment.php](file://app/Models/Assignment.php)
- [AssignmentRubric.php](file://app/Models/AssignmentRubric.php)
- [AssignmentSubmission.php](file://app/Models/AssignmentSubmission.php)
- [AssignmentSubmissionRubricScore.php](file://app/Models/AssignmentSubmissionRubricScore.php)
- [LatePenaltyPolicy.php](file://app/Models/LatePenaltyPolicy.php)
- [LatePenaltyTier.php](file://app/Models/LatePenaltyTier.php)
- [AssignmentManager.php](file://app/Services/Assessment/AssignmentManager.php)
- [AssignmentSubmissionService.php](file://app/Services/Assessment/AssignmentSubmissionService.php)
- [LatePenaltyCalculator.php](file://app/Services/Assessment/LatePenaltyCalculator.php)
- [GradebookService.php](file://app/Services/Assessment/GradebookService.php)
- [AssignmentController.php](file://app/Http/Controllers/Api/V1/AssignmentController.php)
- [GradebookController.php](file://app/Http/Controllers/Api/V1/GradebookController.php)
- [AssignmentResource.php](file://app/Http/Resources/AssignmentResource.php)
- [AssignmentSubmissionRubricScoreResource.php](file://app/Http/Resources/AssignmentSubmissionRubricScoreResource.php)
</cite>

## Table of Contents
1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion
10. Appendices

## Introduction
This document explains the assignment grading and rubric-based assessment system. It covers how instructors define grading criteria with AssignmentRubric, record per-criterion scores via AssignmentSubmissionRubricScore, calculate final grades including late penalties, integrate results into the gradebook, and deliver feedback to students. It also documents the AssignmentManager methods for managing assignments and their rubrics, and provides examples for setting up rubrics, applying scores, and generating grade reports.

## Project Structure
The grading and rubric features span models, services, controllers, and resources:
- Models define the data structures for assignments, submissions, rubrics, and late penalty policies.
- Services implement business logic for submission, grading, late penalty calculation, and gradebook aggregation.
- Controllers expose API endpoints for creating/updating assignments and retrieving course gradebooks.
- Resources serialize domain objects for API responses.

```mermaid
graph TB
subgraph "Models"
A["Assignment"]
AR["AssignmentRubric"]
AS["AssignmentSubmission"]
ARS["AssignmentSubmissionRubricScore"]
LPP["LatePenaltyPolicy"]
LPT["LatePenaltyTier"]
end
subgraph "Services"
AMS["AssignmentManager"]
ASS["AssignmentSubmissionService"]
LPC["LatePenaltyCalculator"]
GBS["GradebookService"]
end
subgraph "Controllers"
AC["AssignmentController"]
GC["GradebookController"]
end
subgraph "Resources"
ARsrc["AssignmentResource"]
ARSSrc["AssignmentSubmissionRubricScoreResource"]
end
AC --> AMS
AC --> ARsrc
GC --> GBS
AMS --> A
AMS --> AR
ASS --> AS
ASS --> ARS
ASS --> LPC
LPC --> LPP
LPP --> LPT
GBS --> A
GBS --> AS
ARsrc --> AR
ARSSrc --> ARS
```

**Diagram sources**
- [Assignment.php:14-71](file://app/Models/Assignment.php#L14-L71)
- [AssignmentRubric.php:13-46](file://app/Models/AssignmentRubric.php#L13-L46)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [AssignmentSubmissionRubricScore.php:10-41](file://app/Models/AssignmentSubmissionRubricScore.php#L10-L41)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)
- [AssignmentManager.php:21-115](file://app/Services/Assessment/AssignmentManager.php#L21-L115)
- [AssignmentSubmissionService.php:24-117](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L117)
- [LatePenaltyCalculator.php:15-36](file://app/Services/Assessment/LatePenaltyCalculator.php#L15-L36)
- [GradebookService.php:18-121](file://app/Services/Assessment/GradebookService.php#L18-L121)
- [AssignmentController.php:16-48](file://app/Http/Controllers/Api/V1/AssignmentController.php#L16-L48)
- [GradebookController.php:12-23](file://app/Http/Controllers/Api/V1/GradebookController.php#L12-L23)
- [AssignmentResource.php:11-42](file://app/Http/Resources/AssignmentResource.php#L11-L42)
- [AssignmentSubmissionRubricScoreResource.php:10-24](file://app/Http/Resources/AssignmentSubmissionRubricScoreResource.php#L10-L24)

**Section sources**
- [Assignment.php:14-71](file://app/Models/Assignment.php#L14-L71)
- [AssignmentRubric.php:13-46](file://app/Models/AssignmentRubric.php#L13-L46)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [AssignmentSubmissionRubricScore.php:10-41](file://app/Models/AssignmentSubmissionRubricScore.php#L10-L41)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)
- [AssignmentManager.php:21-115](file://app/Services/Assessment/AssignmentManager.php#L21-L115)
- [AssignmentSubmissionService.php:24-117](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L117)
- [LatePenaltyCalculator.php:15-36](file://app/Services/Assessment/LatePenaltyCalculator.php#L15-L36)
- [GradebookService.php:18-121](file://app/Services/Assessment/GradebookService.php#L18-L121)
- [AssignmentController.php:16-48](file://app/Http/Controllers/Api/V1/AssignmentController.php#L16-L48)
- [GradebookController.php:12-23](file://app/Http/Controllers/Api/V1/GradebookController.php#L12-L23)
- [AssignmentResource.php:11-42](file://app/Http/Resources/AssignmentResource.php#L11-L42)
- [AssignmentSubmissionRubricScoreResource.php:10-24](file://app/Http/Resources/AssignmentSubmissionRubricScoreResource.php#L10-L24)

## Core Components
- AssignmentRubric defines grading criteria per assignment (criterion name, maximum points, order).
- AssignmentSubmissionRubricScore records a student’s score and optional comment per criterion on a specific submission.
- AssignmentSubmission stores submission metadata, raw/final scores, late penalty percent, status, and instructor feedback.
- LatePenaltyPolicy and LatePenaltyTier configure tiered deductions based on hours late.
- AssignmentManager creates/updates assignments and synchronizes rubrics as a complete set.
- AssignmentSubmissionService handles student submission, late penalty calculation, grading, rubric score persistence, notifications, and audit logging.
- GradebookService aggregates assignment and evaluation scores into a per-student report with final grade percentage.

**Section sources**
- [AssignmentRubric.php:13-46](file://app/Models/AssignmentRubric.php#L13-L46)
- [AssignmentSubmissionRubricScore.php:10-41](file://app/Models/AssignmentSubmissionRubricScore.php#L10-L41)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)
- [AssignmentManager.php:21-115](file://app/Services/Assessment/AssignmentManager.php#L21-L115)
- [AssignmentSubmissionService.php:24-117](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L117)
- [GradebookService.php:18-121](file://app/Services/Assessment/GradebookService.php#L18-L121)

## Architecture Overview
The system separates concerns across layers:
- Controllers accept requests and delegate to managers/services.
- Services encapsulate business rules (submission flow, grading, late penalties, gradebook aggregation).
- Models represent persistent entities and relationships.
- Resources format API payloads.

```mermaid
sequenceDiagram
participant Client as "Client"
participant AC as "AssignmentController"
participant AMS as "AssignmentManager"
participant ASS as "AssignmentSubmissionService"
participant LPC as "LatePenaltyCalculator"
participant DB as "Database"
Client->>AC : Create/Update Assignment
AC->>AMS : create/update(data)
AMS->>DB : Persist assignment + sync rubrics
AMS-->>AC : Assignment
Client->>ASS : Submit assignment
ASS->>LPC : penaltyPercentFor(policy, dueAt, submittedAt)
LPC-->>ASS : penalty %
ASS->>DB : Create submission + update progress
ASS-->>Client : Submission
Client->>ASS : Grade submission (raw_score, rubric_scores, feedback)
ASS->>DB : Update final_score, rubric scores, status
ASS-->>Client : Graded Submission
```

**Diagram sources**
- [AssignmentController.php:16-48](file://app/Http/Controllers/Api/V1/AssignmentController.php#L16-L48)
- [AssignmentManager.php:21-115](file://app/Services/Assessment/AssignmentManager.php#L21-L115)
- [AssignmentSubmissionService.php:24-117](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L117)
- [LatePenaltyCalculator.php:15-36](file://app/Services/Assessment/LatePenaltyCalculator.php#L15-L36)

## Detailed Component Analysis

### Data Model Relationships
```mermaid
classDiagram
class Assignment {
+id
+module_id
+title
+instructions
+submission_type
+due_at
+allow_late
+late_penalty_policy_id
+max_score
+plagiarism_check_enabled
+rubrics()
+submissions()
+latePenaltyPolicy()
}
class AssignmentRubric {
+id
+assignment_id
+criterion
+max_points
+order_index
+scores()
}
class AssignmentSubmission {
+id
+assignment_id
+student_id
+attempt_number
+file_url
+text_content
+submitted_at
+is_late
+late_penalty_percent
+status
+raw_score
+final_score
+feedback
+graded_by
+graded_at
+rubricScores()
}
class AssignmentSubmissionRubricScore {
+id
+submission_id
+rubric_id
+score
+comment
}
class LatePenaltyPolicy {
+id
+name
+tiers()
}
class LatePenaltyTier {
+id
+policy_id
+hours_late_from
+hours_late_to
+penalty_percent
}
Assignment "1" --> "many" AssignmentRubric : "has many"
Assignment "1" --> "many" AssignmentSubmission : "has many"
AssignmentSubmission "1" --> "many" AssignmentSubmissionRubricScore : "has many"
AssignmentRubric "1" --> "many" AssignmentSubmissionRubricScore : "has many"
Assignment "1" --> "1" LatePenaltyPolicy : "belongs to"
LatePenaltyPolicy "1" --> "many" LatePenaltyTier : "has many"
```

**Diagram sources**
- [Assignment.php:14-71](file://app/Models/Assignment.php#L14-L71)
- [AssignmentRubric.php:13-46](file://app/Models/AssignmentRubric.php#L13-L46)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [AssignmentSubmissionRubricScore.php:10-41](file://app/Models/AssignmentSubmissionRubricScore.php#L10-L41)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)

**Section sources**
- [Assignment.php:14-71](file://app/Models/Assignment.php#L14-L71)
- [AssignmentRubric.php:13-46](file://app/Models/AssignmentRubric.php#L13-L46)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [AssignmentSubmissionRubricScore.php:10-41](file://app/Models/AssignmentSubmissionRubricScore.php#L10-L41)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)

### Rubric Management Workflow (AssignmentManager)
- Creates an assignment within a transaction, then synchronizes rubrics by deleting existing ones and recreating from the provided list.
- Updates assignment fields and optionally replaces rubrics when rubrics are present in the update payload.
- Ensures module item linkage is created or updated alongside assignment changes.

```mermaid
flowchart TD
Start(["Create/Update Assignment"]) --> Validate["Validate input data"]
Validate --> Txn{"Within DB transaction?"}
Txn --> |Yes| PersistA["Persist assignment fields"]
PersistA --> SyncR{"Rubrics provided?"}
SyncR --> |Yes| DeleteOld["Delete existing rubrics"]
DeleteOld --> Recreate["Recreate rubrics from array"]
SyncR --> |No| SkipR["Skip rubric sync"]
Recreate --> ModuleItem["Create/Update ModuleItem"]
SkipR --> ModuleItem
ModuleItem --> End(["Return Assignment"])
```

**Diagram sources**
- [AssignmentManager.php:26-80](file://app/Services/Assessment/AssignmentManager.php#L26-L80)
- [AssignmentManager.php:97-113](file://app/Services/Assessment/AssignmentManager.php#L97-L113)

**Section sources**
- [AssignmentManager.php:26-80](file://app/Services/Assessment/AssignmentManager.php#L26-L80)
- [AssignmentManager.php:97-113](file://app/Services/Assessment/AssignmentManager.php#L97-L113)

### Submission and Grading Workflow (AssignmentSubmissionService)
- On submit: determines if late, calculates penalty percent using LatePenaltyCalculator, persists submission, tracks engagement, and updates module completion.
- On grade: computes final_score by applying late penalty to raw_score, persists rubric scores and feedback, notifies the student, logs the change, and returns the refreshed submission.

```mermaid
sequenceDiagram
participant Student as "Student"
participant Service as "AssignmentSubmissionService"
participant Calc as "LatePenaltyCalculator"
participant DB as "Database"
Student->>Service : submit(assignment, file/text)
Service->>Calc : penaltyPercentFor(policy, dueAt, now)
Calc-->>Service : penalty %
Service->>DB : create submission (is_late, late_penalty_percent)
Service-->>Student : submission
Instructor->>Service : grade(submission, {raw_score, rubric_scores, feedback})
Service->>DB : update raw_score, final_score, status, feedback
Service->>DB : delete old rubric scores
Service->>DB : insert rubric scores
Service-->>Instructor : graded submission
```

**Diagram sources**
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

**Section sources**
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

### Late Penalty Calculation (LatePenaltyCalculator)
- Returns zero penalty if no policy or submission is not late.
- Computes hours late and selects the matching tier by range boundaries; returns the tier’s penalty percent.

```mermaid
flowchart TD
S(["Start"]) --> CheckPolicy{"Policy exists and submission late?"}
CheckPolicy --> |No| Zero["Return 0.0"]
CheckPolicy --> |Yes| Hours["Compute hours late"]
Hours --> Tier["Find matching tier by hours range"]
Tier --> ReturnP{"Tier found?"}
ReturnP --> |Yes| Pct["Return tier.penalty_percent"]
ReturnP --> |No| Zero
Pct --> E(["End"])
Zero --> E
```

**Diagram sources**
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [LatePenaltyPolicy.php:23-29](file://app/Models/LatePenaltyPolicy.php#L23-L29)
- [LatePenaltyTier.php:19-28](file://app/Models/LatePenaltyTier.php#L19-L28)

**Section sources**
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [LatePenaltyPolicy.php:23-29](file://app/Models/LatePenaltyPolicy.php#L23-L29)
- [LatePenaltyTier.php:19-28](file://app/Models/LatePenaltyTier.php#L19-L28)

### Gradebook Integration (GradebookService)
- Aggregates latest graded submissions per assignment and best attempts per evaluation per student.
- Computes earned vs possible points and rounds the final grade percentage to two decimals.
- Exposes assignments, evaluations, and per-student rows for UI rendering.

```mermaid
flowchart TD
Start(["Course Gradebook"]) --> Load["Load modules, assignments, evaluations, confirmed enrolments"]
Load --> Submissions["Fetch latest graded submissions per student per assignment"]
Load --> Attempts["Fetch best graded attempts per student per evaluation"]
Submissions --> Rows["Build per-student rows with assignment scores"]
Attempts --> Rows
Rows --> Final["Compute final_grade_percent = round(earned/possible*100, 2)"]
Final --> Output(["Return assignments, evaluations, students"])
```

**Diagram sources**
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

**Section sources**
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

### API Entry Points
- AssignmentController exposes show/store/update/destroy for assignments, loading rubrics where needed.
- GradebookController exposes a course-level gradebook endpoint that authorizes access and delegates to GradebookService.

```mermaid
sequenceDiagram
participant Client as "Client"
participant AC as "AssignmentController"
participant GC as "GradebookController"
participant AMS as "AssignmentManager"
participant GBS as "GradebookService"
Client->>AC : GET /assignments/{id}
AC->>AC : load rubrics
AC-->>Client : AssignmentResource
Client->>AC : POST /modules/{id}/assignments
AC->>AMS : create(module, data)
AMS-->>AC : Assignment
AC-->>Client : AssignmentResource
Client->>GC : GET /courses/{id}/gradebook
GC->>GBS : forCourse(course)
GBS-->>GC : gradebook data
GC-->>Client : JSON response
```

**Diagram sources**
- [AssignmentController.php:16-48](file://app/Http/Controllers/Api/V1/AssignmentController.php#L16-L48)
- [GradebookController.php:12-23](file://app/Http/Controllers/Api/V1/GradebookController.php#L12-L23)
- [AssignmentManager.php:26-80](file://app/Services/Assessment/AssignmentManager.php#L26-L80)
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

**Section sources**
- [AssignmentController.php:16-48](file://app/Http/Controllers/Api/V1/AssignmentController.php#L16-L48)
- [GradebookController.php:12-23](file://app/Http/Controllers/Api/V1/GradebookController.php#L12-L23)

## Dependency Analysis
- AssignmentManager depends on Assignment, AssignmentRubric, and ModuleItem to persist assignments and synchronize rubrics atomically.
- AssignmentSubmissionService depends on LatePenaltyCalculator, ProgressEngine, NotificationDispatcher, EngagementTracker, and AuditLogger to manage the full lifecycle of submissions and grading.
- LatePenaltyCalculator depends on LatePenaltyPolicy and LatePenaltyTier to compute tiered penalties.
- GradebookService depends on Assignment, Evaluation, AssignmentSubmission, EvaluationAttempt, Enrolment, and User to build the course-wide gradebook.

```mermaid
graph LR
AMS["AssignmentManager"] --> A["Assignment"]
AMS --> AR["AssignmentRubric"]
AMS --> MI["ModuleItem"]
ASS["AssignmentSubmissionService"] --> LPC["LatePenaltyCalculator"]
ASS --> PE["ProgressEngine"]
ASS --> ND["NotificationDispatcher"]
ASS --> ET["EngagementTracker"]
ASS --> AL["AuditLogger"]
LPC --> LPP["LatePenaltyPolicy"]
LPP --> LPT["LatePenaltyTier"]
GBS["GradebookService"] --> A
GBS --> EV["Evaluation"]
GBS --> AS["AssignmentSubmission"]
GBS --> EA["EvaluationAttempt"]
GBS --> EN["Enrolment"]
GBS --> U["User"]
```

**Diagram sources**
- [AssignmentManager.php:21-115](file://app/Services/Assessment/AssignmentManager.php#L21-L115)
- [AssignmentSubmissionService.php:24-117](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L117)
- [LatePenaltyCalculator.php:15-36](file://app/Services/Assessment/LatePenaltyCalculator.php#L15-L36)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)
- [GradebookService.php:18-121](file://app/Services/Assessment/GradebookService.php#L18-L121)

**Section sources**
- [AssignmentManager.php:21-115](file://app/Services/Assessment/AssignmentManager.php#L21-L115)
- [AssignmentSubmissionService.php:24-117](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L117)
- [LatePenaltyCalculator.php:15-36](file://app/Services/Assessment/LatePenaltyCalculator.php#L15-L36)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)
- [GradebookService.php:18-121](file://app/Services/Assessment/GradebookService.php#L18-L121)

## Performance Considerations
- Rubric synchronization deletes all existing rubrics and recreates them in a loop; this is simple and safe but can be optimized for large rubric sets by batching inserts.
- Gradebook queries use groupBy and sorting to fetch latest/best records efficiently; ensure appropriate indexes exist on foreign keys and status columns.
- Late penalty calculation performs a single tier lookup per submission; consider caching policy tiers if frequently accessed.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Missing rubric scores after grading: Ensure rubric_scores are included in the grade request; the service deletes previous rubric scores before inserting new ones.
- Incorrect final score: Verify raw_score and late_penalty_percent; final_score is computed as raw_score adjusted by the stored late penalty percentage.
- No gradebook data: Confirm submissions have a non-null final_score and evaluations have a graded status; only these are aggregated.
- Late penalty not applied: Confirm the assignment has a valid late_penalty_policy_id and the submission time exceeds due_at; otherwise penalty is zero.

**Section sources**
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)
- [GradebookService.php:49-65](file://app/Services/Assessment/GradebookService.php#L49-L65)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

## Conclusion
The system provides a robust rubric-based grading workflow:
- Instructors define criteria via rubrics and assign maximum points per criterion.
- Students submit work; late penalties are calculated using configurable tiers.
- Instructors apply rubric scores and feedback; final scores incorporate late penalties.
- The gradebook aggregates results across assignments and evaluations to produce a final percentage per student.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Examples

- Setting up rubrics for an assignment:
  - Use the assignment creation/update endpoints to include a rubrics array with criterion and max_points; rubrics are replaced atomically.
  - Reference: [AssignmentManager.php:26-80](file://app/Services/Assessment/AssignmentManager.php#L26-L80), [AssignmentManager.php:97-113](file://app/Services/Assessment/AssignmentManager.php#L97-L113)

- Applying scores to a submission:
  - Call the grading endpoint with raw_score, optional rubric_scores (rubric_id, score, comment), and feedback; the service computes final_score and persists rubric scores.
  - Reference: [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)

- Generating grade reports:
  - Request the course gradebook endpoint; the service returns assignments, evaluations, and per-student rows with final_grade_percent.
  - Reference: [GradebookController.php:16-21](file://app/Http/Controllers/Api/V1/GradebookController.php#L16-L21), [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

- Late penalty configuration:
  - Define a LatePenaltyPolicy with one or more LatePenaltyTier entries specifying hour ranges and penalty percentages; assignments reference the policy.
  - Reference: [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39), [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38), [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

- Feedback mechanisms:
  - Instructors provide feedback during grading; it is persisted on the submission and visible via resources.
  - Reference: [AssignmentSubmission.php:22-47](file://app/Models/AssignmentSubmission.php#L22-L47), [AssignmentSubmissionRubricScoreResource.php:15-22](file://app/Http/Resources/AssignmentSubmissionRubricScoreResource.php#L15-L22)

**Section sources**
- [AssignmentManager.php:26-80](file://app/Services/Assessment/AssignmentManager.php#L26-L80)
- [AssignmentManager.php:97-113](file://app/Services/Assessment/AssignmentManager.php#L97-L113)
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)
- [GradebookController.php:16-21](file://app/Http/Controllers/Api/V1/GradebookController.php#L16-L21)
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)
- [LatePenaltyPolicy.php:12-39](file://app/Models/LatePenaltyPolicy.php#L12-L39)
- [LatePenaltyTier.php:12-38](file://app/Models/LatePenaltyTier.php#L12-L38)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [AssignmentSubmission.php:22-47](file://app/Models/AssignmentSubmission.php#L22-L47)
- [AssignmentSubmissionRubricScoreResource.php:15-22](file://app/Http/Resources/AssignmentSubmissionRubricScoreResource.php#L15-L22)