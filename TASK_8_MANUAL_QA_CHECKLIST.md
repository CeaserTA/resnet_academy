# Task 8: Manual QA Verification Checklist

## Purpose
This checklist verifies that all implemented changes for the cohort application section data bugfix work correctly end-to-end.

## Checklist

### ✅ Backend Verification

#### 1. API Response Includes Section Data (Cohort Applications)
- [ ] Create a test application with a section through the application flow
- [ ] Open browser DevTools → Network tab
- [ ] Navigate to dashboard or trigger GET `/api/v1/course-applications/me`
- [ ] Verify response includes:
  ```json
  {
    "id": X,
    "status": "pending",
    "section": {
      "id": Y,
      "name": "Summer 2026 Intensive",
      "status": "open"
    },
    ...
  }
  ```
- [ ] Confirm section object has exactly 3 fields: `id`, `name`, `status`

#### 2. API Response for Self-Paced Applications
- [ ] Create a self-paced application (course with no sections)
- [ ] Check API response
- [ ] Verify `section` field is `null`

#### 3. No N+1 Query Issues
- [ ] Run backend with query logging enabled
- [ ] Fetch dashboard applications
- [ ] Verify section relationship is loaded in the initial query (not separate queries per application)

### ✅ Frontend Verification

#### 4. Dashboard Displays Section Name (Cohort Applications)
- [ ] Navigate to student dashboard
- [ ] Find an application card for a cohort application
- [ ] Verify section name appears after the applied date
- [ ] Format should be: `Applied {date} · Section: {name}`
- [ ] Verify muted text color (text-ink-400) for section info

#### 5. Dashboard Hides Section (Self-Paced Applications)
- [ ] Find an application card for a self-paced application
- [ ] Verify NO section text appears
- [ ] Only "Applied {date}" should be visible

#### 6. Confirmation Feedback After Submission
- [ ] Navigate to a course detail page with `enrolment_policy: 'application'`
- [ ] Click "Apply to enrol"
- [ ] Fill out and submit the application form
- [ ] **Immediately after submission:**
  - [ ] Verify success alert appears
  - [ ] Message reads: "Application submitted! Check your dashboard to track its status."
  - [ ] Alert has a dismiss button (X icon)
  - [ ] Modal closes

#### 7. Manual Dismissal of Confirmation Alert
- [ ] Submit another application
- [ ] Click the X button on the success alert
- [ ] Verify alert disappears immediately

#### 8. Auto-Dismiss Confirmation Alert
- [ ] Submit another application
- [ ] Wait 5 seconds without dismissing manually
- [ ] Verify alert auto-dismisses after 5 seconds

#### 9. Multiple Sections per Course
- [ ] Find a course with multiple sections (e.g., "Spring 2026" and "Fall 2026")
- [ ] Apply to Section A
- [ ] Check dashboard → verify Section A name appears
- [ ] Apply to Section B (same course)
- [ ] Check dashboard → verify both applications show with their respective section names

### ✅ Edge Cases

#### 10. Section Deleted After Application
- [ ] (Optional - requires backend access) Soft-delete a section after an application is created
- [ ] Verify API returns `section: null`
- [ ] Verify dashboard handles gracefully (no section text shown, no errors)

#### 11. Console Errors Check
- [ ] Open browser DevTools → Console
- [ ] Navigate through the entire application flow (course page → apply → dashboard)
- [ ] Verify NO console errors or warnings appear

#### 12. TypeScript Compilation
- [ ] Run `npx tsc --noEmit` in frontend directory
- [ ] Verify no TypeScript errors related to:
  - `CourseApplication.section` field
  - `Alert.onDismiss` prop
  - ApplicationStatusCard component

### ✅ Tests Verification

#### 13. Backend Tests
- [ ] Run `php artisan test --filter=CourseApplicationResourceTest`
- [ ] Verify all 3 tests pass:
  - `course_application_resource_includes_section_for_cohort_applications`
  - `course_application_resource_section_null_for_self_paced_applications`
  - `course_application_resource_returns_simplified_section_object`

- [ ] Run `php artisan test --filter="visible_for_dashboard_eager_loads_section_relationship"`
- [ ] Verify test passes

#### 14. Frontend Tests
- [ ] Run `npm test -- --run src/features/enrolment/ApplicationStatusCard.test.tsx`
- [ ] Verify all 8 tests pass, including:
  - `displays section name for cohort applications`
  - `does not display section text for self-paced applications`
  - `displays section name for rejected cohort applications`

## Success Criteria

- ✅ All backend tests pass (4 total)
- ✅ All frontend tests pass (8 total for ApplicationStatusCard)
- ✅ API responses include section data when applicable
- ✅ Dashboard displays section names correctly
- ✅ Confirmation feedback works (appears, dismisses, auto-dismisses)
- ✅ No console errors or TypeScript errors
- ✅ Self-paced applications work correctly (section remains null)

## Notes

- The database schema already has `section_id` column - no migrations needed
- The bugfix is purely additive - no breaking changes
- All changes are backward compatible with existing data
