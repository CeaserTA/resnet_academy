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

// â”€â”€â”€ How to choose â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ What every course includes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const includes = [
    { icon: FolderOpen, title: 'Portfolio projects', description: 'Build work you can confidently show clients and employers.' },
    { icon: Users, title: 'Small cohorts', description: 'Get individual attention and learn alongside committed peers.' },
    { icon: Headphones, title: 'Mentor feedback', description: 'Receive practical reviews from people doing the work today.' },
    { icon: Trophy, title: 'Course certificate', description: 'Earn proof of completion after meeting project requirements.' },
    { icon: Briefcase, title: 'Career preparation', description: 'Improve your CV, portfolio presentation and interview readiness.' },
    { icon: MessageSquare, title: 'Alumni community', description: 'Keep learning through peer support and mentor connections.' },
];

// â”€â”€â”€ Learning journey â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const journey = [
    { number: '01', label: 'Choose your pathway' },
    { number: '02', label: 'Learn with your cohort' },
    { number: '03', label: 'Build reviewed projects' },
    { number: '04', label: 'Graduate ready to show your work' },
];

// â”€â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const faqs = [
    { q: 'Do I need coding experience?', a: 'No prior experience is needed for our beginner courses. Frontend Foundations starts from absolute zero â€” just bring a laptop and the willingness to learn.' },
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

