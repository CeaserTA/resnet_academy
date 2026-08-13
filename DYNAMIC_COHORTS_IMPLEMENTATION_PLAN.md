# Dynamic Cohorts Implementation Plan

## Current Situation Analysis

### Landing Page (`LandingPage.tsx`)
- **Current**: Static `CohortSection` component with hardcoded data in `cohorts` array
- **Data**: Cohort 4 (Frontend) & Cohort 5 (Backend) with fake dates and course names
- **Location**: `frontend/src/components/landing/CohortSection.tsx`

### Browse Courses Page (`CataloguePage.tsx`)  
- **Current**: `CohortSchedule` section that filters courses by `schedule_start_date`
- **Problem**: Uses course-level `schedule_start_date` instead of section-level dates
- **Shows**: Empty state because courses don't have `schedule_start_date` populated
- **Location**: `frontend/src/features/catalogue/CataloguePage.tsx`

## Database Schema Analysis

### Existing `course_sections` Table
```sql
- id
- course_id (FK to courses)
- name (e.g., "Spring 2026 Cohort")
- start_date (date)
- end_date (date)
- application_deadline (date, nullable)
- capacity (int, nullable = unlimited)
- seats_taken (int, default 0)
- status (enum: draft|open|closed|in_progress|completed)
- primary_instructor_id (FK to users, nullable)
- timestamps
```

### Status Enum Values
- **draft**: Section created but not visible to students
- **open**: Registration/enrollment open
- **closed**: Registration closed, section may not have started yet
- **in_progress**: Section currently running
- **completed**: Section finished

---

## Recommended Implementation Strategy

### Phase 1: Backend API Enhancement

#### 1.1 Create a New Sections Endpoint for Public Display

**Purpose**: Return only publicly visible sections (not draft) with course data included.

**Endpoint**: `GET /api/v1/sections/public`

**Features**:
- Filter: `status IN ('open', 'in_progress')`
- Eager load: course, course.category, course.instructors
- Return sections with seat availability calculated
- Sort: upcoming first, then ongoing

**Response Shape**:
```json
{
  "data": [
    {
      "id": 3,
      "name": "Spring 2026 Intensive",
      "start_date": "2026-03-15",
      "end_date": "2026-06-30",
      "application_deadline": "2026-03-01",
      "capacity": 30,
      "enrolled_count": 15,
      "seats_available": 15,
      "status": "open",
      "primary_instructor": {
        "id": 5,
        "name": "Jane Instructor"
      },
      "course": {
        "id": 2,
        "title": "Web Foundations",
        "slug": "web-foundations",
        "description": "...",
        "level": "beginner",
        "enrolment_policy": "open",
        "thumbnail_url": "...",
        "category": {
          "id": 1,
          "name": "Frontend"
        },
        "instructors": [...]
      }
    }
  ]
}
```

#### 1.2 Update Enrolled Count Calculation

**Add computed property to CourseSection model**:
```php
public function getEnrolledCountAttribute(): int
{
    return $this->enrolments()->where('status', 'confirmed')->count();
}

public function getSeatsAvailableAttribute(): ?int
{
    if ($this->capacity === null) {
        return null; // Unlimited
    }
    return max(0, $this->capacity - $this->enrolled_count);
}

public function getIsFullAttribute(): bool
{
    if ($this->capacity === null) {
        return false; // Unlimited capacity
    }
    return $this->enrolled_count >= $this->capacity;
}
```

**Alternative (more performant)**: Add `enrolled_count` as a cached column on `course_sections` table, updated via events when enrollments change.

#### 1.3 Add Waitlist Support Table (Optional - Phase 2)

If you want "Join Waitlist" functionality for future cohorts:

**New table**: `section_waitlist`
```sql
- id
- section_id (FK to course_sections)
- user_id (FK to users)
- email (for anonymous users)
- notified_at (timestamp, nullable)
- created_at
- UNIQUE(section_id, user_id) OR UNIQUE(section_id, email)
```

