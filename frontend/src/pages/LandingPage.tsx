import { useEffect } from 'react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAuthModal } from '@/lib/auth/AuthModalContext';
import { Hero } from '@/components/landing/Hero';
import { CoursePreviews } from '@/components/landing/CoursePreviews';
import { CohortSection } from '@/components/landing/CohortSection';
import { Features } from '@/components/landing/Features';
import { Testimonials } from '@/components/landing/Testimonials';
import { Footer } from '@/components/landing/Footer';

export function LandingPage() {
    const { user } = useAuth();
    const { openAuth } = useAuthModal();

    const handleLoginClick = () => openAuth('login');
    const handleSignupClick = () => openAuth('signup');

    useEffect(() => {
        if (window.location.hash === '#courses') {
            document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    return (
        <div>
            <LandingHeader
                isAuthenticated={!!user}
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
            />

            <main>
                {/* Hero Section */}
                <Hero
                    onJoinCohortClick={handleSignupClick}
                />

                {/* Course Previews Section */}
                <CoursePreviews />

                {/* Cohort Schedule Section */}
                <CohortSection />

                {/* Features Section */}
                <Features />

                {/* Testimonials Section */}
                <Testimonials />

                {/* Footer Section */}
                <Footer onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
            </main>
        </div>
    );
}
