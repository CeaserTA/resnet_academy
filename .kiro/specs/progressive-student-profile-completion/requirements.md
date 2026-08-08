# Requirements Document

## Introduction

The Progressive Student Profile Completion system enhances the existing ResNet Academy registration workflow by introducing a non-intrusive profile completion mechanism. Students can register with minimal information (Name, Email, Password) and access the platform immediately, but are prompted to complete their profile when applying for courses. The system tracks profile completeness, displays completion progress on the dashboard, and enforces required profile fields before course applications.

## Glossary

- **Student**: A registered user with the role 'student' who can browse courses and apply for enrolment
- **Profile**: The collection of user information stored in the users table, including both required and optional fields
- **Required_Profile_Field**: A field that must be completed before a student can apply for any course (Phone Number, Country, City, Highest Qualification)
- **Optional_Profile_Field**: A field that enhances the profile but is not required for course applications (Profile Picture, Bio, Occupation, LinkedIn Profile, Portfolio Website)
- **Profile_Completion_Percentage**: A dynamically calculated metric representing the ratio of completed required fields to total required fields
- **Dashboard**: The main landing page students see after logging in
- **Profile_Completion_Card**: A UI component displayed on the dashboard when the profile is incomplete
- **Application_Guard**: A validation mechanism that prevents course applications when required profile fields are incomplete
- **Profile_Service**: A centralized service class that manages profile completeness logic and validation

## Requirements

### Requirement 1: Student Registration Flow

**User Story:** As a new student, I want to register with only basic information (Name, Email, Password), so that I can quickly access the platform and explore courses.

#### Acceptance Criteria

1. THE Registration_System SHALL accept Name, Email, and Password as the only required fields during registration
2. WHEN a student successfully registers, THE Registration_System SHALL create a user account with status 'active'
3. WHEN a student successfully registers, THE Registration_System SHALL redirect the student to the dashboard
4. THE Registration_System SHALL NOT prompt for additional profile fields during the registration process

### Requirement 2: Profile Completion Percentage Calculation

**User Story:** As a student, I want to see how complete my profile is, so that I understand what information is still needed.

#### Acceptance Criteria

1. THE Profile_Service SHALL calculate Profile_Completion_Percentage as (number of completed Required_Profile_Fields / total number of Required_Profile_Fields) × 100
2. THE Profile_Service SHALL identify the following fields as Required_Profile_Fields: Name, Email, Phone Number, Country, City, Highest Qualification
3. THE Profile_Service SHALL consider a Required_Profile_Field completed when it contains a non-null, non-empty value
4. THE Profile_Service SHALL recalculate Profile_Completion_Percentage whenever any profile field is updated
5. THE Profile_Service SHALL identify the following fields as Optional_Profile_Fields: Profile Picture, Bio, Occupation, LinkedIn Profile, Portfolio Website
6. THE Profile_Service SHALL NOT include Optional_Profile_Fields in the Profile_Completion_Percentage calculation

### Requirement 3: Dashboard Profile Completion Card Display

**User Story:** As a student with an incomplete profile, I want to see a prominent card on my dashboard showing my completion status, so that I am aware of what needs to be completed.

#### Acceptance Criteria

1. WHEN Profile_Completion_Percentage is less than 100, THE Dashboard SHALL display the Profile_Completion_Card at the top of the page
2. THE Profile_Completion_Card SHALL display the Profile_Completion_Percentage as a numeric value
3. THE Profile_Completion_Card SHALL display a checklist showing which Required_Profile_Fields are completed and which are missing
4. THE Profile_Completion_Card SHALL provide a "Complete Profile" button that navigates to the Profile_Completion_Page
5. WHEN Profile_Completion_Percentage equals 100, THE Dashboard SHALL NOT display the Profile_Completion_Card
6. THE Profile_Completion_Card SHALL be visually prominent to draw student attention

### Requirement 4: Profile Completion Page

**User Story:** As a student, I want a dedicated page where I can edit all my profile information, so that I can complete my profile efficiently.

#### Acceptance Criteria

1. THE Profile_Completion_Page SHALL display form fields for all Required_Profile_Fields
2. THE Profile_Completion_Page SHALL display form fields for all Optional_Profile_Fields
3. THE Profile_Completion_Page SHALL pre-populate all form fields with existing profile data
4. WHEN a student submits the profile form, THE Profile_Completion_Page SHALL validate that all Required_Profile_Fields contain valid values
5. WHEN a student submits the profile form with valid data, THE Profile_Completion_Page SHALL update the user record in the users table
6. WHEN a student submits the profile form with invalid or missing required data, THE Profile_Completion_Page SHALL display field-level validation error messages
7. THE Profile_Completion_Page SHALL be reusable as the "Edit Profile" page for students who want to update their information later

