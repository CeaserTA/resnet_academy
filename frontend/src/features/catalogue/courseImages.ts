/**
 * Maps a course slug → local image path in /public/images/.
 * Used by both CoursePreviews (homepage) and CataloguePage.
 * 
 * NOTE: Only use this for courses that don't have thumbnail_url in the database.
 * Database thumbnail_url takes priority - remove entries here once uploaded.
 */
export const courseImageMap: Record<string, string> = {
    'web-foundations': '/images/web_foundations.jpg',
    'dynamic-web': '/images/dynamic_web.jpg',
    'full-stack': '/images/full_stack.jpg',
    // 'search-engine-optimization' removed - now uses uploaded thumbnail from database
    'progressive-web-app-development': '/images/PWA.jpg',
    'vuejs-and-laravel': '/images/VUE.JS_LARAVEL.jpg',
    'data-analytics-with-google-analytics': '/images/data-analytics.jpg',
    'wordpress-development': '/images/word-press.avif',
    'database-querying-schema-design': '/images/database-querrying.jpg',
};

/**
 * Static duration + format metadata keyed by course slug.
 * Update this map as new courses are added, until a duration field
 * is added to the courses DB schema.
 */
export const courseDurationMap: Record<string, { duration: string; format: string }> = {
    'web-foundations': { duration: '4 weeks', format: 'Part-time' },
    'search-engine-optimization': { duration: '5 weeks', format: 'Part-time' },
    'progressive-web-app-development': { duration: '6 weeks', format: 'Part-time' },
    'vuejs-and-laravel': { duration: '10 weeks', format: 'Full cohort' },
    'full-stack': { duration: '8 weeks', format: 'Full cohort' },
    'dynamic-web': { duration: '6 weeks', format: 'Part-time' },
};
