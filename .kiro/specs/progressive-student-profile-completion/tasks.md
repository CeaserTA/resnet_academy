# Implementation Plan: Progressive Student Profile Completion

## Overview

This implementation plan converts the Progressive Student Profile Completion design into a series of actionable coding tasks for a code-generation LLM. The feature allows students to register with minimal information (Name, Email, Password) and complete their profile progressively before applying for courses. The system tracks profile completeness, displays completion progress on the dashboard, and enforces required profile fields before course applications.

The implementation follows a Laravel backend + React frontend architecture, reuses the existing `users` table with minimal schema changes, and introduces a centralized ProfileService for managing profile completeness logic.

## Tasks

- [x] 1. Set up database schema and migrations
  - Create migration file `xxxx_xx_xx_add_profile_fields_to_users_table.php`
  - Add new columns: `phone`, `country`, `city`, `highest_qualification`, `bio`, `occupation`, `linkedin_profile`, `portfolio_website`, `first_name`, `last_name`
  - Ensure all new columns are nullable
  - Add index on `phone` column
  - Update User model's `$fillable` array to include new fields
  - Run migration and verify schema changes
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 2. Implement ProfileService with core completeness logic
  - [x] 2.1 Create ProfileService class in `app/Services/Profile/ProfileService.php`
    - Implement `getRequiredFields()` method to return array of required field names
    - Implement `getCompletionPercentage(User $user)` method with calculation logic
    - Implement `getMissingFields(User $user)` method to identify incomplete fields
    - Implement `isProfileComplete(User $user)` method returning boolean
    - Implement `getProfileStatus(User $user)` method returning detailed status array
    - Define required fields list: name, email, phone, country, city, highest_qualification
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 2.2, 2.3_
  
  - [x] 2.2 Write property test for profile completion percentage calculation
    - **Property 1: Profile Completion Percentage Calculation Accuracy**
    - **Validates: Requirements 2.1, 2.3, 2.6**
    - Generate random user objects with various field combinations
    - Verify percentage equals (completed required fields / total required fields) × 100
    - Ensure optional fields do not affect calculation
    - Use minimum 100 iterations
  
  - [x] 2.3 Write property test for missing fields detection
    - **Property 2: Missing Fields Detection Accuracy**
    - **Validates: Requirements 6.3**
    - Generate random user objects with various field states
    - Verify missing fields list contains exactly null/empty required fields
    - Ensure fields with valid values are not included
    - Use minimum 100 iterations
  
  - [x] 2.4 Write property test for profile completeness boolean consistency
    - **Property 3: Profile Completeness Boolean Consistency**
    - **Validates: Requirements 6.4**
    - Generate random user objects with various completion states
    - Verify isProfileComplete() returns true iff percentage equals 100
    - Use minimum 100 iterations
  
  - [x] 2.5 Write unit tests for ProfileService
    - Test getRequiredFields() returns correct field list
    - Test service can be instantiated and injected
    - Test edge cases: empty strings vs null values

- [x] 3. Checkpoint - Verify ProfileService functionality
  - Ensure all ProfileService tests pass, ask the user if questions arise.

- [x] 4. Implement UpdateProfileRequest with validation rules
  - [x] 4.1 Create or extend UpdateProfileRequest in `app/Http/Requests/Api/V1/UpdateProfileRequest.php`
    - Add validation rules for `phone`: regex pattern for digits/spaces/hyphens/plus, min 8, max 20
    - Add validation rules for `country`: required string, max 100
    - Add validation rules for `city`: required string, max 100
    - Add validation rules for `highest_qualification`: enum validation with predefined values
    - Add validation rules for `linkedin_profile`: URL format, max 500
    - Add validation rules for `portfolio_website`: URL format, max 500
    - Add validation rules for optional fields: `bio`, `occupation`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [x] 4.2 Write property test for phone number validation
    - **Property 8: Phone Number Validation Rules**
    - **Validates: Requirements 8.1, 8.2**
    - Generate random phone strings with various characters
    - Verify rejection of invalid characters and lengths outside 8-20 range
    - Verify acceptance of valid phone formats
    - Use minimum 100 iterations
  
  - [x] 4.3 Write property test for text field non-empty validation
    - **Property 9: Text Field Non-Empty Validation**
    - **Validates: Requirements 8.3, 8.4**
    - Generate random strings including empty and whitespace-only
    - Verify rejection of empty/whitespace-only for Country and City
    - Verify acceptance of strings with non-whitespace content
    - Use minimum 100 iterations
  
  - [x] 4.4 Write property test for qualification enum validation
    - **Property 10: Qualification Enum Validation**
    - **Validates: Requirements 8.5**
    - Generate random qualification strings
    - Verify rejection of values not in predefined set
    - Verify acceptance of exact matches from enum
    - Use minimum 100 iterations
  
  - [x] 4.5 Write property test for URL format validation
    - **Property 11: URL Format Validation**
    - **Validates: Requirements 8.6, 8.7**
    - Generate random URL strings with various formats
    - Verify rejection of malformed URLs
    - Verify acceptance of well-formed URLs with protocol, domain, path
    - Use minimum 100 iterations
  
  - [ ] 4.6 Write property test for validation error message specificity
    - **Property 12: Validation Error Message Specificity**
    - **Validates: Requirements 8.8, 4.6**
    - Generate random invalid profile data combinations
    - Verify error messages identify specific fields and rules
    - Ensure error messages are distinct and actionable
    - Use minimum 100 iterations

