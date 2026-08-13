# Bug 2 Investigation: Cohort Applications Not Appearing on Dashboard

## Investigation Steps (DO NOT SKIP)

### Step 1: Capture Network Request/Response

**Action:** Open browser dev tools Network tab, submit an application to a cohort section.

**Record:**
```
Request URL: 
Request Method: POST
Request Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Payload:
{
  // Paste actual payload here
}

Response Status: 
Response Headers:
  // Paste relevant headers

Response Body:
{
  // Paste full response JSON here
}
```

**Questions to answer:**
- Did the request complete successfully (2xx status)?
- Is `section_id` present in the request payload?
- Does the response include the created application with its ID?
- Does the response include the `section` object in the application data?

---

### Step 2: Verify Database Row

**Action:** Immediately after submission, run this query:

```sql
SELECT * FROM course_applications 
WHERE student_id = <test_student_id> 
ORDER BY created_at DESC 
LIMIT 1;
```

**Record:**
```
id: 
student_id: 
course_id: 
section_id: 
status: 
answers: 
portfolio_url: 
alternative_proof_text: 
reviewed_by: 
reviewed_at: 
recommended_course_ids: 
rejection_reason: 
dismissed_at: 
created_at: 
updated_at: 
```

**Questions to answer:**
- Does the row exist?
- Is `section_id` populated with the correct value (not NULL)?
- Is `status` = 'pending'?
- Are all expected fields populated correctly?

---

### Step 3: Test Dashboard API Endpoint

**Action:** Call the dashboard endpoint directly (same student authentication):

**cURL Command:**
```bash
curl -X GET "http://localhost:8000/api/v1/course-applications/me" \
  -H "Authorization: Bearer <same_token_from_step_1>" \
  -H "Accept: application/json"
```

**Or in Browser Console (on authenticated page):**
```javascript
fetch('/api/v1/course-applications/me', {
  headers: { 'Accept': 'application/json' }
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)));
```

**Record:**
```json
{
  "data": [
    // Paste full array of applications here
  ]
}
```

**Questions to answer:**
- Does the response include the application we just created?
- If YES: does it include the `section` object/data?
- If NO: is the array empty or does it contain other (older) applications?
- Does the application ID match the one from Step 2?

---

## Root Cause Analysis

Based on where the data disappears:

### If request fails (Step 1)
- ❌ Request returns 4xx/5xx error
- **Root cause:** Frontend payload or backend validation issue
- **Fix location:** Request validation or service layer

### If row is missing or wrong (Step 2)
- ✅ Request succeeded (Step 1)
- ❌ Database row is missing, or `section_id` is NULL when it shouldn't be
- **Root cause:** Service layer not persisting correctly
- **Fix location:** `CourseApplicationService::apply()`

### If dashboard query excludes it (Step 3)
- ✅ Request succeeded (Step 1)
- ✅ Database row exists with correct `section_id` (Step 2)
- ❌ Dashboard API response doesn't include it
- **Root cause:** Query filtering logic in `visibleForDashboard()` or missing eager-load
- **Fix location:** `CourseApplicationService::visibleForDashboard()` or controller

### If it's in the response but not rendered (Step 3 succeeds)
- ✅ Request succeeded (Step 1)
- ✅ Database row exists (Step 2)
- ✅ Dashboard API returns it (Step 3)
- ❌ UI doesn't show it
- **Root cause:** Frontend rendering logic
- **Fix location:** `ApplicationStatusCard` or `MyCoursesPage` component

---

## Test Data Setup

To ensure we have proper test data, run these commands first:

```bash
# 1. Ensure we have a course with application policy and sections
php artisan tinker
```

Then in tinker:
```php
// Find or create a test course with sections
$course = \App\Models\Course::where('enrolment_policy', 'application')->first();
if (!$course) {
    $course = \App\Models\Course::factory()->create(['enrolment_policy' => 'application']);
}

// Create a section for this course
$section = \App\Models\CourseSection::factory()->create([
    'course_id' => $course->id,
    'status' => 'open_for_enrollment',
    'capacity' => 30,
    'start_date' => now()->addWeeks(2),
    'end_date' => now()->addWeeks(10),
]);

echo "Course ID: {$course->id}\n";
echo "Course Title: {$course->title}\n";
echo "Section ID: {$section->id}\n";
echo "Section Name: {$section->name}\n";

// Get a student user for testing
$student = \App\Models\User::where('role', 'student')->first();
echo "Student ID: {$student->id}\n";
echo "Student Email: {$student->email}\n";
```

**Record the IDs:**
- Course ID: ___________
- Section ID: ___________
- Student ID: ___________
- Student Email: ___________

---

## Next Steps

1. Execute Steps 1-3 above with the test data
2. Fill in ALL the actual runtime data (no guessing)
3. Return with the completed investigation showing exactly where the data disappears
4. ONLY THEN will we create a targeted fix for the specific failure point