// â”€â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
                {/* §1 Hero — navy left with SVG, organic white blob right */}
                <section className="relative overflow-hidden bg-navy">
                    <div className="relative flex min-h-[420px] items-stretch">

                        {/* Left: navy with SVG lifecycle illustration */}
                        <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 lg:py-16">
                            <svg viewBox="0 0 400 360" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-sm" aria-hidden="true">
                                <path d="M195,25 C275,5 365,55 368,145 C372,235 305,320 210,318 C115,320 32,258 28,168 C22,78 115,45 195,25Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />
                                <g stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="130" y="105" width="140" height="98" rx="6" fill="rgba(255,255,255,0.06)" />
                                    <rect x="142" y="116" width="116" height="76" rx="3" fill="rgba(255,255,255,0.04)" />
                                    <rect x="152" y="128" width="60" height="5" rx="2" fill="rgba(232,163,61,0.7)" stroke="none" />
                                    <rect x="152" y="140" width="90" height="5" rx="2" fill="rgba(255,255,255,0.2)" stroke="none" />
                                    <rect x="152" y="152" width="45" height="5" rx="2" fill="rgba(255,255,255,0.2)" stroke="none" />
                                    <circle cx="220" cy="173" r="13" stroke="rgba(232,163,61,0.9)" strokeWidth="1.5" />
                                    <polygon points="216,168 216,178 228,173" fill="rgba(232,163,61,0.85)" stroke="none" />
                                    <path d="M148,203 L252,203 L264,218 L136,218 Z" fill="rgba(255,255,255,0.06)" />
                                    <line x1="136" y1="218" x2="264" y2="218" />
                                    <line x1="200" y1="218" x2="200" y2="228" />
                                    <line x1="182" y1="228" x2="218" y2="228" />
                                </g>
                                <circle cx="200" cy="178" r="118" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" strokeDasharray="6 6" fill="none" />
                                <g transform="translate(170,28)" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="30" cy="24" r="22" fill="rgba(27,79,160,0.6)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
                                    <circle cx="27" cy="21" r="7" stroke="white" strokeWidth="1.6" fill="none" />
                                    <line x1="32" y1="27" x2="37" y2="32" stroke="white" strokeWidth="1.6" />
                                    <text x="30" y="56" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="system-ui">BROWSE</text>
                                </g>
                                <g transform="translate(298,150)" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="24" cy="24" r="22" fill="rgba(27,79,160,0.6)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
                                    <rect x="14" y="15" width="20" height="18" rx="2" stroke="white" strokeWidth="1.6" fill="none" />
                                    <line x1="18" y1="21" x2="30" y2="21" stroke="white" strokeWidth="1.4" />
                                    <line x1="18" y1="26" x2="26" y2="26" stroke="white" strokeWidth="1.4" />
                                    <polyline points="20,33 24,37 34,28" stroke="rgba(232,163,61,0.9)" strokeWidth="1.6" fill="none" />
                                    <text x="24" y="56" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="system-ui">APPLY</text>
                                </g>
                                <g transform="translate(170,276)" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="30" cy="24" r="22" fill="rgba(27,79,160,0.6)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
                                    <rect x="18" y="14" width="24" height="20" rx="2" stroke="white" strokeWidth="1.6" fill="none" />
                                    <line x1="30" y1="14" x2="30" y2="34" stroke="white" strokeWidth="1.4" />
                                    <line x1="22" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.2" />
                                    <line x1="22" y1="26" x2="28" y2="26" stroke="white" strokeWidth="1.2" />
                                    <text x="30" y="56" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="system-ui">LEARN</text>
                                </g>
                                <g transform="translate(58,150)" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="24" cy="24" r="22" fill="rgba(232,163,61,0.2)" stroke="rgba(232,163,61,0.7)" strokeWidth="1.4" />
                                    <path d="M24,13 L38,19 L24,25 L10,19 Z" stroke="rgba(232,163,61,0.95)" strokeWidth="1.6" fill="rgba(232,163,61,0.15)" />
                                    <line x1="38" y1="19" x2="38" y2="30" stroke="rgba(232,163,61,0.95)" strokeWidth="1.6" />
                                    <path d="M16,23 Q16,33 24,33 Q32,33 32,23" stroke="rgba(232,163,61,0.95)" strokeWidth="1.6" fill="none" />
                                    <text x="24" y="56" textAnchor="middle" fill="rgba(232,163,61,0.85)" fontSize="9" fontFamily="system-ui">GRADUATE</text>
                                </g>
                                <g fill="rgba(255,255,255,0.35)" stroke="none">
                                    <polygon points="278,88 285,95 275,97" />
                                    <polygon points="278,268 285,261 275,259" />
                                    <polygon points="122,268 115,261 125,259" />
                                    <polygon points="122,88 115,95 125,97" />
                                </g>
                                <g fill="rgba(232,163,61,0.6)">
                                    <circle cx="200" cy="60" r="3" />
                                    <circle cx="318" cy="178" r="3" />
                                    <circle cx="200" cy="296" r="3" />
                                    <circle cx="82" cy="178" r="3" />
                                </g>
                            </svg>
                        </div>

                        {/* Right: organic white blob shape + description */}
                        <div className="hidden lg:block lg:w-1/2 relative">
                            {/* Blob SVG fills the right column */}
                            <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                                <path d="M500,0 L500,420 L120,420 C70,420 20,375 10,310 C0,245 30,175 50,120 C70,65 40,20 100,5 C130,0 170,0 210,0 Z" fill="white" />
                            </svg>
                            {/* Content above blob */}
                            <div className="relative z-10 flex h-full flex-col justify-center px-14 py-14">
                                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                                    Next intake: September 2026
                                </span>
                                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Course Finder</p>
                                <h1 className="mt-2 text-4xl text-ink-900 sm:text-5xl">Find the right<br />course to begin.</h1>
                                <p className="mt-4 max-w-xs text-base leading-7 text-ink-600">
                                    Practical web development in Kampala. Real projects, expert mentors, and a verifiable certificate.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
                                    {[
                                        { icon: FolderOpen, label: "Project-based" },
                                        { icon: Users, label: "Mentors" },
                                        { icon: Trophy, label: "Certificate" },
                                        { icon: CalendarDays, label: "Flexible payment" },
                                    ].map(({ icon: Icon, label }) => (
                                        <div key={label} className="flex items-center gap-1.5 text-sm text-ink-600">
                                            <Icon className="size-4 text-primary" aria-hidden="true" />
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Mobile: text below illustration */}
                        <div className="w-full bg-white px-4 py-8 lg:hidden">
                            <h1 className="text-3xl text-ink-900">Find the right course to begin.</h1>
                            <p className="mt-3 text-sm leading-7 text-ink-600">Practical web development in Kampala. Real projects, expert mentors, certificate.</p>
                        </div>
                    </div>
                </section>

                        {/* Mobile: text below illustration */}
                        <div className="w-full bg-white px-4 py-8 lg:hidden">
                            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                                Next intake: September 2026
                            </span>
                            <h1 className="mt-3 text-3xl text-ink-900">Find the right course to begin.</h1>
                            <p className="mt-3 text-sm leading-7 text-ink-600">
                                Practical web development in Kampala. Real projects, expert mentors, and a verifiable certificate.
                            </p>
                        </div>

                    </div>
                </section>