### Requirement 5: Course Application Guard

**User Story:** As a student attempting to apply for a course, I want to be informed if my profile is incomplete, so that I can complete it before applying.

#### Acceptance Criteria

1. WHEN a student attempts to apply for a course, THE Application_Guard SHALL check if Profile_Completion_Percentage equals 100
2. IF Profile_Completion_Percentage is less than 100, THEN THE Application_Guard SHALL prevent the application submission
3. IF Profile_Completion_Percentage is less than 100, THEN THE Application_Guard SHALL display the message "Please complete your profile before applying for this course"
4. IF Profile_Completion_Percentage is less than 100, THEN THE Application_Guard SHALL provide a "Complete Profile" button that navigates to the Profile_Completion_Page
5. WHEN a student completes their profile from the Application_Guard prompt, THE System SHALL redirect the student back to the course application page
6. WHEN Profile_Completion_Percentage equals 100, THE Application_Guard SHALL allow the course application to proceed

### Requirement 6: Profile Completeness Service

**User Story:** As a developer, I want a centralized service that manages profile completeness logic, so that the system is maintainable and consistent.

#### Acceptance Criteria

1. THE Profile_Service SHALL provide a method that returns the list of Required_Profile_Fields
2. THE Profile_Service SHALL provide a method that accepts a user object and returns the Profile_Completion_Percentage
3. THE Profile_Service SHALL provide a method that accepts a user object and returns a list of missing Required_Profile_Fields
4. THE Profile_Service SHALL provide a method that accepts a user object and returns a boolean indicating whether the profile is complete
5. THE Profile_Service SHALL be reusable across controllers, middleware, and frontend API endpoints
6. THE Profile_Service SHALL allow easy modification of Required_Profile_Fields without requiring changes to multiple files

### Requirement 7: Return-to-Context After Profile Completion

**User Story:** As a student who was interrupted to complete my profile, I want to resume exactly where I left off, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN a student is redirected to the Profile_Completion_Page from the Application_Guard, THE System SHALL store the course application URL
2. WHEN a student successfully completes their profile, THE System SHALL check if a stored return URL exists
3. IF a stored return URL exists, THEN THE System SHALL redirect the student to that URL
4. IF no stored return URL exists, THEN THE System SHALL redirect the student to the dashboard
5. THE System SHALL clear the stored return URL after using it to prevent unintended redirects

### Requirement 8: Profile Field Validation

**User Story:** As a student, I want clear feedback when I enter invalid profile information, so that I can correct it and complete my profile.

#### Acceptance Criteria

1. WHEN a student enters a phone number, THE Profile_Completion_Page SHALL validate that it contains only digits, spaces, hyphens, and plus signs
2. WHEN a student enters a phone number, THE Profile_Completion_Page SHALL validate that it is between 8 and 20 characters
3. WHEN a student enters a Country, THE Profile_Completion_Page SHALL accept any non-empty text value
4. WHEN a student enters a City, THE Profile_Completion_Page SHALL accept any non-empty text value
5. WHEN a student enters a Highest Qualification, THE Profile_Completion_Page SHALL validate that it is one of the predefined values: High School, Diploma, Bachelor's Degree, Master's Degree, Doctorate, Other
6. WHEN a student enters a LinkedIn Profile URL, THE Profile_Completion_Page SHALL validate that it is a valid URL format
7. WHEN a student enters a Portfolio Website URL, THE Profile_Completion_Page SHALL validate that it is a valid URL format
8. WHEN validation fails, THE Profile_Completion_Page SHALL display specific error messages for each invalid field

### Requirement 9: API Endpoint for Profile Completeness Status

**User Story:** As a frontend developer, I want an API endpoint that returns profile completeness status, so that the React dashboard can display accurate information.

#### Acceptance Criteria

1. THE API SHALL provide an endpoint that returns the authenticated user's Profile_Completion_Percentage
2. THE API SHALL provide an endpoint that returns the list of missing Required_Profile_Fields for the authenticated user
3. THE API SHALL provide an endpoint that returns the list of all Required_Profile_Fields with their completion status
4. THE API SHALL return profile completeness data in JSON format
5. THE API SHALL require authentication to access profile completeness endpoints
6. THE API SHALL return HTTP 401 when an unauthenticated user attempts to access profile completeness endpoints

### Requirement 10: Profile Picture Upload

**User Story:** As a student, I want to upload a profile picture, so that my profile is personalized.

#### Acceptance Criteria

