import { useState } from 'react';
import { Link } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import {
    ArrowRight,
    Award,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    GraduationCap,
    MessageSquare,
    PlayCircle,
    Sparkles,
    Receipt,
    TriangleAlert,
    Wallet,
} from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMyEnrolments } from '@/features/enrolment/useEnrolments';
import { useMyCertificates, useProgressDashboard } from '@/features/progress/useProgress';
import { fetchCourse } from '@/features/catalogue/api';
import { useAllCourses } from '@/features/catalogue/useCourses';
import { courseImageMap } from '@/features/catalogue/courseImages';
import { courseProgressStatusDisplay } from '@/lib/statusBadge';
import { financeTotals, formatMoney, paidCourseOrders, payableEnrolments } from '@/lib/finance';
import { MakePaymentModal } from '@/features/enrolment/MakePaymentModal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatDate } from '@/lib/formatDate';
import { cn } from '@/lib/utils';
import type { CourseProgressStatus, User } from '@/lib/api/types';

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

/** In-progress first, then not started, then upcoming intakes, then finished courses. */
const COURSE_ORDER: Record<CourseProgressStatus, number> = { in_progress: 0, not_started: 1, upcoming: 2, completed: 3 };

function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn('overflow-hidden rounded-2xl border border-surface-100 bg-surface-0 shadow-sm', className)}>
            <div className="flex items-center justify-between gap-3 border-b border-surface-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function SeeAll({ to, label = 'See all' }: { to: string; label?: string }) {
    return (
        <Link to={to} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
            {label} <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
    );
}

/**
 * Student home — a snapshot of everything in the portal: welcome, money, courses (with progress),
 * and the people teaching them. Data comes from existing endpoints only:
 * enrolments (with orders), the progress dashboard, certificates, and each enrolled
 * course's details (for its instructors).
 */
