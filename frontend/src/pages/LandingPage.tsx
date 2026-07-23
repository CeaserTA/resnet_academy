import { useState } from 'react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { LoginModal } from '@/features/auth/LoginModal';
import { SignupModal } from '@/features/auth/SignupModal';

type ModalState = 'login' | 'signup' | null;

export function LandingPage() {
    const [modalState, setModalState] = useState<ModalState>(null);

    const handleLoginClick = () => setModalState('login');
    const handleSignupClick = () => setModalState('signup');
    const closeModal = () => setModalState(null);

    return (
        <div>
            <LandingHeader
                onLoginClick={handleLoginClick}
                onSignupClick={handleSignupClick}
            />

            <main>
                {/* Hero Section */}
                <Hero
                    onGetStartedClick={handleSignupClick}
                />

                {/* Course Previews Section */}
                <section id="courses" className="border-t border-[#e8ecf1] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-12 h-12 w-64 rounded-lg bg-surface-100">
                            {/* Section title placeholder */}
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div
                                    key={i}
                                    className="h-64 rounded-lg bg-surface-100"
                                >
                                    {/* Course card placeholder */}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <Features />

                {/* Testimonials Section */}
                <section id="testimonials" className="border-t border-[#e8ecf1] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-12 h-12 w-64 rounded-lg bg-surface-100">
                            {/* Section title placeholder */}
                        </div>
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-56 rounded-lg bg-surface-100"
                                >
                                    {/* Testimonial card placeholder */}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Footer Section */}
                <footer className="border-t border-[#e8ecf1] bg-ink-900 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-6xl">
                        <div className="h-32 rounded-lg bg-ink-800">
                            {/* Footer content placeholder */}
                        </div>
                    </div>
                </footer>
            </main>

            {/* Modals */}
            {modalState === 'login' && <LoginModal isOpen onClose={closeModal} />}
            {modalState === 'signup' && <SignupModal isOpen onClose={closeModal} />}
        </div>
    );
}
