import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
    BookOpen,
    BookX,
    Briefcase,
    CalendarDays,
    ChevronDown,
    Clock,
    Code2,
    FolderOpen,
    Headphones,
    MessageSquare,
    Trophy,
    Users,
    Zap,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { useAuthModal } from '@/lib/auth/AuthModalContext';
import { useCategories, useCourses } from '@/features/catalogue/useCourses';
import { useCohorts, usePublicCohortOfferings } from '@/features/cohorts/useCohorts';
import { CourseCarousel } from '@/components/landing/CourseCarousel';
import { courseImageMap } from '@/features/catalogue/courseImages';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { Cohort } from '@/lib/api/types';
import type { CourseFilters } from '@/features/catalogue/api';

// ─── How to choose ────────────────────────────────────────────────────────────

const pathways = [
    {
        icon: Code2,
        tag: 'Starting from zero',
        title: 'Frontend Foundations',
        description: 'Best if you have never coded or want strong HTML, CSS and JavaScript fundamentals.',
    },
    {
        icon: Zap,
        tag: 'Ready to specialise',
        title: 'PHP & MySQL Backend',
        description: 'Choose this when you understand the web basics and want to build secure, data-driven applications.',
    },
    {
        icon: Briefcase,
        tag: 'Ready for client work',
        title: 'WordPress Development',
        description: 'Ideal for designers and developers who want to deliver complete business websites.',
    },
];

// ─── What every course includes ───────────────────────────────────────────────

const includes = [
    { icon: FolderOpen, title: 'Portfolio projects', description: 'Build work you can confidently show clients and employers.' },
    { icon: Users, title: 'Small cohorts', description: 'Get individual attention and learn alongside committed peers.' },
    { icon: Headphones, title: 'Mentor feedback', description: 'Receive practical reviews from people doing the work today.' },
    { icon: Trophy, title: 'Course certificate', description: 'Earn proof of completion after meeting project requirements.' },
    { icon: Briefcase, title: 'Career preparation', description: 'Improve your CV, portfolio presentation and interview readiness.' },
    { icon: MessageSquare, title: 'Alumni community', description: 'Keep learning through peer support and mentor connections.' },
];

// ─── Learning journey ─────────────────────────────────────────────────────────

