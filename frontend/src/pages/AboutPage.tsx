import { Link } from 'react-router';
import {
    BookOpen,
    Briefcase,
    CheckCircle,
    Code2,
    Globe,
    GraduationCap,
    MessageSquare,
    Users,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { useAuthModal } from '@/lib/auth/AuthModalContext';

// ─── Data ─────────────────────────────────────────────────────────────────────

const stats = [
    { value: '200+', label: 'Learners trained', note: 'Since 2023' },
    { value: '15+', label: 'Projects completed per cohort', note: 'Per intake' },
    { value: '6', label: 'Cohorts completed', note: '2023–2026' },
    { value: '4', label: 'Active mentors', note: 'Industry practitioners' },
];

const missionPoints = [
    {
        icon: BookOpen,
        title: 'Project-based curriculum',
        description: 'Build real things from day one.',
    },
    {
        icon: Users,
        title: 'Mentor-led guidance',
        description: 'Code reviews and career advice at every stage.',
    },
];

const steps = [
    {
        number: '01',
        icon: BookOpen,
        title: 'Choose a course',
        outcome: 'Pick the pathway that matches your goal and experience level.',
    },
    {
        number: '02',
        icon: Users,
        title: 'Join a cohort',
        outcome: 'Learn alongside peers in a capped, structured intake.',
    },
    {
        number: '03',
        icon: Code2,
        title: 'Build projects',
        outcome: 'Complete real work reviewed by mentors each week.',
    },
    {
        number: '04',
        icon: GraduationCap,
        title: 'Graduate',
        outcome: 'Leave with a portfolio, a certificate, and a community.',
    },
];

const values = [
    {
        icon: Globe,
        title: 'Access should be universal.',
        description: 'Quality tech education should not depend on geography or income.',
    },
    {
        icon: Users,
        title: 'Learning is better together.',
        description: 'Every learner joins a cohort with peers, mentors, and reviewers.',
    },
    {
        icon: Briefcase,
        title: 'Skills should open doors.',
        description: 'We measure success by career outcomes, not course completions.',
    },
    {
        icon: CheckCircle,
        title: 'Real work beats theory.',
        description: 'Every concept we teach is applied to something you build and deploy.',
    },
];

const whoWeServe = [
    { icon: GraduationCap, label: 'S.6 leavers' },
    { icon: Code2, label: 'Aspiring developers' },
    { icon: Briefcase, label: 'Working professionals' },
    { icon: Globe, label: 'Career changers' },
    { icon: MessageSquare, label: 'Entrepreneurs' },
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
                <section className="relative overflow-hidden bg-ink-900 px-4 py-16 sm:px-6 lg:px-8">
                    {/* Subtle image overlay */}
                    <img
                        src="/images/students.jpg"
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover opacity-10"
                    />
                    <div className="relative z-10 mx-auto max-w-7xl">
                        <div className="grid items-start gap-12 lg:grid-cols-2">

                            {/* Left */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                                    About ResNet Academy
                                </p>
                                <h1 className="mt-4 text-4xl text-white sm:text-5xl">
                                    Building practical developers,<br className="hidden sm:block" /> one project at a time.
                                </h1>
                                <p className="mt-5 max-w-md text-base leading-7 text-white/70">
                                    ResNet Academy trains learners across Uganda and East Africa in
                                    modern web technologies — through real projects, expert mentors,
                                    and cohort-based learning.
                                </p>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <Link
                                        to="/courses"
                                        className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                        Explore courses
                                    </Link>
                                    <a
                                        href="#cohorts"
                                        className="inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                    >
                                        View cohorts
                                    </a>
                                </div>
                            </div>

                            {/* Right — stat strip on dark */}
                            <div className="hidden lg:flex lg:items-end lg:justify-end">
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { value: '200+', label: 'Learners trained' },
                                        { value: '6', label: 'Cohorts completed' },
                                        { value: '4', label: 'Active mentors' },
                                        { value: '2023', label: 'Founded' },
                                    ].map(({ value, label }) => (
                                        <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
                                            <p className="text-2xl font-bold text-white">{value}</p>
                                            <p className="mt-1 text-xs text-white/50">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* §2 Our Story ───────────────────────────────────────────── */}
                <section className="border-t border-border bg-white px-4 py-14 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid items-start gap-12 lg:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                    Our story
                                </p>
                                <h2 className="mt-4 text-3xl text-ink-900 sm:text-4xl">
                                    How ResNet Academy started.
                                </h2>

                                {/*
                                 * TODO: Replace with the real founding story.
                                 * Suggested content:
                                 *   - Founded in [year] by [founder name(s)]
                                 *   - First cohort ran in [month/year] with [N] students
                                 *   - First completed project: [brief description]
                                 *   - Why it started: the gap in practical, mentor-led training in Uganda
                                 */}
                                <p className="mt-5 text-base leading-8 text-ink-600">
                                    ResNet Academy was founded with one observation: talented people
                                    across Uganda were struggling to break into tech — not from lack
                                    of ability, but lack of access to practical, mentor-supported
                                    training.
                                </p>
                                <p className="mt-4 text-base leading-8 text-ink-600">
                                    We started with a small cohort, a project-first curriculum, and
                                    a belief that structured mentorship changes outcomes. Our first
                                    cohort graduated in 2023. Since then, we have trained over 200
                                    learners across Uganda and East Africa.
                                </p>

                                {/* Milestone */}
                                <div className="mt-6 inline-flex items-start gap-3 rounded-xl border border-border bg-surface-50 px-4 py-3">
                                    <GraduationCap className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                                    <p className="text-sm leading-6 text-ink-600">
                                        <span className="font-semibold text-ink-900">First cohort, 2023</span> —
                                        12 learners completed the Frontend Foundations course and
                                        published live portfolio sites.
                                    </p>
                                </div>

                                {/* Mission points */}
                                <ul className="mt-8 space-y-4">
                                    {missionPoints.map(({ icon: Icon, title, description }) => (
                                        <li key={title} className="flex items-start gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                                <Icon className="size-5 text-primary" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-ink-900">{title}</p>
                                                <p className="text-sm text-ink-600">{description}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Right — different photo from hero */}
                            <div className="overflow-hidden rounded-2xl shadow-sm lg:sticky lg:top-8">
                                <img
                                    src="/images/banner.jpg"
                                    alt="ResNet Academy team and students"
                                    className="h-full w-full object-cover"
                                    style={{ minHeight: '400px' }}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* §3 Who we serve ────────────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Who we serve
                        </p>
                        <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">
                            Built for anyone ready to build a career in tech.
                        </h2>
                        <div className="mt-8 flex flex-wrap gap-3">
                            {whoWeServe.map(({ icon: Icon, label }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink-600"
                                >
                                    <Icon className="size-4 text-primary" aria-hidden="true" />
                                    {label}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* §4 Verified results ────────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            By the numbers
                        </p>
                        <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">
                            Results we can stand behind.
                        </h2>
                        <dl className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
                            {stats.map(({ value, label, note }) => (
                                <div key={label} className="flex flex-col rounded-xl border border-border bg-surface-50 px-5 py-6">
                                    <dd className="text-4xl font-bold text-primary">{value}</dd>
                                    <dt className="mt-1 text-sm font-medium text-ink-900">{label}</dt>
                                    <p className="mt-1 text-xs text-ink-300">{note}</p>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-4 text-xs text-ink-300">
                            Academy records, 2023–2026. Figures updated each cohort cycle.
                        </p>
                    </div>
                </section>

                {/* §5 How learning works ──────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-12 lg:grid-cols-2">

                            {/* Steps */}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                    The process
                                </p>
                                <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">
                                    How learning works.
                                </h2>
                                <div className="mt-8 space-y-0">
                                    {steps.map(({ number, icon: Icon, title, outcome }, index) => (
                                        <div key={number} className="flex gap-4">
                                            <div className="flex flex-col items-center">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white text-sm font-bold text-primary">
                                                    {number}
                                                </div>
                                                {index < steps.length - 1 && (
                                                    <div
                                                        aria-hidden="true"
                                                        className="mt-1 w-px flex-1"
                                                        style={{ borderLeft: '2px dashed var(--color-primary)', minHeight: '40px' }}
                                                    />
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

                            {/* Light enrolment prompt */}
                            <div className="flex items-center">
                                <div className="w-full rounded-xl border border-border bg-white p-8">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                        Ready to start?
                                    </p>
                                    <h3 className="mt-3 text-2xl text-ink-900">
                                        Join the next cohort.
                                    </h3>
                                    <p className="mt-3 text-sm leading-7 text-ink-600">
                                        Cohorts are capped so every learner gets mentor time.
                                        Browse available courses and check upcoming intake dates.
                                    </p>
                                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                        <Link
                                            to="/courses"
                                            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                        >
                                            Explore courses
                                        </Link>
                                        <Link
                                            to="/contact"
                                            className="inline-flex items-center justify-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                        >
                                            Talk to us
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* §6 Values ──────────────────────────────────────────────── */}
                <section className="border-t border-border bg-navy px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                            What drives us
                        </p>
                        <h2 className="mt-3 text-3xl text-navy-foreground sm:text-4xl">
                            Practical skills change lives.
                        </h2>
                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {values.map(({ icon: Icon, title, description }) => (
                                <div key={title} className="flex flex-col gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                                        <Icon className="size-5 text-white" aria-hidden="true" />
                                    </div>
                                    <p className="text-sm font-semibold text-white">{title}</p>
                                    <p className="text-sm leading-6 text-navy-foreground/70">{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* §7 Mentors ─────────────────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            The team
                        </p>
                        <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">
                            How our mentors support you.
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-7 text-ink-600">
                            Every learner is supported by an experienced mentor throughout their
                            course — not just during lessons, but between sessions too.
                        </p>

                        {/*
                         * TODO: Replace with real mentor profiles when ready.
                         * Each mentor card should show:
                         *   - Real photograph
                         *   - Full name
                         *   - Speciality (e.g. "Frontend Development")
                         *   - Years of experience or company background
                         *   - LinkedIn profile link
                         */}
                        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                { icon: Code2, title: 'Code reviews', description: 'Mentors review every project submission with line-level feedback.' },
                                { icon: MessageSquare, title: 'Weekly check-ins', description: 'Short weekly sessions to answer questions and unblock progress.' },
                                { icon: Briefcase, title: 'Career guidance', description: 'CV reviews, portfolio advice, and direct employer introductions.' },
                            ].map(({ icon: Icon, title, description }) => (
                                <div key={title} className="flex items-start gap-4 rounded-xl border border-border bg-white p-5">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
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

                {/* §8 Learner story ───────────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Graduate outcomes
                        </p>
                        <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">
                            From learner to employed.
                        </h2>

                        {/*
                         * TODO: Replace with a real graduate story.
                         * Suggested content:
                         *   - Graduate name, course, cohort year
                         *   - What they were doing before
                         *   - What they built during the course
                         *   - Where they are now (job title, company)
                         *   - One direct quote
                         *   - Real photograph
                         */}
                        <div className="mt-8 rounded-2xl border border-border bg-surface-50 p-8">
                            <p className="text-sm font-semibold uppercase tracking-widest text-ink-300">
                                Coming soon
                            </p>
                            <p className="mt-2 text-base text-ink-600">
                                We are collecting verified graduate stories from our 2024 and 2025
                                cohorts. Check back soon — or{' '}
                                <Link to="/contact" className="text-primary underline hover:no-underline">
                                    contact us
                                </Link>{' '}
                                if you are a graduate who would like to share yours.
                            </p>
                        </div>
                    </div>
                </section>

                {/* §9 Final action ────────────────────────────────────────── */}
                <section className="border-t border-border bg-surface-50 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-2xl text-ink-900 sm:text-3xl">
                                    Ready to take the next step?
                                </h2>
                                <p className="mt-2 text-sm leading-7 text-ink-600">
                                    Browse our courses, check upcoming cohort dates, or reach out
                                    if you need help choosing the right path.
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-3">
                                <Link
                                    to="/courses"
                                    className="inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    Explore courses
                                </Link>
                                <Link
                                    to="/contact"
                                    className="inline-flex items-center rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                >
                                    Contact us
                                </Link>
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
