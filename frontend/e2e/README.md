# E2E Tests - Profile Completion Flow

## Overview

This directory contains Playwright E2E tests for the Progressive Student Profile Completion feature (Task 19.1).

## Test Coverage

The `profile-completion.spec.ts` file contains **12 comprehensive test scenarios**:

### Main Flow Tests (8 scenarios)

1. **New user sees profile completion card on dashboard**
   - Verifies profile completion card is visible when profile is incomplete
   - Checks percentage display, progress bar, and checklist of missing fields
   - Validates "Complete Profile" button is present

2. **Clicking "Complete Profile" navigates to form**
   - Tests navigation from dashboard to profile completion page
   - Verifies all required and optional form fields are present
   - Checks proper labeling of required vs optional sections

3. **Form validation shows errors for invalid inputs**
   - Tests phone number validation (invalid characters, too short, too long)
   - Tests required field validation (country, city)
   - Tests URL validation for LinkedIn and portfolio fields
   - Verifies submit button is disabled when form is invalid

4. **Successful submission updates profile and redirects**
   - Tests complete form submission with valid data
   - Verifies success message appears
   - Confirms redirect to dashboard after successful update

5. **Completed profile hides dashboard card**
   - Verifies profile completion card disappears after profile is 100% complete
   - Confirms regular dashboard content is visible

6. **Application guard blocks incomplete profile**
   - Tests course application flow with incomplete profile
   - Verifies error message about profile completion requirement
   - Checks "Complete Profile" action is available

7. **Application guard allows complete profile**
   - Tests course application flow with complete profile
   - Verifies no profile completion error occurs
   - Confirms application flow proceeds normally

8. **Return-to-context flow**
   - Tests full workflow: blocked application → complete profile → return to application
   - Verifies returnUrl is stored and used correctly
   - Confirms user is redirected back to the original course page

### Additional Validation Tests (4 scenarios)

9. **Real-time URL validation for optional fields**
   - Tests immediate validation feedback for URL fields
   - Verifies error appears for invalid URLs and disappears when corrected

10. **Progress bar updates as fields are completed**
    - Tests dynamic percentage calculation as fields are filled
    - Verifies progress bar reflects current completion state

11. **Submit button state changes based on form validity**
    - Tests button is disabled when required fields are missing
    - Verifies button is enabled when all required fields are valid
    - Confirms button is disabled again when a field is cleared

12. **Form pre-populates with existing user data**
    - Tests that returning to profile page shows existing data
    - Verifies all previously saved fields contain correct values

## Running the Tests

### Prerequisites

1. **Backend API must be running** on `http://127.0.0.1:8000`
   ```bash
   cd c:\Users\SONY\resnet_academy
   php artisan serve
   ```

2. **Database must be set up** with proper migrations
   ```bash
   php artisan migrate:fresh --seed
   ```

3. **Frontend dev server** (started automatically by Playwright config)
   - The playwright.config.ts is configured to auto-start the dev server

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

### Run Specific Test

```bash
npx playwright test --grep "New user sees profile completion card"
```

### View Test Report

After running tests, view the HTML report:
```bash
npx playwright show-report
```

## Test Data

Tests use dynamically generated test data with timestamps to avoid conflicts:
- **Email**: `test-{timestamp}@example.com`
- **Name**: Test Student
- **Password**: Password123!

Each test creates a fresh user account to ensure isolation.

## Configuration

- **Browser**: Chromium (Desktop Chrome)
- **Base URL**: http://localhost:5173
- **Timeout**: 10 seconds for navigation
- **Retry**: 2 retries on CI, 0 on local
- **Trace**: On first retry (for debugging failures)

## Continuous Integration

The tests are configured to run in CI with:
- Single worker (no parallel execution)
- Retry on failure (2 attempts)
- HTML reporter for test results

## Troubleshooting

### Tests fail with "Navigation timeout"
- Ensure backend API is running on port 8000
- Check that frontend dev server started successfully
- Verify database migrations are up to date

### Tests fail with "Element not found"
- Check that all required components are implemented
- Verify CSS selectors match the actual implementation
- Ensure authentication is working correctly

### Tests fail with "Profile completion card not visible"
- Verify ProfileService is calculating percentage correctly
- Check that profile status API endpoint is working
- Ensure Dashboard component fetches and displays profile status

### Tests create duplicate users
- This is expected - each test creates a fresh user with a unique timestamp
- Database should be reset between test runs for consistency

## Requirements Validation

These E2E tests validate the following requirements from the specification:

- **Req 3.1-3.6**: Dashboard profile completion card display and behavior
- **Req 4.1-4.7**: Profile completion page functionality
- **Req 5.1-5.6**: Course application guard enforcement
- **Req 7.1-7.5**: Return-to-context flow after profile completion
- **Req 8.1-8.8**: Profile field validation rules
- **Req 13.1-13.5**: Progress indicator and visual feedback
- **Req 14.1-14.6**: Frontend validation before submission

## Design Properties Validated

The E2E tests also validate several design properties:

- **Property 5**: Profile Form Pre-population Correctness
- **Property 6**: Profile Form Validation Completeness
- **Property 17**: Submit Button State Determination

## Maintenance

When updating the profile completion feature:

1. **Update test data** if new required fields are added
2. **Update selectors** if UI components change
3. **Add new test scenarios** for new functionality
4. **Update this README** with any configuration changes
5. **Verify all tests pass** before merging changes

## Related Files

- Implementation: `frontend/src/features/profile/ProfileCompletionPage.tsx`
- Component: `frontend/src/features/profile/ProfileCompletionCard.tsx`
- API Client: `frontend/src/lib/api/profileApi.ts`
- Backend Service: `app/Services/Profile/ProfileService.php`
- Middleware: `app/Http/Middleware/EnsureProfileComplete.php`

## Notes

- Tests use real API calls (no mocking) to validate full integration
- Each test is independent and creates its own test user
- Tests validate both happy path and error cases
- UI interactions simulate real user behavior (clicking, typing, blurring)
- Accessibility attributes (ARIA roles) are used where possible for stable selectors
