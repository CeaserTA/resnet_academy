# Assessment Services

<cite>
**Referenced Files in This Document**
- [AssignmentManager.php](file://app/Services/Assessment/AssignmentManager.php)
- [EvaluationManager.php](file://app/Services/Assessment/EvaluationManager.php)
- [QuestionManager.php](file://app/Services/Assessment/QuestionManager.php)
- [AssignmentSubmissionService.php](file://app/Services/Assessment/AssignmentSubmissionService.php)
- [EvaluationAttemptService.php](file://app/Services/Assessment/EvaluationAttemptService.php)
- [LatePenaltyCalculator.php](file://app/Services/Assessment/LatePenaltyCalculator.php)
- [GradebookService.php](file://app/Services/Assessment/GradebookService.php)
- [Assignment.php](file://app/Models/Assignment.php)
- [AssignmentSubmission.php](file://app/Models/AssignmentSubmission.php)
- [Evaluation.php](file://app/Models/Evaluation.php)
- [EvaluationAttempt.php](file://app/Models/EvaluationAttempt.php)
- [Question.php](file://app/Models/Question.php)
- [QuestionBank.php](file://app/Models/QuestionBank.php)
- [LatePenaltyPolicy.php](file://app/Models/LatePenaltyPolicy.php)
- [LatePenaltyTier.php](file://app/Models/LatePenaltyTier.php)
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
This document explains the Assessment Services layer that implements all assessment-related business logic. It covers assignment and evaluation lifecycle management, question bank operations, submission processing, grading workflows (including rubric-based scoring), automated scoring for objective questions, late penalty calculations, and grade aggregation for a course gradebook. The services coordinate Eloquent models to enforce consistent rules around attempts, time limits, randomization, pass thresholds, and module completion rollups.

## Project Structure
The Assessment Services are organized under app/Services/Assessment and interact with domain models under app/Models. Managers handle creation/update/delete of assessments and their related items; specialized services orchestrate submissions, attempts, grading, penalties, notifications, audit logging, engagement tracking, and progress rollups. GradebookService aggregates scores across assignments and evaluations per student.

```mermaid
graph TB
subgraph "Assessment Services"
AM["AssignmentManager"]
EM["EvaluationManager"]
QM["QuestionManager"]
ASS["AssignmentSubmissionService"]
EAS["EvaluationAttemptService"]
LPC["LatePenaltyCalculator"]
GBS["GradebookService"]
end
subgraph "Models"
A["Assignment"]
AS["AssignmentSubmission"]
E["Evaluation"]
EA["EvaluationAttempt"]
Q["Question"]
QB["QuestionBank"]
LPP["LatePenaltyPolicy"]
LPT["LatePenaltyTier"]
end
AM --> A
EM --> E
QM --> Q
QM --> QB
ASS --> AS
ASS --> LPC
EAS --> EA
EAS --> Q
GBS --> A
GBS --> E
GBS --> AS
GBS --> EA
A --> LPP
LPP --> LPT
```

**Diagram sources**
- [AssignmentManager.php:26-49](file://app/Services/Assessment/AssignmentManager.php#L26-L49)
- [EvaluationManager.php:28-48](file://app/Services/Assessment/EvaluationManager.php#L28-L48)
- [QuestionManager.php:24-47](file://app/Services/Assessment/QuestionManager.php#L24-L47)
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)
- [Assignment.php:19-69](file://app/Models/Assignment.php#L19-L69)
- [AssignmentSubmission.php:22-87](file://app/Models/AssignmentSubmission.php#L22-L87)
- [Evaluation.php:19-61](file://app/Models/Evaluation.php#L19-L61)
- [EvaluationAttempt.php:21-62](file://app/Models/EvaluationAttempt.php#L21-L62)
- [Question.php:22-58](file://app/Models/Question.php#L22-L58)
- [QuestionBank.php:20-38](file://app/Models/QuestionBank.php#L20-L38)
- [LatePenaltyPolicy.php:19-36](file://app/Models/LatePenaltyPolicy.php#L19-L36)
- [LatePenaltyTier.php:19-35](file://app/Models/LatePenaltyTier.php#L19-L35)

**Section sources**
- [AssignmentManager.php:26-49](file://app/Services/Assessment/AssignmentManager.php#L26-L49)
- [EvaluationManager.php:28-48](file://app/Services/Assessment/EvaluationManager.php#L28-L48)
- [QuestionManager.php:24-47](file://app/Services/Assessment/QuestionManager.php#L24-L47)
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

## Core Components
- AssignmentManager: Creates, updates, and deletes assignments while synchronizing rubrics and linking them as module items.
- EvaluationManager: Creates, updates, and deletes evaluations while synchronizing question sets and linking them as module items.
- QuestionManager: Creates questions within a question bank, deriving auto-grading capability from question type and persisting options.
- AssignmentSubmissionService: Handles student submissions, computes late penalties, records rubric scores during grading, triggers notifications, audits changes, and rolls up module completion on submit.
- EvaluationAttemptService: Manages attempt lifecycle (start, questions retrieval, submit), enforces availability windows, attempt limits, time limits, randomization/subsetting, auto-grades objective answers, queues manual grading when needed, finalizes scores, notifies students, and marks module complete on pass.
- LatePenaltyCalculator: Computes tiered late penalty percentages based on configured policy tiers and hours late.
- GradebookService: Aggregates latest assignment scores and best evaluation attempts per student to compute a final grade percentage for the course.

**Section sources**
- [AssignmentManager.php:26-92](file://app/Services/Assessment/AssignmentManager.php#L26-L92)
- [EvaluationManager.php:28-87](file://app/Services/Assessment/EvaluationManager.php#L28-L87)
- [QuestionManager.php:24-53](file://app/Services/Assessment/QuestionManager.php#L24-L53)
- [AssignmentSubmissionService.php:37-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L115)
- [EvaluationAttemptService.php:35-205](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L205)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

## Architecture Overview
The services follow a clear separation of concerns:
- Managers encapsulate CRUD and synchronization of assessment definitions and their relationships to modules and content.
- Submission and attempt services encapsulate workflow logic, integrating cross-cutting concerns like notifications, auditing, engagement tracking, and progress rollups.
- Calculators provide pure functions for scoring and penalties.
- Models define data contracts and relationships used by services.

```mermaid
sequenceDiagram
participant Student as "Student"
participant Controller as "API Controller"
participant SubSvc as "AssignmentSubmissionService"
participant LPC as "LatePenaltyCalculator"
participant PE as "ProgressEngine"
participant DB as "Database"
Student->>Controller : "Submit assignment"
Controller->>SubSvc : "submit(student, assignment, payload)"
SubSvc->>DB : "Create AssignmentSubmission"
SubSvc->>LPC : "penaltyPercentFor(policy, due_at, submitted_at)"
LPC-->>SubSvc : "penalty %"
SubSvc->>PE : "rollupModuleCompletion(student, module)"
SubSvc-->>Controller : "Submission created"
Controller-->>Student : "201 Created"
```

**Diagram sources**
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

## Detailed Component Analysis

### AssignmentManager
Responsibilities:
- Create an assignment within a module, set core fields, synchronize rubrics, and register it as a module item.
- Update assignment fields and optionally replace rubrics; update module item ordering and required flag if provided.
- Delete an assignment by removing its module item and then deleting the assignment.

Key behaviors:
- Rubric sync replaces all rubric rows atomically to avoid diff complexity.
- Module item creation uses order_index defaults to append at the end if not specified.

```mermaid
flowchart TD
Start(["create(module, data)"]) --> Txn["Begin transaction"]
Txn --> CreateA["Create Assignment"]
CreateA --> SyncRubrics{"rubrics provided?"}
SyncRubrics --> |Yes| ReplaceRubrics["Delete existing rubrics<br/>Insert new rubrics with order_index"]
SyncRubrics --> |No| SkipRubrics["Skip"]
ReplaceRubrics --> CreateMI["Create ModuleItem (Assignment)"]
SkipRubrics --> CreateMI
CreateMI --> Commit["Commit transaction"]
Commit --> ReturnA["Return Assignment"]
```

**Diagram sources**
- [AssignmentManager.php:26-49](file://app/Services/Assessment/AssignmentManager.php#L26-L49)
- [AssignmentManager.php:97-113](file://app/Services/Assessment/AssignmentManager.php#L97-L113)

**Section sources**
- [AssignmentManager.php:26-92](file://app/Services/Assessment/AssignmentManager.php#L26-L92)
- [Assignment.php:19-69](file://app/Models/Assignment.php#L19-L69)

### EvaluationManager
Responsibilities:
- Create an evaluation within a module, set configuration fields, synchronize question associations, and register it as a module item.
- Update evaluation fields and optionally replace the question set; update module item ordering and required flag if provided.
- Delete an evaluation by removing its module item and then deleting the evaluation.

Key behaviors:
- Question sync preserves order via pivot order_index.
- Availability windows and attempt settings are stored on the evaluation model.

```mermaid
flowchart TD
Start(["create(module, data)"]) --> Txn["Begin transaction"]
Txn --> CreateE["Create Evaluation"]
CreateE --> SyncQs{"question_ids provided?"}
SyncQs --> |Yes| SyncAssoc["Sync evaluation_questions with order_index"]
SyncQs --> |No| SkipQs["Skip"]
SyncAssoc --> CreateMI["Create ModuleItem (Evaluation)"]
SkipQs --> CreateMI
CreateMI --> Commit["Commit transaction"]
Commit --> ReturnE["Return Evaluation"]
```

**Diagram sources**
- [EvaluationManager.php:28-48](file://app/Services/Assessment/EvaluationManager.php#L28-L48)
- [EvaluationManager.php:93-102](file://app/Services/Assessment/EvaluationManager.php#L93-L102)

**Section sources**
- [EvaluationManager.php:28-87](file://app/Services/Assessment/EvaluationManager.php#L28-L87)
- [Evaluation.php:19-61](file://app/Models/Evaluation.php#L19-L61)

### QuestionManager
Responsibilities:
- Create a question within a question bank, derive auto_gradable from question type, persist options, and return the fresh question.
- Delete a question.

Key behaviors:
- Auto-grading is enforced server-side based on allowed types; client input cannot override this.

```mermaid
classDiagram
class Question {
+int id
+string type
+string question_text
+decimal points
+boolean auto_gradable
}
class QuestionOption {
+int id
+int question_id
+string option_text
+boolean is_correct
+int order_index
}
class QuestionBank {
+int id
+string title
}
Question --> QuestionBank : "belongs to"
Question --> QuestionOption : "has many"
```

**Diagram sources**
- [QuestionManager.php:24-47](file://app/Services/Assessment/QuestionManager.php#L24-L47)
- [Question.php:22-58](file://app/Models/Question.php#L22-L58)
- [QuestionBank.php:20-38](file://app/Models/QuestionBank.php#L20-L38)

**Section sources**
- [QuestionManager.php:24-53](file://app/Services/Assessment/QuestionManager.php#L24-L53)
- [Question.php:22-58](file://app/Models/Question.php#L22-L58)
- [QuestionBank.php:20-38](file://app/Models/QuestionBank.php#L20-L38)

### AssignmentSubmissionService
Responsibilities:
- Submit a student’s assignment, compute late penalty, record attempt number, track engagement, and roll up module completion immediately upon submission.
- Grade a submission: apply late penalty to raw score, persist rubric scores, notify the student, log audit events, and mark status graded.

Grading formula:
- final_score = round(raw_score * (1 - late_penalty_percent / 100), 2)

```mermaid
sequenceDiagram
participant Student as "Student"
participant Service as "AssignmentSubmissionService"
participant Calc as "LatePenaltyCalculator"
participant Progress as "ProgressEngine"
participant DB as "Database"
Student->>Service : "submit(student, assignment, payload)"
Service->>Calc : "penaltyPercentFor(policy, due_at, now)"
Calc-->>Service : "penalty %"
Service->>DB : "Create AssignmentSubmission (attempt_number++)"
Service->>Progress : "rollupModuleCompletion(student, module)"
Service-->>Student : "Submission created"
Note over Service,DB : "grade(grader, submission, data)"
Service->>DB : "Update raw_score, final_score, status=Graded"
Service->>DB : "Persist rubric scores"
Service-->>Student : "Notification sent"
```

**Diagram sources**
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

**Section sources**
- [AssignmentSubmissionService.php:37-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L115)
- [AssignmentSubmission.php:22-87](file://app/Models/AssignmentSubmission.php#L22-L87)

### EvaluationAttemptService
Responsibilities:
- Start an attempt with availability checks, attempt limit enforcement, and duplicate in-progress prevention.
- Retrieve questions with optional randomization and subset selection.
- Submit answers: enforce time limit, auto-grade objective questions, queue manual grading for non-auto-gradable questions, finalize scores, notify students, and mark module complete on pass.
- Grade manual answers and finalize scores.

Scoring and pass logic:
- score_percent = sum(points_awarded) / sum(question.points) * 100
- passed = score_percent >= pass_score

```mermaid
sequenceDiagram
participant Student as "Student"
participant Svc as "EvaluationAttemptService"
participant DB as "Database"
participant Progress as "ProgressEngine"
Student->>Svc : "start(evaluation)"
Svc->>DB : "Check availability & attempt limits"
Svc->>DB : "Create Attempt (status=InProgress)"
Svc-->>Student : "Attempt started"
Student->>Svc : "questionsFor(attempt)"
Svc-->>Student : "Questions (optional shuffle & subset)"
Student->>Svc : "submit(attempt, answers)"
Svc->>DB : "Enforce time limit"
Svc->>DB : "Create answers (auto-grade if possible)"
alt Needs manual grading
Svc->>DB : "Set status=Submitted"
Svc-->>Student : "Await grading"
else All auto-gradable
Svc->>Svc : "finalizeScore()"
Svc->>DB : "score_percent, passed, status=Graded"
Svc->>Progress : "rollupModuleCompletion if passed"
Svc-->>Student : "Notification sent"
end
```

**Diagram sources**
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)
- [EvaluationAttemptService.php:83-97](file://app/Services/Assessment/EvaluationAttemptService.php#L83-L97)
- [EvaluationAttemptService.php:102-149](file://app/Services/Assessment/EvaluationAttemptService.php#L102-L149)
- [EvaluationAttemptService.php:154-181](file://app/Services/Assessment/EvaluationAttemptService.php#L154-L181)
- [EvaluationAttemptService.php:183-205](file://app/Services/Assessment/EvaluationAttemptService.php#L183-L205)

**Section sources**
- [EvaluationAttemptService.php:35-205](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L205)
- [EvaluationAttempt.php:21-62](file://app/Models/EvaluationAttempt.php#L21-L62)
- [Evaluation.php:19-61](file://app/Models/Evaluation.php#L19-L61)
- [Question.php:22-58](file://app/Models/Question.php#L22-L58)

### LatePenaltyCalculator
Responsibilities:
- Compute penalty percentage based on hours late and configured policy tiers. Returns zero if no policy or submission is on time.

Algorithm:
- Determine hours_late = due_at to submitted_at difference in hours.
- Select the highest matching tier where hours_late_from <= hours_late and (hours_late_to is null or > hours_late).
- Return tier.penalty_percent or 0.0.

```mermaid
flowchart TD
Start(["penaltyPercentFor(policy, dueAt, submittedAt)"]) --> CheckPolicy{"policy exists AND submitted after due?"}
CheckPolicy --> |No| ReturnZero["Return 0.0"]
CheckPolicy --> |Yes| HoursLate["Compute hoursLate"]
HoursLate --> FindTier["Find matching tier by hours ranges"]
FindTier --> HasTier{"tier found?"}
HasTier --> |Yes| ReturnTier["Return tier.penalty_percent"]
HasTier --> |No| ReturnZero
```

**Diagram sources**
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

**Section sources**
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [LatePenaltyPolicy.php:19-36](file://app/Models/LatePenaltyPolicy.php#L19-L36)
- [LatePenaltyTier.php:19-35](file://app/Models/LatePenaltyTier.php#L19-L35)

### GradebookService
Responsibilities:
- Build a per-course gradebook including all assignments and evaluations, latest submission scores per student, best evaluation attempt scores per student, and a final grade percentage.

Aggregation rules:
- For each student, pick the latest submission per assignment (by attempt_number) with a final_score.
- For each student, pick the best evaluation attempt per evaluation (highest score_percent) that is graded.
- Final grade percent = (sum of assignment final_scores + sum of evaluation best_score_percent) / (sum of assignment max_scores + count(evaluations) * 100).

```mermaid
flowchart TD
Start(["forCourse(course)"]) --> Load["Load modules, assignments, evaluations, confirmed students"]
Load --> Submissions["Group latest submissions per student by assignment"]
Load --> Attempts["Group best attempts per student by evaluation"]
Submissions --> BuildRows["Build per-student rows with scores"]
Attempts --> BuildRows
BuildRows --> Final["Compute final_grade_percent"]
Final --> Return["Return assignments, evaluations, students"]
```

**Diagram sources**
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

**Section sources**
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

## Dependency Analysis
- AssignmentManager depends on Assignment, AssignmentRubric, Module, ModuleItem.
- EvaluationManager depends on Evaluation, Question (via pivot), Module, ModuleItem.
- QuestionManager depends on Question, QuestionOption, QuestionBank.
- AssignmentSubmissionService depends on AssignmentSubmission, LatePenaltyCalculator, ProgressEngine, NotificationDispatcher, EngagementTracker, AuditLogger.
- EvaluationAttemptService depends on EvaluationAttempt, EvaluationAttemptAnswer, Question, ProgressEngine, NotificationDispatcher, EngagementTracker, AuditLogger.
- LatePenaltyCalculator depends on LatePenaltyPolicy and LatePenaltyTier.
- GradebookService depends on Assignment, AssignmentSubmission, Evaluation, EvaluationAttempt, Course, Enrolment, User.

```mermaid
graph LR
AM["AssignmentManager"] --> A["Assignment"]
AM --> MI["ModuleItem"]
EM["EvaluationManager"] --> E["Evaluation"]
EM --> EQ["evaluation_questions"]
QM["QuestionManager"] --> Q["Question"]
QM --> QB["QuestionBank"]
ASS["AssignmentSubmissionService"] --> AS["AssignmentSubmission"]
ASS --> LPC["LatePenaltyCalculator"]
EAS["EvaluationAttemptService"] --> EA["EvaluationAttempt"]
EAS --> Q
GBS["GradebookService"] --> A
GBS --> E
GBS --> AS
GBS --> EA
LPC --> LPP["LatePenaltyPolicy"]
LPP --> LPT["LatePenaltyTier"]
```

**Diagram sources**
- [AssignmentManager.php:26-92](file://app/Services/Assessment/AssignmentManager.php#L26-L92)
- [EvaluationManager.php:28-87](file://app/Services/Assessment/EvaluationManager.php#L28-L87)
- [QuestionManager.php:24-53](file://app/Services/Assessment/QuestionManager.php#L24-L53)
- [AssignmentSubmissionService.php:37-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L115)
- [EvaluationAttemptService.php:35-205](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L205)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

**Section sources**
- [AssignmentManager.php:26-92](file://app/Services/Assessment/AssignmentManager.php#L26-L92)
- [EvaluationManager.php:28-87](file://app/Services/Assessment/EvaluationManager.php#L28-L87)
- [QuestionManager.php:24-53](file://app/Services/Assessment/QuestionManager.php#L24-L53)
- [AssignmentSubmissionService.php:37-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L115)
- [EvaluationAttemptService.php:35-205](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L205)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)
- [GradebookService.php:31-119](file://app/Services/Assessment/GradebookService.php#L31-L119)

## Performance Considerations
- Use database transactions for multi-step writes to ensure consistency (assignment/rubric/module item creation; evaluation/question sync; submission grading).
- Prefer batch operations where possible (e.g., syncing rubrics by delete+insert; syncing evaluation questions via pivot sync).
- Avoid N+1 queries in gradebook generation by eager loading relationships and grouping in memory efficiently.
- Keep calculation functions pure and side-effect free (e.g., LatePenaltyCalculator) to enable caching or testing.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Evaluation not available: Ensure current time falls within available_from and available_until; otherwise start() will abort with a 403.
- Attempt limit exceeded: If max_attempts is set, further starts will be blocked once reached.
- Time limit exceeded: Submitting answers after the time window results in a validation error.
- Manual grading required: Non-auto-gradable questions leave the attempt in Submitted until graded; ensure graders review and finalize.
- Late penalty not applied: Verify assignment has a late penalty policy and due_at is set; confirm submitted_at is after due_at.
- Rubric scores missing: When grading assignments, ensure rubric_scores are included in the grade request; they replace previous rubric scores.

**Section sources**
- [EvaluationAttemptService.php:35-78](file://app/Services/Assessment/EvaluationAttemptService.php#L35-L78)
- [EvaluationAttemptService.php:102-149](file://app/Services/Assessment/EvaluationAttemptService.php#L102-L149)
- [AssignmentSubmissionService.php:37-67](file://app/Services/Assessment/AssignmentSubmissionService.php#L37-L67)
- [AssignmentSubmissionService.php:72-115](file://app/Services/Assessment/AssignmentSubmissionService.php#L72-L115)
- [LatePenaltyCalculator.php:17-34](file://app/Services/Assessment/LatePenaltyCalculator.php#L17-L34)

## Conclusion
The Assessment Services layer provides a robust, transactional, and extensible foundation for managing assignments, evaluations, questions, submissions, attempts, grading, penalties, and grade aggregation. By separating managers, workflow services, calculators, and models, the system remains maintainable and testable while enforcing key educational policies such as attempt limits, time windows, rubric-based grading, and late penalties.

[No sources needed since this section summarizes without analyzing specific files]