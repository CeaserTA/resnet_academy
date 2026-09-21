import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
    BookX,
    Briefcase,
    CalendarDays,
    ChevronDown,
    Code2,
    FolderOpen,
    Headphones,
    MessageSquare,
    Search,
    Trophy,
    Users,
    Zap,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { useAuthModal } from '@/lib/auth/AuthModalContext';
import { useCategories, useCourses } from '@/features/catalogue/useCourses';
import { usePublicCohortOfferings } from '@/features/cohorts/useCohorts';
import { CourseCard } from '@/features/catalogue/CourseCard';
import { courseImageMap, courseDurationMap } from '@/features/catalogue/courseImages';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
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

// ─── Main page ────────────────────────────────────────────────────────────────

export function CataloguePage() {
    const [searchParams] = useSearchParams();
    const { openAuth } = useAuthModal();

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | undefined>(() => {
        const v = searchParams.get('category_id');
        return v ? Number(v) : undefined;
    });
    const [activeLevel, setActiveLevel] = useState<string | undefined>(() => {
        return searchParams.get('level') ?? undefined;
    });

    const apiFilters: CourseFilters = useMemo(() => ({ status: 'published' }), []);

    const { data, isLoading: coursesLoading } = useCourses(apiFilters);
    const { data: categories } = useCategories();
    const { data: cohortOfferings, isLoading: offeringsLoading } = usePublicCohortOfferings();

    const isLoading = coursesLoading || offeringsLoading;

    // Derive enrollment status per course from cohort offerings
    const courseStatusMap = useMemo(() => {
        const map = new Map<number, 'open' | 'waitlist' | 'full'>();
        for (const offering of cohortOfferings ?? []) {
            const id = offering.course.id;
            if (offering.status === 'open') {
                const available = offering.seats_available;
                if (available === null || available === undefined || available > 0) {
                    map.set(id, 'open');
                } else if (available === 0) {
                    map.set(id, map.get(id) === 'open' ? 'open' : 'full');
                }
            }
        }
        return map;
    }, [cohortOfferings]);

    const courseIdsWithCohorts = useMemo(
        () => new Set((cohortOfferings ?? []).map((o) => o.course.id)),
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
        <div className="min-h-screen bg-background">
            <LandingHeader
                onLoginClick={() => openAuth('login')}
                onSignupClick={() => openAuth('signup')}
            />

            <main>
                {/* §1 Hero — illustrated banner, no image */}
                <section className="relative overflow-hidden bg-primary px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
                    {/* Scattered education icon line art — purely decorative */}
                    <svg
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Graduation cap top-left */}
                        <g transform="translate(60,50)" stroke="white" strokeWidth="1.5" fill="none">
                            <polygon points="20,0 40,10 20,20 0,10" />
                            <line x1="40" y1="10" x2="40" y2="25" />
                            <path d="M10,18 Q10,32 20,32 Q30,32 30,18" />
                        </g>
                        {/* Laptop centre-left */}
                        <g transform="translate(120,160)" stroke="white" strokeWidth="1.5" fill="none">
                            <rect x="0" y="0" width="60" height="40" rx="3" />
                            <line x1="-8" y1="40" x2="68" y2="40" />
                            <rect x="8" y="6" width="44" height="28" />
                        </g>
                        {/* Chat bubble top-right area */}
                        <g transform="translate(80%,40)" stroke="white" strokeWidth="1.5" fill="none" style={{ transform: 'translate(74%,40px)' }}>
                            <rect x="0" y="0" width="52" height="36" rx="8" />
                            <polyline points="8,36 8,46 18,36" />
                            <line x1="10" y1="12" x2="42" y2="12" />
                            <line x1="10" y1="22" x2="32" y2="22" />
                        </g>
                        {/* Certificate bottom-right */}
                        <g transform="translate(78%,68%)" stroke="white" strokeWidth="1.5" fill="none" style={{ transform: 'translate(78%,68%)' }}>
                            <rect x="0" y="0" width="50" height="38" rx="3" />
                            <line x1="8" y1="10" x2="42" y2="10" />
                            <line x1="8" y1="18" x2="35" y2="18" />
                            <circle cx="25" cy="30" r="6" />
                        </g>
                        {/* Play button bottom-left */}
                        <g transform="translate(30,75%)" stroke="white" strokeWidth="1.5" fill="none" style={{ transform: 'translate(30px,75%)' }}>
                            <circle cx="20" cy="20" r="18" />
                            <polygon points="14,12 32,20 14,28" fill="white" opacity="0.3" />
                        </g>
                        {/* Users icon mid-right */}
                        <g transform="translate(85%,45%)" stroke="white" strokeWidth="1.5" fill="none" style={{ transform: 'translate(85%,45%)' }}>
                            <circle cx="14" cy="10" r="8" />
                            <path d="M0,34 Q0,24 14,24 Q28,24 28,34" />
                            <circle cx="30" cy="10" r="6" opacity="0.6" />
                            <path d="M22,34 Q24,28 30,28 Q38,28 40,34" opacity="0.6" />
                        </g>
                        {/* Book top-right */}
                        <g transform="translate(88%,12%)" stroke="white" strokeWidth="1.5" fill="none" style={{ transform: 'translate(88%,12%)' }}>
                            <rect x="0" y="0" width="36" height="46" rx="3" />
                            <line x1="8" y1="12" x2="28" y2="12" />
                            <line x1="8" y1="20" x2="28" y2="20" />
                            <line x1="8" y1="28" x2="20" y2="28" />
                        </g>
                        {/* Dotted connecting lines */}
                        <line x1="15%" y1="20%" x2="35%" y2="40%" stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                        <line x1="65%" y1="25%" x2="45%" y2="50%" stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                        <line x1="20%" y1="70%" x2="40%" y2="55%" stroke="white" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                    </svg>

                    {/* Content */}
                    <div className="relative z-10 mx-auto max-w-3xl text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                            Course Finder
                        </p>
                        <h1 className="mt-4 text-4xl text-white sm:text-5xl">
                            Find the right place to begin.
                        </h1>
                        <p className="mt-4 text-base leading-7 text-white/70">
                            Search by a skill you want to learn, then narrow by subject or level.
                            Every course includes real projects, mentor feedback, and a certificate.
                        </p>
                        {/* Quick facts */}
                        <div className="mt-8 flex flex-wrap justify-center gap-4 border-t border-white/10 pt-6">
                            {[
                                { icon: FolderOpen, label: 'Project-based' },
                                { icon: Users, label: 'Mentor support' },
                                { icon: Trophy, label: 'Certificate' },
                                { icon: CalendarDays, label: 'Flexible payment' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-2 text-sm text-white/60">
                                    <Icon className="size-4 text-blue-200" aria-hidden="true" />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* §2 Filters + course grid */}
                <section className="bg-surface-50 px-4 py-10 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">

                        {/* Search bar */}
                        <div className="relative max-w-lg">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300"
                                aria-hidden="true"
                            />
                            <input
                                type="search"
                                placeholder="Search courses — try JavaScript, PHP or WordPress"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search courses"
                                className="w-full rounded-full border border-border bg-white py-2.5 pl-9 pr-4 text-sm text-ink-900 placeholder:text-ink-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        {/* Filter chips */}
                        <div className="mt-4 flex flex-wrap items-center gap-3">
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
                            {categories && categories.length > 0 && (
                                <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
                            )}
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

                        {/* Result count + clear */}
                        <div className="mt-4 flex items-center justify-between">
                            {!isLoading && (
                                <p className="text-sm text-ink-600">
                                    <span className="font-semibold text-ink-900">{filtered.length}</span>{' '}
                                    course{filtered.length !== 1 ? 's' : ''} found
                                    {search && <> for &ldquo;<span className="italic">{search}</span>&rdquo;</>}
                                </p>
                            )}
                            {(search || activeCategory || activeLevel) && (
                                <button
                                    onClick={() => { setSearch(''); setActiveCategory(undefined); setActiveLevel(undefined); }}
                                    className="text-xs font-semibold text-primary underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    Reset filters
                                </button>
                            )}
                        </div>

                        {/* Course grid */}
                        <div className="mt-6">
                            {isLoading && (
                                <div className="flex justify-center py-20">
                                    <Spinner />
                                </div>
                            )}
                            {!isLoading && filtered.length === 0 && (
                                <EmptyState
                                    icon={BookX}
                                    title="No courses match your search"
                                    description="Try different keywords or reset the filters."
                                />
                            )}
                            {!isLoading && filtered.length > 0 && (
                                <div className={cn(
                                    'grid gap-5',
                                    filtered.length === 1 && 'sm:max-w-sm',
                                    filtered.length === 2 && 'sm:grid-cols-2 lg:max-w-2xl',
                                    filtered.length >= 3 && 'sm:grid-cols-2 lg:grid-cols-3',
                                )}>
                                    {filtered.map((course, i) => {
                                        const meta = courseDurationMap[course.slug];
                                        return (
                                            <CourseCard
                                                key={course.id}
                                                course={course}
                                                imageSrc={courseImageMap[course.slug]}
                                                duration={meta?.duration}
                                                format={meta?.format}
                                                delivery={meta?.delivery}
                                                skills={meta?.skills}
                                                nextCohort={meta?.nextCohort}
                                                outcome={meta?.outcome}
                                                enrollmentStatus={courseStatusMap.get(course.id)}
                                                index={i}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ── Sections 4+5: How to choose (left) + What's included (right) ── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-12 lg:grid-cols-2">

                            {/* Left: How to choose */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Choose with confidence</p>
                                <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Which course fits you best?</h2>
                                <p className="mt-3 text-sm leading-7 text-ink-600">
                                    Your best starting point depends on what you already know and what you want to build next.
                                </p>
                                <div className="mt-6 flex flex-col gap-px rounded-2xl border border-border bg-border">
                                    {pathways.map(({ icon: Icon, tag, title, description }) => (
                                        <div key={title} className="flex flex-col gap-3 bg-white p-5 first:rounded-t-2xl last:rounded-b-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                                    <Icon className="size-5 text-primary" aria-hidden="true" />
                                                </div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{tag}</p>
                                            </div>
                                            <h3 className="text-base text-ink-900">{title}</h3>
                                            <p className="text-sm leading-6 text-ink-600">{description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: What's included */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Included in every course</p>
                                <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Support beyond class.</h2>
                                <p className="mt-3 text-sm leading-7 text-ink-600">
                                    Technical practice combined with the feedback and career preparation you need.
                                </p>
                                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {includes.map(({ icon: Icon, title, description }) => (
                                        <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                                <Icon className="size-4 text-primary" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-ink-900">{title}</p>
                                                <p className="mt-0.5 text-xs leading-5 text-ink-600">{description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* ── Section 6: Learning journey ──────────────────────────────── */}
                <section className="bg-navy px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Your learning journey</p>
                        <h2 className="mt-3 text-3xl text-navy-foreground sm:text-4xl">From first lesson to finished portfolio.</h2>
                        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

                            {/* Left: heading + image */}
                            <div className="flex flex-col gap-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Frequently asked questions</p>
                                    <h2 className="mt-3 text-3xl text-ink-900">Know before you enrol.</h2>
                                    <p className="mt-3 text-sm leading-7 text-ink-600">Clear answers to the questions learners ask most often.</p>
                                </div>

                                {/* Shaped image */}
                                <div
                                    className="overflow-hidden shadow-md"
                                    style={{
                                        clipPath: 'polygon(0% 8%, 100% 0%, 100% 92%, 0% 100%)',
                                        borderRadius: '1rem',
                                    }}
                                >
                                    <img
                                        src="/images/know_before_enrol.jpg"
                                        alt="Students reviewing course materials before enrolling"
                                        className="h-56 w-full object-cover object-center"
                                    />
                                </div>
                            </div>

                            {/* Right: accordion */}
                            <div className="lg:col-span-2">
                                {faqs.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
                                <div className="border-t border-border" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Section 7: Final enrolment prompt ───────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="text-2xl text-ink-900 sm:text-3xl">Ready to take the next step?</h2>
                            <p className="mt-2 text-sm leading-7 text-ink-600">
                                Apply to a cohort or reach out if you need help choosing the right course.
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-3">
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                <CalendarDays className="size-4" aria-hidden="true" />
                                View cohorts
                            </Link>
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
