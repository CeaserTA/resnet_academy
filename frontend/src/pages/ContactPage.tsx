import { useState } from 'react';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { AuthModal, type AuthMode } from '@/components/landing/AuthModal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type ModalState = AuthMode | null;

const inquiryOptions = [
    { label: 'Course enquiry', value: 'course' },
    { label: 'Enrollment & admission', value: 'enrollment' },
    { label: 'Partnership / business', value: 'partnership' },
    { label: 'Technical support', value: 'support' },
    { label: 'Other', value: 'other' },
];

// ─── DarkInput ───────────────────────────────────────────────────────────────
// Thin wrapper around Input that overrides Radix-label + input colors to work
// on the dark card background without touching the shared Input component.
function DarkInput(props: React.ComponentProps<typeof Input>) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/80">{props.label}</label>
            <input
                type={props.type ?? 'text'}
                value={props.value as string}
                onChange={props.onChange}
                placeholder={props.placeholder}
                required={props.required}
                className="h-10 w-full rounded-md border border-white/30 bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-0"
            />
        </div>
    );
}

// ─── DarkSelect ──────────────────────────────────────────────────────────────
// A native <select> styled for the dark card — Select's Radix trigger has
// hardcoded light-mode token classes so a native element is cleaner here.
function DarkSelect({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-white/80">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full rounded-md border border-white/30 bg-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            >
                <option value="" disabled className="text-ink-900">
                    Select an inquiry type…
                </option>
                {inquiryOptions.map(({ label: l, value: v }) => (
                    <option key={v} value={v} className="text-ink-900">
                        {l}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ─── ContactPage ─────────────────────────────────────────────────────────────

export function ContactPage() {
    const [modalState, setModalState] = useState<ModalState>(null);
    const [submitted, setSubmitted] = useState(false);

    // Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [inquiry, setInquiry] = useState('');
    const [message, setMessage] = useState('');

    const handleLoginClick = () => setModalState('login');
    const handleSignupClick = () => setModalState('signup');
    const closeModal = () => setModalState(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: wire to a real endpoint or email service
        setSubmitted(true);
    };

    return (
        <div>
            <LandingHeader onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />

            <main>
                {/* ── 0. Full-width image banner ─────────────────────────── */}
                {/* TODO: replace /images/banner.jpg with a dedicated contact page photo */}
                <div className="relative h-72 w-full overflow-hidden sm:h-80 lg:h-96">
                    <img
                        src="/images/banner.jpg"
                        alt="ResNet Academy team"
                        className="h-full w-full object-cover object-center"
                    />
                    {/* Dark overlay so text is always legible */}
                    <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
                    {/* Text overlay — bottom-left, matching the reference */}
                    <div className="absolute bottom-0 left-0 px-6 py-8 sm:px-10 lg:px-16">
                        <h1 className="text-4xl font-bold text-white sm:text-5xl">Contact</h1>
                        <p className="mt-2 text-base text-white/80">
                            Reach out, we love hearing from you!
                        </p>
                    </div>
                </div>

                {/* ── 1. Dark "Get in touch" band — curves into section below ── */}
                <section className="relative bg-[#1b4fa0] px-4 pb-0 pt-10 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">
                            Contact us
                        </p>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Get in touch!
                        </h2>
                        <p className="mt-3 pb-12 text-base leading-7 text-blue-100">
                            Have a question about our courses, want to join as a mentor, or looking
                            to partner with us? We read every message and reply within one business day.
                        </p>
                    </div>

                    {/* Wave SVG — colored to match the section below */}
                    <div aria-hidden="true" className="pointer-events-none">
                        <svg
                            viewBox="0 0 1440 80"
                            xmlns="http://www.w3.org/2000/svg"
                            className="block w-full"
                            preserveAspectRatio="none"
                        >
                            <path
                                d="M0,40 C360,90 1080,-10 1440,40 L1440,80 L0,80 Z"
                                fill="#fafbfc"
                            />
                        </svg>
                    </div>
                </section>

                {/* ── 2. Info cards + overlapping photo column ─────────────── */}
                <section className="bg-[#fafbfc] px-4 pt-0 pb-14 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        {/* 3-col layout: [info 2×2 grid] + [tall photo column that overlaps dark band] */}
                        <div className="grid gap-5 lg:grid-cols-3">

                            {/* Left 2 columns — 2×2 info card grid */}
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-2">

                                {/* General info */}
                                <div className="rounded-2xl border border-[#e8ecf1] bg-white p-6 shadow-sm">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
                                        <Phone className="size-5 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-blue-600">General info</h3>
                                    <div className="mt-3 space-y-1 text-sm text-[#334155]">
                                        <p>0702 132 952</p>
                                        <a href="mailto:info@resnetacademy.com" className="block hover:text-blue-600">
                                            info@resnetacademy.com
                                        </a>
                                    </div>
                                </div>

                                {/* Partnerships */}
                                <div className="rounded-2xl border border-[#e8ecf1] bg-white p-6 shadow-sm">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
                                        <Mail className="size-5 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-blue-600">Partnerships</h3>
                                    <div className="mt-3 space-y-1 text-sm text-[#334155]">
                                        <a href="mailto:partnerships@resnetacademy.com" className="block hover:text-blue-600">
                                            partnerships@resnetacademy.com
                                        </a>
                                        <p className="text-[#94a3b8] text-xs mt-1">For business enquiries and collaborations.</p>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="rounded-2xl border border-[#e8ecf1] bg-white p-6 shadow-sm">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
                                        <MapPin className="size-5 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-blue-600">Location</h3>
                                    <div className="mt-3 space-y-1 text-sm text-[#334155]">
                                        <p>Kampala, Uganda</p>
                                        <p className="text-[#94a3b8]">East Africa</p>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="rounded-2xl border border-[#e8ecf1] bg-white p-6 shadow-sm">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
                                        <Building2 className="size-5 text-white" aria-hidden="true" />
                                    </div>
                                    <h3 className="mt-4 text-base font-semibold text-blue-600">Address</h3>
                                    <div className="mt-3 space-y-1 text-sm text-[#334155]">
                                        <p>Kampala, Uganda</p>
                                        <p className="text-[#94a3b8]">Available Mon–Fri, 9am–5pm EAT</p>
                                    </div>
                                </div>

                            </div>

                            {/* Right column — flyer-style photo card overlapping the dark band */}
                            {/* TODO: replace students.jpg with a dedicated contact page photo */}
                            <div
                                className="relative overflow-hidden rounded-2xl shadow-xl lg:-mt-24"
                                style={{ minHeight: '380px' }}
                            >
                                {/* Full-bleed image — no border, no background */}
                                <img
                                    src="/images/students.jpg"
                                    alt="ResNet Academy students"
                                    className="absolute inset-0 h-full w-full object-cover"
                                />

                                {/* Gradient overlay — dark at bottom for text legibility */}
                                <div
                                    aria-hidden="true"
                                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                                />

                                {/* Flyer text — bottom of card */}
                                <div className="absolute bottom-0 left-0 p-6">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
                                        ResNet Academy
                                    </p>
                                    <p className="mt-1 text-lg font-bold leading-snug text-white">
                                        Building the next generation<br />of tech talent in Uganda.
                                    </p>
                                    <p className="mt-2 text-sm text-white/70">
                                        Kampala · info@resnetacademy.com
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* ── 3. Map + dark form ─────────────────────────────────── */}
                <section className="border-t border-[#e8ecf1] bg-white px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-8 lg:grid-cols-2">

                            {/* Left — map embed placeholder */}
                            {/* TODO: replace with a real Google Maps iframe once API key is available */}
                            <div className="overflow-hidden rounded-2xl border border-[#e8ecf1] bg-[#f1f5f9] shadow-sm">
                                <iframe
                                    title="ResNet Academy — Kampala, Uganda"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.19369824482!2d32.45488489999999!3d0.3475964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x177dbc0f90b8c26f%3A0x75a8e5b8d2a39882!2sKampala%2C%20Uganda!5e0!3m2!1sen!2sug!4v1700000000000"
                                    width="100%"
                                    height="100%"
                                    style={{ minHeight: '420px', border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>

                            {/* Right — form card */}
                            <div className="rounded-2xl bg-[#1b4fa0] p-8 shadow-lg">
                                {submitted ? (
                                    <div className="flex h-full flex-col items-center justify-center text-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                                            <Mail className="size-7 text-white" aria-hidden="true" />
                                        </div>
                                        <h3 className="mt-5 text-xl font-bold text-white">Message sent!</h3>
                                        <p className="mt-3 text-sm leading-6 text-blue-100">
                                            Thanks for reaching out. We'll get back to you
                                            at <span className="font-medium text-white">{email}</span> within
                                            one business day.
                                        </p>
                                        <Button
                                            variant="primary"
                                            className="mt-8 bg-white text-blue-700 hover:bg-blue-50"
                                            onClick={() => setSubmitted(false)}
                                        >
                                            Send another message
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-xl font-bold text-white">Send us a message</h2>
                                        <p className="mt-1 text-sm text-blue-100">
                                            We'll get back to you within one business day.
                                        </p>

                                        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                                            {/* Full Name + Email side by side */}
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <DarkInput
                                                    label="Full Name"
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    placeholder="Jane Doe"
                                                    required
                                                />
                                                <DarkInput
                                                    label="Email Address"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="you@example.com"
                                                    required
                                                />
                                            </div>

                                            {/* Phone Number + Inquiry side by side */}
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <DarkInput
                                                    label="Phone Number"
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="07XX XXX XXX"
                                                />
                                                <DarkSelect
                                                    label="Select Inquiry"
                                                    value={inquiry}
                                                    onChange={setInquiry}
                                                />
                                            </div>

                                            {/* Message */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-sm font-medium text-white/80">
                                                    Message
                                                </label>
                                                <textarea
                                                    rows={5}
                                                    value={message}
                                                    onChange={(e) => setMessage(e.target.value)}
                                                    required
                                                    placeholder="Tell us what's on your mind…"
                                                    className="w-full resize-none rounded-md border border-white/30 bg-white/15 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/60"
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold"
                                            >
                                                Send Message
                                            </Button>
                                        </form>
                                    </>
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
