# Course Sections Frontend - Implementation Plan

## Overview
Build admin/instructor UI for managing course sections (cohorts) with full CRUD functionality, capacity warnings, and status transitions.

---

## Component Structure

```
frontend/src/features/sections/
├── SectionsManagePage.tsx          // Main page component
├── SectionsList.tsx                 // Table view of sections
├── SectionRow.tsx                   // Individual table row with actions
├── CreateSectionModal.tsx           // Create section form modal
├── EditSectionModal.tsx             // Edit section form modal
├── DeleteSectionDialog.tsx          // Confirm deletion dialog
├── SectionStatusBadge.tsx           // Status visual indicator
├── CapacityWarningAlert.tsx         // Warning for capacity edge cases
├── useSections.ts                   // API hooks
└── types.ts                         // TypeScript interfaces
```

### Integration Point
**Location**: Add new "Sections" tab to `CourseBuilderPage.tsx` (alongside Modules, Analytics tabs)

---

## API Hooks (`useSections.ts`)

### 1. `useSections(courseId: number)`
```typescript
// GET /api/v1/courses/{courseId}/sections
{
  data: CourseSection[] | undefined
  isLoading: boolean
  error: Error | null
}
```

### 2. `useCreateSection(courseId: number)`
```typescript
// POST /api/v1/courses/{courseId}/sections
{
  mutate: (data: CreateSectionInput) => void
  isLoading: boolean
  error: Error | null
}
```

###3. `useUpdateSection(sectionId: number)`
```typescript
// PATCH /api/v1/sections/{sectionId}
{
  mutate: (data: Partial<CreateSectionInput>) => void
  isLoading: boolean
  error: Error | null
}
```

### 4. `useDeleteSection(sectionId: number)`
```typescript
// DELETE /api/v1/sections/{sectionId}
{
  mutate: () => void
  isLoading: boolean
  error: Error | null
}
```

---

## TypeScript Interfaces (`types.ts`)

```typescript
export enum CourseSectionStatus {
  Draft = 'draft',
  Open = 'open',
  InProgress = 'in_progress',
  Completed = 'completed',
  Closed = 'closed',
}

export interface CourseSection {
  id: number
  course_id: number
  name: string
  start_date: string // ISO date
  end_date: string
  application_deadline?: string
  capacity?: number
  seats_taken: number
  status: CourseSectionStatus
  primary_instructor_id?: number
  primary_instructor?: {
    id: number
    name: string
    email: string
  }
  enrolled_count: number
  waitlisted_count: number
  applications_pending_count: number
  is_full: boolean
  is_accepting_applications: boolean
  created_at: string
  updated_at: string
}

export interface CreateSectionInput {
  name: string
  start_date: string
  end_date: string
  application_deadline?: string
  capacity?: number
  status: CourseSectionStatus
  primary_instructor_id?: number
}
```

---

## UI Components Detail

### 1. SectionsManagePage.tsx
**Purpose**: Main container for sections management

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ Course Sections                    [+ New Section] │
├────────────────────────────────────────────────────┤
│                                                    │
│  <SectionsList sections={sections} />             │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Features**:
- Header with "New Section" button
- Loading state while fetching
- Empty state if no sections exist
- Error handling

### 2. SectionsList.tsx
**Purpose**: Table displaying all sections

**Columns**:
1. **Name** - Section name (e.g., "Spring 2026 Cohort")
2. **Status** - `<SectionStatusBadge status={section.status} />`
3. **Dates** - "Mar 1 - Jun 30, 2026"
4. **Capacity** - "25 / 30" or "25 / Unlimited"
   - Show waitlisted count if > 0: "25 / 30 (5 waitlisted)"
5. **Applications** - "3 pending" (if > 0)
6. **Instructor** - Instructor name or "—"
7. **Actions** - Edit, Delete buttons

**Row Styling**:
- Completed: muted/gray text
- Closed: orange accent
- InProgress: blue accent
- Open: green accent
- Draft: gray/dashed border

### 3. SectionRow.tsx
**Purpose**: Individual table row with inline actions

