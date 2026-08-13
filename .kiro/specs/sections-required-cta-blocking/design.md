
# Design: Fix sections_required CTA Blocking

## Overview

Fix the enrollment CTA blocking logic to respect the `sections_required` flag, allowing hybrid courses to offer both self-paced and cohort enrollment.

## Architecture Impact

**Affected Components:**
1. Backend: `CourseResource` (add field to API response)
2. Frontend: `Course` TypeScript type (add field)
3. Frontend: `CourseDetailPage` component (update CTA blocking logic)
4. Tests: Component tests for CTA gating behavior

**No Database Changes:** The `sections_required` column already exists in the `courses` table.

## Implementation Strategy

### 1. Backend: Add field to API response

**File:** `app/Http/Resources/CourseResource.php`

Add `sections_required` to the resource array:
```php
'sections_required' => $this->sections_required,
```

**Location:** Include in the base course data returned for all endpoints (catalogue, detail, etc.)

### 2. Frontend: Update TypeScript type

**File:** `frontend/src/lib/api/types.ts`

Update the `Course` interface:
```typescript
export interface Course {
  // ... existing fields
  sections_required: boolean;
}
```

### 3. Frontend: Update CTA blocking logic

**File:** `frontend/src/features/catalogue/CourseDetailPage.tsx`

**Current (buggy) code:**
```typescript
const hasSections = !sectionsLoading && openSections.length > 0;
const ctaBlocked = sectionsLoading || (hasSections && selectedSectionId === null);
```

**Fixed code:**
```typescript
// Section gating:
// - While sectionsLoading, block to avoid state flicker
// - If sections_required=true and sections exist: block until one is selected
// - If sections_required=false: never block (sections are optional)
const requiresSection = course.sections_required && !sectionsLoading && openSections.length > 0;
const ctaBlocked = sectionsLoading || (requiresSection && selectedSectionId === null);
```

**Rationale:**
- `sectionsLoading`: Keep blocking during load to prevent premature clicks
- `course.sections_required`: Only enforce selection when explicitly required
- `openSections.length > 0`: Only relevant if sections actually exist
- Result: When `sections_required=false`, CTA is never blocked by section state

### 4. Optional UX Enhancement (Section Picker)

**Consider adding helper text** in the section picker area when `sections_required=false`:

```tsx
{(sectionsLoading || (!sectionsLoading && openSections.length > 0)) && (
    <div className="mt-5 border-t border-[#e8ecf1] pt-5">
        {!course.sections_required && openSections.length > 0 && (
            <p className="text-xs text-[#64748b] mb-2">
                Optional: choose a section to join a cohort, or enroll self-paced below.
            </p>
        )}
        {sectionsLoading ? (
            // ... loading skeleton
        ) : (
            <SectionPicker
                sections={openSections}
                selectedId={selectedSectionId}
                onSelect={setSelectedSectionId}
            />
        )}
    </div>
)}
```

**Decision:** This is optional — core fix works without it, but improves clarity for users.

### 5. Section Picker Display Logic

**Current:** Section picker shows when `sectionsLoading || hasSections`

**Consideration:** Should we hide the section picker entirely when there are no open sections?

**Decision:** Keep current behavior — show loading state while fetching, then show picker only if sections exist. When `sections_required=false` and no sections exist, picker doesn't render at all (correct).

## Test Strategy

### Unit Tests

**File:** `frontend/src/features/catalogue/CourseDetailPage.test.tsx` (create if doesn't exist)

**Test cases:**
1. **`sections_required=false`, open sections exist, none selected**
   - Expect: CTA enabled
   - Assert: Button not disabled, onClick fires

2. **`sections_required=true`, open sections exist, none selected**
   - Expect: CTA disabled
   - Assert: Button disabled

3. **`sections_required=true`, open sections exist, one selected**
   - Expect: CTA enabled
   - Assert: Button enabled, section ID included in payload

4. **`sections_required=false`, no open sections**
   - Expect: CTA enabled, no section picker shown
   - Assert: Button enabled, section picker not in DOM

5. **Sections loading state**
   - Expect: CTA disabled regardless of `sections_required`
   - Assert: Button disabled during load

### Integration Test (Backend)

Verify the field is included in API responses:

```php
// Test in existing CourseControllerTest or similar
public function test_course_detail_includes_sections_required_field(): void
{
    $course = Course::factory()->create(['sections_required' => true]);
    
    $response = $this->getJson("/api/v1/courses/{$course->id}");
    
    $response->assertOk()
        ->assertJson([
            'data' => [
                'id' => $course->id,
                'sections_required' => true,
            ],
        ]);
}
```

## Edge Cases

1. **Course has `sections_required=true` but no open sections:**
   - Backend `EnrolmentService` already checks for active sections and throws error
   - Frontend: CTA not blocked (no sections to select from anyway)
   - Behavior: User clicks, backend returns error — acceptable

2. **User manually sets `selectedSectionId` to null on a `sections_required=true` course:**
   - CTA becomes blocked again (correct)
   - If they click before re-selection: modal opens without section, backend validates

3. **Advisory/Application enrollment policies with sections:**
   - These show modals instead of direct enrollment
   - Modal receives `sectionId` prop from `selectedSectionId`
   - Fix applies to all enrollment policies uniformly

## Rollout Considerations

- **Backward compatible:** Existing courses with `sections_required=false` (default) get correct behavior
- **No data migration needed:** Field already exists with correct default
- **No breaking changes:** Adding a field to API response is additive
- **Risk level:** Low — only affects CTA enable/disable logic

## Success Metrics

- ✅ Courses with both sections and `sections_required=false` allow self-paced enrollment
- ✅ Courses with `sections_required=true` still enforce section selection
- ✅ No regression in other enrollment flows (advisory, application, etc.)
- ✅ Test coverage for both gating modes
