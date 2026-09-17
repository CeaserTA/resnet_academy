import { useState } from 'react';
import { Link } from 'react-router';
import {
    ChevronDown,
    Clock,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Send,
    Shield,
} from 'lucide-react';
import { LandingHeader } from '@/components/layout/LandingHeader';
import { Footer } from '@/components/landing/Footer';
import { useAuthModal } from '@/lib/auth/AuthModalContext';
import { cn } from '@/lib/utils';

const inquiryOptions = [
    { label: 'Course enquiry', value: 'course' },
    { label: 'Enrollment & admission', value: 'enrollment' },
    { label: 'Partnership / business', value: 'partnership' },
    { label: 'Technical support', value: 'support' },
    { label: 'Other', value: 'other' },
];

const officeHours = [
    { day: 'Monday – Friday', hours: '9:00 AM – 5:00 PM (EAT)', closed: false },
    { day: 'Saturday', hours: '9:00 AM – 1:00 PM (EAT)', closed: false },
    { day: 'Sunday & Public Holidays', hours: 'Closed', closed: true },
];

const faqs = [
    { q: 'How do I enrol in a programme?', a: 'Browse our courses page, pick the course that fits your level, and click "View course". From there you can apply or enrol directly. If you need help choosing, use the contact form above.' },
    { q: 'What are the course fees?', a: 'Fees vary by course and are shown on each course page. We offer flexible payment plans — contact us to arrange a deposit and instalment schedule.' },
    { q: 'Do you offer online classes?', a: 'Yes. Some courses are fully online, others are in-person in Kampala, and some are hybrid. The delivery mode is shown on every course card.' },
    { q: 'What are the entry requirements?', a: 'Most beginner courses require no prior coding experience — just a laptop and reliable internet. Intermediate and advanced courses list prerequisites on the course page.' },
    { q: 'How can I visit the campus?', a: 'We are based in Kampala, Uganda. Send us a message or call us to arrange a visit during office hours.' },
    { q: 'How quickly do you respond to messages?', a: 'We typically respond within 24 hours on weekdays. During peak enrolment periods it may take up to 48 hours.' },
];

function isOfficeOpen(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    if (day === 0) return false;
    if (day === 6) return hour >= 9 && hour < 13;
    return hour >= 9 && hour < 17;
}

function FaqItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-xl border border-border bg-white px-5">
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-ink-900 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
                {q}
                <ChevronDown
                    className={cn('size-4 shrink-0 text-ink-300 transition-transform duration-200', open && 'rotate-180')}
                    aria-hidden="true"
                />
            </button>
            {open && <p className="pb-4 text-sm leading-7 text-ink-600">{a}</p>}
        </div>
    );
}

