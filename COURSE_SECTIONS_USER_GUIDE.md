# Course Sections - User Guide

## Quick Start

### Accessing Sections Management
1. Navigate to Course Builder: `/admin/courses/{courseId}`
2. Click the **"Sections"** tab (between Modules and Analytics)
3. You'll see the sections table or an empty state

---

## Creating a New Section

1. Click the **"New Section"** button (top right)
2. Fill in the required fields:
   - **Section Name**: e.g., "Spring 2026 Cohort"
   - **Start Date**: When the section begins
   - **End Date**: When the section ends
3. Optional fields:
   - **Application Deadline**: Last day to apply (leave empty if open enrollment)
   - **Capacity**: Max students (leave empty for unlimited)
   - **Status**: Draft, Open, In Progress, Completed, or Closed (default: Draft)
   - **Primary Instructor**: Select from dropdown (if instructors exist)
4. Click **"Create Section"**

### Validation Rules
- End date must be after start date
- Application deadline must be before start date (if set)
- Capacity must be a positive number (if set)

---

## Editing a Section

1. Click the **pencil icon** (Edit button) next to the section
2. Modify any fields
3. Click **"Update Section"**

### Special Cases

#### Status Transitions
The status dropdown only shows **allowed next statuses**:

| Current Status | Can Change To |
|----------------|---------------|
| Draft          | Draft, Open |
| Open           | Open, In Progress, Closed |
| In Progress    | In Progress, Completed |
| Closed         | Closed, Open (allow reopening) |
| Completed      | Completed (terminal - no changes) |

**Invalid transitions are disabled** with "(not allowed)" label.

#### Capacity Changes

**⚠️ Warning (Yellow)** - Reducing capacity to exactly seats_taken:
```
Warning: Reducing capacity to 25.
No open seats available. Withdrawals will not trigger waitlist 
promotion until capacity is increased again.
```
- **Action**: You can still save this change
- **Effect**: No waitlist promotion until capacity increases

**❌ Error (Red)** - Reducing capacity below seats_taken:
```
Cannot reduce capacity below current enrollment count (30).
Please adjust capacity or withdraw students first.
```
- **Action**: Submit button is disabled
- **Solution**: Either increase capacity or withdraw students first

**✅ Increasing Capacity**:
- Backend automatically promotes waitlisted students (oldest first)
- No warning shown in UI

---

## Deleting a Section

### When Deletion is Allowed
- Section has **zero** enrollments (confirmed, waitlisted, or withdrawn)
- Section has **zero** applications (pending, rejected, or dismissed)
- Essentially: section has never been used

### How to Delete
1. Click the **trash icon** (Delete button) next to the section
2. Confirm in the dialog: **"Delete Section"**
3. Section is permanently removed

### When Deletion is Blocked
If the section has any history:
- Delete button is **disabled** (grayed out)
- Hover tooltip shows: *"Cannot delete section with enrollment/application history. Mark as 'Closed' instead."*
- If you try via API, you'll get an error: *"Cannot delete section with history. Use 'Closed' status instead."*

**Solution**: Change status to **"Closed"** instead of deleting.

---

## Understanding the Table

### Columns

| Column | Description |
|--------|-------------|
| **Name** | Section name (e.g., "Spring 2026 Cohort") |
| **Status** | Colored badge (Draft, Open, In Progress, Completed, Closed) |
| **Dates** | Start - End dates (formatted: "Mar 1 - Jun 30, 2026") |
| **Capacity** | Current enrollment vs. max<br>Examples:<br>• "25 / 30" - 25 enrolled, 30 max<br>• "25 / Unlimited" - no cap<br>• "30 / 30 (5 waitlisted)" - full with waitlist |
| **Applications** | Pending applications count<br>• "3 pending" - 3 applications to review<br>• "—" - no pending applications |
| **Instructor** | Primary instructor name or "—" |
| **Actions** | Edit (pencil) and Delete (trash) buttons |

### Status Badge Colors

| Status | Color | Meaning |
|--------|-------|---------|
| Draft | Gray | Section being prepared, not visible to students |
| Open | Green | Accepting applications/enrollments |
| In Progress | Blue | Course is running |
| Completed | Purple | Course finished |
| Closed | Orange | Temporarily closed for applications |

---

## Common Workflows

### Scenario 1: Setting Up a New Cohort
1. Create section with status **"Draft"**
2. Set start/end dates and capacity
3. Assign primary instructor
4. When ready, edit status to **"Open"**
5. Students can now apply/enroll

### Scenario 2: Course Starting
1. Section status is **"Open"**
2. When course actually begins, edit status to **"In Progress"**
3. Students are now actively learning

### Scenario 3: Course Ending
1. Section status is **"In Progress"**
2. When course completes, edit status to **"Completed"**
3. Status is now terminal (cannot change)

### Scenario 4: Temporarily Closing Applications
1. Section status is **"Open"**
2. Edit status to **"Closed"** (e.g., cohort full, review period)
3. Later, edit status back to **"Open"** to reopen

### Scenario 5: Increasing Capacity
1. Section has 30/30 enrolled with 5 waitlisted
2. Edit section, change capacity to 35
3. Backend automatically promotes 5 waitlisted students to confirmed
4. New capacity: 35/35 with 0 waitlisted

