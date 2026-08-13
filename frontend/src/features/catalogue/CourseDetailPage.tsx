import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    CircleCheck,
    Clock,
    GraduationCap,
    Lock,
    MonitorPlay,
    SignalHigh,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useCourse, useCourseModules } from '@/features/catalogue/useCourses';
import { courseImageMap } from '@/features/catalogue/courseImages';
import { useStudentSections } from '@/features/catalogue/useStudentSections';
import { SectionPicker } from '@/features/catalogue/SectionPicker';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEnrol } from '@/features/enrolment/useEnrolments';
import { useMyCourseApplications } from '@/features/courseApplications/useCourseApplications';
import { AdvisoryEnrolModal } from '@/features/catalogue/AdvisoryEnrolModal';
import { ApplicationModal } from '@/features/catalogue/ApplicationModal';
import { ApiError } from '@/lib/api/client';
import type { Module } from '@/lib/api/types';

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

/**
 * Rough duration estimate based on module count (~2 modules per week).
 * PLACEHOLDER — replace with a real `duration_weeks` field from the backend
 * once it is added to the courses table.
 */
function estimateDuration(moduleCount: number): string {
    if (moduleCount === 0) return 'TBA';
    const weeks = Math.max(1, Math.ceil(moduleCount / 2));
    return `~${weeks} week${weeks !== 1 ? 's' : ''}`;
}

// ─── Section heading with blue left-border accent ────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
    return (
        <h2 id={id} className="border-l-4 border-blue-600 pl-3 text-xl font-bold text-[#0f172a]">
            {children}
        </h2>
    );
}

// ─── "What You Will Learn" card ───────────────────────────────────────────────

function LearnCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-[#e8ecf1] bg-white p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
                <CheckCircle2 className="size-4 text-blue-600" aria-hidden="true" />
            </span>
            <div>
                <p className="text-sm font-semibold text-[#0f172a]">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-[#64748b]">{body}</p>
            </div>
        </div>
    );
}

// ─── Flat module row ──────────────────────────────────────────────────────────

function ModuleRow({ module, index }: { module: Module; index: number }) {
    return (
        <div className="flex items-center gap-3 border-b border-[#e8ecf1] px-5 py-3 last:border-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                {index + 1}
            </span>
            <span className="text-sm font-medium text-[#0f172a]">{module.title}</span>
        </div>
    );
}

// ─── What you'll learn — 4 outcome cards per course ──────────────────────────
// TODO: replace with a `learning_outcomes` field from the backend when available.

const learningOutcomes: Record<string, { title: string; body: string }[]> = {
    'web-foundations': [
        { title: 'Semantic HTML', body: 'Build well-structured, accessible HTML pages from scratch.' },
        { title: 'CSS Layouts', body: 'Style responsive layouts with CSS Grid and Flexbox.' },
        { title: 'Accessible Markup', body: 'Write clean markup that works for all users and screen readers.' },
        { title: 'Portfolio Site', body: 'Publish a personal portfolio site by the end of the course.' },
    ],
    'dynamic-web': [
        { title: 'DOM Manipulation', body: 'Manipulate page elements with vanilla JavaScript.' },
        { title: 'API Integration', body: 'Fetch and display data from real public APIs.' },
        { title: 'Events & Validation', body: 'Handle user events and validate form inputs correctly.' },
        { title: 'Interactive UI', body: 'Build interactive components without any framework.' },
    ],
    'full-stack': [
        { title: 'RESTful APIs', body: 'Design and build REST APIs with Node.js and Express.' },
        { title: 'Frontend + Backend', body: 'Connect a React frontend to a Node.js backend.' },
        { title: 'Databases', body: 'Work with both SQL and NoSQL databases in real projects.' },
        { title: 'Cloud Deployment', body: 'Deploy full-stack applications to a cloud provider.' },
    ],
    'search-engine-optimization': [
        { title: 'SEO Auditing', body: 'Audit on-page and technical SEO factors using real tools.' },
        { title: 'Keyword Research', body: 'Conduct keyword research to find high-value opportunities.' },
        { title: 'Backlink Campaigns', body: 'Build and track backlink campaigns systematically.' },
        { title: 'Search Console', body: 'Interpret Google Search Console data to drive decisions.' },
    ],
    'progressive-web-app-development': [
        { title: 'PWA Conversion', body: 'Convert an existing web app into a fully compliant PWA.' },
        { title: 'Service Workers', body: 'Implement service workers and a solid caching strategy.' },
        { title: 'Offline Support', body: 'Enable offline mode and push notifications for users.' },
        { title: 'Lighthouse Audits', body: 'Pass Lighthouse PWA audits with a high performance score.' },
    ],
    'vuejs-and-laravel': [
        { title: 'Vue 3 Composition API', body: 'Build reactive, component-based UIs with Vue 3.' },
        { title: 'Laravel REST API', body: 'Scaffold a clean REST API backend with Laravel.' },
        { title: 'Authentication', body: 'Secure your app with Laravel Sanctum token auth.' },
        { title: 'Full Deployment', body: 'Deploy a complete Vue + Laravel application to production.' },
    ],
    'data-analytics-with-google-analytics': [
        { title: 'GA4 Setup', body: 'Set up and configure a Google Analytics 4 property correctly.' },
        { title: 'Traffic Reports', body: 'Read and interpret acquisition and behaviour reports.' },
        { title: 'Custom Dashboards', body: 'Create custom dashboards and event tracking.' },
        { title: 'Data-Driven Decisions', body: 'Use analytics data to inform product and marketing choices.' },
    ],
    'wordpress-development': [
        { title: 'WordPress Setup', body: 'Install and configure WordPress on a live server.' },
        { title: 'Custom Themes', body: 'Build custom themes and page templates from scratch.' },
        { title: 'Plugin Development', body: 'Extend site functionality by writing your own plugins.' },
        { title: 'Speed & SEO', body: 'Optimise your WordPress site for performance and search.' },
    ],
    'database-querying-schema-design': [
        { title: 'Complex SQL', body: 'Write complex queries, joins, and subqueries confidently.' },
        { title: 'Schema Design', body: 'Design normalised relational schemas for real applications.' },
        { title: 'Query Optimisation', body: 'Speed up slow queries using indexes and execution plans.' },
        { title: 'Safe Migrations', body: 'Run schema migrations safely in production environments.' },
    ],
};

