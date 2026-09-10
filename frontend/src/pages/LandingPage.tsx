import { useEffect } from 'react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAuthModal } from '@/lib/auth/AuthModalContext';
import { Hero } from '@/components/landing/Hero';
import { AboutSection } from '@/components/landing/AboutSection';
import { WhyResNet } from '@/components/landing/WhyResNet';
import { CoursePreviews } from '@/components/landing/CoursePreviews';
import { CohortSection } from '@/components/landing/CohortSection';
import { Testimonials } from '@/components/landing/Testimonials';
import { CtaBanner } from '@/components/landing/CtaBanner';
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
                {/* Hero */}
                <Hero onJoinCohortClick={handleSignupClick} />

                {/* About */}
                <AboutSection />

                {/* Why ResNet + What you get — merged */}
                <WhyResNet />

                {/* Course Previews */}
                <CoursePreviews />

                {/* Cohort Schedule */}
                <CohortSection />

                {/* Testimonials */}
                <Testimonials />

                {/* CTA Banner */}
                <CtaBanner onSignupClick={handleSignupClick} />

                {/* Footer */}
                <Footer onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
            </main>
        </div>
    );
}
