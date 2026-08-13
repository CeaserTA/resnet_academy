# Tasks: Add Section Data to Course Applications

## T1: Add section field to CourseApplicationResource
- [x] Update `CourseApplicationResource::toArray()` to include `section` field
- [x] Use `whenLoaded('section')` to avoid N+1 queries
- [x] Return simplified object: `{ id, name, status }` or `null`
- [x] Verify field appears in API responses for both endpoints (store and mine)

**Files:**
- `app/Http/Resources/CourseApplicationResource.php`

**Acceptance:**
- API response for cohort applications includes `section` object
- API response for self-paced applications has `section: null`
- No additional database queries when serializing (verify with query log)

---

## T2: Eager-load section in dashboard query
- [x] Update `CourseApplicationService::visibleForDashboard()` query
- [x] Add `'section'` to the `with()` array alongside course, reviewer
- [x] Verify no N+1 queries when fetching dashboard applications

**Files:**
- `app/Services/Enrolment/CourseApplicationService.php` (line ~257)

**Acceptance:**
- Dashboard query includes section in eager-load list
- Running query log shows section loaded in initial query
- No separate query per application when accessing section

---

## T3: Write backend tests for section in resource
- [x] Test: CourseApplicationResource includes section object for cohort applications
- [x] Test: CourseApplicationResource has section=null for self-paced applications
- [x] Test: visibleForDashboard() eager-loads section (no N+1)
- [x] Run existing CourseApplication tests to ensure no regressions

**Files:**
- `tests/Feature/Resources/CourseApplicationResourceTest.php` (create if doesn't exist)
- `tests/Feature/Services/Enrolment/CourseApplicationServiceTest.php` (may exist)

**Acceptance:**
- All 3 new tests pass
- Existing CourseApplication tests still pass
- Query log confirms no N+1 issues

---

## T4: Update TypeScript CourseApplication type
- [x] Add `section` field to `CourseApplication` interface
- [x] Type: `{ id: number; name: string; status: string } | null`
- [x] Verify TypeScript compilation succeeds with no errors

**Files:**
- `frontend/src/lib/api/types.ts`

**Acceptance:**
- TypeScript type includes section field
- No compilation errors in frontend codebase
- IDE autocomplete shows section field on CourseApplication objects

---

## T5: Display section in ApplicationStatusCard
- [x] Update applied date paragraph to conditionally show section name
- [x] Format: "Applied {date} · Section: {name}"
- [x] Only display when `application.section` is not null
- [x] Use muted text color (text-ink-400) for section info

**Files:**
- `frontend/src/features/enrolment/ApplicationStatusCard.tsx` (line ~40)

**Acceptance:**
- Cohort applications show section name after applied date
- Self-paced applications show only applied date (no section text)
- Styling matches existing UI patterns
- No layout shift or visual bugs

---

## T6: Add confirmation feedback after application submission
- [x] Add state: `applicationSubmitted` boolean
- [x] Render success Alert when state is true
- [x] Update ApplicationModal `onSubmitted` callback to set state true
- [x] Add auto-dismiss timer (5 seconds) using useEffect
- [x] Allow manual dismiss via Alert onDismiss prop

**Files:**
- `frontend/src/features/catalogue/CourseDetailPage.tsx`

**Acceptance:**
- Success alert appears after application submission
- Message: "Application submitted! Check your dashboard to track its status."
- Alert auto-dismisses after 5 seconds
- User can manually dismiss earlier
- Alert clears when modal reopens

---

## T7: Write frontend tests for section display
- [x] Test: ApplicationStatusCard shows section name for cohort applications
- [x] Test: ApplicationStatusCard hides section text for self-paced applications
- [x] Test: Confirmation alert appears after successful submission
- [x] Run existing ApplicationStatusCard tests to ensure no regressions

**Files:**
- `frontend/src/features/enrolment/ApplicationStatusCard.test.tsx`
- `frontend/src/features/catalogue/CourseDetailPage.test.tsx` (create if doesn't exist)

**Acceptance:**
- All 3 new tests pass
- Existing ApplicationStatusCard tests still pass
- Test coverage includes both cohort and self-paced scenarios

---

## T8: Manual QA verification
- [ ] Create test application with section through UI
- [ ] Verify API response includes section object (check Network tab)
- [ ] Verify dashboard displays application with section name
- [ ] Verify confirmation message appears after submission
- [ ] Create self-paced application (no section selected)
- [ ] Verify section field is null and not displayed in card
- [ ] Verify no console errors or warnings

**Acceptance:**
- Both cohort and self-paced application flows work correctly
- Section information displays properly when present
- Confirmation feedback provides clear user guidance
- No visual bugs or console errors
