# Design: Add Section Data to Course Applications

## Overview

Add the missing `section` relationship to course application API responses and provide confirmation feedback after successful submission.

## Architecture Impact

**Affected Components:**
1. Backend: `CourseApplicationResource` (add section field)
2. Backend: `CourseApplicationService` (eager-load section)
3. Frontend: TypeScript types (add section field)
4. Frontend: `ApplicationStatusCard` (display section)
5. Frontend: `CourseDetailPage` (confirmation feedback)

**No Database Changes:** Schema already correct, `section_id` already stored.

## Implementation Strategy

### 1. Backend: Add Section to Resource

**File:** `app/Http/Resources/CourseApplicationResource.php`

**Current code:**
```php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'status' => $this->status->value,
        'student' => new UserResource($this->whenLoaded('student')),
        'course' => new CourseResource($this->whenLoaded('course')),
        // section missing here
        'answers' => $this->answers,
        // ...
    ];
}
```

**Fixed code:**
```php
public function toArray(Request $request): array
{
    return [
        'id' => $this->id,
        'status' => $this->status->value,
        'student' => new UserResource($this->whenLoaded('student')),
        'course' => new CourseResource($this->whenLoaded('course')),
        'section' => $this->whenLoaded('section', fn () => $this->section
            ? [
                'id' => $this->section->id,
                'name' => $this->section->name,
                'status' => $this->section->status->value,
              ]
            : null),
        'answers' => $this->answers,
        // ... rest unchanged
    ];
}
```