---

### Phase 2: Frontend Implementation

#### 2.1 Update Landing Page (`CohortSection.tsx`)

**Replace static data with API call**:

```typescript
// New hook
export function usePublicSections() {
  return useQuery<{ data: PublicSection[] }>({
    queryKey: ['sections', 'public'],
    queryFn: () => apiClient.get('/sections/public').then(r => r.data),
  });
}

// Updated CohortSection component
export function CohortSection() {
  const { data, isLoading } = usePublicSections();
  const sections = data?.data ?? [];
  
  const now = new Date();
  const ongoing = sections.filter(s => 
    new Date(s.start_date) <= now && 
    new Date(s.end_date) >= now &&
    s.status === 'in_progress'
  );
  
  const upcoming = sections.filter(s => 
    new Date(s.start_date) > now &&
    s.status === 'open'
  );
  
  if (isLoading) return <Spinner />;
  if (sections.length === 0) return <EmptyState />;
  
  return (
    <section id="cohorts" className="...">
      {/* Display ongoing and upcoming sections */}
      {ongoing.length > 0 && (
        <div>
          <h3>Ongoing Cohorts</h3>
          {ongoing.map(section => (
            <CohortCard key={section.id} section={section} />
          ))}
        </div>
      )}
      
      {upcoming.length > 0 && (
        <div>
          <h3>Upcoming Cohorts</h3>
          {upcoming.map(section => (
            <CohortCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </section>
  );
}
```

**CohortCard updates**:
- Display: `section.name`, `section.start_date`, `section.course.title`
- Show seat availability: "15 seats left" or "Unlimited seats"
- Status badge based on `section.status`
- Link to course detail page: `/courses/${section.course.id}`

#### 2.2 Update Browse Courses Page (`CataloguePage.tsx`)

**Replace `CohortSchedule` logic**:

```typescript
function CohortSchedule() {
  const { data, isLoading } = usePublicSections();
  const sections = data?.data ?? [];
  
  if (isLoading) return <Spinner />;
  if (sections.length === 0) return <EmptyState />;
  
  const ongoing = sections.filter(s => s.status === 'in_progress');
  const upcoming = sections.filter(s => s.status === 'open');
  
  return (
    <section id="cohorts" className="...">
      {/* Same layout as current, but using real section data */}
      {ongoing.length > 0 && (
        <div>
          <h3>Ongoing Cohorts</h3>
          {ongoing.map(section => (
            <OngoingCohortCard key={section.id} section={section} />
          ))}
        </div>
      )}
      
      {upcoming.length > 0 && (
        <div>
          <h3>Upcoming Cohorts</h3>
          {upcoming.map(section => (
            <UpcomingCohortCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </section>
  );
}
```

**Update `OngoingCohortCard` and `UpcomingCohortCard`**:
- Accept `section` prop instead of `course`
- Display section-specific data (name, dates, instructor)
- Show seat availability and enrollment counts
- Keep same visual design

---

### Phase 3: Waitlist Functionality (Optional)

#### 3.1 Backend: Waitlist Service

```php
class SectionWaitlistService
{
    public function join(CourseSection $section, User $user): SectionWaitlist
    {
        return SectionWaitlist::firstOrCreate([
            'section_id' => $section->id,
            'user_id' => $user->id,
        ]);
    }
    
    public function notifyWhenAvailable(CourseSection $section): void
    {
        if (!$section->is_full) {
            $waitlist = $section->waitlist()
                ->whereNull('notified_at')
                ->orderBy('created_at')
                ->limit($section->seats_available)
                ->get();
            
            foreach ($waitlist as $entry) {
                // Send notification
                $this->notificationService->notify(
                    user: $entry->user,
                    type: 'section_seat_available',
                    title: "A seat opened up in {$section->name}",
                    body: 'Register now before it fills up again.',
                );
                
                $entry->update(['notified_at' => now()]);
            }
        }
    }
}
```