- [x] 5. Implement ProfileController with API endpoints
  - [x] 5.1 Create ProfileController in `app/Http/Controllers/Api/V1/ProfileController.php`
    - Inject ProfileService in constructor
    - Implement `status()` method for GET /api/v1/profile/status
    - Return JSON response with profile status from ProfileService
    - Implement `update()` method for PUT /api/v1/profile
    - Use UpdateProfileRequest for validation
    - Update user record with provided fields
    - Return UserResource after successful update
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 4.5_
  
  - [ ]* 5.2 Write integration tests for ProfileController
    - Test GET /profile/status returns correct structure
    - Test GET /profile/status requires authentication (401 when unauthenticated)
    - Test PUT /profile updates user record successfully
    - Test PUT /profile validation errors return 422
    - Test profile status updates after profile modification
    - _Requirements: 9.5, 9.6_
  
  - [ ]* 5.3 Write property test for form pre-population correctness
    - **Property 5: Profile Form Pre-population Correctness**
    - **Validates: Requirements 4.3**
    - Generate random user objects with various existing data
    - Verify form initialization populates all fields correctly
    - Verify null values are handled as empty form fields
    - Use minimum 100 iterations
  
  - [ ]* 5.4 Write property test for profile validation completeness
    - **Property 6: Profile Form Validation Completeness**
    - **Validates: Requirements 4.4, 4.6**
    - Generate random profile form submissions
    - Verify rejection when any required field is missing or invalid
    - Verify acceptance when all required fields are valid
    - Use minimum 100 iterations
  
  - [ ]* 5.5 Write property test for profile update persistence
    - **Property 7: Profile Update Persistence**
    - **Validates: Requirements 4.5**
    - Generate random valid profile data
    - Submit via PUT /profile endpoint
    - Query database and verify exact values were persisted
    - Use minimum 100 iterations
  
  - [ ]* 5.6 Write property test for authentication requirement enforcement
    - **Property 13: Authentication Requirement Enforcement**
    - **Validates: Requirements 9.5, 9.6**
    - Test requests with and without valid authentication tokens
    - Verify 401 response when token is missing or invalid
    - Verify successful processing when token is valid
    - Use minimum 100 iterations

- [x] 6. Checkpoint - Verify ProfileController and validation
  - Ensure all ProfileController tests pass, ask the user if questions arise.

- [x] 7. Implement EnsureProfileComplete middleware
  - [x] 7.1 Create middleware in `app/Http/Middleware/EnsureProfileComplete.php`
    - Inject ProfileService in constructor
    - Implement `handle()` method checking profile completeness
    - Return 403 with error JSON when profile incomplete
    - Include `missing_fields` array in error response
    - Allow request to proceed when profile complete
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_
  
  - [x] 7.2 Write unit tests for EnsureProfileComplete middleware
    - Test middleware class exists and implements correct interface
    - Test returns 403 with correct error structure for incomplete profile
    - Test passes request through for complete profile
    - Test error response includes missing_fields array
  
  - [x] 7.3 Write property test for application guard enforcement
    - **Property 4: Application Guard Enforcement**
    - **Validates: Requirements 5.1, 5.2, 5.6**
    - Generate random user objects with various completion percentages
    - Verify middleware blocks requests when percentage < 100 (403 response)
    - Verify middleware allows requests when percentage = 100
    - Use minimum 100 iterations

