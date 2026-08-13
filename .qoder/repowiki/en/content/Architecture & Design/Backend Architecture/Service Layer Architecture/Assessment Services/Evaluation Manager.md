# Evaluation Manager

<cite>
**Referenced Files in This Document**
- [EvaluationManager.php](file://app/Services/Assessment/EvaluationManager.php)
- [EvaluationAttemptService.php](file://app\Services\Assessment\EvaluationAttemptService.php)
- [EvaluationController.php](file://app\Http\Controllers\Api\V1\EvaluationController.php)
- [EvaluationAttemptController.php](file://app\Http\Controllers\Api\V1\EvaluationAttemptController.php)
- [StoreEvaluationRequest.php](file://app\Http\Requests\Api\V1\StoreEvaluationRequest.php)
- [Evaluation.php](file://app\Models\Evaluation.php)
- [EvaluationAttempt.php](file://app\Models\EvaluationAttempt.php)
- [Question.php](file://app\Models\Question.php)
- [QuestionBank.php](file://app\Models\QuestionBank.php)
- [EvaluationPolicy.php](file://app\Policies\EvaluationPolicy.php)
- [EvaluationAttemptPolicy.php](file://app\Policies\EvaluationAttemptPolicy.php)
- [2024_01_01_000143_create_evaluations_table.php](file://database/migrations/2024_01_01_000143_create_evaluations_table.php)
- [2024_01_01_000145_create_evaluation_attempts_table.php](file://database/migrations/2024_01_01_000145_create_evaluation_attempts_table.php)
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
This document explains the Evaluation Manager service and its ecosystem for creating, configuring, publishing, and attempting evaluations (quizzes/tests). It covers how evaluations are linked to question banks, how questions are selected and randomized per attempt, and how business rules such as time limits, pass scores, and attempt restrictions are enforced. It also documents the end-to-end workflows for evaluation creation, question bank management, and student attempts including submission and grading.

## Project Structure
The evaluation feature spans controllers, services, models, policies, and database migrations:
- Controllers expose REST endpoints for managing evaluations and handling attempts.
- Services encapsulate business logic for evaluation lifecycle and attempt processing.
- Models define data structures and relationships between evaluations, attempts, questions, and question banks.
- Policies enforce authorization for viewing, editing, attempting, and grading evaluations.
- Migrations define the schema for evaluations and attempts.

```mermaid
graph TB
subgraph "Controllers"
EC["EvaluationController"]
EAC["EvaluationAttemptController"]
end
subgraph "Services"
EM["EvaluationManager"]
EAS["EvaluationAttemptService"]
end
subgraph "Models"
EV["Evaluation"]
EA["EvaluationAttempt"]
Q["Question"]
QB["QuestionBank"]
end
subgraph "Policies"
EP["EvaluationPolicy"]
EAP["EvaluationAttemptPolicy"]
end
EC --> EM
EAC --> EAS
EM --> EV
EAS --> EA
EA --> EV
EV --> Q
Q --> QB
EC --> EP
EAC --> EAP
```

**Diagram sources**
- [EvaluationController.php:1-50](file://app/Http/Controllers/Api/V1/EvaluationController.php#L1-L50)
- [EvaluationAttemptController.php:1-84](file://app/Http/Controllers/Api/V1/EvaluationAttemptController.php#L1-L84)
- [EvaluationManager.php:1-104](file://app/Services/Assessment/EvaluationManager.php#L1-L104)
- [EvaluationAttemptService.php:1-219](file://app/Services/Assessment/EvaluationAttemptService.php#L1-L219)
- [Evaluation.php:1-63](file://app/Models/Evaluation.php#L1-L63)
- [EvaluationAttempt.php:1-64](file://app/Models/EvaluationAttempt.php#L1-L64)
- [Question.php:1-60](file://app/Models/Question.php#L1-L60)
- [QuestionBank.php:1-41](file://app/Models/QuestionBank.php#L1-L41)
- [EvaluationPolicy.php:1-63](file://app/Policies/EvaluationPolicy.php#L1-L63)
- [EvaluationAttemptPolicy.php:1-28](file://app/Policies/EvaluationAttemptPolicy.php#L1-L28)

**Section sources**
- [EvaluationController.php:1-50](file://app/Http/Controllers/Api/V1/EvaluationController.php#L1-L50)
- [EvaluationAttemptController.php:1-84](file://app/Http/Controllers/Api/V1/EvaluationAttemptController.php#L1-L84)
- [EvaluationManager.php:1-104](file://app/Services/Assessment/EvaluationManager.php#L1-L104)
- [EvaluationAttemptService.php:1-219](file://app/Services/Assessment/EvaluationAttemptService.php#L1-L219)
- [Evaluation.php:1-63](file://app/Models/Evaluation.php#L1-L63)
- [EvaluationAttempt.php:1-64](file://app/Models/EvaluationAttempt.php#L1-L64)
- [Question.php:1-60](file://app/Models/Question.php#L1-L60)
- [QuestionBank.php:1-41](file://app/Models/QuestionBank.php#L1-L41)
- [EvaluationPolicy.php:1-63](file://app/Policies/EvaluationPolicy.php#L1-L63)
- [EvaluationAttemptPolicy.php:1-28](file://app/Policies/EvaluationAttemptPolicy.php#L1-L28)

## Core Components
- EvaluationManager: Creates, updates, and deletes evaluations within a module, and synchronizes linked questions with ordering.
- EvaluationAttemptService: Manages attempt lifecycle, enforces availability windows, attempt limits, time limits, randomization/subsetting, auto-grading, manual grading, scoring, and completion roll-up.
- Models: Evaluation, EvaluationAttempt, Question, QuestionBank define entities and relationships.
- Policies: Control who can create/view/update/delete evaluations, start attempts, and grade submissions.
- Requests: Validate inputs for creating evaluations.

Key responsibilities:
- Evaluation creation ties an Evaluation to a ModuleItem slot and persists linked questions with order.
- Attempt start validates availability and attempt limits; returns sanitized questions without answer keys.
- Submission enforces time limits, records answers, auto-grades objective questions, queues manual grading when needed, and finalizes scores.
- Randomization and subset selection occur at attempt time based on evaluation settings.

**Section sources**
- [EvaluationManager.php:1-104](file://app/Services/Assessment/EvaluationManager.php#L1-L104)
- [EvaluationAttemptService.php:1-219](file://app/Services/Assessment/EvaluationAttemptService.php#L1-L219)
- [Evaluation.php:1-63](file://app/Models/Evaluation.php#L1-L63)
- [EvaluationAttempt.php:1-64](file://app/Models/EvaluationAttempt.php#L1-L64)
- [Question.php:1-60](file://app/Models/Question.php#L1-L60)
- [QuestionBank.php:1-41](file://app/Models/QuestionBank.php#L1-L41)
- [EvaluationPolicy.php:1-63](file://app/Policies/EvaluationPolicy.php#L1-L63)
- [EvaluationAttemptPolicy.php:1-28](file://app/Policies/EvaluationAttemptPolicy.php#L1-L28)
- [StoreEvaluationRequest.php:1-37](file://app/Http/Requests/Api/V1/StoreEvaluationRequest.php#L1-L37)

## Architecture Overview
The system separates authoring from taking:
- Instructors/admins use EvaluationController to create/update/delete evaluations and view full details (including answer keys).
- Students use EvaluationAttemptController to start and submit attempts; they receive only safe question views without answer keys.
- Business rules are centralized in services; policies gate access by role and enrollment status.

```mermaid
sequenceDiagram
participant Admin as "Instructor/Admin"
participant C as "EvaluationController"
participant S as "EvaluationManager"
participant DB as "Database"
Admin->>C : POST /evaluations (module_id)
C->>S : create(module, validatedData)
S->>DB : begin transaction
S->>DB : create Evaluation
S->>DB : sync questions with order_index
S->>DB : create ModuleItem(Evaluation)
S-->>C : Evaluation
C-->>Admin : EvaluationResource
```

**Diagram sources**
- [EvaluationController.php:20-32](file://app/Http/Controllers/Api/V1/EvaluationController.php#L20-L32)
- [EvaluationManager.php:28-49](file://app/Services/Assessment/EvaluationManager.php#L28-L49)
- [StoreEvaluationRequest.php:18-34](file://app/Http/Requests/Api/V1/StoreEvaluationRequest.php#L18-L34)

```mermaid
sequenceDiagram
participant Student as "Student"
participant AC as "EvaluationAttemptController"
participant AS as "EvaluationAttemptService"
participant DB as "Database"
Student->>AC : POST /attempts/start (evaluation_id)
AC->>AS : start(student, evaluation)
AS->>DB : check available_from/until
AS->>DB : count existing attempts
AS->>DB : create EvaluationAttempt (in_progress)
AS-->>AC : Attempt + questions (sanitized)
AC-->>Student : {attempt, questions, evaluation summary}
```

**Diagram sources**
- [EvaluationAttemptController.php:40-61](file://app/Http/Controllers/Api/V1/EvaluationAttemptController.php#L40-L61)
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)

```mermaid
sequenceDiagram
participant Student as "Student"
participant AC as "EvaluationAttemptController"
participant AS as "EvaluationAttemptService"
participant DB as "Database"
Student->>AC : POST /attempts/{id}/submit (answers)
AC->>AS : submit(attempt, answers)
AS->>DB : check time_limit_minutes
AS->>DB : persist answers, auto-grade if possible
alt needs manual grading
AS-->>AC : Attempt (status=submitted)
else fully auto-graded
AS->>AS : finalizeScore()
AS-->>AC : Attempt (status=graded, score, passed)
end
```

**Diagram sources**
- [EvaluationAttemptController.php:70-75](file://app/Http/Controllers/Api/V1/EvaluationAttemptController.php#L70-L75)
- [EvaluationAttemptService.php:102-149](file://app/Services/Assessment/EvaluationAttemptService.php#L102-L149)
- [EvaluationAttemptService.php:183-206](file://app/Services/Assessment/EvaluationAttemptService.php#L183-L206)

## Detailed Component Analysis

### EvaluationManager
Responsibilities:
- Create: Persists an Evaluation within a Module, syncs linked questions with explicit order, and creates a corresponding ModuleItem slot.
- Update: Updates evaluation fields, optionally re-syncs questions, and adjusts ModuleItem properties like required flag and order.
- Delete: Removes the ModuleItem association and then deletes the Evaluation.
- Sync Questions: Uses a many-to-many pivot to store question order via order_index.

```mermaid
flowchart TD
Start(["create(module, data)"]) --> Tx["Begin DB transaction"]
Tx --> EvalCreate["Create Evaluation<br/>with module_id and fields"]
EvalCreate --> SyncQ{"question_ids provided?"}
SyncQ --> |Yes| Sync["Sync questions with order_index"]
SyncQ --> |No| SkipQ["Skip question sync"]
Sync --> ItemCreate["Create ModuleItem(Evaluation)"]
SkipQ --> ItemCreate
ItemCreate --> Commit["Commit transaction"]
Commit --> Return["Return Evaluation"]
```

**Diagram sources**
- [EvaluationManager.php:28-49](file://app/Services/Assessment/EvaluationManager.php#L28-L49)
- [EvaluationManager.php:93-102](file://app/Services/Assessment/EvaluationManager.php#L93-L102)

**Section sources**
- [EvaluationManager.php:28-88](file://app/Services/Assessment/EvaluationManager.php#L28-L88)
- [EvaluationManager.php:93-102](file://app/Services/Assessment/EvaluationManager.php#L93-L102)

### EvaluationAttemptService
Responsibilities:
- Start: Validates availability window, prevents duplicate in-progress attempts, enforces max_attempts, and creates an attempt.
- Questions For: Loads evaluation questions with options, applies randomization and optional subset size.
- Submit: Enforces time limit, records answers, auto-grades objective questions, sets status to submitted or graded accordingly.
- Grade Manual Answers: Allows instructors to grade non-auto-gradable answers and finalize scoring.
- Finalize Score: Computes percentage, determines pass/fail, notifies students, and rolls up module completion on pass.

```mermaid
flowchart TD
Start(["start(student, evaluation)"]) --> Avail["Check available_from/until"]
Avail --> Dup{"Existing in_progress attempt?"}
Dup --> |Yes| ReturnExisting["Return existing attempt"]
Dup --> |No| Count["Count total attempts"]
Count --> Limit{"Exceeded max_attempts?"}
Limit --> |Yes| Abort["Abort: no more attempts allowed"]
Limit --> |No| Create["Create EvaluationAttempt (in_progress)"]
Create --> End(["Return attempt"])
```

**Diagram sources**
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)

```mermaid
flowchart TD
Start(["submit(attempt, answers)"]) --> TimeLimit{"time_limit_minutes set?"}
TimeLimit --> |Yes| CheckTime{"now > deadline?"}
CheckTime --> |Yes| Abort["Abort: time limit exceeded"]
CheckTime --> |No| Persist["Persist answers"]
TimeLimit --> |No| Persist
Persist --> Auto{"auto_gradable?"}
Auto --> |Yes| GradeAuto["Auto-grade and award points"]
Auto --> |No| QueueManual["Mark for manual grading"]
GradeAuto --> Next["Next answer"]
QueueManual --> Next
Next --> Done{"All answers processed?"}
Done --> |No| Persist
Done --> |Yes| Finalize{"Any manual grading needed?"}
Finalize --> |Yes| SetSubmitted["Set status=submitted"]
Finalize --> |No| Score["finalizeScore() -> set status=graded"]
SetSubmitted --> Return(["Return attempt"])
Score --> Return
```

**Diagram sources**
- [EvaluationAttemptService.php:102-149](file://app/Services/Assessment/EvaluationAttemptService.php#L102-L149)
- [EvaluationAttemptService.php:183-206](file://app/Services/Assessment/EvaluationAttemptService.php#L183-L206)

**Section sources**
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)
- [EvaluationAttemptService.php:83-97](file://app/Services/Assessment/EvaluationAttemptService.php#L83-L97)
- [EvaluationAttemptService.php:102-149](file://app/Services/Assessment/EvaluationAttemptService.php#L102-L149)
- [EvaluationAttemptService.php:154-181](file://app/Services/Assessment/EvaluationAttemptService.php#L154-L181)
- [EvaluationAttemptService.php:183-206](file://app/Services/Assessment/EvaluationAttemptService.php#L183-L206)

### Models and Relationships
- Evaluation belongs to Module, has many Attempts, and links to Questions via a pivot that stores order_index.
- EvaluationAttempt belongs to Evaluation and User (student), has many Answers.
- Question belongs to QuestionBank and has many Options; it is linked to Evaluations through the same pivot.

```mermaid
erDiagram
EVALUATIONS {
bigint id PK
bigint module_id FK
string title
text description
decimal pass_score
int max_attempts
int time_limit_minutes
boolean randomize_questions
int questions_per_attempt
datetime available_from
datetime available_until
}
EVALUATION_ATTEMPTS {
bigint id PK
bigint evaluation_id FK
bigint student_id FK
int attempt_number
timestamp started_at
datetime submitted_at
decimal score_percent
boolean passed
enum status
}
EVALUATION_QUESTIONS {
bigint evaluation_id FK
bigint question_id FK
int order_index
}
QUESTIONS {
bigint id PK
bigint question_bank_id FK
enum type
text question_text
decimal points
boolean auto_gradable
}
QUESTION_BANKS {
bigint id PK
bigint course_id FK
string title
}
EVALUATIONS ||--o{ EVALUATION_ATTEMPTS : "has many"
EVALUATIONS }o--o{ QUESTIONS : "many-to-many via evaluation_questions"
QUESTIONS }o--|| QUESTION_BANKS : "belongs to"
EVALUATION_ATTEMPTS }o--|| EVALUATIONS : "belongs to"
```

**Diagram sources**
- [2024_01_01_000143_create_evaluations_table.php:11-26](file://database/migrations/2024_01_01_000143_create_evaluations_table.php#L11-L26)
- [2024_01_01_000145_create_evaluation_attempts_table.php:11-24](file://database/migrations/2024_01_01_000145_create_evaluation_attempts_table.php#L11-L24)
- [Evaluation.php:42-61](file://app/Models/Evaluation.php#L42-L61)
- [EvaluationAttempt.php:40-62](file://app/Models/EvaluationAttempt.php#L40-L62)
- [Question.php:36-58](file://app/Models/Question.php#L36-L58)
- [QuestionBank.php:25-39](file://app/Models/QuestionBank.php#L25-L39)

**Section sources**
- [Evaluation.php:19-61](file://app/Models/Evaluation.php#L19-L61)
- [EvaluationAttempt.php:21-62](file://app/Models/EvaluationAttempt.php#L21-L62)
- [Question.php:22-58](file://app/Models/Question.php#L22-L58)
- [QuestionBank.php:20-39](file://app/Models/QuestionBank.php#L20-L39)

### Authorization and Access Control
- EvaluationPolicy:
  - create/update/delete/view require instructor/admin rights over the evaluation’s course.
  - attempt requires the user to be a student with confirmed enrollment in the evaluation’s course.
- EvaluationAttemptPolicy:
  - view allows admin, the student who owns the attempt, or an instructor teaching the course.

```mermaid
flowchart TD
Req["Authorization Request"] --> Role{"User Role"}
Role --> |Admin| Allow["Allow"]
Role --> |Instructor| CourseCheck{"Teaches course?"}
CourseCheck --> |Yes| Allow
CourseCheck --> |No| Deny["Deny"]
Role --> |Student| EnrollCheck{"Confirmed enrollment in course?"}
EnrollCheck --> |Yes| Allow
EnrollCheck --> |No| Deny
```

**Diagram sources**
- [EvaluationPolicy.php:16-61](file://app/Policies/EvaluationPolicy.php#L16-L61)
- [EvaluationAttemptPolicy.php:13-26](file://app/Policies/EvaluationAttemptPolicy.php#L13-L26)

**Section sources**
- [EvaluationPolicy.php:16-61](file://app/Policies/EvaluationPolicy.php#L16-L61)
- [EvaluationAttemptPolicy.php:13-26](file://app/Policies/EvaluationAttemptPolicy.php#L13-L26)

## Dependency Analysis
- Controllers depend on Services for business logic and on Policies for authorization.
- Services depend on Models for persistence and on other services (e.g., ProgressEngine, NotificationDispatcher, EngagementTracker, AuditLogger) for side effects.
- Models define relationships that enable efficient loading of related data (questions, attempts, options).

```mermaid
graph LR
EC["EvaluationController"] --> EP["EvaluationPolicy"]
EC --> EM["EvaluationManager"]
EAC["EvaluationAttemptController"] --> EAP["EvaluationAttemptPolicy"]
EAC --> EAS["EvaluationAttemptService"]
EAS --> EV["Evaluation"]
EAS --> EA["EvaluationAttempt"]
EV --> Q["Question"]
Q --> QB["QuestionBank"]
```

**Diagram sources**
- [EvaluationController.php:1-50](file://app/Http/Controllers/Api/V1/EvaluationController.php#L1-L50)
- [EvaluationAttemptController.php:1-84](file://app/Http/Controllers/Api/V1/EvaluationAttemptController.php#L1-L84)
- [EvaluationManager.php:1-104](file://app/Services/Assessment/EvaluationManager.php#L1-L104)
- [EvaluationAttemptService.php:1-219](file://app/Services/Assessment/EvaluationAttemptService.php#L1-L219)
- [Evaluation.php:1-63](file://app/Models/Evaluation.php#L1-L63)
- [EvaluationAttempt.php:1-64](file://app/Models/EvaluationAttempt.php#L1-L64)
- [Question.php:1-60](file://app/Models/Question.php#L1-L60)
- [QuestionBank.php:1-41](file://app/Models/QuestionBank.php#L1-L41)
- [EvaluationPolicy.php:1-63](file://app/Policies/EvaluationPolicy.php#L1-L63)
- [EvaluationAttemptPolicy.php:1-28](file://app/Policies/EvaluationAttemptPolicy.php#L1-L28)

**Section sources**
- [EvaluationController.php:1-50](file://app/Http/Controllers/Api/V1/EvaluationController.php#L1-L50)
- [EvaluationAttemptController.php:1-84](file://app/Http/Controllers/Api/V1/EvaluationAttemptController.php#L1-L84)
- [EvaluationManager.php:1-104](file://app/Services/Assessment/EvaluationManager.php#L1-L104)
- [EvaluationAttemptService.php:1-219](file://app/Services/Assessment/EvaluationAttemptService.php#L1-L219)
- [Evaluation.php:1-63](file://app/Models/Evaluation.php#L1-L63)
- [EvaluationAttempt.php:1-64](file://app/Models/EvaluationAttempt.php#L1-L64)
- [Question.php:1-60](file://app/Models/Question.php#L1-L60)
- [QuestionBank.php:1-41](file://app/Models/QuestionBank.php#L1-L41)
- [EvaluationPolicy.php:1-63](file://app/Policies/EvaluationPolicy.php#L1-L63)
- [EvaluationAttemptPolicy.php:1-28](file://app/Policies/EvaluationAttemptPolicy.php#L1-L28)

## Performance Considerations
- Use eager loading for related data in read paths to reduce N+1 queries (e.g., load questions and options when serving evaluation details).
- Keep transactions short and focused around write operations (creation, update, submission) to minimize lock contention.
- Avoid unnecessary shuffling or large subsets when randomize_questions is disabled or when questions_per_attempt equals the total number of questions.
- Indexes on frequently filtered columns (e.g., student_id in attempts) improve query performance during attempt listing and validation.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Cannot start evaluation before open date: Ensure current time is after available_from; otherwise the request is rejected.
- Cannot start evaluation after close date: Ensure current time is before available_until; otherwise the request is rejected.
- Max attempts reached: If max_attempts is set and the student has already used all attempts, starting a new attempt is blocked.
- Time limit exceeded on submit: If time_limit_minutes is configured and the attempt duration exceeds the limit, submission is rejected.
- Manual grading required: Non-auto-gradable questions result in status “submitted” until an instructor grades them; verify answer_grades were provided.
- Not authorized to view/edit: Confirm user role and enrollment status; instructors must teach the course, students must have confirmed enrollment.

**Section sources**
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)
- [EvaluationAttemptService.php:102-149](file://app/Services/Assessment/EvaluationAttemptService.php#L102-L149)
- [EvaluationPolicy.php:16-61](file://app/Policies/EvaluationPolicy.php#L16-L61)
- [EvaluationAttemptPolicy.php:13-26](file://app/Policies/EvaluationAttemptPolicy.php#L13-L26)

## Conclusion
The Evaluation Manager provides a robust framework for building assessments with flexible configuration, secure access control, and reliable attempt handling. Evaluations link to question banks via shared questions, enabling reuse and consistent content management. The system supports deterministic and randomized question selection, strict time and attempt controls, and both automatic and manual grading flows. Policies ensure that only authorized users can manage or take evaluations, while services centralize complex business logic for consistency and maintainability.