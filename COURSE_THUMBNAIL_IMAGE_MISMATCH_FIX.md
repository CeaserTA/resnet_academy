# Course Thumbnail Image Mismatch - Root Cause & Fix

## Problem

The "Search Engine Optimization" course showed **different thumbnail images** in different places:
- ✅ **Admin Dashboard**: Correct (new) image
- ❌ **Public Landing Page**: Stale (old) image  
- ❌ **Courses Catalogue Page**: Stale (old) image
- ✅ **Course Detail Page**: Correct (new) image (possibly)

## Root Cause

The codebase has a **static hardcoded image map** that takes **priority over** the database `thumbnail_url`:

### Code Flow

1. **Static Map** (`courseImages.ts`):
   ```typescript
   export const courseImageMap: Record<string, string> = {
       'search-engine-optimization': '/images/SEO.jpg',  // OLD hardcoded image
       // ... other courses
   };
   ```

2. **Catalogue Page** (`CataloguePage.tsx` line 47):
   ```typescript
   const image = courseImageMap[course.slug] ?? course.thumbnail_url ?? null;
   //            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^  <-- Static map has priority!
   ```

3. **Database Reality**:
   ```
   Course ID: 3
   Slug: search-engine-optimization  
   thumbnail_url: "courses/iOm6RQPtpCTM3wL71CfUogCakw70IE1VswMpdnum.png"  // NEW uploaded image
   ```

4. **Admin Dashboard** (`CourseListPage.tsx` line 36):
   ```typescript
   {course.thumbnail_url ? (
       <img src={course.thumbnail_url} ... />
   ```
   ✅ Directly reads database, no static map override

### Why the Mismatch?

1. Originally, all courses had hardcoded static images in `/public/images/`
2. Admin uploaded a new thumbnail for SEO course → stored in database as `thumbnail_url`
3. The static map entry was **never removed** after the upload
4. Catalogue pages use the static map with **higher priority** than database
5. Admin dashboard ignores static map and reads database directly

## Fix Applied

Removed the `'search-engine-optimization'` entry from both static maps:

### Files Modified

1. **`frontend/src/features/catalogue/courseImages.ts`**
   - Removed: `'search-engine-optimization': '/images/SEO.jpg'`
   - Added comment: "Database thumbnail_url takes priority - remove entries here once uploaded"

2. **`frontend/src/features/catalogue/CourseDetailPage.tsx`**
   - Removed: `'search-engine-optimization': '/images/SEO.jpg'` from local courseImageMap
   - Added comment about removing entries after database upload

## How to Prevent This in Future

### For Developers

**Rule**: When uploading a new course thumbnail via admin dashboard, **manually remove** the corresponding entry from `courseImages.ts`

**Better Solution** (recommended): Change the priority logic to prefer database over static map:

```typescript
// CURRENT (causes the bug):
const image = courseImageMap[course.slug] ?? course.thumbnail_url ?? null;

// BETTER (database takes priority):
const image = course.thumbnail_url ?? courseImageMap[course.slug] ?? null;
```

This way:
- New uploaded thumbnails automatically override static fallbacks
- No manual cleanup needed
- Static map truly acts as a **fallback** for courses without uploads

### Implementation Options

#### Option 1: Quick Fix (Current)
- Remove static map entries when thumbnails are uploaded
- Requires manual tracking

#### Option 2: Reverse Priority (Recommended)
Change the image resolution logic in:
- `CataloguePage.tsx` (2 locations: lines 47, 177)
- `CourseDetailPage.tsx` (line 148)

```diff
-const image = courseImageMap[course.slug] ?? course.thumbnail_url ?? null;
+const image = course.thumbnail_url ?? courseImageMap[course.slug] ?? null;
```

#### Option 3: Eliminate Static Map (Long-term)
- Upload thumbnails for all remaining courses
- Delete `courseImages.ts` entirely
- Remove all `courseImageMap` references
- Always use `course.thumbnail_url`

## Affected Components

### Using Static Map (can show stale images):
- `frontend/src/features/catalogue/CataloguePage.tsx` - Ongoing/Upcoming cohort cards
- `frontend/src/features/catalogue/CourseDetailPage.tsx` - Hero image
- `components/landing/CourseCarousel.tsx` (if it imports courseImageMap)

### NOT Using Static Map (always current):
- `frontend/src/features/admin/courses/CourseListPage.tsx` - Admin dashboard cards
- `frontend/src/features/admin/courses/CourseFormPage.tsx` - Thumbnail preview
- `frontend/src/features/enrolment/MyCoursesPage.tsx` - Student enrolled courses

## Verification

After the fix:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check landing page - SEO course should show new thumbnail
3. Check courses page - SEO course should show new thumbnail  
4. All should now match the admin dashboard image

## Database State

Current SEO course record:
```json
{
    "id": 3,
    "slug": "search-engine-optimization",
    "title": "Search Engine Optimization",
    "thumbnail_url": "courses/iOm6RQPtpCTM3wL71CfUogCakw70IE1VswMpdnum.png"
}
```

This is the **source of truth** - all components should now display this image.
