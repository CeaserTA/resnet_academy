# Course Sections - Component Architecture

## Visual Component Tree

```
CourseBuilderPage
├── Tab Navigation (Modules | Sections | Analytics)
│
├── [Modules Tab]
│   ├── Module Management Card
│   │   ├── Header with "New Module" button
│   │   ├── ModulesList (table)
│   │   │   └── ModuleTableRow (per module)
│   │   └── CreateModuleModal
│   └── TrashedModulesSection
│
├── [Sections Tab] ⭐ NEW
│   └── Card
│       └── SectionsManagePage
│           ├── Header
│           │   ├── "Course Sections" title
│           │   └── "New Section" button
│           ├── Error Display (if any)
│           ├── Loading Spinner (conditional)
│           ├── Empty State (if no sections)
│           ├── SectionsList (table)
│           │   ├── Table Header
│           │   └── SectionRow (per section)
│           │       ├── Section Name
│           │       ├── SectionStatusBadge
│           │       ├── Dates (formatted)
│           │       ├── Capacity (with waitlist)
│           │       ├── Applications count
│           │       ├── Instructor name
│           │       └── Actions
│           │           ├── Edit button
│           │           └── Delete button (disabled if history)
│           ├── CreateSectionModal
│           │   ├── Name input
│           │   ├── Start Date input
│           │   ├── End Date input
│           │   ├── Application Deadline input
│           │   ├── Capacity input
│           │   ├── Status dropdown
│           │   ├── Instructor dropdown
│           │   └── Submit/Cancel buttons
│           ├── EditSectionModal
│           │   ├── (same fields as Create)
│           │   ├── Status dropdown (restricted transitions)
│           │   ├── Capacity warnings
│           │   │   ├── RED: capacity < seats_taken (blocking)
│           │   │   └── YELLOW: capacity == seats_taken (warning)
│           │   └── Submit/Cancel buttons
│           └── DeleteSectionDialog
│               ├── Confirmation text
│               └── Delete/Cancel buttons
│
└── [Analytics Tab]
    ├── Course Analytics Stats
    │   ├── Enrolled students
    │   ├── Completion rate
    │   └── At-risk students
    ├── EnrollmentTable
    └── AtRiskStudentsTable
```

---

## Data Flow

```
User Action → Component → Hook → API → Backend

Example: Create Section
1. User fills CreateSectionModal form
2. User clicks "Create Section"
3. Component calls handleSubmit()
4. handleSubmit() calls createSection.mutateAsync(payload)
5. useCreateSection hook executes
6. api.ts createSection() makes POST request
7. Backend CourseSectionController@store
8. Backend validates, creates section, returns response
9. React Query invalidates cache
10. useSections hook refetches
11. SectionsList updates with new section
12. Modal closes
```

---

## State Management

### Local Component State
- **SectionsManagePage**:
  - `isCreating: boolean` - Create modal open/closed
  - `editingSection: CourseSection | null` - Section being edited
  - `deletingSection: CourseSection | null` - Section being deleted
  - `errorMessage: string | null` - Error toast message

- **CreateSectionModal**:
  - Form field states (name, startDate, endDate, etc.)
  - `errors: Record<string, string>` - Validation errors

- **EditSectionModal**:
  - Form field states (pre-populated from section prop)
  - `errors: Record<string, string>` - Validation errors

- **CourseBuilderPage**:
  - `activeTab: 'modules' | 'sections' | 'analytics'` - Active tab

### React Query Cache
- **Query Keys**:
  - `['courses', courseId, 'sections']` - All sections for a course
  - `['admin', 'users', 'instructor']` - All instructors

- **Mutations**:
  - `createSection` - Invalidates sections query
  - `updateSection` - Invalidates sections query
  - `deleteSection` - Invalidates sections query

---

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **SectionsManagePage** | Container; orchestrates modals; fetches data; handles errors |
| **SectionsList** | Table layout; maps sections to rows |
| **SectionRow** | Display single section; action buttons |
| **SectionStatusBadge** | Visual status indicator with colors |
| **CreateSectionModal** | Form for new section; validation; submission |
| **EditSectionModal** | Form for existing section; capacity warnings; status restrictions |
| **DeleteSectionDialog** | Confirmation; error handling |
| **useSections** | Fetch sections via React Query |
| **useCreateSection** | Create mutation; cache invalidation |
| **useUpdateSection** | Update mutation; cache invalidation |
| **useDeleteSection** | Delete mutation; cache invalidation |
| **api.ts** | HTTP requests to backend |