- [x] 8. Register routes and apply middleware
  - [ ] 8.1 Register ProfileController routes in `routes/api.php`
    - Add GET /api/v1/profile/status route (authenticated)
    - Add PUT /api/v1/profile route (authenticated)
    - Apply auth:sanctum middleware to profile routes
    - _Requirements: 9.4, 9.5_
  
  - [ ] 8.2 Apply EnsureProfileComplete middleware to application routes
    - Add middleware to POST /api/v1/courses/{course}/apply route
    - Verify middleware is registered in Kernel.php
    - Test middleware application via integration test
    - _Requirements: 12.5, 5.1_

- [x] 9. Implement avatar upload functionality
  - [x] 9.1 Extend AccountController or create avatar upload endpoint
    - Implement POST /api/v1/account/avatar endpoint
    - Validate file type: JPEG, PNG, GIF, WEBP
    - Validate file size: max 5MB
    - Upload to cloud storage (S3/equivalent)
    - Update users.avatar_url with storage URL
    - Return updated UserResource
    - _Requirements: 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 9.2 Write property test for file type validation
    - **Property 14: Profile Picture File Type Validation**
    - **Validates: Requirements 10.2, 10.3**
    - Generate random file uploads with various MIME types
    - Verify rejection of non-image types
    - Verify acceptance of valid image types under 5MB
    - Use minimum 100 iterations
  
  - [ ]* 9.3 Write property test for avatar URL persistence
    - **Property 15: Profile Picture URL Persistence**
    - **Validates: Requirements 10.5**
    - Generate random valid image uploads
    - Upload via endpoint
    - Query users.avatar_url and verify correct storage URL
    - Use minimum 100 iterations
  
  - [ ]* 9.4 Write property test for invalid upload error messaging
    - **Property 16: Invalid Upload Error Messaging**
    - **Validates: Requirements 10.6**
    - Generate random invalid uploads (wrong type, oversized)
    - Verify error messages identify file type vs size constraint failures
    - Use minimum 100 iterations
  
  - [ ]* 9.5 Write integration tests for avatar upload
    - Test successful upload flow with mocked storage
    - Test validation errors for invalid file types
    - Test validation errors for oversized files
    - Test avatar_url updated in database

- [x] 10. Checkpoint - Verify backend implementation
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 11. Implement frontend profile API client
  - [x] 11.1 Create profileApi client in `frontend/src/api/profileApi.ts`
    - Define ProfileStatus TypeScript interface
    - Implement `getStatus()` method calling GET /profile/status
    - Implement `updateProfile()` method calling PUT /profile
    - Implement `uploadAvatar()` method calling POST /account/avatar with FormData
    - Add proper error handling and type safety
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ]* 11.2 Write unit tests for profile API client
    - Test getStatus() calls correct endpoint
    - Test updateProfile() sends correct payload
    - Test uploadAvatar() sends FormData correctly
    - Test error handling for failed requests

- [x] 12. Implement ProfileCompletionCard component
  - [ ] 12.1 Create ProfileCompletionCard in `frontend/src/features/profile/ProfileCompletionCard.tsx`
    - Accept props: percentage, missingFields, completedFields
    - Conditionally render only when percentage < 100
    - Display progress bar showing percentage value
    - Display checklist with completed/missing field indicators
    - Implement "Complete Profile" button navigating to /profile/complete
    - Apply prominent visual styling
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_
  
  - [ ]* 12.2 Write unit tests for ProfileCompletionCard
    - Test renders when percentage < 100
    - Test does not render when percentage = 100
    - Test displays correct percentage value
    - Test shows checklist with correct completed/missing states
    - Test "Complete Profile" button navigates correctly

- [x] 13. Implement ProfileCompletionPage component
  - [x] 13.1 Create ProfileCompletionPage in `frontend/src/features/profile/ProfileCompletionPage.tsx`
    - Define ProfileFormState and ValidationErrors TypeScript interfaces
    - Render form with all required profile fields
    - Render form with all optional profile fields
    - Pre-populate form fields with existing user data
    - Implement progress bar showing completion percentage
    - Add visual distinction between required and optional fields
    - Implement file upload field for profile picture
    - Implement client-side validation on blur for required fields
    - Implement real-time URL format validation
    - Display inline error messages below invalid fields
    - Implement dynamic submit button state (disabled when invalid)
    - Handle form submission calling profileApi.updateProfile()
    - Handle avatar upload separately via profileApi.uploadAvatar()
    - Implement return-to-context redirect using sessionStorage
    - Display success message after profile update
    - _Requirements: 4.1, 4.2, 4.3, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 10.1, 10.7_
  
  - [ ]* 13.2 Write unit tests for ProfileCompletionPage
    - Test renders all required field inputs
    - Test renders all optional field inputs
    - Test displays progress bar with percentage
    - Test validates on blur for required fields
    - Test validates URLs in real-time
    - Test displays inline error messages
    - Test visual distinction between required/optional fields
    - Test file upload field renders correctly
    - Test displays current profile picture if exists
  
  - [ ]* 13.3 Write property test for submit button state determination
    - **Property 17: Submit Button State Determination**
    - **Validates: Requirements 14.4, 14.5**
    - Generate random form states with various field validity combinations
    - Verify button disabled iff at least one required field is missing or invalid
    - Verify button enabled when all required fields are valid
    - Verify optional field state does not affect button state
    - Use minimum 100 iterations

