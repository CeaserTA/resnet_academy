/**
 * Maps a course slug → local image path in /public/images/.
 * Used by both CoursePreviews (homepage) and CataloguePage.
 *
 * NOTE: Only use this for courses that don't have thumbnail_url in the database.
 * Database thumbnail_url takes priority — remove entries here once uploaded.
 */
export const courseImageMap: Record<string, string> = {
    'web-foundations': '/images/web_foundations.jpg',
    'dynamic-web': '/images/dynamic_web.jpg',
    'full-stack': '/images/full_stack.jpg',
    'progressive-web-app-development': '/images/PWA.jpg',
    'vuejs-and-laravel': '/images/VUE.JS_LARAVEL.jpg',
    'data-analytics-with-google-analytics': '/images/data-analytics.jpg',
    'wordpress-development': '/images/word-press.avif',
    'database-querying-schema-design': '/images/database-querrying.jpg',
    'search-engine-optimization': '/images/SEO.jpg',
};

export interface CourseMeta {
    duration: string;
    format: string;
    /** 'In-person' | 'Online' | 'Hybrid' */
    delivery: string;
    /** Short skill tags shown on the catalogue card */
    skills: string[];
    /** Display string for next available cohort, e.g. 'September 2026' */
    nextCohort: string;
    /** One-line outcome shown below description on catalogue card */
    outcome: string;
}

/**
 * Static metadata keyed by course slug.
 * Update as new courses are added until the backend exposes these fields.
 */
export const courseDurationMap: Record<string, CourseMeta> = {
    'web-foundations': {
        duration: '4 weeks',
        format: '4 hrs/week',
        delivery: 'Online',
        skills: ['HTML', 'CSS', 'Responsive Design'],
        nextCohort: 'September 2026',
        outcome: 'Build and publish a personal portfolio site.',
    },
    'search-engine-optimization': {
        duration: '5 weeks',
        format: '4 hrs/week',
        delivery: 'Online',
        skills: ['SEO', 'Google Search Console', 'Keyword Research'],
        nextCohort: 'October 2026',
        outcome: 'Run a full SEO audit and grow organic traffic.',
    },
    'progressive-web-app-development': {
        duration: '6 weeks',
        format: '6 hrs/week',
        delivery: 'Hybrid',
        skills: ['PWA', 'Service Workers', 'Offline Mode'],
        nextCohort: 'November 2026',
        outcome: 'Convert a web app to a fully compliant PWA.',
    },
    'vuejs-and-laravel': {
        duration: '10 weeks',
        format: '8 hrs/week',
        delivery: 'Hybrid',
        skills: ['Vue 3', 'Laravel', 'REST APIs'],
        nextCohort: 'September 2026',
        outcome: 'Deploy a full Vue + Laravel application to production.',
    },
    'full-stack': {
        duration: '8 weeks',
        format: '8 hrs/week',
        delivery: 'In-person',
        skills: ['Node.js', 'React', 'Databases'],
        nextCohort: 'September 2026',
        outcome: 'Ship a full-stack app with frontend, backend, and database.',
    },
    'dynamic-web': {
        duration: '6 weeks',
        format: '6 hrs/week',
        delivery: 'In-person',
        skills: ['JavaScript', 'DOM', 'APIs'],
        nextCohort: 'September 2026',
        outcome: 'Build interactive UIs that fetch and display live data.',
    },
    'wordpress-development': {
        duration: '8 weeks',
        format: '8 hrs/week',
        delivery: 'Hybrid',
        skills: ['WordPress', 'PHP', 'WooCommerce'],
        nextCohort: 'September 2026',
        outcome: 'Launch complete business and e-commerce websites for clients.',
    },
    'database-querying-schema-design': {
        duration: '9 weeks',
        format: '8 hrs/week',
        delivery: 'Hybrid',
        skills: ['PHP', 'MySQL', 'APIs'],
        nextCohort: 'November 2026',
        outcome: 'Ship a secure, data-driven application with authentication.',
    },
    'data-analytics-with-google-analytics': {
        duration: '6 weeks',
        format: '5 hrs/week',
        delivery: 'Online',
        skills: ['GA4', 'Data Studio', 'Analytics'],
        nextCohort: 'October 2026',
        outcome: 'Build custom dashboards and drive decisions from real data.',
    },
};
