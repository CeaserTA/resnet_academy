import { Link } from 'react-router';
import { ArrowRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';

const HERO_IMAGE_URL =
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?fm=jpg&q=80&w=1920&auto=format&fit=crop';

function scrollToCourseGrid() {
    document.getElementById('course-grid')?.scrollIntoView({ behavior: 'smooth' });
}

export function HeroSection() {
    const { user, isLoading } = useAuth();

    return (
        <section className="relative overflow-hidden">
            <img src={HERO_IMAGE_URL} alt="" loading="eager" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 via-blue-900/70 to-blue-900/40" />

            <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
                <h1 className="max-w-2xl text-4xl text-surface-0 sm:text-5xl">Learn on your schedule, at your pace</h1>
                <p className="mt-4 max-w-xl text-lg text-surface-0/85">
                    Self-paced courses with real instructors, structured modules, and a certificate when you finish.
                    Enrol in minutes and pick up right where you left off.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                    <Button onClick={scrollToCourseGrid} className="px-6 py-3">
                        <Compass className="size-4" aria-hidden="true" />
                        Browse courses
                    </Button>

                    {!isLoading && !user && (
                        <Link to="/register">
                            <Button variant="secondary" className="border-surface-0 bg-transparent px-6 py-3 text-surface-0 hover:bg-surface-0/10">
                                Create free account
                                <ArrowRight className="size-4" aria-hidden="true" />
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