#### 3.2 Frontend: Waitlist Button

```typescript
function CohortCard({ section }: { section: PublicSection }) {
  const joinWaitlist = useJoinWaitlist();
  
  const handleWaitlist = async () => {
    await joinWaitlist.mutateAsync({ sectionId: section.id });
  };
  
  return (
    <div>
      {/* ... */}
      {section.is_full ? (
        <Button onClick={handleWaitlist}>
          Join Waitlist
        </Button>
      ) : (
        <Link to={`/courses/${section.course.id}`}>
          Register Now
        </Link>
      )}
    </div>
  );
}
```

---

## Implementation Checklist

### Backend Tasks

- [ ] **T1**: Create `PublicSectionResource` to format section + course data
- [ ] **T2**: Create `GET /api/v1/sections/public` endpoint in `CourseSectionController`
- [ ] **T3**: Add `enrolled_count` computed property or cached column to `CourseSection` model
- [ ] **T4**: Add `seats_available` and `is_full` computed properties
- [ ] **T5**: Write tests for public sections endpoint
- [ ] **T6** (Optional): Create `section_waitlist` migration
- [ ] **T7** (Optional): Create `SectionWaitlistService` with `join()` method
- [ ] **T8** (Optional): Create `POST /api/v1/sections/{id}/waitlist` endpoint
- [ ] **T9** (Optional): Add waitlist notification logic

### Frontend Tasks

