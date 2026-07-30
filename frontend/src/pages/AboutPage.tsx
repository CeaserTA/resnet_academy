import { useState } from 'react';
import { BookOpen, Code2, FolderOpen, GraduationCap, Globe, Rocket, TrendingUp, Users } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { AuthModal, type AuthMode } from '@/components/landing/AuthModal';
import { Button } from '@/components/ui/Button';

type ModalState = AuthMode | null;

const stats = [
    { value: '95%', label: 'Course completion rate' },
    { value: '80%', label: 'Job placement within 6 months' },
    { value: '120+', label: 'Real projects created' },
];

const missionPoints = [
    {
        icon: FolderOpen,
        title: 'Project-Based Curriculum',
        description: 'Every module includes a real project to build, review, and deploy — so you graduate with a portfolio, not just a certificate.',
    },
    {
        icon: Users,
        title: 'Mentor-Led Guidance',
        description: 'Experienced mentors provide code reviews, pair programming sessions, and career advice at every stage of the programme.',
    },
];

const mentors = [
    {
        initials: 'AA',
        name: 'Alice A.',
        role: 'Front-end Mentor',
        skills: 'React, CSS',
        quote: "I help students go from zero to building polished, responsive interfaces they're proud to ship.",
        avatarGradient: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
        avatarText: '#1d4ed8',
    },
    {
        initials: 'BK',
        name: 'Ben K.',
        role: 'Back-end Mentor',
        skills: 'Node, Databases',
        quote: 'Good back-end work is invisible — I teach students to build systems that just work, reliably.',
        avatarGradient: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 100%)',
        avatarText: '#92400e',
    },
    {
        initials: 'CM',
        name: 'Clara M.',
        role: 'DevOps & Deployments',
        skills: 'CI/CD, Cloud, Linux',
        quote: 'Shipping code to production is a skill. I make sure every graduate knows how to do it confidently.',
        avatarGradient: 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
        avatarText: '#065f46',
    },
];

const beliefs = [
    {
        icon: Globe,
        title: 'Access should be universal.',
        description: 'Quality tech education should not depend on geography or income. We build programmes that work for learners across Uganda and East Africa.',
    },
    {
        icon: Users,
        title: 'Learning is better together.',
        description: 'Community accelerates growth. Every learner at ResNet is part of a cohort — with peers, mentors, and code reviewers walking the same path.',
    },
    {
        icon: TrendingUp,
        title: 'Skills should open doors.',
        description: 'We measure success by career outcomes — not course completions. Every module is designed with the job market in mind.',
    },
    {
        icon: GraduationCap,
        title: 'Real work beats theory.',
        description: 'Reading about code is not the same as writing it. Every concept we teach is applied to something you build, deploy, and can show to an employer.',
    },
];

const steps = [
    {
        number: 1,
        icon: BookOpen,
        title: 'Learn the fundamentals',
        description: 'Start with structured lessons covering core web technologies — HTML, CSS, JavaScript, and your chosen back-end stack — guided by your mentor from day one.',
    },
    {
        number: 2,
        icon: Code2,
        title: 'Build real projects',
        description: 'Apply what you learn immediately. Every module ends with a project you build, get reviewed on, and deploy to a live URL — real work, not toy examples.',
    },
    {
        number: 3,
        icon: Rocket,
        title: 'Launch your career',
        description: 'Finish with a polished portfolio, a verifiable certificate, and direct support from mentors connecting you with employers and freelance opportunities.',
    },
];

