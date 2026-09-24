import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarDays,
    CalendarRange,
    CircleCheck,
    Clock,
    CreditCard,
    GraduationCap,
    Hourglass,
    Lock,
    MessageCircle,
    MousePointerClick,
    SignalHigh,
    User,
    UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { useAuthModal } from '@/lib/auth/AuthModalContext';
import { useCohort } from '@/features/cohorts/useCohorts';
import { courseImageMap } from '@/features/catalogue/courseImages';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cohortPhase, daysUntil, displayCohortName, type CohortPhase } from '@/lib/cohort';
import { cn } from '@/lib/utils';
import type { Cohort, CohortCourse } from '@/lib/api/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
    return new Date(dateStr).toLocaleDateString('en-UG', opts);
}

function formatPrice(price: string, currency: string): string {
    const amount = Number(price);
    if (!amount) return 'Free';
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function durationWeeks(start: string, end: string): number {
    return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / (7 * 86_400_000)));
}

const levelLabel: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

/** Student-facing status — see `cohortPhase` for how it's derived. */
const PHASE_DISPLAY: Record<CohortPhase, { label: string; icon: LucideIcon; className: string }> = {
    open: { label: 'Registration open', icon: CircleCheck, className: 'bg-success-600/10 text-success-600' },
    in_progress: { label: 'In progress', icon: Hourglass, className: 'bg-blue-600/10 text-blue-600' },
    closed: { label: 'Registration closed', icon: Lock, className: 'bg-ink-300/20 text-ink-600' },
    completed: { label: 'Completed', icon: GraduationCap, className: 'bg-ink-300/20 text-ink-600' },
};

// ─── Quick fact tile ─────────────────────────────────────────────────────────

function Fact({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note?: ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-surface-0 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-600">
                <Icon className="size-4 text-primary" aria-hidden="true" />
                {label}
            </div>
            <p className="mt-1.5 text-base font-semibold text-ink-900">{value}</p>
            {note && <p className="mt-0.5 text-xs text-ink-600">{note}</p>}
        </div>
    );
}

// ─── One course offered within this cohort ───────────────────────────────────

