import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, BookOpen, CircleCheck, Clock, GraduationCap, Lock, SignalHigh, Users } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useCourse } from '@/features/catalogue/useCourses';
import { useStudentSections } from '@/features/catalogue/useStudentSections';
import { SectionPicker } from '@/features/catalogue/SectionPicker';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEnrol } from '@/features/enrolment/useEnrolments';
import { useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { AdvisoryEnrolModal } from '@/features/catalogue/AdvisoryEnrolModal';
import { ApplicationModal } from '@/features/catalogue/ApplicationModal';
import { ApiError } from '@/lib/api/client';

// ─── Local image fallback map ────────────────────────────────────────────────
// Used when course.thumbnail_url is null (R2 upload not yet configured).
// TODO: remove once all courses have real uploaded thumbnails.
// NOTE: Remove entries here once a course has uploaded thumbnail_url in database.
const courseImageMap: Record<string, string> = {
    'web-foundations': '/images/web_foundations.jpg',
    'dynamic-web': '/images/dynamic_web.jpg',
    'full-stack': '/images/full_stack.jpg',
    // 'search-engine-optimization' removed - now uses uploaded thumbnail from database
    'progressive-web-app-development': '/images/PWA.jpg',
    'vuejs-and-laravel': '/images/VUE.JS_LARAVEL.jpg',
};

// ─── Placeholder modules ──────────────────────────────────────────────────────
// TODO: replace with real module fetch via useCourseModules(courseId) once
//       that endpoint is wired on the frontend. The layout is final.
const placeholderModules = [
    {
        id: 1,
        title: 'Module 1 — Foundations',
        description: 'Core concepts and environment setup to hit the ground running from day one.',
        lessons: 6,
        duration: '2 hrs',
    },
    {
        id: 2,
        title: 'Module 2 — Core Skills',
        description: 'Hands-on practice with the main tools and techniques covered in this course.',
        lessons: 8,
        duration: '3 hrs',
    },
    {
        id: 3,
        title: 'Module 3 — Real Project',
        description: 'Build, review, and deploy a complete project — the work you will show employers.',
        lessons: 6,
        duration: '3 hrs',
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    const { id } = useParams();
    const courseId = Number(id);
    const navigate = useNavigate();

    const { data: course, isLoading, isError } = useCourse(courseId);
    const { user } = useAuth();
    const enrol = useEnrol();
    const { data: myApplications } = useMyCourseApplications(user?.role === 'student');
    const { openSections, isLoading: sectionsLoading } = useStudentSections(courseId);
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [enrolError, setEnrolError] = useState<string | null>(null);
    const [enrolled, setEnrolled] = useState(false);
    const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);

    /* ── Loading ── */
    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    /* ── Error / not found ── */
    if (isError || !course) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <BookOpen className="size-12 text-[#e8ecf1]" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-ink-900">Course not found</h1>
                <p className="text-[#64748b]">That course doesn't exist or may have been removed.</p>
                <Link
                    to="/"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back to home
                </Link>
            </div>
        );
    }

    /* ── Resolved ── */
    const pendingApplication = myApplications?.find(
        (application) => application.course.id === course.id && application.status === 'pending',
    );

    // Section gating:
    // - While sectionsLoading, hasSections is unknown → keep CTA blocked
    // - Once loaded, block CTA only when there ARE open sections and none selected
    const hasSections = !sectionsLoading && openSections.length > 0;
    const ctaBlocked = sectionsLoading || (hasSections && selectedSectionId === null);

    const handleEnrol = async () => {
        if (!user) {
            navigate('/login', { state: { from: { pathname: `/courses/${course.id}` } } });
            return;
        }

        if (course.enrolment_policy === 'advisory') {
            setShowAdvisoryModal(true);
            return;
        }

        if (course.enrolment_policy === 'application') {
            setShowApplicationModal(true);
            return;
        }

        setEnrolError(null);

        try {
            await enrol.mutateAsync({ courseId: course.id, sectionId: selectedSectionId ?? undefined });
            setEnrolled(true);
        } catch (error) {
            setEnrolError(error instanceof ApiError ? error.message : 'Could not enrol. Try again.');
        }
    };

    const resolvedImage = course.thumbnail_url ?? courseImageMap[course.slug] ?? null;
    return (
        <div className="min-h-screen bg-[#fafbfc]">

            {/* ── Hero banner ── */}
            <div className="relative h-64 w-full overflow-hidden bg-[#dbeafe] sm:h-80 lg:h-96">
                {resolvedImage ? (
                    <img
                        src={resolvedImage}
                        alt={course.title}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-blue-300">
                        <BookOpen className="size-16" aria-hidden="true" />
                    </div>
                )}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

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
                        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
                            {course.title}
                        </h1>

                        {/* Description */}
                        {course.description && (
                            <p className="mt-4 text-base leading-7 text-[#475569]">
                                {course.description}
                            </p>
                        )}

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

                        {/* Quick stats */}
                        <div className="mt-5 flex flex-wrap gap-5 border-t border-[#e8ecf1] pt-5 text-sm text-[#64748b]">
                            <div className="flex items-center gap-1.5">
                                <SignalHigh className="size-4 text-blue-600" aria-hidden="true" />
                                <span>{levelLabel[course.level] ?? course.level} level</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="size-4 text-blue-600" aria-hidden="true" />
                                <span>{placeholderModules.length} modules</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Clock className="size-4 text-blue-600" aria-hidden="true" />
                                <span>Self-paced</span>
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

                        {/* Modules */}
                        <div className="mt-10">
                            <h2 className="text-xl font-bold text-ink-900">Course modules</h2>
                            <p className="mt-1 text-sm text-[#94a3b8]">
                                {placeholderModules.length} modules · content updates after backend merge
                            </p>

                            <div className="mt-5 space-y-4">
                                {placeholderModules.map((mod, index) => (
                                    <Card
                                        key={mod.id}
                                        className="flex gap-4 p-5 transition duration-200 hover:shadow-md"
                                    >
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
                            {/* Thumbnail */}
                            <div className="aspect-video w-full overflow-hidden bg-[#dbeafe]">
                                {resolvedImage ? (
                                    <img
                                        src={resolvedImage}
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

                                {/* Section picker — shown while loading or when open sections exist */}
                                {(sectionsLoading || hasSections) && (
                                    sectionsLoading ? (
                                        <div
                                            className="mt-5 border-t border-[#e8ecf1] pt-5"
                                            data-testid="sections-loading"
                                            aria-busy="true"
                                        >
                                            <div className="h-3 w-24 animate-pulse rounded bg-[#e8ecf1]" />
                                            <div className="mt-3 space-y-2">
                                                <div className="h-16 w-full animate-pulse rounded-xl bg-[#e8ecf1]" />
                                                <div className="h-16 w-full animate-pulse rounded-xl bg-[#e8ecf1]" />
                                            </div>
                                        </div>
                                    ) : (
                                        <SectionPicker
                                            sections={openSections}
                                            selectedId={selectedSectionId}
                                            onSelect={setSelectedSectionId}
                                        />
                                    )
                                )}

                                {/* CTA */}
                                <div className="mt-5 flex flex-col gap-3">
                                    {enrolled ? (
                                        <Badge label="Enrolled" tone="success" icon={CircleCheck} className="self-start" />
                                    ) : pendingApplication ? (
                                        <Badge label="Pending approval" tone="warning" icon={Clock} className="self-start" />
                                    ) : user?.role === 'student' || !user ? (
                                        <Button
                                            variant="primary"
                                            className="w-full"
                                            onClick={handleEnrol}
                                            isLoading={enrol.isPending}
                                            disabled={ctaBlocked}
                                        >
                                            {course.enrolment_policy === 'application' ? 'Apply to enrol' : 'Enrol now'}
                                        </Button>
                                    ) : (
                                        <Badge label="Students only" tone="neutral" icon={Lock} className="self-start" />
                                    )}

                                    {!enrolled && !pendingApplication && (user?.role === 'student' || !user) && (
                                        <>
                                            {course.enrolment_policy === 'advisory' && (
                                                <p className="text-xs text-[#94a3b8]">
                                                    You&apos;ll be asked to confirm you meet the prerequisites before
                                                    you&apos;re enrolled.
                                                </p>
                                            )}
                                            {course.enrolment_policy === 'application' && (
                                                <p className="text-xs text-[#94a3b8]">
                                                    Requires an admin to review and approve your application before
                                                    you&apos;re enrolled.
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {enrolError && <Alert variant="error" message={enrolError} />}
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

            {showAdvisoryModal && (
                <AdvisoryEnrolModal
                    course={course}
                    sectionId={selectedSectionId ?? undefined}
                    onClose={() => setShowAdvisoryModal(false)}
                    onEnrolled={() => {
                        setShowAdvisoryModal(false);
                        setEnrolled(true);
                    }}
                />
            )}

            {showApplicationModal && (
                <ApplicationModal
                    course={course}
                    sectionId={selectedSectionId ?? undefined}
                    onClose={() => setShowApplicationModal(false)}
                    onSubmitted={() => setShowApplicationModal(false)}
                />
            )}
        </div>
    );
}
