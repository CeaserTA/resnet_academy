import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, ArrowRight, Monitor, Users } from 'lucide-react';
import { CircularText } from '@/components/ui/CircularText';

interface HeroProps {
    onJoinCohortClick: () => void;
}

export function Hero({ onJoinCohortClick }: HeroProps) {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/courses?q=${encodeURIComponent(query.trim())}`);
        } else {
            navigate('/courses');
        }
    };

    return (
        <section className="relative overflow-hidden bg-blue-100 py-2">
            {/* Circular text — top left corner, purely decorative */}
            <div className="absolute left-4 top-4 z-10 hidden lg:block">
                <CircularText
                    text="RESNET ACADEMY • RESNET ACADEMY • "
                    radius={62}
                    duration={12}
                    direction="clockwise"
                />
            </div>
            <div className="mx-auto max-w-7xl pl-4 pr-4 sm:pl-8 sm:pr-6 lg:pl-4 lg:pr-8">

                {/* Both columns share the same top baseline — items-start, not items-center */}
                <div className="grid gap-10 py-10 lg:grid-cols-2 lg:items-start lg:py-14">

                    {/* ── Left: text + search + stats + trust strip ── */}
                    <div className="flex flex-col pt-2">

                        {/* Badge */}
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5">
                            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                            <span className="text-xs font-semibold text-primary">
                                Online &amp; In-Person Learning
                            </span>
                        </div>

                        {/* Heading */}
                        <h1 className="mt-5 text-4xl leading-[1.1] text-ink-900 sm:text-5xl xl:text-5xl">
                            Learn. Build. <span className="text-primary">Launch.</span>
                        </h1>

                        {/* Subheading */}
                        <p className="mt-5 max-w-md text-base leading-7 text-ink-600">
                            Hands-on projects, expert mentors, and career-focused training
                            to help you land your first tech role — at your own pace.
                        </p>

                        {/* Search bar */}
                        <form
                            onSubmit={handleSearch}
                            className="mt-8 flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                            role="search"
                        >
                            <Search className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="What do you want to learn today?"
                                aria-label="Search courses"
                                className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus-visible:outline-none"
                            />
                            <button
                                type="submit"
                                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                Search
                                <ArrowRight className="size-3.5" aria-hidden="true" />
                            </button>
                        </form>

                        {/* Stats row */}
                        <div className="mt-8 flex flex-wrap gap-8">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                                    <Monitor className="size-5 text-primary" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-ink-900">100+</p>
                                    <p className="text-xs text-ink-600">Total active students</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                                    <Users className="size-5 text-primary" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-ink-900">150+</p>
                                    <p className="text-xs text-ink-600">Graduates in tech careers</p>
                                </div>
                            </div>
                        </div>

                        {/* Trust strip */}
                        <div className="mt-8 border-t border-border pt-6">
                            <p className="text-xs font-semibold uppercase tracking-widest text-ink-300">
                                Trusted by students from
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                                {['Makerere University', 'NITA-U', 'Stanbic Bank', 'MTN Uganda', 'Airtel Uganda'].map((name) => (
                                    <span key={name} className="text-xs font-medium text-ink-300">
                                        {name}
                                    </span>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* ── Right: image fills column top-to-bottom, cards anchor to edges ── */}
                    <div className="relative hidden lg:flex lg:flex-col">

                        {/* Image fills the full column height — no fixed px height */}
                        <div
                            className="group relative overflow-hidden"
                            style={{
                                clipPath: 'polygon(6% 0%, 100% 0%, 94% 100%, 0% 100%)',
                                borderRadius: '1.5rem',
                                minHeight: '420px',
                            }}
                        >
                            <img
                                src="/images/banner.jpg"
                                alt="ResNet Academy students learning together"
                                className="absolute inset-0 h-full w-full object-cover object-left transition-transform duration-500 group-hover:scale-105"
                            />
                        </div>

                        {/* Floating card — top right edge: active courses */}
                        <div className="absolute right-2 top-3 flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-md">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                                <Monitor className="size-4 text-primary" aria-hidden="true" />
                            </div>
                            <div>
                                <p className="text-lg font-bold leading-none text-ink-900">50+</p>
                                <p className="mt-0.5 text-xs text-ink-600">Active Courses</p>
                            </div>
                        </div>

                        {/* Floating card — bottom left edge: instructors */}
                        <div className="absolute bottom-3 left-2 flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-md">
                            <div className="flex -space-x-2" aria-hidden="true">
                                {[
                                    { color: 'bg-blue-600', letter: 'A' },
                                    { color: 'bg-amber-500', letter: 'B' },
                                    { color: 'bg-success-600', letter: 'C' },
                                    { color: 'bg-danger-600', letter: 'D' },
                                ].map(({ color, letter }) => (
                                    <div
                                        key={letter}
                                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white ${color}`}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-ink-300">
                                    Instructors
                                </p>
                                <p className="text-sm font-bold text-ink-900">20+ Experts</p>
                            </div>
                        </div>

                    </div>

                    {/* Mobile image */}
                    <div className="overflow-hidden rounded-2xl lg:hidden">
                        <img
                            src="/images/banner.jpg"
                            alt="ResNet Academy students learning together"
                            className="h-64 w-full object-cover object-left"
                        />
                    </div>

                </div>
            </div>
        </section>
    );
}
