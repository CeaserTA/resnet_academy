# CourseApplicationService

<cite>
**Referenced Files in This Document**
- [CourseApplicationService.php](file://app/Services/Enrolment/CourseApplicationService.php)
- [CourseApplication.php](file://app/Models/CourseApplication.php)
- [CourseApplicationStatus.php](file://app/Enums/CourseApplicationStatus.php)
- [CourseApplicationController.php](file://app/Http/Controllers/Api/V1/CourseApplicationController.php)
- [StoreCourseApplicationRequest.php](file://app/Http/Requests/Api/V1/StoreCourseApplicationRequest.php)
- [RejectCourseApplicationRequest.php](file://app/Http/Requests/Api/V1/RejectCourseApplicationRequest.php)
- [CourseApplicationResource.php](file://app/Http/Resources/CourseApplicationResource.php)
- [CourseApplicationPolicy.php](file://app/Policies/CourseApplicationPolicy.php)
- [EnrolmentService.php](file://app/Services/Enrolment/EnrolmentService.php)
- [EnrolmentStatus.php](file://app/Enums/EnrolmentStatus.php)
- [2026_07_29_040000_create_course_applications_table.php](file://database/migrations/2026_07_29_040000_create_course_applications_table.php)
- [2026_08_04_010000_add_rejection_reason_to_course_applications_table.php](file://database/migrations/2026_08_04_010000_add_rejection_reason_to_course_applications_table.php)
- [2026_08_10_030000_add_section_id_to_course_applications_table.php](file://database/migrations/2026_08_10_030000_add_section_id_to_course_applications_table.php)
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
This document explains the end-to-end course application workflow managed by CourseApplicationService. It covers how applications are created, validated, reviewed, and decided (approved or rejected), including waitlist handling, capacity planning for sections, and integration with cohort management via section-based enrollments. It also documents application states, review workflows, and dashboard visibility rules.

## Project Structure
The application workflow spans controllers, services, models, policies, requests, resources, and database migrations:
- API layer: CourseApplicationController exposes endpoints to submit, list, approve, reject, and dismiss applications.
- Service layer: CourseApplicationService implements business logic for application lifecycle and decisions.
- Data layer: CourseApplication model and related enums define state and relationships.
- Policy layer: CourseApplicationPolicy enforces authorization for actions like approve/reject/dismiss.
- Validation: StoreCourseApplicationRequest and RejectCourseApplicationRequest validate inputs.
- Resources: CourseApplicationResource serializes responses.
- Enrolment integration: EnrolmentService handles enrollment creation, waitlisting, promotions, and capacity updates when applications are approved.
- Schema: Migrations define the course_applications table and its fields, including section support and rejection metadata.

```mermaid
graph TB
Client["Client"] --> CAC["CourseApplicationController"]
CAC --> CAS["CourseApplicationService"]
CAS --> EAS["EnrolmentService"]
CAS --> AUD["AuditLogger"]
CAS --> NOD["NotificationDispatcher"]
CAS --> CA["CourseApplication Model"]
CAC --> POL["CourseApplicationPolicy"]
CAC --> RES["CourseApplicationResource"]
EAS --> ENR["Enrolment Model"]
EAS --> SEC["CourseSection Model"]
```

**Diagram sources**
- [CourseApplicationController.php:23-102](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L23-L102)
- [CourseApplicationService.php:21-289](file://app/Services/Enrolment/CourseApplicationService.php#L21-L289)
- [EnrolmentService.php:24-249](file://app/Services/Enrolment/EnrolmentService.php#L24-L249)
- [CourseApplicationPolicy.php:12-54](file://app/Policies/CourseApplicationPolicy.php#L12-L54)
- [CourseApplicationResource.php:14-43](file://app/Http/Resources/CourseApplicationResource.php#L14-L43)

**Section sources**
- [CourseApplicationController.php:23-102](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L23-L102)
- [CourseApplicationService.php:21-289](file://app/Services/Enrolment/CourseApplicationService.php#L21-L289)
- [EnrolmentService.php:24-249](file://app/Services/Enrolment/EnrolmentService.php#L24-L249)
- [CourseApplicationPolicy.php:12-54](file://app/Policies/CourseApplicationPolicy.php#L12-L54)
- [CourseApplicationResource.php:14-43](file://app/Http/Resources/CourseApplicationResource.php#L14-L43)

## Core Components
- CourseApplicationService: Orchestrates application submission, approval, rejection, dashboard visibility, and dismissal. Integrates with audit logging, notifications, and enrollment processing.
- CourseApplication model: Represents an application record with status, answers, portfolio URL, alternative proof text, reviewer info, recommended courses, and timestamps.
- CourseApplicationStatus enum: Defines pending, approved, and rejected states.
- CourseApplicationController: Exposes REST endpoints for listing, submitting, approving, rejecting, and dismissing applications; applies policy checks and resource serialization.
- Policies and Requests: Enforce role-based access and input validation for students and reviewers.
- EnrolmentService: Creates enrollments on approval, manages section capacity, waitlisting, promotions, orders, and confirmation emails.
- Database schema: Stores applications with optional section association and decision metadata.

**Section sources**
- [CourseApplicationService.php:21-289](file://app/Services/Enrolment/CourseApplicationService.php#L21-L289)
- [CourseApplication.php:14-89](file://app/Models/CourseApplication.php#L14-L89)
- [CourseApplicationStatus.php:7-13](file://app/Enums/CourseApplicationStatus.php#L7-L13)
- [CourseApplicationController.php:19-104](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L19-L104)
- [StoreCourseApplicationRequest.php:11-30](file://app/Http/Requests/Api/V1/StoreCourseApplicationRequest.php#L11-L30)
- [RejectCourseApplicationRequest.php:10-26](file://app/Http/Requests/Api/V1/RejectCourseApplicationRequest.php#L10-L26)
- [EnrolmentService.php:24-249](file://app/Services/Enrolment/EnrolmentService.php#L24-L249)
- [2026_07_29_040000_create_course_applications_table.php:9-41](file://database/migrations/2026_07_29_040000_create_course_applications_table.php#L9-L41)
- [2026_08_04_010000_add_rejection_reason_to_course_applications_table.php:9-25](file://database/migrations/2026_08_04_010000_add_rejection_reason_to_course_applications_table.php#L9-L25)
- [2026_08_10_030000_add_section_id_to_course_applications_table.php:9-34](file://database/migrations/2026_08_10_030000_add_section_id_to_course_applications_table.php#L9-L34)

## Architecture Overview
The workflow begins with a student submitting an application for a course that requires admission. The controller validates input and delegates to the service. The service ensures no duplicate pending applications or confirmed enrollments exist for the same course/section, creates the application, logs the action, and returns it. Reviewers can then approve or reject. On approval, the service calls the enrollment service to create an enrollment, which may be confirmed or waitlisted based on section capacity. Rejections can include recommended courses and reasons. Dashboard visibility filters pending and recent rejected applications unless dismissed or acted upon.

```mermaid
sequenceDiagram
participant Student as "Student"
participant Controller as "CourseApplicationController"
participant Service as "CourseApplicationService"
participant Audit as "AuditLogger"
participant Notify as "NotificationDispatcher"
participant Enrollment as "EnrolmentService"
Student->>Controller : Submit application
Controller->>Controller : Validate request
Controller->>Service : apply(student, course, answers, sectionId)
Service->>Service : Check existing enrollments/applications
Service->>Audit : Log submitted
Service-->>Controller : Application created
Controller-->>Student : 201 Created
Note over Controller,Service : Reviewer actions later
Student->>Controller : Approve/Reject
Controller->>Service : approve/reject(application, reviewer, data)
alt Approve
Service->>Enrollment : enrol(student, course, source, sectionId)
Enrollment-->>Service : Enrollment (confirmed/waitlisted)
Service->>Notify : notify application_approved
Service->>Service : auto-cancel other pending apps
else Reject
Service->>Notify : notify application_rejected
end
Service-->>Controller : Updated application
Controller-->>Student : Response
```

**Diagram sources**
- [CourseApplicationController.php:56-102](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L56-L102)
- [CourseApplicationService.php:44-233](file://app/Services/Enrolment/CourseApplicationService.php#L44-L233)
- [EnrolmentService.php:44-148](file://app/Services/Enrolment/EnrolmentService.php#L44-L148)

## Detailed Component Analysis

### Application Submission Flow
- Input validation: Ensures course is published and exists, optional section exists, answers are strings, and optional portfolio URL and alternative proof text are valid.
- Business checks: Prevents applying if already enrolled (section-aware) or has a pending application for the same course/section.
- Creation: Persists application with status pending, captures answers, portfolio URL, alternative proof text, and optional section ID.
- Audit and response: Logs submission and returns the created application resource.

```mermaid
flowchart TD
Start(["Submit Application"]) --> Validate["Validate Request"]
Validate --> CheckEnrolled{"Already enrolled<br/>in course/section?"}
CheckEnrolled --> |Yes| ErrorEnrolled["Return error: already enrolled"]
CheckEnrolled --> |No| CheckPending{"Has pending application<br/>for course/section?"}
CheckPending --> |Yes| ErrorPending["Return error: pending application exists"]
CheckPending --> |No| CreateApp["Create application (status=pending)"]
CreateApp --> AuditLog["Log 'submitted'"]
AuditLog --> ReturnApp["Return application resource"]
```

**Diagram sources**
- [StoreCourseApplicationRequest.php:18-28](file://app/Http/Requests/Api/V1/StoreCourseApplicationRequest.php#L18-L28)
- [CourseApplicationService.php:44-99](file://app/Services/Enrolment/CourseApplicationService.php#L44-L99)
- [CourseApplicationController.php:56-72](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L56-L72)

**Section sources**
- [StoreCourseApplicationRequest.php:18-28](file://app/Http/Requests/Api/V1/StoreCourseApplicationRequest.php#L18-L28)
- [CourseApplicationService.php:44-99](file://app/Services/Enrolment/CourseApplicationService.php#L44-L99)
- [CourseApplicationController.php:56-72](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L56-L72)

### Approval Workflow and Capacity Planning
- Authorization: Only admins or instructors teaching the course can approve.
- State transition: Pending becomes approved; records reviewer and timestamp.
- Enrollment creation: Delegates to EnrolmentService::enrol with source Self and optional section.
- Section capacity: If section is full, enrollment is waitlisted; otherwise confirmed. Confirmed enrollments increment seats_taken, create orders, queue confirmation email, and evaluate course unlocks. Waitlisted enrollments log promotion eligibility.
- Auto-cancellation: After approval, any other pending applications for the same course are rejected automatically to prevent multiple enrollments across sections.
- Notifications: Students receive an application_approved notification.

```mermaid
sequenceDiagram
participant Reviewer as "Reviewer"
participant Controller as "CourseApplicationController"
participant Service as "CourseApplicationService"
participant Enrollment as "EnrolmentService"
participant Section as "CourseSection"
Reviewer->>Controller : Approve application
Controller->>Service : approve(application, reviewer)
Service->>Service : Update status=approved, set reviewer
Service->>Enrollment : enrol(student, course, Self, sectionId?)
alt Section provided
Enrollment->>Section : lockForUpdate()
Enrollment->>Enrollment : If seats_taken >= capacity -> waitlisted
Enrollment->>Enrollment : Else -> confirmed, increment seats_taken
else No section
Enrollment->>Enrollment : Check course sections_required
end
Enrollment-->>Service : Enrollment created
Service->>Service : autoCancelOtherApplications()
Service-->>Controller : Updated application
Controller-->>Reviewer : Resource
```

**Diagram sources**
- [CourseApplicationController.php:74-81](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L74-L81)
- [CourseApplicationService.php:108-154](file://app/Services/Enrolment/CourseApplicationService.php#L108-L154)
- [EnrolmentService.php:44-148](file://app/Services/Enrolment/EnrolmentService.php#L44-L148)

**Section sources**
- [CourseApplicationPolicy.php:23-31](file://app/Policies/CourseApplicationPolicy.php#L23-L31)
- [CourseApplicationService.php:108-190](file://app/Services/Enrolment/CourseApplicationService.php#L108-L190)
- [EnrolmentService.php:44-148](file://app/Services/Enrolment/EnrolmentService.php#L44-L148)

### Rejection Workflow and Recommendations
- Authorization: Only admins or instructors teaching the course can reject.
- State transition: Pending becomes rejected; records reviewer, timestamp, optional rejection reason, and optional recommended course IDs.
- Notifications: Students receive an application_rejected notification; if recommendations are provided, the message guides them to build up to the target course.
- Dashboard filtering: Rejected applications remain visible for a limited window unless dismissed or if the student has already started any recommended courses.

```mermaid
flowchart TD
StartReject(["Reject Application"]) --> AuthCheck{"Authorized to reject?"}
AuthCheck --> |No| Deny["Deny action"]
AuthCheck --> |Yes| UpdateStatus["Set status=rejected,<br/>reviewed_at, reviewer"]
UpdateStatus --> OptionalData{"Optional:<br/>rejection_reason,<br/>recommended_course_ids"}
OptionalData --> Notify["Send 'application_rejected' notification"]
Notify --> ReturnResult["Return updated application"]
```

**Diagram sources**
- [CourseApplicationController.php:83-93](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L83-L93)
- [CourseApplicationService.php:195-233](file://app/Services/Enrolment/CourseApplicationService.php#L195-L233)
- [RejectCourseApplicationRequest.php:17-23](file://app/Http/Requests/Api/V1/RejectCourseApplicationRequest.php#L17-L23)

**Section sources**
- [CourseApplicationPolicy.php:28-31](file://app/Policies/CourseApplicationPolicy.php#L28-L31)
- [CourseApplicationService.php:195-233](file://app/Services/Enrolment/CourseApplicationService.php#L195-L233)
- [RejectCourseApplicationRequest.php:17-23](file://app/Http/Requests/Api/V1/RejectCourseApplicationRequest.php#L17-L23)

### Dashboard Visibility and Dismissal
- Visible applications: Includes all pending applications and rejected ones within a visibility window after decision, unless dismissed.
- Recommendation filtering: If a rejected application includes recommended courses and the student has already started any of those, the application is hidden from the dashboard.
- Dismissal: Students can mark a rejected application as dismissed; this sets a timestamp and hides it from the dashboard.

```mermaid
flowchart TD
LoadApps["Load student's applications"] --> FilterPending["Include pending"]
FilterPending --> FilterRejected["Include rejected if not dismissed<br/>and within visibility window"]
FilterRejected --> CheckRecommendations{"Any recommended courses<br/>already started?"}
CheckRecommendations --> |Yes| HideApp["Hide from dashboard"]
CheckRecommendations --> |No| ShowApp["Show on dashboard"]
ShowApp --> End(["End"])
HideApp --> End
```

**Diagram sources**
- [CourseApplicationService.php:243-272](file://app/Services/Enrolment/CourseApplicationService.php#L243-L272)
- [CourseApplicationController.php:49-54](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L49-L54)

**Section sources**
- [CourseApplicationService.php:243-287](file://app/Services/Enrolment/CourseApplicationService.php#L243-L287)
- [CourseApplicationController.php:49-54](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L49-L54)

### Data Model and Relationships
- CourseApplication fields: student, course, optional section, status, answers, portfolio_url, alternative_proof_text, rejection_reason, dismissed_at, reviewed_by, reviewed_at, recommended_course_ids.
- Relationships: BelongsTo user (student), course, section, reviewer; helper method loads recommended courses by IDs.
- Enums: Status transitions between pending, approved, rejected; enrollment statuses include confirmed, withdrawn, waitlisted.

```mermaid
classDiagram
class CourseApplication {
+id
+student_id
+course_id
+section_id
+status
+answers
+portfolio_url
+alternative_proof_text
+rejection_reason
+dismissed_at
+reviewed_by
+reviewed_at
+recommended_course_ids
+student()
+course()
+section()
+reviewer()
+recommendedCourses()
}
class User {
+id
+name
+role
}
class Course {
+id
+title
+sections_required
+confirmation_delay_hours
+price
+currency
}
class CourseSection {
+id
+name
+status
+capacity
+seats_taken
}
CourseApplication --> User : "student"
CourseApplication --> Course : "course"
CourseApplication --> CourseSection : "section"
CourseApplication --> User : "reviewer"
```

**Diagram sources**
- [CourseApplication.php:14-89](file://app/Models/CourseApplication.php#L14-L89)
- [CourseApplicationStatus.php:7-13](file://app/Enums/CourseApplicationStatus.php#L7-L13)
- [EnrolmentStatus.php:7-13](file://app/Enums/EnrolmentStatus.php#L7-L13)

**Section sources**
- [CourseApplication.php:14-89](file://app/Models/CourseApplication.php#L14-L89)
- [CourseApplicationStatus.php:7-13](file://app/Enums/CourseApplicationStatus.php#L7-L13)
- [EnrolmentStatus.php:7-13](file://app/Enums/EnrolmentStatus.php#L7-L13)

## Dependency Analysis
- CourseApplicationController depends on CourseApplicationService for business logic and CourseApplicationPolicy for authorization.
- CourseApplicationService depends on AuditLogger, NotificationDispatcher, and EnrolmentService for side effects and enrollment processing.
- EnrolmentService interacts with CourseSection for capacity checks and promotions, and with Order and ProgressEngine for post-enrollment setup.
- CourseApplicationResource serializes model data into API responses.

```mermaid
graph LR
Controller["CourseApplicationController"] --> Service["CourseApplicationService"]
Service --> Audit["AuditLogger"]
Service --> Notify["NotificationDispatcher"]
Service --> Enrollment["EnrolmentService"]
Enrollment --> Section["CourseSection"]
Enrollment --> Order["Order"]
Enrollment --> Progress["ProgressEngine"]
Controller --> Policy["CourseApplicationPolicy"]
Controller --> Resource["CourseApplicationResource"]
```

**Diagram sources**
- [CourseApplicationController.php:19-104](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L19-L104)
- [CourseApplicationService.php:21-289](file://app/Services/Enrolment/CourseApplicationService.php#L21-L289)
- [EnrolmentService.php:24-249](file://app/Services/Enrolment/EnrolmentService.php#L24-L249)

**Section sources**
- [CourseApplicationController.php:19-104](file://app/Http/Controllers/Api/V1/CourseApplicationController.php#L19-L104)
- [CourseApplicationService.php:21-289](file://app/Services/Enrolment/CourseApplicationService.php#L21-L289)
- [EnrolmentService.php:24-249](file://app/Services/Enrolment/EnrolmentService.php#L24-L249)

## Performance Considerations
- Section capacity checks use pessimistic locking to avoid race conditions during concurrent approvals.
- Queries for dashboard visibility load necessary relations efficiently and filter at the service level to reduce UI overhead.
- Auto-cancellation of other pending applications occurs after approval to maintain consistency without blocking the main flow.
- Confirmation emails are queued with configurable delays to avoid synchronous I/O during enrollment.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Duplicate application errors: Occur when a student already has a pending application for the same course/section or is already enrolled. Validate inputs and check existing records before submission.
- Section requirements: If a course requires sections, ensure a valid section_id is provided; otherwise, enrollment will fail.
- Capacity issues: When section capacity is reached, enrollments become waitlisted; monitor waitlist promotions when seats open.
- Authorization failures: Ensure the reviewer is admin or an instructor teaching the course; otherwise, approve/reject actions will be denied.
- Dashboard visibility: Rejected applications may disappear if dismissed or if recommended courses have been started; verify dismissed_at and recommendation status.

**Section sources**
- [CourseApplicationService.php:44-99](file://app/Services/Enrolment/CourseApplicationService.php#L44-L99)
- [EnrolmentService.php:52-93](file://app/Services/Enrolment/EnrolmentService.php#L52-L93)
- [CourseApplicationPolicy.php:23-52](file://app/Policies/CourseApplicationPolicy.php#L23-L52)
- [CourseApplicationService.php:243-287](file://app/Services/Enrolment/CourseApplicationService.php#L243-L287)

## Conclusion
CourseApplicationService provides a robust, audited, and notification-enabled workflow for managing course applications from submission through decision and enrollment. It integrates tightly with section-based capacity management and cohort enrollment processes, ensuring consistent state transitions, clear visibility for students, and controlled access for reviewers. The design supports flexible admission criteria, waitlist handling, and automated follow-ups, making it suitable for scalable course delivery environments.