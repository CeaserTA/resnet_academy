# Bug: Self-paced enrollment blocked when `sections_required` is false

## Problem Statement

The frontend blocks the enrollment CTA whenever ANY open section exists, regardless of the `sections_required` flag. This breaks self-paced enrollment for courses that offer both self-paced and cohort options.

## Current Behavior (Bug)

In `CourseDetailPage.tsx`:
```typescript
const hasSections = openSections.length > 0
const ctaBlocked = hasSections && selectedSectionId === null
```

This blocks the CTA the moment any open section exists, never checking `course.sections_required`.

**Impact:** Self-paced courses that add a section for cohort learners inadvertently block ALL self-paced enrollment.

## Root Cause

The frontend does not check the `sections_required` field, which already exists in the database schema and defaults to `false`. The backend correctly enforces this flag in `EnrolmentService::enrol()`, but the frontend UI doesn't respect it.

## Expected Behavior (Fixed)

### When `sections_required = false` (default)
- Section picker is **optional**
- CTA remains **enabled** even with no section selected
- Student can:
  - Pick a section to enroll in a cohort, OR
  - Click "Enrol now" without selecting a section for self-paced
- The `section_id` in the API payload will be `null` for self-paced, which the backend already handles correctly

### When `sections_required = true`
- Section picker is **mandatory**
- CTA is **blocked** until a section is selected
- This is the current behavior — keep it

## Requirements

### FR-1: Respect `sections_required` flag
- Frontend must check `course.sections_required` when determining CTA state
- If `false`: never block CTA based on section selection
- If `true`: block CTA until section selected (existing behavior)

### FR-2: Add `sections_required` to API response
- Include `sections_required` field in course API responses
- Update TypeScript `Course` type to include this field

### FR-3: Update CTA blocking logic
- Replace current logic with:
  ```typescript
  const requiresSection = course.sections_required && openSections.length > 0
  const ctaBlocked = sectionsLoading || (requiresSection && selectedSectionId === null)
  ```

### FR-4: Optional UX enhancement
- Consider adding helper text when sections are optional:
  - "Choose a section to join a cohort, or enroll self-paced"
  - Or a "Skip — enroll self-paced" button/link in the section picker

### FR-5: Test coverage
- Test case: `sections_required=false` with open sections → CTA enabled without selection
- Test case: `sections_required=true` with open sections → CTA blocked without selection (existing behavior)
- Test case: `sections_required=false` with no sections → CTA enabled (regression check)

## Non-Requirements

- No changes to backend logic (already correct)
- No changes to API payload structure (already correct)
- No migration needed (field already exists in DB)

## Success Criteria

1. Courses with `sections_required=false` allow self-paced enrollment even when sections exist
2. Courses with `sections_required=true` still require section selection before enrollment
3. Test coverage confirms both scenarios work correctly
4. No regression in existing enrollment flows