function CohortCourseCard({ cohortCourse }: { cohortCourse: CohortCourse }) {
    const course = cohortCourse.course;
    if (!course) return null;

    const image = course.thumbnail_url ?? courseImageMap[course.slug] ?? null;
    const instructor = cohortCourse.primary_instructor ?? course.instructors[0] ?? null;
    const capacity = cohortCourse.capacity;
    const seatsLeft = capacity !== null ? Math.max(0, capacity - cohortCourse.seats_taken) : null;
    const filledPct = capacity ? Math.min(100, Math.round((cohortCourse.seats_taken / capacity) * 100)) : 0;
    const accepting = cohortCourse.is_accepting_applications;

    return (
        <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row">
            <div className="relative h-40 shrink-0 overflow-hidden bg-blue-50 sm:h-auto sm:w-52">
                {image ? (
                    <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-400">
                        <BookOpen className="size-10" aria-hidden="true" />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        {course.category && (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-primary">
                                {course.category.name}
                            </span>
                        )}
                        <h3 className="mt-2 text-lg text-ink-900">{course.title}</h3>
                    </div>
                    <p className="shrink-0 text-lg font-bold text-ink-900">{formatPrice(cohortCourse.price, cohortCourse.currency)}</p>
                </div>

                {course.description && (
                    <p className="line-clamp-2 text-sm leading-6 text-ink-600">{course.description}</p>
                )}

                <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-600">
                    <div className="flex items-center gap-1.5">
                        <SignalHigh className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        <dt className="sr-only">Level</dt>
                        <dd>{levelLabel[course.level] ?? course.level}</dd>
                    </div>
                    {instructor && (
                        <div className="flex items-center gap-1.5">
                            <User className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                            <dt className="sr-only">Instructor</dt>
                            <dd>{instructor.name}</dd>
                        </div>
                    )}
                </dl>

                {/* Seats */}
                {capacity !== null && seatsLeft !== null && (
                    <div>
                        <div className="flex items-center justify-between text-xs">
                            <span className={cn('font-medium', cohortCourse.is_full ? 'text-accent-amber' : 'text-ink-900')}>
                                {cohortCourse.is_full ? 'Full — join the waitlist' : `${seatsLeft} of ${capacity} seats left`}
                            </span>
                            <span className="text-ink-600">{filledPct}% taken</span>
                        </div>
                        <div
                            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-100"
                            role="progressbar"
                            aria-valuenow={filledPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Seats taken"
                        >
                            <div
                                className={cn('h-full rounded-full', cohortCourse.is_full ? 'bg-amber-500' : 'bg-primary')}
                                style={{ width: `${filledPct}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    <Link
                        to={`/courses/${course.id}`}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                            accepting ? 'bg-primary text-white hover:bg-blue-700' : 'border border-border text-ink-900 hover:bg-surface-50',
                        )}
                    >
                        {accepting ? 'View course & apply' : 'View course'}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                    {!accepting && (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-600">
                            <Lock className="size-3.5" aria-hidden="true" />
                            Applications closed
                        </span>
                    )}
                </div>
            </div>
        </article>
    );
}

// ─── Side panel: key dates + how joining works ───────────────────────────────

const JOIN_STEPS: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: MousePointerClick, title: 'Pick a course', body: 'Each course in the cohort has its own seats and instructor.' },
    { icon: UserPlus, title: 'Apply or enrol', body: 'Beginner courses enrol instantly; others take a short application.' },
    { icon: CreditCard, title: 'Secure your seat', body: 'Pay in full or start with a deposit and clear the balance later.' },
    { icon: GraduationCap, title: 'Start together', body: 'Learn with your cohort, build projects, and earn your certificate.' },
];

function KeyDates({ cohort }: { cohort: Cohort }) {
    const today = new Date().toISOString().slice(0, 10);
    const dates = [
        cohort.application_deadline && { label: 'Applications close', date: cohort.application_deadline },
        { label: 'Cohort starts', date: cohort.start_date },
        { label: 'Cohort ends', date: cohort.end_date },
    ].filter(Boolean) as { label: string; date: string }[];

    return (
        <ol className="relative mt-4 space-y-4 border-l border-border pl-5">
            {dates.map(({ label, date }) => {
                const past = date.slice(0, 10) < today;
                return (
                    <li key={label} className="relative">
                        <span
                            className={cn(
                                'absolute -left-[1.6875rem] top-1 size-3 rounded-full border-2 border-surface-0',
                                past ? 'bg-ink-300' : 'bg-primary',
                            )}
                            aria-hidden="true"
                        />
                        <p className="text-xs font-medium text-ink-600">{label}</p>
                        <p className={cn('text-sm font-semibold', past ? 'text-ink-600' : 'text-ink-900')}>{formatDate(date)}</p>
                    </li>
                );
            })}
        </ol>
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
                <CalendarDays className="size-12 text-ink-300" aria-hidden="true" />
                <h1 className="text-2xl text-ink-900">Cohort not found</h1>
                <p className="text-ink-600">That cohort doesn't exist or may have been removed.</p>
                <Link to="/courses" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Browse courses
                </Link>
            </div>
        );
    }

    const name = displayCohortName(cohort.name);
    const phase = PHASE_DISPLAY[cohortPhase(cohort)];
    const weeks = durationWeeks(cohort.start_date, cohort.end_date);
    const deadlineDays = cohort.application_deadline ? daysUntil(cohort.application_deadline) : null;
    const courses = cohort.courses.filter((cc) => cc.course);
    const shortDate: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

    return (
        <div className="min-h-screen bg-surface-50">
            <LandingHeader onLoginClick={() => openAuth('login')} onSignupClick={() => openAuth('signup')} />

            <main>
                {/* Hero */}
                <section className="border-b border-border bg-blue-50 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        <nav aria-label="Breadcrumb" className="text-sm text-ink-600">
                            <ol className="flex flex-wrap items-center gap-1.5">
                                <li><Link to="/" className="hover:text-primary">Home</Link></li>
                                <li aria-hidden="true">/</li>
                                <li><Link to="/courses" className="hover:text-primary">Courses</Link></li>
                                <li aria-hidden="true">/</li>
                                <li aria-current="page" className="font-medium text-ink-900">{name}</li>
                            </ol>
                        </nav>

                        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Cohort</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <h1 className="text-4xl text-ink-900 sm:text-5xl">{name}</h1>
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', phase.className)}>
                                <phase.icon className="size-3.5" aria-hidden="true" />
                                {phase.label}
                            </span>
                        </div>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-ink-600">
                            A {weeks}-week intake running {formatDate(cohort.start_date, { day: 'numeric', month: 'long' })} to{' '}
                            {formatDate(cohort.end_date)}. Learn alongside a small group with mentor support throughout.
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Fact icon={CalendarDays} label="Starts" value={formatDate(cohort.start_date, shortDate)} />
                            <Fact icon={CalendarRange} label="Duration" value={`${weeks} week${weeks === 1 ? '' : 's'}`} note={`Ends ${formatDate(cohort.end_date, shortDate)}`} />
                            <Fact
                                icon={Clock}
                                label="Apply by"
                                value={cohort.application_deadline ? formatDate(cohort.application_deadline, shortDate) : 'Rolling'}
                                note={
                                    deadlineDays === null ? 'While seats last'
                                        : deadlineDays < 0 ? 'Deadline passed'
                                            : deadlineDays === 0 ? 'Closes today'
                                                : `${deadlineDays} day${deadlineDays === 1 ? '' : 's'} left`
                                }
                            />
                            <Fact icon={BookOpen} label="Courses" value={String(courses.length)} note="Choose one to apply for" />
                        </div>
                    </div>
                </section>

                {/* Body */}
                <div className="px-4 py-10 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_300px]">
                        <section aria-labelledby="cohort-courses-heading">
                            <h2 id="cohort-courses-heading" className="text-2xl text-ink-900">Courses in this cohort</h2>
                            <p className="mt-1 text-sm text-ink-600">
                                Choose the course you&apos;d like to join — each has its own seats, price and instructor.
                            </p>

                            <div className="mt-6 space-y-4">
                                {courses.length === 0 ? (
                                    <EmptyState
                                        icon={BookOpen}
                                        title="No courses yet"
                                        description="Courses for this cohort will appear here once they're announced."
                                    />
                                ) : (
                                    courses.map((cohortCourse) => <CohortCourseCard key={cohortCourse.id} cohortCourse={cohortCourse} />)
                                )}
                            </div>
                        </section>

                        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-2xl border border-border bg-surface-0 p-5 shadow-sm">
                                <h2 className="text-lg text-ink-900">Key dates</h2>
                                <KeyDates cohort={cohort} />
                            </div>

                            <div className="rounded-2xl border border-border bg-surface-0 p-5 shadow-sm">
                                <h2 className="text-lg text-ink-900">How joining works</h2>
                                <ol className="mt-4 space-y-4">
                                    {JOIN_STEPS.map(({ icon: Icon, title, body }, i) => (
                                        <li key={title} className="flex gap-3">
                                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
                                                <Icon className="size-4" aria-hidden="true" />
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-ink-900">
                                                    <span className="sr-only">Step {i + 1}: </span>{title}
                                                </p>
                                                <p className="mt-0.5 text-xs leading-5 text-ink-600">{body}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                                <Link
                                    to="/contact"
                                    className="mt-5 flex items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:bg-surface-50"
                                >
                                    <MessageCircle className="size-4 text-primary" aria-hidden="true" />
                                    Questions? Talk to us
                                </Link>
                            </div>
                        </aside>
                </div>
                </div>
            </main>

            <Footer onLoginClick={() => openAuth('login')} onSignupClick={() => openAuth('signup')} />
        </div>
    );
}