export function AboutPage() {
    const [modalState, setModalState] = useState<ModalState>(null);

    const handleLoginClick = () => setModalState('login');
    const handleSignupClick = () => setModalState('signup');
    const closeModal = () => setModalState(null);

    return (
        <div>
            <LandingHeader onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />

            <main>
                {/* §1. Hero — bg-[#dbeafe] */}
                <section className="bg-[#dbeafe] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid items-center gap-12 lg:grid-cols-2">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                    About ResNet Academy
                                </p>
                                <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
                                    Building practical developers,
                                    <br className="hidden sm:block" /> one project at a time.
                                </h1>
                                <p className="mt-6 text-lg leading-8 text-[#64748b]">
                                    ResNet Academy provides guided mentorship, hands-on projects, and
                                    career-focused training so learners gain the skills employers want.
                                </p>
                                <div className="mt-8">
                                    <Button variant="primary" size="lg" onClick={handleSignupClick}>
                                        Get Started — it's free
                                    </Button>
                                </div>
                            </div>

                            {/* TODO: swap bottom two tiles for distinct photos when available */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 h-52 overflow-hidden rounded-2xl shadow-sm">
                                    <img src="/images/students.jpg" alt="ResNet Academy students" className="h-full w-full object-cover" />
                                </div>
                                <div className="h-40 overflow-hidden rounded-2xl shadow-sm">
                                    <img src="/images/students.jpg" alt="ResNet Academy students" className="h-full w-full object-cover object-right" />
                                </div>
                                <div className="h-40 overflow-hidden rounded-2xl shadow-sm">
                                    <img src="/images/students.jpg" alt="ResNet Academy students" className="h-full w-full object-cover object-left" />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* §2. Our Story — bg-white */}
                <section className="border-t border-[#e8ecf1] bg-white px-4 py-14 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid items-start gap-12 lg:grid-cols-2">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                    Our story
                                </p>
                                <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                    How ResNet Academy started.
                                </h2>
                                {/* TODO: Replace with real founding story once content is ready */}
                                <p className="mt-6 text-base leading-7 text-[#64748b]">
                                    ResNet Academy was founded with a simple observation: talented people
                                    across Uganda were struggling to break into tech — not because of a
                                    lack of ability, but because of a lack of access to practical,
                                    mentor-supported training. We started with a small cohort, a
                                    project-first curriculum, and a belief that structured mentorship
                                    could change outcomes. That belief has guided every decision since.
                                </p>
                                <p className="mt-4 text-base leading-7 text-[#64748b]">
                                    Today, our graduates are working at companies across East Africa and
                                    beyond. We are still small, still focused, and still convinced that
                                    the best way to learn is to build something real.
                                </p>

                                <ul className="mt-8 space-y-5">
                                    {missionPoints.map(({ icon: Icon, title, description }) => (
                                        <li key={title} className="flex gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-blue-600">
                                                <Icon className="size-5" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-ink-900">{title}</p>
                                                <p className="mt-1 text-sm leading-6 text-[#64748b]">{description}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* TODO: replace with a distinct team/campus photo */}
                            <div className="overflow-hidden rounded-2xl shadow-sm lg:sticky lg:top-8">
                                <img
                                    src="/images/students.jpg"
                                    alt="ResNet Academy students working together"
                                    className="h-full w-full object-cover"
                                    style={{ minHeight: '400px' }}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* §3. By the Numbers — bg-[#eff6ff] */}
                <section className="border-t border-[#e8ecf1] bg-[#eff6ff] px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-3xl text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                By the numbers
                            </p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                Results that speak for themselves.
                            </h2>
                        </div>
                        <dl className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
                            {stats.map(({ value, label }) => (
                                <div
                                    key={label}
                                    className="flex flex-col items-center rounded-2xl border border-[#e8ecf1] bg-white px-6 py-8 text-center shadow-sm"
                                >
                                    <dd className="text-5xl font-bold text-blue-600">{value}</dd>
                                    <dt className="mt-2 text-sm font-medium text-[#64748b]">{label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* §4. How It Works + CTA — two-column, bg-white */}
                <section className="border-t border-[#e8ecf1] bg-white px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid items-stretch gap-12 lg:grid-cols-2">

                            {/* Left — process tagline + steps with blue connector line */}
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                    The process
                                </p>
                                <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                    How it works.
                                </h2>
                                <p className="mt-3 text-base leading-7 text-[#64748b]">
                                    Three clear stages — learn, build, and launch your career.
                                </p>
                                <div className="mt-8 space-y-0">
                                    {steps.map(({ number, icon: Icon, title, description }, index) => (
                                        <div key={number} className="flex gap-4">
                                            {/* Number + vertical blue line connector */}
                                            <div className="flex flex-col items-center">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-sm font-bold text-blue-600 shadow-sm">
                                                    0{number}
                                                </div>
                                                {/* Dotted blue line connecting to next step */}
                                                {index < steps.length - 1 && (
                                                    <div
                                                        aria-hidden="true"
                                                        className="mt-1 w-px flex-1"
                                                        style={{
                                                            borderLeft: '2px dashed #3b82f6',
                                                            minHeight: '48px',
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* Step content — pb-8 on all except last */}
                                            <div className={index < steps.length - 1 ? 'pb-8' : ''}>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                                                        <Icon className="size-3.5" aria-hidden="true" />
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
                                                </div>
                                                <p className="mt-1.5 text-sm leading-6 text-[#64748b]">{description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right — CTA card stretches to match left column height */}
                            <div className="flex">
                                <div className="flex w-full flex-col justify-center rounded-2xl bg-[#eff6ff] p-8 lg:p-10">
                                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                        Join us
                                    </p>
                                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                                        Join the community and start learning today.
                                    </h2>
                                    <p className="mt-4 text-base leading-7 text-[#64748b]">
                                        Thousands of learners across Uganda are already building projects,
                                        earning certificates, and landing tech roles. Your turn.
                                    </p>
                                    <div className="mt-6">
                                        <Button variant="primary" size="lg" onClick={handleSignupClick}>
                                            Get Started — it's free
                                        </Button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* §5. What We Believe — bg-[#3b82f6] */}
                <section className="bg-[#3b82f6] px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-2xl text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-100">
                                Our values
                            </p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                We believe
                            </h2>
                            <p className="mt-2 text-xl font-semibold text-white/90">
                                Practical skills change lives.
                            </p>
                        </div>
                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {beliefs.map(({ icon: Icon, title, description }) => (
                                <div key={title} className="flex flex-col items-center text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                                        <Icon className="size-6 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-blue-100">{description}</p>
                                </div>
                            ))}
                        </div>
                        <p className="mx-auto mt-10 max-w-xl text-center text-lg font-bold text-white">
                            So that anyone in Uganda can build a career in tech.
                        </p>
                    </div>
                </section>

                {/* §6. Meet Our Mentors — bg-[#fafbfc] */}
                <section className="border-t border-[#e8ecf1] bg-[#fafbfc] px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto mb-8 max-w-3xl text-center">
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                                The team
                            </p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                                Meet our mentors.
                            </h2>
                            <p className="mt-3 text-base leading-7 text-[#64748b]">
                                Every learner works closely with mentors who have shipped real products
                                and know what it takes to get hired.
                            </p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            {mentors.map(({ initials, name, role, skills, quote, avatarGradient, avatarText }) => (
                                <div
                                    key={name}
                                    className="flex flex-col items-center rounded-2xl border border-[#e8ecf1] bg-white p-8 text-center shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    {/* TODO: replace gradient div with <img src={photo} ... /> when mentor photos are available */}
                                    <div
                                        className="flex h-20 w-20 items-center justify-center rounded-full text-xl font-bold shadow-md"
                                        style={{ background: avatarGradient, color: avatarText }}
                                    >
                                        {initials}
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-ink-900">{name}</h3>
                                    <p className="text-sm text-[#94a3b8]">{role}</p>
                                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-blue-600">{skills}</p>
                                    <blockquote className="mt-4 text-sm leading-6 text-[#64748b] italic">
                                        "{quote}"
                                    </blockquote>
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