---

## Reusable Components Used

From `@/components/ui/`:
- **Button** - All action buttons (primary, secondary, ghost, destructive)
- **Input** - Text, date, number inputs
- **Modal** - All dialogs (Create, Edit, Delete)
- **Spinner** - Loading states
- **EmptyState** - No sections placeholder
- **Badge** - Status indicators

From `lucide-react`:
- **Plus** - New Section button
- **Pencil** - Edit button
- **Trash2** - Delete button
- **Users** - Empty state icon
- **AlertTriangle** - Capacity warning
- **XCircle** - Capacity error

---

## Props Interface

```typescript
// SectionsManagePage
interface SectionsManagePageProps {
    courseId: number;
    instructors?: Array<{ id: number; name: string }>;
}

// CreateSectionModal
interface CreateSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    instructors?: Array<{ id: number; name: string }>;
}

// EditSectionModal
interface EditSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    section: CourseSection;
    instructors?: Array<{ id: number; name: string }>;
}

// DeleteSectionDialog
interface DeleteSectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    courseId: number;
    section: CourseSection;
    onError: (message: string) => void;
}

// SectionsList
interface SectionsListProps {
    sections: CourseSection[];
    onEdit: (section: CourseSection) => void;
    onDelete: (section: CourseSection) => void;
}

// SectionRow
interface SectionRowProps {
    section: CourseSection;
    onEdit: () => void;
    onDelete: () => void;
}

// SectionStatusBadge
interface SectionStatusBadgeProps {
    status: CourseSectionStatus;
}
```

---

## Validation Logic

### Client-Side (Form)
- **Required fields**: name, start_date, end_date
- **Date logic**: end_date must be after start_date
- **Capacity**: Must be positive integer or empty (unlimited)
- **Application deadline**: Must be before start_date if set

### Server-Side (Backend)
- Same as client-side, plus:
- **Date restrictions**: start_date can be in past (for backfilling)
- **Capacity reduction**: Cannot reduce below seats_taken
- **Status transitions**: Enforces workflow rules
- **Deletion**: Blocks if any enrollments/applications exist

### EditSectionModal Computed Validation
```typescript
const newCapacity = capacity ? parseInt(capacity, 10) : undefined;
const oldCapacity = section.capacity;
const seatsTaken = section.seats_taken;

// Red error (blocking)
const capacityBelowSeats = newCapacity !== undefined && newCapacity < seatsTaken;

// Yellow warning (non-blocking)
const capacityReducedToSeats =
    newCapacity !== undefined &&
    oldCapacity !== undefined &&
    newCapacity < oldCapacity &&
    newCapacity >= seatsTaken &&
    newCapacity === seatsTaken;
```

---

## Status Transition Logic

```typescript
const ALLOWED_TRANSITIONS: Record<CourseSectionStatus, CourseSectionStatus[]> = {
    [CourseSectionStatus.Draft]: [
        CourseSectionStatus.Draft,
        CourseSectionStatus.Open
    ],
    [CourseSectionStatus.Open]: [
        CourseSectionStatus.Open,
        CourseSectionStatus.InProgress,
        CourseSectionStatus.Closed
    ],
    [CourseSectionStatus.InProgress]: [
        CourseSectionStatus.InProgress,
        CourseSectionStatus.Completed
    ],
    [CourseSectionStatus.Closed]: [
        CourseSectionStatus.Closed,
        CourseSectionStatus.Open // Allow reopening
    ],
    [CourseSectionStatus.Completed]: [
        CourseSectionStatus.Completed // Terminal state
    ],
};
```

**Workflow**:
1. Start as Draft
2. Open for applications/enrollment
3. (Optional) Close temporarily
4. Mark In Progress when course starts
5. Mark Completed when course ends

---

## Delete Button Logic

```typescript
const hasHistory = 
    section.enrolled_count > 0 ||
    section.waitlisted_count > 0 ||
    section.applications_pending_count > 0;

<Button
    variant="ghost"
    onClick={onDelete}
    disabled={hasHistory}
    title={
        hasHistory
            ? "Cannot delete section with enrollment/application history. Mark as 'Closed' instead."
            : undefined
    }
>
    <Trash2 />
</Button>
```

