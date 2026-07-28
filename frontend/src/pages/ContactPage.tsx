import { useState } from 'react';
import { Mail, MapPin, MessageSquare } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { AuthModal, type AuthMode } from '@/components/landing/AuthModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type ModalState = AuthMode | null;

const contactDetails = [
    {
        icon: Mail,
        label: 'Email',
        value: 'hello@resnetacademy.com',
        href: 'mailto:hello@resnetacademy.com',
    },
    {
        icon: MapPin,
        label: 'Location',
        value: 'Kampala, Uganda',
        href: null,
    },
    {
        icon: MessageSquare,
        label: 'Support tickets',
        value: 'Log in and open a ticket for course-specific help.',
        href: null,
    },
];

export function ContactPage() {
    const [modalState, setModalState] = useState<ModalState>(null);
    const [submitted, setSubmitted] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleLoginClick = () => setModalState('login');
    const handleSignupClick = () => setModalState('signup');
    const closeModal = () => setModalState(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder — wire to a real endpoint or email service when ready
        setSubmitted(true);
    };

    return (
        <div>
            <LandingHeader onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />

            <main>
                {/* Hero */}
                <section className="bg-[#fafbfc] px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
                            Get in touch
                        </p>
                        <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
                            We'd love to hear from you.
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-[#64748b]">
                            Questions about a course, partnership enquiries, or just want to say hello —
                            send us a message and we'll get back to you within one business day.
                        </p>
                    </div>
                </section>

                {/* Contact details + form */}
                <section className="border-t border-[#e8ecf1] bg-white px-4 py-20 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="grid gap-16 lg:grid-cols-2">

                            {/* Left — contact info */}
                            <div>
                                <h2 className="text-2xl font-bold text-ink-900">Contact details</h2>
                                <p className="mt-3 text-[#64748b]">
                                    Reach us through any of the channels below.
                                </p>

                                <ul className="mt-8 space-y-6">
                                    {contactDetails.map(({ icon: Icon, label, value, href }) => (
                                        <li key={label} className="flex gap-4">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                                <Icon className="size-5" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-ink-900">{label}</p>
                                                {href ? (
                                                    <a href={href} className="mt-0.5 text-sm text-blue-600 hover:underline">
                                                        {value}
                                                    </a>
                                                ) : (
                                                    <p className="mt-0.5 text-sm text-[#64748b]">{value}</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Right — form */}
                            <div>
                                {submitted ? (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-8 text-center">
                                        <p className="text-2xl">✅</p>
                                        <h3 className="mt-3 text-lg font-semibold text-ink-900">Message sent!</h3>
                                        <p className="mt-2 text-sm text-[#64748b]">
                                            We'll get back to you at {email} within one business day.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                                        <Input
                                            label="Your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                        />
                                        <Input
                                            label="Email address"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-medium text-ink-900">
                                                Message
                                            </label>
                                            <textarea
                                                rows={5}
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                required
                                                className="rounded-md border border-surface-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                                                placeholder="Tell us what's on your mind…"
                                            />
                                        </div>
                                        <Button type="submit" className="w-full">
                                            Send message
                                        </Button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />

            <AuthModal
                open={modalState !== null}
                mode={modalState ?? 'login'}
                onModeChange={setModalState}
                onClose={closeModal}
            />
        </div>
    );
}
