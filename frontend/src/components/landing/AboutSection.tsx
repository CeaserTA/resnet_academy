import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Link } from 'react-router';

const highlights = [
    { label: 'Project-based curriculum', detail: '— build real things from day one' },
    { label: 'Mentors with real-world industry experience', detail: '' },
    { label: 'Cohort-based learning', detail: 'so you grow alongside peers' },
    { label: 'Career support', detail: '— portfolio reviews and job connections' },
];

export function AboutSection() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { threshold: 0.12 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section id="about" ref={ref} className="bg-white py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                    className={`grid items-center gap-12 transition-all duration-700 lg:grid-cols-2 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                        }`}
                >
                    {/* ── Left: image ── */}
                    <div className="relative">
                        <div className="overflow-hidden rounded-2xl">
                            <img
                                src="/images/online_study.jpg"
                                alt="ResNet Academy students working on projects"
                                className="h-[420px] w-full object-cover object-center"
                            />
                        </div>
                        {/* Floating badge — bottom centre */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-baseline gap-1.5 rounded-xl border border-border bg-white px-5 py-3 shadow-md whitespace-nowrap">
                            <span className="text-2xl font-bold text-primary">500+</span>
                            <span className="text-xs text-ink-600">Learners trained since 2023</span>
                        </div>
                    </div>

                    {/* ── Right: text ── */}
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Who we are
                        </p>

                        <h2 className="mt-3 text-3xl text-ink-900 sm:text-4xl">
                            Welcome to<br />ResNet Academy
                        </h2>

                        <p className="mt-5 text-base leading-7 text-ink-600">
                            We're a hands-on tech training school for learners across Uganda
                            and East Africa. You learn modern web technologies through real
                            projects and guided mentorship — and you leave with a portfolio,
                            a certificate, and a community behind you.
                        </p>

                        <ul className="mt-6 space-y-3" aria-label="What sets us apart">
                            {highlights.map(({ label, detail }) => (
                                <li key={label} className="flex items-start gap-3">
                                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                                    <span className="text-sm leading-6 text-ink-600">
                                        <strong className="font-semibold text-ink-900">{label}</strong>
                                        {detail ? ` ${detail}` : ''}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                to="/courses"
                                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                Browse courses
                            </Link>
                            <Link
                                to="/#cohorts"
                                className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-ink-900 transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                See upcoming cohorts
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
