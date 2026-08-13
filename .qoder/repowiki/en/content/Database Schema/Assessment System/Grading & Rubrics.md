# Grading & Rubrics

<cite>
**Referenced Files in This Document**
- [Assignment.php](file://app/Models/Assignment.php)
- [AssignmentRubric.php](file://app/Models/AssignmentRubric.php)
- [AssignmentSubmission.php](file://app/Models/AssignmentSubmission.php)
- [AssignmentSubmissionRubricScore.php](file://app/Models/AssignmentSubmissionRubricScore.php)
- [LatePenaltyPolicy.php](file://app/Models/LatePenaltyPolicy.php)
- [LatePenaltyTier.php](file://app/Models/LatePenaltyTier.php)
- [LatePenaltyCalculator.php](file://app\Services/Assessment/LatePenaltyCalculator.php)
- [AssignmentSubmissionService.php](file://app\Services/Assessment/AssignmentSubmissionService.php)
- [GradebookService.php](file://app/services/Assessment/GradebookService.php)
- [AssignmentSubmissionController.php](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php)
- [GradebookController.php](file://app/Http/Controllers/Api/V1/GradebookController.php)
- [2024_01_01_000130_create_late_penalty_policies_table.php](file://database/migrations/2024_01_01_000130_create_late_penalty_policies_table.php)
- [2024_01_01_000131_create_late_penalty_tiers_table.php](file://database/migrations/2024_01_01_000131_create_late_penalty_tiers_table.php)
- [2024_01_01_000132_create_assignments_table.php](file://database/migrations/2024_01_01_000132_create_assignments_table.php)
- [2024_01_01_000133_create_assignment_rubrics_table.php](file://database/migrations/2024_01_01_000133_create_assignment_rubrics_table.php)
- [2024_01_01_000134_create_assignment_submissions_table.php](file://database/migrations/2024_01_01_000134_create_assignment_submissions_table.php)
- [2024_01_01_000135_create_assignment_submission_rubric_scores_table.php](file://database/migrations/2024_01_01_000135_create_assignment_submission_rubric_scores_table.php)
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

## Introduction
This document explains the grading system’s data model and workflows for rubric-based assignment grading, per-submission rubric scores, and late penalty policies. It covers how assignments define grading criteria via rubrics, how instructors score submissions against those criteria, how late penalties are computed from configurable tiers, and how final grades are derived for reporting.

## Project Structure
The grading system is implemented as a set of Eloquent models, services, controllers, and database migrations:
- Models define entities such as Assignment, AssignmentRubric, AssignmentSubmission, AssignmentSubmissionRubricScore, LatePenaltyPolicy, and LatePenaltyTier.
- Services encapsulate business logic for submission handling, grading, late penalty calculation, and gradebook aggregation.
- Controllers expose API endpoints for submitting work and grading.
- Migrations define the persistent schema for all entities and relationships.

```mermaid
graph TB
subgraph "Domain Models"
A["Assignment"]
R["AssignmentRubric"]
S["AssignmentSubmission"]
SR["AssignmentSubmissionRubricScore"]
P["LatePenaltyPolicy"]
T["LatePenaltyTier"]
end
subgraph "Services"
LPC["LatePenaltyCalculator"]
ASS["AssignmentSubmissionService"]
GBS["GradebookService"]
end
subgraph "API"
ASC["AssignmentSubmissionController"]
GBC["GradebookController"]
end
A --> R
A --> S
R --> SR
S --> SR
A --> P
P --> T
ASC --> ASS
ASS --> LPC
ASS --> GBS
GBC --> GBS
```

**Diagram sources**
- [Assignment.php:14-70](file://app/Models/Assignment.php#L14-L70)
- [AssignmentRubric.php:13-46](file://app/Models/AssignmentRubric.php#L13-L46)
- [AssignmentSubmission.php:15-88](file://app/Models/AssignmentSubmission.php#L15-L88)
- [AssignmentSubmissionRubricScore.php:10-40](file://app/Models/AssignmentSubmissionRubricScore.php#L10-L40)
- [LatePenaltyPolicy.php:12-38](file://app/Models/LatePenaltyPolicy.php#L12-L38)
- [LatePenaltyTier.php:12-37](file://app/Models/LatePenaltyTier.php#L12-L37)
- [LatePenaltyCalculator.php:15-35](file://app/Services/Assessment/LatePenaltyCalculator.php#L15-L35)
- [AssignmentSubmissionService.php:24-116](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L116)
- [GradebookService.php:18-120](file://app/services/Assessment/GradebookService.php#L18-L120)
- [AssignmentSubmissionController.php:19-58](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L19-L58)
- [GradebookController.php:12-22](file://app/Http/Controllers/Api/V1/GradebookController.php#L12-L22)

**Section sources**
- [Assignment.php:14-70](file://app/Models/Assignment.php#L14-L70)
- [AssignmentRubric.php:13-46](file://app/Models/AssignmentRubric.php#L13-L46)
- [AssignmentSubmission.php:15-88](file://app/Models/AssignmentSubmission.php#L15-L88)
- [AssignmentSubmissionRubricScore.php:10-40](file://app/Models/AssignmentSubmissionRubricScore.php#L10-L40)
- [LatePenaltyPolicy.php:12-38](file://app/Models/LatePenaltyPolicy.php#L12-L38)
- [LatePenaltyTier.php:12-37](file://app/Models/LatePenaltyTier.php#L12-L37)
- [LatePenaltyCalculator.php:15-35](file://app/Services/Assessment/LatePenaltyCalculator.php#L15-L35)
- [AssignmentSubmissionService.php:24-116](file://app/Services/Assessment/AssignmentSubmissionService.php#L24-L116)
- [GradebookService.php:18-120](file://app/services/Assessment/GradebookService.php#L18-L120)
- [AssignmentSubmissionController.php:19-58](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L19-L58)
- [GradebookController.php:12-22](file://app/Http/Controllers/Api/V1/GradebookController.php#L12-L22)

## Core Components
- Assignment: Defines an assignable task with due date, max score, and optional late policy.
- AssignmentRubric: Defines grading criteria (criterion) and maximum points per criterion for an assignment.
- AssignmentSubmission: Represents a student’s attempt, including whether it was late, the applied penalty percentage, raw score, and final score after penalty.
- AssignmentSubmissionRubricScore: Records per-criterion scores and comments for a specific submission.
- LatePenaltyPolicy and LatePenaltyTier: Define time-based deduction bands (e.g., hours late ranges and corresponding percentages).
- LatePenaltyCalculator: Computes the applicable penalty percentage based on due time, submission time, and configured tiers.
- AssignmentSubmissionService: Orchestrates submission creation, late penalty computation, grading, rubric score persistence, notifications, and audit logging.
- GradebookService: Aggregates assignment scores and evaluation attempts to compute per-student final grade percentages.

Key behaviors:
- Rubrics provide structured criteria; each submission can have one score per rubric criterion.
- Late penalties are automatically calculated at submission time and stored on the submission record.
- Final score equals raw score adjusted by the stored late penalty percent.
- The gradebook sums assignment final scores and evaluation best attempts to produce a course-level final grade percentage.

**Section sources**
- [Assignment.php:19-69](file://app/Models/Assignment.php#L19-L69)
- [AssignmentRubric.php:20-45](file://app/Models/AssignmentRubric.php#L20-L45)
- [AssignmentSubmission.php:22-87](file://app/Models/AssignmentSubmission.php#L22-L87)
- [AssignmentSubmissionRubricScore.php:14-39](file://app/Models/AssignmentSubmissionRubricScore.php#L14-L39)
- [LatePenaltyPolicy.php:19-37](file://app/Models/LatePenaltyPolicy.php#L19-L37)
- [LatePenaltyTier.php:19-36](file://app/Models/LatePenaltyTier.php#L19-L36)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [AssignmentSubmissionService.php:37-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L115)
- [GradebookService.php:31-119](file://app/services/Assessment/GradebookService.php#L31-L119)

## Architecture Overview
The grading workflow spans API controllers, domain services, and models. Students submit work; the system computes late penalties immediately. Instructors later grade submissions, optionally providing per-criterion rubric scores. The gradebook aggregates results into a final percentage.

```mermaid
sequenceDiagram
participant Student as "Student"
participant API as "AssignmentSubmissionController"
participant Service as "AssignmentSubmissionService"
participant Calc as "LatePenaltyCalculator"
participant DB as "Database"
Student->>API : Submit assignment
API->>Service : submit(student, assignment, data)
Service->>Calc : penaltyPercentFor(policy, dueAt, submittedAt)
Calc-->>Service : penaltyPercent
Service->>DB : Create AssignmentSubmission<br/>with is_late, late_penalty_percent
Note over Service,DB : Submission triggers progress updates and engagement tracking
```

**Diagram sources**
- [AssignmentSubmissionController.php:38-49](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L38-L49)
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

```mermaid
sequenceDiagram
participant Instructor as "Instructor"
participant API as "AssignmentSubmissionController"
participant Service as "AssignmentSubmissionService"
participant DB as "Database"
Instructor->>API : grade(submission, {raw_score, feedback, rubric_scores})
API->>Service : grade(grader, submission, data)
Service->>DB : Update raw_score, final_score, status, graded_by, graded_at
Service->>DB : Delete old rubric scores and insert new ones
Service-->>API : Return graded submission with rubricScores
```

**Diagram sources**
- [AssignmentSubmissionController.php:52-57](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L52-L57)
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)

```mermaid
flowchart TD
Start(["Gradebook Request"]) --> LoadCourse["Load Course Modules"]
LoadCourse --> LoadAssignments["Load Assignments with max_score"]
LoadAssignments --> LoadStudents["Load Confirmed Enrolments"]
LoadStudents --> LatestSubs["Get latest graded submissions per student per assignment"]
LoadStudents --> BestAttempts["Get best graded attempts per student per evaluation"]
LatestSubs --> BuildRows["Build rows: assignment scores + evaluation scores"]
BestAttempts --> BuildRows
BuildRows --> ComputeFinal["Compute final_grade_percent = earned / possible * 100"]
ComputeFinal --> End(["Return gradebook data"])
```

**Diagram sources**
- [GradebookController.php:16-21](file://app/Http/Controllers/Api/V1/GradebookController.php#L16-L21)
- [GradebookService.php:31-119](file://app/services/Assessment/GradebookService.php#L31-L119)

## Detailed Component Analysis

### Data Model: Entities and Relationships
```mermaid
erDiagram
ASSIGNMENT {
int id PK
int module_id FK
string title
text instructions
enum submission_type
datetime due_at
boolean allow_late
int late_penalty_policy_id FK
decimal max_score
boolean plagiarism_check_enabled
}
ASSIGNMENT_RUBRIC {
int id PK
int assignment_id FK
string criterion
decimal max_points
int order_index
}
ASSIGNMENT_SUBMISSION {
int id PK
int assignment_id FK
int student_id FK
int attempt_number
string file_url
mediumtext text_content
timestamp submitted_at
boolean is_late
decimal late_penalty_percent
enum status
decimal raw_score
decimal final_score
text feedback
int graded_by FK
datetime graded_at
}
ASSIGNMENT_SUBMISSION_RUBRIC_SCORE {
int id PK
int submission_id FK
int rubric_id FK
decimal score
text comment
}
LATE_PENALTY_POLICY {
int id PK
string name
timestamp created_at
}
LATE_PENALTY_TIER {
int id PK
int policy_id FK
unsigned_int hours_late_from
unsigned_int hours_late_to
decimal penalty_percent
}
ASSIGNMENT ||--o{ ASSIGNMENT_RUBRIC : "has many"
ASSIGNMENT ||--o{ ASSIGNMENT_SUBMISSION : "has many"
ASSIGNMENT ||--|| LATE_PENALTY_POLICY : "belongs to"
LATE_PENALTY_POLICY ||--o{ LATE_PENALTY_TIER : "has many"
ASSIGNMENT_SUBMISSION ||--o{ ASSIGNMENT_SUBMISSION_RUBRIC_SCORE : "has many"
ASSIGNMENT_RUBRIC ||--o{ ASSIGNMENT_SUBMISSION_RUBRIC_SCORE : "has many"
```

**Diagram sources**
- [2024_01_01_000132_create_assignments_table.php:13-25](file://database/migrations/2024_01_01_000132_create_assignments_table.php#L13-L25)
- [2024_01_01_000133_create_assignment_rubrics_table.php:13-19](file://database/migrations/2024_01_01_000133_create_assignment_rubrics_table.php#L13-L19)
- [2024_01_01_000134_create_assignment_submissions_table.php:13-32](file://database/migrations/2024_01_01_000134_create_assignment_submissions_table.php#L13-L32)
- [2024_01_01_000135_create_assignment_submission_rubric_scores_table.php:13-20](file://database/migrations/2024_01_01_000135_create_assignment_submission_rubric_scores_table.php#L13-L20)
- [2024_01_01_000130_create_late_penalty_policies_table.php:13-17](file://database/migrations/2024_01_01_000130_create_late_penalty_policies_table.php#L13-L17)
- [2024_01_01_000131_create_late_penalty_tiers_table.php:13-19](file://database/migrations/2024_01_01_000131_create_late_penalty_tiers_table.php#L13-L19)

**Section sources**
- [2024_01_01_000132_create_assignments_table.php:13-25](file://database/migrations/2024_01_01_000132_create_assignments_table.php#L13-L25)
- [2024_01_01_000133_create_assignment_rubrics_table.php:13-19](file://database/migrations/2024_01_01_000133_create_assignment_rubrics_table.php#L13-L19)
- [2024_01_01_000134_create_assignment_submissions_table.php:13-32](file://database/migrations/2024_01_01_000134_create_assignment_submissions_table.php#L13-L32)
- [2024_01_01_000135_create_assignment_submission_rubric_scores_table.php:13-20](file://database/migrations/2024_01_01_000135_create_assignment_submission_rubric_scores_table.php#L13-L20)
- [2024_01_01_000130_create_late_penalty_policies_table.php:13-17](file://database/migrations/2024_01_01_000130_create_late_penalty_policies_table.php#L13-L17)
- [2024_01_01_000131_create_late_penalty_tiers_table.php:13-19](file://database/migrations/2024_01_01_000131_create_late_penalty_tiers_table.php#L13-L19)

### Rubrics and Rubric Scores
- AssignmentRubric defines criteria and maximum points per criterion for an assignment.
- AssignmentSubmissionRubricScore records the actual score and optional comment for each criterion on a specific submission.
- During grading, existing rubric scores for a submission are removed and replaced with the instructor-provided scores.

```mermaid
classDiagram
class Assignment {
+id
+title
+max_score
+due_at
+allow_late
+latePenaltyPolicy()
+rubrics()
+submissions()
}
class AssignmentRubric {
+id
+assignment_id
+criterion
+max_points
+order_index
+assignment()
+scores()
}
class AssignmentSubmission {
+id
+assignment_id
+student_id
+attempt_number
+submitted_at
+is_late
+late_penalty_percent
+status
+raw_score
+final_score
+feedback
+graded_by
+graded_at
+assignment()
+student()
+gradedBy()
+rubricScores()
}
class AssignmentSubmissionRubricScore {
+id
+submission_id
+rubric_id
+score
+comment
+submission()
+rubric()
}
Assignment "1" --> "many" AssignmentRubric : "hasMany"
Assignment "1" --> "many" AssignmentSubmission : "hasMany"
AssignmentRubric "1" --> "many" AssignmentSubmissionRubricScore : "hasMany"
AssignmentSubmission "1" --> "many" AssignmentSubmissionRubricScore : "hasMany"
```

**Diagram sources**
- [Assignment.php:42-69](file://app/Models/Assignment.php#L42-L69)
- [AssignmentRubric.php:34-45](file://app/Models/AssignmentRubric.php#L34-L45)
- [AssignmentSubmission.php:52-79](file://app/Models/AssignmentSubmission.php#L52-L79)
- [AssignmentSubmissionRubricScore.php:28-39](file://app/Models/AssignmentSubmissionRubricScore.php#L28-L39)

**Section sources**
- [AssignmentRubric.php:20-45](file://app/Models/AssignmentRubric.php#L20-L45)
- [AssignmentSubmissionRubricScore.php:14-39](file://app/Models/AssignmentSubmissionRubricScore.php#L14-L39)
- [AssignmentSubmissionService.php:87-96](file://app/Services/Assessment/AssignmentSubmissionService.php#L87-L96)

### Late Penalty Policies and Tier Calculations
- LatePenaltyPolicy groups one or more LatePenaltyTier entries that define hour ranges and corresponding penalty percentages.
- LatePenaltyCalculator determines the applicable tier based on hours late between due_at and submitted_at and returns the penalty percentage.
- At submission time, the service calculates and stores the penalty percentage on the submission.

```mermaid
flowchart TD
Start(["penaltyPercentFor(policy, dueAt, submittedAt)"]) --> Check{"policy exists and submitted > due?"}
Check -- No --> ReturnZero["Return 0.0"]
Check -- Yes --> Hours["Compute hoursLate = dueAt.diffInHours(submittedAt)"]
Hours --> Query["Find tier where hours_late_from <= hoursLate<br/>and (hours_late_to is null or hours_late_to > hoursLate)"]
Query --> Found{"Tier found?"}
Found -- No --> ReturnZero
Found -- Yes --> ReturnTier["Return tier.penalty_percent"]
```

**Diagram sources**
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [LatePenaltyTier.php:19-28](file://app/Models/LatePenaltyTier.php#L19-L28)

**Section sources**
- [LatePenaltyPolicy.php:19-37](file://app/Models/LatePenaltyPolicy.php#L19-L37)
- [LatePenaltyTier.php:19-36](file://app/Models/LatePenaltyTier.php#L19-L36)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)

### Grading Workflow: From Submission to Final Score
- Students submit work; the system marks it as submitted and computes any late penalty.
- Instructors grade submissions by providing a raw score and optional rubric scores per criterion.
- Final score is computed as raw_score adjusted by the stored late_penalty_percent.
- Notifications and audit logs are recorded upon grading.

```mermaid
sequenceDiagram
participant Student as "Student"
participant Controller as "AssignmentSubmissionController"
participant Service as "AssignmentSubmissionService"
participant Calc as "LatePenaltyCalculator"
participant DB as "Database"
Student->>Controller : POST /assignments/{id}/submissions
Controller->>Service : submit(student, assignment, payload)
Service->>Calc : penaltyPercentFor(policy, due_at, now())
Calc-->>Service : percent
Service->>DB : Create submission with is_late, late_penalty_percent
Note over Service,DB : Progress and engagement updated
Instructor->>Controller : PATCH /submissions/{id}/grade
Controller->>Service : grade(grader, submission, {raw_score, rubric_scores})
Service->>DB : Update raw_score, final_score, status, graded_by, graded_at
Service->>DB : Replace rubric scores for this submission
Service-->>Controller : Graded submission
```

**Diagram sources**
- [AssignmentSubmissionController.php:38-57](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L38-L57)
- [AssignmentSubmissionService.php:37-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L115)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

**Section sources**
- [AssignmentSubmissionController.php:38-57](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L38-L57)
- [AssignmentSubmissionService.php:37-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L115)

### Final Grade Computation in the Gradebook
- The gradebook aggregates per-student assignment final scores and best evaluation attempts.
- Final grade percent is computed as total earned points divided by total possible points across assignments and evaluations.

```mermaid
flowchart TD
A["Load course modules"] --> B["Load assignments with max_score"]
B --> C["Load confirmed enrolments"]
C --> D["Latest graded submission per student per assignment"]
C --> E["Best graded attempt per student per evaluation"]
D --> F["Sum final_score per student"]
E --> G["Sum best score_percent per student"]
F --> H["possible = sum(max_score) + count(evaluations)*100"]
G --> H
H --> I["final_grade_percent = (earned / possible) * 100"]
```

**Diagram sources**
- [GradebookService.php:31-119](file://app/services/Assessment/GradebookService.php#L31-L119)

**Section sources**
- [GradebookService.php:31-119](file://app/services/Assessment/GradebookService.php#L31-L119)

## Dependency Analysis
- AssignmentSubmissionService depends on LatePenaltyCalculator for penalty computation, and interacts with progress, notification, engagement, and audit services.
- AssignmentSubmissionController depends on AssignmentSubmissionService and MediaStorageService for storing files and returning resources.
- GradebookController depends on GradebookService to aggregate scores.
- Models form a clear relational graph with foreign keys enforced by migrations.

```mermaid
graph LR
ASC["AssignmentSubmissionController"] --> ASS["AssignmentSubmissionService"]
ASS --> LPC["LatePenaltyCalculator"]
ASS --> ENG["EngagementTracker"]
ASS --> NOTI["NotificationDispatcher"]
ASS --> AUD["AuditLogger"]
GBC["GradebookController"] --> GBS["GradebookService"]
```

**Diagram sources**
- [AssignmentSubmissionController.php:21-24](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L21-L24)
- [AssignmentSubmissionService.php:26-32](file://app/Services/Assessment/AssignmentSubmissionService.php#L26-L32)
- [GradebookController.php:14-14](file://app/Http/Controllers/Api/V1/GradebookController.php#L14-L14)

**Section sources**
- [AssignmentSubmissionController.php:21-24](file://app/Http/Controllers/Api/V1/AssignmentSubmissionController.php#L21-L24)
- [AssignmentSubmissionService.php:26-32](file://app/Services/Assessment/AssignmentSubmissionService.php#L26-L32)
- [GradebookController.php:14-14](file://app/Http/Controllers/Api/V1/GradebookController.php#L14-L14)

## Performance Considerations
- Late penalty calculation queries only the relevant policy tiers and uses ordering to pick the most appropriate tier; ensure indexes on policy_id and hours_late_from/hours_late_to for large datasets.
- Grading replaces rubric scores in a transaction to avoid partial updates and maintain consistency.
- Gradebook queries group and map collections in memory; consider pagination or materialized views if courses have very large enrolment sets.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and checks:
- Missing late penalty: Verify the assignment has a late_penalty_policy_id and that due_at is set; confirm the policy contains at least one tier covering the hours late.
- Incorrect final score: Ensure raw_score is provided during grading and that late_penalty_percent is correctly set at submission time.
- Duplicate rubric scores: The unique constraint on submission_id and rubric_id prevents duplicates; regrading deletes previous scores before inserting new ones.
- Gradebook shows zero: Confirm submissions have final_score set and evaluations have graded attempts; check enrolment status is confirmed.

**Section sources**
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)
- [2024_01_01_000135_create_assignment_submission_rubric_scores_table.php:13-20](file://database/migrations/2024_01_01_000135_create_assignment_submission_rubric_scores_table.php#L13-L20)
- [GradebookService.php:31-119](file://app/services/Assessment/GradebookService.php#L31-L119)

## Conclusion
The grading system combines structured rubrics, per-submission scoring, and configurable late penalties to produce accurate final scores and a comprehensive gradebook view. Rubrics enable detailed feedback per criterion, while late penalty tiers enforce consistent deductions. The service layer centralizes business rules, ensuring reliable computation and consistent state transitions across submission and grading workflows.