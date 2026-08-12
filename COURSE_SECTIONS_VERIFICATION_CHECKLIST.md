# Course Sections - Verification Checklist

## ✅ Pre-Deployment Verification

Use this checklist to verify the course sections feature before deploying to production.

---

## 🔧 Technical Verification

### Backend (Already Verified ✅)
- [x] All 24 feature tests passing
- [x] API endpoints return correct responses
- [x] Authorization working (admin/instructor only)
- [x] Capacity increase triggers waitlist promotion
- [x] Deletion blocked when history exists
- [x] Status transitions validated
- [x] Audit logging working

### Frontend (Just Completed ✅)
- [x] Dev server compiles without errors
- [x] No TypeScript compilation errors
- [x] All components created
- [x] API hooks implemented
- [x] Integration into CourseBuilderPage complete
- [x] Tab navigation working (Modules | Sections | Analytics)

---

## 🧪 Manual Testing (Ready for You)

### Prerequisites
1. Start backend server: `php artisan serve`
2. Start frontend dev server: `cd frontend && npm run dev`
3. Login as admin or instructor
4. Navigate to a course's Course Builder page

### Test 1: View Sections Tab
- [ ] Navigate to Course Builder for any course
- [ ] See three tabs: Modules, Sections, Analytics
- [ ] Click "Sections" tab
- [ ] Tab highlights with blue underline
- [ ] See either:
  - Empty state with "No sections yet" message and icon, OR
  - Table with existing sections

**Expected**: Tab navigation works, content loads

### Test 2: Create Section (Happy Path)
- [ ] Click "New Section" button (top right)
- [ ] Modal opens with title "Create Section"
- [ ] Fill in required fields:
  - Name: "Test Cohort 2026"
  - Start Date: Select future date
  - End Date: Select date after start
- [ ] Leave optional fields empty (or fill them)
- [ ] Click "Create Section"
- [ ] Modal closes
- [ ] New section appears in table
- [ ] Section shows correct data in all columns

**Expected**: Section created successfully, appears in table

### Test 3: Create Section (Validation)
- [ ] Click "New Section" button
- [ ] Leave Name field empty
- [ ] Click "Create Section"
- [ ] See error: "The name field is required."
- [ ] Fill Name: "Validation Test"
- [ ] Set Start Date: 2026-06-01
- [ ] Set End Date: 2026-03-01 (before start!)
- [ ] Click "Create Section"
- [ ] See error: "The end date must be a date after start date."

**Expected**: Validation errors shown, form not submitted

### Test 4: Edit Section (Basic)
- [ ] Click edit button (pencil icon) on any section
- [ ] Modal opens with pre-filled data
- [ ] Change section name to "Updated Name"
- [ ] Click "Update Section"
- [ ] Modal closes
- [ ] Table updates with new name

**Expected**: Section updated successfully

### Test 5: Edit Section (Status Transitions)
- [ ] Find a section with status "Draft"
- [ ] Click edit button
- [ ] Click Status dropdown
- [ ] Verify you can select: Draft, Open
- [ ] Verify you CANNOT select: In Progress, Completed, Closed (disabled)
- [ ] Select "Open"
- [ ] Click "Update Section"
- [ ] Status badge changes to green "Open"
- [ ] Edit same section again
- [ ] Status dropdown now shows: Open, In Progress, Closed
- [ ] Select "In Progress"
- [ ] Save
- [ ] Status badge changes to blue "In Progress"

**Expected**: Only allowed transitions available, status updates correctly

### Test 6: Edit Section (Capacity Warnings)

#### 6a: Reduce Capacity Below Seats Taken (Blocked)
- [ ] Find section with enrollments (e.g., 25/30)
- [ ] OR create test data: enroll 25 students in a section
- [ ] Click edit button
- [ ] Change capacity to 20 (less than 25 enrolled)
- [ ] See RED error box:
  - "Cannot reduce capacity below current enrollment count (25)"
- [ ] Verify "Update Section" button is DISABLED
- [ ] Click Cancel

**Expected**: Red error shown, submit blocked

#### 6b: Reduce Capacity To Exactly Seats Taken (Warning)
- [ ] Find section with 25 enrolled, capacity 30
- [ ] Click edit button
- [ ] Change capacity to 25 (exactly seats taken)
- [ ] See YELLOW warning box:
  - "Warning: Reducing capacity to 25. No open seats available..."
