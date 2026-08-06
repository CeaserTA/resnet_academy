import { useEffect, useState } from 'react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { useAuth } from '@/lib/auth/AuthContext';
import { Hero } from '@/components/landing/Hero';
import { CoursePreviews } from '@/components/landing/CoursePreviews';
import { Features } from '@/components/landing/Features';
import { Testimonials } from '@/components/landing/Testimonials';
import { Footer } from '@/components/landing/Footer';
import { AuthModal, type AuthMode } from '@/components/landing/AuthModal';

type ModalState = AuthMode | null;

export function LandingPage() {
    const { user } = useAuth();
    const [modalState, setModalState] = useState<ModalState>(null);

    const handleLoginClick = () => setModalState('login');
    const handleSignupClick = () => setModalState('signup');
    const closeModal = () => setModalState(null);

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
                    onGetStartedClick={handleSignupClick}
                />

                {/* Course Previews Section */}
                <CoursePreviews />

                {/* Features Section */}
                <Features />

                {/* Testimonials Section */}
                <Testimonials />

                {/* Footer Section */}
                <Footer onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
            </main>

            {/* Modals */}
            <AuthModal
                open={modalState !== null}
                mode={modalState ?? 'login'}
                onModeChange={setModalState}
                onClose={closeModal}
            />
        </div>
    );
}