- [ ] **T10**: Create `usePublicSections()` hook in `useSections.ts`
- [ ] **T11**: Update `CohortSection.tsx` to consume real API data
- [ ] **T12**: Redesign `CohortCard` component to use section data
- [ ] **T13**: Update `CataloguePage.tsx` `CohortSchedule` to use sections
- [ ] **T14**: Update `OngoingCohortCard` to accept section prop
- [ ] **T15**: Update `UpcomingCohortCard` to accept section prop
- [ ] **T16**: Add TypeScript types for `PublicSection` interface
- [ ] **T17**: Add seat availability display to cards
- [ ] **T18**: Write tests for cohort sections
- [ ] **T19** (Optional): Create `useJoinWaitlist()` mutation hook
- [ ] **T20** (Optional): Add "Join Waitlist" button when section is full

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Actions                            │
│  1. Create course section (cohort)                          │
│  2. Set status: draft → open (registration) → in_progress   │
│  3. Set capacity, dates, instructor                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Database: course_sections Table                 │
│  - id, course_id, name, status, dates, capacity             │
│  - Computed: enrolled_count, seats_available                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend: GET /api/v1/sections/public                 │
│  - Filter: status IN ('open', 'in_progress')                │
│  - Eager load: course, instructors, category                │
│  - Return: PublicSectionResource[]                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         Frontend: usePublicSections() Hook                   │
│  - Fetch sections from API                                  │
│  - Cache with React Query                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   LandingPage.tsx        │   │   CataloguePage.tsx      │
│   CohortSection          │   │   CohortSchedule         │
│   - Ongoing cohorts      │   │   - Ongoing cohorts      │
│   - Upcoming cohorts     │   │   - Upcoming cohorts     │
│   - Seat availability    │   │   - Full details         │
└──────────────────────────┘   └──────────────────────────┘
```

---

## UI/UX Recommendations

### Status Display
- **Open** (upcoming): Green "Registration Open" badge, show start date
- **In Progress** (ongoing): Blue "Ongoing" badge with pulsing dot, show end date
- **Closed**: Gray "Registration Closed" badge (still show for transparency)

### Seat Availability
- **Unlimited**: Don't show seat count
- **Available (>10%)**: Show "X seats left" in neutral color
- **Low (<10%)**: Show "Only X seats left!" in amber/warning color
- **Full**: Show "Full" badge + "Join Waitlist" button

### Empty States
- **No open sections**: "No cohorts scheduled yet. Check back soon!"
- **No ongoing sections**: Don't show "Ongoing Cohorts" heading

### Course Detail Page Integration
When user clicks on a cohort card:
- Navigate to `/courses/{course_id}`
- Section picker should auto-select that section (pass via URL param or state)
- Highlight the selected section in the picker

---

## Migration Path

### Step 1: Backend Foundation (Week 1)
1. Create public sections endpoint
2. Add enrolled_count calculation
3. Write tests

### Step 2: Landing Page (Week 1)
1. Create usePublicSections hook
2. Update CohortSection component
3. Test with real data

### Step 3: Browse Page (Week 2)
1. Update CohortSchedule component
2. Update card components
3. Test filtering and display

### Step 4: Waitlist (Week 3 - Optional)
1. Create waitlist table
2. Implement backend service
3. Add frontend button + hook
4. Add notification system

---

## Alternative: Simplified Approach (MVP)

If you want to ship faster, you can:

1. **Skip the new endpoint**: Reuse existing `/api/v1/courses/sections/{courseId}` but add a query param `?status=open,in_progress`
2. **Client-side aggregation**: Fetch sections for all courses and group by course on the frontend
3. **Skip waitlist**: Just show "Full" badge without waitlist functionality
4. **Reuse existing components**: Minimal changes to existing CohortSection/CohortSchedule

This approach requires:
- Less backend work
- More API calls on frontend (one per course)
- Acceptable for small course catalogs (<50 courses)

---

## Testing Checklist

### Backend Tests
- [ ] Public sections endpoint returns only open/in_progress sections
- [ ] Enrolled count is calculated correctly
- [ ] Seats available calculation handles null capacity
- [ ] Response includes nested course data
- [ ] Waitlist join creates unique entries (if implemented)

### Frontend Tests
- [ ] CohortSection displays sections correctly
- [ ] Empty state shown when no sections
- [ ] Ongoing vs upcoming split works correctly
- [ ] Seat availability displayed properly
- [ ] Waitlist button shows when section is full (if implemented)

---

## Questions to Clarify

1. **Waitlist Priority**: When should we implement this? Is it a must-have or nice-to-have?
2. **Anonymous Waitlist**: Should non-logged-in users be able to join waitlist with just email?
3. **Course vs Section Enrollment**: Should enrollment button on course detail page default to earliest open section?
4. **Multiple Active Sections**: Can a course have multiple sections with `status='open'` at the same time?
5. **Closed Sections**: Should we show closed sections with "Applications closed" badge or hide them completely?
6. **Application Deadline**: Should we show a countdown when deadline is approaching?

---

## Estimated Effort

### Backend (8-12 hours)
- Public sections endpoint: 2-3 hours
- Enrolled count calculation: 1-2 hours
- Resource creation: 1 hour
- Tests: 2-3 hours
- Waitlist (optional): +3-4 hours

### Frontend (10-14 hours)
- Hook + types: 1-2 hours
- CohortSection refactor: 3-4 hours
- CataloguePage refactor: 3-4 hours
- Testing: 2-3 hours
- Waitlist UI (optional): +2-3 hours

**Total**: 18-26 hours (MVP without waitlist: 15-20 hours)

---

## Next Steps

1. **Review this document** with the team
2. **Clarify questions** above
3. **Decide on scope**: MVP (no waitlist) vs full implementation
4. **Create spec** using the orchestrator workflow:
   - Spec name: `dynamic-cohort-display`
   - Type: New Feature
   - Workflow: Requirements-first or Design-first
5. **Implement backend first**, then frontend (allows testing with real data)
6. **Deploy and test** with actual course sections

---

## Summary

This plan transforms static cohort displays into dynamic, data-driven components that:
- ✅ Show real course sections from the database
- ✅ Display accurate seat availability
- ✅ Separate ongoing vs upcoming cohorts
- ✅ Handle empty states gracefully
- ✅ Support future waitlist functionality
- ✅ Maintain existing UI/UX design
- ✅ Work on both landing page and browse page

The implementation is phased to allow incremental delivery and testing.
