import { Link, useParams } from 'react-router';
import { ArrowLeft, BookOpen, CalendarDays, Clock, User } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { useAuthModal } from '@/lib/auth/AuthModalContext';
import { useCohort } from '@/features/cohorts/useCohorts';
import { courseImageMap } from '@/features/catalogue/courseImages';
import { Spinner } from '@/components/ui/Spinner';
import { cohortStatusDisplay } from '@/lib/statusBadge';
import { Badge } from '@/components/ui/Badge';
import type { CohortCourse } from '@/lib/api/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-UG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

const levelLabel: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

// ─── One course offered within this cohort ───────────────────────────────────

function CohortCourseCard({ cohortCourse }: { cohortCourse: CohortCourse }) {
    const course = cohortCourse.course;
    if (!course) return null;

    const image = course.thumbnail_url ?? courseImageMap[course.slug] ?? null;
    const instructor = cohortCourse.primary_instructor ?? course.instructors[0] ?? null;
    const seatsLeft = cohortCourse.capacity !== null ? cohortCourse.capacity - cohortCourse.seats_taken : null;

    return (
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#e8ecf1] bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row">
            <div className="relative h-40 shrink-0 overflow-hidden bg-[#eff6ff] sm:h-auto sm:w-56">
                {image ? (
                    <img src={image} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-200">
                        <BookOpen className="size-10" aria-hidden="true" />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                    {course.category && (
                        <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
                            {course.category.name}
                        </span>
                    )}
                    <h3 className="mt-2 text-lg font-bold text-ink-900">{course.title}</h3>
                    {course.description && (
                        <p className="mt-1 text-sm leading-6 text-[#64748b] line-clamp-2">{course.description}</p>
                    )}
                </div>

                <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#64748b]">
                    <div className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                        <span>{levelLabel[course.level] ?? course.level}</span>
                    </div>
                    {instructor && (
                        <div className="flex items-center gap-1.5">
                            <User className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                            <span>{instructor.name}</span>
                        </div>
                    )}
                    {cohortCourse.capacity !== null && seatsLeft !== null && (
                        <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5 shrink-0 text-blue-400" aria-hidden="true" />
                            {cohortCourse.is_full ? (
                                <span className="font-medium text-amber-700">Full — waitlist</span>
                            ) : (
                                <span>{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left</span>
                            )}
                        </div>
                    )}
                </dl>

                <div className="mt-auto pt-1">
                    <Link
                        to={`/courses/${course.id}`}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        View course &amp; apply
                    </Link>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CohortPage() {
    const { id } = useParams();
    const cohortId = Number(id);
    const { openAuth } = useAuthModal();
    const { data: cohort, isLoading, isError } = useCohort(cohortId);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (isError || !cohort) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <CalendarDays className="size-12 text-[#e8ecf1]" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-[#0f172a]">Cohort not found</h1>
                <p className="text-[#64748b]">That cohort doesn't exist or may have been removed.</p>
                <Link
                    to="/courses"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to courses
                </Link>
            </div>
        );
    }

    const status = cohortStatusDisplay(cohort.status);

    return (
        <div className="min-h-screen bg-[#fafbfc]">
            <LandingHeader
                onLoginClick={() => openAuth('login')}
                onSignupClick={() => openAuth('signup')}
            />

            <main>
                <div className="border-b border-[#e8ecf1] bg-[#dbeafe] px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <Link
                            to="/courses"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#334155] hover:text-blue-700"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                            Back to courses
                        </Link>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                {cohort.name}
                            </h1>
                            <Badge label={status.label} tone={status.tone} icon={status.icon} />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#334155]">
                            <div className="flex items-center gap-1.5">
                                <CalendarDays className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
                                <span>{formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}</span>
                            </div>
                            {cohort.application_deadline && (
                                <div className="flex items-center gap-1.5">
                                    <Clock className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
                                    <span>Apply by {formatDate(cohort.application_deadline)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
                    <h2 className="text-lg font-bold text-ink-900">
                        Courses in this cohort
                    </h2>
                    <p className="mt-1 text-sm text-[#64748b]">
                        Choose which course you&apos;d like to apply for — each has its own seats and instructor.
                    </p>

                    <div className="mt-6 space-y-4">
                        {cohort.courses.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#e8ecf1] bg-white py-16 text-center">
                                <BookOpen className="mx-auto size-8 text-[#cbd5e1]" aria-hidden="true" />
                                <p className="mt-3 text-sm text-[#94a3b8]">
                                    No courses have been added to this cohort yet.
                                </p>
                            </div>
                        ) : (
                            cohort.courses.map((cohortCourse) => (
                                <CohortCourseCard key={cohortCourse.id} cohortCourse={cohortCourse} />
                            ))
                        )}
                    </div>
                </div>
            </main>

            <Footer
                onLoginClick={() => openAuth('login')}
                onSignupClick={() => openAuth('signup')}
            />
        </div>
    );
}
