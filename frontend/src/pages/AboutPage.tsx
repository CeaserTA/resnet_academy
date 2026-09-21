import { Link } from 'react-router';
import {
    BookOpen,
    Briefcase,
    CheckCircle,
    Code2,
    Globe,
    GraduationCap,
    MessageSquare,
    Target,
    Users,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { useAuthModal } from '@/lib/auth/AuthModalContext';

// ─── Data ─────────────────────────────────────────────────────────────────────

const statCards = [
    {
        value: '200+',
        label: 'Learners trained',
        gradient: 'linear-gradient(135deg, #1b4fa0 0%, #4b79c4 100%)',
        dots: ['#4b79c4', '#4b79c440', '#4b79c420'],
    },
    {
        value: '6',
        label: 'Cohorts completed',
        gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
        dots: ['#a78bfa', '#a78bfa40', '#a78bfa20'],
    },
    {
        value: '4',
        label: 'Active mentors',
        gradient: 'linear-gradient(135deg, #e8a33d 0%, #fbbf24 100%)',
        dots: ['#e8a33d', '#e8a33d40', '#e8a33d20'],
    },
    {
        value: '2023',
        label: 'Founded',
        gradient: 'linear-gradient(135deg, #1f8a55 0%, #34d399 100%)',
        dots: ['#1f8a55', '#1f8a5540', '#1f8a5520'],
    },
];

// Our Story phases — timeline format
const phases = [
    {
        tag: 'Phase 01',
        title: 'The Beginning',
        description: 'ResNet Academy was born from a simple observation: talented people across Uganda were struggling to break into tech — not from lack of ability, but lack of access to structured, mentor-supported training. We started with a single cohort and a project-first curriculum.',
        icon: BookOpen,
        year: '2023',
    },
    {
        tag: 'Phase 02',
        title: 'First Cohort Graduates',
        description: 'Our first cohort of 12 learners completed the Frontend Foundations course and published live portfolio sites. This proved that structured mentorship and project-based learning could deliver real outcomes — not just certificates.',
        icon: GraduationCap,
        year: '2023',
    },
    {
        tag: 'Phase 03',
        title: 'Expanding the Curriculum',
        description: 'Building on early success, we expanded into backend development, databases, and WordPress. Each new course was designed with the same principle: every module ends with something real that learners can show employers.',
        icon: Code2,
        year: '2024',
    },
    {
        tag: 'Phase 04',
        title: 'Growing Across East Africa',
        description: 'ResNet Academy now serves learners across Uganda and East Africa, offering both in-person and online delivery. Our cohort model ensures every learner gets mentor time, peer accountability, and career support that continues after graduation.',
        icon: Globe,
        year: '2025–now',
    },
];

const values = [
    { icon: Globe, title: 'Access should be universal.', description: 'Quality tech education should not depend on geography or income.' },
    { icon: Users, title: 'Learning is better together.', description: 'Every learner joins a cohort with peers, mentors, and reviewers.' },
    { icon: Briefcase, title: 'Skills should open doors.', description: 'We measure success by career outcomes, not course completions.' },
    { icon: CheckCircle, title: 'Real work beats theory.', description: 'Every concept we teach is applied to something you build and deploy.' },
];

const steps = [
    { number: '01', icon: BookOpen, title: 'Choose a course', outcome: 'Pick the pathway that matches your goal and level.' },
    { number: '02', icon: Users, title: 'Join a cohort', outcome: 'Learn alongside peers in a capped, structured intake.' },
    { number: '03', icon: Code2, title: 'Build projects', outcome: 'Complete real work reviewed by mentors each week.' },
    { number: '04', icon: GraduationCap, title: 'Graduate', outcome: 'Leave with a portfolio, a certificate, and a community.' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function AboutPage() {
    const { openAuth } = useAuthModal();
    const handleSignupClick = () => openAuth('signup');

    return (
        <div>
            <LandingHeader
                onLoginClick={() => openAuth('login')}
                onSignupClick={handleSignupClick}
            />

            <main>

                {/* §1 Hero ─────────────────────────────────────────────────── */}
                <section className="overflow-hidden bg-blue-50">
                    <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-2 lg:items-stretch">

                        {/* Left: text + stat cards */}
                        <div className="flex flex-col justify-center px-4 py-10 sm:px-6 lg:py-14 lg:pl-8 lg:pr-12">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                About ResNet Academy
                            </p>
                            <h1 className="mt-4 text-4xl text-ink-900 sm:text-5xl">
                                Building practical developers,<br className="hidden sm:block" /> one project at a time.
                            </h1>
                            <p className="mt-5 max-w-md text-base leading-7 text-ink-600">
                                ResNet Academy trains learners across Uganda and East Africa in
                                modern web technologies — through real projects, expert mentors,
                                and cohort-based learning.
                            </p>

                            {/* CTAs — one dominant, one quiet */}
                            <div className="mt-6 flex flex-wrap items-center gap-4">
                                <Link
                                    to="/courses"
                                    className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    Explore courses
                                </Link>
                                <Link
                                    to="/contact"
                                    className="text-sm font-semibold text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    Talk to us
                                </Link>
                            </div>

                            {/* Stat cards — 2×2 grid */}
                            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {statCards.map(({ value, label, gradient, dots }) => (
                                    <div key={label} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-md">
                                        <div className="h-12 w-full" style={{ background: gradient }} aria-hidden="true" />
                                        <div className="flex flex-1 flex-col px-3 pb-3 pt-2">
                                            <p className="text-xl font-bold text-white">{value}</p>
                                            <p className="mt-0.5 text-[10px] leading-4 text-white/50">{label}</p>
                                            <div className="mt-2 flex gap-1">
                                                {dots.map((color, d) => (
                                                    <span key={d} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: full-bleed image */}
                        <div className="relative hidden lg:block">
                            <img src="/images/about_us.jpg" alt="ResNet Academy students" className="absolute inset-0 h-full w-full object-cover object-center" />
                        </div>
                        <div className="h-56 w-full overflow-hidden lg:hidden">
                            <img src="/images/about_us.jpg" alt="ResNet Academy students" className="h-full w-full object-cover object-center" />
                        </div>
                    </div>
                </section>

                {/* §2 Mission + Vision ─────────────────────────────────────── */}
                <section className="border-t border-border bg-white px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-8 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Who we are</p>
                            <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Our Mission &amp; Vision</h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">

                            {/* Mission card */}
                            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-50 p-7">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                        <Target className="size-5 text-primary" aria-hidden="true" />
                                    </div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-900">Our Mission</p>
                                </div>
                                <p className="text-base leading-7 text-ink-600">
                                    To make quality, practical tech education accessible to every
                                    motivated learner in Uganda and East Africa — regardless of their
                                    background, location, or prior experience.
                                </p>
                                <p className="text-sm leading-6 text-ink-600">
                                    We do this through project-based curricula, small cohorts with
                                    experienced mentors, and a commitment to career outcomes — not
                                    just certificates.
                                </p>
                            </div>

                            {/* Vision card */}
                            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-50 p-7">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                        <Globe className="size-5 text-primary" aria-hidden="true" />
                                    </div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.15em] text-ink-900">Our Vision</p>
                                </div>
                                <p className="text-base leading-7 text-ink-600">
                                    A Uganda and East Africa where any young person with drive can
                                    build a meaningful career in technology — without having to
                                    leave their country or spend years in a classroom.
                                </p>
                                <p className="text-sm leading-6 text-ink-600">
                                    We want to be the training ground that produces the region's
                                    most job-ready developers, designers, and digital entrepreneurs.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* §3 Our Story — phase timeline + sticky image ────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-10 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our story</p>
                            <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Our Journey to Empowerment</h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink-600">
                                From a single cohort in Kampala to a growing academy across East Africa.
                            </p>
                        </div>

                        <div className="grid gap-8 lg:grid-cols-3">

                            {/* Left: timeline phases (2 cols wide) */}
                            <div className="space-y-4 lg:col-span-2">
                                {/* Vertical connector line */}
                                <div className="relative">
                                    {phases.map(({ tag, title, description, icon: Icon, year }, i) => (
                                        <div key={tag} className="flex gap-4">

                                            {/* Left: icon + connector */}
                                            <div className="flex flex-col items-center">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white shadow-sm">
                                                    <Icon className="size-4 text-primary" aria-hidden="true" />
                                                </div>
                                                {i < phases.length - 1 && (
                                                    <div className="mt-1 w-px flex-1 bg-border" style={{ minHeight: '32px' }} aria-hidden="true" />
                                                )}
                                            </div>

                                            {/* Right: phase card */}
                                            <div className={`mb-4 flex-1 rounded-2xl border border-border bg-white p-5 shadow-sm ${i < phases.length - 1 ? 'mb-4' : ''}`}>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                                        {tag}
                                                    </span>
                                                    <h3 className="text-base font-semibold text-ink-900">{title}</h3>
                                                    <span className="ml-auto text-xs text-ink-300">{year}</span>
                                                </div>
                                                <p className="mt-3 text-sm leading-6 text-ink-600">{description}</p>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: sticky image card */}
                            <div className="hidden lg:block">
                                <div className="sticky top-8 overflow-hidden rounded-2xl border border-border shadow-md">
                                    <img
                                        src="/images/our_story.jpg"
                                        alt="ResNet Academy campus and students"
                                        className="h-64 w-full object-cover object-center"
                                    />
                                    <div className="bg-ink-900 px-5 py-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                                            ResNet Ecosystem
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-white">ResNet Academy, Kampala</p>
                                        <p className="mt-1 text-xs text-white/50">
                                            Training job-ready developers under real project conditions.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* §4 Values / Guiding Principles ─────────────────────────── */}
                <section className="border-t border-border bg-white px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-8 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What drives us</p>
                            <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">Our Guiding Principles</h2>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {values.map(({ icon: Icon, title, description }) => (
                                <div key={title} className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface-50 p-5">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                        <Icon className="size-5 text-primary" aria-hidden="true" />
                                    </div>
                                    <p className="text-sm font-semibold text-ink-900">{title}</p>
                                    <p className="text-sm leading-6 text-ink-600">{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* §5 How learning works ──────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-12 lg:grid-cols-2">

                            {/* Steps */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The process</p>
                                <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">How learning works.</h2>
                                <div className="mt-8 space-y-0">
                                    {steps.map(({ number, icon: Icon, title, outcome }, index) => (
                                        <div key={number} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white text-sm font-bold text-primary">
                                                    {number}
                                                </div>
                                                {index < steps.length - 1 && (
                                                    <div aria-hidden="true" className="mt-1 w-px flex-1" style={{ borderLeft: '2px dashed var(--color-primary)', minHeight: '40px' }} />
                                                )}
                                            </div>
                                            <div className={index < steps.length - 1 ? 'pb-6' : ''}>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
                                                        <Icon className="size-3.5" aria-hidden="true" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-ink-900">{title}</p>
                                                </div>
                                                <p className="mt-1 text-sm leading-6 text-ink-600">{outcome}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Enrolment prompt */}
                            <div className="flex items-center">
                                <div className="w-full rounded-2xl border border-border bg-white p-8">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ready to start?</p>
                                    <h3 className="mt-3 text-2xl text-ink-900">Join the next cohort.</h3>
                                    <p className="mt-3 text-sm leading-7 text-ink-600">
                                        Cohorts are capped so every learner gets mentor time.
                                        Browse available courses and check upcoming intake dates.
                                    </p>
                                    <Link
                                        to="/courses"
                                        className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                        Explore courses
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* §6 Mentors ─────────────────────────────────────────────── */}
                <section className="border-t border-border bg-white px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-8 text-center">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">The team</p>
                            <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">How our mentors support you.</h2>
                            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink-600">
                                Every learner is supported by an experienced mentor — not just during lessons, but between sessions too.
                            </p>
                        </div>
                        {/* TODO: Replace with real mentor profiles */}
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                { icon: Code2, title: 'Code reviews', description: 'Mentors review every project submission with line-level feedback.' },
                                { icon: MessageSquare, title: 'Weekly check-ins', description: 'Short weekly sessions to answer questions and unblock progress.' },
                                { icon: Briefcase, title: 'Career guidance', description: 'CV reviews, portfolio advice, and direct employer introductions.' },
                            ].map(({ icon: Icon, title, description }) => (
                                <div key={title} className="flex items-start gap-4 rounded-2xl border border-border bg-surface-50 p-5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
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

                {/* §7 Graduate story + Final CTA — navy, two columns ───────── */}
                <section className="border-t border-border bg-navy px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-2">

                            {/* Left: graduate story */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Graduate outcomes</p>
                                <h2 className="mt-3 text-3xl text-navy-foreground sm:text-4xl">From learner to employed.</h2>
                                {/* TODO: Replace with real graduate story */}
                                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-white/30">Coming soon</p>
                                    <p className="mt-2 text-sm leading-6 text-navy-foreground/60">
                                        We are collecting verified graduate stories from our 2024 and 2025 cohorts.
                                        Check back soon — or{' '}
                                        <Link to="/contact" className="text-blue-300 underline hover:no-underline">contact us</Link>{' '}
                                        if you are a graduate who would like to share yours.
                                    </p>
                                </div>
                            </div>

                            {/* Right: final CTA */}
                            <div className="flex flex-col justify-center">
                                <h2 className="text-2xl text-navy-foreground sm:text-3xl">Ready to take the next step?</h2>
                                <p className="mt-3 text-sm leading-7 text-navy-foreground/60">
                                    Browse our courses, check upcoming cohort dates, or reach out if you need help choosing the right path.
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Link
                                        to="/courses"
                                        className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                        Explore courses
                                    </Link>
                                    <Link
                                        to="/contact"
                                        className="inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-navy-foreground transition-colors hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                    >
                                        Contact us
                                    </Link>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

            </main>

            <Footer
                onLoginClick={() => openAuth('login')}
                onSignupClick={handleSignupClick}
            />
        </div>
    );
}
