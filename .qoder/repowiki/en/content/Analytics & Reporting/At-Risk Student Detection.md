# At-Risk Student Detection

<cite>
**Referenced Files in This Document**
- [AnalyticsService.php](file://app/Services/Analytics/AnalyticsService.php)
- [NotificationDispatcher.php](file://app/Services/Notifications/NotificationDispatcher.php)
- [EngagementEvent.php](file://app/Models/EngagementEvent.php)
- [AssignmentSubmission.php](file://app/Models/AssignmentSubmission.php)
- [AnalyticsController.php](file://app/Http/Controllers/Api/V1/AnalyticsController.php)
- [AtRiskStudentsTable.tsx](file://frontend/src/features/analytics/AtRiskStudentsTable.tsx)
- [useAnalytics.ts](file://frontend/src/features/analytics/useAnalytics.ts)
- [api.ts (analytics)](file://frontend/src/features/analytics/api.ts)
- [types.ts](file://frontend/src/lib/api/types.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document explains the At-Risk Student Detection and intervention system. It covers how the system identifies students at risk using enrollment timing, activity patterns, and assignment completion status; how grace period and inactivity window thresholds are applied; how risk categories are assigned; and how automated notifications are dispatched to at-risk students. It also documents the mass notification workflow that instructors can trigger from the analytics dashboard.

## Project Structure
The at-risk detection logic is implemented in a service layer with supporting models and a notification dispatcher. The frontend exposes an analytics view where instructors can see flagged students and send a mass notice.

```mermaid
graph TB
subgraph "Frontend"
ART["AtRiskStudentsTable.tsx"]
UA["useAnalytics.ts"]
AA["analytics api.ts"]
TT["types.ts"]
end
subgraph "Backend API"
AC["AnalyticsController.php"]
end
subgraph "Domain Services"
AS["AnalyticsService.php"]
ND["NotificationDispatcher.php"]
end
subgraph "Data Models"
EE["EngagementEvent.php"]
ASS["AssignmentSubmission.php"]
end
ART --> UA --> AA --> AC --> AS --> ND
AS --> EE
AS --> ASS
TT -. types .-> ART
```

**Diagram sources**
- [AtRiskStudentsTable.tsx:11-51](file://frontend/src/features/analytics/AtRiskStudentsTable.tsx#L11-L51)
- [useAnalytics.ts:1-27](file://frontend/src/features/analytics/useAnalytics.ts#L1-L27)
- [api.ts (analytics):1-24](file://frontend/src/features/analytics/api.ts#L1-L24)
- [AnalyticsController.php:13-38](file://app/Http/Controllers/Api/V1/AnalyticsController.php#L13-L38)
- [AnalyticsService.php:39-142](file://app/Services/Analytics/AnalyticsService.php#L39-L142)
- [NotificationDispatcher.php:25-205](file://app/Services/Notifications/NotificationDispatcher.php#L25-L205)
- [EngagementEvent.php:12-45](file://app/Models/EngagementEvent.php#L12-L45)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)

**Section sources**
- [AnalyticsService.php:39-142](file://app/Services/Analytics/AnalyticsService.php#L39-L142)
- [NotificationDispatcher.php:25-205](file://app/Services/Notifications/NotificationDispatcher.php#L25-L205)
- [AnalyticsController.php:13-38](file://app/Http/Controllers/Api/V1/AnalyticsController.php#L13-L38)
- [AtRiskStudentsTable.tsx:11-51](file://frontend/src/features/analytics/AtRiskStudentsTable.tsx#L11-L51)

## Core Components
- AnalyticsService: Implements the at-risk algorithm, computes risk factors, and triggers mass notifications.
- NotificationDispatcher: Writes in-app notifications for reminders and other events.
- EngagementEvent model: Stores per-student, per-course engagement timestamps used to determine last activity.
- AssignmentSubmission model: Used to check whether overdue assignments have been submitted when computing risk factors.
- AnalyticsController: Exposes endpoints for course analytics and sending mass notices to at-risk students.
- Frontend analytics UI: Displays at-risk students and allows instructors to send a mass notice.

Key behaviors:
- Grace period: Students enrolled within the last 7 days are not considered at-risk yet.
- Inactivity window: Students without any engagement in the last 14 days are considered inactive.
- Risk categories:
  - No activity: No recorded engagement for the student in the course.
  - Assignment backlog: Overdue assignments exist and at least one has no submission.
  - Inactive: Meets at-risk criteria but does not match the above two conditions.

**Section sources**
- [AnalyticsService.php:41-45](file://app/Services/Analytics/AnalyticsService.php#L41-L45)
- [AnalyticsService.php:166-213](file://app/Services/Analytics/AnalyticsService.php#L166-L213)
- [NotificationDispatcher.php:190-205](file://app/Services/Notifications/NotificationDispatcher.php#L190-L205)
- [EngagementEvent.php:12-45](file://app/Models/EngagementEvent.php#L12-L45)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)

## Architecture Overview
The system follows a layered architecture:
- Frontend analytics UI calls the backend API to fetch course analytics and to send mass notices.
- The controller authorizes access and delegates to the AnalyticsService.
- AnalyticsService applies the at-risk rules using engagement data and assignment submissions, then optionally dispatches notifications via NotificationDispatcher.
- Notifications are persisted as in-app messages for students to view later.

```mermaid
sequenceDiagram
participant UI as "AtRiskStudentsTable.tsx"
participant FE_API as "analytics api.ts"
participant CTRL as "AnalyticsController.php"
participant SVC as "AnalyticsService.php"
participant ENG as "EngagementEvent.php"
participant SUB as "AssignmentSubmission.php"
participant NDIS as "NotificationDispatcher.php"
UI->>FE_API : "fetchCourseAnalytics(courseId)"
FE_API->>CTRL : "GET /courses/{id}/analytics"
CTRL->>SVC : "courseAnalytics(course)"
SVC->>ENG : "last engagement per student"
SVC->>SUB : "overdue assignments and submissions"
SVC-->>CTRL : "at-risk list + metrics"
CTRL-->>UI : "analytics payload"
UI->>FE_API : "notifyAtRiskStudents(courseId, message?)"
FE_API->>CTRL : "POST /courses/{id}/at-risk-notice"
CTRL->>SVC : "notifyAtRiskStudents(course, message)"
SVC->>SVC : "apply grace period & inactivity window"
SVC->>NDIS : "notifyAtRiskReminder(student, course, message)"
NDIS-->>SVC : "notification created"
SVC-->>CTRL : "notified count"
CTRL-->>UI : "{ notified }"
```

**Diagram sources**
- [AtRiskStudentsTable.tsx:11-51](file://frontend/src/features/analytics/AtRiskStudentsTable.tsx#L11-L51)
- [api.ts (analytics):1-24](file://frontend/src/features/analytics/api.ts#L1-L24)
- [AnalyticsController.php:17-38](file://app/Http/Controllers/Api/V1/AnalyticsController.php#L17-L38)
- [AnalyticsService.php:56-142](file://app/Services/Analytics/AnalyticsService.php#L56-L142)
- [EngagementEvent.php:12-45](file://app/Models/EngagementEvent.php#L12-L45)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [NotificationDispatcher.php:190-205](file://app/Services/Notifications/NotificationDispatcher.php#L190-L205)

## Detailed Component Analysis

### At-Risk Algorithm and Risk Factors
The core decision logic determines whether a student is at-risk based on:
- Enrollment timing: If a student enrolled after the grace cutoff (7 days ago), they are not at-risk yet.
- Activity level: If there is no engagement event or the last engagement is older than 14 days, they meet the inactivity condition.
- Completion: Completed students (certificates issued) are excluded.

Risk factor classification:
- No activity: No engagement record exists for the student in the course.
- Assignment backlog: There are overdue assignments for the course, and the student has not submitted all of them.
- Inactive: The student meets at-risk criteria but does not fall into the previous two categories.

```mermaid
flowchart TD
Start(["Start"]) --> LoadEnrolments["Load confirmed enrolments for course"]
LoadEnrolments --> GetCompleted["Get completed student IDs"]
GetCompleted --> GetEngagement["Get last engagement per student"]
GetEngagement --> ComputeCutoffs["Compute grace cutoff (7 days) and inactivity threshold (14 days)"]
ComputeCutoffs --> FilterLoop{"For each enrolment"}
FilterLoop --> |Completed| Skip["Skip"]
FilterLoop --> |Enrolled after grace cutoff| Skip
FilterLoop --> |No engagement or last engagement > 14 days| MarkAtRisk["Mark as at-risk"]
MarkAtRisk --> Classify["Classify risk factor"]
Classify --> NoActivity{"Any engagement?"}
NoActivity --> |No| Factor1["No activity"]
NoActivity --> |Yes| CheckBacklog{"Overdue assignments exist?"}
CheckBacklog --> |No| Factor3["Inactive"]
CheckBacklog --> |Yes| SubmittedAll{"All overdue assignments submitted?"}
SubmittedAll --> |No| Factor2["Assignment backlog"]
SubmittedAll --> |Yes| Factor3
Skip --> Next["Next enrolment"]
Factor1 --> Next
Factor2 --> Next
Factor3 --> Next
```

**Diagram sources**
- [AnalyticsService.php:166-213](file://app/Services/Analytics/AnalyticsService.php#L166-L213)

**Section sources**
- [AnalyticsService.php:166-213](file://app/Services/Analytics/AnalyticsService.php#L166-L213)

### Mass Notification Workflow
Instructors can send a mass notice to all currently at-risk students in a course. The flow:
1. Frontend component triggers mutation to notify at-risk students.
2. API endpoint validates and authorizes the request.
3. Service recomputes at-risk set using the same rule as analytics.
4. For each at-risk student, a reminder notification is dispatched.
5. Response returns the number of students notified.

```mermaid
sequenceDiagram
participant UI as "AtRiskStudentsTable.tsx"
participant FE as "analytics api.ts"
participant CTRL as "AnalyticsController.php"
participant SVC as "AnalyticsService.php"
participant NDIS as "NotificationDispatcher.php"
UI->>FE : "mutate notifyAtRiskStudents(courseId, message?)"
FE->>CTRL : "POST /courses/{id}/at-risk-notice { message }"
CTRL->>SVC : "notifyAtRiskStudents(course, message)"
SVC->>SVC : "recompute at-risk enrolments"
loop "for each at-risk student"
SVC->>NDIS : "notifyAtRiskReminder(student, course, message)"
end
SVC-->>CTRL : "count"
CTRL-->>UI : "{ notified : count }"
```

**Diagram sources**
- [AtRiskStudentsTable.tsx:11-51](file://frontend/src/features/analytics/AtRiskStudentsTable.tsx#L11-L51)
- [api.ts (analytics):9-14](file://frontend/src/features/analytics/api.ts#L9-L14)
- [AnalyticsController.php:24-38](file://app/Http/Controllers/Api/V1/AnalyticsController.php#L24-L38)
- [AnalyticsService.php:119-142](file://app/Services/Analytics/AnalyticsService.php#L119-L142)
- [NotificationDispatcher.php:190-205](file://app/Services/Notifications/NotificationDispatcher.php#L190-L205)

**Section sources**
- [AnalyticsController.php:24-38](file://app/Http/Controllers/Api/V1/AnalyticsController.php#L24-L38)
- [AnalyticsService.php:119-142](file://app/Services/Analytics/AnalyticsService.php#L119-L142)
- [NotificationDispatcher.php:190-205](file://app/Services/Notifications/NotificationDispatcher.php#L190-L205)
- [AtRiskStudentsTable.tsx:11-51](file://frontend/src/features/analytics/AtRiskStudentsTable.tsx#L11-L51)

### Data Model Interactions
- EngagementEvent: Provides per-student last engagement timestamps per course.
- AssignmentSubmission: Used to determine if overdue assignments have been submitted by a student.
- Notification: Created by NotificationDispatcher for at-risk reminders and other system events.

```mermaid
classDiagram
class EngagementEvent {
+student_id
+course_id
+event_type
+event_meta
+created_at
}
class AssignmentSubmission {
+assignment_id
+student_id
+attempt_number
+submitted_at
+is_late
+status
+raw_score
+final_score
}
class Notification {
+user_id
+channel
+type
+title
+body
+related_entity_type
+related_entity_id
+sent_at
}
class AnalyticsService {
+courseAnalytics(course)
+notifyAtRiskStudents(course, message)
-atRiskEnrolments(...)
-riskFactor(...)
}
class NotificationDispatcher {
+notify(user, type, title, body, relatedEntityType, relatedEntityId)
+notifyAtRiskReminder(student, course, message)
}
AnalyticsService --> EngagementEvent : "reads last engagement"
AnalyticsService --> AssignmentSubmission : "checks overdue submissions"
AnalyticsService --> NotificationDispatcher : "dispatches reminders"
NotificationDispatcher --> Notification : "creates"
```

**Diagram sources**
- [EngagementEvent.php:12-45](file://app/Models/EngagementEvent.php#L12-L45)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [AnalyticsService.php:39-142](file://app/Services/Analytics/AnalyticsService.php#L39-L142)
- [NotificationDispatcher.php:25-205](file://app/Services/Notifications/NotificationDispatcher.php#L25-L205)

**Section sources**
- [EngagementEvent.php:12-45](file://app/Models/EngagementEvent.php#L12-L45)
- [AssignmentSubmission.php:15-89](file://app/Models/AssignmentSubmission.php#L15-L89)
- [NotificationDispatcher.php:25-205](file://app/Services/Notifications/NotificationDispatcher.php#L25-L205)

### Concrete Examples of Flagging and Intervention
- Example 1: A student enrolled more than 7 days ago with no engagement events will be flagged as at-risk with risk factor “No activity”.
- Example 2: A student with recent engagement but multiple overdue assignments, some unsubmitted, will be flagged with risk factor “Assignment backlog”.
- Example 3: A student with engagement within the last 14 days but still behind on work may be classified as “Inactive” if they do not meet the first two conditions.

Intervention:
- Instructors open the analytics page, review the at-risk list, and click “Send notice”.
- The system sends an in-app reminder to each at-risk student with a default or custom message.
- Students can later view these reminders in their in-app notification inbox.

**Section sources**
- [AnalyticsService.php:166-213](file://app/Services/Analytics/AnalyticsService.php#L166-L213)
- [AnalyticsService.php:119-142](file://app/Services/Analytics/AnalyticsService.php#L119-L142)
- [NotificationDispatcher.php:190-205](file://app/Services/Notifications/NotificationDispatcher.php#L190-L205)
- [AtRiskStudentsTable.tsx:11-51](file://frontend/src/features/analytics/AtRiskStudentsTable.tsx#L11-L51)

## Dependency Analysis
- AnalyticsService depends on:
  - GradebookService for final grades.
  - ProgressEngine for module applicability in roster calculations.
  - NotificationDispatcher for sending reminders.
  - Models: Enrolment, Certificate, EngagementEvent, Assignment, AssignmentSubmission.
- NotificationDispatcher writes to the Notification model and references related entities.
- Frontend components depend on typed responses for at-risk students and roster entries.

```mermaid
graph LR
AS["AnalyticsService"] --> GS["GradebookService"]
AS --> PE["ProgressEngine"]
AS --> ND["NotificationDispatcher"]
AS --> EE["EngagementEvent"]
AS --> ASS["AssignmentSubmission"]
AS --> ENR["Enrolment"]
AS --> CERT["Certificate"]
ND --> NOTIF["Notification"]
```

**Diagram sources**
- [AnalyticsService.php:39-142](file://app/Services/Analytics/AnalyticsService.php#L39-L142)
- [NotificationDispatcher.php:25-205](file://app/Services/Notifications/NotificationDispatcher.php#L25-L205)

**Section sources**
- [AnalyticsService.php:39-142](file://app/Services/Analytics/AnalyticsService.php#L39-L142)
- [NotificationDispatcher.php:25-205](file://app/Services/Notifications/NotificationDispatcher.php#L25-L205)

## Performance Considerations
- Queries are scoped to a single course to limit dataset size.
- Last engagement is aggregated per student using group-by to avoid N+1 queries.
- Overdue assignment IDs are fetched once and reused for risk factor computation.
- Mass notifications iterate only over the filtered at-risk set, minimizing unnecessary dispatches.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- No at-risk students reported:
  - Verify that engagement events exist for active students.
  - Confirm that due dates for assignments are set and passed.
  - Ensure enrollments are confirmed and not within the 7-day grace period.
- Notifications not appearing:
  - Check that the notification channel is set to in-app.
  - Verify that the user’s notification inbox reads from the notifications table.
- Incorrect risk factor:
  - Inspect last engagement timestamps and overdue assignment lists.
  - Confirm whether submissions exist for overdue assignments.

**Section sources**
- [AnalyticsService.php:166-213](file://app/Services/Analytics/AnalyticsService.php#L166-L213)
- [NotificationDispatcher.php:25-39](file://app/Services/Notifications/NotificationDispatcher.php#L25-L39)

## Conclusion
The at-risk detection system combines enrollment timing, engagement history, and assignment status to identify students who need attention. With a clear 7-day grace period and a 14-day inactivity window, it categorizes risk precisely and enables instructors to intervene through targeted, in-app reminders. The design keeps analytics read-heavy and centralizes notification dispatching for maintainability and extensibility.