export function StudentDashboardPage() {
    const { user } = useAuth();
    const { data: enrolmentsPage, isLoading: loadingEnrolments } = useMyEnrolments();
    const { data: progressRows } = useProgressDashboard();
    const { data: certificates } = useMyCertificates();

    const enrolments = (enrolmentsPage?.data ?? []).filter((e) => e.status !== 'withdrawn' && e.status !== 'transferred');
    const progressByCourse = new Map((progressRows ?? []).map((r) => [r.course.id, r]));

    // Instructors aren't on the enrolment payload; the course details endpoint has them.
    const courseDetails = useQueries({
        queries: enrolments.map((e) => ({ queryKey: ['courses', e.course.id], queryFn: () => fetchCourse(e.course.id) })),
    });
    const loadingInstructors = courseDetails.some((q) => q.isLoading);
    const instructors = new Map<number, { person: User; courses: string[] }>();
    courseDetails.forEach((q) => {
        q.data?.instructors.forEach((person) => {
            const entry = instructors.get(person.id) ?? { person, courses: [] };
            if (!entry.courses.includes(q.data!.title)) entry.courses.push(q.data!.title);
            instructors.set(person.id, entry);
        });
    });

    const courses = enrolments
        .map((e) => ({ enrolment: e, progress: progressByCourse.get(e.course.id) }))
        .sort((a, b) => COURSE_ORDER[a.progress?.status ?? 'not_started'] - COURSE_ORDER[b.progress?.status ?? 'not_started']);
    const inProgress = courses.filter((c) => c.progress?.status === 'in_progress' || c.progress?.status === 'not_started');
    const completedCount = courses.filter((c) => c.progress?.status === 'completed').length;
    const nextCourse = inProgress[0];

    // Recommended: published courses the student isn't in — same category first, then the next
    // level up from what they're taking, then the rest.
    const { data: catalogue } = useAllCourses();
    const enrolledIds = new Set(enrolments.map((e) => e.course.id));
    const enrolledCategories = new Set(enrolments.map((e) => e.course.category?.id).filter(Boolean));
    const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
    const highestLevel = Math.max(-1, ...enrolments.map((e) => LEVEL_RANK[e.course.level] ?? 0));
    const recommended = (catalogue ?? [])
        .filter((c) => c.status === 'published' && !enrolledIds.has(c.id))
        .map((c) => {
            const sameCategory = c.category ? enrolledCategories.has(c.category.id) : false;
            const nextLevel = (LEVEL_RANK[c.level] ?? 0) === highestLevel + 1;
            return { course: c, score: (sameCategory ? 2 : 0) + (nextLevel ? 1 : 0), sameCategory, nextLevel };
        })
        .sort((a, b) => b.score - a.score || a.course.title.localeCompare(b.course.title))
        .slice(0, 3);
    // One grid holds both: up to 4 enrolled cards, then 2–3 suggestions so the rows come out even.
    const shownCourses = courses.slice(0, 4);
    const shownRecommended = recommended.slice(0, shownCourses.length % 2 === 0 ? 2 : 3);

    const [isPaying, setIsPaying] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
    const payable = payableEnrolments(enrolments);

    const orders = paidCourseOrders(enrolments);
    const finance = financeTotals(orders);
    const unpaidCourses = orders.filter((o) => o.remaining_balance > 0 && o.currency === finance?.currency).length;
    const paidPercent = finance && finance.total > 0 ? Math.round((finance.paid / finance.total) * 100) : 0;
    const hasPendingPayment = enrolments.some((e) => e.order?.pending_submission);
    const certificateCount = certificates?.length ?? 0;

    const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there';
    const today = new Date();

    return (
        <PageFrame title="Dashboard" subtitle="Your learning at a glance">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:items-start">
                {/* ═══ Main column ═══ */}
                <div className="space-y-5 xl:col-span-2">
                    {/* Welcome banner */}
                    <section className="relative overflow-hidden rounded-2xl bg-navy px-6 py-6 text-white shadow-sm sm:px-8">
                        <div className="relative flex items-center justify-between gap-6">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-navy-foreground/50">
                                    {WEEKDAY.format(today)}, {formatDate(today)}
                                </p>
                                <h1 className="mt-2 font-display text-2xl font-semibold text-navy-foreground sm:text-3xl">Welcome back, {firstName}!</h1>
                                <p className="mt-1 text-sm text-navy-foreground/70">
                                    {nextCourse
                                        ? `Pick up where you left off in ${nextCourse.enrolment.course.title}.`
                                        : enrolments.length > 0
                                            ? "You're all caught up — great work."
                                            : 'Always stay updated in your student portal.'}
                                </p>
                                {nextCourse && (
                                    <Link
                                        to={`/learn/courses/${nextCourse.enrolment.course.id}`}
                                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
                                    >
                                        <PlayCircle className="size-4" aria-hidden="true" />
                                        Continue learning
                                    </Link>
                                )}
                            </div>
                            <img
                                src="/images/online_study.jpg"
                                alt=""
                                className="hidden h-32 w-48 shrink-0 rounded-xl object-cover opacity-80 ring-4 ring-white/10 md:block lg:h-36 lg:w-56"
                            />
                        </div>
                    </section>

                    {paymentMessage && <Alert variant="success" message={paymentMessage} onDismiss={() => setPaymentMessage(null)} />}

                    {/* Quick stats strip */}
                    {enrolments.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Enrolled', value: enrolments.length, color: 'text-primary', bg: 'bg-blue-50' },
                                { label: 'Completed', value: completedCount, color: 'text-success-600', bg: 'bg-surface-50' },
                                { label: 'Certificates', value: certificateCount, color: 'text-accent-amber', bg: 'bg-surface-50' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className={`flex flex-col gap-1 rounded-2xl border border-border ${bg} px-4 py-4`}>
                                    <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                                    <p className="text-xs text-ink-600">{label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Your courses — enrolled cards (progress + next step), then recommended ones in the same grid */}
                    <section>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold text-ink-900">Your courses</h2>
                            <div className="flex items-center gap-4">
                                {courses.length > 0 && <SeeAll to="/my-courses" label="My courses" />}
                                <SeeAll to="/#courses" label="Browse catalogue" />
                            </div>
                        </div>
                        {loadingEnrolments ? (
                            <div className="flex justify-center py-8"><Spinner /></div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {courses.length === 0 && (
                                    <div className="rounded-2xl border border-surface-100 bg-surface-0 px-5 py-8 text-center shadow-sm sm:col-span-2">
                                        <GraduationCap className="mx-auto size-8 text-ink-300" aria-hidden="true" />
                                        <p className="mt-2 text-sm font-medium text-ink-900">You haven&apos;t enrolled in any courses yet</p>
                                        <p className="text-xs text-ink-600">Courses you enrol in will appear here.</p>
                                    </div>
                                )}

                                {shownCourses.map(({ enrolment, progress }) => {
                                    const course = enrolment.course;
                                    const image = course.thumbnail_url ?? courseImageMap[course.slug];
                                    const percent = Math.round(progress?.percent_complete ?? 0);
                                    const status = progress ? courseProgressStatusDisplay(progress.status) : null;
                                    const upcoming = progress?.status === 'upcoming' && progress.starts_on;
                                    const done = progress?.status === 'completed';
                                    return (
                                        <article key={enrolment.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
                                            <Link to={`/learn/courses/${course.id}`} className="relative block h-32 overflow-hidden bg-blue-50">
                                                {image ? (
                                                    <img src={image} alt="" className="size-full object-cover transition duration-300 hover:scale-105" />
                                                ) : (
                                                    <span className="flex size-full items-center justify-center font-display text-3xl text-blue-700">
                                                        {course.title.charAt(0)}
                                                    </span>
                                                )}
                                                {status && (
                                                    <span className="absolute left-3 top-3">
                                                        <Badge label={status.label} tone={status.tone} icon={status.icon} className="bg-surface-0/95 shadow-sm" />
                                                    </span>
                                                )}
                                            </Link>
                                            <div className="flex flex-1 flex-col gap-3 p-4">
                                                <div>
                                                    <h3 className="line-clamp-1 text-sm font-semibold text-ink-900">{course.title}</h3>
                                                    <p className="text-xs text-ink-600">{course.category?.name ?? 'Course'}</p>
                                                </div>
                                                <div>
                                                    <div className="mb-1 flex items-center justify-between text-xs">
                                                        <span className="text-ink-600">Progress</span>
                                                        <span className="font-semibold text-ink-900">{percent}%</span>
                                                    </div>
                                                    <ProgressBar percent={percent} />
                                                </div>
                                                {upcoming ? (
                                                    <p className="mt-auto flex items-center gap-1.5 text-xs text-ink-600">
                                                        <CalendarClock className="size-3.5" aria-hidden="true" />
                                                        Starts {formatDate(progress!.starts_on!)}
                                                    </p>
                                                ) : (
                                                    <Link
                                                        to={`/learn/courses/${course.id}`}
                                                        className={cn(
                                                            'mt-auto inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors active:scale-95',
                                                            done
                                                                ? 'border border-primary text-primary hover:bg-blue-50'
                                                                : 'bg-primary text-white shadow-sm hover:bg-blue-700',
                                                        )}
                                                    >
                                                        {done ? 'Review course' : percent === 0 ? 'Start course' : 'Continue'}
                                                        <ArrowRight className="size-4" aria-hidden="true" />
                                                    </Link>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}

                                {/* Recommended — same card shape, marked as a suggestion; fills the grid to even rows */}
                                {shownRecommended.map(({ course, sameCategory, nextLevel }) => {
                                    const image = course.thumbnail_url ?? courseImageMap[course.slug];
                                    const price = Number(course.price) === 0 ? 'Free' : formatMoney(course.price, course.currency);
                                    const reason = nextLevel && sameCategory
                                        ? `Your next step in ${course.category?.name}`
                                        : sameCategory
                                            ? `More ${course.category?.name}`
                                            : nextLevel
                                                ? 'A good next level'
                                                : 'Popular with students';
                                    return (
                                        <article
                                            key={`rec-${course.id}`}
                                            className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-50 shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <Link to={`/courses/${course.id}`} className="group relative block h-32 overflow-hidden bg-blue-50">
                                                {image ? (
                                                    <img src={image} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" />
                                                ) : (
                                                    <span className="flex size-full items-center justify-center font-display text-3xl text-blue-700">
                                                        {course.title.charAt(0)}
                                                    </span>
                                                )}
                                                <span className="absolute left-3 top-3">
                                                    <Badge label="Recommended" tone="info" icon={Sparkles} className="bg-surface-0/95 shadow-sm" />
                                                </span>
                                            </Link>
                                            <div className="flex flex-1 flex-col gap-3 p-4">
                                                <div>
                                                    <h3 className="line-clamp-1 text-sm font-semibold text-ink-900">{course.title}</h3>
                                                    <p className="text-xs text-blue-700">{reason}</p>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-ink-600">
                                                    <span className="capitalize">{course.level}</span>
                                                    <span className="font-semibold text-ink-900">{price}</span>
                                                </div>
                                                <Link
                                                    to={`/courses/${course.id}`}
                                                    className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:border-primary hover:text-primary"
                                                >
                                                    View course
                                                    <ArrowRight className="size-4" aria-hidden="true" />
                                                </Link>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                {/* ═══ Right rail ═══ */}
                <aside className="space-y-5">
                    {/* Profile */}
                    <section className="rounded-2xl border border-surface-100 bg-surface-0 p-5 text-center shadow-sm">
                        <Avatar name={user?.name ?? ''} src={user?.avatar_url} size="lg" className="mx-auto size-16 text-lg" />
                        <p className="mt-3 truncate text-sm font-semibold text-ink-900">{user?.name}</p>
                        <p className="truncate text-xs text-ink-600">{user?.email}</p>
                        <dl className="mt-4 grid grid-cols-3 gap-2">
                            {[
                                { label: 'Enrolled', value: enrolments.length },
                                { label: 'Completed', value: completedCount },
                                { label: 'Certificates', value: certificateCount },
                            ].map(({ label, value }) => (
                                <div key={label} className="rounded-xl border border-border bg-surface-50 px-2 py-2.5">
                                    <dd className="text-lg font-bold tabular-nums text-primary">{value}</dd>
                                    <dt className="text-[11px] text-ink-600">{label}</dt>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {/* Finances — its own card: paid, outstanding, payable, and the payment button */}
                    <Panel title="Finances" action={<SeeAll to="/payments" label="History" />}>
                        {loadingEnrolments ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : finance ? (
                            <div className="p-5">
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="text-ink-600">Paid so far</span>
                                    <span className="font-semibold tabular-nums text-ink-900">{paidPercent}%</span>
                                </div>
                                <ProgressBar percent={paidPercent} className="h-1.5" />

                                <dl className="mt-4 space-y-2">
                                    <div className="flex items-center gap-3 rounded-xl bg-surface-50 px-3 py-2.5">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-0 text-success-600 shadow-sm">
                                            <Wallet className="size-4" aria-hidden="true" />
                                        </span>
                                        <dt className="flex-1 text-xs text-ink-600">Total paid</dt>
                                        <dd className="text-sm font-bold tabular-nums text-ink-900">{formatMoney(finance.paid, finance.currency)}</dd>
                                    </div>
                                    <div className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', finance.outstanding > 0 ? 'bg-amber-100' : 'bg-surface-50')}>
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-0 shadow-sm',
                                                finance.outstanding > 0 ? 'text-accent-amber' : 'text-success-600',
                                            )}
                                        >
                                            {finance.outstanding > 0 ? <TriangleAlert className="size-4" aria-hidden="true" /> : <CheckCircle2 className="size-4" aria-hidden="true" />}
                                        </span>
                                        <dt className="flex-1 text-xs text-ink-600">
                                            Outstanding
                                            {finance.outstanding > 0 && <span className="block text-[11px]">{plural(unpaidCourses, 'course')}</span>}
                                        </dt>
                                        <dd className={cn('text-sm font-bold tabular-nums', finance.outstanding > 0 ? 'text-accent-amber' : 'text-ink-900')}>
                                            {formatMoney(finance.outstanding, finance.currency)}
                                        </dd>
                                    </div>
                                    <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-2.5">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-0 text-blue-600 shadow-sm">
                                            <Receipt className="size-4" aria-hidden="true" />
                                        </span>
                                        <dt className="flex-1 text-xs text-ink-600">Total payable</dt>
                                        <dd className="text-sm font-bold tabular-nums text-blue-700">{formatMoney(finance.total, finance.currency)}</dd>
                                    </div>
                                </dl>

                                {/* The same "Make a payment" window as My courses, opened right here. */}
                                <Button className="mt-4 w-full" onClick={() => setIsPaying(true)} disabled={payable.length === 0}>
                                    <CreditCard className="size-4" aria-hidden="true" />
                                    Make a payment
                                </Button>
                                {payable.length === 0 && (
                                    <p className="mt-2 text-center text-xs text-ink-600">
                                        {hasPendingPayment ? 'A payment is awaiting confirmation.' : 'All paid up — nothing to pay right now.'}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="px-5 py-4 text-sm text-ink-600">Your courses are free — there&apos;s nothing to pay.</p>
                        )}
                    </Panel>

                    {/* Course instructors */}
                    <Panel title="Course instructors">
                        {loadingInstructors && instructors.size === 0 ? (
                            <div className="flex justify-center py-5"><Spinner /></div>
                        ) : instructors.size === 0 ? (
                            <p className="px-5 py-4 text-sm text-ink-600">
                                {enrolments.length === 0 ? 'Your instructors appear once you enrol.' : 'Instructors appear here once assigned.'}
                            </p>
                        ) : (
                            <ul className="divide-y divide-surface-100">
                                {[...instructors.values()].map(({ person, courses: taught }) => (
                                    <li key={person.id} className="flex items-center gap-3 px-5 py-3">
                                        <Avatar name={person.name} src={person.avatar_url} size="sm" className="size-10 shrink-0 text-sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-ink-900">{person.name}</p>
                                            <p className="truncate text-xs text-ink-600">{taught.join(' · ')}</p>
                                        </div>
                                        <Link
                                            to="/messages"
                                            aria-label={`Message ${person.name}`}
                                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50"
                                        >
                                            <MessageSquare className="size-4" aria-hidden="true" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    {/* Certificates */}
                    {certificateCount > 0 && (
                        <Link
                            to="/certificates"
                            className="group flex items-center gap-3 rounded-2xl border border-surface-100 bg-surface-0 p-4 shadow-sm transition-colors hover:border-blue-100 hover:bg-blue-50"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Award className="size-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-ink-900">{plural(certificateCount, 'certificate')} earned</span>
                                <span className="block truncate text-xs text-ink-600">{certificates!.map((c) => c.course.title).join(' · ')}</span>
                            </span>
                            <ArrowRight className="size-4 shrink-0 text-blue-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </Link>
                    )}

                    {enrolments.length === 0 && !loadingEnrolments && (
                        <Link to="/#courses" className="flex items-center gap-2 px-1 text-xs font-medium text-blue-600 hover:underline">
                            <BookOpen className="size-3.5" aria-hidden="true" />
                            Browse the catalogue to find a course
                        </Link>
                    )}
                </aside>
            </div>

            {isPaying && payable.length > 0 && (
                <MakePaymentModal
                    enrolments={payable}
                    onClose={() => setIsPaying(false)}
                    onSubmitted={() => setPaymentMessage("Payment submitted — we'll notify you once an admin confirms it.")}
                />
            )}
        </PageFrame>
    );
}
