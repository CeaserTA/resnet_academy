# Course Sections Management - Investigation Report

## Investigation Summary

**Date**: 2026-08-11  
**Scope**: Determine if course section (cohort) creation functionality exists in the codebase

---

## Findings

### ❌ NO SECTION MANAGEMENT FUNCTIONALITY EXISTS

After thorough investigation, **there is currently NO way to create, update, or manage course_sections rows** except through:
1. Factory classes in tests (`CourseSectionFactory`)
2. Direct database inserts
3. Database seeders (if any exist)

### What Was Searched

1. **Controllers**: No `CourseSectionController` or `SectionController` exists in:
   - `app/Http/Controllers/Api/V1/`
   - `app/Http/Controllers/Api/V1/Admin/`

2. **Routes**: No section-related endpoints in `routes/api.php`:
   - No `/course-sections` routes
   - No `/sections` routes
   - No nested section routes under `/courses/{course}/sections`

3. **Frontend**: No admin UI for section management:
   - No `SectionPage.tsx`, `CourseSectionPage.tsx`, or similar
   - "Cohort" appears only in marketing copy (landing page, about page)
   - No section management UI in `CourseBuilderPage.tsx` or related admin pages
   

4. **Service Layer**: No dedicated `CourseSectionService` exists

### What Currently Exists

The `CourseSection` model and table exist with full schema:
- Fields: `name`, `start_date`, `end_date`, `application_deadline`, `capacity`, `seats_taken`, `status`, `primary_instructor_id`
- Relationships: `course()`, `primaryInstructor()`, `enrolments()`, `applications()`
- Helper methods: `isFull()`, `isAcceptingApplications()`

**But there's no way for admins/instructors to actually CREATE sections through the application.**

---

## Proposed Implementation Plan

### 1. Backend: CourseSectionController

**Location**: `app/Http/Controllers/Api/V1/CourseSectionController.php`

**Endpoints**:
```php
GET    /api/v1/courses/{course}/sections          // List all sections for a course
POST   /api/v1/courses/{course}/sections          // Create new section
GET    /api/v1/sections/{section}                 // Show single section with enrollments/applications
PATCH  /api/v1/sections/{section}                 // Update section details
DELETE /api/v1/sections/{section}                 // Soft delete (only if no enrollments)
PATCH  /api/v1/sections/{section}/status          // Update section status (separate endpoint for audit trail)
```

**Authorization**:
- All endpoints: Admin + Instructor who owns the parent course (via Policy)
- Follow same pattern as `CoursePolicy` (check `course->instructors` relationship)

**Validation Rules**:

**Create/Update Validation**:
```php
- name: required|string|max:255
- start_date: required|date|after:today (for create), after_or_equal:today (for update if not started)
- end_date: required|date|after:start_date
- application_deadline: nullable|date|before:start_date
- capacity: nullable|integer|min:1
- primary_instructor_id: required|exists:users,id (and must be instructor/admin role)
```

**Capacity Edit Rules**:
- ✅ Can increase capacity at any time
- ❌ Cannot decrease below current `seats_taken`
- Validation: `capacity >= $section->seats_taken` (if capacity is being set/reduced)

**Status Transition Rules**:

Current enum: `Draft | Open | InProgress | Completed | Closed`

**Allowed transitions** (enforced in validation):
```
Draft → Open (manual)
Open → InProgress (manual or scheduled)
Open → Closed (manual - closes applications early)
InProgress → Completed (manual or scheduled)

❌ Cannot go backwards (Completed → InProgress, etc.)
❌ Cannot skip stages (Draft → Completed)
```

### 2. Status Transition Strategy

**🚨 DECISION REQUIRED - Two Options:**

#### Option A: Manual Status Changes (Simpler, Full Control)
- Admin/instructor manually changes status via dropdown in UI
- Status field is just another editable field in the update endpoint
- **Pros**: Simple, predictable, no scheduled jobs needed, instructor has full control
- **Cons**: Requires manual action, can be forgotten

#### Option B: Automatic + Manual (Hybrid)
- Scheduled command runs daily: `php artisan sections:evaluate-status`
- Auto-transitions based on dates:
  - `start_date` reached → `Open` → `InProgress`
  - `end_date` reached → `InProgress` → `Completed`
  - `application_deadline` reached → closes applications (but section stays Open)
- Manual override available via separate endpoint: `PATCH /sections/{section}/status`
- **Pros**: Hands-off, automatic progression
- **Cons**: More complexity, scheduled job dependency, less control

**Recommendation**: Start with **Option A** (manual) in initial implementation, add Option B scheduled automation in a follow-up phase if needed.

