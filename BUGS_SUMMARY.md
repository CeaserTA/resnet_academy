# Section-Picker Feature Bugs - Summary & Specs

## Bug 1: Self-paced Enrollment Blocked When `sections_required` is False

### Status: ✅ **Spec Created**

**Location:** `.kiro/specs/sections-required-cta-blocking/`

### Root Cause
Frontend never checks `course.sections_required` flag. CTA is blocked whenever ANY open section exists, regardless of whether sections are required.

### Impact
Self-paced courses that add cohort sections inadvertently block ALL self-paced enrollment.

### Fix Summary
- Add `sections_required` to Course API response
- Update frontend CTA blocking logic to respect the flag
- Add test coverage for both `true` and `false` scenarios

### Tasks: 6 tasks (5 required + 1 optional UX enhancement)

---

## Bug 2: Cohort Application Section Data Missing from API

### Status: ✅ **Spec Created + Root Cause Confirmed via Runtime Testing**

**Location:** `.kiro/specs/cohort-application-section-data/`

### Investigation Results (Actual Runtime Execution)
**Executed:** 2026-08-13 09:56:20

✅ Application created successfully (ID: 1, section_id: 3)
✅ Database row exists with correct section_id
✅ `visibleForDashboard()` returns the application
✅ API endpoint returns the application
❌ API response missing `section` object
❌ No confirmation feedback after submission

### Root Causes Found

**Primary Issue 1:** `CourseApplicationResource` doesn't include `section` field
- Location: `app/Http/Resources/CourseApplicationResource.php`
- Impact: Frontend has no access to section information

**Primary Issue 2:** Dashboard query doesn't eager-load `section`
- Location: `app/Services/Enrolment/CourseApplicationService.php` line 257
- Impact: Would cause N+1 queries if resource tried to access it

**Secondary Issue:** No confirmation feedback after application submission
- Location: `frontend/src/features/catalogue/CourseDetailPage.tsx`
- Impact: User has no confirmation their application was submitted

### Fix Summary
- Add `section` to CourseApplicationResource
- Eager-load `section` in dashboard query
- Update TypeScript CourseApplication type
- Display section name in ApplicationStatusCard
- Add success alert after application submission

### Tasks: 8 tasks (7 required + 1 manual QA)

---

## Implementation Priority

### High Priority (User-Facing Blockers)
1. **Bug 1** - Blocks self-paced enrollment entirely
2. **Bug 2** - Missing section data prevents users from distinguishing applications

### Recommended Order
1. Fix Bug 1 first (simpler, more critical impact)
2. Fix Bug 2 second (more comprehensive, affects multiple layers)
3. Both can be implemented in parallel if needed

---

## Test Data Used in Investigation

**Student:** Sample Student (ID: 8, Email: student@resnet.test)
**Course:** Customizable nextgeneration architecture (ID: 2)
- enrolment_policy: application
- sections_required: false

**Section:** Summer 2026 Intensive (ID: 3, Status: open)

**Application Created:** ID: 1, Status: pending, Created: 2026-08-13 09:56:20

---

## Files Ready for Implementation

### Bug 1 Spec Files
- `.kiro/specs/sections-required-cta-blocking/.config.kiro`
- `.kiro/specs/sections-required-cta-blocking/requirements.md`
- `.kiro/specs/sections-required-cta-blocking/design.md`
- `.kiro/specs/sections-required-cta-blocking/tasks.md`

### Bug 2 Spec Files
- `.kiro/specs/cohort-application-section-data/.config.kiro`
- `.kiro/specs/cohort-application-section-data/requirements.md`
- `.kiro/specs/cohort-application-section-data/design.md`
- `.kiro/specs/cohort-application-section-data/tasks.md`

### Investigation Artifacts
- `BUG2_ROOT_CAUSE_ANALYSIS.md` - Detailed findings with actual runtime data
- `BUG2_ACTUAL_API_RESPONSE.json` - Real API response showing missing section
- `scripts/execute-bug2-investigation.php` - Automated investigation script

---

## Next Steps

Review the specs in `.kiro/specs/` and begin implementation by executing the tasks in `tasks.md` for each bugfix.