**Actions**:
- **Edit button** - Opens EditSectionModal
- **Delete button**:
  - **Enabled** if section has zero enrollments/applications
  - **Disabled** with tooltip if section has history
  - Tooltip text: "Cannot delete section with enrollment/application history. Mark as 'Closed' instead."

### 4. SectionStatusBadge.tsx
**Purpose**: Visual status indicator

**Colors**:
- `draft`: Gray badge
- `open`: Green badge
- `in_progress`: Blue badge
- `completed`: Purple badge
- `closed`: Orange badge

**Implementation**: Reuse existing Badge component with dynamic color

### 5. CreateSectionModal.tsx
**Purpose**: Form for creating new section

**Form Fields**:
1. **Name*** - Text input, required
2. **Start Date*** - Date picker, required
3. **End Date*** - Date picker, required, must be after start date
4. **Application Deadline** - Date picker, optional, must be before start date if set
5. **Capacity** - Number input, optional (leave empty for unlimited)
6. **Status*** - Dropdown with all statuses, default: Draft
7. **Primary Instructor** - Dropdown of instructors, optional

**Validation**:
- Client-side: same rules as backend
- Show inline errors for each field
- Disable submit while loading

**UX**:
- Modal with dark overlay
- "Create Section" title
- Cancel + Submit buttons
- Loading spinner on submit button while creating

### 6. EditSectionModal.tsx
**Purpose**: Form for updating existing section

**Same fields as Create, plus**:

#### Status Dropdown Logic:
- Only show **allowed next statuses** based on current status
- Current status always available (no-op)
- Grayed-out/disabled statuses that are invalid transitions

**Allowed Transitions Map**:
```typescript
const ALLOWED_TRANSITIONS = {
  draft: ['draft', 'open'],
  open: ['open', 'in_progress', 'closed'],
  in_progress: ['in_progress', 'completed'],
  closed: ['closed', 'open'], // Allow reopening
  completed: ['completed'], // Terminal
}
```

#### Capacity Change Warning:
**If new capacity < old capacity AND new capacity >= seats_taken**:
```
⚠️ Warning: Reducing capacity to {newCapacity}
No open seats available. Withdrawals will not trigger waitlist promotion until capacity is increased again.
```

- Show as yellow/orange alert box below capacity field
- Only show when user changes capacity value
- Not blocking - user can still save

**If new capacity < seats_taken**:
```
❌ Error: Cannot reduce capacity below current enrollment count ({seats_taken})
```

- Red alert, blocking
- Submit button disabled

### 7. DeleteSectionDialog.tsx
**Purpose**: Confirmation before deletion

**Content**:
```
Delete "{sectionName}"?

This action cannot be undone. Only sections with no enrollment 
or application history can be deleted.

[Cancel]  [Delete Section]
```

**Behavior**:
- Called when delete button clicked
- If backend returns 422 (has history), show error toast:
  "Cannot delete section with history. Use 'Closed' status instead."

### 8. CapacityWarningAlert.tsx
**Purpose**: Reusable warning/error alert for capacity issues

**Variants**:
- `warning` - Yellow, for capacity reduction warning
- `error` - Red, for validation errors

---

## CourseBuilderPage Integration

**Location**: `frontend/src/features/courseStructure/CourseBuilderPage.tsx`

**Changes**:
1. Add new tab: "Sections"
2. Conditional render based on active tab
3. Pass `courseId` prop to `<SectionsManagePage courseId={courseId} />`

**Tab Order**: Modules | Sections | Analytics

**Code Sketch**:
```typescript
const tabs = [
  { id: 'modules', label: 'Modules' },
  { id: 'sections', label: 'Sections' },
  { id: 'analytics', label: 'Analytics' },
]

// In render:
{activeTab === 'sections' && (
  <SectionsManagePage courseId={courseId} />
)}
```

---

## API Integration Examples

### Fetch Sections
```typescript
const { data: sections, isLoading } = useSections(courseId)
```