**Backend will also enforce**:
- Check `enrollments` table (any status)
- Check `course_applications` table (any status)
- Return 422 if found

---

## Error Handling

### API Errors
```typescript
try {
    await createSection.mutateAsync(payload);
    onClose();
} catch (error) {
    const apiError = error as ApiError;
    if (apiError.fields) {
        // Show inline field errors
        const fieldErrors: Record<string, string> = {};
        Object.entries(apiError.fields).forEach(([field, messages]) => {
            fieldErrors[field] = messages[0];
        });
        setErrors(fieldErrors);
    }
}
```

### Delete Errors
```typescript
try {
    await deleteSection.mutateAsync();
    onClose();
} catch (error) {
    const apiError = error as ApiError;
    if (apiError.status === 422) {
        onError("Cannot delete section with history. Use 'Closed' status instead.");
    } else {
        onError('Failed to delete section. Please try again.');
    }
    onClose();
}
```

### Error Display
```tsx
{errorMessage && (
    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
        {errorMessage}
    </div>
)}
```

Auto-clears after 5 seconds:
```typescript
const handleError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 5000);
};
```

---

## Styling Patterns

### Status Badge Colors
```typescript
const statusConfig = {
    [CourseSectionStatus.Draft]: { label: 'Draft', tone: 'neutral' },
    [CourseSectionStatus.Open]: { label: 'Open', tone: 'success' },
    [CourseSectionStatus.InProgress]: { label: 'In Progress', tone: 'progress' },
    [CourseSectionStatus.Completed]: { label: 'Completed', tone: 'info' },
    [CourseSectionStatus.Closed]: { label: 'Closed', tone: 'warning' },
};
```

### Capacity Warnings
**Red Error** (blocking):
```tsx
<div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
    <XCircle className="mt-0.5 size-4 shrink-0" />
    <p>Cannot reduce capacity below current enrollment count ({seatsTaken}).</p>
</div>
```

**Yellow Warning** (non-blocking):
```tsx
<div className="flex items-start gap-2 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
    <p>Warning: Reducing capacity to {newCapacity}. No open seats available...</p>
</div>
```

### Table Styling
```tsx
<table className="w-full text-sm">
    <thead className="bg-surface-100 text-left">
        <tr>
            <th className="px-4 py-2 font-medium text-ink-600">Name</th>
            ...
        </tr>
    </thead>
    <tbody>
        <tr className="border-b border-surface-100 hover:bg-surface-50">
            <td className="px-4 py-3 text-sm text-ink-900">{section.name}</td>
            ...
        </tr>
    </tbody>
</table>
```

---

## Accessibility Features

1. **Semantic HTML**: `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`
2. **Form Labels**: All inputs have associated `<label>` elements
3. **Button Labels**: `aria-label` on icon-only buttons
4. **Disabled States**: Proper `disabled` attribute + tooltip explanation
5. **Focus Management**: Radix Modal traps focus, returns on close
6. **Keyboard Navigation**: ESC closes modals, Tab/Shift+Tab cycles focus
7. **Screen Reader**: Error messages announced, status changes announced

---

## Performance Considerations

1. **React Query Caching**: Sections fetched once, cached until invalidated
2. **Optimistic Updates**: Not implemented (could be added for better UX)
3. **Debouncing**: Not needed (form submit is explicit action)
4. **Virtualization**: Not needed (reasonable number of sections per course)
5. **Lazy Loading**: Components loaded on demand (tab switching)

---

## Browser Compatibility

Tested with:
- Chrome/Edge (Chromium)
- Firefox
- Safari

Uses modern React (18+) and Vite dev server.

---

## Future Improvements

1. **Optimistic Updates**: Update UI immediately, rollback on error
2. **Undo/Redo**: Allow undoing delete/edit actions
3. **Keyboard Shortcuts**: Ctrl+N for new section, Escape to close modals
4. **Drag-and-Drop**: Reorder sections in table
5. **Bulk Actions**: Select multiple sections, close/delete in batch
6. **Real-time Updates**: WebSocket for live enrollment/waitlist counts
7. **Advanced Filtering**: By date range, status, instructor
8. **Export**: Download sections as CSV/Excel
9. **Calendar View**: Visual timeline of sections
10. **Section Cloning**: Duplicate section with one click