- [ ] Verify "Update Section" button is ENABLED
- [ ] Click "Update Section"
- [ ] Save succeeds

**Expected**: Yellow warning shown, save allowed

#### 6c: Increase Capacity (No Warning)
- [ ] Find section with waitlisted students
- [ ] OR create test data: section at capacity with 5 waitlisted
- [ ] Click edit button
- [ ] Increase capacity (e.g., 30 → 35)
- [ ] No warnings shown
- [ ] Click "Update Section"
- [ ] Save succeeds
- [ ] (Backend promotes waitlisted students automatically)
- [ ] Refresh page
- [ ] Verify waitlisted count decreased

**Expected**: No warnings, waitlist promoted (check via backend/database)

### Test 7: Delete Section (Allowed)
- [ ] Create a brand new section (no enrollments/applications)
- [ ] Click delete button (trash icon)
- [ ] Confirm deletion in modal
- [ ] Section disappears from table

**Expected**: Section deleted successfully

### Test 8: Delete Section (Blocked)
- [ ] Find section with enrollments or applications
- [ ] Verify delete button is DISABLED (grayed out)
- [ ] Hover over delete button
- [ ] See tooltip: "Cannot delete section with enrollment/application history..."
- [ ] Try clicking (should do nothing)

**Expected**: Delete button disabled, tooltip shows explanation

### Test 9: Empty State
- [ ] Delete all sections for a course (or use course with no sections)
- [ ] Navigate to Sections tab
- [ ] See empty state:
  - Icon (Users icon)
  - Title: "No sections yet"
  - Description: "Create your first section to organize students into cohorts."

**Expected**: Empty state displays correctly

### Test 10: Loading States
- [ ] Throttle network to "Slow 3G" in browser DevTools
- [ ] Navigate to Sections tab
- [ ] See loading spinner while fetching
- [ ] Create/edit/delete section
- [ ] See loading spinner on submit button

**Expected**: Loading states show during async operations

### Test 11: Error Handling

#### 11a: Network Error
- [ ] Disconnect network or stop backend server
- [ ] Try to create section
- [ ] See error message (toast or inline)

**Expected**: Graceful error handling

#### 11b: Delete Section with History (API)
- [ ] Use browser DevTools Network tab
- [ ] Manually enable delete button on section with history (edit DOM)
- [ ] Click delete
- [ ] Backend returns 422 error
- [ ] See error message: "Cannot delete section with history. Use 'Closed' status instead."

**Expected**: API error handled, user-friendly message shown

### Test 12: Table Display

#### Check All Columns
- [ ] Name: Shows section name
- [ ] Status: Shows colored badge (Draft=gray, Open=green, etc.)
- [ ] Dates: Formatted as "MMM DD, YYYY - MMM DD, YYYY"
- [ ] Capacity: Shows "X / Y" or "X / Unlimited"
- [ ] Capacity (with waitlist): Shows "X / Y (Z waitlisted)" when waitlist > 0
- [ ] Applications: Shows "N pending" or "—"
- [ ] Instructor: Shows name or "—"
- [ ] Actions: Edit and Delete buttons

**Expected**: All columns display correct data, properly formatted

### Test 13: Multiple Sections
- [ ] Create 3-5 sections with different statuses
- [ ] Verify all sections appear in table
- [ ] Verify each has correct status badge color
- [ ] Edit one section
- [ ] Verify other sections unaffected

**Expected**: Multiple sections managed independently

### Test 14: Instructor Dropdown
- [ ] Ensure instructors exist in system
- [ ] Create new section
- [ ] See "Primary Instructor" dropdown
- [ ] Verify all instructors listed
- [ ] Select one
- [ ] Save
- [ ] Verify instructor name appears in table

**Expected**: Instructor selection works, displays in table

### Test 15: Tab Switching
- [ ] Start on Modules tab
- [ ] Switch to Sections tab
- [ ] Verify Sections content loads
- [ ] Switch to Analytics tab
- [ ] Verify Analytics content loads
- [ ] Switch back to Sections
- [ ] Verify Sections still works (data cached)

**Expected**: Tab switching smooth, no data loss

### Test 16: Responsive Design
- [ ] Resize browser to mobile width (~375px)
- [ ] Verify table scrolls horizontally if needed
- [ ] Verify buttons still clickable
- [ ] Verify modals fit on screen

