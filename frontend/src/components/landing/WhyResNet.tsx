import { useEffect, useRef, useState } from 'react';
import {
    GraduationCap, Briefcase, Globe, Code2, Palette, TrendingUp,
    BookOpen, Award, MessageSquare, ClipboardCheck, Bell, Users,
} from 'lucide-react';

const audiences = [
    { icon: GraduationCap, title: 'S.6 Leavers', description: "Perfect next step after A-levels." },
    { icon: Code2, title: 'Aspiring Developers', description: 'Build websites and apps from scratch.' },
    { icon: Palette, title: 'Web Designers', description: 'Bring your designs to life with code.' },
    { icon: Briefcase, title: 'Professionals', description: 'Add tech skills to your existing career.' },
    { icon: TrendingUp, title: 'Entrepreneurs', description: 'Build your own digital products.' },
    { icon: Globe, title: 'Career Changers', description: 'Break into tech from any background.' },
];

const features = [
    { icon: BookOpen, title: 'Real projects', description: 'Build and deploy things you can show employers.' },
    { icon: Users, title: 'Mentor guidance', description: 'Code reviews and career advice at every stage.' },
    { icon: Award, title: 'Certificate', description: 'Publicly verifiable — share on LinkedIn.' },
    { icon: MessageSquare, title: 'Course forums', description: 'Ask questions, get answers from mentors.' },
    { icon: ClipboardCheck, title: 'Structured feedback', description: 'Detailed reviews on every project you submit.' },
    { icon: Bell, title: 'Notifications', description: 'Deadlines and grades straight to your inbox.' },
];

const tabs = ['Who it\'s for', 'What you get'] as const;
type Tab = typeof tabs[number];

export function WhyResNet() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('Who it\'s for');

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    const items = activeTab === 'Who it\'s for' ? audiences : features;

    return (
        <section
            id="why-resnet"
            ref={ref}
            className="relative overflow-hidden border-t border-border bg-surface-50 py-8"
        >
            {/* Watermark background image */}
            <img
                src="/images/resnet_for_everyone.jpg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
            />

            <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* ── Tagline ── */}
                <div
                    className={`mx-auto max-w-2xl text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                        }`}
                >
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        Why ResNet Academy
                    </span>
                    <h2 className="mt-5 text-3xl text-ink-900 sm:text-4xl">
                        Everything you need to go from{' '}
                        <em className="not-italic text-primary">zero to hired.</em>
                    </h2>
                    <p className="mt-4 text-base leading-7 text-ink-600">
                        Hands-on training for anyone ready to build a career in tech —
                        no prior experience required.
                    </p>
                </div>

                {/* ── Tabs ── */}
                <div
                    className={`mt-10 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                        }`}
                >
                    <div className="flex justify-center">
                        <div className="inline-flex rounded-full border border-border bg-white p-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeTab === tab
                                        ? 'bg-primary text-white'
                                        : 'text-ink-600 hover:text-ink-900'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Grid ── */}
                    <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map(({ icon: Icon, title, description }) => (
                            <div key={title} className="flex items-start gap-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                                    <Icon className="size-5 text-primary" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-ink-900">{title}</p>
                                    <p className="mt-0.5 text-sm leading-6 text-ink-600">{description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
