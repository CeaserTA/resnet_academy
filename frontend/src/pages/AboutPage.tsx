import { useState } from 'react';
import { BookOpen, Briefcase, Code2, Rocket, Server, Terminal } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { AuthModal, type AuthMode } from '@/components/landing/AuthModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ModalState = AuthMode | null;

// ─── data ────────────────────────────────────────────────────────────────────

const missionCards = [
    {
        title: 'Project-Based Curriculum',
        description:
            'Every module includes a real project to build, review, and deploy — so you graduate with a portfolio, not just a certificate.',
    },
    {
        title: 'Mentor-Led Guidance',
        description:
            'Experienced mentors provide code reviews, pair programming sessions, and career advice at every stage of the programme.',
    },
];

const stats = [
    { value: '95%', label: 'Course completion rate' },
    { value: '80%', label: 'Job placement within 6 months' },
    { value: '120+', label: 'Real projects created' },
];

const mentors = [
    {
        initials: 'AA',
        name: 'Alice A.',
        role: 'Front-end Mentor',
        skills: 'React, CSS',
        color: 'bg-blue-50 text-blue-700',
    },
    {
        initials: 'BK',
        name: 'Ben K.',
        role: 'Back-end Mentor',
        skills: 'Node, Databases',
        color: 'bg-amber-50 text-amber-700',
    },
    {
        initials: 'CM',
        name: 'Clara M.',
        role: 'DevOps & Deployments',
        skills: 'CI/CD, Cloud, Linux',
        color: 'bg-green-50 text-green-700',
    },
];

const steps = [
    {
        number: '01',
        icon: BookOpen,
        title: 'Learn the fundamentals',
        description:
            'Start with structured lessons covering core web technologies — HTML, CSS, JavaScript, and your chosen back-end stack — guided by your mentor from day one.',
    },
    {
        number: '02',
        icon: Code2,
        title: 'Build real projects',
        description:
            'Apply what you learn immediately. Every module ends with a project you build, get reviewed on, and deploy to a live URL — real work, not toy examples.',
    },
    {
        number: '03',
        icon: Rocket,
        title: 'Launch your career',
        description:
            'Finish with a polished portfolio, a verifiable certificate, and direct support from mentors connecting you with employers and freelance opportunities.',
    },
];

// ─── component ───────────────────────────────────────────────────────────────

export function AboutPage() {
    const [modalState, setModalState] = useState<ModalState>(null);

    const handleLoginClick = () => setModalState('login');
    const handleSignupClick = () => setModalState('signup');
    const closeModal = () => setModalState(null);

    return (
        <div>
            <LandingHeader onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />

            <main>
                {/* ── 1. Hero ─────────────────────────────────────────────── */}
                <section className="bg-[#fafbfc] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                            About ResNet Academy
                        </p>
                        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
                            Building practical developers,<br className="hidden sm:block" /> one project at a time.
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-[#64748b]">
                            ResNet Academy provides guided mentorship, hands-on projects, and
                            career-focused training so learners gain the skills employers want.
                        </p>
                    </div>
                </section>

                {/* ── 2. Our Mission ──────────────────────────────────────── */}
                <section className="border-t border-[#e8ecf1] bg-[#eff6ff] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="mx-auto max-w-3xl text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                Our mission
                            </p>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                From learning to doing.
                            </h2>
                            <p className="mt-4 text-base leading-7 text-[#64748b] sm:text-lg">
                                We help aspiring developers move from learning to doing. Our curriculum is
                                project-first and mentor-led, focused on web technologies, deployment, and
                                career outcomes.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 sm:grid-cols-2">
                            {missionCards.map(({ title, description }) => (
                                <Card
                                    key={title}
                                    className="rounded-2xl border border-blue-100 bg-white p-0"
                                >
                                    <CardHeader className="p-6 pb-2">
                                        <CardTitle className="text-base">{title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 pt-0">
                                        <p className="text-sm leading-6 text-[#64748b]">{description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 3. By the Numbers ───────────────────────────────────── */}
                <section className="border-t border-[#e8ecf1] bg-white px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl">
                        <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                            By the numbers
                        </p>
                        <dl className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
                            {stats.map(({ value, label }) => (
                                <div key={label} className="text-center">
                                    <dd className="text-4xl font-bold text-blue-600">{value}</dd>
                                    <dt className="mt-2 text-sm font-medium text-[#64748b]">{label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* ── 4. Meet Our Mentors ─────────────────────────────────── */}
                <section className="border-t border-[#e8ecf1] bg-[#fafbfc] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="mx-auto mb-12 max-w-3xl text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                The team
                            </p>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                Meet our mentors.
                            </h2>
                            <p className="mt-4 text-base leading-7 text-[#64748b]">
                                Every learner works closely with mentors who have shipped real products and
                                know what it takes to get hired.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-3">
                            {mentors.map(({ initials, name, role, skills, color }) => (
                                <Card
                                    key={name}
                                    className="rounded-3xl border border-[#e8ecf1] bg-white p-0 px-6 py-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <CardHeader className="flex items-start gap-4 p-0 pb-4">
                                        <div className={`flex h-12 w-12 items-center justify-center rounded-full font-semibold ${color}`}>
                                            {initials}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{name}</CardTitle>
                                            <p className="text-sm text-[#64748b]">{role}</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0 pt-2">
                                        <p className="text-sm leading-6 text-[#64748b]">
                                            <span className="font-medium text-ink-900">Specialties: </span>
                                            {skills}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── 5. How It Works ─────────────────────────────────────── */}
                <section className="border-t border-[#e8ecf1] bg-[#eff6ff] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="mx-auto mb-12 max-w-3xl text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                The process
                            </p>
                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                How it works.
                            </h2>
                        </div>

                        <div className="grid gap-8 sm:grid-cols-3">
                            {steps.map(({ number, icon: Icon, title, description }) => (
                                <div key={number} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-3xl font-bold text-blue-100">{number}</span>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                                            <Icon className="size-5" aria-hidden="true" />
                                        </div>
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-[#64748b]">{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />

            <AuthModal
                open={modalState !== null}
                mode={modalState ?? 'login'}
                onModeChange={setModalState}
                onClose={closeModal}
            />
        </div>
    );
}
