# Authentication Flows

<cite>
**Referenced Files in This Document**
- [routes/auth.php](file://routes/auth.php)
- [routes/web.php](file://routes/web.php)
- [routes/api.php](file://routes/api.php)
- [config/sanctum.php](file://config/sanctum.php)
- [config/session.php](file://config/session.php)
- [app/Http/Controllers/Auth/RegisteredUserController.php](file://app/Http/Controllers/Auth/RegisteredUserController.php)
- [app/Http/Controllers/Auth/AuthenticatedSessionController.php](file://app/Http/Controllers/Auth/AuthenticatedSessionController.php)
- [app/Http/Controllers/Auth/SocialAuthController.php](file://app/Http/Controllers/Auth/SocialAuthController.php)
- [app/Http/Controllers/Auth/VerifyEmailController.php](file://app/Http/Controllers/Auth/VerifyEmailController.php)
- [app/Http/Controllers/Auth/EmailVerificationNotificationController.php](file://app/Http/Controllers/Auth/EmailVerificationNotificationController.php)
- [app/Http/Controllers/Auth/PasswordResetLinkController.php](file://app/Http/Controllers/Auth/PasswordResetLinkController.php)
- [app/Http/Controllers/Auth/NewPasswordController.php](file://app/Http/Controllers/Auth/NewPasswordController.php)
- [app/Http/Middleware/EnsureEmailIsVerified.php](file://app/Http/Middleware/EnsureEmailIsVerified.php)
- [app/Http/Requests/Auth/LoginRequest.php](file://app/Http/Requests/Auth/LoginRequest.php)
- [app/Models/User.php](file://app/Models/User.php)
- [database/migrations/0001_01_01_000000_create_users_table.php](file://database/migrations/0001_01_01_000000_create_users_table.php)
- [database/migrations/2024_01_01_000010_create_oauth_accounts_table.php](file://database/migrations/2024_01_01_000010_create_oauth_accounts_table.php)
</cite>

## Table of Contents
1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion

## Introduction
This document explains the authentication flows for ResNet Academy, covering user registration, login/logout, email verification, password reset, and social authentication with Google via Laravel Socialite. It also details how web session-based authentication and API token-based authentication (Laravel Sanctum) coexist, including CSRF protection, middleware, and security considerations.

## Project Structure
Authentication endpoints are split between:
- Web routes under a shared prefix to support session-based SPA auth with CSRF
- API routes protected by Sanctum for stateless token access

```mermaid
graph TB
subgraph "Web Routes"
A["POST /api/v1/register"]
B["POST /api/v1/login"]
C["POST /api/v1/logout"]
D["GET /api/v1/verify-email/{id}/{hash}"]
E["POST /api/v1/email/verification-notification"]
F["GET /api/v1/auth/google/redirect"]
G["GET /api/v1/auth/google/callback"]
end
subgraph "API Routes"
H["GET /v1/user (Sanctum)"]
I["Other v1/* endpoints (Sanctum)"]
end
A --> |"web + guest"| B
B --> |"session"| C
D --> |"auth + signed"| E
F --> |"guest"| G
H --> |"sanctum"| I
```

**Diagram sources**
- [routes/auth.php:11-37](file://routes/auth.php#L11-L37)
- [routes/web.php:23-46](file://routes/web.php#L23-L46)
- [routes/api.php:49-50](file://routes/api.php#L49-L50)

**Section sources**
- [routes/auth.php:11-37](file://routes/auth.php#L11-L37)
- [routes/web.php:23-46](file://routes/web.php#L23-L46)
- [routes/api.php:49-50](file://routes/api.php#L49-L50)

## Core Components
- Registration: Creates a student account, emits a registered event, logs the user in via session.
- Login: Validates credentials with rate limiting, regenerates session, updates last login timestamp.
- Logout: Logs out the web guard, invalidates session, regenerates CSRF token.
- Email Verification: Verifies email via signed link; re-sends verification notification when requested.
- Password Reset: Sends reset link; resets password and auto-verifies email if needed.
- Social Auth (Google): Redirects to provider, resolves or creates user on callback, logs in via session.
- Middleware: Ensures email is verified for protected features; Sanctum handles API token auth.
- Session & CSRF: Database-backed sessions with secure cookie settings; CSRF enforced for stateful requests.
- API Tokens: Sanctum configured with web guard and stateful domains for SPA cookies.

**Section sources**
- [app/Http/Controllers/Auth/RegisteredUserController.php:26-46](file://app/Http/Controllers/Auth/RegisteredUserController.php#L26-L46)
- [app/Http/Controllers/Auth/AuthenticatedSessionController.php:18-40](file://app/Http/Controllers/Auth/AuthenticatedSessionController.php#L18-L40)
- [app/Http/Controllers/Auth/VerifyEmailController.php:18-33](file://app/Http/Controllers/Auth/VerifyEmailController.php#L18-L33)
- [app/Http/Controllers/Auth/EmailVerificationNotificationController.php:13-22](file://app/Http/Controllers/Auth/EmailVerificationNotificationController.php#L13-L22)
- [app/Http/Controllers/Auth/PasswordResetLinkController.php:20-40](file://app/Http/Controllers/Auth/PasswordResetLinkController.php#L20-L40)
- [app/Http/Controllers/Auth/NewPasswordController.php:21-54](file://app/Http/Controllers/Auth/NewPasswordController.php#L21-L54)
- [app/Http/Controllers/Auth/SocialAuthController.php:27-74](file://app/Http/Controllers/Auth/SocialAuthController.php#L27-L74)
- [app/Http/Middleware/EnsureEmailIsVerified.php:17-26](file://app/Http/Middleware/EnsureEmailIsVerified.php#L17-L26)
- [config/sanctum.php:21-40](file://config/sanctum.php#L21-L40)
- [config/session.php:21-202](file://config/session.php#L21-L202)

## Architecture Overview
The application supports two authentication modes:
- Web (session-based) for SPA pages that need CSRF protection and server-rendered redirects
- API (token-based) for stateless client calls using Sanctum

```mermaid
sequenceDiagram
participant Client as "Frontend"
participant Web as "Web Routes"
participant AuthC as "Auth Controllers"
participant DB as "Database"
participant Mail as "Mail Queue"
participant Sanctum as "Sanctum"
Client->>Web : POST /api/v1/register
Web->>AuthC : RegisteredUserController@store
AuthC->>DB : Create User
AuthC-->>Client : 204 No Content
Client->>Web : POST /api/v1/login
Web->>AuthC : AuthenticatedSessionController@store
AuthC->>DB : Validate credentials
AuthC-->>Client : 204 No Content (session set)
Client->>Web : GET /api/v1/verify-email/{id}/{hash}
Web->>AuthC : VerifyEmailController
AuthC->>DB : Mark email verified
AuthC-->>Client : Redirect to dashboard
Client->>Web : POST /api/v1/email/verification-notification
Web->>AuthC : EmailVerificationNotificationController@store
AuthC->>Mail : Send queued verification email
AuthC-->>Client : {status}
Client->>Sanctum : GET /v1/user (Bearer token)
Sanctum-->>Client : User resource (if valid)
```

**Diagram sources**
- [routes/auth.php:11-37](file://routes/auth.php#L11-L37)
- [routes/api.php:49-50](file://routes/api.php#L49-L50)
- [app/Http/Controllers/Auth/RegisteredUserController.php:26-46](file://app/Http/Controllers/Auth/RegisteredUserController.php#L26-L46)
- [app/Http/Controllers/Auth/AuthenticatedSessionController.php:18-40](file://app/Http/Controllers/Auth/AuthenticatedSessionController.php#L18-L40)
- [app/Http/Controllers/Auth/VerifyEmailController.php:18-33](file://app/Http/Controllers/Auth/VerifyEmailController.php#L18-L33)
- [app/Http/Controllers/Auth/EmailVerificationNotificationController.php:13-22](file://app/Http/Controllers/Auth/EmailVerificationNotificationController.php#L13-L22)

## Detailed Component Analysis

### Registration Flow
- Endpoint: POST /api/v1/register (guest-only)
- Validation: name, email (unique), password (confirmed, strength rules)
- Behavior: Creates user with student role, hashes password, fires Registered event, logs in via session
- Response: 204 No Content

```mermaid
flowchart TD
Start(["Register Request"]) --> Validate["Validate name, email, password"]
Validate --> Create["Create User<br/>Hash password"]
Create --> Event["Emit Registered event"]
Event --> Login["Log in via session"]
Login --> End(["204 No Content"])
```

**Diagram sources**
- [app/Http/Controllers/Auth/RegisteredUserController.php:26-46](file://app/Http/Controllers/Auth/RegisteredUserController.php#L26-L46)
- [database/migrations/0001_01_01_000000_create_users_table.php:14-27](file://database/migrations/0001_01_01_000000_create_users_table.php#L14-L27)

**Section sources**
- [routes/auth.php:11-13](file://routes/auth.php#L11-L13)
- [app/Http/Controllers/Auth/RegisteredUserController.php:26-46](file://app/Http/Controllers/Auth/RegisteredUserController.php#L26-L46)
- [database/migrations/0001_01_01_000000_create_users_table.php:14-27](file://database/migrations/0001_01_01_000000_create_users_table.php#L14-L27)

### Login Flow
- Endpoint: POST /api/v1/login (guest-only)
- Validation: email, password
- Security: Rate limiting per email+IP; lockout event on too many attempts
- Behavior: Authenticates via web guard, regenerates session, updates last_login_at
- Response: 204 No Content

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant R as "LoginRequest"
participant S as "AuthenticatedSessionController"
participant DB as "Database"
FE->>R : POST /api/v1/login {email,password}
R->>R : Check rate limit
R->>DB : Attempt auth
alt Success
R-->>S : authenticate()
S->>S : regenerate session
S->>DB : update last_login_at
S-->>FE : 204 No Content
else Failure
R-->>FE : 422 Validation error (auth.failed)
end
```

**Diagram sources**
- [app/Http/Requests/Auth/LoginRequest.php:30-87](file://app/Http/Requests/Auth/LoginRequest.php#L30-L87)
- [app/Http/Controllers/Auth/AuthenticatedSessionController.php:18-27](file://app/Http/Controllers/Auth/AuthenticatedSessionController.php#L18-L27)

**Section sources**
- [routes/auth.php:15-17](file://routes/auth.php#L15-L17)
- [app/Http/Requests/Auth/LoginRequest.php:30-87](file://app/Http/Requests/Auth/LoginRequest.php#L30-L87)
- [app/Http/Controllers/Auth/AuthenticatedSessionController.php:18-27](file://app/Http/Controllers/Auth/AuthenticatedSessionController.php#L18-L27)

### Logout Flow
- Endpoint: POST /api/v1/logout (auth required)
- Behavior: Logs out web guard, invalidates session, regenerates CSRF token
- Response: 204 No Content

```mermaid
flowchart TD
Req["Logout Request"] --> Guard{"Authenticated?"}
Guard -- No --> Deny["401 Unauthorized"]
Guard -- Yes --> DoLogout["Logout web guard"]
DoLogout --> Invalidate["Invalidate session"]
Invalidate --> RegToken["Regenerate CSRF token"]
RegToken --> Resp["204 No Content"]
```

**Diagram sources**
- [app/Http/Controllers/Auth/AuthenticatedSessionController.php:32-40](file://app/Http/Controllers/Auth/AuthenticatedSessionController.php#L32-L40)

**Section sources**
- [routes/auth.php:35-37](file://routes/auth.php#L35-L37)
- [app/Http/Controllers/Auth/AuthenticatedSessionController.php:32-40](file://app/Http/Controllers/Auth/AuthenticatedSessionController.php#L32-L40)

### Email Verification Workflow
- Verify endpoint: GET /api/v1/verify-email/{id}/{hash} (auth + signed + throttle)
- Re-send notification: POST /api/v1/email/verification-notification (auth + throttle)
- Behavior: Marks email verified and fires Verified event; sends queued verification email on request
- Response: Redirect to dashboard with verified flag; JSON status for re-send

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant V as "VerifyEmailController"
participant N as "EmailVerificationNotificationController"
participant M as "Mail Queue"
FE->>V : GET /api/v1/verify-email/{id}/{hash}
V->>V : Mark email verified (if not already)
V-->>FE : Redirect to dashboard?verified=1
FE->>N : POST /api/v1/email/verification-notification
alt Already verified
N-->>FE : {status : "already-verified"}
else Not verified
N->>M : Send queued verification email
N-->>FE : {status : "verification-link-sent"}
end
```

**Diagram sources**
- [app/Http/Controllers/Auth/VerifyEmailController.php:18-33](file://app/Http/Controllers/Auth/VerifyEmailController.php#L18-L33)
- [app/Http/Controllers/Auth/EmailVerificationNotificationController.php:13-22](file://app/Http/Controllers/Auth/EmailVerificationNotificationController.php#L13-L22)

**Section sources**
- [routes/auth.php:27-33](file://routes/auth.php#L27-L33)
- [app/Http/Controllers/Auth/VerifyEmailController.php:18-33](file://app/Http/Controllers/Auth/VerifyEmailController.php#L18-L33)
- [app/Http/Controllers/Auth/EmailVerificationNotificationController.php:13-22](file://app/Http/Controllers/Auth/EmailVerificationNotificationController.php#L13-L22)

### Password Reset Flow
- Send link: POST /api/v1/forgot-password (guest)
- Reset password: POST /api/v1/reset-password (guest)
- Behavior: Sends reset link; resets password and verifies email if needed; returns status messages

```mermaid
flowchart TD
Start(["Reset Request"]) --> Send["Send reset link"]
Send --> Status{"Status OK?"}
Status -- No --> Err["Validation error with message"]
Status -- Yes --> Wait["User clicks link"]
Wait --> Reset["Reset password + verify email if needed"]
Reset --> Done(["Return status"])
```

**Diagram sources**
- [app/Http/Controllers/Auth/PasswordResetLinkController.php:20-40](file://app/Http/Controllers/Auth/PasswordResetLinkController.php#L20-L40)
- [app/Http/Controllers/Auth/NewPasswordController.php:21-54](file://app/Http/Controllers/Auth/NewPasswordController.php#L21-L54)

**Section sources**
- [routes/auth.php:19-25](file://routes/auth.php#L19-L25)
- [app/Http/Controllers/Auth/PasswordResetLinkController.php:20-40](file://app/Http/Controllers/Auth/PasswordResetLinkController.php#L20-L40)
- [app/Http/Controllers/Auth/NewPasswordController.php:21-54](file://app/Http/Controllers/Auth/NewPasswordController.php#L21-L54)

### Social Authentication (Google)
- Redirect: GET /api/v1/auth/google/redirect (guest)
- Callback: GET /api/v1/auth/google/callback (guest)
- Behavior: Redirects to Google; on callback, matches existing user by provider or email; creates new user if needed; logs in via session

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant SA as "SocialAuthController"
participant G as "Google"
participant DB as "Database"
FE->>SA : GET /api/v1/auth/google/redirect
SA->>G : Redirect to OAuth consent
G-->>SA : Callback with user info
SA->>DB : Find by provider or email
alt Existing user
SA->>SA : Log in via session
else New user
SA->>DB : Create user + link provider
SA->>SA : Log in via session
end
SA-->>FE : Redirect to frontend dashboard
```

**Diagram sources**
- [app/Http/Controllers/Auth/SocialAuthController.php:27-74](file://app/Http/Controllers/Auth/SocialAuthController.php#L27-L74)
- [database/migrations/2024_01_01_000010_create_oauth_accounts_table.php:13-21](file://database/migrations/2024_01_01_000010_create_oauth_accounts_table.php#L13-L21)

**Section sources**
- [routes/web.php:26-32](file://routes/web.php#L26-L32)
- [app/Http/Controllers/Auth/SocialAuthController.php:27-74](file://app/Http/Controllers/Auth/SocialAuthController.php#L27-L74)
- [database/migrations/2024_01_01_000010_create_oauth_accounts_table.php:13-21](file://database/migrations/2024_01_01_000010_create_oauth_accounts_table.php#L13-L21)

### Middleware and Protection
- EnsureEmailIsVerified: Returns 409 JSON if user is unverified
- Sanctum: Protects API routes with bearer tokens; stateful domains enable SPA cookies
- Session: Database driver, configurable lifetime, secure cookies, SameSite lax

```mermaid
classDiagram
class EnsureEmailIsVerified {
+handle(request, next) Response
}
class SanctumConfig {
+stateful : array
+guard : array
+expiration : int|null
}
class SessionConfig {
+driver : string
+lifetime : int
+secure : bool
+same_site : string
}
EnsureEmailIsVerified <.. SanctumConfig : "complements"
EnsureEmailIsVerified <.. SessionConfig : "uses"
```

**Diagram sources**
- [app/Http/Middleware/EnsureEmailIsVerified.php:17-26](file://app/Http/Middleware/EnsureEmailIsVerified.php#L17-L26)
- [config/sanctum.php:21-40](file://config/sanctum.php#L21-L40)
- [config/session.php:21-202](file://config/session.php#L21-L202)

**Section sources**
- [app/Http/Middleware/EnsureEmailIsVerified.php:17-26](file://app/Http/Middleware/EnsureEmailIsVerified.php#L17-L26)
- [config/sanctum.php:21-40](file://config/sanctum.php#L21-L40)
- [config/session.php:21-202](file://config/session.php#L21-L202)

### Data Model Relationships
- Users store role, email, password_hash, timestamps, and optional profile fields
- OauthAccounts link users to external providers
- Sessions table persists web sessions

```mermaid
erDiagram
USERS {
bigint id PK
enum role
string name
string email UK
string password_hash
timestamp email_verified_at
timestamp last_login_at
timestamp created_at
timestamp updated_at
}
OAUTH_ACCOUNTS {
bigint id PK
bigint user_id FK
enum provider
string provider_user_id
timestamp created_at
}
SESSIONS {
string id PK
bigint user_id FK
string ip_address
text user_agent
longtext payload
int last_activity
}
USERS ||--o{ OAUTH_ACCOUNTS : "has many"
USERS ||--o{ SESSIONS : "owns"
```

**Diagram sources**
- [database/migrations/0001_01_01_000000_create_users_table.php:14-42](file://database/migrations/0001_01_01_000000_create_users_table.php#L14-L42)
- [database/migrations/2024_01_01_000010_create_oauth_accounts_table.php:13-21](file://database/migrations/2024_01_01_000010_create_oauth_accounts_table.php#L13-L21)

**Section sources**
- [app/Models/User.php:24-55](file://app/Models/User.php#L24-L55)
- [database/migrations/0001_01_01_000000_create_users_table.php:14-42](file://database/migrations/0001_01_01_000000_create_users_table.php#L14-L42)
- [database/migrations/2024_01_01_000010_create_oauth_accounts_table.php:13-21](file://database/migrations/2024_01_01_000010_create_oauth_accounts_table.php#L13-L21)

## Dependency Analysis
- Controllers depend on models and framework services (Auth, Password, Socialite)
- Requests encapsulate validation and rate limiting logic
- Middleware enforces policy checks (email verification)
- Sanctum config ties into web guard and stateful domains
- Routes wire controllers to HTTP verbs and middleware groups

```mermaid
graph LR
R["routes/auth.php"] --> RC["RegisteredUserController"]
R --> ASC["AuthenticatedSessionController"]
R --> SEC["SocialAuthController"]
R --> VEC["VerifyEmailController"]
R --> EVNC["EmailVerificationNotificationController"]
R --> PRLC["PasswordResetLinkController"]
R --> NPC["NewPasswordController"]
RC --> U["User model"]
ASC --> LR["LoginRequest"]
SEC --> OA["OauthAccount model"]
VEC --> U
EVNC --> U
PRLC --> U
NPC --> U
API["routes/api.php"] --> SAN["Sanctum middleware"]
CFG["config/sanctum.php"] --> SAN
CFG2["config/session.php"] --> WEB["Web session flow"]
```

**Diagram sources**
- [routes/auth.php:11-37](file://routes/auth.php#L11-L37)
- [routes/api.php:49-50](file://routes/api.php#L49-L50)
- [config/sanctum.php:21-40](file://config/sanctum.php#L21-L40)
- [config/session.php:21-202](file://config/session.php#L21-L202)

**Section sources**
- [routes/auth.php:11-37](file://routes/auth.php#L11-L37)
- [routes/api.php:49-50](file://routes/api.php#L49-L50)
- [config/sanctum.php:21-40](file://config/sanctum.php#L21-L40)
- [config/session.php:21-202](file://config/session.php#L21-L202)

## Performance Considerations
- Use database-backed sessions for scalability; ensure proper indexing on sessions.user_id and last_activity
- Keep session lifetime reasonable; consider expire_on_close for sensitive environments
- Rate limiting on login prevents brute-force attacks; tune thresholds based on traffic
- Queued email notifications avoid blocking registration/login flows
- Sanctum token expiration can be configured if needed; otherwise rely on session-based SPA auth

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Unverified email access: EnsureEmailIsVerified returns 409 with a message indicating email is not verified
- Login failures: LoginRequest throws validation errors with localized messages; check rate limiter throttling
- Password reset issues: PasswordResetLinkController and NewPasswordController return validation exceptions with status messages
- Social auth mismatches: SocialAuthController resolves users by provider or email; ensure unique constraints on oauth_accounts

**Section sources**
- [app/Http/Middleware/EnsureEmailIsVerified.php:17-26](file://app/Http/Middleware/EnsureEmailIsVerified.php#L17-L26)
- [app/Http/Requests/Auth/LoginRequest.php:43-87](file://app/Http/Requests/Auth/LoginRequest.php#L43-L87)
- [app/Http/Controllers/Auth/PasswordResetLinkController.php:20-40](file://app/Http/Controllers/Auth/PasswordResetLinkController.php#L20-L40)
- [app/Http/Controllers/Auth/NewPasswordController.php:21-54](file://app/Http/Controllers/Auth/NewPasswordController.php#L21-L54)
- [app/Http/Controllers/Auth/SocialAuthController.php:32-74](file://app/Http/Controllers/Auth/SocialAuthController.php#L32-L74)

## Conclusion
ResNet Academy implements a robust, layered authentication system combining session-based web flows with Sanctum’s token-based API access. Registration, login, logout, email verification, password reset, and social authentication are clearly separated into dedicated controllers and routes, with strong validation, rate limiting, and CSRF protections. The design ensures secure, scalable interactions for both SPA clients and API consumers while maintaining clear separation of concerns and predictable error handling.