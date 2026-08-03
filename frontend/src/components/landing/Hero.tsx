import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { ChevronRight } from 'lucide-react';

interface HeroProps {
    onJoinCohortClick: () => void;
}

export function Hero({ onJoinCohortClick }: HeroProps) {
    const navigate = useNavigate();

    return (
        /* Full-width light-blue background — no inner padding on the section so the
           image bleeds all the way to the right edge on desktop */
        <section className="overflow-hidden bg-[#dbeafe] px-4 sm:px-6 lg:px-0">
            <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-2 lg:items-stretch">

                {/* ── Left: text block ── */}
                <div className="flex flex-col justify-center py-16 px-0 lg:py-24 lg:pl-8 xl:pl-0">
                    <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl xl:text-6xl">
                        Learn. Build. Launch.
                    </h1>

                    <p className="mt-5 max-w-lg text-lg leading-8 text-[#334155]">
                        Hands-on projects, expert mentors, and career-focused training to help
                        you land your first tech role in Uganda.
                    </p>

                    {/* CTAs */}
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={onJoinCohortClick}
                            className="bg-blue-600 hover:bg-blue-700 sm:w-auto"
                        >
                            Join Cohort
                            <ChevronRight className="ml-1 size-4" aria-hidden="true" />
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => navigate('/courses#cohorts')}
                            className="border-blue-600 text-blue-700 hover:bg-blue-100 sm:w-auto"
                        >
                            View Cohorts
                        </Button>
                    </div>
                </div>

                {/* ── Right: image — no box, no border-radius, bleeds into the bg ── */}
                <div className="relative hidden lg:block">
                    <img
                        src="/images/banner.jpg"
                        alt="ResNet Academy student"
                        className="absolute inset-0 h-full w-full object-cover object-top"
                    /* object-top keeps the subject (person) visible; adjust to
                       object-center if your banner.jpg is centre-cropped */
                    />
                    {/* Gradient fade on the left edge so the image blends into the bg color */}
                    <div
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#dbeafe] to-transparent"
                    />
                </div>

                {/* Mobile: image below text, full-width, no bleed needed */}
                <div className="mt-8 h-64 w-full overflow-hidden lg:hidden">
                    <img
                        src="/images/banner.jpg"
                        alt="ResNet Academy student"
                        className="h-full w-full object-cover object-top"
                    />
                </div>

            </div>
        </section>
    );
}