// ─── Main component ───────────────────────────────────────────────────────────

export function CourseDetailPage() {
    const { id } = useParams();
    const courseId = Number(id);
    const navigate = useNavigate();

    const { data: course, isLoading, isError } = useCourse(courseId);
    const { data: modules, isLoading: modulesLoading } = useCourseModules(courseId);
    const { user } = useAuth();
    const enrol = useEnrol();
    const { data: myApplications } = useMyCourseApplications(user?.role === 'student');
    const { openSections, isLoading: sectionsLoading } = useStudentSections(courseId);
    const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
    const [enrolError, setEnrolError] = useState<string | null>(null);
    const [enrolled, setEnrolled] = useState(false);
    const [showAdvisoryModal, setShowAdvisoryModal] = useState(false);
    const [showApplicationModal, setShowApplicationModal] = useState(false);
    const [applicationSubmitted, setApplicationSubmitted] = useState(false);

    // Auto-dismiss application submitted alert after 5 seconds
    useEffect(() => {
        if (applicationSubmitted) {
            const timer = setTimeout(() => {
                setApplicationSubmitted(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [applicationSubmitted]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (isError || !course) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <BookOpen className="size-12 text-[#e8ecf1]" aria-hidden="true" />
                <h1 className="text-2xl font-bold text-[#0f172a]">Course not found</h1>
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

    const pendingApplication = myApplications?.find(
        (application) => application.course.id === course.id && application.status === 'pending',
    );

    // Section gating:
    // - While sectionsLoading, block to avoid state flicker
    // - If sections_required=true and sections exist: block until one is selected
    // - If sections_required=false: never block (sections are optional)
    const hasSections = !sectionsLoading && openSections.length > 0;
    const requiresSection = course.sections_required && hasSections;
    const ctaBlocked = sectionsLoading || (requiresSection && selectedSectionId === null);

    const handleEnrol = async () => {
        if (!user) {
            navigate('/login', { state: { from: { pathname: `/courses/${course.id}` } } });
            return;
        }
        if (course.enrolment_policy === 'advisory') { setShowAdvisoryModal(true); return; }
        if (course.enrolment_policy === 'application') { setShowApplicationModal(true); return; }
        setEnrolError(null);
        try {
            await enrol.mutateAsync({ courseId: course.id, sectionId: selectedSectionId ?? undefined });
            setEnrolled(true);
        } catch (error) {
            setEnrolError(error instanceof ApiError ? error.message : 'Could not enrol. Try again.');
        }
    };

    const resolvedImage = course.thumbnail_url ?? courseImageMap[course.slug] ?? null;
    const outcomeCards = learningOutcomes[course.slug] ?? [];
    const primaryInstructor = course.instructors[0] ?? null;

    // Duration: estimate from real module count (~2 modules/week).
    // PLACEHOLDER — replace with a real `duration_weeks` field once the backend adds it.
    const displayDuration = estimateDuration(modules?.length ?? 0);

    // PLACEHOLDER — hardcoded "Online" until the backend adds a `delivery_format` field.
    const displayFormat = 'Online';

    return (
        <div className="min-h-screen bg-[#fafbfc]">

            {/* ── 1. DARK HERO BANNER ──────────────────────────────────────────── */}
            <div
                className="relative w-full overflow-hidden bg-[#0f172a]"
                style={{ minHeight: 'clamp(220px, 30vw, 380px)' }}
            >
                {resolvedImage && (
                    <img
                        src={resolvedImage}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover object-center opacity-40"
                    />
                )}
                <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent"
                />

                {/* Back link */}
                <Link
                    to="/"
                    className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/20 sm:left-6 lg:left-8"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Back
                </Link>

                {/* Hero content pinned to bottom */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        {/* Category badge — subtle blue pill on dark */}
                        {course.category && (
                            <span className="inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200 ring-1 ring-blue-400/30">
                                {course.category.name}
                            </span>
                        )}

                        <h1 className="mt-3 text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl lg:text-5xl">
                            {course.title}
                        </h1>

                        {course.description && (
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                                {course.description}
                            </p>
                        )}

                        {/* Stat row */}
                        <div className="mt-4 flex flex-wrap gap-5 border-t border-white/10 pt-4">
                            {/* PLACEHOLDER: estimated from module count — see estimateDuration() */}
                            <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                    <Clock className="size-3" aria-hidden="true" />
                                    Duration
                                </span>
                                <span className="text-sm font-bold text-white">{displayDuration}</span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                    <SignalHigh className="size-3" aria-hidden="true" />
                                    Level
                                </span>
                                <span className="text-sm font-bold text-white capitalize">
                                    {levelLabel[course.level] ?? course.level}
                                </span>
                            </div>

                            {/* PLACEHOLDER: hardcoded until backend adds delivery_format field */}
                            <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                    <MonitorPlay className="size-3" aria-hidden="true" />
                                    Format
                                </span>
                                <span className="text-sm font-bold text-white">{displayFormat}</span>
                            </div>

                            <div className="flex flex-col gap-0.5">
                                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                    <GraduationCap className="size-3" aria-hidden="true" />
                                    Certificate
                                </span>
                                <span className="text-sm font-bold text-white">On completion</span>
                            </div>

                            {primaryInstructor && (
                                <div className="flex flex-col gap-0.5">
                                    <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                                        <Users className="size-3" aria-hidden="true" />
                                        Instructor
                                    </span>
                                    <span className="text-sm font-bold text-white">{primaryInstructor.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Application submitted confirmation ──────────────────────────── */}
            {applicationSubmitted && (
                <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
                    <Alert
                        variant="success"
                        message="Application submitted! Check your dashboard to track its status."
                        onDismiss={() => setApplicationSubmitted(false)}
                    />
                </div>
            )}

            {/* ── BODY ────────────────────────────────────────────────────────── */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-3">

                    {/* ── LEFT: main content ────────────────────────────────────── */}
                    <div className="space-y-12 lg:col-span-2">

                        {/* ── 2. WHAT YOU WILL LEARN ──────────────────────────────── */}
                        {outcomeCards.length > 0 && (
                            <section aria-labelledby="learn-heading">
                                <SectionHeading id="learn-heading">What You Will Learn</SectionHeading>
                                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                    {outcomeCards.slice(0, 4).map((card) => (
                                        <LearnCard key={card.title} title={card.title} body={card.body} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ── 3. COURSE MODULES ───────────────────────────────────── */}
                        <section aria-labelledby="syllabus-heading">
                            <SectionHeading id="syllabus-heading">Course Modules</SectionHeading>
                            <p className="mt-1.5 pl-3 text-sm text-[#64748b]">
                                {modulesLoading
                                    ? 'Loading modules…'
                                    : modules && modules.length > 0
                                        ? `${modules.length} module${modules.length !== 1 ? 's' : ''}`
                                        : 'Curriculum coming soon.'}
                            </p>

                            {modulesLoading && (
                                <div className="mt-4 flex justify-center"><Spinner /></div>
                            )}

                            {!modulesLoading && modules && modules.length > 0 && (
                                <div className="mt-4 overflow-hidden rounded-xl border border-[#e8ecf1] bg-white">
                                    {modules.map((mod: Module, i: number) => (
                                        <ModuleRow key={mod.id} module={mod} index={i} />
                                    ))}
                                </div>
                            )}

                            {!modulesLoading && (!modules || modules.length === 0) && (
                                <div className="mt-4 rounded-xl border border-dashed border-[#e8ecf1] bg-white py-10 text-center">
                                    <BookOpen className="mx-auto size-8 text-[#cbd5e1]" aria-hidden="true" />
                                    <p className="mt-3 text-sm text-[#94a3b8]">
                                        Modules will be published before the course starts.
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Prerequisites */}
                        {course.prerequisites_text && (
                            <section aria-labelledby="prereqs-heading">
                                <SectionHeading id="prereqs-heading">Prerequisites</SectionHeading>
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                                    <p className="font-semibold text-amber-800">Recommended before you start</p>
                                    <p className="mt-1 text-amber-700">{course.prerequisites_text}</p>
                                </div>
                            </section>
                        )}

                        {/* Instructor */}
                        {primaryInstructor && (
                            <section aria-labelledby="instructor-heading">
                                <SectionHeading id="instructor-heading">Your Instructor</SectionHeading>
                                <div className="mt-4 flex items-start gap-4 rounded-xl border border-[#e8ecf1] bg-white p-5">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                                        {primaryInstructor.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[#0f172a]">{primaryInstructor.name}</p>
                                        {primaryInstructor.bio && (
                                            <p className="mt-1 text-sm leading-6 text-[#64748b]">{primaryInstructor.bio}</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* ── 4. RIGHT: sticky CTA sidebar ──────────────────────────── */}
                    <div className="lg:sticky lg:top-8 lg:self-start">
                        <Card className="overflow-hidden p-0">
                            {/* Thumbnail */}
                            <div className="aspect-video w-full overflow-hidden bg-[#dbeafe]">
                                {resolvedImage ? (
                                    <img src={resolvedImage} alt={course.title} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-blue-300">
                                        <BookOpen className="size-10" aria-hidden="true" />
                                    </div>
                                )}
                            </div>

                            <div className="p-6">
                                <p className="text-xs font-medium uppercase tracking-wide text-[#94a3b8]">Course fee</p>
                                <p className="mt-1 text-3xl font-bold text-[#0f172a]">
                                    {formatPrice(course.price, course.currency)}
                                </p>
                                <p className="mt-0.5 text-xs text-[#94a3b8]">One-time payment · lifetime access</p>

                                {/* Section picker — shown while loading or when open sections exist */}
                                {(sectionsLoading || hasSections) && (
                                    <div className="mt-5 border-t border-[#e8ecf1] pt-5">
                                        {/* Helper text for optional sections */}
                                        {!course.sections_required && hasSections && (
                                            <p className="text-xs text-[#64748b] mb-2">
                                                Optional: choose a section to join a cohort, or enroll self-paced below.
                                            </p>
                                        )}
                                        {sectionsLoading ? (
                                            <div data-testid="sections-loading" aria-busy="true">
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
                                        )}
                                    </div>
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

                                {/* Duration + format — PLACEHOLDER: see comments above displayDuration/displayFormat */}
                                <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                                    <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                                    {displayDuration} · {displayFormat}
                                </div>

                                {/* Includes */}
                                <ul className="mt-5 space-y-2.5 border-t border-[#e8ecf1] pt-5 text-sm text-[#475569]">
                                    {[
                                        'Full access to all modules',
                                        'Code reviews from mentors',
                                        'Community forum access',
                                        'Certificate on completion',
                                        'Lifetime access to materials',
                                    ].map((item) => (
                                        <li key={item} className="flex items-center gap-2">
                                            <CheckCircle2 className="size-4 shrink-0 text-blue-500" aria-hidden="true" />
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
                    onEnrolled={() => { setShowAdvisoryModal(false); setEnrolled(true); }}
                />
            )}

            {showApplicationModal && (
                <ApplicationModal
                    course={course}
                    sectionId={selectedSectionId ?? undefined}
                    onClose={() => setShowApplicationModal(false)}
                    onSubmitted={() => {
                        setShowApplicationModal(false);
                        setApplicationSubmitted(true);
                    }}
                />
            )}
        </div>
    );
}