**Rationale:**
- Use `whenLoaded()` to avoid N+1 queries
- Return simplified section object (don't need full CourseSection resource)
- Return `null` explicitly for self-paced applications
- Matches pattern used for `reviewer` field

### 2. Backend: Eager-load Section in Dashboard Query

**File:** `app/Services/Enrolment/CourseApplicationService.php` (line ~257)

**Current code:**
```php
->with(['course.category', 'course.instructors', 'reviewer'])
```

**Fixed code:**
```php
->with(['course.category', 'course.instructors', 'reviewer', 'section'])
```

**Rationale:**
- Prevents N+1 queries when serializing collection
- Consistent with other relationships already loaded
- Single line change, minimal risk

### 3. Frontend: Update TypeScript Type

**File:** `frontend/src/lib/api/types.ts`

**Current interface:**
```typescript
export interface CourseApplication {
    id: number;
    status: CourseApplicationStatus;
    student: User;
    course: Course;
    answers: string[] | null;
    // ... other fields
    applied_at: string;
    reviewed_at: string | null;
}
```

**Fixed interface:**
```typescript
export interface CourseApplication {
    id: number;
    status: CourseApplicationStatus;
    student: User;
    course: Course;
    section: {
        id: number;
        name: string;
        status: string;
    } | null;
    answers: string[] | null;
    // ... other fields
    applied_at: string;
    reviewed_at: string | null;
}
```

**Rationale:**
- Additive change, doesn't break existing code
- Matches backend response structure
- Allows optional access (`application.section?.name`)

### 4. Frontend: Display Section in ApplicationStatusCard

**File:** `frontend/src/features/enrolment/ApplicationStatusCard.tsx`

**Current code (line ~40):**
```tsx
<p className="mt-1 text-sm text-ink-600">
    Applied {new Date(application.applied_at).toLocaleDateString()}
</p>
```

**Fixed code:**
```tsx
<p className="mt-1 text-sm text-ink-600">
    Applied {new Date(application.applied_at).toLocaleDateString()}
    {application.section && (
        <span className="ml-2 text-ink-400">
            · Section: {application.section.name}
        </span>
    )}
</p>
```

**Rationale:**
- Non-intrusive addition, only shows when section exists
- Uses muted color (ink-400) to de-emphasize secondary info
- Follows existing pattern (bullet separator)

### 5. Frontend: Add Confirmation Feedback

**File:** `frontend/src/features/catalogue/CourseDetailPage.tsx`

**Add state:**
```typescript
const [applicationSubmitted, setApplicationSubmitted] = useState(false);
```

**Add alert display (after page title/hero section):**
```tsx
{applicationSubmitted && (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <Alert 
            variant="success" 
            message="Application submitted! Check your dashboard to track its status."
            onDismiss={() => setApplicationSubmitted(false)}
        />
    </div>
)}
```

**Update modal callback:**
```typescript
{showApplicationModal && (
    <ApplicationModal
        course={course}
        sectionId={selectedSectionId ?? undefined}
        onClose={() => setShowApplicationModal(false)}
        onSubmitted={() => {
            setShowApplicationModal(false);
            setApplicationSubmitted(true);
        }}
    />
)}
```

**Auto-dismiss (optional enhancement):**
```typescript
useEffect(() => {
    if (applicationSubmitted) {
        const timer = setTimeout(() => {
            setApplicationSubmitted(false);
        }, 5000);
        return () => clearTimeout(timer);
    }
}, [applicationSubmitted]);
```

**Rationale:**
- Provides immediate visual confirmation
- Directs user to check dashboard
- Auto-dismisses to avoid cluttering UI
- User can manually dismiss earlier if needed

## Edge Cases

1. **Self-paced applications (no section):**
   - `section` field is `null` in API response ✅
   - Card doesn't display section text (conditional check) ✅
   - Existing behavior unchanged

2. **Multiple applications to different sections:**
   - Each application shows its own section name ✅
   - User can distinguish between applications
   - Solves the original problem

3. **Section deleted after application:**
   - Section relationship may be null in database (soft delete)
   - API returns `null` for section ✅
   - UI handles gracefully (no section text shown)

4. **Legacy applications (created before this fix):**
   - Database has `section_id`
   - Eager-load will work retroactively ✅
   - All applications gain section data

## Testing Strategy

### Backend Tests

**Test CourseApplicationResource includes section:**
```php
public function test_course_application_resource_includes_section(): void
{
    $application = CourseApplication::factory()->create();
    $section = CourseSection::factory()->create(['course_id' => $application->course_id]);
    $application->update(['section_id' => $section->id]);
    
    $resource = new CourseApplicationResource($application->load('section'));
    $array = $resource->toArray(request());
    
    $this->assertArrayHasKey('section', $array);
    $this->assertEquals($section->id, $array['section']['id']);
    $this->assertEquals($section->name, $array['section']['name']);
}

public function test_course_application_resource_section_null_for_self_paced(): void
{
    $application = CourseApplication::factory()->create(['section_id' => null]);
    
    $resource = new CourseApplicationResource($application->load('section'));
    $array = $resource->toArray(request());
    
    $this->assertArrayHasKey('section', $array);
    $this->assertNull($array['section']);
}
```

**Test dashboard query eager-loads section (no N+1):**
```php
public function test_visible_for_dashboard_eager_loads_section(): void
{
    $student = User::factory()->create();
    $application = CourseApplication::factory()->create([
        'student_id' => $student->id,
    ]);
    
    DB::enableQueryLog();
    
    $service = app(CourseApplicationService::class);
    $visible = $service->visibleForDashboard($student);
    
    $queries = DB::getQueryLog();
    
    // Should load section in initial query, not separate query per application
    $this->assertCount(1, $queries); // Only 1 query for applications + eager-loads
    $this->assertNotNull($visible->first()->section); // Relationship is loaded
}
```

### Frontend Tests

**Test ApplicationStatusCard displays section:**
```typescript
it('displays section name for cohort applications', () => {
    const application = {
        id: 1,
        status: 'pending',
        course: { id: 1, title: 'Test Course' },
        section: { id: 1, name: 'Summer 2026', status: 'open' },
        applied_at: '2026-08-13T09:56:20+00:00',
        // ... other required fields
    } as CourseApplication;
    
    render(<ApplicationStatusCard application={application} />);
    
    expect(screen.getByText(/Section: Summer 2026/)).toBeInTheDocument();
});

it('does not display section for self-paced applications', () => {
    const application = {
        // ... same as above but:
        section: null,
    } as CourseApplication;
    
    render(<ApplicationStatusCard application={application} />);
    
    expect(screen.queryByText(/Section:/)).not.toBeInTheDocument();
});
```

**Test confirmation feedback:**
```typescript
it('shows success message after application submission', async () => {
    // Mock course, sections, application mutation
    render(<CourseDetailPage />);
    
    // Submit application
    fireEvent.click(screen.getByText('Apply to enrol'));
    // ... fill form ...
    fireEvent.click(screen.getByText('Submit application'));
    
    await waitFor(() => {
        expect(screen.getByText(/Application submitted!/)).toBeInTheDocument();
    });
});
```

## Rollout Considerations

- **Backward compatible:** Adding fields to API response is non-breaking
- **No data migration:** Database already has section_id
- **Frontend graceful degradation:** Optional chaining handles missing section
- **Risk level:** Low — purely additive changes

## Success Metrics

- ✅ API responses include section data for cohort applications
- ✅ API responses show section=null for self-paced applications
- ✅ No N+1 queries in dashboard endpoint
- ✅ ApplicationStatusCard shows section name when applicable
- ✅ Success message appears after application submission
- ✅ All tests pass