### Create Section
```typescript
const createSection = useCreateSection(courseId)

const handleCreate = (values: CreateSectionInput) => {
  createSection.mutate(values, {
    onSuccess: () => {
      toast.success('Section created successfully')
      closeModal()
      queryClient.invalidateQueries(['sections', courseId])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
```

### Update Section
```typescript
const updateSection = useUpdateSection(sectionId)

const handleUpdate = (values: Partial<CreateSectionInput>) => {
  updateSection.mutate(values, {
    onSuccess: () => {
      toast.success('Section updated successfully')
      closeModal()
      queryClient.invalidateQueries(['sections', courseId])
    },
    onError: (error) => {
      // Handle capacity validation errors
      if (error.response?.status === 422) {
        setFieldError('capacity', error.response.data.error.fields.capacity[0])
      }
    },
  })
}
```

### Delete Section
```typescript
const deleteSection = useDeleteSection(sectionId)

const handleDelete = () => {
  deleteSection.mutate(undefined, {
    onSuccess: () => {
      toast.success('Section deleted successfully')
      closeDialog()
      queryClient.invalidateQueries(['sections', courseId])
    },
    onError: (error) => {
      if (error.response?.status === 422) {
        toast.error("Cannot delete section with history. Use 'Closed' status instead.")
      } else {
        toast.error('Failed to delete section')
      }
    },
  })
}
```

---

## Styling Guidelines

**Follow existing patterns from**:
- `ApplicationsPage.tsx` - table layout, status badges
- `CourseBuilderPage.tsx` - tab navigation
- `ModuleTableRow.tsx` - inline action buttons

**Colors** (from Tailwind config):
- Draft: `bg-gray-100 text-gray-800`
- Open: `bg-green-100 text-green-800`
- InProgress: `bg-blue-100 text-blue-800`
- Completed: `bg-purple-100 text-purple-800`
- Closed: `bg-orange-100 text-orange-800`

**Button States**:
- Disabled delete button: `opacity-50 cursor-not-allowed`
- With tooltip: Use existing Tooltip component

---

## Accessibility

- ✅ All form inputs have labels
- ✅ Error messages announced to screen readers
- ✅ Modals trap focus
- ✅ ESC key closes modals
- ✅ Delete button has aria-label when disabled
- ✅ Table has proper semantic markup (`<table>`, `<thead>`, `<tbody>`)

---

## Testing Considerations

**Unit Tests** (`SectionsManagePage.test.tsx`):
1. Renders empty state when no sections
2. Renders sections list when data loaded
3. Opens create modal on button click
4. Opens edit modal on edit button click
5. Shows delete confirmation dialog
6. Disables delete button when section has history
7. Shows capacity warning when reducing capacity
8. Restricts status dropdown to allowed transitions

**Mock API responses** for all hooks

---

## Implementation Order

1. ✅ **Backend Complete** (already done)
2. **Types & Hooks** - Define interfaces, create API hooks
3. **Status Badge** - Small, reusable component
4. **Sections List** - Table view without actions
5. **Create Modal** - Form + validation
6. **Edit Modal** - Form + capacity warnings + status restrictions
7. **Delete Dialog** - Confirmation + error handling
8. **Section Row** - Inline actions + tooltips
9. **Main Page** - Compose all components
10. **Integration** - Add to CourseBuilderPage
11. **Testing** - Unit tests for key flows

---

## Edge Cases Handled

1. ✅ No sections exist (empty state)
2. ✅ Section has history (disable delete, show tooltip)
3. ✅ Capacity reduced to exactly seats_taken (show warning, allow)
4. ✅ Capacity reduced below seats_taken (show error, block)
5. ✅ Invalid status transition (dropdown only shows valid options)
6. ✅ Form validation errors (inline field errors)
7. ✅ API errors (toast notifications)
8. ✅ Loading states (skeleton/spinner)

---

## Questions Before Implementation

None - all requirements are clear from backend implementation and user approval. Ready to proceed with implementation.

---

## Status: Ready for Implementation ✅

Awaiting approval to proceed with frontend development.