export function ContactPage() {
    const { openAuth } = useAuthModal();
    const [submitted, setSubmitted] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [inquiry, setInquiry] = useState('');
    const [message, setMessage] = useState('');
    const open = isOfficeOpen();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div>
            <LandingHeader
                onLoginClick={() => openAuth('login')}
                onSignupClick={() => openAuth('signup')}
            />

            <main>

                {/* §1 Hero — shorter, wave at bottom */}
                <section className="relative overflow-hidden bg-navy px-4 pb-16 pt-10 sm:px-6 lg:px-8">
                    <img
                        src="/images/banner.jpg"
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover opacity-20"
                    />
                    <div className="relative z-10 mx-auto max-w-3xl text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                            <MessageCircle className="size-3.5" aria-hidden="true" />
                            Get in touch
                        </span>
                        <h1 className="mt-5 text-4xl text-white sm:text-5xl">
                            We'd love to hear from you.
                        </h1>
                        <p className="mt-4 text-base leading-7 text-navy-foreground/70">
                            Whether you're a prospective student, a parent, or a potential partner —
                            we're here to answer your questions and guide you every step of the way.
                        </p>
                    </div>

                    {/* Wave curve into surface-50 below */}
                    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0">
                        <svg viewBox="0 0 1440 64" xmlns="http://www.w3.org/2000/svg" className="block w-full" preserveAspectRatio="none">
                            <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill="#f7f8fa" />
                        </svg>
                    </div>
                </section>

                {/* Contact method cards — sit on the wave curve */}
                <div className="relative z-10 -mt-10 px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <a href="mailto:info@resnetacademy.com" className="flex flex-col items-center gap-2 rounded-2xl bg-white px-5 py-5 text-center shadow-md transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                                    <Mail className="size-5 text-white" aria-hidden="true" />
                                </div>
                                <p className="text-sm font-semibold text-ink-900">Email Us</p>
                                <p className="text-xs text-ink-600">General inquiries &amp; support</p>
                            </a>
                            <a href="tel:+256702132952" className="flex flex-col items-center gap-2 rounded-2xl bg-white px-5 py-5 text-center shadow-md transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-600">
                                    <Phone className="size-5 text-white" aria-hidden="true" />
                                </div>
                                <p className="text-sm font-semibold text-ink-900">Call Us</p>
                                <p className="text-xs text-ink-600">Speak with administrators</p>
                            </a>
                            <a href="https://wa.me/256702132952" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 rounded-2xl bg-white px-5 py-5 text-center shadow-md transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-600">
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5 text-white" aria-hidden="true">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-semibold text-ink-900">WhatsApp</p>
                                <p className="text-xs text-ink-600">Chat with us instantly</p>
                            </a>
                        </div>
                    </div>
                </div>

                {/* §2 Form + Contact info + Office hours */}
                <section className="bg-surface-50 px-4 pb-10 pt-10 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-8 lg:grid-cols-3">

                            {/* Form */}
                            <div className="rounded-2xl border border-border bg-white p-7 shadow-sm lg:col-span-2">
                                {submitted ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                                            <Mail className="size-7 text-primary" aria-hidden="true" />
                                        </div>
                                        <h2 className="mt-5 text-xl text-ink-900">Message sent!</h2>
                                        <p className="mt-3 max-w-sm text-sm leading-6 text-ink-600">
                                            Thanks for reaching out. We'll get back to you at{' '}
                                            <span className="font-medium text-ink-900">{email}</span>{' '}
                                            within one business day.
                                        </p>
                                        <button
                                            onClick={() => { setSubmitted(false); setFullName(''); setEmail(''); setSubject(''); setInquiry(''); setMessage(''); }}
                                            className="mt-8 inline-flex items-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                        >
                                            Send another message
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <Send className="size-5 text-primary" aria-hidden="true" />
                                            <h2 className="text-xl text-ink-900">Send Us a Message</h2>
                                        </div>
                                        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="contact-name" className="text-xs font-semibold text-ink-900">Full Name</label>
                                                    <input id="contact-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Doe" required className="h-10 w-full rounded-lg border border-border bg-surface-50 px-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="contact-email" className="text-xs font-semibold text-ink-900">Email Address</label>
                                                    <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jane.doe@example.com" required className="h-10 w-full rounded-lg border border-border bg-surface-50 px-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                                </div>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="contact-inquiry" className="text-xs font-semibold text-ink-900">Inquiry Type</label>
                                                    <select id="contact-inquiry" value={inquiry} onChange={(e) => setInquiry(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-50 px-3 text-sm text-ink-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                                                        <option value="" disabled>— Select —</option>
                                                        {inquiryOptions.map(({ label, value }) => (
                                                            <option key={value} value={value}>{label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="contact-subject" className="text-xs font-semibold text-ink-900">Subject</label>
                                                    <input id="contact-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Inquiry about Web Development Course" className="h-10 w-full rounded-lg border border-border bg-surface-50 px-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label htmlFor="contact-message" className="text-xs font-semibold text-ink-900">Your Message</label>
                                                <textarea id="contact-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Write your message here…" className="w-full resize-none rounded-lg border border-border bg-surface-50 px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                                            </div>
                                            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                                                Send Message
                                                <Send className="size-4" aria-hidden="true" />
                                            </button>
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-ink-300">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="size-3.5" aria-hidden="true" />
                                                    We typically respond within <strong className="text-ink-600">24 hours</strong> on weekdays.
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Shield className="size-3.5" aria-hidden="true" />
                                                    Your information is protected under our Privacy Policy.
                                                </span>
                                            </div>
                                        </form>
                                    </>
                                )}
                            </div>

                            {/* Contact info + Office hours */}
                            <div className="flex flex-col gap-5">
                                <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                                    <h3 className="text-base font-semibold text-ink-900">Contact Information</h3>
                                    <div className="mt-5 space-y-5">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                                <Mail className="size-4 text-primary" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300">Email addresses</p>
                                                <a href="mailto:info@resnetacademy.com" className="mt-1 block text-sm text-ink-600 hover:text-primary">info@resnetacademy.com</a>
                                                <a href="mailto:admissions@resnetacademy.com" className="block text-sm text-ink-600 hover:text-primary">admissions@resnetacademy.com</a>
                                                <a href="mailto:partnerships@resnetacademy.com" className="block text-sm text-ink-600 hover:text-primary">partnerships@resnetacademy.com</a>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                                <Phone className="size-4 text-primary" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300">Phone number</p>
                                                <a href="tel:+256702132952" className="mt-1 block text-sm text-ink-600 hover:text-primary">+256 702 132 952</a>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                                <MapPin className="size-4 text-primary" aria-hidden="true" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-300">Our location</p>
                                                <p className="mt-1 text-sm text-ink-600">Kampala, Uganda</p>
                                                <p className="text-sm text-ink-300">East Africa</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-semibold text-ink-900">Office Hours</h3>
                                        <span className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                                            open ? 'bg-emerald-50 text-emerald-700' : 'border border-border bg-surface-50 text-ink-300',
                                        )}>
                                            <span className={cn('size-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-ink-300')} aria-hidden="true" />
                                            {open ? 'Currently Open' : 'Currently Closed'}
                                        </span>
                                    </div>
                                    <dl className="mt-4 space-y-3">
                                        {officeHours.map(({ day, hours, closed }) => (
                                            <div key={day} className="flex items-center justify-between text-sm">
                                                <dt className="text-ink-600">{day}</dt>
                                                <dd className={cn('font-medium', closed ? 'text-danger-600' : 'text-ink-900')}>{hours}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* §3 Map + FAQ side by side */}
                <section className="bg-surface-50 px-4 pb-12 pt-0 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-2">

                            {/* Map */}
                            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
                                <iframe
                                    title="ResNet Academy — Kampala, Uganda"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.19369824482!2d32.45488489999999!3d0.3475964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x177dbc0f90b8c26f%3A0x75a8e5b8d2a39882!2sKampala%2C%20Uganda!5e0!3m2!1sen!2sug!4v1700000000000"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, minHeight: '420px' }}
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>

                            {/* FAQ */}
                            <div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-ink-600">
                                    <MessageCircle className="size-3.5 text-primary" aria-hidden="true" />
                                    Frequently asked questions
                                </span>
                                <h2 className="mt-4 text-3xl text-ink-900">
                                    Know before you enrol.
                                </h2>
                                <p className="mt-2 text-sm leading-7 text-ink-600">
                                    Can't find what you're looking for? Use the contact form above.
                                </p>
                                <div className="mt-6 space-y-3">
                                    {faqs.map((faq) => (
                                        <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </section>

                {/* §4 CTA before footer */}
                <section className="border-t border-border bg-navy px-4 py-12 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
                            Take the next step
                        </p>
                        <h2 className="mt-4 text-3xl text-navy-foreground sm:text-4xl">
                            Ready to start learning?
                        </h2>
                        <p className="mt-4 text-base leading-7 text-navy-foreground/60">
                            Browse our courses, pick a cohort, and join hundreds of learners
                            already building careers in tech across Uganda and East Africa.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                to="/courses"
                                className="inline-flex items-center rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                                Explore courses
                            </Link>
                            <Link
                                to="/about"
                                className="inline-flex items-center rounded-full border border-navy-foreground/20 px-7 py-3 text-sm font-semibold text-navy-foreground transition-colors hover:border-navy-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                Learn about us
                            </Link>
                        </div>
                    </div>
                </section>

            </main>

            <Footer
                onLoginClick={() => openAuth('login')}
                onSignupClick={() => openAuth('signup')}
            />
        </div>
    );
}