const journey = [
    { number: '01', label: 'Choose your pathway' },
    { number: '02', label: 'Learn with your cohort' },
    { number: '03', label: 'Build reviewed projects' },
    { number: '04', label: 'Graduate ready to show your work' },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const faqs = [
    { q: 'Do I need coding experience?', a: 'No prior experience is needed for our beginner courses. Frontend Foundations starts from absolute zero — just bring a laptop and the willingness to learn.' },
    { q: 'Can I pay the course fee in instalments?', a: 'Yes. We offer a flexible payment plan where you pay a deposit to secure your seat and clear the balance before or during the course. Contact us to arrange.' },
    { q: 'Are classes online or in person?', a: 'It depends on the course. Some are fully online, others are in-person in Kampala, and a few run as hybrid. Each course card shows its delivery mode.' },
    { q: 'Will I receive a certificate?', a: 'Yes. Every graduate who completes the project requirements receives a publicly verifiable certificate you can share on LinkedIn or send to employers.' },
    { q: 'What happens if I miss a session?', a: 'Session recordings are shared in the cohort channel within 24 hours. If you miss more than two sessions, your mentor will reach out to help you catch up.' },
    { q: 'How do I know which course is right for me?', a: 'Use the "Which course fits you best?" guide on this page, or contact us directly. We are happy to talk through your background and goals.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-t border-border">
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-ink-900 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
                {q}
                <ChevronDown className={cn('size-4 shrink-0 text-ink-300 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
            </button>
            {open && <p className="pb-4 text-sm leading-7 text-ink-600">{a}</p>}
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

// ─── Cohort helpers ────────────────────────────────────────────────────────────

/** A cohort is "ongoing" if any of its courses are already running. */
function isOngoing(cohort: Cohort): boolean {
    return cohort.courses.some((c) => c.status === 'in_progress');
}

/** A cohort is "upcoming" if it isn't ongoing but at least one course is still open. */
function isUpcoming(cohort: Cohort): boolean {
    return !isOngoing(cohort) && cohort.courses.some((c) => c.status === 'open');
}

function cohortImage(cohort: Cohort): string | null {
    const firstCourse = cohort.courses[0]?.course;
    if (!firstCourse) return null;
    return firstCourse.thumbnail_url ?? courseImageMap[firstCourse.slug] ?? null;
}

// ─── Ongoing cohort — large featured card ────────────────────────────────────

function OngoingCohortCard({ cohort }: { cohort: Cohort }) {
    const image = cohortImage(cohort);
    const courseCount = cohort.courses.length;

    return (
        <div className="overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm lg:flex">
            {/* Image panel */}
            <div className="relative shrink-0 bg-[#eff6ff] lg:w-80 xl:w-96">
                <div className="aspect-video h-full w-full lg:aspect-auto">
                    {image ? (
                        <img
                            src={image}
                            alt={cohort.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full min-h-[200px] w-full items-center justify-center text-blue-200">
                            <BookOpen className="size-16" aria-hidden="true" />
                        </div>
                    )}
                </div>
                {/* Ongoing badge over the image */}
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow">
                    <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />
                    Ongoing
                </span>
            </div>

            {/* Content panel */}
            <div className="flex flex-col gap-5 p-6 lg:p-8">
                {/* Header */}
                <div>
                    <h3 className="text-xl font-bold text-ink-900 sm:text-2xl">
                        {cohort.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#64748b]">
                        {courseCount} course{courseCount !== 1 ? 's' : ''} in this cohort
                    </p>
                </div>

                {/* Meta row */}
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="flex items-start gap-2">
                        <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Started</dt>
                            <dd className="text-ink-700">{formatDate(cohort.start_date)}</dd>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Ends</dt>
                            <dd className="text-ink-700">{formatDate(cohort.end_date)}</dd>
                        </div>
                    </div>
                </dl>

                {/* Courses in this cohort */}
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Courses
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        {cohort.courses.map((cc) => (
                            <li
                                key={cc.id}
                                className="rounded-full border border-[#e8ecf1] bg-[#f8fafc] px-3 py-1 text-xs text-ink-700"
                            >
                                {cc.course?.title}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* CTA */}
                <div className="mt-auto pt-2">
                    <Link
                        to={`/cohorts/${cohort.id}`}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        View cohort &amp; courses
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Upcoming cohort — compact card ──────────────────────────────────────────

function UpcomingCohortCard({ cohort }: { cohort: Cohort }) {
    const image = cohortImage(cohort);
    const courseCount = cohort.courses.length;

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            {/* Image */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#eff6ff]">
                {image ? (
                    <img src={image} alt={cohort.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-200">
                        <BookOpen className="size-10" aria-hidden="true" />
                    </div>
                )}
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow">
                    Registration Open
                </span>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-3 p-4">
                <h3 className="text-sm font-semibold leading-snug text-ink-900">{cohort.name}</h3>
                <p className="text-xs text-[#64748b]">
                    {courseCount} course{courseCount !== 1 ? 's' : ''} available
                </p>

                <dl className="space-y-1.5 text-xs text-[#64748b]">
                    <div className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                        <span>Starts {formatDate(cohort.start_date)}</span>
                    </div>
                    {cohort.application_deadline && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                            <span>Apply by {formatDate(cohort.application_deadline)}</span>
                        </div>
                    )}
                </dl>

                <Link
                    to={`/cohorts/${cohort.id}`}
                    className="mt-auto inline-flex w-full items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
                >
                    View cohort
                </Link>
            </div>
        </div>
    );
}

// ─── Cohort Schedule section ──────────────────────────────────────────────────

function CohortSchedule() {
    const { data, isLoading } = useCohorts({ status: 'published' });
    const cohorts = data ?? [];

    if (isLoading) {
        return (
            <section id="cohorts" className="border-t border-[#e8ecf1] bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl flex justify-center">
                    <Spinner />
                </div>
            </section>
        );
    }

    const ongoing = cohorts.filter(isOngoing);
    const upcoming = cohorts.filter(isUpcoming);

    if (ongoing.length === 0 && upcoming.length === 0) {
        return (
            <section id="cohorts" className="border-t border-[#e8ecf1] bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-10">
                        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Cohort Schedule</p>
                        <h2 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">Upcoming & Ongoing Cohorts</h2>
                    </div>
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cbd5e1] bg-white py-16 text-center">
                        <CalendarDays className="size-10 text-[#cbd5e1]" aria-hidden="true" />
                        <p className="mt-4 text-base font-medium text-[#64748b]">No cohorts scheduled yet</p>
                        <p className="mt-1 text-sm text-[#94a3b8]">Check back soon — new cohorts are added regularly.</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="cohorts" className="border-t border-[#e8ecf1] bg-[#f8fafc] px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-14">
                {/* Section header */}
                <div>
                    <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Cohort Schedule</p>
                    <h2 className="mt-2 text-2xl font-bold text-ink-900 sm:text-3xl">Upcoming & Ongoing Cohorts</h2>
                    <p className="mt-2 text-[#64748b]">
                        Join a structured cohort for guided learning and peer accountability.
                    </p>
                </div>

                {/* Ongoing */}
                {ongoing.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                            <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            Ongoing Cohorts
                        </h3>
                        <div className="space-y-6">
                            {ongoing.map((cohort) => (
                                <OngoingCohortCard key={cohort.id} cohort={cohort} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Upcoming */}
                {upcoming.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                            <span className="size-2.5 rounded-full bg-amber-400" aria-hidden="true" />
                            Upcoming Cohorts
                        </h3>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {upcoming.map((cohort) => (
                                <UpcomingCohortCard key={cohort.id} cohort={cohort} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CataloguePage() {
    const [searchParams] = useSearchParams();
    const { openAuth } = useAuthModal();

    // Active filters — search is client-side only
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | undefined>(() => {
        const v = searchParams.get('category_id');
        return v ? Number(v) : undefined;
    });
    const [activeLevel, setActiveLevel] = useState<string | undefined>(() => {
        return searchParams.get('level') ?? undefined;
    });

    const apiFilters: CourseFilters = useMemo(
        () => ({ status: 'published' }),
        [],
    );

    // Fetch all published courses once; filter client-side
    const { data, isLoading: coursesLoading } = useCourses(apiFilters);
    const { data: categories } = useCategories();
    const { data: cohortOfferings, isLoading: offeringsLoading } = usePublicCohortOfferings();

    const isLoading = coursesLoading || offeringsLoading;

    // Only courses with at least one published cohort offering belong in the public
    // catalogue grid/search — a course with no cohort to enrol into isn't actually
    // available yet. Direct /courses/:id links stay reachable regardless.
    const courseIdsWithCohorts = useMemo(
        () => new Set((cohortOfferings ?? []).map((offering) => offering.course.id)),
        [cohortOfferings],
    );
    const allCourses = useMemo(
        () => (data?.data ?? []).filter((c) => courseIdsWithCohorts.has(c.id)),
        [data, courseIdsWithCohorts],
    );

    const filtered = useMemo(() => {
        return allCourses.filter((c) => {
            if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
            if (activeCategory && c.category?.id !== activeCategory) return false;
            if (activeLevel && c.level !== activeLevel) return false;
            return true;
        });
    }, [allCourses, search, activeCategory, activeLevel]);

    const levels = [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
    ];

    return (
        <div className="min-h-screen bg-[#fafbfc]">
            <LandingHeader
                onLoginClick={() => openAuth('login')}
                onSignupClick={() => openAuth('signup')}
            />

            <main>
                {/* §1 Course finder header */}
                <section className="border-b border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Course Finder
                        </p>
                        <h1 className="mt-3 text-4xl text-ink-900 sm:text-5xl">
                            Find the right place to begin.
                        </h1>
                        <p className="mt-3 max-w-lg text-base leading-7 text-ink-600">
                            Search by a skill you want to learn, then narrow the results by subject or
                            experience level.
                        </p>

                        {/* Quick facts strip */}
                        <div className="mt-8 flex flex-wrap gap-6 border-t border-border pt-6">
                            {[
                                { icon: FolderOpen, label: 'Project-based learning' },
                                { icon: Users, label: 'Expert mentor support' },
                                { icon: Trophy, label: 'Verified certificate' },
                                { icon: CalendarDays, label: 'Flexible payment plans' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-2 text-sm text-ink-600">
                                    <Icon className="size-4 text-primary" aria-hidden="true" />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    {/* Filter row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Category chips */}
                        {categories && categories.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveCategory(undefined)}
                                    aria-pressed={activeCategory === undefined}
                                    className={cn(
                                        'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                        activeCategory === undefined
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-border bg-white text-ink-600 hover:border-primary hover:text-primary',
                                    )}
                                >
                                    All
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(activeCategory === cat.id ? undefined : cat.id)}
                                        aria-pressed={activeCategory === cat.id}
                                        className={cn(
                                            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                            activeCategory === cat.id
                                                ? 'border-primary bg-primary text-white'
                                                : 'border-border bg-white text-ink-600 hover:border-primary hover:text-primary',
                                        )}
                                    >
                                        {cat.name}
                                        {cat.courses_count !== undefined && (
                                            <span className="ml-1.5 text-xs opacity-70">({cat.courses_count})</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Divider */}
                        {categories && categories.length > 0 && (
                            <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
                        )}

                        {/* Level chips */}
                        <div className="flex flex-wrap gap-2">
                            {levels.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setActiveLevel(activeLevel === value ? undefined : value)}
                                    aria-pressed={activeLevel === value}
                                    className={cn(
                                        'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                        activeLevel === value
                                            ? 'border-primary bg-primary text-white'
                                            : 'border-border bg-white text-ink-600 hover:border-primary hover:text-primary',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active filter summary */}
                    {(search || activeCategory || activeLevel) && (
                        <p className="mt-4 text-sm text-[#64748b]">
                            Showing <span className="font-semibold text-ink-900">{filtered.length}</span> result
                            {filtered.length !== 1 ? 's' : ''}
                            {search && <> for &ldquo;<span className="italic">{search}</span>&rdquo;</>}
                            &nbsp;
                            <button
                                onClick={() => { setSearch(''); setActiveCategory(undefined); setActiveLevel(undefined); }}
                                className="text-blue-600 underline hover:text-blue-800"
                            >
                                Clear filters
                            </button>
                        </p>
                    )}

                    {/* ── Section 2: Course Carousel ──────────────────────────── */}
                    <div className="mt-8">
                        {isLoading && (
                            <div className="flex justify-center py-20">
                                <Spinner />
                            </div>
                        )}

                        {!isLoading && filtered.length === 0 && (
                            <EmptyState
                                icon={BookX}
                                title="No courses match your search"
                                description="Try different keywords or clear a filter."
                            />
                        )}

                        {!isLoading && filtered.length > 0 && (
                            <div className="px-6">
                                <CourseCarousel courses={filtered} />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Section 3: Cohort Schedule ───────────────────────────────── */}
                {!isLoading && <CohortSchedule />}

                {/* ── Section 4: How to choose ─────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Choose with confidence</p>
                        <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Which course fits you best?</h2>
                        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-600">
                            Your best starting point depends on what you already know and what you want to build next.
                        </p>
                        <div className="mt-8 grid gap-px rounded-2xl border border-border bg-border sm:grid-cols-3">
                            {pathways.map(({ icon: Icon, tag, title, description }) => (
                                <div key={title} className="flex flex-col gap-3 bg-white p-6 first:rounded-tl-2xl first:rounded-bl-2xl last:rounded-tr-2xl last:rounded-br-2xl">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                                        <Icon className="size-5 text-primary" aria-hidden="true" />
                                    </div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{tag}</p>
                                    <h3 className="text-lg text-ink-900">{title}</h3>
                                    <p className="text-sm leading-6 text-ink-600">{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Section 5: What every course includes ────────────────────── */}
                <section className="border-t border-border bg-white px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Included in every course</p>
                        <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Support that continues beyond class.</h2>
                        <p className="mt-3 max-w-lg text-sm leading-7 text-ink-600">
                            Each pathway combines technical practice with the feedback and career preparation needed to use your new skills.
                        </p>
                        <div className="mt-8 grid gap-x-8 gap-y-6 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-3">
                            {includes.map(({ icon: Icon, title, description }) => (
                                <div key={title} className="flex items-start gap-4 border-b border-border pb-6">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                        <Icon className="size-5 text-primary" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-ink-900">{title}</p>
                                        <p className="mt-1 text-sm leading-6 text-ink-600">{description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Section 6: Learning journey ──────────────────────────────── */}
                <section className="bg-navy px-4 py-14 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Your learning journey</p>
                        <h2 className="mt-3 text-3xl text-navy-foreground sm:text-4xl">From first lesson to finished portfolio.</h2>
                        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {journey.map(({ number, label }) => (
                                <div key={number} className="flex flex-col gap-3">
                                    <div className="h-px w-full bg-white/20" aria-hidden="true" />
                                    <p className="font-display text-2xl font-semibold text-accent-amber">{number}</p>
                                    <p className="text-sm leading-6 text-navy-foreground/80">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Section 7: FAQ ───────────────────────────────────────────── */}
                <section className="border-t border-border bg-white px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Frequently asked questions</p>
                                <h2 className="mt-3 text-3xl text-ink-900">Know before you enrol.</h2>
                                <p className="mt-3 text-sm leading-7 text-ink-600">Clear answers to the questions learners ask most often.</p>
                            </div>
                            <div className="lg:col-span-2">
                                {faqs.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
                                <div className="border-t border-border" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Section 8: Final enrolment prompt ───────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-2xl text-ink-900 sm:text-3xl">Ready to find your cohort?</h2>
                            <p className="mt-2 text-sm leading-7 text-ink-600">
                                Browse available intakes or reach out if you need help choosing the right course.
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-3">
                            <a
                                href="#cohorts"
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <CalendarDays className="size-4" aria-hidden="true" />
                                View cohorts
                            </a>
                            <Link
                                to="/contact"
                                className="inline-flex items-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                Contact us
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer
                onLoginClick={() => openAuth('login')}
                onSignupClick={() => openAuth('signup')}
            />
        </div>
    );
}
