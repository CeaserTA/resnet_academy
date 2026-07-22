import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqItem {
    question: string;
    answer: string;
}

// Grounded in what the platform actually does, not generic marketing filler.
const FAQ_ITEMS: FaqItem[] = [
    {
        question: 'How does enrolment work?',
        answer: 'Applying confirms your spot right away — there\'s no waitlist or approval step. You\'ll also get a confirmation email shortly after.',
    },
    {
        question: 'Is a course self-paced?',
        answer: 'Yes. Modules unlock in order as you complete each one, and an instructor can also set a scheduled release date for a specific module.',
    },
    {
        question: 'Do I get a certificate?',
        answer: 'Once you complete every module in a course, a certificate is issued automatically and shows up under "My courses." Anyone can verify it\'s genuine using the certificate number.',
    },
    {
        question: 'How much do courses cost?',
        answer: 'Some courses are free; others list a one-time price on the course page. There are no subscriptions.',
    },
    {
        question: 'Can I get help while taking a course?',
        answer: 'Yes — every course has a discussion forum, and you can message your instructor or open a support ticket directly.',
    },
    {
        question: 'Can I leave a course after enrolling?',
        answer: 'Yes, you can withdraw from a course at any time from "My courses."',
    },
];

export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl">Frequently asked questions</h2>

            <div className="mt-6 flex flex-col divide-y divide-surface-100 rounded-lg border border-surface-100 bg-surface-0">
                {FAQ_ITEMS.map((item, index) => {
                    const isOpen = openIndex === index;

                    return (
                        <div key={item.question}>
                            <button
                                onClick={() => setOpenIndex(isOpen ? null : index)}
                                aria-expanded={isOpen}
                                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                            >
                                <span className="font-medium text-ink-900">{item.question}</span>
                                <ChevronDown
                                    className={cn('size-4 shrink-0 text-ink-600 transition-transform', isOpen && 'rotate-180')}
                                    aria-hidden="true"
                                />
                            </button>
                            {isOpen && <p className="px-4 pb-4 text-sm text-ink-600">{item.answer}</p>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