**Expected**: Usable on mobile devices

### Test 17: Keyboard Navigation
- [ ] Open Create Section modal
- [ ] Press Tab key
- [ ] Verify focus moves through form fields
- [ ] Press Escape
- [ ] Verify modal closes
- [ ] Open modal again
- [ ] Fill form and press Enter on input
- [ ] Verify form submits (or moves to next field)

**Expected**: Keyboard navigation works

### Test 18: Accessibility
- [ ] Use screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Navigate to Sections tab
- [ ] Verify table structure announced
- [ ] Verify form labels announced
- [ ] Verify error messages announced
- [ ] Verify disabled button states announced

**Expected**: Screen reader friendly

---

## 🎯 Acceptance Criteria

### Must Pass Before Production
- [ ] All manual tests above completed
- [ ] No console errors during normal usage
- [ ] No TypeScript compilation errors
- [ ] Backend tests still passing (24/24)
- [ ] Data persists correctly to database
- [ ] Authorization working (non-admin cannot access)

### Nice to Have (Optional)
- [ ] Unit tests for React components
- [ ] E2E tests with Playwright
- [ ] Performance testing (large number of sections)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

---

## 🐛 Known Issues to Watch For

None at this time. If you encounter issues during testing:

1. Check browser console for errors
2. Check backend logs for API errors
3. Verify database state (sections, enrollments, applications)
4. Review network tab in DevTools for API calls
5. Refer to documentation files for expected behavior

---

## 📊 Test Results Template

Copy this and fill in after testing:

```
=== Course Sections Manual Testing Results ===

Date: _____________
Tester: _____________
Environment: _____________

Technical Verification:
- [ ] Backend tests passing
- [ ] Frontend compiles
- [ ] Dev server starts

Manual Tests:
- [ ] Test 1: View Sections Tab - PASS/FAIL
- [ ] Test 2: Create Section (Happy Path) - PASS/FAIL
- [ ] Test 3: Create Section (Validation) - PASS/FAIL
- [ ] Test 4: Edit Section (Basic) - PASS/FAIL
- [ ] Test 5: Edit Section (Status Transitions) - PASS/FAIL
- [ ] Test 6a: Capacity Blocked - PASS/FAIL
- [ ] Test 6b: Capacity Warning - PASS/FAIL
- [ ] Test 6c: Capacity Increase - PASS/FAIL
- [ ] Test 7: Delete Section (Allowed) - PASS/FAIL
- [ ] Test 8: Delete Section (Blocked) - PASS/FAIL
- [ ] Test 9: Empty State - PASS/FAIL
- [ ] Test 10: Loading States - PASS/FAIL
- [ ] Test 11: Error Handling - PASS/FAIL
- [ ] Test 12: Table Display - PASS/FAIL
- [ ] Test 13: Multiple Sections - PASS/FAIL
- [ ] Test 14: Instructor Dropdown - PASS/FAIL
- [ ] Test 15: Tab Switching - PASS/FAIL
- [ ] Test 16: Responsive Design - PASS/FAIL
- [ ] Test 17: Keyboard Navigation - PASS/FAIL
- [ ] Test 18: Accessibility - PASS/FAIL

Issues Found:
1. _____________
2. _____________
3. _____________

Overall Status: APPROVED / NEEDS WORK

Notes:
_____________________________________________
_____________________________________________
```

---

## 🚀 Deployment Checklist

After all tests pass:

- [ ] Merge feature branch to main
- [ ] Run `npm run build` in frontend (production build)
- [ ] Deploy frontend build
- [ ] Ensure backend migrations run on production
- [ ] Clear application cache
- [ ] Verify in production environment
- [ ] Update user documentation if needed
- [ ] Announce feature to users

---

## 📞 Support

If issues arise during testing:

1. Review documentation files:
   - `COURSE_SECTIONS_USER_GUIDE.md`
   - `COURSE_SECTIONS_COMPONENT_ARCHITECTURE.md`
   - `COURSE_SECTIONS_FRONTEND_IMPLEMENTATION_SUMMARY.md`

2. Check browser console and network tab

3. Review backend logs

4. Contact development team with:
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots/error messages
   - Browser/environment details

---

**Good luck with testing! 🎉**