### Scenario 6: Reducing Capacity (Safe)
1. Section has 25/30 enrolled
2. Edit section, change capacity to 25
3. See yellow warning: "No open seats available..."
4. Click "Update Section" (allowed)
5. New capacity: 25/25 with 0 open seats

### Scenario 7: Reducing Capacity (Blocked)
1. Section has 30/30 enrolled
2. Try to change capacity to 25
3. See red error: "Cannot reduce capacity below 30"
4. Submit button is disabled
5. Solution: Either keep capacity at 30+ or withdraw 5 students first

---

## Error Messages

### Create/Edit Validation
- **"The name field is required."** - Must provide section name
- **"The end date must be a date after start date."** - Invalid date range
- **"The application deadline must be a date before start date."** - Deadline after start
- **"The capacity must be at least 1."** - Zero or negative capacity

### Delete Errors
- **"Cannot delete section with history. Use 'Closed' status instead."** - Section has enrollments/applications
- **"Failed to delete section. Please try again."** - Generic server error

### Status Transition Errors
- **"The selected status is invalid."** - Tried invalid transition (e.g., Completed → Draft)

---

## Tips & Best Practices

### ✅ Do
- Use **Draft** status while setting up
- Set realistic capacity based on resources
- Assign primary instructor for clarity
- Use **Closed** instead of deleting sections with history
- Increase capacity to auto-promote waitlisted students

### ❌ Don't
- Don't delete sections with enrollments (use Closed status)
- Don't reduce capacity below current enrollments
- Don't skip status workflow (e.g., Draft → Completed directly)
- Don't set end date before start date

### 💡 Pro Tips
1. **Naming convention**: Use format like "Season YYYY Cohort" (e.g., "Fall 2026 Cohort")
2. **Capacity planning**: Leave some buffer (e.g., 28 instead of 30) for last-minute additions
3. **Application deadlines**: Set 1-2 weeks before start date to allow time for processing
4. **Status updates**: Update status promptly to keep data accurate
5. **Instructor assignment**: Assign before opening to avoid confusion

---

## Keyboard Shortcuts

- **ESC** - Close any open modal
- **Tab** / **Shift+Tab** - Navigate form fields
- **Enter** - Submit form (when input focused)

---

## Troubleshooting

### Problem: Can't create section
**Check**:
- All required fields filled? (Name, Start Date, End Date)
- End date after start date?
- Application deadline before start date (if set)?
- Capacity positive number (if set)?

### Problem: Can't change status
**Check**:
- Is the transition allowed? (See Status Transitions table above)
- Is status already Completed? (terminal state)

### Problem: Can't reduce capacity
**Check**:
- Is new capacity < current seats_taken?
- **Solution**: Withdraw students first or increase capacity

### Problem: Can't delete section
**Check**:
- Does section have enrollments? (confirmed, waitlisted, or withdrawn)
- Does section have applications? (pending, rejected, or dismissed)
- **Solution**: Use "Closed" status instead of deleting

### Problem: Waitlisted students not promoted
**Check**:
- Did you increase capacity? (Backend auto-promotes on capacity increase)
- Are there waitlisted students? (Check "Capacity" column for waitlist count)
- **Note**: Promotion happens on backend, not triggered by UI action

---

## FAQ

**Q: What's the difference between "Closed" and deleting a section?**  
A: "Closed" temporarily disables applications but preserves history. Deletion permanently removes the section (only allowed if no history).

**Q: Can I reopen a closed section?**  
A: Yes! Change status from "Closed" to "Open".

**Q: What happens when I increase capacity?**  
A: Backend automatically promotes waitlisted students (oldest first) up to the new capacity.

**Q: What happens when I decrease capacity?**  
A: If new capacity ≥ seats_taken, it's allowed with a warning. If new capacity < seats_taken, it's blocked.

**Q: Can I change a completed section back to in progress?**  
A: No, "Completed" is a terminal status. You'd need to create a new section.

**Q: Can I have multiple sections for one course?**  
A: Yes! That's the whole point of cohorts. Each section has its own enrollments, dates, and capacity.

**Q: Do sections share modules?**  
A: Yes, all sections of a course use the same modules. Section-relative unlocking is controlled by `unlock_offset_days` in the modules table.

**Q: Can a student be in multiple sections of the same course?**  
A: No, backend enforces one enrolment per student per course (checked in enrolment creation logic).

**Q: What's the primary instructor for?**  
A: It's informational - identifies the main instructor for the cohort. Optional field.

---

## Related Features

### Enrollments
- Managed separately via Enrolment Management
- Each enrolment belongs to one section
- Status: Confirmed, Waitlisted, Withdrawn

### Applications
- Managed via Applications page
- Each application targets one section
- Status: Pending, Approved, Rejected, Dismissed

### Module Unlocking
- Modules can unlock relative to section start date
- Configured via `unlock_offset_days` in modules table
- Example: Module 2 unlocks 7 days after section starts

### Waitlist
- Automatic promotion when capacity increases
- Automatic promotion when someone withdraws (if seats available)
- Oldest waitlisted student promoted first

---

## Getting Help

If you encounter issues:
1. Check this guide first
2. Review error messages (they're usually descriptive)
3. Check browser console for technical errors
4. Contact your system administrator

---

## Change Log

**Version 1.0** (Initial Release)
- Full CRUD for sections
- Status transitions
- Capacity warnings
- Delete protection
- Tab integration in Course Builder
