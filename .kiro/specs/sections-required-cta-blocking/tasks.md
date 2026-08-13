# Tasks: Fix sections_required CTA Blocking

## T1: Add sections_required to Course API response
- [x] Update `CourseResource` to include `sections_required` field
- [x] Verify field appears in GET /courses and GET /courses/:id responses
- [x] Update frontend `Course` TypeScript type to include the field

**Files:**
- `app/Http/Resources/CourseResource.php`
- `frontend/src/lib/api/types.ts`

**Acceptance:**
- API response includes `"sections_required": false` (or true) in course data
- TypeScript compilation succeeds with updated type

---

## T2: Fix CTA blocking logic in CourseDetailPage
- [x] Update CTA blocking calculation to respect `sections_required` flag
- [x] Replace `hasSections` check with `requiresSection` check
- [x] Add comment explaining the gating logic
- [x] Test manually with both `sections_required=true` and `false` courses

**Files:**
- `frontend/src/features/catalogue/CourseDetailPage.tsx` (lines ~256-257)

**Acceptance:**
- When `sections_required=false`: CTA never blocked by section selection state
- When `sections_required=true`: CTA blocked until section selected (existing behavior)
- During `sectionsLoading`: CTA blocked regardless (prevents race conditions)

---

## T3: Add helper text for optional sections (optional UX enhancement)
- [x] Add conditional helper text above section picker when `sections_required=false`
- [x] Text: "Optional: choose a section to join a cohort, or enroll self-paced below."
- [x] Style consistently with existing help text
- [x] Only show when sections exist and are optional

**Files:**
- `frontend/src/features/catalogue/CourseDetailPage.tsx`

**Acceptance:**
- Helper text appears above section picker only when `sections_required=false` and open sections exist
- Text does not appear when `sections_required=true` or no sections exist
- Styling matches surrounding UI elements

**Note:** This task is optional — core fix works without it.

---

## T4: Write component tests for CTA gating
- [x] Test: `sections_required=false` + sections exist + none selected → CTA enabled
- [x] Test: `sections_required=true` + sections exist + none selected → CTA disabled
- [x] Test: `sections_required=true` + sections exist + one selected → CTA enabled
- [x] Test: `sections_required=false` + no sections → CTA enabled, picker hidden
- [x] Test: sections loading → CTA disabled regardless of `sections_required`

**Files:**
- `frontend/src/features/catalogue/CourseDetailPage.test.tsx` (create if doesn't exist)

**Acceptance:**
- All 5 test cases pass
- Tests use proper mocking for course data and section data
- Tests verify button disabled state and DOM presence

---

## T5: Add backend integration test for API field
- [x] Write test verifying `sections_required` field in course API response
- [x] Test both `true` and `false` values
- [x] Run existing course API tests to ensure no regressions

**Files:**
- `tests/Feature/Http/Controllers/Api/V1/CourseControllerTest.php` (or similar)

**Acceptance:**
- Test passes for courses with `sections_required=true`
- Test passes for courses with `sections_required=false`
- All existing course API tests still pass

---

## T6: Manual QA verification
- [ ] Create test course with `sections_required=false` and 1+ open sections
- [ ] Verify CTA is enabled without selecting a section
- [ ] Click enroll → verify enrollment succeeds as self-paced (no section_id)
- [ ] Create test course with `sections_required=true` and 1+ open sections
- [ ] Verify CTA is disabled without selecting a section
- [ ] Select a section → verify CTA enables
- [ ] Click enroll → verify enrollment succeeds with section_id

**Acceptance:**
- Both scenarios work as expected in live UI
- No console errors
- Network requests show correct payload (section_id present/absent as expected)
