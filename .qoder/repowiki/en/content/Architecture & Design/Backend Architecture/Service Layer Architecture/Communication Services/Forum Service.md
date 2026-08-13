# Forum Service

<cite>
**Referenced Files in This Document**
- [ForumService.php](file://app/Services/Communication/ForumService.php)
- [ForumThreadController.php](file://app/Http/Controllers/Api/V1/ForumThreadController.php)
- [ForumPostController.php](file://app/Http/Controllers/Api/V1/ForumPostController.php)
- [ForumController.php](file://app/Http/Controllers/Api/V1/ForumController.php)
- [ForumTagController.php](file://app/Http/Controllers/Api/V1/ForumTagController.php)
- [ForumThreadPolicy.php](file://app/Policies/ForumThreadPolicy.php)
- [ForumPostPolicy.php](file://app/Policies/ForumPostPolicy.php)
- [NotificationDispatcher.php](file://app/Services/Notifications/NotificationDispatcher.php)
- [Forum.php](file://app/Models/Forum.php)
- [ForumThread.php](file://app/Models/ForumThread.php)
- [ForumPost.php](file://app/Models/ForumPost.php)
- [ForumTag.php](file://app/Models/ForumTag.php)
- [ForumPostReport.php](file://app/Models/ForumPostReport.php)
- [ForumPostReportController.php](file://app/Http/Controllers/Api/V1/ForumPostReportController.php)
- [ForumPostAttachmentType.php](file://app/Enums/ForumPostAttachmentType.php)
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
This document explains the ForumService and its surrounding system for managing forum discussions, threads, posts, tags, moderation, and user interactions within courses. It covers how threads are created, replies posted, attachments handled, tags synchronized, read status tracked, and notifications dispatched. It also documents permission enforcement via policies, reporting workflows, and search/filtering capabilities exposed by the API controllers.

## Project Structure
The forum feature is implemented as a layered service:
- Controllers expose REST endpoints for listing forums, threads, posts, tags, and handling reports.
- The ForumService encapsulates business logic for creating threads, replying, updating/deleting posts, marking threads solved, syncing tags, and storing/removing attachments.
- Policies enforce permissions for viewing, posting, editing, deleting, and moderating content.
- Models define entities (Forum, ForumThread, ForumPost, ForumTag) and relationships.
- NotificationDispatcher records in-app notifications for forum activity.
- Enums define attachment types.

```mermaid
graph TB
subgraph "API Layer"
FC["ForumController"]
FTC["ForumThreadController"]
FPC["ForumPostController"]
FTCt["ForumTagController"]
FPRC["ForumPostReportController"]
end
subgraph "Business Logic"
FS["ForumService"]
ND["NotificationDispatcher"]
end
subgraph "Domain Models"
MForum["Forum"]
MThread["ForumThread"]
MPost["ForumPost"]
MTag["ForumTag"]
MReport["ForumPostReport"]
end
subgraph "Policies"
PThread["ForumThreadPolicy"]
PostPolicy["ForumPostPolicy"]
end
FC --> FTC
FTC --> FS
FPC --> FS
FTCt --> MTag
FPRC --> MReport
FS --> ND
FS --> MThread
FS --> MPost
FS --> MTag
FS --> MForum
FTC --> PThread
FPC --> PostPolicy
```

**Diagram sources**
- [ForumController.php:1-100](file://app/Http/Controllers/Api/V1/ForumController.php#L1-L100)
- [ForumThreadController.php:1-115](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L1-L115)
- [ForumPostController.php:1-70](file://app/Http/Controllers/Api/V1/ForumPostController.php#L1-L70)
- [ForumTagController.php:1-24](file://app/Http/Controllers/Api/V1/ForumTagController.php#L1-L24)
- [ForumPostReportController.php:1-54](file://app/Http/Controllers/Api/V1/ForumPostReportController.php#L1-L54)
- [ForumService.php:1-223](file://app/Services/Communication/ForumService.php#L1-L223)
- [NotificationDispatcher.php:1-206](file://app/Services/Notifications/NotificationDispatcher.php#L1-L206)
- [Forum.php:1-41](file://app/Models/Forum.php#L1-L41)
- [ForumThread.php:1-94](file://app/Models/ForumThread.php#L1-L94)
- [ForumPost.php:1-56](file://app/Models/ForumPost.php#L1-L56)
- [ForumTag.php:1-32](file://app/Models/ForumTag.php#L1-L32)
- [ForumPostReport.php:1-47](file://app/Models/ForumPostReport.php#L1-L47)
- [ForumThreadPolicy.php:1-51](file://app/Policies/ForumThreadPolicy.php#L1-L51)
- [ForumPostPolicy.php:1-43](file://app/Policies/ForumPostPolicy.php#L1-L43)

**Section sources**
- [ForumService.php:1-223](file://app/Services/Communication/ForumService.php#L1-L223)
- [ForumThreadController.php:1-115](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L1-L115)
- [ForumPostController.php:1-70](file://app/Http/Controllers/Api/V1/ForumPostController.php#L1-L70)
- [ForumController.php:1-100](file://app/Http/Controllers/Api/V1/ForumController.php#L1-L100)
- [ForumTagController.php:1-24](file://app/Http/Controllers/Api/V1/ForumTagController.php#L1-L24)
- [ForumPostReportController.php:1-54](file://app/Http/Controllers/Api/V1/ForumPostReportController.php#L1-L54)
- [ForumThreadPolicy.php:1-51](file://app/Policies/ForumThreadPolicy.php#L1-L51)
- [ForumPostPolicy.php:1-43](file://app/Policies/ForumPostPolicy.php#L1-L43)
- [NotificationDispatcher.php:1-206](file://app/Services/Notifications/NotificationDispatcher.php#L1-L206)
- [Forum.php:1-41](file://app/Models/Forum.php#L1-L41)
- [ForumThread.php:1-94](file://app/Models/ForumThread.php#L1-L94)
- [ForumPost.php:1-56](file://app/Models/ForumPost.php#L1-L56)
- [ForumTag.php:1-32](file://app/Models/ForumTag.php#L1-L32)
- [ForumPostReport.php:1-47](file://app/Models/ForumPostReport.php#L1-L47)

## Core Components
- ForumService: Central orchestrator for thread creation, replies, post updates/deletions, tag synchronization, read tracking, and solving threads. Integrates with storage and notifications.
- Controllers: Provide REST APIs for forums, threads, posts, tags, and reports; apply authorization and delegate to services.
- Policies: Enforce who can view, create, edit, delete, or moderate forum content based on enrollment, role, and thread state.
- Models: Represent Forum, ForumThread, ForumPost, ForumTag, and ForumPostReport with relationships and casts.
- NotificationDispatcher: Creates in-app notifications for forum replies and solved threads.
- Enum: Defines allowed attachment types for posts.

**Section sources**
- [ForumService.php:1-223](file://app/Services/Communication/ForumService.php#L1-L223)
- [ForumThreadController.php:1-115](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L1-L115)
- [ForumPostController.php:1-70](file://app/Http/Controllers/Api/V1/ForumPostController.php#L1-L70)
- [ForumController.php:1-100](file://app/Http/Controllers/Api/V1/ForumController.php#L1-L100)
- [ForumTagController.php:1-24](file://app/Http/Controllers/Api/V1/ForumTagController.php#L1-L24)
- [ForumPostReportController.php:1-54](file://app/Http/Controllers/Api/V1/ForumPostReportController.php#L1-L54)
- [ForumThreadPolicy.php:1-51](file://app/Policies/ForumThreadPolicy.php#L1-L51)
- [ForumPostPolicy.php:1-43](file://app/Policies/ForumPostPolicy.php#L1-L43)
- [NotificationDispatcher.php:1-206](file://app/Services/Notifications/NotificationDispatcher.php#L1-L206)
- [ForumPostAttachmentType.php:1-14](file://app/Enums/ForumPostAttachmentType.php#L1-L14)

## Architecture Overview
The forum system follows a clean separation of concerns:
- HTTP layer (controllers) validates requests, enforces policies, and delegates to services.
- Business logic (ForumService) handles domain rules, transactions, storage integration, and notifications.
- Data access (Eloquent models) defines entities and relationships.
- Authorization (policies) centralizes permission checks.
- Notifications (NotificationDispatcher) persist in-app messages for relevant events.

```mermaid
sequenceDiagram
participant Client as "Client"
participant ThreadCtrl as "ForumThreadController"
participant PostCtrl as "ForumPostController"
participant Service as "ForumService"
participant Notif as "NotificationDispatcher"
participant DB as "Database"
Client->>ThreadCtrl : POST /courses/{id}/threads
ThreadCtrl->>Service : createThread(course, user, title, body, tags, attachment)
Service->>DB : begin transaction
Service->>DB : create ForumThread + head post
Service->>Notif : notifyForumReply if needed
Service-->>ThreadCtrl : ForumThread
ThreadCtrl-->>Client : 201 JSON
Client->>PostCtrl : POST /threads/{id}/posts
PostCtrl->>Service : reply(thread, user, body)
Service->>DB : create reply + update last_activity_at
Service->>Notif : notifyForumReply to creator
Service-->>PostCtrl : ForumPost
PostCtrl-->>Client : 201 JSON
```

**Diagram sources**
- [ForumThreadController.php:71-84](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L71-L84)
- [ForumPostController.php:41-46](file://app/Http/Controllers/Api/V1/ForumPostController.php#L41-L46)
- [ForumService.php:50-107](file://app/Services/Communication/ForumService.php#L50-L107)
- [NotificationDispatcher.php:113-122](file://app/Services/Notifications/NotificationDispatcher.php#L113-L122)

## Detailed Component Analysis

### ForumService
Responsibilities:
- Ensure a per-course forum exists (lazy creation).
- Create threads with an initial post and optional attachments; sync tags.
- Allow users to reply to threads; update thread activity; notify thread creator.
- Staff-only mark-as-solved with notification to thread creator.
- Track per-user read status for threads.
- Update posts with optional new attachments or removal; toggle article mode without file.
- Delete posts; deleting head post removes entire thread.

Key behaviors:
- Transactions protect thread and head post creation.
- Tag synchronization creates or reuses tags case-insensitively and syncs relations.
- Attachment lifecycle managed via MediaStorageService.

```mermaid
flowchart TD
Start(["createThread"]) --> GetForum["Ensure forum exists"]
GetForum --> Txn["Begin DB transaction"]
Txn --> CreateThread["Create ForumThread"]
CreateThread --> StoreAttach{"Has attachment?"}
StoreAttach --> |Yes| SaveAttach["Store attachment<br/>save path + original name"]
StoreAttach --> |No| SkipAttach["Skip"]
SaveAttach --> CreateHeadPost["Create head post with body + attachment fields"]
SkipAttach --> CreateHeadPost
CreateHeadPost --> EndTxn["Commit transaction"]
EndTxn --> SyncTags["syncTags: find/create tags and sync"]
SyncTags --> ReturnThread["Return ForumThread"]
```

**Diagram sources**
- [ForumService.php:50-86](file://app/Services/Communication/ForumService.php#L50-L86)
- [ForumService.php:136-153](file://app/Services/Communication/ForumService.php#L136-L153)

**Section sources**
- [ForumService.php:39-86](file://app/Services/Communication/ForumService.php#L39-L86)
- [ForumService.php:92-107](file://app/Services/Communication/ForumService.php#L92-L107)
- [ForumService.php:113-128](file://app/Services/Communication/ForumService.php#L113-L128)
- [ForumService.php:155-185](file://app/Services/Communication/ForumService.php#L155-L185)
- [ForumService.php:191-221](file://app/Services/Communication/ForumService.php#L191-L221)

### ForumThreadController
Capabilities:
- List threads with search (title or full-text post body), filters (mine, tags), sorting (latest_activity, newest, most_replies), and pagination.
- Create threads via service.
- Show thread details and mark as read.
- Moderate threads (pin, lock, solve) with policy enforcement.

Search and filtering:
- Title match uses LIKE; post bodies use full-text search mode.
- Tags filter by any provided tag IDs.
- Read status merged into response for viewer context.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Ctrl as "ForumThreadController"
participant Policy as "ForumThreadPolicy"
participant Service as "ForumService"
participant DB as "Database"
Client->>Ctrl : GET /courses/{id}/threads?search=&tags[]=
Ctrl->>Policy : authorize('viewAny', course)
Ctrl->>DB : build query with filters/sort/pagination
Ctrl->>DB : fetch read map for current user
Ctrl-->>Client : paginated threads with metadata
```

**Diagram sources**
- [ForumThreadController.php:30-69](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L30-L69)
- [ForumThreadPolicy.php:19-29](file://app/Policies/ForumThreadPolicy.php#L19-L29)

**Section sources**
- [ForumThreadController.php:30-113](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L30-L113)
- [ForumThreadPolicy.php:19-49](file://app/Policies/ForumThreadPolicy.php#L19-L49)

### ForumPostController
Capabilities:
- List replies excluding the head post, oldest-first, paginated.
- Create replies via service.
- Update posts with optional attachment changes or article mode toggling.
- Delete posts with policy check; deleting head post removes thread.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Ctrl as "ForumPostController"
participant Policy as "ForumPostPolicy"
participant Service as "ForumService"
participant DB as "Database"
Client->>Ctrl : POST /threads/{id}/posts {body}
Ctrl->>Service : reply(thread, user, body)
Service->>DB : create reply + update last_activity_at
Service->>DB : notifyForumReply to creator
Service-->>Ctrl : ForumPost
Ctrl-->>Client : 201 JSON
Client->>Ctrl : DELETE /posts/{id}
Ctrl->>Policy : authorize('delete', post)
Ctrl->>Service : deletePost(post)
Service-->>Ctrl : void
Ctrl-->>Client : 204 No Content
```

**Diagram sources**
- [ForumPostController.php:26-68](file://app/Http/Controllers/Api/V1/ForumPostController.php#L26-L68)
- [ForumPostPolicy.php:14-32](file://app/Policies/ForumPostPolicy.php#L14-L32)
- [ForumService.php:92-107](file://app/Services/Communication/ForumService.php#L92-L107)
- [ForumService.php:191-202](file://app/Services/Communication/ForumService.php#L191-L202)

**Section sources**
- [ForumPostController.php:26-68](file://app/Http/Controllers/Api/V1/ForumPostController.php#L26-L68)
- [ForumPostPolicy.php:14-41](file://app/Policies/ForumPostPolicy.php#L14-L41)
- [ForumService.php:92-107](file://app/Services/Communication/ForumService.php#L92-L107)
- [ForumService.php:191-202](file://app/Services/Communication/ForumService.php#L191-L202)

### ForumController
Provides a unified list of all forums accessible to the authenticated user across enrolled courses, including recent activity and unread counts.

```mermaid
flowchart TD
A["GET /api/v1/forums"] --> B["Fetch confirmed enrolments"]
B --> C{"Any enrolled courses?"}
C --> |No| D["Return []"]
C --> |Yes| E["Load forums with latest thread and counts"]
E --> F["Compute unread threads per forum"]
F --> G["Map to response shape"]
G --> H["Return JSON array"]
```

**Diagram sources**
- [ForumController.php:32-97](file://app/Http/Controllers/Api/V1/ForumController.php#L32-L97)

**Section sources**
- [ForumController.php:32-97](file://app/Http/Controllers/Api/V1/ForumController.php#L32-L97)

### ForumTagController
Exposes global tags for autocomplete used by the composer.

**Section sources**
- [ForumTagController.php:19-22](file://app/Http/Controllers/Api/V1/ForumTagController.php#L19-L22)

### Reporting and Moderation
Users can report posts; staff can review reports within a course scope.

```mermaid
sequenceDiagram
participant User as "User"
participant Ctrl as "ForumPostReportController"
participant DB as "Database"
User->>Ctrl : POST /posts/{id}/reports {reason}
Ctrl->>DB : create report with status Pending
Ctrl-->>User : report resource
User->>Ctrl : GET /courses/{id}/reports
Ctrl->>DB : load reports for course with related data
Ctrl-->>User : collection of reports
```

**Diagram sources**
- [ForumPostReportController.php:19-52](file://app/Http/Controllers/Api/V1/ForumPostReportController.php#L19-L52)

**Section sources**
- [ForumPostReportController.php:19-52](file://app/Http/Controllers/Api/V1/ForumPostReportController.php#L19-L52)
- [ForumPostReport.php:13-47](file://app/Models/ForumPostReport.php#L13-L47)

### Data Model Relationships
```mermaid
erDiagram
FORUM {
int id PK
int course_id FK
string title
}
FORUM_THREAD {
int id PK
int forum_id FK
int created_by FK
string title
boolean is_pinned
boolean is_locked
boolean solved
datetime last_activity_at
}
FORUM_POST {
int id PK
int thread_id FK
int user_id FK
text body
enum attachment_type
string attachment_path
string attachment_original_name
}
FORUM_TAG {
int id PK
string name
string slug
}
FORUM_THREAD_TAG {
int thread_id FK
int tag_id FK
}
USER {
int id PK
}
FORUM ||--o{ FORUM_THREAD : "has many"
FORUM_THREAD ||--o{ FORUM_POST : "has many"
FORUM_THREAD }o--|| FORUM_TAG : "many-to-many"
FORUM_POST }o--|| USER : "belongs to"
FORUM_THREAD }o--|| USER : "created_by"
```

**Diagram sources**
- [Forum.php:20-39](file://app/Models/Forum.php#L20-L39)
- [ForumThread.php:22-92](file://app/Models/ForumThread.php#L22-L92)
- [ForumPost.php:19-54](file://app/Models/ForumPost.php#L19-L54)
- [ForumTag.php:19-30](file://app/Models/ForumTag.php#L19-L30)

**Section sources**
- [Forum.php:20-39](file://app/Models/Forum.php#L20-L39)
- [ForumThread.php:22-92](file://app/Models/ForumThread.php#L22-L92)
- [ForumPost.php:19-54](file://app/Models/ForumPost.php#L19-L54)
- [ForumTag.php:19-30](file://app/Models/ForumTag.php#L19-L30)

### Permission Model
- View/Create: Confirmed-enrolled students, instructors teaching the course, or admins.
- Edit Posts: Author only.
- Delete Posts: Author or staff (instructor/admin of the course).
- Moderate Threads: Instructors/admins only (pin, lock, solve).

```mermaid
flowchart TD
Action["Action on Forum Content"] --> CheckRole{"Is Admin or Instructor?"}
CheckRole --> |Yes| AllowModerate["Allow moderate actions"]
CheckRole --> |No| CheckEnrolment{"Confirmed enrolment?"}
CheckEnrolment --> |Yes| AllowReadCreate["Allow view/create"]
CheckEnrolment --> |No| Deny["Deny"]
AllowReadCreate --> PostEdit{"Editing own post?"}
PostEdit --> |Yes| AllowEdit["Allow edit"]
PostEdit --> |No| Deny
AllowModerate --> Solve{"Mark solved?"}
Solve --> Notify["Notify thread creator"]
```

**Diagram sources**
- [ForumThreadPolicy.php:19-49](file://app/Policies/ForumThreadPolicy.php#L19-L49)
- [ForumPostPolicy.php:14-41](file://app/Policies/ForumPostPolicy.php#L14-L41)
- [ForumService.php:113-120](file://app/Services/Communication/ForumService.php#L113-L120)

**Section sources**
- [ForumThreadPolicy.php:19-49](file://app/Policies/ForumThreadPolicy.php#L19-L49)
- [ForumPostPolicy.php:14-41](file://app/Policies/ForumPostPolicy.php#L14-L41)

### Notification Integration
- On reply: notifies the thread creator unless the replier is the creator.
- On mark solved: notifies the thread creator unless the actor is the creator.
- Notifications are persisted in-app with type, title, body, and related entity references.

```mermaid
sequenceDiagram
participant Service as "ForumService"
participant Notif as "NotificationDispatcher"
participant DB as "Database"
Service->>Notif : notifyForumReply(recipient, thread, replier)
Notif->>DB : create notification record
Service->>Notif : notifyForumThreadSolved(recipient, thread)
Notif->>DB : create notification record
```

**Diagram sources**
- [ForumService.php:102-119](file://app/Services/Communication/ForumService.php#L102-L119)
- [NotificationDispatcher.php:113-136](file://app/Services/Notifications/NotificationDispatcher.php#L113-L136)

**Section sources**
- [ForumService.php:102-119](file://app/Services/Communication/ForumService.php#L102-L119)
- [NotificationDispatcher.php:113-136](file://app/Services/Notifications/NotificationDispatcher.php#L113-L136)

### Search and Filtering
- Thread listing supports:
  - Text search across thread titles and post bodies using full-text index on post bodies.
  - Filter by tags (any of provided tag IDs).
  - Scope to current user’s threads.
  - Sorting by latest activity, newest, or most replies; pinned threads always first.
- Unread calculation considers missing read records or last activity after last read timestamp.

**Section sources**
- [ForumThreadController.php:30-69](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L30-L69)
- [ForumController.php:57-76](file://app/Http/Controllers/Api/V1/ForumController.php#L57-L76)

## Dependency Analysis
- ForumService depends on:
  - Models: Forum, ForumThread, ForumPost, ForumTag.
  - Services: NotificationDispatcher, MediaStorageService.
  - Database transactions for atomic operations.
- Controllers depend on:
  - ForumService for business logic.
  - Policies for authorization.
  - Resources for response shaping.
- Models define relationships that drive queries and eager loading.

```mermaid
graph LR
FS["ForumService"] --> ND["NotificationDispatcher"]
FS --> MS["MediaStorageService"]
FS --> FT["ForumThread"]
FS --> FP["ForumPost"]
FS --> FG["ForumTag"]
FS --> FM["Forum"]
FTC["ForumThreadController"] --> FS
FPC["ForumPostController"] --> FS
FTC --> PFT["ForumThreadPolicy"]
FPC --> PFP["ForumPostPolicy"]
```

**Diagram sources**
- [ForumService.php:34-37](file://app/Services/Communication/ForumService.php#L34-L37)
- [ForumThreadController.php:21-21](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L21-L21)
- [ForumPostController.php:20-20](file://app/Http/Controllers/Api/V1/ForumPostController.php#L20-L20)
- [ForumThreadPolicy.php:13-49](file://app/Policies/ForumThreadPolicy.php#L13-L49)
- [ForumPostPolicy.php:12-41](file://app/Policies/ForumPostPolicy.php#L12-L41)

**Section sources**
- [ForumService.php:34-37](file://app/Services/Communication/ForumService.php#L34-L37)
- [ForumThreadController.php:21-21](file://app/Http/Controllers/Api/V1/ForumThreadController.php#L21-L21)
- [ForumPostController.php:20-20](file://app/Http/Controllers/Api/V1/ForumPostController.php#L20-L20)
- [ForumThreadPolicy.php:13-49](file://app/Policies/ForumThreadPolicy.php#L13-L49)
- [ForumPostPolicy.php:12-41](file://app/Policies/ForumPostPolicy.php#L12-L41)

## Performance Considerations
- Use full-text search on post bodies for efficient content discovery.
- Paginate thread lists and replies to limit payload size.
- Eager-load necessary relations (creator, head/post users, tags) to avoid N+1 queries.
- Compute unread counts efficiently using raw SQL conditions against read table.
- Keep transactions small and focused around critical writes (thread creation).

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Cannot create thread:
  - Verify user has viewAny permission on the course (enrolled/instructor/admin).
  - Ensure forum exists or is lazily created.
- Reply fails:
  - Check thread is not locked; policy prevents posting to locked threads.
  - Confirm body validation passes.
- Post cannot be edited:
  - Only the author can edit their posts; staff can delete but not rewrite others’ posts.
- Deleting post does not remove thread:
  - Deleting non-head posts only removes the reply; deleting head post removes entire thread.
- Notifications not received:
  - Ensure NotificationDispatcher is invoked for replies and solved events; verify recipient is not the same as actor where applicable.
- Reports not visible:
  - Moderation queue requires instructor/admin of the course; ensure correct authorization.

**Section sources**
- [ForumThreadPolicy.php:19-49](file://app/Policies/ForumThreadPolicy.php#L19-L49)
- [ForumPostPolicy.php:14-41](file://app/Policies/ForumPostPolicy.php#L14-L41)
- [ForumService.php:92-107](file://app/Services/Communication/ForumService.php#L92-L107)
- [ForumService.php:191-202](file://app/Services/Communication/ForumService.php#L191-L202)
- [ForumPostReportController.php:34-45](file://app/Http/Controllers/Api/V1/ForumPostReportController.php#L34-L45)

## Conclusion
The ForumService provides a robust foundation for course-scoped discussion forums with clear separation between API, business logic, and data layers. It supports rich features such as threaded discussions, attachments, tagging, read tracking, moderation, reporting, and notifications. Permissions are enforced consistently through policies, and search/filtering capabilities enable efficient community interaction. Future enhancements can extend moderation workflows, spam detection, and advanced search indexing while maintaining the current modular architecture.