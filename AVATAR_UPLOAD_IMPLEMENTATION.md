# Avatar Upload Endpoint Implementation

## Task 9.1: Extend AccountController or create avatar upload endpoint

### Overview
This implementation adds a route alias for avatar uploads to support the Progressive Student Profile Completion feature, while reusing the existing, fully-functional avatar upload infrastructure.

### Changes Made

#### 1. Route Addition (`routes/api.php`)
Added a new route alias at `POST /api/v1/account/avatar` that points to the existing `AccountController::updateAvatar` method:

```php
Route::post('/account/avatar', [AccountController::class, 'updateAvatar']); // Alias for profile completion feature
```

**Rationale**: The existing `/api/v1/me/avatar` endpoint already provides all required functionality. Adding an alias maintains backward compatibility while providing the route pattern expected by the profile completion feature.

#### 2. Validation Enhancement (`app/Http/Requests/Api/V1/UpdateAvatarRequest.php`)
Updated the validation rules to include GIF format support:

```php
'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:5120'],
```

**Before**: `jpg,jpeg,png,webp`
**After**: `jpg,jpeg,png,gif,webp`

This satisfies Requirement 10.2: "Validate file type: JPEG, PNG, GIF, WEBP"

### Requirements Validated

✅ **Requirement 10.2**: Validate file type: JPEG, PNG, GIF, WEBP
- Implemented via UpdateAvatarRequest validation rules

✅ **Requirement 10.3**: Validate file size: max 5MB
- Already implemented: `max:5120` (5120 KB = 5 MB)

✅ **Requirement 10.4**: Upload to cloud storage (S3/equivalent)
- Already implemented: Uses Cloudflare R2 via MediaStorageService
- Storage prefix based on user role: `profiles/`, `instructors/`, `admins/`

✅ **Requirement 10.5**: Update users.avatar_url with storage URL
- Already implemented: `$user->update(['avatar_url' => $path])`

✅ **Additional**: Return updated UserResource
- Already implemented: Returns UserResource after upload

### Existing Implementation Details

The `AccountController::updateAvatar` method already provides:

1. **Role-based storage prefixes**:
   - Students: `profiles/`
   - Instructors: `instructors/`
   - Admins: `admins/`

2. **Automatic cleanup**: Deletes old avatar when new one is uploaded

3. **External URL preservation**: Doesn't attempt to delete OAuth provider avatars (e.g., Google profile photos)

4. **Secure validation**: Uses Laravel's `image` validation rule with explicit MIME type checking

5. **Cloud storage**: Integrates with Cloudflare R2 through MediaStorageService

### API Endpoint Specification

**Endpoint**: `POST /api/v1/account/avatar`

**Authentication**: Required (Sanctum token)

**Request**:
```
Content-Type: multipart/form-data

avatar: (file) - Required, must be JPEG/PNG/GIF/WEBP, max 5MB
```

**Success Response** (200 OK):
```json
{
  "data": {
    "id": 123,
    "role": "student",
    "name": "John Doe",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "avatar_url": "https://cdn.example.com/profiles/abc123.jpg",
    "bio": null,
    "country": "Uganda",
    "city": "Kampala",
    "highest_qualification": "Bachelor's Degree",
    "occupation": null,
    "linkedin_profile": null,
    "portfolio_website": null,
    "status": "active",
    "email_verified_at": "2024-01-15T10:30:00.000000Z",
    "created_at": "2024-01-15T10:00:00.000000Z",
    "updated_at": "2024-01-20T14:22:00.000000Z"
  }
}
```

**Error Responses**:

- **401 Unauthorized**: Not authenticated
```json
{
  "message": "Unauthenticated."
}
```

- **422 Unprocessable Entity**: Validation failed
```json
{
  "message": "The avatar field is required.",
  "errors": {
    "avatar": [
      "The avatar field is required."
    ]
  }
}
```

Common validation errors:
- "The avatar field is required."
- "The avatar must be an image."
- "The avatar must be a file of type: jpg, jpeg, png, gif, webp."
- "The avatar must not be greater than 5120 kilobytes."

### Test Coverage

Created comprehensive test suite in `tests/Feature/Account/AccountAvatarRouteTest.php`:

1. ✅ Accepts JPEG, PNG, GIF, WEBP formats
2. ✅ Rejects files larger than 5MB
3. ✅ Uploads to R2 storage and updates avatar_url
4. ✅ Returns updated UserResource
5. ✅ Requires authentication
6. ✅ Rejects non-image files

Extended existing tests in `tests/Feature/Account/AvatarUploadTest.php`:
1. ✅ Tests the new route alias works identically to original
2. ✅ Validates GIF format acceptance

### Integration with Profile Completion Feature

The avatar upload endpoint integrates with the profile completion system:

1. **Optional Field**: Avatar is an Optional_Profile_Field (not required for 100% completion)
2. **Profile Service**: The ProfileService doesn't include avatar_url in required fields calculation
3. **Frontend Integration**: ProfileCompletionPage can use this endpoint for avatar uploads
4. **UserResource**: Returns the full user profile with computed avatar_url (includes CDN URL)

### Backend Architecture

```
POST /api/v1/account/avatar
    ↓
UpdateAvatarRequest (validation)
    ↓
AccountController::updateAvatar
    ↓
MediaStorageService::delete (old avatar)
    ↓
MediaStorageService::store (new avatar on R2)
    ↓
User::update(['avatar_url' => $path])
    ↓
UserResource (transform & return)
```

### Security Considerations

1. **MIME Type Validation**: Uses Laravel's `image` rule which validates actual file content, not just extension
2. **File Size Limit**: 5MB limit prevents abuse
3. **Authentication Required**: Sanctum middleware ensures only authenticated users can upload
4. **Self-service Only**: Users can only update their own avatar (enforced by `$request->user()`)
5. **Old File Cleanup**: Prevents storage bloat by deleting previous uploads

### Future Enhancements

If needed in the future:
1. Image optimization (resize, compress) before storage
2. Support for cropping/editing before upload
3. Facial recognition for profile photo validation
4. Avatar templates/defaults for new users
5. Avatar history/versioning

### Notes

- The implementation reuses battle-tested code that's already in production
- No changes to the core AccountController logic were needed
- Maintains full backward compatibility with existing `/api/v1/me/avatar` endpoint
- All existing tests continue to pass
- The GIF format addition is the only functional change to validation