1. THE Profile_Completion_Page SHALL provide a file upload field for profile pictures
2. WHEN a student uploads a profile picture, THE System SHALL validate that the file is an image type (JPEG, PNG, GIF, WEBP)
3. WHEN a student uploads a profile picture, THE System SHALL validate that the file size is less than 5 MB
4. WHEN a student uploads a valid profile picture, THE System SHALL store the image in cloud object storage
5. WHEN a student uploads a valid profile picture, THE System SHALL store the image URL in the users table avatar_url field
6. IF a student uploads an invalid file, THEN THE Profile_Completion_Page SHALL display an error message specifying the validation failure
7. THE Profile_Completion_Page SHALL display the current profile picture if one exists

### Requirement 11: Database Schema Minimal Changes

**User Story:** As a developer, I want to reuse the existing users table for profile data, so that database changes are minimized.

#### Acceptance Criteria

1. THE System SHALL store Phone Number, Country, City, and Highest Qualification in new columns added to the existing users table
2. THE System SHALL reuse the existing users.avatar_url column for profile pictures
3. THE System SHALL add the following columns to the users table: phone (VARCHAR 30), country (VARCHAR 100), city (VARCHAR 100), highest_qualification (VARCHAR 100)
4. THE System SHALL allow these new columns to be nullable to support existing users who registered before this feature was implemented
5. THE System SHALL NOT create a separate profiles table

### Requirement 12: Middleware for Application Guard

**User Story:** As a developer, I want reusable middleware that enforces profile completion, so that the guard can be applied consistently across application endpoints.

#### Acceptance Criteria

1. THE System SHALL provide a middleware class named EnsureProfileComplete
2. THE EnsureProfileComplete middleware SHALL check if the authenticated user's Profile_Completion_Percentage equals 100
3. IF Profile_Completion_Percentage is less than 100, THEN THE EnsureProfileComplete middleware SHALL return HTTP 403 with a JSON error message
4. IF Profile_Completion_Percentage equals 100, THEN THE EnsureProfileComplete middleware SHALL allow the request to proceed
5. THE EnsureProfileComplete middleware SHALL be applicable to any route that requires a complete profile
6. THE EnsureProfileComplete middleware SHALL provide a clear error response that the frontend can interpret to display the appropriate UI

### Requirement 13: Profile Completion Progress Indicator

**User Story:** As a student viewing the Profile_Completion_Page, I want to see a visual progress indicator, so that I understand how close I am to completing my profile.

#### Acceptance Criteria

1. THE Profile_Completion_Page SHALL display a progress bar showing Profile_Completion_Percentage
2. THE Profile_Completion_Page SHALL update the progress bar dynamically as fields are completed
3. THE Profile_Completion_Page SHALL display the Profile_Completion_Percentage as a numeric value alongside the progress bar
4. THE Profile_Completion_Page SHALL visually indicate which Required_Profile_Fields are completed and which remain
5. THE Profile_Completion_Page SHALL distinguish between Required_Profile_Fields and Optional_Profile_Fields visually

### Requirement 14: Frontend Validation Before Submission

**User Story:** As a student, I want immediate feedback on form validation errors, so that I can correct them before submitting.

#### Acceptance Criteria

1. THE Profile_Completion_Page SHALL validate required fields on blur (when the user leaves the field)
2. THE Profile_Completion_Page SHALL validate URL formats for LinkedIn Profile and Portfolio Website in real-time
3. THE Profile_Completion_Page SHALL display inline error messages below invalid fields
4. THE Profile_Completion_Page SHALL disable the submit button when required fields are missing or invalid
5. THE Profile_Completion_Page SHALL enable the submit button only when all Required_Profile_Fields contain valid values
6. THE Profile_Completion_Page SHALL provide visual cues (red borders, error icons) for fields with validation errors

### Requirement 15: Extensibility for Future Required Fields

**User Story:** As a developer, I want the ability to easily add new required profile fields in the future, so that the system can adapt to changing business needs.

#### Acceptance Criteria

1. THE Profile_Service SHALL define Required_Profile_Fields in a single configuration location
2. WHEN a new field is added to the Required_Profile_Fields configuration, THE Profile_Service SHALL automatically include it in Profile_Completion_Percentage calculations
3. WHEN a new field is added to the Required_Profile_Fields configuration, THE Profile_Service SHALL automatically include it in the list of missing fields
4. WHEN a new field is added to the Required_Profile_Fields configuration, THE Application_Guard SHALL automatically enforce its completion
5. THE System SHALL NOT require changes to multiple controllers or middleware when adding new required fields
6. THE System documentation SHALL include clear instructions for adding new required profile fields
