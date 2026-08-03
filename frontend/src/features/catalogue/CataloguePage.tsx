import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
    BookOpen,
    BookX,
    CalendarDays,
    CheckCircle2,
    Clock,
    Search,
    User,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { AuthModal, type AuthMode } from '@/components/landing/AuthModal';
import { useCategories, useCourseModules, useCourses } from '@/features/catalogue/useCourses';
import { CourseCarousel } from '@/components/landing/CourseCarousel';
import { courseImageMap, courseDurationMap } from '@/features/catalogue/courseImages';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import type { Course, Module } from '@/lib/api/types';
import type { CourseFilters } from '@/features/catalogue/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalState = AuthMode | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function levelLabel(level: Course['level']): string {
    return { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }[level] ?? level;
}

// ─── Ongoing cohort — large featured card ────────────────────────────────────

function OngoingCohortCard({ course }: { course: Course }) {
    const { data: modules, isLoading } = useCourseModules(course.id);
    const instructor = course.instructors[0] ?? null;
    const image = courseImageMap[course.slug] ?? course.thumbnail_url ?? null;

    return (
        <div className="overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm lg:flex">
            {/* Image panel */}
            <div className="relative shrink-0 bg-[#eff6ff] lg:w-80 xl:w-96">
                <div className="aspect-video h-full w-full lg:aspect-auto">
                    {image ? (
                        <img
                            src={image}
                            alt={course.title}
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
                    {course.category && (
                        <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
                            {course.category.name}
                        </span>
                    )}
                    <h3 className="mt-2 text-xl font-bold text-ink-900 sm:text-2xl">
                        {course.title}
                    </h3>
                    {course.description && (
                        <p className="mt-1 text-sm leading-6 text-[#64748b] line-clamp-2">
                            {course.description}
                        </p>
                    )}
                </div>

                {/* Meta row */}
                <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {course.schedule_start_date && (
                        <div className="flex items-start gap-2">
                            <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Started</dt>
                                <dd className="text-ink-700">{formatDate(course.schedule_start_date)}</dd>
                            </div>
                        </div>
                    )}
                    <div className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Level</dt>
                            <dd className="text-ink-700">{levelLabel(course.level)}</dd>
                        </div>
                    </div>
                    {/* ⚠️ Gap: no duration or delivery-mode field on the Course model yet.
                        Add `duration_weeks` and `delivery_mode` (enum: online|physical|hybrid)
                        to the courses table when that data is available. */}
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <div>
                            <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Mode</dt>
                            <dd className="text-[#94a3b8] italic">Not specified</dd>
                        </div>
                    </div>
                    {instructor && (
                        <div className="flex items-start gap-2">
                            <User className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden="true" />
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Mentor</dt>
                                <dd className="text-ink-700">{instructor.name}</dd>
                            </div>
                        </div>
                    )}
                </dl>

                {/* Course units */}
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
                        Course Units
                    </p>
                    {isLoading ? (
                        <p className="text-xs text-[#94a3b8]">Loading modules…</p>
                    ) : modules && modules.length > 0 ? (
                        <ul className="flex flex-wrap gap-2">
                            {modules.slice(0, 6).map((mod: Module) => (
                                <li
                                    key={mod.id}
                                    className="rounded-full border border-[#e8ecf1] bg-[#f8fafc] px-3 py-1 text-xs text-ink-700"
                                >
                                    {mod.title}
                                </li>
                            ))}
                            {modules.length > 6 && (
                                <li className="rounded-full border border-[#e8ecf1] bg-[#f8fafc] px-3 py-1 text-xs text-[#94a3b8]">
                                    +{modules.length - 6} more
                                </li>
                            )}
                        </ul>
                    ) : (
                        <p className="text-xs text-[#94a3b8]">No modules listed yet.</p>
                    )}
                </div>

                {/* CTA */}
                <div className="mt-auto pt-2">
                    <Link
                        to={`/courses/${course.id}`}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        View Course
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Upcoming cohort — compact card ──────────────────────────────────────────

function UpcomingCohortCard({ course }: { course: Course }) {
    const instructor = course.instructors[0] ?? null;
    const image = courseImageMap[course.slug] ?? course.thumbnail_url ?? null;

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
            {/* Image */}
            <div className="relative aspect-video w-full overflow-hidden bg-[#eff6ff]">
                {image ? (
                    <img src={image} alt={course.title} className="h-full w-full object-cover" />
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
                {course.category && (
                    <span className="inline-flex w-fit items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
                        {course.category.name}
                    </span>
                )}
                <h3 className="text-sm font-semibold leading-snug text-ink-900">{course.title}</h3>

                <dl className="space-y-1.5 text-xs text-[#64748b]">
                    {course.schedule_start_date && (
                        <div className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                            <span>Starts {formatDate(course.schedule_start_date)}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                        <span>{levelLabel(course.level)}</span>
                    </div>
                    {/* ⚠️ Gap: delivery_mode not in schema yet */}
                    <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                        <span className="italic text-[#94a3b8]">Mode TBC</span>
                    </div>
                    {instructor && (
                        <div className="flex items-center gap-1.5">
                            <User className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                            <span>{instructor.name}</span>
                        </div>
                    )}
                </dl>

                <Link
                    to={`/courses/${course.id}`}
                    className="mt-auto inline-flex w-full items-center justify-center rounded-md border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
                >
                    Register Now
                </Link>
            </div>
        </div>
    );
}

// ─── Cohort Schedule section ──────────────────────────────────────────────────

function CohortSchedule({ courses }: { courses: Course[] }) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Only courses that actually have a schedule_start_date
    const scheduled = courses.filter((c) => c.schedule_start_date !== null);

    if (scheduled.length === 0) {
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

    const ongoing = scheduled.filter((c) => new Date(c.schedule_start_date!) <= now);
    const upcoming = scheduled.filter((c) => new Date(c.schedule_start_date!) > now);

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
                            {ongoing.map((course) => (
                                <OngoingCohortCard key={course.id} course={course} />
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
                            {upcoming.map((course) => (
                                <UpcomingCohortCard key={course.id} course={course} />
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
    const [modalState, setModalState] = useState<ModalState>(null);

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
    const { data, isLoading } = useCourses(apiFilters);
    const { data: categories } = useCategories();

    const allCourses = data?.data ?? [];

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
                onLoginClick={() => setModalState('login')}
                onSignupClick={() => setModalState('signup')}
            />

            <main>
                {/* ── Section 1: Header + Filters ─────────────────────────────── */}
                <div className="overflow-hidden bg-[#dbeafe]">
                    <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-2 lg:items-stretch">
                        {/* Left: text + search */}
                        <div className="flex flex-col justify-center px-4 py-14 sm:px-6 lg:py-20 lg:pl-8 xl:pl-0">
                            <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                                Browse Our Courses
                            </h1>
                            <p className="mt-4 max-w-lg text-lg leading-8 text-[#334155]">
                                Choose your learning path with our structured, project-based courses
                                designed to take you from beginner to job-ready developer.
                            </p>

                            {/* Search */}
                            <div className="relative mt-8 max-w-md">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]"
                                    aria-hidden="true"
                                />
                                <input
                                    type="search"
                                    placeholder="Search courses…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full rounded-xl border border-[#cbd5e1] bg-white py-2.5 pl-9 pr-4 text-sm text-ink-900 placeholder:text-[#94a3b8] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                />
                            </div>
                        </div>

                        {/* Right: image — bleeds to edge on desktop */}
                        <div className="relative hidden lg:block">
                            <img
                                src="/images/browse-courses.jpg"
                                alt="Students browsing courses"
                                className="absolute inset-0 h-full w-full object-cover object-center"
                            />
                            {/* Gradient fade on left edge to blend into bg */}
                            <div
                                aria-hidden="true"
                                className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#dbeafe] to-transparent"
                            />
                        </div>

                        {/* Mobile: image below text */}
                        <div className="h-52 w-full overflow-hidden lg:hidden">
                            <img
                                src="/images/browse-courses.jpg"
                                alt="Students browsing courses"
                                className="h-full w-full object-cover object-center"
                            />
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                    {/* Filter row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Category chips */}
                        {categories && categories.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveCategory(undefined)}
                                    className={cn(
                                        'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                                        activeCategory === undefined
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-[#e8ecf1] bg-white text-[#334155] hover:border-blue-300 hover:text-blue-700',
                                    )}
                                >
                                    All
                                </button>
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(activeCategory === cat.id ? undefined : cat.id)}
                                        className={cn(
                                            'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                                            activeCategory === cat.id
                                                ? 'border-blue-600 bg-blue-600 text-white'
                                                : 'border-[#e8ecf1] bg-white text-[#334155] hover:border-blue-300 hover:text-blue-700',
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
                            <span className="hidden h-5 w-px bg-[#e8ecf1] sm:block" aria-hidden="true" />
                        )}

                        {/* Level chips */}
                        <div className="flex flex-wrap gap-2">
                            {levels.map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setActiveLevel(activeLevel === value ? undefined : value)}
                                    className={cn(
                                        'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                                        activeLevel === value
                                            ? 'border-blue-600 bg-blue-600 text-white'
                                            : 'border-[#e8ecf1] bg-white text-[#334155] hover:border-blue-300 hover:text-blue-700',
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
                {!isLoading && <CohortSchedule courses={allCourses} />}
            </main>

            <Footer
                onLoginClick={() => setModalState('login')}
                onSignupClick={() => setModalState('signup')}
            />

            <AuthModal
                open={modalState !== null}
                mode={modalState ?? 'login'}
                onModeChange={setModalState}
                onClose={() => setModalState(null)}
            />
        </div>
    );
}
