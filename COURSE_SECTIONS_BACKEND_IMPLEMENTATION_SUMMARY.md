# Course Sections Backend Implementation - Summary

## Date: 2026-08-11

## Overview
Implemented complete backend CRUD functionality for course section (cohort) management, including capacity-based waitlist promotion.

---

## Files Created

### 1. Policy
**`app/Policies/CourseSectionPolicy.php`**
- Authorization for Admin + Instructor (course owners only)
- Methods: `viewAny`, `view`, `create`, `update`, `delete`

### 2. Service Layer
**`app/Services/Enrolment/CourseSectionService.php`**
- `create()` - Create new section with audit logging
- `update()` - Update section with capacity-increase promotion logic
- `delete()` - Delete only if NO enrollment/application history
- `promoteWaitlistedStudents()` - Auto-promote on capacity increase (reuses EnrolmentService logic)

### 3. Controller
**`app/Http/Controllers/Api/V1/CourseSectionController.php`**
- `index()` - List all sections for a course
- `store()` - Create new section
- `show()` - Show single section with counts
- `update()` - Update section
- `destroy()` - Delete section

### 4. Request Validation
**`app/Http/Requests/Api/V1/StoreSectionRequest.php`**
- Validates: name, start_date, end_date, application_deadline, capacity, status, primary_instructor_id
- Rules: end_date after start_date, application_deadline before start_date, capacity ≥ 1

**`app/Http/Requests/Api/V1/UpdateSectionRequest.php`**
- Same fields, all optional
- Additional: Status transition validation (Draft→Open, Open→InProgress/Closed, InProgress→Completed)
- Prevents backwards transitions (Completed→Draft, etc.)

### 5. Resource
**`app/Http/Resources/CourseSectionResource.php`**
- Returns: section details + enrolled_count, waitlisted_count, applications_pending_count
- Includes: isFull, isAcceptingApplications flags

### 6. Routes
**`routes/api.php`** (added)
```php
GET    /api/v1/courses/{course}/sections
POST   /api/v1/courses/{course}/sections
GET    /api/v1/sections/{section}
PATCH  /api/v1/sections/{section}
DELETE /api/v1/sections/{section}
```

### 7. Tests
**`tests/Feature/Http/Controllers/CourseSectionControllerTest.php`**
- 24 tests, all passing
- Coverage: CRUD, authorization, validation, capacity changes, waitlist promotion, deletion rules

---

## Key Features Implemented

### ✅ Authorization
- Admin: Full access to all sections
- Instructor: Access only to sections for courses they teach
- Student: No access (403 Forbidden)