### 3. Request/Resource Classes

**Requests**:
- `StoreSectionRequest` - Create validation
- `UpdateSectionRequest` - Update validation
- `UpdateSectionStatusRequest` - Status transition validation

**Resources**:
- `CourseSectionResource` - API response format
- Include: section details + `enrolled_count`, `waitlisted_count`, `applications_pending_count`

### 4. Frontend: Section Management UI

**New Page**: `frontend/src/features/admin/sections/SectionsManagePage.tsx`

**Access Point**: Add "Sections" tab to `CourseBuilderPage.tsx` (alongside Modules, Analytics)

**UI Features**:
- List all sections for a course (table view)
- Create section modal with form (name, dates, capacity, instructor)
- Edit section modal (validate capacity >= seats_taken client-side)
- Status badge (color-coded by enum)
- Status change dropdown (with validation on allowed transitions)
- Student counts: "Enrolled: X / Y", "Waitlisted: Z", "Pending Applications: W"
- Delete button (disabled if seats_taken > 0, show tooltip explaining why)

**Table Columns**:
1. Name (e.g., "Spring 2026 Cohort")
2. Status badge
3. Dates (start - end)
4. Capacity (X / Y or "Unlimited")
5. Application Deadline
6. Primary Instructor
7. Actions (Edit, Delete)

### 5. Audit Logging

All section mutations should log to `audit_logs`:
- `course_section.created`
- `course_section.updated` (with before/after diff in meta)
- `course_section.status_changed` (with from/to status in meta)
- `course_section.deleted`

### 6. Business Rule Considerations

**Capacity Changes**:
- If capacity is REDUCED but still >= seats_taken: allowed
- If new capacity < seats_taken: validation error "Cannot reduce capacity below current enrollment count"
- If capacity is REMOVED (set to null): allowed (makes section unlimited)

**Section Deletion**:
- Only allowed if `seats_taken = 0` AND no confirmed enrollments exist
- Soft delete: set `deleted_at` timestamp
- Cascade: What happens to waitlisted enrollments? → They should be auto-withdrawn with notification

**Start Date Changes**:
- If section is still `Draft` or `Open` and hasn't started: allowed
- If section is `InProgress` or `Completed`: validation error "Cannot change start date after section has started"

**Application Deadline**:
- Can be edited until the deadline is reached
- After deadline: can only be extended (moved to future date), not moved earlier
- Validation: if current time > old deadline, new deadline must be > current time

### 7. Migration Requirements

**No new migrations needed** - `course_sections` table already exists with all required columns.

### 8. Testing Plan

**Feature Tests** (`tests/Feature/Http/Controllers/CourseSectionControllerTest.php`):
1. Admin can create section for any course
2. Instructor can create section for their own course
3. Instructor cannot create section for other instructor's course
4. Cannot create section with end_date before start_date
5. Cannot create section with application_deadline after start_date
6. Cannot reduce capacity below current seats_taken
7. Cannot delete section with confirmed enrollments
8. Can soft-delete section with zero enrollments
9. Status transitions follow allowed rules (Draft→Open, not Completed→Draft)
10. Audit log entries are created for all mutations

**Unit Tests** (`tests/Unit/Models/CourseSectionTest.php`):
1. `isFull()` returns true when seats_taken >= capacity
2. `isAcceptingApplications()` returns false after application_deadline

---

## Implementation Order

1. ✅ **Backend First**:
   - CourseSectionController + routes
   - Request/Resource classes
   - Policy (CourseSectionPolicy)
   - Feature tests

2. ✅ **Frontend**:
   - SectionsManagePage component
   - API hooks (`useSections`, `useCreateSection`, `useUpdateSection`)
   - Integrate into CourseBuilderPage as new tab

3. ✅ **Polish**:
   - Audit logging
   - Error messages
   - Loading states
   - Accessibility

---

## Questions for Approval

1. **Status transitions**: Manual (Option A) or Automatic+Manual (Option B)?
2. **Deletion behavior**: Should we allow deletion of sections with waitlisted students, or require ALL enrollments (confirmed + waitlisted) to be zero?
3. **Capacity decrease edge case**: If an instructor tries to reduce capacity to exactly `seats_taken` (no waitlist slots), should we warn them that future withdrawals won't trigger waitlist promotion? Or just allow it?
4. **Primary instructor**: Required field? Or optional (null = course instructors apply)?

---

## Ready for Approval

This analysis confirms that course section management functionality **does not exist** and needs to be built from scratch. The proposed plan follows existing patterns (CourseController, auth via Policies, audit logging) and can be implemented without schema changes.

**Awaiting approval to proceed with implementation.**
