import { Button } from '@/components/ui/Button';
import { ChevronRight } from 'lucide-react';

interface HeroProps {
    onGetStartedClick: () => void;
    onBrowseCoursesClick?: () => void;
}

export function Hero({ onGetStartedClick, onBrowseCoursesClick }: HeroProps) {
    const handleBrowseCourses = () => {
        if (onBrowseCoursesClick) {
            onBrowseCoursesClick();
        } else {
            // Fallback: smooth scroll to courses section
            document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section className="bg-[#fafbfc] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-6xl">
                <div className="grid gap-12 items-center lg:grid-cols-2">
                    {/* Left Column: Text + CTAs */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h1 className="font-display text-5xl font-bold leading-tight text-ink-900 sm:text-6xl">
                                Learn Anything, Anywhere
                            </h1>
                            <p className="text-lg text-[#94a3b8]">
                                Unlock your potential with expert-led courses designed to help you master new skills at your own pace.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={onGetStartedClick}
                                className="sm:w-auto"
                            >
                                Get Started
                                <ChevronRight className="ml-2 size-4" aria-hidden="true" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleBrowseCourses}
                                className="sm:w-auto"
                            >
                                Browse Courses
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Banner Image */}
                    <div className="relative h-96 overflow-hidden rounded-2xl bg-surface-100 sm:h-full lg:h-96">
                        <img
                            src="/images/hero.jpg"
                            alt="Learning illustration"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
