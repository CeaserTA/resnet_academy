import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
    ArrowRight,
    Award,
    BookOpen,
    CalendarClock,
    CheckCircle2,
    Clock,
    CreditCard,
    GraduationCap,
    MessageSquare,
    PencilLine,
    PlayCircle,
    Sparkles,
    XCircle,
} from 'lucide-react';
import { PageFrame } from '@/components/layout/PageFrame';
import { DashboardPanel, SectionLabel, ViewAllLink } from '@/components/dashboard/DashboardPanel';
import { VolumeCard } from '@/components/dashboard/VolumeCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMyEnrolments } from '@/features/enrolment/useEnrolments';
import { ApplicationStatusCard } from '@/features/enrolment/ApplicationStatusCard';
import { MakePaymentModal } from '@/features/enrolment/MakePaymentModal';
import { useDismissCourseApplication, useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { useMyCertificates, useProgressDashboard } from '@/features/progress/useProgress';
import { CertificateViewerModal } from '@/features/certificates/CertificateViewerModal';
import { useMyReviews } from '@/features/reviews/useReviews';
import { ReviewFormModal } from '@/features/reviews/ReviewFormModal';
import { ReviewStatus } from '@/features/reviews/ReviewStatus';
import { fetchCourse } from '@/features/catalogue/api';
import { useAllCourses } from '@/features/catalogue/useCourses';
import { courseImageMap } from '@/features/catalogue/courseImages';
import { courseProgressStatusDisplay } from '@/lib/statusBadge';
import { financeTotals, formatMoney, latestPaymentUpdates, paidCourseOrders, payableEnrolments } from '@/lib/finance';
import { formatDate } from '@/lib/formatDate';
import { cn } from '@/lib/utils';
import { profileApi } from '@/lib/api/profileApi';
import { GettingStartedChecklist, type ChecklistStep } from '@/features/dashboard/GettingStartedChecklist';
import type { CourseProgressStatus, User } from '@/lib/api/types';

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? '' : 's'}`;
}

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });

/** In-progress first, then not started, then upcoming intakes, then finished courses. */
const COURSE_ORDER: Record<CourseProgressStatus, number> = { in_progress: 0, not_started: 1, upcoming: 2, completed: 3 };

/**
 * Student home — the whole journey in one place: applications waiting for a decision, courses
 * (start → continue → certificate → review), money owed, and the people teaching them. Built from
 * the same panels, section labels and stat cards as the instructor and admin dashboards.
 * Data comes from existing endpoints only: enrolments (with orders), applications, the progress
 * dashboard, certificates, reviews, and each enrolled course's details (for its instructors).
 */
export function StudentDashboardPage() {
    const { user } = useAuth();
    const { data: enrolmentsPage, isLoading: loadingEnrolments } = useMyEnrolments();
    const { data: progressRows } = useProgressDashboard();
    const { data: certificates } = useMyCertificates();
    const { data: applications } = useMyCourseApplications();
    const dismissApplication = useDismissCourseApplication();
    const { data: myReviews, isSuccess: reviewsLoaded } = useMyReviews();

    const enrolments = (enrolmentsPage?.data ?? []).filter((e) => e.status !== 'withdrawn' && e.status !== 'transferred');
    const progressByCourse = new Map((progressRows ?? []).map((r) => [r.course.id, r]));
    const reviewByCourse = new Map((myReviews ?? []).flatMap((r) => (r.course ? [[r.course.id, r] as const] : [])));

    // Approved applications become enrolments, so only pending and declined ones are shown, newest first.
    const openApplications = (applications ?? [])
        .filter((a) => a.status !== 'approved')
        .sort((a, b) => b.applied_at.localeCompare(a.applied_at));
    const pendingApplications = openApplications.filter((a) => a.status === 'pending').length;

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
    // The module to pick up: one already started, else the first open one not yet begun.
    const nextModules = [...(nextCourse?.progress?.modules ?? [])].sort((a, b) => a.order_index - b.order_index);
    const startedIndex = nextModules.findIndex((m) => m.status === 'in_progress');
    const nextModuleIndex = startedIndex >= 0 ? startedIndex : nextModules.findIndex((m) => m.status === 'not_started');
    const nextModule = nextModules[nextModuleIndex];

    // Recommended: published courses the student isn't in — same category first, then the next
    // level up from what they're taking, then the rest.
    const { data: catalogue } = useAllCourses();
    const enrolledIds = new Set(enrolments.map((e) => e.course.id));
    const appliedIds = new Set(openApplications.map((a) => a.course.id));
    const enrolledCategories = new Set(enrolments.map((e) => e.course.category?.id).filter(Boolean));
    const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
    const highestLevel = Math.max(-1, ...enrolments.map((e) => LEVEL_RANK[e.course.level] ?? 0));
    const recommended = (catalogue ?? [])
        .filter((c) => c.status === 'published' && !enrolledIds.has(c.id) && !appliedIds.has(c.id))
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

    // Arriving from the email's verification link (/dashboard?verified=1).
    const [searchParams, setSearchParams] = useSearchParams();
    const justVerified = searchParams.get('verified') === '1';

    const [isPaying, setIsPaying] = useState(false);
    const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
    const [reviewingCourse, setReviewingCourse] = useState<{ id: number; title: string } | null>(null);
    const [viewingCertificate, setViewingCertificate] = useState<{ id: number; certificate_number: string; course: { title: string } } | null>(null);
    const payable = payableEnrolments(enrolments);

    const orders = paidCourseOrders(enrolments);
    const finance = financeTotals(orders);
    const unpaidCourses = orders.filter((o) => o.remaining_balance > 0 && o.currency === finance?.currency).length;
    const paidPercent = finance && finance.total > 0 ? Math.round((finance.paid / finance.total) * 100) : 0;
    const hasPendingPayment = enrolments.some((e) => e.order?.pending_submission);
    const paymentUpdates = latestPaymentUpdates(enrolments).slice(0, 3);
    const certificateCount = certificates?.length ?? 0;

    // Getting started: sign-up → first lesson, in order. Steps after "choose a course" only
    // count as done once there is an enrolment to do them in.
    const { data: profileStatus } = useQuery({ queryKey: ['profile', 'status'], queryFn: profileApi.getStatus });
    const hasStarted = courses.some((c) => (c.progress?.percent_complete ?? 0) > 0 || c.progress?.status === 'completed');
    const checklist: ChecklistStep[] = [
        {
            label: 'Verify your email',
            done: Boolean(user?.email_verified_at),
            action: { label: 'Verify', to: '/verify-email' },
        },
        {
            label: 'Complete your profile',
            hint: profileStatus ? `${profileStatus.percentage}% complete` : undefined,
            done: (profileStatus?.percentage ?? 0) >= 100,
            action: { label: 'Complete', to: '/profile/complete' },
        },
        {
            label: 'Choose a course',
            hint: pendingApplications > 0 ? 'Your application is in review' : undefined,
            done: enrolments.length > 0,
            action: pendingApplications > 0 ? undefined : { label: 'Browse', to: '/#courses' },
        },
        {
            label: 'Pay your fees',
            hint: hasPendingPayment ? 'A payment is awaiting confirmation' : finance && finance.outstanding > 0 ? `${formatMoney(finance.outstanding, finance.currency)} outstanding` : undefined,
            done: enrolments.length > 0 && (!finance || finance.outstanding === 0),
            action: payable.length > 0 ? { label: 'Pay now', onClick: () => setIsPaying(true) } : undefined,
        },
        {
            label: 'Start your first lesson',
            done: hasStarted,
            action: nextCourse ? { label: 'Start', to: `/learn/courses/${nextCourse.enrolment.course.id}` } : undefined,
        },
    ];

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
                                            : pendingApplications > 0
                                                ? "Your application is in review — we'll notify you once it's decided."
                                                : 'Find a course below to start learning.'}
                                </p>
                                {nextModule && (
                                    <p className="mt-3 flex items-center gap-2 text-xs text-navy-foreground/70">
                                        <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold tabular-nums text-navy-foreground">
                                            Module {nextModuleIndex + 1} of {nextModules.length}
                                        </span>
                                        <span className="truncate">Next up: {nextModule.module_title}</span>
                                    </p>
                                )}
                                {nextCourse && (
                                    <Button asChild className="mt-4">
                                        <Link to={`/learn/courses/${nextCourse.enrolment.course.id}`}>
                                            <PlayCircle className="size-4" aria-hidden="true" />
                                            Continue learning
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            <img
                                src="/images/online_study.jpg"
                                alt=""
                                className="hidden h-32 w-48 shrink-0 rounded-xl object-cover opacity-80 ring-4 ring-white/10 md:block lg:h-36 lg:w-56"
                            />
                        </div>
                    </section>

                    {!loadingEnrolments && profileStatus && <GettingStartedChecklist steps={checklist} />}

                    {justVerified && (
                        <Alert
                            variant="success"
                            message="Your email is verified — welcome aboard!"
                            onDismiss={() => setSearchParams({}, { replace: true })}
                        />
                    )}

                    {paymentMessage && <Alert variant="success" message={paymentMessage} onDismiss={() => setPaymentMessage(null)} />}

                    {/* Applications — pending or declined; approved ones show up as courses below */}
                    {openApplications.length > 0 && (
                        <section>
                            <SectionLabel action={<ViewAllLink to="/my-courses" label="My courses" />}>Applications</SectionLabel>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {openApplications.map((application) => (
                                    <ApplicationStatusCard
                                        key={application.id}
                                        application={application}
                                        onDismiss={() => dismissApplication.mutate(application.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Your learning — same stat cards as My courses and the staff dashboards */}
                    {enrolments.length > 0 && (
                        <section>
                            <SectionLabel>Your learning</SectionLabel>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                <VolumeCard icon={BookOpen} label="Enrolled" value={enrolments.length} sub={`${inProgress.length} in progress`} />
                                <VolumeCard icon={CheckCircle2} label="Completed" value={completedCount} sub={`of ${plural(enrolments.length, 'course')}`} />
                                <VolumeCard
                                    icon={Award}
                                    label="Certificates"
                                    value={certificateCount}
                                    sub={certificateCount === 0 ? 'Finish a course to earn one' : 'Ready to download'}
                                />
                            </div>
                        </section>
                    )}

                    {/* Your courses — enrolled cards (progress + next step), then recommended ones in the same grid */}
                    <section>
                        <SectionLabel
                            action={
                                <>
                                    {courses.length > 0 && <ViewAllLink to="/my-courses" label="My courses" />}
                                    <ViewAllLink to="/#courses" label="Browse catalogue" />
                                </>
                            }
                        >
                            Your courses
                        </SectionLabel>
                        {loadingEnrolments ? (
                            <div className="flex justify-center py-8"><Spinner /></div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {courses.length === 0 && openApplications.length === 0 && (
                                    <div className="rounded-xl border border-surface-100 bg-surface-0 shadow-sm sm:col-span-2">
                                        <EmptyState
                                            icon={GraduationCap}
                                            title="You haven't enrolled in any courses yet"
                                            description="Pick a course below or browse the catalogue — it will appear here once you enrol."
                                        />
                                    </div>
                                )}

                                {shownCourses.map(({ enrolment, progress }) => {
                                    const course = enrolment.course;
                                    const image = course.thumbnail_url ?? courseImageMap[course.slug];
                                    const percent = Math.round(progress?.percent_complete ?? 0);
                                    const status = progress ? courseProgressStatusDisplay(progress.status) : null;
                                    const upcoming = progress?.status === 'upcoming' && progress.starts_on;
                                    const done = progress?.status === 'completed';
                                    const certificate = progress?.certificate;
                                    return (
                                        <article key={enrolment.id} className="flex flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-0 shadow-sm transition-shadow hover:shadow-md">
                                            <Link to={`/learn/courses/${course.id}`} className="group relative block h-28 sm:h-32 overflow-hidden bg-blue-50">
                                                {image ? (
                                                    <img src={image} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" />
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
                                                ) : done && certificate ? (
                                                    // Finished: the certificate is the next step (viewer has Download), then a review.
                                                    <div className="mt-auto space-y-2.5">
                                                        <Button
                                                            className="w-full"
                                                            onClick={() => setViewingCertificate({ ...certificate, course: { title: course.title } })}
                                                        >
                                                            <Award className="size-4" aria-hidden="true" />
                                                            View certificate
                                                        </Button>
                                                        <ReviewStatus
                                                            review={reviewByCourse.get(course.id)}
                                                            isLoaded={reviewsLoaded}
                                                            onReview={() => setReviewingCourse({ id: course.id, title: course.title })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <Button asChild variant={done ? 'secondary' : 'primary'} className="mt-auto w-full">
                                                        <Link to={`/learn/courses/${course.id}`}>
                                                            {done ? 'Review course' : percent === 0 ? 'Start course' : 'Continue'}
                                                            <ArrowRight className="size-4" aria-hidden="true" />
                                                        </Link>
                                                    </Button>
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
                                            className="flex flex-col overflow-hidden rounded-xl border border-surface-100 bg-surface-50 shadow-sm transition-shadow hover:shadow-md"
                                        >
                                            <Link to={`/courses/${course.id}`} className="group relative block h-28 sm:h-32 overflow-hidden bg-blue-50">
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
                                                <Button asChild variant="outline" className="mt-auto w-full">
                                                    <Link to={`/courses/${course.id}`}>
                                                        View course
                                                        <ArrowRight className="size-4" aria-hidden="true" />
                                                    </Link>
                                                </Button>
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
                    {/* Profile — who's signed in; the numbers live in "Your learning" */}
                    <section className="rounded-xl border border-surface-100 bg-surface-0 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Avatar name={user?.name ?? ''} src={user?.avatar_url} size="lg" className="size-12 shrink-0 text-base" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink-900">{user?.name}</p>
                                <p className="truncate text-xs text-ink-600">{user?.email}</p>
                            </div>
                            <Link
                                to="/profile/edit"
                                aria-label="Edit profile"
                                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50"
                            >
                                <PencilLine className="size-4" aria-hidden="true" />
                            </Link>
                        </div>
                    </section>

                    {/* Finances — what's still owed leads; paid/total is the supporting detail */}
                    <DashboardPanel title="Finances" action={<ViewAllLink to="/payments" label="History" />}>
                        {loadingEnrolments ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : finance ? (
                            <div className="space-y-4 p-4">
                                {finance.outstanding > 0 ? (
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-widest text-ink-600">Outstanding</p>
                                        <p className="mt-1 text-2xl font-bold tabular-nums text-accent-amber">
                                            {formatMoney(finance.outstanding, finance.currency)}
                                        </p>
                                        <p className="text-xs text-ink-600">Across {plural(unpaidCourses, 'course')}</p>
                                    </div>
                                ) : (
                                    <p className="flex items-center gap-2 text-sm font-semibold text-success-600">
                                        <CheckCircle2 className="size-4" aria-hidden="true" />
                                        All paid up
                                    </p>
                                )}

                                <div>
                                    <ProgressBar percent={paidPercent} className="h-1.5" />
                                    <p className="mt-1.5 text-xs text-ink-600">
                                        <span className="font-semibold tabular-nums text-ink-900">{formatMoney(finance.paid, finance.currency)}</span>
                                        {' '}paid of {formatMoney(finance.total, finance.currency)}
                                    </p>
                                </div>

                                {hasPendingPayment && (
                                    <p className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                                        <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                                        A payment is awaiting confirmation — we&apos;ll notify you once it&apos;s confirmed.
                                    </p>
                                )}

                                {/* What happened to their last payments — accepted, or not accepted and why */}
                                {paymentUpdates.length > 0 && (
                                    <ul className="space-y-2">
                                        {paymentUpdates.map(({ courseTitle, submission, currency }) => (
                                            <li
                                                key={submission.id}
                                                className={cn(
                                                    'rounded-lg px-3 py-2 text-xs',
                                                    submission.status === 'rejected' ? 'bg-danger-600/5 text-danger-600' : 'bg-success-600/10 text-success-600',
                                                )}
                                            >
                                                <p className="flex items-center gap-1.5 font-semibold">
                                                    {submission.status === 'rejected' ? <XCircle className="size-3.5" aria-hidden="true" /> : <CheckCircle2 className="size-3.5" aria-hidden="true" />}
                                                    {formatMoney(submission.amount, currency)} {submission.status === 'rejected' ? 'not accepted' : 'confirmed'}
                                                </p>
                                                <p className="mt-0.5 truncate text-ink-600">{courseTitle}</p>
                                                {submission.status === 'rejected' && submission.rejection_reason && (
                                                    <p className="mt-1 text-ink-900">Reason: {submission.rejection_reason}</p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* The same "Make a payment" window as My courses, opened right here. */}
                                {payable.length > 0 && (
                                    <Button className="w-full" onClick={() => setIsPaying(true)}>
                                        <CreditCard className="size-4" aria-hidden="true" />
                                        Make a payment
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <p className="px-4 py-4 text-sm text-ink-600">Your courses are free — there&apos;s nothing to pay.</p>
                        )}
                    </DashboardPanel>

                    {/* Course instructors */}
                    <DashboardPanel title="Course instructors">
                        {loadingInstructors && instructors.size === 0 ? (
                            <div className="flex justify-center py-5"><Spinner /></div>
                        ) : instructors.size === 0 ? (
                            <p className="px-4 py-4 text-sm text-ink-600">
                                {enrolments.length === 0 ? 'Your instructors appear once you enrol.' : 'Instructors appear here once assigned.'}
                            </p>
                        ) : (
                            <ul className="divide-y divide-surface-100">
                                {[...instructors.values()].map(({ person, courses: taught }) => (
                                    <li key={person.id} className="flex items-center gap-3 px-4 py-3">
                                        <Avatar name={person.name} src={person.avatar_url} size="sm" className="size-9 shrink-0 text-sm" />
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
                    </DashboardPanel>
                </aside>
            </div>

            {isPaying && payable.length > 0 && (
                <MakePaymentModal
                    enrolments={payable}
                    onClose={() => setIsPaying(false)}
                    onSubmitted={() => setPaymentMessage("Payment submitted — we'll notify you once an admin confirms it.")}
                />
            )}
            <CertificateViewerModal certificate={viewingCertificate} onClose={() => setViewingCertificate(null)} />
            {reviewingCourse && (
                <ReviewFormModal
                    course={reviewingCourse}
                    existingReview={reviewByCourse.get(reviewingCourse.id)}
                    onClose={() => setReviewingCourse(null)}
                />
            )}
        </PageFrame>
    );
}