### ✅ Validation Rules
**Create/Update:**
- `name`: required, string, max 255
- `start_date`: required, date (no future restriction per user request #2)
- `end_date`: required, date, must be after start_date
- `application_deadline`: nullable, date, must be before start_date
- `capacity`: nullable, integer, min 1 (or 0 for unlimited)
- `status`: required enum (Draft, Open, InProgress, Completed, Closed)
- `primary_instructor_id`: nullable, must exist in users table

**Capacity Changes:**
- ✅ Can increase capacity anytime
- ✅ Can decrease capacity if new_capacity >= seats_taken
- ❌ Cannot decrease below seats_taken (validation error)

**Status Transitions (enforced):**
- Draft → Open ✅
- Open → InProgress ✅
- Open → Closed ✅
- Closed → Open ✅ (allow reopening)
- InProgress → Completed ✅
- Completed → * ❌ (terminal state)
- Cannot skip stages or go backwards

###  ✅ Capacity Increase Auto-Promotion (User Requirement #3)
When capacity is increased:
1. Calculate available seats: `new_capacity - current_seats_taken`
2. Find oldest waitlisted enrollments (ordered by `created_at ASC`)
3. Promote up to `available_seats` students
4. For each promoted student:
   - Change status to Confirmed
   - Increment seats_taken
   - Create Order (pending payment)
   - Log audit event (`enrolment.promoted_from_waitlist`)
   - Send notification (`waitlist_promoted`)
   - Queue confirmation email
   - Initialize progress/module unlocks

**Uses exact same promotion logic as `EnrolmentService::withdraw()`** via reflection to avoid code duplication.

### ✅ Deletion Rules (User Requirement #1)
**Can delete:** Sections with zero enrollments AND zero applications (draft sections created by mistake)

**Cannot delete:** Sections with ANY:
- Confirmed enrollments
- Waitlisted enrollments
- Withdrawn enrollments (has history)
- Pending applications
- Rejected applications (has history)
- Dismissed applications (has history)

**Validation error message:** "Cannot delete section with enrollment/application history. Use the 'Closed' status instead."

**Rationale:** Deletion is only for untouched drafts. Sections with any activity should be marked "Closed" to preserve audit history.

### ✅ Audit Logging
All mutations logged to `audit_logs`:
- `course_section.created`
- `course_section.updated` (with changed fields in meta)
- `course_section.deleted`
- `enrolment.promoted_from_waitlist` (when capacity increased)

### ✅ Manual Status Transitions (User Choice: Option A)
- Status changes are manual via PATCH `/sections/{id}` with `status` field
- No scheduled jobs or automatic transitions based on dates
- Full control for admin/instructor
- Can add automatic transitions later as Phase 2

---

## Test Coverage

**24 tests, 71 assertions, all passing:**

1. ✅ Admin can list sections for course
2. ✅ Instructor can list sections for their course
3. ✅ Instructor cannot list sections for other instructor's course
4. ✅ Admin can create section
5. ✅ Instructor can create section for their course
6. ✅ Instructor cannot create section for other instructor's course
7. ✅ Student cannot create section
8. ✅ Create validates end_date after start_date
9. ✅ Create validates application_deadline before start_date
10. ✅ Create validates capacity positive
11. ✅ Can update section details
12. ✅ Can increase section capacity
13. ✅ Cannot decrease capacity below seats_taken
14. ✅ **Capacity increase promotes waitlisted students (oldest first)**
15. ✅ **Capacity increase promotes multiple waitlisted students**
16. ✅ Update validates status transitions
17. ✅ Can transition from Draft to Open
18. ✅ Can transition from Open to InProgress
19. ✅ Cannot delete section with confirmed enrollments
20. ✅ Cannot delete section with waitlisted enrollments
21. ✅ Cannot delete section with pending applications
22. ✅ Can delete section with no enrollments or applications
23. ✅ **Cannot delete section with withdrawn enrollments (has history)**
24. ✅ Show section includes enrollment and application counts

---

## Database Schema

**No new migrations needed** - `course_sections` table already exists with all required columns:
- `id`, `course_id`, `name`
- `start_date`, `end_date`, `application_deadline`
- `capacity`, `seats_taken`
- `status` (enum)
- `primary_instructor_id`
- `created_at`, `updated_at`

---

## API Examples

### List Sections for a Course
```http
GET /api/v1/courses/1/sections
Authorization: Bearer {token}

Response 200:
{
  "data": [
    {
      "id": 1,
      "course_id": 1,
      "name": "Spring 2026 Cohort",
      "start_date": "2026-03-01",
      "end_date": "2026-06-30",
      "application_deadline": "2026-02-15",
      "capacity": 30,
      "seats_taken": 25,
      "status": "open",
      "enrolled_count": 25,
      "waitlisted_count": 5,
      "applications_pending_count": 3,
      "is_full": false,
      "is_accepting_applications": true
    }
  ]
}
```

### Create Section
```http
POST /api/v1/courses/1/sections
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Fall 2026 Cohort",
  "start_date": "2026-09-01",
  "end_date": "2026-12-15",
  "application_deadline": "2026-08-15",
  "capacity": 25,
  "status": "draft",
  "primary_instructor_id": 5
}

Response 201: {section details}
```

### Update Section (Increase Capacity - Triggers Promotion)
```http
PATCH /api/v1/sections/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "capacity": 35
}

Response 200: {updated section}
// Side effect: Oldest 10 waitlisted students promoted to confirmed
```

### Delete Section
```http
DELETE /api/v1/sections/1
Authorization: Bearer {token}

Response 204 No Content (if no enrollments/applications)
Response 422 Unprocessable (if has history)
```

---

## Next Steps: Frontend Implementation

Ready to build:
- **SectionsManagePage.tsx** - Admin/instructor UI for managing sections
- **API Hooks** - `useSections`, `useCreateSection`, `useUpdateSection`, `useDeleteSection`
- **Integration** - Add "Sections" tab to CourseBuilderPage
- **Features**:
  - List sections with status badges, capacity indicators
  - Create/edit section modal with form validation
  - Capacity warning when reducing to exactly seats_taken
  - Delete button (disabled if has history, with tooltip)
  - Status dropdown with allowed transition validation

**Frontend work awaiting approval to proceed.**

---

## Edge Cases Handled

1. ✅ Capacity decreased to exactly seats_taken (allowed, but will warn in UI that withdrawals won't trigger promotion)
2. ✅ Capacity increased with no waitlisted students (no-op, no errors)
3. ✅ Capacity increased with more waitlisted than available seats (promotes only up to available)
4. ✅ Primary instructor is optional/nullable (matches DB schema)
5. ✅ Backward status transitions blocked (Completed → Draft)
6. ✅ Deletion with withdrawn enrollments blocked (has history)
7. ✅ Parallel capacity increases handled via database locking (SELECT FOR UPDATE)
8. ✅ Custom validation error response format (`error.fields.*`)

---

## Performance Considerations

- Uses pessimistic locking (`lockForUpdate()`) during capacity changes to prevent race conditions
- Batch promotes waitlisted students in single transaction
- Eager loads relationships (`primaryInstructor`, `enrolments`, `applications`) to avoid N+1 queries
- Index on `section_id` + `status` in `enrolments` table for fast waitlist queries

---

## Compliance with Requirements

✅ **Requirement 1 (Deletion):** Block deletion if ANY enrollments or applications exist
✅ **Requirement 2 (Date validation):** No future restriction on start_date (removed `after:today`)
✅ **Requirement 3 (Capacity increase):** Auto-promote waitlisted students oldest-first
✅ **Question 1 (Status):** Manual transitions (Option A)
✅ **Question 2 (Deletion):** Block on ANY enrollment/application
✅ **Question 3 (Capacity warning):** Handled in validation, UI warning pending
✅ **Question 4 (Primary instructor):** Optional/nullable

---

## Status: Backend Complete ✅

All backend components implemented, tested, and passing. Ready for frontend implementation.
