import { Link } from 'react-router';
import { MeshBackground } from '@/components/ui/MeshBackground';

interface CtaBannerProps {
    onSignupClick: () => void;
}

export function CtaBanner({ onSignupClick }: CtaBannerProps) {
    return (
        <section className="relative overflow-hidden border-t border-border bg-navy px-4 py-12 sm:px-6 sm:py-14 lg:px-8">

            {/* Animated mesh — sits behind all content */}
            <MeshBackground
                backgroundColor="oklch(0.38 0.15 264)"
                meshColor="rgba(147, 197, 253, 0.45)"
                particleCount={60}
                connectionDistance={150}
                flowSpeed={0.5}
                particleSpeed={0.2}
                lineWidth={0.8}
                nodeSize={1.8}
            />

            {/* Content — sits above the canvas */}
            <div className="relative z-10 mx-auto max-w-3xl text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                    Get started
                </p>
                <h2 className="mt-4 text-3xl text-navy-foreground sm:text-4xl">
                    Your tech career starts here.
                </h2>
                <p className="mt-4 text-base leading-7 text-navy-foreground/60">
                    Join a cohort, build real projects, and graduate with a portfolio
                    that gets you hired — all guided by mentors who've done it themselves.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                        onClick={onSignupClick}
                        className="inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        Apply for a cohort
                    </button>
                    <Link
                        to="/courses"
                        className="inline-flex items-center rounded-full border border-navy-foreground/20 px-7 py-3 text-sm font-semibold text-navy-foreground transition-colors hover:border-navy-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        Browse courses
                    </Link>
                </div>
            </div>

        </section>
    );
}
