/**
 * CourseDetailPage — display-only redesign with placeholder data.
 * TODO: Replace placeholder data with real API fetch via useCourse(courseId)
 *       once the backend merge is complete. The layout is final; only the
 *       data source and CTA click handlers need wiring up.
 */
import { Link } from 'react-router';
import { ArrowLeft, BookOpen, Clock, GraduationCap, SignalHigh, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/card';

// ─── Placeholder data (matches real API shape) ────────────────────────────────

const course = {
    id: 4,
    title: 'Dynamic Web',
    slug: 'dynamic-web',
    description:
        'JavaScript, DOM manipulation, modern tooling, and client-side app architecture to make interactive, performant UIs. Learn to build real apps from scratch — not just exercises.',
    level: 'intermediate' as const,
    thumbnail_url: '/images/dynamic_web.jpg',
    prerequisites_text: 'A basic understanding of HTML and CSS is recommended before starting this course.',
    price: '200000.00',
    currency: 'UGX',
    status: 'published' as const,
    category: { id: 1, name: 'Web Development', slug: 'web-development', parent_id: null, created_at: '' },
    instructors: [
        { id: 2, name: 'Ben K.', role: 'instructor' as const, email: 'ben@resnet.test', phone: null, avatar_url: null, status: 'active' as const, email_verified_at: null, last_login_at: null, created_at: '' },
    ],
    created_at: '',
    updated_at: '',
};

// Placeholder modules — TODO: fetch real modules via useCourseModules(courseId)
const modules = [
    {
        id: 1,
        title: 'JavaScript Fundamentals',
        description: 'Variables, functions, scope, closures, and the event loop — the mental models every JS developer needs before writing a single line of DOM code.',
        duration: '3 hours',
        lessons: 8,
    },
    {
        id: 2,
        title: 'DOM & Browser APIs',
        description: 'Selecting elements, responding to events, manipulating the DOM, and working with Fetch to consume REST APIs directly from the browser.',
        duration: '4 hours',
        lessons: 10,
    },
    {
        id: 3,
        title: 'Modern Tooling & Deployment',
        description: 'Vite, npm, environment variables, Git workflows, and deploying your first JavaScript app to a live URL using Netlify or Vercel.',
        duration: '2 hours',
        lessons: 6,
    },
];

const learningOutcomes = [
    'Write clean, modern JavaScript using ES6+ syntax',
    'Manipulate the DOM and respond to user events',
    'Fetch and display data from REST APIs',
    'Structure a client-side project with modern tooling',
    'Deploy a working JavaScript app to a live URL',
    'Debug JavaScript in the browser using DevTools',
];

const levelLabel: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

function formatPrice(price: string, currency: string): string {
    const amount = Number(price);
    if (isNaN(amount)) return price;
    return new Intl.NumberFormat('en-UG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CourseDetailPage() {
    return (
        <div className="min-h-screen bg-[#fafbfc]">

            {/* ── Hero banner ── */}
            <div className="relative h-64 w-full overflow-hidden bg-[#dbeafe] sm:h-80 lg:h-96">
                {course.thumbnail_url ? (
                    <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-blue-300">
                        <BookOpen className="size-16" aria-hidden="true" />
                    </div>
                )}
                {/* Gradient overlay for readability */}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Back link */}
                <Link
                    to="/"
                    className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30 sm:left-6 lg:left-8"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                </Link>
            </div>

            {/* ── Main content ── */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid gap-8 py-10 lg:grid-cols-3">

                    {/* ── Left / main column ── */}
                    <div className="lg:col-span-2">

                        {/* Category + level */}
                        <div className="flex flex-wrap items-center gap-2">
                            {course.category && (
                                <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
                                    {course.category.name}
                                </span>
                            )}
                            <Badge label={levelLabel[course.level] ?? course.level} tone="progress" />
                        </div>

                        {/* Title */}
                        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl">
                            {course.title}
                        </h1>

                        {/* Description */}
                        <p className="mt-4 text-base leading-7 text-[#475569]">
                            {course.description}
                        </p>

                        {/* Instructors */}
                        {course.instructors.length > 0 && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-[#64748b]">
                                <Users className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
                                <span>
                                    Taught by{' '}
                                    <span className="font-medium text-ink-900">
                                        {course.instructors.map((i) => i.name).join(', ')}
                                    </span>
                                </span>
                            </div>
                        )}

                        {/* Quick stats row */}
                        <div className="mt-5 flex flex-wrap gap-5 border-t border-[#e8ecf1] pt-5 text-sm text-[#64748b]">
                            <div className="flex items-center gap-1.5">
                                <SignalHigh className="size-4 text-blue-600" aria-hidden="true" />
                                <span>{levelLabel[course.level]} level</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="size-4 text-blue-600" aria-hidden="true" />
                                <span>{modules.length} modules</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="size-4 text-blue-600" aria-hidden="true" />
                                <span>~9 hours total</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <GraduationCap className="size-4 text-blue-600" aria-hidden="true" />
                                <span>Certificate on completion</span>
                            </div>
                        </div>

                        {/* Prerequisites */}
                        {course.prerequisites_text && (
                            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                                <p className="font-semibold text-amber-800">Recommended before you start</p>
                                <p className="mt-1 text-amber-700">{course.prerequisites_text}</p>
                            </div>
                        )}

                        {/* What you'll learn */}
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-ink-900">What you'll learn</h2>
                            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                {learningOutcomes.map((outcome) => (
                                    <li key={outcome} className="flex items-start gap-2.5 text-sm text-[#475569]">
                                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                                            ✓
                                        </span>
                                        {outcome}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Modules */}
                        <div className="mt-10">
                            <h2 className="text-xl font-bold text-ink-900">Course modules</h2>
                            <p className="mt-1 text-sm text-[#64748b]">{modules.length} modules · placeholder data</p>

                            <div className="mt-5 space-y-4">
                                {modules.map((mod, index) => (
                                    <Card
                                        key={mod.id}
                                        className="flex gap-4 p-5 transition duration-200 hover:shadow-md"
                                    >
                                        {/* Module number */}
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-sm font-bold text-blue-600">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-ink-900">{mod.title}</p>
                                            <p className="mt-1 text-sm leading-6 text-[#64748b]">{mod.description}</p>
                                            <div className="mt-2 flex gap-4 text-xs text-[#94a3b8]">
                                                <span>{mod.lessons} lessons</span>
                                                <span>{mod.duration}</span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* ── Right / sticky sidebar ── */}
                    <div className="lg:sticky lg:top-8 lg:self-start">
                        <Card className="overflow-hidden p-0">
                            {/* Thumbnail preview */}
                            <div className="aspect-video w-full overflow-hidden bg-[#dbeafe]">
                                {course.thumbnail_url ? (
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-blue-300">
                                        <BookOpen className="size-10" aria-hidden="true" />
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                {/* Price */}
                                <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Course fee</p>
                                <p className="mt-1 text-3xl font-bold text-ink-900">
                                    {formatPrice(course.price, course.currency)}
                                </p>
                                <p className="mt-0.5 text-xs text-[#94a3b8]">One-time payment · lifetime access</p>

                                {/* CTAs */}
                                {/* TODO: wire up Apply and Self-Paced click handlers after backend merge */}
                                <div className="mt-5 flex flex-col gap-3">
                                    <Button
                                        variant="primary"
                                        className="w-full"
                                        onClick={() => {/* TODO */ }}
                                    >
                                        Apply for Course
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => {/* TODO */ }}
                                    >
                                        Self-Paced Learning
                                    </Button>
                                </div>

                                {/* Includes */}
                                <ul className="mt-6 space-y-2.5 border-t border-[#e8ecf1] pt-5 text-sm text-[#475569]">
                                    {[
                                        'Full access to all modules',
                                        'Code reviews from mentors',
                                        'Community forum access',
                                        'Certificate on completion',
                                        'Lifetime access to materials',
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-2">
                                            <span className="text-blue-600">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
