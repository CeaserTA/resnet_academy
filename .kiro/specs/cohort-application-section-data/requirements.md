# Bug: Cohort application section data missing from API + no confirmation feedback

## Problem Statement

When students apply to a cohort section, the section information is correctly stored in the database but is completely missing from the API response. Additionally, there is no confirmation feedback after successful submission.

## Current Behavior (Bug)

### Issue 1: Missing Section Data in API

**Backend:**
- `CourseApplicationResource` does not include the `section` relationship in its response
- `CourseApplicationService::visibleForDashboard()` doesn't eager-load the `section` relationship
- Database correctly stores `section_id`, but API never exposes it

**Frontend:**
- TypeScript `CourseApplication` type doesn't include `section` field
- `ApplicationStatusCard` has no way to display which section the application is for
- Students applying to multiple sections of the same course can't distinguish between their applications

### Issue 2: No Confirmation After Submission

**Frontend:**
- After successful application submission in `ApplicationModal`, the modal just closes
- No success message or visual feedback
- No prompt to check dashboard for status
- User has no immediate confirmation their application was received

## Investigation Results

**Confirmed via actual runtime testing (2026-08-13):**
- ✅ Application created successfully with `section_id=3`
- ✅ Database row exists with correct `section_id`
- ✅ `visibleForDashboard()` returns the application
- ✅ API endpoint returns the application
- ❌ API response missing `section` object
- ❌ No confirmation feedback in UI

## Expected Behavior (Fixed)

### Issue 1: Section Data in API

**API Response should include:**
```json
{
  "id": 1,
  "status": "pending",
  "course": { ... },
  "section": {
    "id": 3,
    "name": "Summer 2026 Intensive",
    "status": "open"
  },
  "applied_at": "2026-08-13T09:56:20+00:00"
}
```

**For self-paced applications:**
```json
{
  "section": null
}
```

**Dashboard display should show:**
- Course title
- Section name (if applicable)
- Application status
- Applied date

### Issue 2: Confirmation Feedback

After successful submission:
- Success alert appears: "Application submitted! Check your dashboard to track its status."
- Alert auto-dismisses after a few seconds OR user can dismiss manually
- Modal closes
- User has clear confirmation their action succeeded

## Requirements

### FR-1: Add section to API resource
- Include `section` field in `CourseApplicationResource`
- Use `whenLoaded()` to avoid N+1 queries
- Return simplified section object: `{ id, name, status }`
- Return `null` for self-paced applications (no section)

### FR-2: Eager-load section in dashboard query
- Update `visibleForDashboard()` to include `'section'` in eager-load list
- Prevents N+1 queries when serializing collection
- Consistent with how `course`, `reviewer` are loaded

### FR-3: Update TypeScript type
- Add `section` field to `CourseApplication` interface
- Type: `{ id: number; name: string; status: string } | null`

### FR-4: Display section in ApplicationStatusCard
- Show section name next to applied date (if section exists)
- Format: "Applied {date} · Section: {name}"
- Only show when `application.section` is not null

### FR-5: Add confirmation feedback after submission
- Show success alert after ApplicationModal submission succeeds
- Message: "Application submitted! Check your dashboard to track its status."
- Alert appears below course title or in modal area
- Auto-dismiss after 5 seconds OR manual dismiss
- Clear existing alert when modal reopens

## Success Criteria

1. API responses for course applications include `section` object (when applicable)
2. Dashboard query eager-loads section relationship (no N+1 queries)
3. Frontend TypeScript type includes section field (no type errors)
4. ApplicationStatusCard displays section name for cohort applications
5. Success message appears after application submission
6. No regression in self-paced application flow (section remains null)

## Non-Requirements

- No changes to database schema (already correct)
- No changes to `CourseApplicationService::apply()` logic (already works)
- No changes to section picker UI (separate from this bug)
- Not adding section to every API resource (only CourseApplication)