- [x] 14. Integrate profile status into Dashboard
  - [x] 14.1 Update Dashboard component to fetch profile status
    - Call profileApi.getStatus() on component mount
    - Store profile status in state
    - Conditionally render ProfileCompletionCard when percentage < 100
    - Position card prominently at top of dashboard
    - Handle API errors gracefully (hide card, log error)
    - _Requirements: 3.1, 3.5_
  
  - [ ]* 14.2 Write integration tests for Dashboard profile integration
    - Test profile status fetched on mount
    - Test ProfileCompletionCard displayed when incomplete
    - Test ProfileCompletionCard hidden when complete
    - Test error handling when status API fails

- [ ] 15. Implement application guard in course application flow
  - [ ] 15.1 Update course application logic to handle profile incomplete errors
    - Wrap course application API call in try-catch
    - Detect 403 error with `profile_incomplete` code
    - Store current URL in sessionStorage as `returnUrl`
    - Display modal or inline message with error details
    - Provide "Complete Profile" button navigating to /profile/complete
    - Implement return redirect logic in ProfileCompletionPage
    - Clear returnUrl from sessionStorage after successful redirect
    - _Requirements: 5.3, 5.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 15.2 Write integration tests for application guard flow
    - Test displays error modal when 403 profile_incomplete received
    - Test stores returnUrl in sessionStorage
    - Test navigates to profile completion on user action
    - Test redirects back to application page after profile completion
    - Test returnUrl cleared after use

- [x] 16. Implement frontend routing for profile pages
  - [x] 16.1 Add profile routes to React Router configuration
    - Add route /profile/complete rendering ProfileCompletionPage
    - Add route /profile/edit rendering ProfileCompletionPage (same component)
    - Ensure routes require authentication
    - _Requirements: 4.7_

- [x] 17. Write configuration-driven field management test
  - [x]* 17.1 Write property test for configuration-driven behavior
    - **Property 18: Configuration-Driven Field Management**
    - **Validates: Requirements 15.2, 15.3, 15.4**
    - Modify required fields configuration in ProfileService
    - Verify completion percentage calculation updates
    - Verify missing fields identification updates
    - Verify application guard enforcement updates
    - Verify form validation reflects new configuration
    - Test with various field configuration changes
    - Use minimum 100 iterations

- [x] 18. Final checkpoint and end-to-end testing
  - Ensure all unit and property tests pass
  - Run full test suite for backend and frontend
  - Verify migration can be run on fresh database
  - Verify migration is reversible (rollback works)
  - Verify existing users with null fields are handled gracefully
  - Ask the user if questions arise or if manual E2E testing is needed

- [ ] 19. Write E2E tests for complete profile completion flow
  - [x]* 19.1 Write Playwright E2E test for profile completion flow
    - Test new user sees profile completion card on dashboard
    - Test clicking "Complete Profile" navigates to form
    - Test form validation shows errors for invalid inputs
    - Test successful submission updates profile and redirects
    - Test completed profile hides dashboard card
    - Test application guard blocks incomplete profile
    - Test application guard allows complete profile
    - Test return-to-context flow: blocked application → complete profile → return to application

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and integration points
- The ProfileService provides single source of truth for required fields configuration
- Frontend and backend are implemented in parallel waves where possible
- All new database columns are nullable to support existing users
- The ProfileCompletionPage serves dual purpose: initial completion and later editing
- Return-to-context flow uses sessionStorage to preserve user workflow

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.1", "8.2"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.4", "9.5", "11.1"] },
    { "id": 9, "tasks": ["11.2", "12.1"] },
    { "id": 10, "tasks": ["12.2", "13.1"] },
    { "id": 11, "tasks": ["13.2", "13.3", "14.1"] },
    { "id": 12, "tasks": ["14.2", "15.1"] },
    { "id": 13, "tasks": ["15.2", "16.1"] },
    { "id": 14, "tasks": ["17.1"] },
    { "id": 15, "tasks": ["19.1"] }
  ]
}
```
